/**
 * services/api.js
 *
 * Centralised API layer — all HTTP calls go through here.
 * Uses Axios with the API Gateway base URL from the environment variable.
 */
import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Store for host token (set by App.jsx via setHostToken) ─────────────────
let currentHostToken = null

export const setHostToken = (token) => {
  currentHostToken = token
}

// ── Request Interceptor: attach auth token ─────────────────────────────────
API.interceptors.request.use((config) => {
  // Try guest token first (sessionStorage), then Cognito ID token
  const guestToken = sessionStorage.getItem('guestToken')
  const token = guestToken || currentHostToken

  if (token) {
    // For guest tokens: send as "Bearer ${token}"
    // For Cognito ID tokens: send as raw token (no Bearer prefix)
    if (guestToken) {
      config.headers.Authorization = `Bearer ${token}`
    } else {
      // Cognito User Pool authorizer expects raw token (no Bearer prefix)
      config.headers.Authorization = token
    }
  }

  return config
})

// ── Guest Endpoints ────────────────────────────────────────────────────────

/**
 * Exchange a 6-digit room code for a guest JWT.
 * @returns {{ guestToken, roomName, allowDownload, expiryDate }}
 */
export const validateRoomCode = (roomId, accessCode) =>
  API.post('/guest/token', { roomId, accessCode }).then((r) => r.data)

/**
 * Request a pre-signed S3 POST URL for a photo upload.
 * Returns 409 if the file hash already exists in this room.
 * @returns {{ url, fields, photoId, s3Key }}
 */
export const getUploadUrl = (fileHash, contentType) =>
  API.post('/guest/upload-url', { fileHash, contentType }).then((r) => r.data)

/**
 * Submit a Base64 selfie for face matching.
 * @returns {{ photos: [{ photoId, url, confidence, needs_confirmation }] }}
 */
export const searchFaces = (selfieImage, consent = true) =>
  API.post('/guest/search', { selfieImage, consent }).then((r) => r.data)

// ── Host Endpoints ─────────────────────────────────────────────────────────

/**
 * List all rooms owned by the authenticated host.
 */
export const listRooms = () =>
  API.get('/rooms').then((r) => r.data)

/**
 * Create a new event room.
 * @returns {{ roomId, accessCode, expiryDate }}
 */
export const createRoom = (name, expiryDays = 7, allowDownload = true) =>
  API.post('/rooms', { name, expiryDays, allowDownload }).then((r) => r.data)

/**
 * Delete a room by ID.
 */
export const deleteRoom = (roomId) =>
  API.delete(`/rooms/${roomId}`).then((r) => r.data)

// ── Direct S3 Upload (bypasses Lambda) ────────────────────────────────────

/**
 * Upload a file directly to S3 using a pre-signed POST URL.
 * Reports progress via the onProgress callback.
 */
export const uploadToS3 = (presignedData, file, onProgress) => {
  const formData = new FormData()
  // Append all the pre-signed fields first (order matters for S3)
  Object.entries(presignedData.fields).forEach(([k, v]) => formData.append(k, v))
  formData.append('file', file)

  return axios.post(presignedData.url, formData, {
    // Let the browser set the Content-Type with the auto-generated boundary!
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total))
      }
    },
  })
}