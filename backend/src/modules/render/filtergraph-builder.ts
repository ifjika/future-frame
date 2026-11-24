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
 * Menghitung area crop vertikal 9:16 yang deterministik, berdimensi genap (syarat H.264),
 * serta ter-clamp di dalam batas resolusi video sumber.
 */
export function calculateVerticalCropRegion(input: CropRegionInput): CropRegion {
  if (input.sourceWidth <= 0 || input.sourceHeight <= 0) {
    throw new ValidationError('Dimensi video sumber harus lebih besar dari 0');
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
 * Meng-escape path berkas subtitle agar aman dipakai di dalam filter `subtitles='...'` FFmpeg,
 * termasuk drive letter Windows (mis. `D:\...` -> `D\:/...`).
 */
export function escapeSubtitlesFilterPath(subtitlePath: string): string {
  const trimmed = subtitlePath.trim();
  if (!trimmed) {
    throw new ValidationError('subtitlePath tidak boleh kosong');
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
