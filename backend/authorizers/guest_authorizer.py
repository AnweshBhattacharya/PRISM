"""
authorizers/guest_authorizer.py

Custom Lambda Authorizer for Guest access.
Validates the guest JWT token issued after entering a room code.
Returns an IAM Policy that either allows or denies the request.
"""
import os
import json
import time
import boto3
from jose import jwt, JWTError

# The secret used to sign guest JWTs — stored as an environment variable.
GUEST_JWT_SECRET = os.environ.get("GUEST_JWT_SECRET", "changeme-in-production")


def lambda_handler(event, context):
    """
    API Gateway calls this function to validate every incoming guest request.
    Input: Token from the Authorization header.
    Output: IAM Allow/Deny policy.
    """
    token = event.get("authorizationToken", "").replace("Bearer ", "")
    method_arn = event.get("methodArn", "")

    try:
        # Decode and validate the JWT
        payload = jwt.decode(token, GUEST_JWT_SECRET, algorithms=["HS256"])

        # Check token expiry
        if payload.get("exp", 0) < time.time():
            raise JWTError("Token has expired")

        room_id = payload.get("roomId")
        session_token = payload.get("sessionToken")

        if not room_id or not session_token:
            raise JWTError("Invalid token payload")

        # Build an ALLOW policy and attach context for downstream Lambdas
        policy = _generate_policy(
            principal_id=session_token,
            effect="Allow",
            resource=method_arn,
            context={"roomId": room_id, "sessionToken": session_token},
        )
        return policy

    except JWTError as e:
        print(f"[GuestAuthorizer] Auth failed: {e}")
        raise Exception("Unauthorized")


def _generate_policy(principal_id, effect, resource, context=None):
    """Build a standard IAM authorizer policy document."""
    policy = {
        "principalId": principal_id,
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "execute-api:Invoke",
                    "Effect": effect,
                    "Resource": resource,
                }
            ],
        },
    }
    if context:
        policy["context"] = context
    return policy
