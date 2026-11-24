import { useState } from 'react'
import { Download, Eye, EyeOff, Sparkles, Wand2 } from 'lucide-react'
import type { ClipCandidate, IngestionSource, SubtitleStyle } from '../types/studio'

interface StudioReviewPanelProps {
  source: IngestionSource
  clips: ClipCandidate[]
  selectedClipId: string
  onSelectClip: (id: string) => void
  onUpdateClip: (id: string, patch: Partial<ClipCandidate>) => void
  onRenderClip: (id: string) => void
  onRenderHighScore: () => void
}

const SUBTITLE_LABELS: Record<SubtitleStyle, string> = {
  'karaoke-yellow': 'Karaoke Yellow',
  'clean-white': 'Clean White',
  'cyber-cyan': 'Cyber Cyan',
}

export function StudioReviewPanel({
  source,
  clips,
  selectedClipId,
  onSelectClip,
  onUpdateClip,
  onRenderClip,
  onRenderHighScore,
}: StudioReviewPanelProps) {
  const [showSafeZone, setShowSafeZone] = useState(true)
  const sortedClips = [...clips].sort((a, b) => b.hookScore - a.hookScore)
  const topClipId = sortedClips[0]?.id
  const selectedClip = sortedClips.find((c) => c.id === selectedClipId) ?? sortedClips[0]

  if (!selectedClip) return null

  return (
    <div className="studio-grid">
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 className="section-title" style={{ marginBottom: 2 }}>
              Kandidat Klip Viral ({clips.length})
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--ff-text-secondary)' }}>
              Sumber: <span className="ff-mono">{source.label}</span>
            </p>
          </div>

          <button type="button" className="btn-primary" onClick={onRenderHighScore}>
            <Sparkles size={15} />
            Auto-Render Skor &ge; 8.0
          </button>
        </div>

        <div className="clip-list">
          {sortedClips.map((clip, index) => {
            const isTopRecommended = clip.id === topClipId
            const tierLabel =
              clip.hookScore >= 8.0
                ? 'Auto-Render'
                : clip.hookScore >= 7.0
                  ? 'Review'
                  : 'Opsional'

            return (
              <article
                key={clip.id}
                className={`ff-glass clip-card ${clip.id === selectedClip.id ? 'selected' : ''}`}
                onClick={() => onSelectClip(clip.id)}
              >
                <div className="clip-header">
                  <div>
                    {isTopRecommended && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: 'var(--ff-brand-cyan)',
                          marginBottom: 4,
                        }}
                      >
                        <Sparkles size={12} />
                        REKOMENDASI TERBAIK #{index + 1}
                      </div>
                    )}
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>{clip.title}</h3>
                  </div>
                  <span className="hook-badge">
                    Hook {clip.hookScore.toFixed(1)} &bull; {tierLabel}
                  </span>
                </div>

                <div className="meta-row ff-mono">
                  <span>
                    {clip.startTime} &rarr; {clip.endTime}
                  </span>
                  <span>&bull;</span>
                  <span>{clip.durationSec}s</span>
                  <span>&bull;</span>
                  <span>Crop X: {clip.cropX}%</span>
                </div>

                <div
                  className="meta-row ff-mono"
                  style={{
                    fontSize: '0.74rem',
                    color: 'var(--ff-text-secondary)',
                    background: 'rgba(13, 17, 26, 0.7)',
                    padding: '6px 10px',
                    borderRadius: 8,
                  }}
                >
                  <span>Curiosity: {clip.curiosity.toFixed(1)}</span>
                  <span>&bull;</span>
                  <span>Emotion: {clip.emotion.toFixed(1)}</span>
                  <span>&bull;</span>
                  <span>Actionable: {clip.actionable.toFixed(1)}</span>
                </div>

                <p style={{ margin: '0 0 10px', fontSize: '0.86rem', color: 'var(--ff-text-secondary)' }}>
                  {clip.reason}
                </p>

                <div
                  style={{
                    fontSize: '0.8rem',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'rgba(7, 9, 14, 0.6)',
                    color: 'var(--ff-text-primary)',
                  }}
                >
                  &ldquo;{clip.transcriptSnippet}&rdquo;
                </div>

                {clip.renderStatus !== 'idle' && (
                  <div style={{ marginTop: 12, fontSize: '0.8rem' }}>
                    {clip.renderStatus === 'rendering' ? (
                      <span style={{ color: 'var(--ff-brand-cyan)' }}>
                        FFmpeg Rendering... {clip.renderProgress}%
                      </span>
                    ) : clip.renderStatus === 'failed' ? (
                      <span style={{ color: 'var(--ff-status-danger)', fontWeight: 600 }}>
                        Render Gagal
                      </span>
                    ) : (
                      <span style={{ color: 'var(--ff-status-success)', fontWeight: 600 }}>
                        Siap Diunduh (9:16 MP4)
                      </span>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </div>

      <aside className="ff-glass preview-panel">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Pratinjau 9:16 Studio</span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowSafeZone((prev) => !prev)}
          >
            {showSafeZone ? <EyeOff size={14} /> : <Eye size={14} />}
            Safe-Zone
          </button>
        </div>

        <div className="canvas-9-16">
          {source.previewUrl ? (
            <video
              src={source.previewUrl}
              controls
              muted
              className="canvas-video"
              style={{ objectPosition: `${selectedClip.cropX}% 50%` }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'grid',
                placeItems: 'center',
                padding: 20,
                textAlign: 'center',
                color: 'var(--ff-text-secondary)',
                fontSize: '0.82rem',
                transform: `translateX(${(50 - selectedClip.cropX) * 0.25}%)`,
                transition: 'transform 0.15s ease',
              }}
            >
              <div>
                <div className="ff-mono" style={{ color: 'var(--ff-brand-cyan)', marginBottom: 6 }}>
                  9:16 VERTICAL FRAME
                </div>
                <div>Fokus Pembicara X = {selectedClip.cropX}%</div>
              </div>
            </div>
          )}

          {showSafeZone && (
            <div className="safe-zone-overlay" aria-hidden="true">
              <div className="safe-zone-top" />
              <div className="safe-zone-right" />
              <div className="safe-zone-bottom" />
            </div>
          )}

          <div className={`subtitle-preview subtitle-${selectedClip.subtitleStyle}`}>
            {selectedClip.transcriptSnippet.split(' ').slice(0, 6).join(' ')}
          </div>
        </div>

        <div className="control-group">
          <div className="control-label">
            <span>Posisi Crop Pembicara (X)</span>
            <span className="ff-mono">{selectedClip.cropX}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={selectedClip.cropX}
            onChange={(e) =>
              onUpdateClip(selectedClip.id, { cropX: Number(e.target.value) })
            }
            style={{ width: '100%', accentColor: 'var(--ff-brand-cyan)' }}
          />
        </div>

        <div className="control-group">
          <div className="control-label">
            <span>Gaya Takarir (Subtitle ASS)</span>
          </div>
          <div className="style-chips">
            {(Object.keys(SUBTITLE_LABELS) as SubtitleStyle[]).map((styleKey) => (
              <button
                key={styleKey}
                type="button"
                className={`style-chip ${
                  selectedClip.subtitleStyle === styleKey ? 'active' : ''
                }`}
                onClick={() => onUpdateClip(selectedClip.id, { subtitleStyle: styleKey })}
              >
                {SUBTITLE_LABELS[styleKey]}
              </button>
            ))}
          </div>
        </div>

        {selectedClip.renderStatus === 'completed' ? (
          <a
            href={selectedClip.downloadUrl ?? '#download-ready'}
            download={selectedClip.downloadUrl ? `${selectedClip.id}.mp4` : undefined}
            onClick={(e) => {
              if (!selectedClip.downloadUrl) {
                e.preventDefault()
                alert(
                  `Demo Mode: Klip "${selectedClip.title}" selesai disimulasikan. Unggah video lokal saat API Online untuk mengunduh MP4 asli.`
                )
              }
            }}
            className="btn-primary"
            style={{ width: '100%', textDecoration: 'none' }}
          >
            <Download size={16} />
            Unduh MP4 (9:16)
          </a>
        ) : (
          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%' }}
            disabled={selectedClip.renderStatus === 'rendering'}
            onClick={() => onRenderClip(selectedClip.id)}
          >
            <Wand2 size={16} />
            {selectedClip.renderStatus === 'rendering'
              ? `Merender (${selectedClip.renderProgress}%)...`
              : selectedClip.renderStatus === 'failed'
                ? 'Render Gagal — Coba Lagi'
                : 'Render Klip Ini'}
          </button>
        )}
      </aside>
    </div>
  )
}
