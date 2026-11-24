# FutureFrame Studio

**Autonomous Video Clipping & Semantic Temporal Extraction Agent**

FutureFrame Studio adalah aplikasi full-stack yang mengubah video berdurasi panjang (link YouTube atau file lokal `MP4`/`MOV`/`MKV`) menjadi klip vertikal **9:16** siap publikasi untuk TikTok, Instagram Reels, dan YouTube Shorts — lengkap dengan penilaian **Hook Score** otomatis menggunakan **Google Gemini Multimodal**, *Smart Crop*, dan generator takarir `.ass` (*Karaoke Yellow*).

---

## Fitur Utama

- **YouTube URL & Local Video Ingestion:** Mendukung pengunduhan langsung dari link YouTube (`yt-dlp`), tautan MP4 publik, maupun unggah file lokal hingga 3 GB secara *streaming* (hemat RAM).
- **Audio Downsampling Hemat Token:** Mengekstrak track audio **mono 64 kbps AAC** lewat **FFmpeg** sebelum dikirim ke Gemini API untuk menekan penggunaan token dan mempercepat inferensi.
- **AI Semantic Extraction & Hook Scoring:** Menggunakan `@google/genai` (Gemini `3.0-flash`) dengan isolasi XML (`<untrusted_audio_stream>`) dan validasi runtime **Zod** untuk menghasilkan kandidat klip terbaik berdasarkan skor tertimbang:
  $$\text{Hook Score} = (\text{Curiosity} \times 0.40) + (\text{Emotion} \times 0.30) + (\text{Actionable} \times 0.30)$$
- **Smart Crop 9:16 & Safe-Zone Studio:** Pratinjau interaktif di React UI dengan panduan *safe-zone* TikTok/Reels, slider posisi fokus pembicara (`Crop X`), serta pilihan gaya subtitle.
- **Hardsub Karaoke (`.ass`) & MP4 Streaming Ready:** Rendering video `1080×1920` (H.264/AAC) dengan `-movflags +faststart` dan dukungan antrean terdistribusi **BullMQ + Redis**.

---

## Struktur Proyek

```text
future-frame/
├── backend/                  # Fastify API Gateway + BullMQ Worker (TypeScript)
│   ├── src/
│   │   ├── config/           # Konfigurasi Gemini SDK & Redis
│   │   ├── core/             # AppError hierarchy & Zod schemas
│   │   ├── modules/          # Ingest, Preprocessor, Agent, Subtitles, Render
│   │   ├── queue/            # BullMQ queues & workers
│   │   ├── routes/           # REST API endpoints (/projects/*)
│   │   └── utils/            # File cleaner & HMAC webhook dispatcher
│   └── tests/unit/           # Unit test suite (Vitest)
├── frontend/                 # React + TypeScript + Vite Studio UI
│   └── src/
│       ├── api/              # HTTP client ke backend Fastify
│       ├── components/       # Header, IngestionPanel, InspectionPanel, StudioReviewPanel
│       └── styles/           # Design tokens & glassmorphic dark theme
└── documentations/           # PRD, Architecture, TSD, Design System & Roadmap
```

---

## Prasyarat Sistem

Pastikan perangkat Anda sudah terpasang:
- **Node.js** v20+ & **Yarn** (`1.22+`)
- **FFmpeg & FFprobe** (tersedia di `PATH`)
- **yt-dlp** (dibutuhkan untuk mengunduh URL YouTube)
- **Google Gemini API Key** (bisa dibuat gratis di [Google AI Studio](https://aistudio.google.com/))
- **Redis** *(opsional, jika menjalankan worker antrean terpisah `yarn dev:worker`)*

---

## Cara Menjalankan (Quick Start)

### 1. Konfigurasi Backend
```bash
cd backend
cp .env.example .env
```
Buka `backend/.env` lalu isi `GEMINI_API_KEY` Anda (dan sesuaikan `PORT`, misalnya `3001`).

Install dependensi dan jalankan server API:
```bash
yarn install
yarn dev:server
```

### 2. Konfigurasi & Jalankan Frontend
Sesuaikan target proxy `/api` pada `frontend/vite.config.ts` jika port backend Anda bukan `3001`, lalu jalankan:
```bash
cd frontend
yarn install
yarn dev
```
Buka **`http://localhost:5173`** di browser. Pastikan badge di kanan atas bertuliskan **`API Online`**.

---

## Pengujian & Build

**Backend (TypeScript Build + 42 Unit Tests):**
```bash
cd backend
yarn build
yarn test
```

**Frontend (TypeScript Check + Vite Production Build):**
```bash
cd frontend
yarn build
```

---

## Dokumentasi Tambahan
Detail arsitektur dan spesifikasi teknis tersedia di folder `documentations/`:
- `documentations/PRD.md` — Product Requirements
- `documentations/ARCHITECTURE.md` — Arsitektur Sistem & Diagram Alur
- `documentations/TSD.md` — Technical Specification & Kontrak Skema Zod
- `documentations/DESIGN_SYSTEM.md` — Design Tokens & Panduan UI
- `documentations/IMPLEMENTATION_PLAN.md` — Roadmap Sprint & Status Pengerjaan

---

## Lisensi
ISC
