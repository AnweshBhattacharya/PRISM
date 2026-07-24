"""
utils/helpers.py
Shared utility functions used across all Lambda handlers.
"""
import json
import os
import hashlib
import time
import uuid


def build_response(status_code: int, body: dict) -> dict:
    """Build a standard API Gateway HTTP response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",  # Restrict to Amplify URL in production
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET,DELETE",
        },
        "body": json.dumps(body),
    }


def build_error(status_code: int, message: str) -> dict:
    """Build a standard error response."""
    return build_response(status_code, {"error": message})


def get_room_ttl(expiry_days: int = 7) -> int:
    """Calculate a Unix timestamp TTL for a room, defaulting to 7 days."""
    return int(time.time()) + (expiry_days * 24 * 60 * 60)


def generate_id(prefix: str = "") -> str:
    """Generate a unique ID with an optional prefix."""
    return f"{prefix}{uuid.uuid4().hex[:12]}"


def hash_access_code(code: str) -> str:
    """Hash a 6-digit access code using SHA-256 for secure storage."""
    return hashlib.sha256(code.encode()).hexdigest()


def get_env(key: str) -> str:
    """Safely retrieve an environment variable, raising an error if missing."""
    value = os.environ.get(key)
    if not value:
        raise EnvironmentError(f"Missing required environment variable: {key}")
    return value
