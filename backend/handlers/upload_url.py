"""
handlers/upload_url.py

Generates a Pre-signed POST URL for direct-to-S3 uploads.
Route: POST /guest/upload-url

Flow:
1. Guest sends a local file hash (SHA-256) + content type.
2. We check DynamoDB for a duplicate hash in this room.
3. If duplicate → 409 Conflict.
4. If new → generate a Pre-signed POST URL and return it.
   The guest's browser uploads directly to S3, bypassing Lambda payload limits.
"""
import json
import os
import time
import boto3
from boto3.dynamodb.conditions import Key

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.helpers import build_response, build_error, generate_id, get_env

s3_client = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "ap-south-1"))

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/heic", "image/webp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def lambda_handler(event, context):
    """
    Validates the upload request and returns a pre-signed S3 POST URL.
    The guest uses this URL to upload directly to S3.
    """
    try:
        # Extract room context from the custom authorizer
        authorizer_context = event.get("requestContext", {}).get("authorizer", {})
        room_id = authorizer_context.get("roomId")
        session_token = authorizer_context.get("sessionToken")

        if not room_id:
            return build_error(401, "Unauthorized: Room context missing.")

        body = json.loads(event.get("body", "{}"))
        file_hash = body.get("fileHash", "").strip()
        content_type = body.get("contentType", "").strip()

        # ── Input Validation ──────────────────────────────
        if not file_hash or len(file_hash) != 64:
            return build_error(400, "A valid 64-character SHA-256 fileHash is required.")
        if content_type not in ALLOWED_CONTENT_TYPES:
            return build_error(400, f"Invalid content type. Allowed: {ALLOWED_CONTENT_TYPES}")

        # ── Duplicate Detection ───────────────────────────
        photos_table = dynamodb.Table(get_env("PHOTOS_TABLE"))
        duplicate_check = photos_table.query(
            IndexName="hash-index",
            KeyConditionExpression=Key("hash").eq(file_hash) & Key("roomId").eq(room_id),
            Limit=1,
        )
        if duplicate_check.get("Count", 0) > 0:
            return build_response(409, {"error": "This photo has already been uploaded to this room."})

        # ── Generate Pre-signed POST URL ──────────────────
        bucket_name = get_env("BUCKET_NAME")
        photo_id = generate_id("photo_")
        s3_key = f"uploads/{room_id}/{photo_id}.jpg"

        # The pre-signed POST URL expires in 5 minutes
        presigned = s3_client.generate_presigned_post(
            Bucket=bucket_name,
            Key=s3_key,
            Fields={
                "Content-Type": content_type,
                "x-amz-meta-roomid": room_id,
                "x-amz-meta-photoid": photo_id,
                "x-amz-meta-hash": file_hash,
                "x-amz-meta-session": session_token or "",
            },
            Conditions=[
                {"Content-Type": content_type},
                ["content-length-range", 1, MAX_FILE_SIZE_BYTES],
                {"x-amz-meta-roomid": room_id},
                {"x-amz-meta-photoid": photo_id},
                {"x-amz-meta-hash": file_hash},
            ],
            ExpiresIn=300,  # 5 minutes
        )

        return build_response(200, {
            "url": presigned["url"],
            "fields": presigned["fields"],
            "photoId": photo_id,
            "s3Key": s3_key,
        })

    except Exception as e:
        print(f"[UploadUrl] Unexpected error: {e}")
        return build_error(500, "Failed to generate upload URL.")
