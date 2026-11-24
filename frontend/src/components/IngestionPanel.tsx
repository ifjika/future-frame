import { useRef, useState } from 'react'
import { Link2, UploadCloud, Play } from 'lucide-react'
import type { IngestionSource } from '../types/studio'

interface IngestionPanelProps {
  onStartPipeline: (source: IngestionSource) => void
}

const MAX_SIZE_BYTES = 3 * 1024 * 1024 * 1024 // 3 GB
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-matroska']

export function IngestionPanel({ onStartPipeline }: IngestionPanelProps) {
  const [mode, setMode] = useState<'file' | 'url'>('file')
  const [dragging, setDragging] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateAndSubmitFile = (file: File) => {
    setError(null)
    if (!ALLOWED_TYPES.includes(file.type) && !/\.(mp4|mov|mkv)$/i.test(file.name)) {
      setError('Format tidak didukung. Gunakan file MP4, MOV, atau MKV.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('Ukuran file melebihi batas maksimal 3 GB.')
      return
    }
    const previewUrl = URL.createObjectURL(file)
    onStartPipeline({
      type: 'file',
      label: file.name,
      sizeBytes: file.size,
      previewUrl,
    })
  }

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = urlInput.trim()
    if (!trimmed) {
      setError('Masukkan URL video yang valid.')
      return
    }
    try {
      const parsed = new URL(trimmed)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol')
      }
      onStartPipeline({
        type: 'url',
        label: trimmed,
      })
    } catch {
      setError('Format URL tidak valid. Pastikan diawali http:// atau https://')
    }
  }

  return (
    <section className="ff-glass ingest-container">
      <h2 className="section-title">1. Media Ingestion</h2>
      <p className="section-desc">
        Unggah video berdurasi panjang atau masukkan tautan publik untuk dianalisis oleh Gemini
        Multimodal Agent.
      </p>

      <div className="tab-row" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'file'}
          className={`tab-btn ${mode === 'file' ? 'active' : ''}`}
          onClick={() => {
            setMode('file')
            setError(null)
          }}
        >
          <UploadCloud size={16} />
          Upload Lokal
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'url'}
          className={`tab-btn ${mode === 'url' ? 'active' : ''}`}
          onClick={() => {
            setMode('url')
            setError(null)
          }}
        >
          <Link2 size={16} />
          URL Video Publik
        </button>
      </div>

      {mode === 'file' ? (
        <>
          <div
            className={`dropzone ${dragging ? 'dragging' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const file = e.dataTransfer.files[0]
              if (file) validateAndSubmitFile(file)
            }}
          >
            <div className="dropzone-icon">
              <UploadCloud size={26} />
            </div>
            <p style={{ margin: '0 0 6px', fontWeight: 600 }}>
              Tarik &amp; lepas video di sini, atau klik untuk memilih file
            </p>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--ff-text-secondary)' }}>
              Mendukung MP4, MOV, MKV &bull; Maksimal 3 GB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mov,.mkv,video/mp4,video/quicktime,video/x-matroska"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) validateAndSubmitFile(file)
              }}
            />
          </div>

          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                onStartPipeline({
                  type: 'url',
                  label: 'sample-podcast-episode-42.mp4',
                })
              }
            >
              <Play size={15} />
              Coba dengan Video Sampel
            </button>
          </div>
        </>
      ) : (
        <form className="url-form" onSubmit={handleUrlSubmit}>
          <input
            type="url"
            className="input-field"
            placeholder="https://youtube.com/watch?v=... atau tautan MP4 langsung"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary">
              <Play size={16} />
              Mulai Analisis AI
            </button>
          </div>
        </form>
      )}

      {error && <div className="error-banner">{error}</div>}
    </section>
  )
}
