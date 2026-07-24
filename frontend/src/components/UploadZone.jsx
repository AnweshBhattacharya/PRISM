/**
 * components/UploadZone.jsx
 * Drag-and-drop file upload zone using react-dropzone.
 * Supports multi-file selection, ZIP extraction, and shows a per-file progress list.
 */
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import JSZip from 'jszip'

const STATUS_STYLES = {
  hashing:   'text-white/40',
  uploading: 'text-accent-400',
  done:      'text-green-400',
  duplicate: 'text-yellow-400',
  error:     'text-red-400',
}

const STATUS_ICONS = {
  hashing:   '⏳',
  uploading: '📤',
  done:      '✅',
  duplicate: '⚠️',
  error:     '❌',
}

const STATUS_LABELS = {
  hashing:   'Hashing…',
  uploading: 'Uploading…',
  done:      'Uploaded',
  duplicate: 'Already uploaded',
  error:     'Failed',
}

export default function UploadZone({ uploads, onFilesSelected }) {
  const extractFiles = useCallback(async (acceptedFiles) => {
    const imageFiles = []

    for (const file of acceptedFiles) {
      if (file.name.toLowerCase().endsWith('.zip')) {
        // Extract images from ZIP
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
      'image/jpeg':  ['.jpg', '.jpeg'],
      'image/png':   ['.png'],
      'image/heic':  ['.heic'],
      'image/webp':  ['.webp'],
      'application/zip': ['.zip'],
    },
    multiple: true,
  })

  return (
    <div className="space-y-4">
      {/* ── Drop Zone ────────────────────────────── */}
      <div
        {...getRootProps()}
        className={`
          relative rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer
          transition-all duration-300
          ${isDragActive
            ? 'border-brand-500 bg-brand-500/10 scale-[1.01]'
            : 'border-white/10 hover:border-brand-500/50 hover:bg-white/[0.02]'
          }
        `}
        id="upload-dropzone"
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className={`text-5xl transition-transform duration-200 ${isDragActive ? 'scale-125' : ''}`}>
            {isDragActive ? '🎯' : '📁'}
          </div>
          <div>
            <p className="text-lg font-semibold text-white/80">
              {isDragActive ? 'Drop your photos here!' : 'Drag & drop photos or a ZIP file'}
            </p>
            <p className="text-sm text-white/40 mt-1">
              or click to browse · JPEG, PNG, HEIC, WEBP, ZIP supported
            </p>
          </div>
          <button
            type="button"
            className="btn-primary text-sm py-2 px-5 pointer-events-none"
          >
            Select Files
          </button>
        </div>
      </div>

      {/* ── Upload Progress List ──────────────────── */}
      {uploads.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {uploads.map((upload) => (
            <div key={upload.id} className="glass rounded-xl p-3 flex items-center gap-3">
              <span className="text-lg">{STATUS_ICONS[upload.status]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 truncate">{upload.name}</p>
                {upload.status === 'uploading' && (
                  <div className="progress-bar mt-1">
                    <div
                      className="progress-fill"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${STATUS_STYLES[upload.status]}`}>
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
