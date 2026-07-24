"""
handlers/room_manager.py

Handles all Host-facing room CRUD operations.
Routes: POST /rooms | GET /rooms | DELETE /rooms/{roomId}

All routes are protected by the Cognito JWT authorizer, so only
authenticated hosts can create, list, or delete rooms.
"""
import json
import os
import random
import string
import time
import boto3
from boto3.dynamodb.conditions import Key

# Local import (Lambda package structure)
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.helpers import build_response, build_error, hash_access_code, generate_id, get_env

dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "ap-south-1"))


def lambda_handler(event, context):
    """Route incoming API Gateway requests to the correct handler."""
    http_method = event.get("httpMethod", "")
    path = event.get("path", "")
    path_params = event.get("pathParameters") or {}

    # Extract Host ID from the Cognito authorizer claims
    claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
    host_id = claims.get("sub")  # Cognito user UUID

    if not host_id:
        return build_error(401, "Unauthorized: Host identity not found.")

    if http_method == "POST" and path == "/rooms":
        return _create_room(event, host_id)
    elif http_method == "GET" and path == "/rooms":
        return _list_rooms(host_id)
    elif http_method == "DELETE" and "roomId" in path_params:
        return _delete_room(path_params["roomId"], host_id)
    else:
        return build_error(404, "Route not found.")


# ─────────────────────────────────────────────
# CREATE ROOM  POST /rooms
# ─────────────────────────────────────────────
def _create_room(event, host_id: str) -> dict:
    """
    Creates a new event room.
    Generates a random 6-digit access code (hashed before storage).
    Sets a DynamoDB TTL equal to the room's expiry date.
    """
    try:
        body = json.loads(event.get("body", "{}"))
        room_name = body.get("name", "").strip()
        expiry_days = int(body.get("expiryDays", 7))
        allow_download = bool(body.get("allowDownload", True))

        if not room_name:
            return build_error(400, "Room name is required.")
        if not (1 <= expiry_days <= 30):
            return build_error(400, "expiryDays must be between 1 and 30.")

        room_id = generate_id("room_")
        raw_access_code = "".join(random.choices(string.digits, k=6))
        hashed_code = hash_access_code(raw_access_code)
        expiry_timestamp = int(time.time()) + (expiry_days * 86400)
        expiry_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(expiry_timestamp))

        table = dynamodb.Table(get_env("ROOMS_TABLE"))
        table.put_item(
            Item={
                "PK": f"ROOM#{room_id}",
                "SK": "METADATA",
                "hostId": host_id,
                "roomName": room_name,
                "accessCodeHash": hashed_code,
                "expiryDate": expiry_iso,
                "allowDownload": allow_download,
                "ttl": expiry_timestamp,
                "photoCount": 0,
            }
        )

        return build_response(201, {
            "roomId": room_id,
            "accessCode": raw_access_code,  # Returned only ONCE on creation
            "expiryDate": expiry_iso,
            "allowDownload": allow_download,
        })

    except Exception as e:
        print(f"[CreateRoom] Error: {e}")
        return build_error(500, "Failed to create room.")


# ─────────────────────────────────────────────
# LIST ROOMS  GET /rooms
# ─────────────────────────────────────────────
def _list_rooms(host_id: str) -> dict:
    """
    Lists all rooms owned by the authenticated host.
    Uses the hostId-index GSI for an efficient O(1) query.
    """
    try:
        table = dynamodb.Table(get_env("ROOMS_TABLE"))
        response = table.query(
            IndexName="hostId-index",
            KeyConditionExpression=Key("hostId").eq(host_id),
        )
        rooms = [
            {
                "roomId": item["PK"].replace("ROOM#", ""),
                "name": item.get("roomName"),
                "photoCount": int(item.get("photoCount", 0)),
                "expiryDate": item.get("expiryDate"),
                "allowDownload": item.get("allowDownload", True),
            }
            for item in response.get("Items", [])
        ]
        return build_response(200, rooms)
    except Exception as e:
        print(f"[ListRooms] Error: {e}")
        return build_error(500, "Failed to list rooms.")


# ─────────────────────────────────────────────
# DELETE ROOM  DELETE /rooms/{roomId}
# ─────────────────────────────────────────────
def _delete_room(room_id: str, host_id: str) -> dict:
    """
    Deletes a room and its metadata.
    Verifies the room belongs to the authenticated host before deleting.
    Note: S3 objects are cleaned up by the cleanup Lambda via lifecycle rules.
    """
    try:
        table = dynamodb.Table(get_env("ROOMS_TABLE"))

        # First verify ownership
        response = table.get_item(Key={"PK": f"ROOM#{room_id}", "SK": "METADATA"})
        item = response.get("Item")

        if not item:
            return build_error(404, "Room not found.")
        if item.get("hostId") != host_id:
            return build_error(403, "Forbidden: You do not own this room.")

        table.delete_item(Key={"PK": f"ROOM#{room_id}", "SK": "METADATA"})
        return build_response(200, {"message": "Room deleted successfully."})
    except Exception as e:
        print(f"[DeleteRoom] Error: {e}")
        return build_error(500, "Failed to delete room.")
