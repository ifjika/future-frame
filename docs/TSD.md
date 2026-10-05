# Technical Specifications Document (TSD)
# FutureFrame (FF-Frame)
> **Autonomous Video Clipping & Semantic Temporal Extraction Agent**  
> *Author: Future Foundation Engineering & Algorithmic Research*  
> *Version: 1.1.0 | Status: Approved Technical Blueprint*

---

## 1. Architectural Blueprint & System Identity

FutureFrame adalah sistem backend & engine pemrosesan media berbasis agen AI otonom yang mengadopsi pola **Hexagonal / Clean Architecture** dengan **Event-Driven Asynchronous Pipeline (Pipes & Filters)**.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          HTTP API Gateway                              │
│                      (Fastify v5 + TypeScript)                         │
└──────────────┬──────────────────────────────────────────┬──────────────┘
               │                                          │
               ▼                                          ▼
     [ Ingestion Engine ]                       [ BullMQ Producer ]
  (FFprobe + Stream Downloader)                 (Redis 7.2 Queue)
               │                                          │
               ▼                                          ▼
   [ Preprocessor Service ]                     [ Distributed Workers ]
 (Mono Audio + 480p Visual Sample)             (Concurrency Controlled)
               │                                          │
               ▼                                          ▼
  [ Gemini Multimodal Agent ] ──────────────► [ FFmpeg Rendering Node ]
(Files API + JSON Schema Enforce)            (Smart Crop + NVENC + Hardsub)
                                                          │
                                                          ▼
                                              [ S3 / CDN Distribution ]
```

---

## 2. Runtime, Hardware & Infrastructure Specifications

### 2.1 Runtime & Compiler Directives
* **Runtime:** Node.js v20.x LTS (Active Long Term Support).
* **Language:** TypeScript 5.4+ dengan konfigurasi compiler ketat (*strict mode*):
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "strict": true,
      "noImplicitAny": true,
      "strictNullChecks": true,
      "exactOptionalPropertyTypes": true,
      "noUncheckedIndexedAccess": true
    }
  }
  ```
* **Web Framework:** **Fastify v5** (dipilih karena overhead rendah, native stream piping, dan integrasi `@fastify/multipart`).
* **AI SDK:** `@google/genai` (Google Gen AI SDK terbaru) terhubung ke endpoint Gemini 2.0 / 1.5 Flash.
* **Media Binaries:** FFmpeg 6.1+ & FFprobe (wajib mendukung kompilasi `--enable-libx264 --enable-libmp3lame --enable-libass --enable-nvenc` atau VAAPI).
* **Distributed Queue:** **BullMQ v5** dengan **Redis 7.2** (standar atau Redis Cluster).
* **Database & ORM:** PostgreSQL 16 via **Prisma ORM** / Kysely.

### 2.2 Hardware Budgets & Resource Limits
* **Worker Process RAM Limit:** Maksimal **4 GB RSS** per worker instance. Jika penggunaan RAM melebihi 3.8 GB, worker secara defensif menolak task baru hingga proses FFmpeg selesai.
* **Disk Staging Quota:** Direktori staging `./storage/` wajib memiliki sisa ruang disk minimal **15% dari total kapasitas host**. Ingestion task baru akan ditolak (*507 Insufficient Storage*) jika kuota tidak terpenuhi.
* **Concurrency Gates:**
  * CPU Rendering: Maksimal 2 proses FFmpeg aktif per core fisik CPU.
  * GPU Rendering (NVENC): Maksimal 3–4 sesi transcode simultan per GPU instance (tergantung limit NVENC encoder session).

---

## 3. Core Engine & Modular Component Blueprint

Sistem dipecah menjadi 8 modul internal independen:

### 3.1 Module 1: Ingestion Engine (`src/modules/ingest/`)
* **`MultipartStreamHandler`:** Mengalirkan (*stream-pipe*) file video masukan langsung ke disk staging (`/storage/staging/raw_<uuid>.<ext>`) tanpa memuat buffer ke dalam memori RAM Node.js.
* **`URLStreamDownloader`:** Mengunduh media dari link publik (YouTube / Google Drive / direct URL) menggunakan stream chunk berbatas timeout (maksimal 10 menit download timeout).
* **`VideoProbeService`:** Mengeksekusi FFprobe untuk ekstraksi metadata stream:
  ```bash
  ffprobe -v quiet -print_format json -show_format -show_streams /storage/staging/raw_video.mp4
  ```
  *Memvalidasi: codec video (H.264/HEVC/VP9), keberadaan audio track, resolusi ($W \ge 720, H \ge 480$), dan durasi ($15\text{s} \le \text{duration} \le 7200\text{s}$).*

---

### 3.2 Module 2: Media Preprocessor Engine (`src/modules/preprocessor/`)
Mengoptimalkan efisiensi token dan bandwidth sebelum data dikirim ke Gemini AI:
1. **Audio Extractor (`audio-extractor.ts`):** Mengekstrak track audio berkualitas 64 kbps mono AAC pada sampling rate 16kHz:
   ```bash
   ffmpeg -y -i /storage/staging/raw_video.mp4 -vn -c:a aac -b:a 64k -ac 1 -ar 16000 /storage/preprocessed/audio_<id>.aac
   ```
2. **Visual Sampler (`visual-sampler.ts`):** Mengambil sampel visual berkecepatan 1 frame per detik (1 fps) pada resolusi 480p jika mode analisis visual diaktifkan:
   ```bash
   ffmpeg -y -i /storage/staging/raw_video.mp4 -vf "fps=1,scale=854:480:force_original_aspect_ratio=decrease" -c:v libx264 -preset ultrafast -crf 28 -an /storage/preprocessed/sample_<id>.mp4
   ```

---

### 3.3 Module 3: Gemini Multimodal Agent Orchestrator (`src/modules/agent/`)
* **Gemini Files API Integration:** Mengunggah file audio preprocessed menggunakan `ai.files.upload()`.
* **Prompt Compilation with Security Boundary:**
  Instruksi sistem diisolasi dari dialog video menggunakan tag XML `<untrusted_audio_stream>` guna mencegah serangan *prompt override*.
* **Structured Output Enforcement:**
  Mengirimkan `responseMimeType: "application/json"` dan skema deklaratif Gemini agar model mengembalikan data deterministik.
* **Resilience & Rate Limit Handler:**
  Jika menerima respons HTTP 429 (*Resource Exhausted*), antrean menunda eksekusi dengan *exponential backoff* ($t = 2^{attempt} \times 1000\text{ms} + \text{jitter}$).

---

### 3.4 Module 4: Temporal Boundary & Reframing Engine (`src/modules/clipping/`)

#### A. Algoritma Smart Reframing (16:9 ke 9:16):
Untuk video sumber 16:9 ($W_{src} \times H_{src}$):
$$W_{target} = \text{round}\left(H_{src} \times \frac{9}{16}\right), \quad H_{target} = H_{src}$$

Koordinat pemotongan horizontal ($X_{crop}$) berdasarkan titik fokus tengah pembicara $x_{focus} \in [0.0, 1.0]$:
$$X_{raw} = (x_{focus} \times W_{src}) - \frac{W_{target}}{2}$$
$$X_{crop} = \text{clamp}\left(X_{raw}, 0, W_{src} - W_{target}\right) = \max\left(0, \min\left(X_{raw}, W_{src} - W_{target}\right)\right)$$

#### B. Exponential Moving Average (EMA) untuk Kamera Halus:
$$X_{smooth}(t) = \alpha \cdot X_{crop}(t) + (1 - \alpha) \cdot X_{smooth}(t-1)$$
*(Faktor kehalusan $\alpha = 0.15$ untuk transisi panning yang sinematik).*

#### C. Temporal Boundary Clamping & Silence Padding:
1. **Silence Padding:**
   $$T_{start\_padded} = \max(0, T_{start} - 0.25\text{s})$$
   $$T_{end\_padded} = \min(T_{source\_duration}, T_{end} + 0.50\text{s})$$
2. **Duration Boundary Enforcement:**
   Jika durasi $< 15.0\text{s}$, rentang diperpanjang simetris ke kiri dan kanan hingga 15.0 detik. Jika durasi $> 90.0\text{s}$, rentang dipangkas hingga 90.0 detik.
3. **Non-Maximum Suppression (NMS):**
   Jika dua klip memiliki $IoU_{temporal} \ge 0.40$, klip dengan skor lebih rendah dieliminasi dari daftar auto-render.

#### D. Formulasi Skor Hook ($S_{hook}$):
$$S_{hook} = (S_{curiosity} \times 0.40) + (S_{emotion} \times 0.30) + (S_{actionable} \times 0.30)$$
* **$S_{hook} \ge 8.0$:** Auto-render ke antrean rendering MP4.
* **$7.0 \le S_{hook} < 8.0$:** Review queue di studio.
* **$S_{hook} < 7.0$:** Discarded (tidak ditampilkan ke feed utama).

---

### 3.5 Module 5: Subtitle & Dynamic Captioning Engine (`src/modules/subtitles/`)
* **Word-Level Timestamp Synchronizer:** Mengonversi data transkrip kata-per-kata menjadi stempel waktu presisi.
* **ASS Subtitle Styler Generator:** Menghasilkan file `.ass` (*Advanced SubStation Alpha*) dengan spesifikasi:
  * Font: `Outfit` (Bold 800), ukuran 72 pt pada kanvas $1080 \times 1920$.
  * Primary Color: `&H00FFFFFF` (Putih), Active Highlight: `&H0000FFFF` (Kuning menyala via tag karaoke `\k`).
  * Outline: 6 px warna hitam solid, Margin Bawah: 340 px (menghindari tumpang tindih dengan UI TikTok/Reels).

---

### 3.6 Module 6: FFmpeg Execution Node (`src/modules/render/`)
* **Safe Subprocess Supervisor:** Mengeksekusi binary FFmpeg melalui `child_process.execFile` dengan array argumen statis terpisah (tanpa perantara shell interpreter `/bin/sh` atau `cmd.exe`).
* **Filtergraph Execution:**
  ```bash
  ffmpeg -y \
    -ss 00:04:12.500 \
    -to 00:04:58.200 \
    -i /storage/staging/raw_video.mp4 \
    -filter_complex "[0:v]crop=ih*(9/16):ih:(iw-ow)*0.5:0,scale=1080:1920,subtitles=/storage/staging/sub_clip-01.ass[v_out]" \
    -map "[v_out]" \
    -map 0:a \
    -c:v libx264 \
    -preset fast \
    -crf 21 \
    -c:a aac \
    -b:a 192k \
    -movflags +faststart \
    /storage/rendered/clip-01.mp4
  ```
* **Realtime Progress Reader:** Membaca stdout `-progress pipe:1` untuk menghitung persentase frame yang telah selesai dirender secara real-time.

---

### 3.7 Module 7: Distributed Queue & Worker Orchestrator (`src/queue/`)
* **Queue Topology:**
  1. `ingestQueue`: Menangani download URL, verifikasi FFprobe, dan ekstraksi audio.
  2. `inferenceQueue`: Mengunggah ke Gemini Files API dan mengeksekusi ekstraksi semantik.
  3. `renderQueue`: Menjalankan FFmpeg crop, burn-in subtitle, dan upload S3.
* **Job Idempotency:** Job ID diformat sebagai `ff_render_${projectId}_${clipId}` untuk mencegah rendering duplikat.
* **Dead-Letter Queue (DLQ):** Jika job gagal 3x berturut-turut, tugas dipindahkan ke `failedRenderDLQ` untuk dianalisis tim teknis.

---

### 3.8 Module 8: Storage & Garbage Collection Engine (`src/utils/file-cleaner.ts`)
* **Ephemeral Disk Sweeper:** Cron job internal yang berjalan setiap 30 menit:
  * Menghapus file staging mentah yang proyeknya telah berstatus `COMPLETED` atau `FAILED`.
  * Menghapus seluruh file sementara yang berusia $> 24\text{ jam}$ (*force-purge*).
* **S3 Presigned URLs:** Mengenerasi presigned URL unduhan klip dengan TTL 3600 detik (1 jam).

---

## 4. Strict Schema Contracts & Zod Type Definitions

```typescript
import { z } from 'zod';

export const TimestampRegex = /^([0-9]{2}):([0-5][0-9]):([0-5][0-9])\.([0-9]{3})$/;

export const TimestampStringSchema = z
  .string()
  .regex(TimestampRegex, 'Timestamp wajib berformat HH:MM:SS.mmm');

export const CropCoordinatesSchema = z.object({
  x: z.number().min(0.0).max(1.0).default(0.5),
  y: z.number().min(0.0).max(1.0).default(0.5)
});

export const ExtractedClipSchema = z.object({
  clip_id: z.string().min(1),
  timestamp_start: TimestampStringSchema,
  timestamp_end: TimestampStringSchema,
  duration_seconds: z.number().min(15.0).max(90.0),
  hook_score: z.number().min(1.0).max(10.0),
  topic: z.string().min(3).max(150),
  suggested_title: z.string().min(5).max(120),
  recommended_aspect_ratio: z.enum(['9:16', '1:1', '16:9']).default('9:16'),
  crop_focus_coordinates: CropCoordinatesSchema
});

export const GeminiClipExtractionResponseSchema = z.object({
  project_id: z.string().min(1),
  source_duration_seconds: z.number().positive(),
  clips: z.array(ExtractedClipSchema).min(1)
});

export const IngestionPayloadSchema = z.object({
  title: z.string().min(3).max(120),
  source_type: z.enum(['FILE_UPLOAD', 'URL']),
  source_url: z.string().url().optional(),
  target_aspect_ratio: z.enum(['9:16', '1:1', '16:9']).default('9:16'),
  options: z.object({
    auto_render_threshold: z.number().min(1.0).max(10.0).default(8.0),
    generate_subtitles: z.boolean().default(true),
    subtitle_style: z.enum(['KARAOKE_YELLOW', 'CLEAN_WHITE']).default('KARAOKE_YELLOW')
  }).default({})
});

export type IngestionPayload = z.infer<typeof IngestionPayloadSchema>;
export type ExtractedClip = z.infer<typeof ExtractedClipSchema>;
export type GeminiClipExtractionResponse = z.infer<typeof GeminiClipExtractionResponseSchema>;
```

---

## 5. Technical Error Taxonomy & Exit Codes

| Kode Kesalahan | HTTP Status | Kategori | Deskripsi & Penanganan |
| :--- | :--- | :--- | :--- |
| `ERR_MEDIA_PROBE_FAILED` | 422 | Ingestion | FFprobe gagal membaca stream video/audio. File corrupt atau format tidak didukung. |
| `ERR_DURATION_EXCEEDED` | 400 | Ingestion | Durasi video melebihi batas sistem (> 120 menit). |
| `ERR_DISK_QUOTA_EXCEEDED`| 507 | Infrastructure| Ruang disk staging tersisa < 15%. Tolak job baru secara defensif. |
| `ERR_GEMINI_RATE_LIMIT` | 429 | AI Inference | Kuota API Gemini habis. BullMQ memicu exponential backoff. |
| `ERR_INVALID_AI_SCHEMA` | 502 | AI Inference | Respons model Gemini melanggar skema Zod. Coba ulang dengan model fallback. |
| `ERR_RENDER_OOM` | 500 | Execution | Proses FFmpeg crash karena Out-of-Memory. Kurangi resolusi render dan coba ulang. |
| `ERR_RENDER_TIMEOUT` | 504 | Execution | Eksekusi FFmpeg melebihi batas waktu (timeout 180 detik). |

---

## 6. Performance & Latency Budgets (SLA)

| Tahapan Pipeline | Target Durasi (Video 60 Menit) | Hard Timeout |
| :--- | :--- | :--- |
| **Ingestion & FFprobe** | < 15 detik | 60 detik |
| **Audio Preprocessing** | < 30 detik | 120 detik |
| **Gemini Inference** | < 45 detik | 90 detik |
| **Zod Schema Validation**| < 10 milidetik | 500 milidetik |
| **FFmpeg Clip Render** | < 15 detik per klip 60s | 180 detik |
| **S3 Upload & Signed URL**| < 3 detik per klip | 30 detik |
