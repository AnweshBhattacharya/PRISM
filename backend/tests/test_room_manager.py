"""
tests/test_room_manager.py

Tests for room CRUD operations using moto to mock AWS services.
Written BEFORE implementation per TDD guidelines.
"""
import json
import os
import pytest
import boto3
from moto import mock_dynamodb

# Set environment variables before importing handlers
os.environ["ROOMS_TABLE"] = "EventRooms"
os.environ["PHOTOS_TABLE"] = "RoomPhotos"
os.environ["SESSIONS_TABLE"] = "GuestSessions"
os.environ["BUCKET_NAME"] = "test-bucket"
os.environ["REKOGNITION_COLLECTION"] = "eventsnap-faces"
os.environ["AWS_DEFAULT_REGION"] = "ap-south-1"
os.environ["AWS_ACCESS_KEY_ID"] = "testing"
os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
os.environ["AWS_SECURITY_TOKEN"] = "testing"
os.environ["AWS_SESSION_TOKEN"] = "testing"


def _create_rooms_table(dynamodb):
    """Helper to create the EventRooms DynamoDB table in the mock."""
    return dynamodb.create_table(
        TableName="EventRooms",
        KeySchema=[
            {"AttributeName": "PK", "KeyType": "HASH"},
            {"AttributeName": "SK", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "PK", "AttributeType": "S"},
            {"AttributeName": "SK", "AttributeType": "S"},
            {"AttributeName": "hostId", "AttributeType": "S"},
            {"AttributeName": "expiryDate", "AttributeType": "S"},
        ],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "hostId-index",
                "KeySchema": [
                    {"AttributeName": "hostId", "KeyType": "HASH"},
                    {"AttributeName": "expiryDate", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            }
        ],
        BillingMode="PAY_PER_REQUEST",
    )


def _make_event(method, path, body=None, host_id="host_abc"):
    """Helper to build a mock API Gateway event."""
    return {
        "httpMethod": method,
        "path": path,
        "pathParameters": {},
        "body": json.dumps(body) if body else "{}",
        "requestContext": {
            "authorizer": {
                "claims": {"sub": host_id}
            }
        },
    }


@mock_dynamodb
def test_create_room_success():
    """A valid room creation returns 201 with roomId and accessCode."""
    import importlib
    import handlers.room_manager as rm
    importlib.reload(rm)

    dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
    _create_rooms_table(dynamodb)

    event = _make_event("POST", "/rooms", {"name": "My Wedding", "expiryDays": 7})
    response = rm.lambda_handler(event, {})

    assert response["statusCode"] == 201
    body = json.loads(response["body"])
    assert "roomId" in body
    assert "accessCode" in body
    assert len(body["accessCode"]) == 6
    assert body["accessCode"].isdigit()


@mock_dynamodb
def test_create_room_missing_name():
    """A room creation without a name returns 400."""
    import importlib
    import handlers.room_manager as rm
    importlib.reload(rm)

    dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
    _create_rooms_table(dynamodb)

    event = _make_event("POST", "/rooms", {"name": "", "expiryDays": 7})
    response = rm.lambda_handler(event, {})

    assert response["statusCode"] == 400


@mock_dynamodb
def test_create_room_invalid_expiry():
    """Expiry days outside 1-30 range returns 400."""
    import importlib
    import handlers.room_manager as rm
    importlib.reload(rm)

    dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
    _create_rooms_table(dynamodb)

    event = _make_event("POST", "/rooms", {"name": "Test", "expiryDays": 50})
    response = rm.lambda_handler(event, {})

    assert response["statusCode"] == 400


@mock_dynamodb
def test_list_rooms_returns_host_rooms():
    """List rooms returns only rooms belonging to the authenticated host."""
    import importlib
    import handlers.room_manager as rm
    importlib.reload(rm)

    dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
    _create_rooms_table(dynamodb)

    # Create a room first
    create_event = _make_event("POST", "/rooms", {"name": "Event A"}, host_id="host_123")
    rm.lambda_handler(create_event, {})

    list_event = _make_event("GET", "/rooms", host_id="host_123")
    response = rm.lambda_handler(list_event, {})

    assert response["statusCode"] == 200
    rooms = json.loads(response["body"])
    assert len(rooms) >= 1
    assert rooms[0]["name"] == "Event A"


@mock_dynamodb
def test_delete_room_wrong_host():
    """A host cannot delete a room they don't own — returns 403."""
    import importlib
    import handlers.room_manager as rm
    importlib.reload(rm)

    dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
    table = _create_rooms_table(dynamodb)

    # Seed a room owned by host_A
    table.put_item(Item={
        "PK": "ROOM#room123",
        "SK": "METADATA",
        "hostId": "host_A",
        "roomName": "Wedding",
        "expiryDate": "2030-01-01T00:00:00Z",
        "ttl": 9999999999,
    })

    # host_B tries to delete it
    event = {
        "httpMethod": "DELETE",
        "path": "/rooms/room123",
        "pathParameters": {"roomId": "room123"},
        "body": "{}",
        "requestContext": {"authorizer": {"claims": {"sub": "host_B"}}},
    }
    response = rm.lambda_handler(event, {})
    assert response["statusCode"] == 403
