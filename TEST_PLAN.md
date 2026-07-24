# Test Plan

## 1. Unit Tests (pytest + moto)
- `test_upload_handler.py`: Test duplicate detection, S3 upload mock, Rekognition index mock.
- `test_search_handler.py`: Test selfie search, confidence threshold logic, pre-signed URL generation.
- `test_room_manager.py`: Test CRUD operations, expiry logic.

## 2. Integration Tests (Postman/Newman)
- **Scenario A**: Host creates room -> Guest uploads 5 photos -> Guest searches selfie -> Matches 3 photos.
- **Scenario B**: Guest uploads duplicate -> Receives 409 Conflict.
- **Scenario C**: Host sets `allowDownload=false` -> Guest sees only View icon, no download button.

## 3. Performance Tests (k6)
- **Target**: `/guest/search` endpoint under 5 seconds with 10 concurrent users.
- **Load**: Simulate 10 guests uploading simultaneously (10 photos each).

## 4. Security Tests
- **Brute Force**: Attempt `/guest/token` with wrong codes 50 times. Ensure rate limit kicks in (429).
- **Access Control**: Try to access `/guest/search` without a JWT -> 401.
- **S3 Leak**: Try to access S3 URL directly without pre-signed signature -> 403.

## 5. UI/UX Testing (Manual)
- Test on Chrome (Desktop), Safari (iOS), Chrome (Android).
- Test Zip upload with 50 images.
- Test low-light selfie capture.
- Test "Is this you?" modal interaction.
