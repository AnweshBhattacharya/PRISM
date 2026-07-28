"""
handlers/guest_token.py

Issues a short-lived JWT to a guest who enters a valid 6-digit room code.
Route: POST /guest/token  (No auth — this is the entry point)

Flow:
1. Guest sends roomId + accessCode.
2. We check a per-room rate limit before doing anything else — a 6-digit
   code is only 1,000,000 possibilities, so without this, throttling was
   the only thing standing between an attacker and any room, and none
   existed. Failed attempts are tracked in GuestSessionsTable (this table
   already existed in the stack but was never actually used).
3. We hash the code and compare it to the stored hash in DynamoDB.
4. If valid, we issue a signed JWT containing the roomId and a session ID,
   and reset the room's attempt counter.
5. The guest's browser uses this JWT for all subsequent requests
   (upload-url, search) via the custom Lambda Authorizer.
"""
import json
import os
import time
import uuid
import boto3
from jose import jwt

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.helpers import build_response, build_error, hash_access_code, get_env

dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "ap-south-1"))

# This secret MUST match what the guest_authorizer uses to validate tokens.
GUEST_JWT_SECRET = get_env("GUEST_JWT_SECRET")
TOKEN_EXPIRY_SECONDS = 3600  # 1 hour

# ── Rate limiting for the access-code exchange ─────────────────────────
# A 6-digit code has only 1,000,000 possible values. Without a limit here,
# an attacker can script through all of them against a single room in
# minutes. This is a simple sliding-window counter per roomId; it doesn't
# replace API Gateway-level throttling (see template.yaml's MethodSettings
# for /guest/token) but it's the layer that actually locks out a specific
# room being targeted, which a generic per-second throttle can't do.
MAX_ATTEMPTS = 5
WINDOW_SECONDS = 900  # 15 minutes


def lambda_handler(event, context):
    """Validate the room access code and issue a guest JWT."""
    try:
        body = json.loads(event.get("body", "{}"))
        room_id = body.get("roomId", "").strip()
        access_code = body.get("accessCode", "").strip()

        if not room_id or not access_code:
            return build_error(400, "roomId and accessCode are required.")

        if not access_code.isdigit() or len(access_code) != 6:
            return build_error(400, "accessCode must be a 6-digit number.")

        sessions_table = dynamodb.Table(get_env("SESSIONS_TABLE"))
        now = int(time.time())
        throttle_key = {"PK": f"THROTTLE#{room_id}"}

        # ── Rate limit check ───────────────────────────────────────────
        throttle_item = sessions_table.get_item(Key=throttle_key).get("Item")

        if throttle_item and throttle_item.get("windowExpiresAt", 0) <= now:
            # Window has passed — clear it so this attempt starts fresh.
            try:
                sessions_table.delete_item(Key=throttle_key)
            except Exception as e:
                print(f"[GuestToken] Failed to clear expired throttle window: {e}")
            throttle_item = None

        if throttle_item and int(throttle_item.get("attempts", 0)) >= MAX_ATTEMPTS:
            return build_response(429, {
                "error": "Too many incorrect attempts for this room. Try again in a few minutes."
            })

        # ── Fetch the room from DynamoDB ──────────────────────────────
        table = dynamodb.Table(get_env("ROOMS_TABLE"))
        response = table.get_item(Key={"PK": f"ROOM#{room_id}", "SK": "METADATA"})
        room = response.get("Item")

        if not room:
            return build_error(404, "Room not found.")

        # ── Check if the room has expired ─────────────────────────────
        if room.get("ttl", 0) < int(time.time()):
            return build_error(410, "This event room has expired.")

        # ── Validate the access code ───────────────────────────────────
        submitted_hash = hash_access_code(access_code)
        if submitted_hash != room.get("accessCodeHash"):
            _record_failed_attempt(sessions_table, room_id, now)
            return build_error(403, "Invalid access code.")

        # ── Success: clear any throttle state for this room ───────────
        try:
            sessions_table.delete_item(Key=throttle_key)
        except Exception as e:
            print(f"[GuestToken] Failed to clear throttle state after success: {e}")

        # ── Issue a short-lived guest JWT ─────────────────────────────
        session_token = uuid.uuid4().hex
        payload = {
            "roomId": room_id,
            "sessionToken": session_token,
            "iat": int(time.time()),
            "exp": int(time.time()) + TOKEN_EXPIRY_SECONDS,
        }
        token = jwt.encode(payload, GUEST_JWT_SECRET, algorithm="HS256")

        return build_response(200, {
            "guestToken": token,
            "roomName": room.get("roomName"),
            "allowDownload": room.get("allowDownload", True),
            "expiryDate": room.get("expiryDate"),
        })

    except Exception as e:
        print(f"[GuestToken] Unexpected error: {e}")
        return build_error(500, "Failed to validate room access.")


def _record_failed_attempt(sessions_table, room_id: str, now: int):
    """
    Increments the failed-attempt counter for a room within the current
    sliding window. Uses if_not_exists so a fresh window is created on the
    first failure and subsequent failures within WINDOW_SECONDS just add
    to the same counter.
    """
    try:
        sessions_table.update_item(
            Key={"PK": f"THROTTLE#{room_id}"},
            UpdateExpression=(
                "SET attempts = if_not_exists(attempts, :zero) + :one, "
                "windowExpiresAt = if_not_exists(windowExpiresAt, :expiry), "
                "ttl = if_not_exists(ttl, :ttl)"
            ),
            ExpressionAttributeValues={
                ":zero": 0,
                ":one": 1,
                ":expiry": now + WINDOW_SECONDS,
                ":ttl": now + WINDOW_SECONDS + 60,  # small buffer past the window
            },
        )
    except Exception as e:
        print(f"[GuestToken] Failed to record throttle attempt: {e}")