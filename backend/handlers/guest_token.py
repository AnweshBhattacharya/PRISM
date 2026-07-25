"""
handlers/guest_token.py

Issues a short-lived JWT to a guest who enters a valid 6-digit room code.
Route: POST /guest/token  (No auth — this is the entry point)

Flow:
1. Guest sends roomId + accessCode.
2. We hash the code and compare it to the stored hash in DynamoDB.
3. If valid, we issue a signed JWT containing the roomId and a session ID.
4. The guest's browser uses this JWT for all subsequent requests
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

        # ── Fetch the room from DynamoDB ──────────────────────────────
        table = dynamodb.Table(get_env("ROOMS_TABLE"))
        response = table.get_item(Key={"PK": f"ROOM#{room_id}", "SK": "METADATA"})
        room = response.get("Item")

        if not room:
            return build_error(404, "Room not found.")

        # ── Check if the room has expired ─────────────────────────────
        if room.get("ttl", 0) < int(time.time()):
            return build_error(410, "This event room has expired.")

        # ── Validate the access code (constant-time comparison via hash) ─
        submitted_hash = hash_access_code(access_code)
        if submitted_hash != room.get("accessCodeHash"):
            return build_error(403, "Invalid access code.")

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
