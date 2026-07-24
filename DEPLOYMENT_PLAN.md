# Deployment Plan (Updated with CI/CD)

## Phase 1: Bootstrap AWS Resources (Manual - One Time)
1. **Set AWS CLI** and default region (us-east-1).
2. **S3 Bucket**: `eventsnap-uploads-<account-id>` (Private, Versioning enabled).
3. **Rekognition**: `aws rekognition create-collection --collection-id eventsnap-faces`.
4. **Cognito**: Create User Pool and App Client. Copy the User Pool ID.
5. **GitHub Secrets**: Add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` to your repository (for GitHub Actions).

## Phase 2: Backend Deployment (Automated via CI/CD)
1. Write `template.yaml` (SAM).
2. Push code to `main`. GitHub Actions runs `sam deploy`.
3. API Gateway URL will be output from SAM. Copy the URL.

## Phase 3: Frontend Deployment (Automated via Amplify)
1. Connect Amplify to GitHub.
2. Enter the API Gateway URL as `VITE_API_URL` in Amplify Environment Variables.
3. Push frontend code. Amplify automatically builds and deploys.

## Phase 4: Mobile (App Stores) - *Optional*
1. Follow `MOBILE_STRATEGY.md` to add Capacitor.
2. Build the APK locally via Android Studio and test on emulator.
3. To publish: Requires a Google Play Developer account ($25 one-time) and Apple Developer account ($99/year). For a resume project, distributing an APK via Firebase App Distribution or TestFlight is sufficient to demo to employers.