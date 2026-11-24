import { Film, Sparkles, UploadCloud, Sliders } from 'lucide-react'
import type { HealthResponse, StudioStage } from '../types/studio'

interface HeaderProps {
  stage: StudioStage
  canInspect: boolean
  canStudio: boolean
  onNavigate: (stage: StudioStage) => void
  health: HealthResponse | null
  healthError: boolean
}

export function Header({
  stage,
  canInspect,
  canStudio,
  onNavigate,
  health,
  healthError,
}: HeaderProps) {
  return (
    <header className="ff-glass app-header">
      <div className="brand-group">
        <div className="brand-logo" aria-hidden="true">
          <Film size={20} />
        </div>
        <div>
          <h1 className="brand-title">FutureFrame Studio</h1>
          <p className="brand-subtitle">Autonomous Video Clipping &amp; Temporal Extraction</p>
        </div>
      </div>

      <nav className="stepper" aria-label="Pipeline stages">
        <button
          type="button"
          className={`step-pill ${stage === 'ingest' ? 'active' : ''}`}
          onClick={() => onNavigate('ingest')}
        >
          <UploadCloud size={15} />
          1. Media Ingestion
        </button>
        <button
          type="button"
          className={`step-pill ${stage === 'inspect' ? 'active' : ''}`}
          disabled={!canInspect}
          onClick={() => onNavigate('inspect')}
        >
          <Sparkles size={15} />
          2. AI Inspection
        </button>
        <button
          type="button"
          className={`step-pill ${stage === 'studio' ? 'active' : ''}`}
          disabled={!canStudio}
          onClick={() => onNavigate('studio')}
        >
          <Sliders size={15} />
          3. Studio &amp; Render
        </button>
      </nav>

      <div className="health-badge" title={health?.service ?? 'Backend Fastify API'}>
        <span className={`health-dot ${health && !healthError ? 'online' : 'offline'}`} />
        <span>
          {health && !healthError
            ? `API Online`
            : 'API Offline (Demo Mode)'}
        </span>
      </div>
    </header>
  )
}
