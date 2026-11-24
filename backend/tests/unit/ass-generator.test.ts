import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../src/core/errors/AppError.js';
import {
  buildKaraokeLine,
  formatAssTimestamp,
  generateAssContent,
  sanitizeAssText,
} from '../../src/modules/subtitles/ass-generator.js';

describe('ass-generator (AAA)', () => {
  it('memformat detik ke timestamp ASS H:MM:SS.cc dan menjepit nilai negatif ke 0', () => {
    expect(formatAssTimestamp(65.25)).toBe('0:01:05.25');
    expect(formatAssTimestamp(-3)).toBe('0:00:00.00');
  });

  it('menghasilkan konten ASS 1080x1920 dengan margin aman 340px dan tag karaoke \\k', () => {
    // Arrange
    const segments = [
      {
        startSec: 0,
        endSec: 1.5,
        words: [
          { word: 'Halo', startSec: 0, endSec: 0.5 },
          { word: 'Dunia', startSec: 0.5, endSec: 1.5 },
        ],
      },
    ];

    // Act
    const ass = generateAssContent(segments, 'KARAOKE_YELLOW');

    // Assert
    expect(ass).toContain('PlayResX: 1080');
    expect(ass).toContain('PlayResY: 1920');
    expect(ass).toContain('&H0000FFFF');
    expect(ass).toContain(',340,1');
    expect(ass).toContain('Dialogue: 0,0:00:00.00,0:00:01.50,Default,,0,0,0,,{\\k50}Halo {\\k100}Dunia');
  });

  it('membersihkan karakter tag override {} untuk mencegah ASS injection', () => {
    const dirty = 'Halo {\\pos(0,0)}Dunia\nBaru';
    expect(sanitizeAssText(dirty)).toBe('Halo \\pos(0,0)Dunia Baru');
  });

  it('melempar ValidationError jika segmen kosong atau waktu kata terbalik', () => {
    expect(() => generateAssContent([])).toThrow(ValidationError);
    expect(() =>
      buildKaraokeLine([{ word: 'Tes', startSec: 2, endSec: 1 }])
    ).toThrow(ValidationError);
  });
});
