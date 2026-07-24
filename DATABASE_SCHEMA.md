# Database Schema (DynamoDB)

We use single-table design-like configurations optimized for queries and automated data cleanup via DynamoDB Time-To-Live (TTL).

## 1. Table: `EventRooms`
- **PK**: `ROOM#<roomId>`
- **SK**: `METADATA`
- **Attributes**:
  - `hostId` (String, Host owner UUID)
  - `roomName` (String)
  - `accessCodeHash` (String, SHA-256 of 6-digit code)
  - `expiryDate` (String, ISO-8601 format)
  - `allowDownload` (Boolean)
  - `ttl` (Number, Unix timestamp of expiry date)
- **GSI1 (hostId-index)**:
  - **PK**: `hostId`
  - **SK**: `expiryDate`
  - **Projection**: `ALL`

## 2. Table: `RoomPhotos`
- **PK**: `ROOM#<roomId>`
- **SK**: `PHOTO#<photoId>`
- **Attributes**:
  - `s3Key` (String)
  - `hash` (String, SHA-256/pHash calculated client-side)
  - `faceIds` (List of Strings, AWS Rekognition Face IDs)
  - `isBlurry` (Boolean, set if Rekognition face quality is low)
  - `uploaderSession` (String, guest session identifier)
  - `ttl` (Number, Unix timestamp matching room expiry)
- **GSI1 (faceId-index)**:
  - **PK**: `faceId`
  - **SK**: `roomId`
  - **Projection**: `ALL`

## 3. Table: `GuestSessions`
- **PK**: `SESSION#<sessionToken>`
- **Attributes**:
  - `roomId` (String)
  - `createdAt` (String)
  - `ttl` (Number, Unix timestamp - valid for 1 hour)
