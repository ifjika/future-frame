export type StudioStage = 'ingest' | 'inspect' | 'studio'

export type PipelineStepStatus = 'pending' | 'active' | 'done'

export type SubtitleStyle = 'karaoke-yellow' | 'clean-white' | 'cyber-cyan'

export interface HealthResponse {
  status: string
  service: string
  timeStamp: string
}

export interface IngestionSource {
  type: 'file' | 'url'
  label: string
  sizeBytes?: number
  previewUrl?: string
}

export interface ClipCandidate {
  id: string
  title: string
  startTime: string
  endTime: string
  durationSec: number
  hookScore: number
  curiosity: number
  emotion: number
  actionable: number
  reason: string
  transcriptSnippet: string
  cropX: number
  subtitleStyle: SubtitleStyle
  renderStatus: 'idle' | 'rendering' | 'completed'
  renderProgress: number
}
