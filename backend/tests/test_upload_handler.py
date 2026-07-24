"""
tests/test_upload_handler.py

Tests for the pre-signed upload URL handler.
Uses moto to mock S3 and DynamoDB.
"""
import json
import os
import pytest
import boto3
from moto import mock_dynamodb, mock_s3

os.environ["ROOMS_TABLE"] = "EventRooms"
os.environ["PHOTOS_TABLE"] = "RoomPhotos"
os.environ["BUCKET_NAME"] = "test-bucket"
os.environ["REKOGNITION_COLLECTION"] = "eventsnap-faces"
os.environ["AWS_DEFAULT_REGION"] = "ap-south-1"
os.environ["AWS_ACCESS_KEY_ID"] = "testing"
os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
os.environ["AWS_SECURITY_TOKEN"] = "testing"
os.environ["AWS_SESSION_TOKEN"] = "testing"

VALID_HASH = "a" * 64  # Valid 64-char SHA-256 placeholder


def _create_photos_table(dynamodb):
    return dynamodb.create_table(
        TableName="RoomPhotos",
        KeySchema=[
            {"AttributeName": "PK", "KeyType": "HASH"},
            {"AttributeName": "SK", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "PK", "AttributeType": "S"},
            {"AttributeName": "SK", "AttributeType": "S"},
            {"AttributeName": "faceId", "AttributeType": "S"},
            {"AttributeName": "roomId", "AttributeType": "S"},
            {"AttributeName": "hash", "AttributeType": "S"},
        ],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "faceId-index",
                "KeySchema": [
                    {"AttributeName": "faceId", "KeyType": "HASH"},
                    {"AttributeName": "roomId", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
            {
                "IndexName": "hash-index",
                "KeySchema": [
                    {"AttributeName": "hash", "KeyType": "HASH"},
                    {"AttributeName": "roomId", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
        BillingMode="PAY_PER_REQUEST",
    )


def _make_upload_event(file_hash=VALID_HASH, content_type="image/jpeg", room_id="room_001"):
    return {
        "httpMethod": "POST",
        "path": "/guest/upload-url",
        "body": json.dumps({"fileHash": file_hash, "contentType": content_type}),
        "requestContext": {
            "authorizer": {"roomId": room_id, "sessionToken": "sess_abc"}
        },
    }


@mock_dynamodb
@mock_s3
def test_upload_url_success():
    """A valid request returns a 200 with a pre-signed URL."""
    import importlib
    import handlers.upload_url as uu
    importlib.reload(uu)

    boto3.resource("dynamodb", region_name="ap-south-1")
    _create_photos_table(boto3.resource("dynamodb", region_name="ap-south-1"))
    s3 = boto3.client("s3", region_name="ap-south-1")
    s3.create_bucket(
        Bucket="test-bucket",
        CreateBucketConfiguration={"LocationConstraint": "ap-south-1"},
    )

    event = _make_upload_event()
    response = uu.lambda_handler(event, {})

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert "url" in body
    assert "fields" in body
    assert "photoId" in body


@mock_dynamodb
@mock_s3
def test_upload_url_duplicate_rejected():
    """A duplicate file hash in the same room returns 409 Conflict."""
    import importlib
    import handlers.upload_url as uu
    importlib.reload(uu)

    dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
    table = _create_photos_table(dynamodb)
    s3 = boto3.client("s3", region_name="ap-south-1")
    s3.create_bucket(
        Bucket="test-bucket",
        CreateBucketConfiguration={"LocationConstraint": "ap-south-1"},
    )

    # Seed a duplicate hash record
    table.put_item(Item={
        "PK": "ROOM#room_001",
        "SK": "PHOTO#photo_dup",
        "hash": VALID_HASH,
        "roomId": "room_001",
        "faceId": "FACE#fake",
    })

    event = _make_upload_event(file_hash=VALID_HASH)
    response = uu.lambda_handler(event, {})
    assert response["statusCode"] == 409


@mock_dynamodb
@mock_s3
def test_upload_url_invalid_content_type():
    """An unsupported content type returns 400."""
    import importlib
    import handlers.upload_url as uu
    importlib.reload(uu)

    _create_photos_table(boto3.resource("dynamodb", region_name="ap-south-1"))
    boto3.client("s3", region_name="ap-south-1").create_bucket(
        Bucket="test-bucket",
        CreateBucketConfiguration={"LocationConstraint": "ap-south-1"},
    )

    event = _make_upload_event(content_type="application/pdf")
    response = uu.lambda_handler(event, {})
    assert response["statusCode"] == 400


@mock_dynamodb
@mock_s3
def test_upload_url_invalid_hash_length():
    """A file hash that is not 64 characters long returns 400."""
    import importlib
    import handlers.upload_url as uu
    importlib.reload(uu)

    _create_photos_table(boto3.resource("dynamodb", region_name="ap-south-1"))
    boto3.client("s3", region_name="ap-south-1").create_bucket(
        Bucket="test-bucket",
        CreateBucketConfiguration={"LocationConstraint": "ap-south-1"},
    )

    event = _make_upload_event(file_hash="tooshort")
    response = uu.lambda_handler(event, {})
    assert response["statusCode"] == 400
