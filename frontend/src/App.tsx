import { useEffect, useState } from 'react'
import { checkBackendHealth } from './api/client'
import { Header } from './components/Header'
import { IngestionPanel } from './components/IngestionPanel'
import { InspectionPanel, type PipelineStep } from './components/InspectionPanel'
import { StudioReviewPanel } from './components/StudioReviewPanel'
import type {
  ClipCandidate,
  HealthResponse,
  IngestionSource,
  StudioStage,
} from './types/studio'

const INITIAL_CLIPS: ClipCandidate[] = [
  {
    id: 'clip-1',
    title: 'Kenapa 90% Konten Kreator Gagal di 3 Detik Pertama',
    startTime: '00:04:12.500',
    endTime: '00:05:01.000',
    durationSec: 49,
    hookScore: 9.2,
    curiosity: 9.5,
    emotion: 8.8,
    actionable: 9.2,
    reason: 'Pembukaan kontradiktif dengan retensi tinggi dan solusi konkret.',
    transcriptSnippet: 'Kesalahan terbesar bukan di kamera, tapi di tiga detik pertama.',
    cropX: 50,
    subtitleStyle: 'karaoke-yellow',
    renderStatus: 'idle',
    renderProgress: 0,
  },
  {
    id: 'clip-2',
    title: 'Workflow Otomatisasi Riset Konten Menggunakan AI',
    startTime: '00:18:30.000',
    endTime: '00:19:22.400',
    durationSec: 52,
    hookScore: 8.5,
    curiosity: 8.4,
    emotion: 7.9,
    actionable: 9.3,
    reason: 'Langkah praktis yang langsung bisa ditiru oleh audiens.',
    transcriptSnippet: 'Cukup masukkan satu video panjang, sistem langsung pilihkan hook terbaik.',
    cropX: 45,
    subtitleStyle: 'cyber-cyan',
    renderStatus: 'idle',
    renderProgress: 0,
  },
  {
    id: 'clip-3',
    title: 'Pelajaran Mahal dari Kegagalan Launch Produk Pertama',
    startTime: '00:34:05.200',
    endTime: '00:34:48.900',
    durationSec: 44,
    hookScore: 7.8,
    curiosity: 8.0,
    emotion: 8.5,
    actionable: 6.8,
    reason: 'Cerita personal yang emosional dan relatable.',
    transcriptSnippet: 'Saat itu server down tepat lima menit setelah kami umumkan rilis.',
    cropX: 55,
    subtitleStyle: 'clean-white',
    renderStatus: 'idle',
    renderProgress: 0,
  },
]

const BASE_STEPS: PipelineStep[] = [
  {
    id: 'probe',
    label: 'FFprobe Media Validation',
    detail: 'Memeriksa codec, resolusi, FPS, dan durasi video sumber',
    status: 'pending',
  },
  {
    id: 'audio',
    label: 'Audio Downsampling (Mono 64kbps)',
    detail: 'Mengekstrak track audio ringan untuk efisiensi token Gemini',
    status: 'pending',
  },
  {
    id: 'gemini',
    label: 'Gemini Multimodal Inference',
    detail: 'Mendeteksi hook viral & stempel waktu semantik',
    status: 'pending',
  },
  {
    id: 'zod',
    label: 'Zod Schema & Timestamp Clamping',
    detail: 'Memvalidasi struktur JSON dan batas durasi klip',
    status: 'pending',
  },
]

export function App() {
  const [stage, setStage] = useState<StudioStage>('ingest')
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthError, setHealthError] = useState(false)
  const [source, setSource] = useState<IngestionSource | null>(null)
  const [steps, setSteps] = useState<PipelineStep[]>(BASE_STEPS)
  const [clips, setClips] = useState<ClipCandidate[]>(INITIAL_CLIPS)
  const [selectedClipId, setSelectedClipId] = useState<string>(INITIAL_CLIPS[0]!.id)

  useEffect(() => {
    let active = true
    checkBackendHealth()
      .then((res) => {
        if (active) {
          setHealth(res)
          setHealthError(false)
        }
      })
      .catch(() => {
        if (active) setHealthError(true)
      })
    return () => {
      active = false
    }
  }, [])

  const startPipeline = (nextSource: IngestionSource) => {
    setSource(nextSource)
    setStage('inspect')
    setClips(INITIAL_CLIPS)
    setSelectedClipId(INITIAL_CLIPS[0]!.id)

    BASE_STEPS.forEach((_, idx) => {
      setTimeout(() => {
        setSteps(
          BASE_STEPS.map((step, sIdx) => ({
            ...step,
            status: sIdx < idx ? 'done' : sIdx === idx ? 'active' : 'pending',
          })),
        )
      }, idx * 650)
    })

    setTimeout(() => {
      setSteps(BASE_STEPS.map((step) => ({ ...step, status: 'done' })))
      setStage('studio')
    }, BASE_STEPS.length * 650 + 300)
  }

  const updateClip = (id: string, patch: Partial<ClipCandidate>) => {
    setClips((prev) => prev.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip)))
  }

  const triggerRender = (id: string) => {
    updateClip(id, { renderStatus: 'rendering', renderProgress: 15 })
    const checkpoints = [45, 78, 100]
    checkpoints.forEach((progress, index) => {
      setTimeout(() => {
        updateClip(id, {
          renderProgress: progress,
          renderStatus: progress === 100 ? 'completed' : 'rendering',
        })
      }, (index + 1) * 500)
    })
  }

  const triggerAutoRender = () => {
    clips
      .filter((c) => c.hookScore >= 8.0 && c.renderStatus === 'idle')
      .forEach((c) => triggerRender(c.id))
  }

  return (
    <div className="app-shell">
      <Header
        stage={stage}
        canInspect={source !== null}
        canStudio={source !== null && steps.every((s) => s.status === 'done')}
        onNavigate={setStage}
        health={health}
        healthError={healthError}
      />

      <main>
        {stage === 'ingest' && <IngestionPanel onStartPipeline={startPipeline} />}
        {stage === 'inspect' && source && <InspectionPanel source={source} steps={steps} />}
        {stage === 'studio' && source && (
          <StudioReviewPanel
            source={source}
            clips={clips}
            selectedClipId={selectedClipId}
            onSelectClip={setSelectedClipId}
            onUpdateClip={updateClip}
            onRenderClip={triggerRender}
            onRenderHighScore={triggerAutoRender}
          />
        )}
      </main>
    </div>
  )
}

export default App
