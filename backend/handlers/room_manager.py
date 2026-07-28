"""
handlers/room_manager.py

Handles all Host-facing room CRUD operations.
Routes: POST /rooms | GET /rooms | DELETE /rooms/{roomId}
        GET /rooms/{roomId}/photos | DELETE /rooms/{roomId}/photos/{photoId}

All routes are protected by the Cognito JWT authorizer, so only
authenticated hosts can create, list, delete, or modify rooms.
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
s3_client = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
rekognition_client = boto3.client("rekognition", region_name=os.environ.get("AWS_REGION", "ap-south-1"))


def lambda_handler(event, context):
    """Route incoming API Gateway requests to the correct handler."""
    http_method = event.get("httpMethod", "")
    # Prefer the API resource template when available, since ApiGateway events may
    # include the stage prefix in event.path (e.g. /prod/rooms).
    path = event.get("resource") or event.get("path") or ""
    if not path.startswith("/"):
        path = f"/{path}"
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
    elif http_method == "GET" and path == "/rooms/{roomId}/photos":
        return _get_room_photos(path_params.get("roomId"), host_id)
    elif http_method == "DELETE" and path == "/rooms/{roomId}/photos/{photoId}":
        return _delete_photo(path_params.get("roomId"), path_params.get("photoId"), host_id)
    elif http_method == "DELETE" and path_params.get("roomId"):
        return _delete_room(path_params["roomId"], host_id)
    elif http_method == "PUT" and path_params.get("roomId"):
        return _update_room(event, path_params["roomId"], host_id)
    else:
        print(f"[RoomManager] Unhandled route: method={http_method} path={path} resource={event.get('resource')} pathParameters={path_params}")
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
                "accessCode": raw_access_code,  # Store plain code for host retrieval
                "accessCodeHash": hashed_code,  # Keep hash for guest validation
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
    Includes the 6-digit access code for sharing with guests.
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
                "accessCode": item.get("accessCode", ""),  # 6-digit code
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
# GET ROOM PHOTOS  GET /rooms/{roomId}/photos
# ─────────────────────────────────────────────

def _get_room_photos(room_id: str, host_id: str) -> dict:
    """
    Returns pre-signed URLs for all photos in a room.
    Only the room owner can access this host-only endpoint.
    """
    try:
        table = dynamodb.Table(get_env("ROOMS_TABLE"))
        response = table.get_item(Key={"PK": f"ROOM#{room_id}", "SK": "METADATA"})
        item = response.get("Item")

        if not item:
            return build_error(404, "Room not found.")
        if item.get("hostId") != host_id:
            return build_error(403, "Forbidden: You do not own this room.")

        photos_table = dynamodb.Table(get_env("PHOTOS_TABLE"))
        photos_response = photos_table.query(
            KeyConditionExpression=Key("PK").eq(f"ROOM#{room_id}") & Key("SK").begins_with("PHOTO#"),
        )

        bucket_name = get_env("BUCKET_NAME")
        photos = []
        for photo_item in photos_response.get("Items", []):
            s3_key = photo_item.get("s3Key")
            if not s3_key:
                continue

            try:
                presigned_url = s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": bucket_name, "Key": s3_key},
                    ExpiresIn=900,
                )
            except Exception as e:
                print(f"[GetRoomPhotos] Failed to create presigned URL for {s3_key}: {e}")
                continue

            photos.append({
                "photoId": photo_item.get("photoId"),
                "url": presigned_url,
                "confidence": float(photo_item.get("confidence", 0.0)) if photo_item.get("confidence") else 0.0,
                "needs_confirmation": False,
                "s3Key": s3_key,
                "isBlurry": photo_item.get("isBlurry", False),
                "photoCount": int(photo_item.get("photoCount", 0)),
            })

        return build_response(200, {
            "roomId": room_id,
            "roomName": item.get("roomName"),
            "allowDownload": item.get("allowDownload", True),
            "photos": photos,
        })
    except Exception as e:
        print(f"[GetRoomPhotos] Error: {e}")
        return build_error(500, "Failed to fetch room photos.")


# ─────────────────────────────────────────────
# DELETE SINGLE PHOTO  DELETE /rooms/{roomId}/photos/{photoId}
# ─────────────────────────────────────────────

def _delete_photo(room_id: str, photo_id: str, host_id: str) -> dict:
    """
    Deletes a single photo: removes the S3 object, the photo's own
    DynamoDB record, every FACE# mapping row tied to it, and the matching
    indexed Rekognition faces — then decrements the room's photoCount.
    This is the piece that was previously missing entirely: deleting a
    photo any other way (e.g. straight from the AWS console) skips the
    photoCount decrement and leaves it permanently out of sync with what
    actually exists.
    """
    if not room_id or not photo_id:
        return build_error(400, "roomId and photoId are required.")

    try:
        rooms_table = dynamodb.Table(get_env("ROOMS_TABLE"))
        room_response = rooms_table.get_item(Key={"PK": f"ROOM#{room_id}", "SK": "METADATA"})
        room_item = room_response.get("Item")

        if not room_item:
            return build_error(404, "Room not found.")
        if room_item.get("hostId") != host_id:
            return build_error(403, "Forbidden: You do not own this room.")

        photos_table = dynamodb.Table(get_env("PHOTOS_TABLE"))
        photo_response = photos_table.get_item(
            Key={"PK": f"ROOM#{room_id}", "SK": f"PHOTO#{photo_id}"}
        )
        photo_item = photo_response.get("Item")

        if not photo_item:
            return build_error(404, "Photo not found.")

        s3_key = photo_item.get("s3Key")
        face_ids = photo_item.get("faceIds", [])

        # ── Delete the S3 object ──────────────────────────
        bucket_name = get_env("BUCKET_NAME")
        if s3_key:
            try:
                s3_client.delete_object(Bucket=bucket_name, Key=s3_key)
            except Exception as e:
                print(f"[DeletePhoto] S3 delete failed for {s3_key}: {e}")

        # ── Delete this photo's indexed Rekognition faces ─
        if face_ids:
            try:
                rekognition_client.delete_faces(
                    CollectionId=get_env("REKOGNITION_COLLECTION"),
                    FaceIds=face_ids,
                )
            except Exception as e:
                print(f"[DeletePhoto] Rekognition delete_faces failed: {e}")

        # ── Delete the FACE# mapping rows + the photo record ─
        # FACE# rows are keyed FACE#{faceId}#PHOTO#{photoId}, so we can
        # target them directly without a scan.
        with photos_table.batch_writer() as batch:
            for face_id in face_ids:
                batch.delete_item(
                    Key={"PK": f"ROOM#{room_id}", "SK": f"FACE#{face_id}#PHOTO#{photo_id}"}
                )
            batch.delete_item(Key={"PK": f"ROOM#{room_id}", "SK": f"PHOTO#{photo_id}"})

        # ── Decrement the room's photo count, floored at 0 ─
        try:
            rooms_table.update_item(
                Key={"PK": f"ROOM#{room_id}", "SK": "METADATA"},
                UpdateExpression="SET photoCount = if_not_exists(photoCount, :zero) - :one",
                ConditionExpression="attribute_not_exists(photoCount) OR photoCount > :zero",
                ExpressionAttributeValues={":one": 1, ":zero": 0},
            )
        except Exception as e:
            # Condition failing just means the count was already at 0 —
            # nothing to do, not a real error.
            print(f"[DeletePhoto] photoCount decrement skipped: {e}")

        return build_response(200, {"message": "Photo deleted successfully.", "photoId": photo_id})

    except Exception as e:
        print(f"[DeletePhoto] Error: {e}")
        return build_error(500, "Failed to delete photo.")


# ─────────────────────────────────────────────
# DELETE ROOM  DELETE /rooms/{roomId}
# ─────────────────────────────────────────────
def _delete_room(room_id: str, host_id: str) -> dict:
    """
    Deletes a room. Immediately purges every S3 object, indexed
    Rekognition face, and DynamoDB photo/face row tied to it, rather than
    just removing the room's own metadata row and waiting on the same
    TTL-based path used for natural expiry — a host clicking "delete"
    expects the data to actually be gone right away, not up to a day
    later once cleanup.py's scheduled job gets to it.
    """
    try:
        table = dynamodb.Table(get_env("ROOMS_TABLE"))

        response = table.get_item(Key={"PK": f"ROOM#{room_id}", "SK": "METADATA"})
        item = response.get("Item")

        if not item:
            return build_error(404, "Room not found.")
        if item.get("hostId") != host_id:
            return build_error(403, "Forbidden: You do not own this room.")

        _purge_room_data(room_id)

        table.delete_item(Key={"PK": f"ROOM#{room_id}", "SK": "METADATA"})
        return build_response(200, {"message": "Room deleted successfully."})
    except Exception as e:
        print(f"[DeleteRoom] Error: {e}")
        return build_error(500, "Failed to delete room.")


def _purge_room_data(room_id: str):
    """
    Immediate, synchronous purge of every S3 object, Rekognition face, and
    DynamoDB photo/face row for a room. Shared logic with what cleanup.py
    does for naturally-expired rooms — the difference is this runs the
    instant a host deletes the room, instead of waiting for TTL.
    """
    photos_table = dynamodb.Table(get_env("PHOTOS_TABLE"))
    bucket_name = get_env("BUCKET_NAME")

    response = photos_table.query(
        KeyConditionExpression=Key("PK").eq(f"ROOM#{room_id}"),
    )
    items = response.get("Items", [])

    s3_keys = [{"Key": item["s3Key"]} for item in items if item.get("s3Key")]
    face_ids = [face_id for item in items for face_id in item.get("faceIds", [])]

    if s3_keys:
        try:
            for i in range(0, len(s3_keys), 1000):
                s3_client.delete_objects(
                    Bucket=bucket_name,
                    Delete={"Objects": s3_keys[i:i + 1000], "Quiet": True},
                )
            print(f"[PurgeRoomData] Deleted {len(s3_keys)} S3 objects for room {room_id}.")
        except Exception as e:
            print(f"[PurgeRoomData] S3 delete error: {e}")

    if face_ids:
        try:
            for i in range(0, len(face_ids), 4096):
                rekognition_client.delete_faces(
                    CollectionId=get_env("REKOGNITION_COLLECTION"),
                    FaceIds=face_ids[i:i + 4096],
                )
            print(f"[PurgeRoomData] Deleted {len(face_ids)} face vectors for room {room_id}.")
        except Exception as e:
            print(f"[PurgeRoomData] Rekognition delete error: {e}")

    if items:
        with photos_table.batch_writer() as batch:
            for item in items:
                batch.delete_item(Key={"PK": item["PK"], "SK": item["SK"]})
        print(f"[PurgeRoomData] Deleted {len(items)} DynamoDB rows for room {room_id}.")


# ─────────────────────────────────────────────
# UPDATE ROOM  PUT /rooms/{roomId}
# ─────────────────────────────────────────────
def _update_room(event, room_id: str, host_id: str) -> dict:
    """
    Updates mutable room settings (name, allowDownload). Left as-is from
    the original implementation — included here only so the router above
    stays complete; no changes were needed in this function.
    """
    try:
        body = json.loads(event.get("body", "{}"))
        table = dynamodb.Table(get_env("ROOMS_TABLE"))

        response = table.get_item(Key={"PK": f"ROOM#{room_id}", "SK": "METADATA"})
        item = response.get("Item")

        if not item:
            return build_error(404, "Room not found.")
        if item.get("hostId") != host_id:
            return build_error(403, "Forbidden: You do not own this room.")

        update_expr_parts = []
        expr_values = {}

        if "name" in body:
            update_expr_parts.append("roomName = :name")
            expr_values[":name"] = body["name"]
        if "allowDownload" in body:
            update_expr_parts.append("allowDownload = :allow")
            expr_values[":allow"] = bool(body["allowDownload"])

        if not update_expr_parts:
            return build_error(400, "No valid fields to update.")

        table.update_item(
            Key={"PK": f"ROOM#{room_id}", "SK": "METADATA"},
            UpdateExpression="SET " + ", ".join(update_expr_parts),
            ExpressionAttributeValues=expr_values,
        )
        return build_response(200, {"message": "Room updated successfully."})
    except Exception as e:
        print(f"[UpdateRoom] Error: {e}")
        return build_error(500, "Failed to update room.")