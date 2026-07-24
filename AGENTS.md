# Project: EventSnap - AI Development Guidelines (V2)

## Core Rules
- **Cost-First**: AWS Free Tier only. Serverless (Lambda, DynamoDB, S3, Rekognition).
- **Documentation**: Update `PROJECT_GUIDE.md` and `ARCHITECTURE.md` for any design changes.
- **Testing**: Write `pytest` tests BEFORE implementation. Mock AWS with `moto`.
- **Security**: Never log PII. Use Signed URLs.
- **Code Style**: Python 3.11 (Lambda). React + TailwindCSS (Frontend).
- **Mobile**: Design responsive from the start. All components must be touch-friendly (min 44px). Use `useMediaQuery` for breakpoints.

## CI/CD Rules
- Every pull request to `main` must pass GitHub Actions (Backend: pytest + flake8. Frontend: npm run build).
- Backend deployment: Use `AWS SAM` (Serverless Application Model) for Infrastructure-as-Code.
- Frontend deployment: AWS Amplify automatically deploys on `main` branch updates.

## Tech Stack (Fixed)
- **IaC**: AWS SAM (template.yaml) for Lambda, API Gateway, DynamoDB, S3.
- **Frontend**: React + Vite + TailwindCSS.
- **Mobile**: Capacitor (to wrap web app into Android/iOS) + PWA manifest for installability.
