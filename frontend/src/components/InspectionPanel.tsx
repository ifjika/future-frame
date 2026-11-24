import { CheckCircle2, Loader2, Clock } from 'lucide-react'
import type { IngestionSource, PipelineStepStatus } from '../types/studio'

export interface PipelineStep {
  id: string
  label: string
  detail: string
  status: PipelineStepStatus
}

interface InspectionPanelProps {
  source: IngestionSource
  steps: PipelineStep[]
}

export function InspectionPanel({ source, steps }: InspectionPanelProps) {
  return (
    <section className="ff-glass inspect-container">
      <h2 className="section-title">2. AI Semantic Inspection</h2>
      <p className="section-desc">
        Processing <span className="ff-mono">{source.label}</span> through the FFmpeg &amp; Google
        Gemini Multimodal pipeline.
      </p>

      <div className="pipeline-list">
        {steps.map((step) => (
          <div key={step.id} className={`pipeline-item ${step.status}`}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.94rem' }}>{step.label}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--ff-text-secondary)' }}>
                {step.detail}
              </div>
            </div>
            <div>
              {step.status === 'done' && (
                <CheckCircle2 size={20} color="var(--ff-status-success)" />
              )}
              {step.status === 'active' && (
                <Loader2 size={20} color="var(--ff-brand-cyan)" className="spin" />
              )}
              {step.status === 'pending' && <Clock size={20} color="var(--ff-text-muted)" />}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
