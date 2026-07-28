"""
handlers/index_faces.py

Triggered automatically by S3 when a new photo is uploaded.
This is the CORE of the "index once, retrieve instantly" architecture.

Flow:
1. S3 triggers this Lambda when a file lands in the uploads/ prefix.
2. We call Rekognition IndexFaces on the uploaded image.
3. For EACH detected face, we write a mapping:
      FACE#<faceId>  →  PHOTO#<photoId>  (in the faceId GSI)
4. We also store the photo metadata (s3Key, hash, faceIds, ttl) in RoomPhotos.

This means every future guest search costs just 1 Rekognition call,
not N calls (one per photo in the room).
"""
import json
import os
import time
import urllib.parse
import boto3
from botocore.exceptions import ClientError

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.helpers import get_env

rekognition = boto3.client("rekognition", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "ap-south-1"))

# Minimum face quality confidence threshold
# Lowered from 70.0 to 60.0 to reduce false negatives during indexing.
# This increases recall at the cost of potential false positives (acceptable
# for a photo-sharing app where hosts prefer more matches).
MIN_CONFIDENCE = 60.0
# Rekognition collection to index faces into
COLLECTION_ID = os.environ.get("REKOGNITION_COLLECTION", "eventsnap-faces")


def lambda_handler(event, context):
    """
    Processes each S3 ObjectCreated event.
    One invocation per uploaded photo.
    """
    for record in event.get("Records", []):
        bucket = record["s3"]["bucket"]["name"]
        # S3 keys are URL-encoded — decode them
        key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])

        print(f"[IndexFaces] Processing: s3://{bucket}/{key}")
        _process_photo(bucket, key)


def _process_photo(bucket: str, key: str):
    """
    Indexes all faces in a single photo and writes the mappings to DynamoDB.
    """
    # Extract metadata from the S3 key: uploads/<roomId>/<photoId>.jpg
    parts = key.split("/")
    if len(parts) < 3 or parts[0] != "uploads":
        print(f"[IndexFaces] Skipping unexpected key format: {key}")
        return

    room_id = parts[1]
    photo_id = parts[2].replace(".jpg", "").replace(".png", "").replace(".jpeg", "")

    # ── Step 1: Get the object metadata (hash, session) ─────────────
    s3_client = boto3.client("s3")
    try:
        head = s3_client.head_object(Bucket=bucket, Key=key)
        metadata = head.get("Metadata", {})
        file_hash = metadata.get("hash", "")
        session_token = metadata.get("session", "")
    except ClientError as e:
        print(f"[IndexFaces] Failed to get S3 metadata: {e}")
        file_hash = ""
        session_token = ""

    # ── Step 2: Call Rekognition IndexFaces ──────────────────────────
    try:
        rekog_response = rekognition.index_faces(
            CollectionId=COLLECTION_ID,
            Image={"S3Object": {"Bucket": bucket, "Name": key}},
            ExternalImageId=photo_id,  # Ties the face back to this photo
            DetectionAttributes=["DEFAULT"],
            MaxFaces=10,  # Max faces per photo
            QualityFilter="AUTO",  # Rekognition skips blurry/dark faces
        )
    except ClientError as e:
        print(f"[IndexFaces] Rekognition error: {e}")
        return

    face_records = rekog_response.get("FaceRecords", [])
    unindexed = rekog_response.get("UnindexedFaces", [])
    is_blurry = len(unindexed) > 0 and len(face_records) == 0

    print(f"[IndexFaces] Found {len(face_records)} faces, {len(unindexed)} unindexed.")

    # ── Step 3: Store all face → photo mappings in DynamoDB ──────────
    face_ids = []
    photos_table = dynamodb.Table(get_env("PHOTOS_TABLE"))
    rooms_table = dynamodb.Table(get_env("ROOMS_TABLE"))

    # Look up the room's TTL to inherit it for the photo record
    room_item = rooms_table.get_item(Key={"PK": f"ROOM#{room_id}", "SK": "METADATA"})
    room_ttl = room_item.get("Item", {}).get("ttl", int(time.time()) + 7 * 86400)

    with photos_table.batch_writer() as batch:
        for face_record in face_records:
            face = face_record.get("Face", {})
            face_id = face.get("FaceId")
            confidence = face.get("Confidence", 0.0)

            if not face_id or confidence < MIN_CONFIDENCE:
                continue

            face_ids.append(face_id)

            # Each face gets its own GSI entry: faceId → photoId
            # This is what makes O(1) searches possible
            batch.put_item(
                Item={
                    "PK": f"ROOM#{room_id}",
                    "SK": f"FACE#{face_id}#PHOTO#{photo_id}",
                    "faceId": face_id,
                    "roomId": room_id,
                    "photoId": photo_id,
                    "s3Key": key,
                    "confidence": str(round(confidence, 4)),
                    "ttl": room_ttl,
                }
            )

    # ── Step 4: Store the photo-level metadata record ─────────────────
    if face_ids or is_blurry:
        photos_table.put_item(
            Item={
                "PK": f"ROOM#{room_id}",
                "SK": f"PHOTO#{photo_id}",
                "s3Key": key,
                "hash": file_hash,
                "faceIds": face_ids,
                "isBlurry": is_blurry,
                "uploaderSession": session_token,
                "photoCount": len(face_ids),
                "ttl": room_ttl,
            }
        )

        # Increment the room's photo count
        try:
            rooms_table.update_item(
                Key={"PK": f"ROOM#{room_id}", "SK": "METADATA"},
                UpdateExpression="ADD photoCount :val",
                ExpressionAttributeValues={":val": 1},
            )
        except Exception as e:
            print(f"[IndexFaces] Failed to increment photo count: {e}")

    print(f"[IndexFaces] Done. Photo {photo_id} indexed with {len(face_ids)} faces.")
