# Integration & API Specification
# FutureFrame (FF-Frame)
> **Autonomous Video Clipping & Semantic Temporal Extraction Agent**  
> *Author: Future Foundation Research & Engineering Team*  
> *Version: 1.0.0 | Status: Active API Contract*

---

## 1. Third-Party Integrations

### 1.1 Google Gemini API (Multimodal Files & Structured Outputs)
FutureFrame mengandalkan Google Gemini 2.0 / 1.5 Flash untuk analisis temporal multimodal.

* **Client SDK:** `@google/genai` (Node.js SDK) atau direct REST endpoint `https://generativelanguage.googleapis.com/v1beta`.
* **File Upload Ingestion:** Menggunakan Gemini Files API untuk video/audio streaming besar (> 20 MB).
* **Structured Output Enforcement:** Mengirimkan parameter `responseSchema` dengan tipe MIME `application/json` agar model tidak menghasilkan teks bebas markdown.

#### Gemini API Request Configuration Example
```typescript
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Skema output deterministik
const clipExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    project_id: { type: Type.STRING },
    source_duration_seconds: { type: Type.NUMBER },
    clips: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          clip_id: { type: Type.STRING },
          timestamp_start: { type: Type.STRING, description: "Format HH:MM:SS.mmm" },
          timestamp_end: { type: Type.STRING, description: "Format HH:MM:SS.mmm" },
          duration_seconds: { type: Type.NUMBER },
          hook_score: { type: Type.NUMBER, description: "Scale 1.0 - 10.0" },
          topic: { type: Type.STRING },
          suggested_title: { type: Type.STRING },
          recommended_aspect_ratio: { type: Type.STRING, enum: ["9:16", "1:1", "16:9"] },
          crop_focus_coordinates: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.NUMBER, description: "Center focus x from 0.0 to 1.0" },
              y: { type: Type.NUMBER, description: "Center focus y from 0.0 to 1.0" }
            },
            required: ["x", "y"]
          }
        },
        required: [
          "clip_id", "timestamp_start", "timestamp_end", 
          "duration_seconds", "hook_score", "suggested_title", 
          "recommended_aspect_ratio", "crop_focus_coordinates"
        ]
      }
    }
  },
  required: ["project_id", "source_duration_seconds", "clips"]
};
```

---

### 1.2 FFmpeg & Media Engine Integration

FFmpeg dieksekusi secara terisolasi tanpa melalui shell parsing (`child_process.execFile`).

#### Filtergraph untuk Smart Crop (16:9 ke 9:16) & Subtitle Burn-In
Contoh parameter eksekusi deterministik FFmpeg:
```bash
ffmpeg -y \
  -ss 00:04:12.500 \
  -to 00:04:58.200 \
  -i /storage/staging/raw_video.mp4 \
  -vf "crop=ih*(9/16):ih:(iw-ow)*0.5:0,subtitles=/storage/staging/subtitles_clip-01.ass" \
  -c:v libx264 \
  -preset fast \
  -crf 22 \
  -c:a aac \
  -b:a 192k \
  /storage/rendered/clip-01.mp4
```

---

## 2. Internal RESTful API Contracts

Semua endpoint berbasis base URL `/api/v1` dan mengembalikan respon berformat JSON terstandarisasi.

### 2.1 Standard Response Envelope
```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req-98f5-4421",
    "timestamp": "2026-10-05T21:30:00.000Z"
  }
}
```

Format Error Envelope:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Timestamp start cannot be greater than timestamp end",
    "details": [
      {
        "field": "timestamp_start",
        "issue": "Invalid temporal range"
      }
    ]
  },
  "meta": {
    "requestId": "req-98f5-4421",
    "timestamp": "2026-10-05T21:30:00.000Z"
  }
}
```

---

### 2.2 Endpoints Definition

#### 1. Ingest Video Project
* **Endpoint:** `POST /api/v1/projects`
* **Content-Type:** `multipart/form-data` atau `application/json`
* **Headers:** `Authorization: Bearer <token>`
* **Request Payload (JSON Mode):**
```json
{
  "title": "Analisis Pasar Finansial Q4",
  "source_type": "URL",
  "source_url": "https://storage.googleapis.com/sample-bucket/podcast-ep12.mp4",
  "target_aspect_ratio": "9:16",
  "options": {
    "auto_render_threshold": 8.0,
    "generate_subtitles": true
  }
}
```
* **Success Response (`202 Accepted`):**
```json
{
  "success": true,
  "data": {
    "project_id": "proj-a1b2-c3d4",
    "title": "Analisis Pasar Finansial Q4",
    "status": "QUEUED",
    "created_at": "2026-10-05T21:30:00.000Z"
  }
}
```

---

#### 2. Get Project Status & Identified Clips
* **Endpoint:** `GET /api/v1/projects/:id`
* **Headers:** `Authorization: Bearer <token>`
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "project_id": "proj-a1b2-c3d4",
    "title": "Analisis Pasar Finansial Q4",
    "status": "ANALYZED",
    "source_duration_seconds": 1824.5,
    "clips": [
      {
        "clip_id": "clip-01",
        "timestamp_start": "00:04:12.500",
        "timestamp_end": "00:04:58.200",
        "duration_seconds": 45.7,
        "hook_score": 9.2,
        "topic": "Kebijakan Suku Bunga Global",
        "suggested_title": "Rahasia Kenaikan Bunga yang Disembunyikan",
        "status": "COMPLETED",
        "rendered_media_url": "https://cdn.futureframe.ai/clips/proj-a1b2-c3d4/clip-01.mp4",
        "crop_focus_coordinates": { "x": 0.5, "y": 0.5 }
      },
      {
        "clip_id": "clip-02",
        "timestamp_start": "00:15:30.000",
        "timestamp_end": "00:16:15.800",
        "duration_seconds": 45.8,
        "hook_score": 8.4,
        "topic": "Peluang Saham Teknologi",
        "suggested_title": "Saham AI Mana yang Layak Dibeli?",
        "status": "PENDING",
        "rendered_media_url": null,
        "crop_focus_coordinates": { "x": 0.65, "y": 0.5 }
      }
    ]
  }
}
```

---

#### 3. Trigger Manual Clip Render
* **Endpoint:** `POST /api/v1/projects/:id/render`
* **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request Payload:**
```json
{
  "clip_ids": ["clip-02"],
  "override_aspect_ratio": "9:16",
  "burn_subtitles": true,
  "subtitle_style": "KARAOKE_YELLOW"
}
```
* **Success Response (`202 Accepted`):**
```json
{
  "success": true,
  "data": {
    "project_id": "proj-a1b2-c3d4",
    "triggered_clips": ["clip-02"],
    "status": "RENDERING_ENQUEUED"
  }
}
```

---

#### 4. Get Clip Presigned Download URL
* **Endpoint:** `GET /api/v1/clips/:id/download`
* **Headers:** `Authorization: Bearer <token>`
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "clip_id": "clip-01",
    "download_url": "https://s3.amazonaws.com/future-frame-clips/clip-01.mp4?X-Amz-Signature=...",
    "expires_in_seconds": 3600
  }
}
```

---

## 3. Webhook Specification

FutureFrame mempublikasikan event secara real-time ke endpoint HTTP consumer yang didaftarkan.

### 3.1 Security: HMAC-SHA256 Signature Header
Setiap webhook request memuat header keamanan:
* `X-FutureFrame-Signature`: Hex-encoded HMAC-SHA256 dari request body menggunakan `WEBHOOK_SECRET`.
* `X-FutureFrame-Timestamp`: UNIX timestamp milidetik saat event dikirimkan (mencegah *replay attack* dengan batas toleransi 5 menit).

```typescript
// Contoh Verifikasi Signature di Sisi Konsumen (Node.js)
import crypto from 'node:crypto';

function verifyWebhook(rawBody: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
```

---

### 3.2 Webhook Event Catalog

#### Event: `clips.identified`
Dipicu setelah Gemini Multimodal selesai menganalisis video dan seluruh klip berhasil diekstraksi ke basis data.
```json
{
  "event": "clips.identified",
  "project_id": "proj-a1b2-c3d4",
  "timestamp": "2026-10-05T21:32:00.000Z",
  "data": {
    "total_clips": 5,
    "top_hook_score": 9.2,
    "clips_summary": [
      { "clip_id": "clip-01", "hook_score": 9.2, "duration": 45.7 },
      { "clip_id": "clip-02", "hook_score": 8.4, "duration": 45.8 }
    ]
  }
}
```

#### Event: `clip.rendered`
Dipicu ketika worker FFmpeg selesai memotong, me-reframe, membakar takarir, dan mengunggah klip ke storage.
```json
{
  "event": "clip.rendered",
  "project_id": "proj-a1b2-c3d4",
  "clip_id": "clip-01",
  "timestamp": "2026-10-05T21:32:35.000Z",
  "data": {
    "duration_seconds": 45.7,
    "media_url": "https://cdn.futureframe.ai/clips/proj-a1b2-c3d4/clip-01.mp4",
    "aspect_ratio": "9:16",
    "render_time_ms": 7820
  }
}
```

#### Event: `job.failed`
Dipicu jika terjadi kegagalan permanen pada pipeline (contoh: video rusak, kuota Gemini habis).
```json
{
  "event": "job.failed",
  "project_id": "proj-a1b2-c3d4",
  "failed_stage": "PREPROCESSING",
  "timestamp": "2026-10-05T21:30:45.000Z",
  "error": {
    "code": "CORRUPT_MEDIA_STREAM",
    "message": "FFprobe failed to decode audio track from uploaded container"
  }
}
```

---

### 3.3 Retry Policy
Jika endpoint webhook consumer mengembalikan status selain `2xx` (misal 500 atau timeout > 5s), sistem mencoba ulang dengan aturan:
* **Attempt 1:** Langsung setelah 5 detik.
* **Attempt 2:** Setelah 60 detik.
* **Attempt 3:** Setelah 5 menit.
* **Attempt 4 (Final):** Setelah 30 menit. Jika tetap gagal, event dicatat sebagai `DEAD_LETTER`.
