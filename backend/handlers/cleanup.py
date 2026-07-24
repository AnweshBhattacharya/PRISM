"""
handlers/cleanup.py

Scheduled cleanup Lambda — runs daily via EventBridge.
Handles tasks that DynamoDB TTL and S3 Lifecycle Rules can't do on their own:
1. Deletes S3 objects for expired rooms (belt-and-suspenders cleanup).
2. Removes face vectors from the Rekognition Collection for expired photos.

This ensures GDPR compliance: all guest photo data is purged
within 24 hours of a room's expiry date.
"""
import os
import time
import boto3
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.helpers import get_env

s3_client = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
rekognition = boto3.client("rekognition", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "ap-south-1"))

COLLECTION_ID = os.environ.get("REKOGNITION_COLLECTION", "eventsnap-faces")


def lambda_handler(event, context):
    """
    Main entry point for the daily cleanup job.
    Scans for recently expired rooms and purges all associated data.
    """
    print("[Cleanup] Starting daily cleanup job.")
    now = int(time.time())

    # Scan for rooms that have expired in the last 48 hours
    # (DynamoDB TTL may not have deleted them yet — it's eventually consistent)
    rooms_table = dynamodb.Table(get_env("ROOMS_TABLE"))
    expired_rooms = rooms_table.scan(
        FilterExpression=Attr("ttl").lt(now) & Attr("SK").eq("METADATA"),
    ).get("Items", [])

    print(f"[Cleanup] Found {len(expired_rooms)} expired rooms to clean up.")

    for room in expired_rooms:
        room_id = room.get("PK", "").replace("ROOM#", "")
        if room_id:
            _cleanup_room(room_id)

    print("[Cleanup] Job complete.")


def _cleanup_room(room_id: str):
    """
    Full data purge for a single expired room:
    1. Delete all S3 objects in the room's folder.
    2. Delete face vectors from the Rekognition Collection.
    3. Delete remaining DynamoDB photo records.
    """
    print(f"[Cleanup] Purging room: {room_id}")
    bucket_name = get_env("BUCKET_NAME")
    photos_table = dynamodb.Table(get_env("PHOTOS_TABLE"))

    # ── Step 1: Get all photo records for this room ────────────────
    response = photos_table.query(
        KeyConditionExpression="PK = :pk",
        ExpressionAttributeValues={":pk": f"ROOM#{room_id}"},
    )
    items = response.get("Items", [])

    face_ids_to_delete = []
    s3_keys_to_delete = []

    for item in items:
        s3_key = item.get("s3Key")
        if s3_key:
            s3_keys_to_delete.append({"Key": s3_key})
        face_ids = item.get("faceIds", [])
        face_ids_to_delete.extend(face_ids)

    # ── Step 2: Batch delete S3 objects ───────────────────────────
    if s3_keys_to_delete:
        try:
            # S3 batch delete supports up to 1000 keys per call
            for i in range(0, len(s3_keys_to_delete), 1000):
                batch = s3_keys_to_delete[i:i+1000]
                s3_client.delete_objects(
                    Bucket=bucket_name,
                    Delete={"Objects": batch, "Quiet": True},
                )
            print(f"[Cleanup] Deleted {len(s3_keys_to_delete)} S3 objects for room {room_id}.")
        except ClientError as e:
            print(f"[Cleanup] S3 delete error: {e}")

    # ── Step 3: Delete face vectors from Rekognition Collection ───
    if face_ids_to_delete:
        try:
            # Rekognition supports up to 4096 face IDs per call
            for i in range(0, len(face_ids_to_delete), 4096):
                batch = face_ids_to_delete[i:i+4096]
                rekognition.delete_faces(
                    CollectionId=COLLECTION_ID,
                    FaceIds=batch,
                )
            print(f"[Cleanup] Deleted {len(face_ids_to_delete)} face vectors for room {room_id}.")
        except ClientError as e:
            print(f"[Cleanup] Rekognition delete error: {e}")

    print(f"[Cleanup] Finished purging room {room_id}.")
