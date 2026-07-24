# Technical Architecture

## Infrastructure-as-Code (SAM)
We use **AWS SAM** (`template.yaml`) to define the serverless stack:
- DynamoDB Tables (`EventRooms`, `RoomPhotos`, `GuestSessions`)
- S3 Bucket (Private, with CORS configured for direct client uploads)
- Lambda Functions (REST API Handlers & Event-driven indexer)
- API Gateway (REST API with Custom Authorizers)
- Cognito User Pool (Host identity management)

## Data Flows (Optimized)

### 1. Upload Flow (Direct-to-S3)
1. **Client** requests a Pre-signed POST URL from **API Gateway** `/guest/upload-url`, sending the calculated local file hash (`SHA-256`) and file content type.
2. **Lambda (Upload URL Handler)**:
   - Checks `RoomPhotos` table to verify if the file hash already exists in this room.
   - If a duplicate hash exists, returns a `409 Conflict` error to prevent redundant uploads.
   - If not a duplicate, generates and returns an S3 Pre-signed POST URL and temporary upload fields.
3. **Client** uploads the image file directly to the **S3 Bucket** using the pre-signed credentials (bypassing Lambda execution payload limit).
4. **S3 Bucket** triggers a Lambda event notification upon successful file creation.
5. **Lambda (Index Faces Handler)**:
   - Receives S3 event payload.
   - Calls **AWS Rekognition** `IndexFaces` on the uploaded image.
   - Stores the returned `FaceIds`, S3 key, local file hash, and blur/quality flag in the `RoomPhotos` table.

### 2. Search/View Flow (Selfie Matching)
1. **Client** prompts guest for Biometric Consent. Once checked, captures/uploads a live selfie image via webcam (Base64).
2. **Client** calls `/guest/search` (POST), sending the Base64 image.
3. **Lambda (Search Handler)**:
   - Validates Guest JWT using the custom authorizer.
   - Calls **AWS Rekognition** `SearchFacesByImage` against the collection (threshold 60%, max 10 faces).
   - Queries the DynamoDB Global Secondary Index `faceId-index` for photo IDs containing those matched Face IDs.
   - Generates temporary S3 pre-signed GET URLs (valid for 15 minutes) for each matching photo.
   - Returns URLs to the client. If match confidence is low (< 80%), flags the image for client-side "Is this you?" confirmation.

## Project Directory Structure
```text
eventsnap/
├── .github/
│   └── workflows/
│       └── deploy-backend.yml
├── backend/
│   ├── authorizers/
│   │   └── guest_authorizer.py
│   ├── handlers/
│   │   ├── upload_url.py
│   │   ├── index_faces.py
│   │   ├── search.py
│   │   ├── room_manager.py
│   │   └── cleanup.py
│   ├── tests/
│   │   ├── test_upload_handler.py
│   │   └── test_room_manager.py
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── template.yaml
├── README.md
└── PROJECT_GUIDE.md
```
