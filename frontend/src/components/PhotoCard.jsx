/**
 * components/PhotoCard.jsx
 * RawBlock v2 — square card with hard shadow, confidence tag, hover-reveal actions.
 * Shows a "Is this you?" button for low-confidence matches.
 */
import { useState } from 'react'

function isIOS() {
  return (
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      // iPadOS 13+ reports as "Mac" but has touch support
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
  )
}

// Map of magic-byte signatures -> real MIME type. S3 objects frequently come
// back with an empty or generic Content-Type (e.g. application/octet-stream),
// which the old code "fixed" by blindly relabeling the blob as image/jpeg.
// That's what was corrupting downloads: a PNG/HEIC/WEBP file saved with a
// .jpg name and an image/jpeg type has a header that doesn't match its
// extension, so Windows Photos / macOS Preview / many phones refuse to open
// it or report it as damaged. Sniffing the real signature and keeping the
// filename extension in sync with it fixes that mismatch.
const SIGNATURES = [
  { mime: 'image/jpeg', ext: 'jpg',  bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png',  ext: 'png',  bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif',  ext: 'gif',  bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', ext: 'webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF....WEBP
  { mime: 'image/heic', ext: 'heic', bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // 'ftyp'
]

async function detectImageType(blob) {
  const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer())
  for (const sig of SIGNATURES) {
    const offset = sig.offset || 0
    const match = sig.bytes.every((b, i) => head[offset + i] === b)
    if (match) return { mime: sig.mime, ext: sig.ext }
  }
  // Fall back to whatever the server told us, if it looks like an image type.
  if (blob.type?.startsWith('image/')) {
    return { mime: blob.type, ext: blob.type.split('/')[1] || 'jpg' }
  }
  // Last resort — don't lie about the format, but still let the download proceed.
  return { mime: 'application/octet-stream', ext: 'jpg' }
}

export default function PhotoCard({ photo, allowDownload, onConfirm }) {
  const [downloadState, setDownloadState] = useState('idle') // idle | working | error

  const handleDownload = async () => {
    setDownloadState('working')

    try {
      const response = await fetch(photo.url)
      if (!response.ok) throw new Error(`Fetch failed with ${response.status}`)
      const rawBlob = await response.blob()

      // Detect the real format from the file's own bytes rather than trusting
      // (or worse, overriding) the server's Content-Type — see detectImageType
      // above for why the old "always relabel as jpeg" approach corrupted files.
      const { mime, ext } = await detectImageType(rawBlob)
      const blob = rawBlob.type === mime ? rawBlob : new Blob([rawBlob], { type: mime })
      const filename = `prism-${photo.photoId}.${ext}`

      // Path 1 — native share/save sheet. This is the only reliable "Save to
      // Photos" flow on iOS Safari and most Android browsers; the `download`
      // attribute on an <a> is unsupported or flaky on mobile.
      const file = new File([blob], filename, { type: blob.type })
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] })
          setDownloadState('idle')
          return
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            // User dismissed the share sheet — not an error.
            setDownloadState('idle')
            return
          }
          // Fall through to the other paths below.
        }
      }

      const objectUrl = URL.createObjectURL(blob)

      // Path 2 — iOS without Web Share support for files: open the image so
      // the user can long-press → "Add to Photos". `download` is a no-op here.
      if (isIOS()) {
        window.open(objectUrl, '_blank', 'noopener')
        setTimeout(() => URL.revokeObjectURL(objectUrl), 20000)
        setDownloadState('idle')
        return
      }

      // Path 3 — standard desktop/Android download. The anchor must be in the
      // DOM for some browsers to honor the click, and the object URL must
      // outlive the click long enough for the browser to finish writing the
      // file — revoking it immediately is what was corrupting downloads.
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 4000)

      setDownloadState('idle')
    } catch (e) {
      console.error('Download failed:', e)
      setDownloadState('error')
      setTimeout(() => setDownloadState('idle'), 3000)
    }
  }

  return (
    <div className="group relative raw-card !p-0 overflow-hidden animate-fade-in transition-transform duration-150 hover:scale-[1.01] hover:shadow-md" style={{ aspectRatio: '1 / 1' }}>
      {/* ── Photo ─────────────────────────────── */}
      <img
        src={photo.url}
        alt="Matched event photo"
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        loading="lazy"
      />

      {/* ── Confidence tag — top right ────────── */}
      {!photo.needs_confirmation && (
        <div className="absolute top-2 right-2">
          <span
            className="raw-tag text-xs"
            style={{
              background: 'rgb(var(--success) / 0.9)',
              borderColor: 'rgb(var(--success))',
              color: 'rgb(var(--surface))',
            }}
          >
            Confidence {Math.round(photo.confidence)}%
          </span>
        </div>
      )}

      {/* ── "Is this you?" banner — top ───────── */}
      {photo.needs_confirmation && (
        <div className="absolute top-0 left-0 right-0">
          <button
            onClick={() => onConfirm?.(photo)}
            className="raw-btn w-full text-xs !min-h-0 !py-1.5 !px-2 transition-colors duration-150
                       hover:bg-[rgb(var(--warn)/0.1)]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                       focus-visible:ring-[rgb(var(--warn))] focus-visible:ring-offset-[rgb(var(--surface))]"
            style={{
              borderColor: 'rgb(var(--warn))',
              color: 'rgb(var(--warn))',
              background: 'rgb(var(--surface) / 0.95)',
              boxShadow: 'none',
            }}
          >
            Confirm this photo — {Math.round(photo.confidence)}%
          </button>
        </div>
      )}

      {/* ── Hover overlay: Download button ────── */}
      {allowDownload && (
        <div
          className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100
                     transition-opacity duration-200 p-2"
          style={{ background: 'rgb(var(--fg) / 0.7)' }}
        >
          <button
            onClick={handleDownload}
            disabled={downloadState === 'working'}
            className="raw-btn w-full text-xs !min-h-0 !py-1 !px-2 transition-all duration-150
                       hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                       focus-visible:ring-[rgb(var(--accent))] focus-visible:ring-offset-[rgb(var(--fg))]"
            style={{
              background: downloadState === 'error' ? 'rgb(var(--danger))' : 'rgb(var(--surface))',
              color: downloadState === 'error' ? 'rgb(var(--surface))' : 'rgb(var(--fg))',
              boxShadow: 'none',
            }}
            aria-label="Download photo"
          >
            {downloadState === 'working' ? 'Saving…' : downloadState === 'error' ? 'Failed — retry' : 'Download'}
          </button>
        </div>
      )}
    </div>
  )
}
