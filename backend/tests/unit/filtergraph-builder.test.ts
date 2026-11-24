import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../src/core/errors/AppError.js';
import {
  buildVerticalFiltergraph,
  calculateVerticalCropRegion,
  escapeSubtitlesFilterPath,
} from '../../src/modules/render/filtergraph-builder.js';

describe('filtergraph-builder (AAA)', () => {
  it('menghitung crop 9:16 berdimensi genap pada video 1920x1080 dengan focusX 0.5', () => {
    // Arrange
    const input = { sourceWidth: 1920, sourceHeight: 1080, focusX: 0.5 };

    // Act
    const region = calculateVerticalCropRegion(input);

    // Assert (1080 * 9/16 = 607.5 -> genap: 606; (1920 - 606) / 2 = 657)
    expect(region.cropWidth).toBe(606);
    expect(region.cropWidth % 2).toBe(0);
    expect(region.cropHeight).toBe(1080);
    expect(region.xOffset).toBe(657);
    expect(region.yOffset).toBe(0);
  });

  it('menjepit (clamp) xOffset agar tidak keluar batas kiri maupun kanan frame', () => {
    // Arrange & Act
    const leftEdge = calculateVerticalCropRegion({
      sourceWidth: 1920,
      sourceHeight: 1080,
      focusX: 0.0,
    });
    const rightEdge = calculateVerticalCropRegion({
      sourceWidth: 1920,
      sourceHeight: 1080,
      focusX: 1.0,
    });

    // Assert
    expect(leftEdge.xOffset).toBe(0);
    expect(rightEdge.xOffset).toBe(1920 - 606);
  });

  it('menyusun filtergraph dengan path subtitle Windows yang ter-escape aman', () => {
    // Arrange
    const subtitlePath = 'D:\\projects\\future-frame\\storage\\sub_clip-1.ass';

    // Act
    const escaped = escapeSubtitlesFilterPath(subtitlePath);
    const graph = buildVerticalFiltergraph({
      sourceWidth: 1920,
      sourceHeight: 1080,
      focusX: 0.5,
      subtitlePath,
    });

    // Assert
    expect(escaped).toBe('D\\:/projects/future-frame/storage/sub_clip-1.ass');
    expect(graph).toBe(
      "[0:v]crop=606:1080:657:0,scale=1080:1920,subtitles='D\\:/projects/future-frame/storage/sub_clip-1.ass'[v_out]"
    );
  });

  it('melempar ValidationError jika dimensi video sumber <= 0', () => {
    expect(() =>
      calculateVerticalCropRegion({ sourceWidth: 0, sourceHeight: 1080, focusX: 0.5 })
    ).toThrow(ValidationError);
  });
});
