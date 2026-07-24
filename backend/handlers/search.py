"""
handlers/search.py

The guest selfie search endpoint. This is the "retrieve instantly" half
of the "index once, retrieve instantly" architecture.

Route: POST /guest/search

Flow:
1. Receive a Base64-encoded selfie from the guest.
2. Call Rekognition SearchFacesByImage → returns the guest's FaceId (1 API call).
3. Query the DynamoDB faceId-index GSI with that FaceId → instantly gets all
   photo IDs containing the guest's face.
4. Generate temporary 15-minute pre-signed GET URLs for each matched photo.
5. If match confidence is between 60-80%, flag it for "Is this you?" confirmation.
6. Return the filtered gallery to the guest.
"""
import base64
import json
import os
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.helpers import build_response, build_error, get_env

rekognition = boto3.client("rekognition", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
s3_client = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "ap-south-1"))

COLLECTION_ID = os.environ.get("REKOGNITION_COLLECTION", "eventsnap-faces")
PRESIGNED_URL_EXPIRY = 900  # 15 minutes
HIGH_CONFIDENCE_THRESHOLD = 80.0
LOW_CONFIDENCE_THRESHOLD = 60.0


def lambda_handler(event, context):
    """
    Accepts a guest's selfie, finds matching photos using the FaceId index,
    and returns signed S3 URLs for all matched photos.
    """
    try:
        # Extract room from the custom guest authorizer context
        authorizer_context = event.get("requestContext", {}).get("authorizer", {})
        room_id = authorizer_context.get("roomId")

        if not room_id:
            return build_error(401, "Unauthorized: Room context missing.")

        body = json.loads(event.get("body", "{}"))
        selfie_b64 = body.get("selfieImage", "")
        consent = body.get("consent", False)

        # ── Consent Gate ─────────────────────────────────────────────
        if not consent:
            return build_error(400, "Biometric consent is required to perform face search.")

        # ── Decode Selfie ─────────────────────────────────────────────
        if not selfie_b64:
            return build_error(400, "selfieImage is required.")

        # Strip the data URI prefix if present (data:image/jpeg;base64,...)
        if "," in selfie_b64:
            selfie_b64 = selfie_b64.split(",")[1]

        try:
            selfie_bytes = base64.b64decode(selfie_b64)
        except Exception:
            return build_error(400, "Invalid Base64 image data.")

        # ── Step 1: Rekognition SearchFacesByImage (1 API call only) ──
        try:
            rekog_response = rekognition.search_faces_by_image(
                CollectionId=COLLECTION_ID,
                Image={"Bytes": selfie_bytes},
                MaxFaces=10,
                FaceMatchThreshold=LOW_CONFIDENCE_THRESHOLD,
            )
        except rekognition.exceptions.InvalidParameterException:
            return build_error(400, "No face detected in the selfie. Please try again with better lighting.")
        except ClientError as e:
            print(f"[Search] Rekognition error: {e}")
            return build_error(500, "Face search failed. Please try again.")

        face_matches = rekog_response.get("FaceMatches", [])

        if not face_matches:
            return build_response(200, {"photos": [], "message": "No matching photos found."})

        # ── Step 2: Query DynamoDB GSI for all matching photos ────────
        photos_table = dynamodb.Table(get_env("PHOTOS_TABLE"))
        matched_photos = {}  # photoId → best confidence

        for match in face_matches:
            face_id = match["Face"]["FaceId"]
            similarity = match["Similarity"]

            # Query the faceId-index GSI for this room + faceId combination
            response = photos_table.query(
                IndexName="faceId-index",
                KeyConditionExpression=Key("faceId").eq(face_id) & Key("roomId").eq(room_id),
            )

            for item in response.get("Items", []):
                photo_id = item.get("photoId")
                existing_confidence = matched_photos.get(photo_id, {}).get("confidence", 0)
                # Keep the highest confidence score for each photo
                if similarity > existing_confidence:
                    matched_photos[photo_id] = {
                        "confidence": similarity,
                        "s3Key": item.get("s3Key", ""),
                    }

        if not matched_photos:
            return build_response(200, {"photos": [], "message": "No matching photos found in this room."})

        # ── Step 3: Generate Pre-signed GET URLs ──────────────────────
        bucket_name = get_env("BUCKET_NAME")
        result_photos = []

        for photo_id, photo_data in matched_photos.items():
            s3_key = photo_data.get("s3Key")
            confidence = photo_data.get("confidence", 0)

            if not s3_key:
                continue

            try:
                presigned_url = s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": bucket_name, "Key": s3_key},
                    ExpiresIn=PRESIGNED_URL_EXPIRY,
                )
            except ClientError as e:
                print(f"[Search] Failed to generate presigned URL for {s3_key}: {e}")
                continue

            # Flag low-confidence matches for the "Is this you?" modal
            needs_confirmation = confidence < HIGH_CONFIDENCE_THRESHOLD

            result_photos.append({
                "photoId": photo_id,
                "url": presigned_url,
                "confidence": round(confidence, 2),
                "needs_confirmation": needs_confirmation,
            })

        # Sort by confidence descending (best matches first)
        result_photos.sort(key=lambda x: x["confidence"], reverse=True)

        return build_response(200, {
            "photos": result_photos,
            "totalMatches": len(result_photos),
        })

    except Exception as e:
        print(f"[Search] Unexpected error: {e}")
        return build_error(500, "An unexpected error occurred.")
