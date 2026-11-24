export type StudioStage = 'ingest' | 'inspect' | 'studio'

export type PipelineStepStatus = 'pending' | 'active' | 'done'

export type SubtitleStyle = 'karaoke-yellow' | 'clean-white' | 'cyber-cyan'

export type BackendProjectStatus =
  | 'QUEUED'
  | 'PREPROCESSING'
  | 'INFERRING'
  | 'ANALYZED'
  | 'FAILED'

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
  file?: File
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
  renderStatus: 'idle' | 'rendering' | 'completed' | 'failed'
  renderProgress: number
  downloadUrl?: string
}

export interface BackendClipDto {
  clip_id: string
  timestamp_start: string
  timestamp_end: string
  duration_seconds: number
  curiosity_score: number
  emotion_score: number
  actionable_score: number
  hook_score: number
  topic: string
  suggested_title: string
  crop_focus_coordinates: { x: number; y: number }
  renderStatus: 'idle' | 'rendering' | 'completed' | 'failed'
  outputPath?: string
}

export interface BackendProjectDto {
  id: string
  title: string
  status: BackendProjectStatus
  clips: BackendClipDto[]
  errorMessage?: string
}
