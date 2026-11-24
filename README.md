# FutureFrame Studio

**Autonomous Video Clipping & Semantic Temporal Extraction Agent**

FutureFrame Studio is a full-stack application that transforms long-form videos (YouTube URLs or local `MP4`/`MOV`/`MKV` files) into vertical **9:16** clips ready for TikTok, Instagram Reels, and YouTube Shorts — complete with automated **Hook Score** ranking powered by **Google Gemini Multimodal**, *Smart Crop*, and `.ass` (*Karaoke Yellow*) subtitle generation.

---

## Key Features

- **YouTube URL & Local Video Ingestion:** Supports direct downloading from YouTube URLs (`yt-dlp`), public MP4 links, and streaming local file uploads up to 3 GB (memory-efficient).
- **Token-Efficient Audio Downsampling:** Extracts a **mono 64 kbps AAC** audio track via **FFmpeg** before sending it to the Gemini API to minimize token usage and speed up inference.
- **AI Semantic Extraction & Hook Scoring:** Uses `@google/genai` (`gemini-flash-latest`) with XML boundary isolation (`<untrusted_audio_stream>`) and **Zod** runtime validation to rank clip candidates using a weighted formula:
  $$\text{Hook Score} = (\text{Curiosity} \times 0.40) + (\text{Emotion} \times 0.30) + (\text{Actionable} \times 0.30)$$
- **Smart Crop 9:16 & Safe-Zone Studio:** Interactive React Studio UI with social media *safe-zone* overlay guides, speaker focus slider (`Crop X`), and subtitle style presets.
- **Karaoke Hardsub (`.ass`) & Streaming-Ready MP4:** Renders `1080×1920` (H.264/AAC) clips with `-movflags +faststart` and distributed queue support via **BullMQ + Redis**.

---

## Project Structure

```text
future-frame/
├── backend/                  # Fastify API Gateway + BullMQ Worker (TypeScript)
│   ├── src/
│   │   ├── config/           # Gemini SDK & Redis configuration
│   │   ├── core/             # AppError hierarchy & Zod schemas
│   │   ├── modules/          # Ingest, Preprocessor, Agent, Subtitles, Render
│   │   ├── queue/            # BullMQ queues & workers
│   │   ├── routes/           # REST API endpoints (/projects/*)
│   │   └── utils/            # File cleaner & HMAC webhook dispatcher
│   └── tests/unit/           # Unit test suite (Vitest)
├── frontend/                 # React + TypeScript + Vite Studio UI
│   └── src/
│       ├── api/              # HTTP client for the Fastify backend
│       ├── components/       # Header, IngestionPanel, InspectionPanel, StudioReviewPanel
│       └── styles/           # Design tokens & glassmorphic dark theme
└── documentations/           # PRD, Architecture, TSD, Design System & Roadmap
```

---

## Prerequisites

Make sure the following tools are installed on your machine:
- **Node.js** v20+ & **Yarn** (`1.22+`)
- **FFmpeg & FFprobe** (available in `PATH`)
- **yt-dlp** (required for downloading YouTube URLs)
- **Google Gemini API Key** (available from [Google AI Studio](https://aistudio.google.com/))
- **Redis** *(optional, required only when running the standalone queue worker `yarn dev:worker`)*

---

## Quick Start

### 1. Configure & Run Backend
```bash
cd backend
cp .env.example .env
```
Open `backend/.env` and set your `GEMINI_API_KEY` (and adjust `PORT`, e.g., `3001`). If the default `gemini-flash-latest` model experiences temporary high demand (`503`), you can set `GEMINI_MODEL=gemini-2.5-flash` in `backend/.env`.

Install dependencies and start the API server:
```bash
yarn install
yarn dev:server
```

### 2. Configure & Run Frontend
Ensure the `/api` proxy target in `frontend/vite.config.ts` matches your backend port (default `http://localhost:3001`), then run:
```bash
cd frontend
yarn install
yarn dev
```
Open **`http://localhost:5173`** in your browser. Verify that the top-right status badge displays **`API Online`**.

---

## Testing & Build

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

## Additional Documentation
Detailed specifications and architecture documents are located in `documentations/`:
- `documentations/PRD.md` — Product Requirements
- `documentations/ARCHITECTURE.md` — System Architecture & Flow Diagrams
- `documentations/TSD.md` — Technical Specification & Zod Contracts
- `documentations/DESIGN_SYSTEM.md` — Design Tokens & UI Guidelines
- `documentations/IMPLEMENTATION_PLAN.md` — Sprint Roadmap & Progress

---

## License
ISC
