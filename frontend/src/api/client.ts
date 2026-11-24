import type { HealthResponse } from '../types/studio'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export async function checkBackendHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return (await response.json()) as HealthResponse
}
