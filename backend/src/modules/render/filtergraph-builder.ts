import { ValidationError } from '../../core/errors/AppError.js';

export interface CropRegionInput {
  sourceWidth: number;
  sourceHeight: number;
  focusX: number;
}

export interface CropRegion {
  cropWidth: number;
  cropHeight: number;
  xOffset: number;
  yOffset: number;
}

export interface FiltergraphOptions extends CropRegionInput {
  targetWidth?: number;
  targetHeight?: number;
  subtitlePath?: string;
}

const VERTICAL_ASPECT_RATIO = 9 / 16;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toEvenFloor(value: number): number {
  const floored = Math.floor(value);
  return floored - (floored % 2);
}

/**
 * Computes deterministic 9:16 vertical crop coordinates with even pixel dimensions
 * (required by H.264) clamped within the source video bounds.
 */
export function calculateVerticalCropRegion(input: CropRegionInput): CropRegion {
  if (input.sourceWidth <= 0 || input.sourceHeight <= 0) {
    throw new ValidationError('Source video dimensions must be greater than 0');
  }

  const safeFocusX = clamp(input.focusX, 0, 1);
  const cropHeight = Math.max(2, toEvenFloor(input.sourceHeight));
  const rawWidth = Math.min(input.sourceWidth, cropHeight * VERTICAL_ASPECT_RATIO);
  const cropWidth = Math.max(2, toEvenFloor(rawWidth));

  const maxOffsetX = Math.max(0, input.sourceWidth - cropWidth);
  const idealCenterX = safeFocusX * input.sourceWidth - cropWidth / 2;
  const xOffset = Math.round(clamp(idealCenterX, 0, maxOffsetX));

  return {
    cropWidth,
    cropHeight,
    xOffset,
    yOffset: 0,
  };
}

/**
 * Escapes subtitle file paths for safe use inside FFmpeg's `subtitles='...'` filter,
 * including Windows drive letters (e.g., `D:\...` -> `D\:/...`).
 */
export function escapeSubtitlesFilterPath(subtitlePath: string): string {
  const trimmed = subtitlePath.trim();
  if (!trimmed) {
    throw new ValidationError('subtitlePath cannot be empty');
  }

  return trimmed
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'");
}

/**
 * Menyusun string `-filter_complex` FFmpeg untuk Smart Crop 9:16, scaling, dan burn-in subtitle.
 */
export function buildVerticalFiltergraph(options: FiltergraphOptions): string {
  const targetWidth = options.targetWidth ?? 1080;
  const targetHeight = options.targetHeight ?? 1920;
  const region = calculateVerticalCropRegion(options);

  const filters = [
    `crop=${region.cropWidth}:${region.cropHeight}:${region.xOffset}:${region.yOffset}`,
    `scale=${targetWidth}:${targetHeight}`,
  ];

  if (options.subtitlePath) {
    const escapedPath = escapeSubtitlesFilterPath(options.subtitlePath);
    filters.push(`subtitles='${escapedPath}'`);
  }

  return `[0:v]${filters.join(',')}[v_out]`;
}
