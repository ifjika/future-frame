import type { ExtractedClip } from '../../core/schemas/gemini-response.schema.js';
import type { VideoMetadata } from '../../core/schemas/video-probe.schema.js';

export type ProjectStatus = 'QUEUED' | 'PREPROCESSING' | 'INFERRING' | 'ANALYZED' | 'FAILED';

export interface StudioClipRecord extends ExtractedClip {
  renderStatus: 'idle' | 'rendering' | 'completed' | 'failed';
  outputPath?: string;
}

export interface ProjectRecord {
  id: string;
  title: string;
  status: ProjectStatus;
  inputPath: string;
  metadata?: VideoMetadata;
  clips: StudioClipRecord[];
  errorMessage?: string;
  createdAt: string;
}

export class InMemoryProjectStore {
  private readonly projects = new Map<string, ProjectRecord>();

  public create(record: ProjectRecord): ProjectRecord {
    this.projects.set(record.id, record);
    return record;
  }

  public get(projectId: string): ProjectRecord | undefined {
    return this.projects.get(projectId);
  }

  public update(projectId: string, patch: Partial<ProjectRecord>): ProjectRecord | undefined {
    const existing = this.projects.get(projectId);
    if (!existing) return undefined;
    const updated: ProjectRecord = { ...existing, ...patch };
    this.projects.set(projectId, updated);
    return updated;
  }
}
