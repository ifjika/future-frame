import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ValidationError } from '../../core/errors/AppError.js';

export type AssSubtitleStyle = 'KARAOKE_YELLOW' | 'CLEAN_WHITE';

export interface WordTiming {
  word: string;
  startSec: number;
  endSec: number;
}

export interface SubtitleSegment {
  startSec: number;
  endSec: number;
  words: WordTiming[];
}

/**
 * Mengonversi detik ke format waktu ASS `H:MM:SS.cc` (centiseconds).
 */
export function formatAssTimestamp(seconds: number): string {
  const safeSec = Math.max(0, seconds);
  const totalCentis = Math.round(safeSec * 100);
  const hours = Math.floor(totalCentis / 360_000);
  const minutes = Math.floor((totalCentis % 360_000) / 6_000);
  const secs = Math.floor((totalCentis % 6_000) / 100);
  const centis = totalCentis % 100;

  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

/**
 * Membersihkan teks agar tidak menyuntikkan tag override `{...}` atau newline ke skrip ASS.
 */
export function sanitizeAssText(text: string): string {
  return text.replace(/[\r\n]+/g, ' ').replace(/[{}]/g, '').trim();
}

/**
 * Builds a karaoke line with centisecond `\k` duration tags per word.
 */
export function buildKaraokeLine(words: WordTiming[]): string {
  if (words.length === 0) {
    throw new ValidationError('Subtitle segment must contain at least one word');
  }

  return words
    .map((item) => {
      if (item.endSec < item.startSec) {
        throw new ValidationError('Word endSec cannot be less than startSec');
      }
      const durationCs = Math.max(1, Math.round((item.endSec - item.startSec) * 100));
      const cleanWord = sanitizeAssText(item.word);
      return `{\\k${durationCs}}${cleanWord}`;
    })
    .join(' ');
}

export function generateAssContent(
  segments: SubtitleSegment[],
  style: AssSubtitleStyle = 'KARAOKE_YELLOW'
): string {
  if (segments.length === 0) {
    throw new ValidationError('Subtitle segments list cannot be empty');
  }

  // ASS uses &HAABBGGRR color format: &H0000FFFF = Yellow, &H00FFFFFF = White
  const primaryColor = style === 'KARAOKE_YELLOW' ? '&H0000FFFF' : '&H00FFFFFF';
  const secondaryColor = '&H00FFFFFF';

  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'PlayResX: 1080',
    'PlayResY: 1920',
    'WrapStyle: 0',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,Outfit,72,${primaryColor},${secondaryColor},&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,6,0,2,60,60,340,1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];

  const dialogues = segments.map((seg) => {
    if (seg.endSec <= seg.startSec) {
      throw new ValidationError('Segment endSec must be greater than startSec');
    }
    const start = formatAssTimestamp(seg.startSec);
    const end = formatAssTimestamp(seg.endSec);
    const text =
      style === 'KARAOKE_YELLOW'
        ? buildKaraokeLine(seg.words)
        : seg.words.map((w) => sanitizeAssText(w.word)).join(' ');
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
  });

  return [...header, ...dialogues, ''].join('\n');
}

export async function writeAssFile(
  outputPath: string,
  segments: SubtitleSegment[],
  style: AssSubtitleStyle = 'KARAOKE_YELLOW'
): Promise<string> {
  const resolvedPath = path.resolve(outputPath);
  await mkdir(path.dirname(resolvedPath), { recursive: true });
  const content = generateAssContent(segments, style);
  await writeFile(resolvedPath, content, 'utf8');
  return resolvedPath;
}
