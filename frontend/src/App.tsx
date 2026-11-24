import { useEffect, useState } from 'react'
import {
    checkBackendHealth,
    fetchProjectStatus,
    getClipDownloadUrl,
    getProjectPreviewUrl,
    requestClipRender,
    submitProjectUrl,
    uploadProjectVideo,
} from './api/client'
import { Header } from './components/Header'
import { IngestionPanel } from './components/IngestionPanel'
import { InspectionPanel, type PipelineStep } from './components/InspectionPanel'
import { StudioReviewPanel } from './components/StudioReviewPanel'
import type {
    BackendClipDto,
    BackendProjectStatus,
    ClipCandidate,
    HealthResponse,
    IngestionSource,
    StudioStage,
} from './types/studio'

const INITIAL_CLIPS: ClipCandidate[] = [
  {
    id: 'clip-1',
    title: 'Why 90% of Creators Lose Viewers in the First 3 Seconds',
    startTime: '00:04:12.500',
    endTime: '00:05:01.000',
    durationSec: 49,
    hookScore: 9.2,
    curiosity: 9.5,
    emotion: 8.8,
    actionable: 9.2,
    reason: 'Strong contrarian opener with high retention and concrete takeaway.',
    transcriptSnippet: 'The biggest mistake is not your camera, it is your first three seconds.',
    cropX: 50,
    subtitleStyle: 'karaoke-yellow',
    renderStatus: 'idle',
    renderProgress: 0,
  },
  {
    id: 'clip-2',
    title: 'Automating Content Research Workflows with AI',
    startTime: '00:18:30.000',
    endTime: '00:19:22.400',
    durationSec: 52,
    hookScore: 8.5,
    curiosity: 8.4,
    emotion: 7.9,
    actionable: 9.3,
    reason: 'Actionable step-by-step workflow viewers can apply immediately.',
    transcriptSnippet: 'Drop in one long-form video and the system extracts the strongest hooks.',
    cropX: 45,
    subtitleStyle: 'cyber-cyan',
    renderStatus: 'idle',
    renderProgress: 0,
  },
  {
    id: 'clip-3',
    title: 'Hard Lessons Learned from Our First Product Launch Failure',
    startTime: '00:34:05.200',
    endTime: '00:34:48.900',
    durationSec: 44,
    hookScore: 7.8,
    curiosity: 8.0,
    emotion: 8.5,
    actionable: 6.8,
    reason: 'Relatable personal story with strong emotional resonance.',
    transcriptSnippet: 'Our server went down five minutes after we announced the launch.',
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
    detail: 'Inspecting codec, resolution, FPS, and source video duration',
    status: 'pending',
  },
  {
    id: 'audio',
    label: 'Audio Downsampling (Mono 64kbps)',
    detail: 'Extracting lightweight mono audio track for Gemini token efficiency',
    status: 'pending',
  },
  {
    id: 'gemini',
    label: 'Gemini Multimodal Inference',
    detail: 'Detecting viral hooks & semantic timestamps',
    status: 'pending',
  },
  {
    id: 'zod',
    label: 'Zod Schema & Timestamp Clamping',
    detail: 'Validating JSON structure and clip duration bounds',
    status: 'pending',
  },
]

function mapBackendStatusToSteps(status: BackendProjectStatus): PipelineStep[] {
  const activeIdx =
    status === 'QUEUED'
      ? 0
      : status === 'PREPROCESSING'
        ? 1
        : status === 'INFERRING'
          ? 2
          : 4

  return BASE_STEPS.map((step, idx) => ({
    ...step,
    status: idx < activeIdx ? 'done' : idx === activeIdx ? 'active' : 'pending',
  }))
}

function mapBackendClip(projectId: string, clip: BackendClipDto): ClipCandidate {
  return {
    id: clip.clip_id,
    title: clip.suggested_title,
    startTime: clip.timestamp_start,
    endTime: clip.timestamp_end,
    durationSec: Math.round(clip.duration_seconds),
    hookScore: clip.hook_score,
    curiosity: clip.curiosity_score,
    emotion: clip.emotion_score,
    actionable: clip.actionable_score,
    reason: clip.topic,
    transcriptSnippet: clip.topic,
    cropX: Math.round(clip.crop_focus_coordinates.x * 100),
    subtitleStyle: 'karaoke-yellow',
    renderStatus: clip.renderStatus,
    renderProgress: clip.renderStatus === 'completed' ? 100 : clip.renderStatus === 'rendering' ? 50 : 0,
    ...(clip.renderStatus === 'completed'
      ? { downloadUrl: getClipDownloadUrl(projectId, clip.clip_id) }
      : {}),
  }
}

export function App() {
  const [stage, setStage] = useState<StudioStage>('ingest')
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthError, setHealthError] = useState(false)
  const [source, setSource] = useState<IngestionSource | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [pipelineError, setPipelineError] = useState<string | null>(null)
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

  const runDemoPipeline = () => {
    setProjectId(null)
    setClips(INITIAL_CLIPS)
    setSelectedClipId(INITIAL_CLIPS[0]!.id)

    BASE_STEPS.forEach((_, idx) => {
      setTimeout(() => {
        setSteps(
          BASE_STEPS.map((step, sIdx) => ({
            ...step,
            status: sIdx < idx ? 'done' : sIdx === idx ? 'active' : 'pending',
          }))
        )
      }, idx * 650)
    })

    setTimeout(() => {
      setSteps(BASE_STEPS.map((step) => ({ ...step, status: 'done' })))
      setStage('studio')
    }, BASE_STEPS.length * 650 + 300)
  }

  const startPipeline = async (nextSource: IngestionSource) => {
    setSource(nextSource)
    setPipelineError(null)
    setStage('inspect')

    const isRealFile = nextSource.type === 'file' && Boolean(nextSource.file)
    const isRealUrl =
      nextSource.type === 'url' && nextSource.label !== 'sample-podcast-episode-42.mp4'

    if ((isRealFile || isRealUrl) && health && !healthError) {
      try {
        setSteps(mapBackendStatusToSteps('QUEUED'))
        const { projectId: createdId } = isRealFile
          ? await uploadProjectVideo(nextSource.file!)
          : await submitProjectUrl(nextSource.label)
        setProjectId(createdId)

        const timer = window.setInterval(() => {
          void fetchProjectStatus(createdId)
            .then((proj) => {
              if (proj.status === 'ANALYZED') {
                setSteps(mapBackendStatusToSteps(proj.status))
                window.clearInterval(timer)
                const mapped = proj.clips.map((c) => mapBackendClip(createdId, c))
                setClips(mapped)
                if (!nextSource.previewUrl) {
                  setSource((prev) =>
                    prev ? { ...prev, previewUrl: getProjectPreviewUrl(createdId) } : prev
                  )
                }
                if (mapped[0]) setSelectedClipId(mapped[0].id)
                setStage('studio')
              } else if (proj.status === 'FAILED') {
                window.clearInterval(timer)
                setPipelineError(proj.errorMessage ?? 'Backend pipeline failed to process video.')
              } else {
                setSteps(mapBackendStatusToSteps(proj.status))
              }
            })
            .catch(() => {
              window.clearInterval(timer)
              setPipelineError('Failed to reach backend server while checking progress.')
            })
        }, 1500)
        return
      } catch (err) {
        setPipelineError(err instanceof Error ? err.message : 'Failed to process video.')
        return
      }
    }

    runDemoPipeline()
  }

  const updateClip = (id: string, patch: Partial<ClipCandidate>) => {
    setClips((prev) => prev.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip)))
  }

  const triggerRender = (id: string) => {
    const targetClip = clips.find((c) => c.id === id)
    if (!targetClip) return

    if (projectId && health && !healthError) {
      updateClip(id, { renderStatus: 'rendering', renderProgress: 30 })
      void requestClipRender(projectId, id, targetClip.cropX / 100)
        .then(() => {
          const timer = window.setInterval(() => {
            void fetchProjectStatus(projectId).then((proj) => {
              const updated = proj.clips.find((c) => c.clip_id === id)
              if (!updated) return
              if (updated.renderStatus === 'completed') {
                window.clearInterval(timer)
                updateClip(id, {
                  renderStatus: 'completed',
                  renderProgress: 100,
                  downloadUrl: getClipDownloadUrl(projectId, id),
                })
              } else if (updated.renderStatus === 'failed') {
                window.clearInterval(timer)
                updateClip(id, { renderStatus: 'failed', renderProgress: 0 })
              }
            })
          }, 1500)
        })
        .catch(() => {
          updateClip(id, { renderStatus: 'failed', renderProgress: 0 })
        })
      return
    }

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
        {stage === 'ingest' && <IngestionPanel onStartPipeline={(src) => void startPipeline(src)} />}
        {stage === 'inspect' && source && (
          <>
            <InspectionPanel source={source} steps={steps} />
            {pipelineError && (
              <div className="error-banner" style={{ maxWidth: 720, margin: '14px auto 0' }}>
                {pipelineError}
              </div>
            )}
          </>
        )}
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
