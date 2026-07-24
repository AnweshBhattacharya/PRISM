/**
 * hooks/useUpload.js
 *
 * Custom hook encapsulating the full upload pipeline:
 * 1. Compute SHA-256 hash of the file locally (client-side, no backend needed).
 * 2. Call POST /guest/upload-url to get a pre-signed S3 POST URL.
 * 3. Upload the file directly to S3 (with progress reporting).
 * 4. Handle 409 Conflict (duplicate file) gracefully.
 */
import { useState, useCallback } from 'react'
import { getUploadUrl, uploadToS3 } from '../services/api'

/**
 * Compute a SHA-256 hash of a File object using the Web Crypto API.
 * Returns the hash as a lowercase hex string.
 */
async function computeSHA256(file) {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * @returns {{
 *   uploads: Array,     // Current state of all uploads
 *   uploadFiles: fn,    // Call with an array of File objects
 *   resetUploads: fn,   // Clear the upload list
 * }}
 */
export function useUpload() {
  const [uploads, setUploads] = useState([])

  const updateUpload = (id, patch) => {
    setUploads((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u))
    )
  }

  const uploadFiles = useCallback(async (files) => {
    // Initialise all files as "pending"
    const newUploads = files.map((file) => ({
      id:       crypto.randomUUID(),
      name:     file.name,
      size:     file.size,
      status:   'hashing',   // hashing | uploading | done | duplicate | error
      progress: 0,
      file,
    }))

    setUploads((prev) => [...prev, ...newUploads])

    // Process each file concurrently
    await Promise.allSettled(
      newUploads.map(async (upload) => {
        const { id, file } = upload
        try {
          // ── Step 1: Hash ─────────────────────────────
          const hash = await computeSHA256(file)
          updateUpload(id, { status: 'uploading', hash })

          // ── Step 2: Get Pre-signed URL ───────────────
          let presignedData
          try {
            presignedData = await getUploadUrl(hash, file.type || 'image/jpeg')
          } catch (err) {
            if (err.response?.status === 409) {
              updateUpload(id, { status: 'duplicate' })
              return
            }
            throw err
          }

          // ── Step 3: Upload to S3 ─────────────────────
          await uploadToS3(presignedData, file, (progress) => {
            updateUpload(id, { progress })
          })

          updateUpload(id, { status: 'done', progress: 100 })
        } catch (err) {
          console.error(`Upload failed for ${file.name}:`, err)
          updateUpload(id, { status: 'error', error: err.message })
        }
      })
    )
  }, [])

  const resetUploads = () => setUploads([])

  return { uploads, uploadFiles, resetUploads }
}
