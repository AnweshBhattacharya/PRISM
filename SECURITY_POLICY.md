# Security & Privacy Policy

## Data Encryption
- **At Rest**: S3 Server-Side Encryption (SSE-S3). DynamoDB encryption at rest (default).
- **In Transit**: HTTPS (TLS 1.2+) via API Gateway and CloudFront.

## PII Handling (Faces)
- Faces are processed by Rekognition and stored as vectors. We do NOT store raw face crops permanently (only temporary in memory for "Is this you?" prompt).
- Rekognition Collection does not store the actual image, only the vector. S3 holds the original photos.

## GDPR Rights (Data Erasure)
- **Solo Photos**: Guest authenticates via selfie -> Immediately deletes the S3 object and DynamoDB entry (no host approval required).
- **Group Photos**: Guest submits request -> Host receives SNS notification -> Host approves/rejects via Dashboard. If approved, delete S3 object + metadata.

## Access Control
- **Pre-signed URLs**: All S3 downloads use pre-signed URLs valid for 15 minutes.
- **Room Code**: 6-digit numeric code. Stored as SHA-256 hash in DynamoDB to prevent exposure. Rate limiting (5 attempts per 15 mins) on `/guest/token`.

## Secure Development
- No secrets in code. Use AWS Secrets Manager for Rekognition API keys (though IAM roles are preferred).
- Input validation on all Lambda handlers (file size < 10MB, MIME type validation).
