import { GoogleGenAI } from '@google/genai';
import { ValidationError } from '../core/errors/AppError.js';

export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';

let cachedClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env['GEMINI_API_KEY']?.trim();
  if (!apiKey) {
    throw new ValidationError('GEMINI_API_KEY belum dikonfigurasi pada environment');
  }

  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}
