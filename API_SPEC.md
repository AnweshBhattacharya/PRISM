# API Specification

**Base URL**: `https://api.eventsnap.com/v1`

## Authentication
- **Host Authorizer**: AWS Cognito JWT (passed in `Authorization` header).
- **Guest Authorizer**: Custom Lambda Authorizer (validates room access code, passed in `Authorization` header).

## Host Endpoints (Cognito Auth)

### 1. Create Room
- **Method / Path**: `POST /rooms`
- **Body**:
  ```json
  {
    "name": "My Wedding",
    "expiryDays": 7,
    "allowDownload": true
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "roomId": "room_abc123",
    "accessCode": "748392",
    "expiryDate": "2026-08-01T12:00:00Z"
  }
  ```

### 2. List Rooms
- **Method / Path**: `GET /rooms`
- **Response (200 OK)**:
  ```json
  [
    {
      "roomId": "room_abc123",
      "name": "My Wedding",
      "photoCount": 42,
      "expiryDate": "2026-08-01T12:00:00Z"
    }
  ]
  ```

### 3. Delete Room
- **Method / Path**: `DELETE /rooms/{roomId}`
- **Response (200 OK)**: `{ "message": "Room deleted successfully." }`

---

## Guest Endpoints

### 1. Validate Room Code (No Auth)
- **Method / Path**: `POST /guest/token`
- **Body**:
  ```json
  {
    "roomId": "room_abc123",
    "accessCode": "748392"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "guestToken": "eyJhbGciOi..."
  }
  ```

### 2. Request Pre-signed Upload URL (Guest JWT Auth)
- **Method / Path**: `POST /guest/upload-url`
- **Body**:
  ```json
  {
    "fileHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "contentType": "image/jpeg"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "url": "https://eventsnap-uploads.s3.amazonaws.com/",
    "fields": {
      "key": "uploads/room_abc123/uuid-here.jpg",
      "AWSAccessKeyId": "AKIA...",
      "policy": "eyJleHBpcm...",
      "signature": "ab43f..."
    }
  }
  ```
- **Response (409 Conflict)**: `{ "error": "This photo has already been uploaded." }`

### 3. Face Search Gallery (Guest JWT Auth)
- **Method / Path**: `POST /guest/search`
- **Body**:
  ```json
  {
    "selfieImage": "data:image/jpeg;base64,...",
    "consent": true
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "photos": [
      {
        "photoId": "photo_987",
        "url": "https://eventsnap-uploads.s3.amazonaws.com/uploads/room_abc123/uuid.jpg?AWSAccessKeyId=...",
        "needs_confirmation": false
      },
      {
        "photoId": "photo_654",
        "url": "https://eventsnap-uploads.s3.amazonaws.com/uploads/room_abc123/uuid2.jpg?AWSAccessKeyId=...",
        "needs_confirmation": true,
        "faceCropUrl": "https://eventsnap-uploads.s3.amazonaws.com/crops/uuid2_face.jpg?..."
      }
    ]
  }
  ```

### 4. Request Deletion (Guest JWT Auth)
- **Method / Path**: `POST /guest/request-delete`
- **Body**:
  ```json
  {
    "photoId": "photo_987",
    "selfieImage": "data:image/jpeg;base64,..."
  }
  ```
- **Response (200 OK)**: `{ "message": "Deletion request registered. If it is a group photo, host approval is pending." }`
