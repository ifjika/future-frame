import type {
  BackendProjectDto,
  BackendProjectStatus,
  HealthResponse,
} from '../types/studio'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export async function checkBackendHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return (await response.json()) as HealthResponse
}

export async function submitProjectUrl(
  url: string
): Promise<{ projectId: string; status: BackendProjectStatus }> {
  const response = await fetch(`${API_BASE}/projects/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(errBody.error ?? `Failed to process URL (HTTP ${response.status})`)
  }
  return (await response.json()) as { projectId: string; status: BackendProjectStatus }
}

export function getProjectPreviewUrl(projectId: string): string {
  return `${API_BASE}/projects/${encodeURIComponent(projectId)}/preview`
}

export async function uploadProjectVideo(
  file: File
): Promise<{ projectId: string; status: BackendProjectStatus }> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}/projects/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(errBody.error ?? `Upload failed (HTTP ${response.status})`)
  }
  return (await response.json()) as { projectId: string; status: BackendProjectStatus }
}

export async function fetchProjectStatus(projectId: string): Promise<BackendProjectDto> {
  const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch project status (HTTP ${response.status})`)
  }
  const data = (await response.json()) as { project: BackendProjectDto }
  return data.project
}

export async function requestClipRender(
  projectId: string,
  clipId: string,
  focusX: number
): Promise<{ status: string; clipId: string }> {
  const response = await fetch(
    `${API_BASE}/projects/${encodeURIComponent(projectId)}/clips/${encodeURIComponent(clipId)}/render`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ focusX }),
    }
  )
  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(errBody.error ?? `Render failed (HTTP ${response.status})`)
  }
  return (await response.json()) as { status: string; clipId: string }
}

export function getClipDownloadUrl(projectId: string, clipId: string): string {
  return `${API_BASE}/projects/${encodeURIComponent(projectId)}/clips/${encodeURIComponent(clipId)}/download`
}
