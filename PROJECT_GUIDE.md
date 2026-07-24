# EventSnap - Project Guide

## Product Vision
A privacy-first, AI-powered event photo gallery. Event hosts create secure, temporary photo rooms, and guests use a live biometric selfie to instantly filter the gallery, viewing only the photos in which they appear.

## Core User Stories (MVP)
| ID | Epic | User Story | Priority |
| :--- | :--- | :--- | :--- |
| **AUTH-01** | Host Access | As a host, I want to sign up and log in securely so that I can manage my event rooms. | P0 (Must) |
| **ROOM-01** | Room Creation | As a host, I want to create a room with a custom name, 6-digit access code, and expiry date. | P0 (Must) |
| **GUEST-01** | Room Access | As a guest, I want to enter a 6-digit code to access a room without creating an account. | P0 (Must) |
| **UPL-01** | Photo Upload | As a guest, I want to upload photos directly to the gallery using temporary secure links to ensure fast, reliable uploads. | P0 (Must) |
| **PRIV-01** | Biometric Consent | As a guest, I must check a consent box before activating my camera to comply with privacy regulations. | P0 (Must) |
| **AI-01** | Face Matching | As a guest, I want to take a live selfie so the AI can filter the gallery to show only photos of me. | P0 (Must) |
| **GAL-01** | Photo Viewing | As a guest, I want to view my matched photos in a responsive, mobile-friendly gallery. | P0 (Must) |
| **DEL-01** | Data Erasure | As a guest, I want to request the deletion of a photo I am in to maintain control over my privacy. | P1 (Should) |
| **FEED-01** | Feedback Loop | As a guest, I want low-confidence matches to trigger an "Is this you?" loop to verify my identity. | P1 (Should) |

## Non-Functional Requirements
- **Latency**: Face search and gallery rendering must complete in under 5 seconds (p95).
- **Cost & Scale**: Stays within AWS Free Tier for MVP volumes (serverless components only).
- **Mobile**: Fully responsive; installable as a Progressive Web App (PWA) on iOS and Android.
- **Compliance (GDPR/CCPA)**:
  - Explicit biometric consent before webcam access.
  - S3 Lifecycle Rules automatically purge photos 24 hours after a room's expiration date.
  - DynamoDB Time-To-Live (TTL) automatically deletes expired room and photo metadata.
  - User can request data erasure (solo photos auto-deleted; group photos require host approval notification via SNS).
