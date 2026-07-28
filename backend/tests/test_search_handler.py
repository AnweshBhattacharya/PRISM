import base64
import importlib
import json
import os
from unittest.mock import MagicMock

import boto3
from moto import mock_aws

os.environ["ROOMS_TABLE"] = "EventRooms"
os.environ["PHOTOS_TABLE"] = "RoomPhotos"
os.environ["BUCKET_NAME"] = "test-bucket"
os.environ["REKOGNITION_COLLECTION"] = "eventsnap-faces"
os.environ["GUEST_JWT_SECRET"] = "test-secret"
os.environ["AWS_DEFAULT_REGION"] = "ap-south-1"
os.environ["AWS_ACCESS_KEY_ID"] = "testing"
os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
os.environ["AWS_SECURITY_TOKEN"] = "testing"
os.environ["AWS_SESSION_TOKEN"] = "testing"


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
        ],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "faceId-index",
                "KeySchema": [
                    {"AttributeName": "faceId", "KeyType": "HASH"},
                    {"AttributeName": "roomId", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            }
        ],
        BillingMode="PAY_PER_REQUEST",
    )


@mock_aws
def test_search_falls_back_to_photo_metadata_for_s3_key(monkeypatch):
    import handlers.search as search
    importlib.reload(search)

    dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
    table = _create_photos_table(dynamodb)
    table.put_item(
        Item={
            "PK": "ROOM#room_001",
            "SK": "PHOTO#photo_001",
            "s3Key": "uploads/room_001/photo_001.jpg",
            "roomId": "room_001",
        }
    )
    table.put_item(
        Item={
            "PK": "ROOM#room_001",
            "SK": "FACE#face_001#PHOTO#photo_001",
            "faceId": "face_001",
            "roomId": "room_001",
            "photoId": "photo_001",
            "confidence": "0.95",
        }
    )

    class FakeRekognition:
        class exceptions:
            class InvalidParameterException(Exception):
                pass

        def search_faces_by_image(self, **kwargs):
            return {
                "FaceMatches": [
                    {"Face": {"FaceId": "face_001"}, "Similarity": 90.0}
                ]
            }

    class FakeS3Client:
        def generate_presigned_url(self, operation, Params=None, ExpiresIn=None):
            return f"https://example.com/{Params['Key']}"

    monkeypatch.setattr(search, "rekognition", FakeRekognition())
    monkeypatch.setattr(search, "s3_client", FakeS3Client())

    event = {
        "body": json.dumps({
            "selfieImage": base64.b64encode(b"fake-image").decode("utf-8"),
            "consent": True,
        }),
        "requestContext": {"authorizer": {"roomId": "room_001"}},
    }

    response = search.lambda_handler(event, {})

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["totalMatches"] == 1
    assert body["photos"][0]["photoId"] == "photo_001"
    assert body["photos"][0]["url"] == "https://example.com/uploads/room_001/photo_001.jpg"
