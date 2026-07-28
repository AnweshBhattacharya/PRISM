/**
 * components/UploadZone.jsx
 * RawBlock v2 — drag-and-drop zone with list-row file progress display.
 * Supports multi-file selection, ZIP extraction.
 */
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import JSZip from 'jszip'

const STATUS_LABELS = {
  hashing:   'HASHING',
  uploading: 'UPLOADING',
  done:      'DONE',
  duplicate: 'DUPLICATE',
  error:     'FAILED',
}

export default function UploadZone({ uploads, onFilesSelected }) {
  const extractFiles = useCallback(async (acceptedFiles) => {
    const imageFiles = []

    for (const file of acceptedFiles) {
      if (file.name.toLowerCase().endsWith('.zip')) {
        try {
          const zip = await JSZip.loadAsync(file)
          for (const [name, entry] of Object.entries(zip.files)) {
            if (!entry.dir && /\.(jpe?g|png|heic|webp)$/i.test(name)) {
              const blob = await entry.async('blob')
              const extractedFile = new File([blob], name, { type: 'image/jpeg' })
              imageFiles.push(extractedFile)
            }
          }
        } catch (e) {
          console.error('ZIP extraction failed:', e)
        }
      } else {
        imageFiles.push(file)
      }
    }

    if (imageFiles.length > 0) onFilesSelected(imageFiles)
  }, [onFilesSelected])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: extractFiles,
    accept: {
      'image/jpeg':      ['.jpg', '.jpeg'],
      'image/png':       ['.png'],
      'image/heic':      ['.heic'],
      'image/webp':      ['.webp'],
      'application/zip': ['.zip'],
    },
    multiple: true,
  })

  return (
    <div className="space-y-4">
      {/* ── Drop Zone ────────────────────────────── */}
      <div
        {...getRootProps()}
        id="upload-dropzone"
        className="group border-2 border-dashed border-line cursor-pointer focus-ticks
                   flex flex-col items-center justify-center gap-4
                   p-10 text-center transition-all duration-150
                   hover:border-[rgb(var(--accent)/0.6)]"
        style={{
          aspectRatio: '16 / 9',
          minHeight: '200px',
          ...(isDragActive
            ? {
                borderColor: 'rgb(var(--accent))',
                background: 'rgb(var(--accent) / 0.05)',
                transform: 'scale(1.005)',
              }
            : {
                background: 'rgb(var(--surface))',
              }),
        }}
      >
        <input {...getInputProps()} />

        <span
          className={`font-mono text-3xl text-faint select-none transition-transform duration-300 ${
            isDragActive ? 'animate-bounce' : 'group-hover:-translate-y-0.5'
          }`}
        >
          {isDragActive ? '▼' : '↑'}
        </span>

        <div>
          <p className="font-sans font-semibold text-fg text-base">
            {isDragActive ? 'Drop photos here' : 'Drag & drop photos or a ZIP'}
          </p>
          <p className="font-mono text-xs text-faint mt-1 uppercase tracking-wide">
            JPEG · PNG · HEIC · WEBP · ZIP — click to browse
          </p>
        </div>

        <button
          type="button"
          className="raw-btn pointer-events-none text-sm"
        >
          Select Files
        </button>
      </div>

      {/* ── Upload Progress List ──────────────────── */}
      {uploads.length > 0 && (
        <div
          className="border border-line max-h-64 overflow-y-auto"
          style={{ background: 'rgb(var(--surface))' }}
        >
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="list-row gap-3"
            >
              {/* Filename */}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-fg truncate">{upload.name}</p>
                {/* Progress bar */}
                {upload.status === 'uploading' && (
                  <div className="progress-bar mt-1.5">
                    <div
                      className="progress-fill"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Status tag */}
              <span
                className="raw-tag whitespace-nowrap flex-shrink-0"
                style={{
                  color:
                    upload.status === 'done'      ? 'rgb(var(--success))' :
                    upload.status === 'error'     ? 'rgb(var(--danger))'  :
                    upload.status === 'duplicate' ? 'rgb(var(--warn))'    :
                    upload.status === 'uploading' ? 'rgb(var(--accent))'  :
                    'rgb(var(--faint))',
                  borderColor:
                    upload.status === 'done'      ? 'rgb(var(--success))' :
                    upload.status === 'error'     ? 'rgb(var(--danger))'  :
                    upload.status === 'duplicate' ? 'rgb(var(--warn))'    :
                    undefined,
                }}
              >
                {upload.status === 'uploading'
                  ? `${upload.progress}%`
                  : STATUS_LABELS[upload.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
