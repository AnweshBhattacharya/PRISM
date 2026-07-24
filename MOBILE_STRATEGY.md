# Mobile Strategy: From Web to App

Since your frontend is already React (web), we have three pathways. For a resume project, **Path 1 + 2** are highly recommended for maximum impact with minimal cost.

## Path 1: Progressive Web App (PWA) - *Base Requirement*
- **Goal**: Make the website installable on Android/iOS home screens.
- **Action**:
  1. Create `manifest.json` (icons, theme_color, start_url).
  2. Add service worker (Vite plugin: `vite-plugin-pwa`).
- **Result**: Users can click "Add to Home Screen". Feels like a native app. Uses native camera access via `react-webcam`.

## Path 2: Capacitor (Cross-Platform Native Wrapper) - *For App Store Deployment*
- **Goal**: Wrap the built web app into actual Android (APK/AAB) and iOS (IPA) packages.
- **Why**: Uses the exact same codebase. No need to rewrite in Swift/Kotlin.
- **Steps**:
  ```bash
  npm install @capacitor/core @capacitor/cli
  npm install @capacitor/camera @capacitor/filesystem @capacitor/preferences
  npx cap init EventSnap com.eventsnap.app --web-dir=dist
  npx cap add android
  npx cap add ios
  npx cap sync
  ```
- **Native Features**: Capacitor plugins handle Camera, File System, and Push Notifications.
- **Build**:
  - **Android**: Open `android/` in Android Studio -> Build -> Generate Signed Bundle.
  - **iOS**: Open `ios/` in Xcode -> Archive -> Upload to App Store Connect.
