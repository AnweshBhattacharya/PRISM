# CI/CD Pipeline Strategy

## 1. Frontend (AWS Amplify) - Auto-Deploy on Git Push
- **Link**: AWS Amplify Console -> Connect GitHub repo -> Select `main` branch.
- **Build Spec** (`amplify.yml`):
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - .npm/**/*
```

## 2. Backend (GitHub Actions + AWS SAM) - Test & Deploy
File: `.github/workflows/deploy-backend.yml`
```yaml
name: Deploy Backend

on:
  push:
    branches: [ main ]
    paths:
      - 'backend/**'
      - 'template.yaml'
  pull_request:
    branches: [ main ]
    paths:
      - 'backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -r backend/requirements.txt
          pip install pytest moto flake8
      - name: Lint code
        run: flake8 backend/
      - name: Run tests
        run: pytest backend/tests/

  deploy:
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: aws-actions/setup-sam@v2
      - uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1
      - name: Build SAM
        run: sam build
      - name: Deploy Stack
        run: |
          sam deploy \
            --no-confirm-changeset \
            --no-fail-on-empty-changeset \
            --stack-name eventsnap-backend \
            --capabilities CAPABILITY_IAM
```
