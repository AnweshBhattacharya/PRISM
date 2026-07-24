"""
custom_resources/s3_notification.py

CloudFormation Custom Resource handler.
Wires up (or removes) an S3 bucket notification to a Lambda function.
Used because SAM S3Event triggers require the bucket to be in the same template.
"""
import boto3
import json
import urllib.request


def send_response(event, context, status, data=None):
    """Send a response back to CloudFormation."""
    body = json.dumps({
        "Status": status,
        "Reason": f"See CloudWatch log stream: {context.log_stream_name}",
        "PhysicalResourceId": "s3-notification-" + event["ResourceProperties"]["BucketName"],
        "StackId": event["StackId"],
        "RequestId": event["RequestId"],
        "LogicalResourceId": event["LogicalResourceId"],
        "Data": data or {},
    })
    req = urllib.request.Request(
        event["ResponseURL"],
        data=body.encode("utf-8"),
        method="PUT",
        headers={"Content-Type": ""},
    )
    urllib.request.urlopen(req)


def lambda_handler(event, context):
    s3 = boto3.client("s3")
    bucket = event["ResourceProperties"]["BucketName"]
    lambda_arn = event["ResourceProperties"]["LambdaArn"]

    try:
        if event["RequestType"] == "Delete":
            # Remove the notification on stack deletion
            s3.put_bucket_notification_configuration(
                Bucket=bucket,
                NotificationConfiguration={},
            )
        else:
            # Create or Update — set the notification
            s3.put_bucket_notification_configuration(
                Bucket=bucket,
                NotificationConfiguration={
                    "LambdaFunctionConfigurations": [
                        {
                            "LambdaFunctionArn": lambda_arn,
                            "Events": ["s3:ObjectCreated:*"],
                            "Filter": {
                                "Key": {
                                    "FilterRules": [
                                        {"Name": "prefix", "Value": "uploads/"}
                                    ]
                                }
                            },
                        }
                    ]
                },
            )
        send_response(event, context, "SUCCESS")
    except Exception as e:
        print(f"[S3Notification] Error: {e}")
        send_response(event, context, "FAILED", {"Error": str(e)})
