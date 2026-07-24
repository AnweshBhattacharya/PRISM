# Frontend Specification

## Tech Stack
- **Framework**: React 18 + Vite
- **Styling**: TailwindCSS (Mobile-first, responsive grid layout)
- **Routing**: React Router DOM v6
- **Webcam Interface**: `react-webcam` (for capturing guest selfie)
- **File Upload**: `react-dropzone` (supports multi-select & drag-and-drop)
- **Zip Compression**: `jszip` (decompresses files locally before upload to display individual files in UI)

## App Routes
1. **Home (`/`)**: Main entry. Options: "Create Room" (redirects to Host Login) or "Enter Access Code".
2. **Host Dashboard (`/dashboard`)**: Displays active/expired event rooms, photo counts, and configuration settings.
3. **Guest Upload (`/room/:id/upload`)**:
   - Drag-and-drop zone.
   - Computes SHA-256 hash locally.
   - Shows progress bar for each file uploading directly to S3.
4. **Guest View (`/room/:id/view`)**:
   - Camera consent checkbox (must be selected before camera initializes).
   - Webcam feed to capture biometric selfie.
   - Search results grid displaying filtered photo list.
   - Handles "Is this you?" validation popup.
