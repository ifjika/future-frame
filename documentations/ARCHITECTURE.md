# System Architecture Specification
# FutureFrame (FF-Frame)
> **Autonomous Video Clipping & Semantic Temporal Extraction Agent**  
> *Author: Future Foundation Research & Engineering Team*  
> *Version: 1.0.0 | Status: Active Architectural Blueprint*

---

## 1. Architectural Overview & Core Patterns

FutureFrame dirancang mengadopsi pola arsitektur **Modular Layered Architecture** yang dipadukan dengan **Event-Driven Asynchronous Pipeline (Producer-Consumer)** untuk memastikan skalabilitas, isolasi kegagalan, dan efisiensi komputasi media:

1. **Pipes & Filters Pattern:** Pemrosesan media video dibagi menjadi tahapan terpisah (*Ingestion ➔ Downsampling ➔ Inference ➔ Validation ➔ Clipping/Reframing ➔ Storage*), di mana setiap tahapan memiliki kontrak input/output yang deterministik.
2. **Producer-Consumer via Redis & BullMQ:** Operasi berat (transcoding FFmpeg, download media, upload file besar ke AI API) tidak pernah dijalankan pada thread HTTP utama. Server API hanya berperan sebagai *producer* yang menerbitkan tugas ke antrean Redis, sementara sekumpulan worker terdistribusi bertindak sebagai *consumer*.
3. **Hexagonal / Clean Architecture:** Komponen inti logika bisnis (ekstraksi batas waktu, kalkulasi skor hook, aturan rasio aspek) terisolasi penuh dari pustaka eksternal (FFmpeg CLI, SDK Gemini, database). Setiap adaptor pihak ketiga dihubungkan melalui interface/port abstrak.

---

## 2. High-Level System Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer [Client & Consumer Interface]
        ClientUI[Web Dashboard / Studio]
        CLIClient[Developer CLI Tool]
        ExtWebhook[External Consumer Webhooks]
    end

    subgraph APILayer [API Gateway & Ingest Layer]
        APIGateway[Fastify / Express API Gateway]
        AuthModule[JWT & API Key Guard]
        IngestRouter[Ingestion & Upload Controller]
    end

    subgraph StorageQueue [State & Queue Infrastructure]
        RedisQueue[(Redis 7.x / BullMQ)]
        RelationalDB[(PostgreSQL / SQLite Database)]
        StagingStorage[(Local Temp Staging Disk)]
        ObjectStorage[(S3 / GCS Object Bucket)]
    end

    subgraph InferenceWorkerLayer [Worker & AI Orchestration Pool]
        WorkerPreprocess[Preprocessor Worker\nFFprobe + Downsampler]
        GeminiOrchestrator[Gemini Multimodal Agent\nFiles API + Structured JSON]
        WorkerRender[FFmpeg Rendering Worker\nSmart Crop + NVENC + Hardsub]
    end

    ClientUI -->|HTTP / Multipart| APIGateway
    CLIClient -->|HTTP REST| APIGateway
    APIGateway --> AuthModule
    AuthModule --> IngestRouter
    
    IngestRouter -->|Save Source File| StagingStorage
    IngestRouter -->|Persist Metadata| RelationalDB
    IngestRouter -->|Enqueue Job| RedisQueue

    RedisQueue -->|Pull Ingest Task| WorkerPreprocess
    WorkerPreprocess -->|Extract Audio / 480p Sample| StagingStorage
    WorkerPreprocess -->|Dispatch to AI| GeminiOrchestrator

    GeminiOrchestrator -->|Inference via Multimodal| GoogleGemini[Google Gemini API]
    GoogleGemini -->|Structured JSON Output| GeminiOrchestrator
    GeminiOrchestrator -->|Store Clips Metadata| RelationalDB
    GeminiOrchestrator -->|Enqueue Render Jobs| RedisQueue

    RedisQueue -->|Pull Clip Render Task| WorkerRender
    WorkerRender -->|Read Source & Stream| StagingStorage
    WorkerRender -->|Execute Filtergraph| FFmpegEngine[FFmpeg 6.0+ Engine]
    FFmpegEngine -->|Burn Subtitles & Auto-Crop| WorkerRender
    WorkerRender -->|Upload Rendered Clip| ObjectStorage
    WorkerRender -->|Update Status & URL| RelationalDB
    WorkerRender -->|Emit Webhook Event| ExtWebhook
```

---

## 3. End-to-End Execution Sequence Diagram

Berikut adalah alur perjalanan video dari masukan mentah hingga klip siap unduh:

```mermaid
sequenceDiagram
    autonumber
    actor User as Content Creator
    participant API as API Server
    participant DB as Relational Database
    participant Queue as BullMQ (Redis)
    participant Worker as Background Worker
    participant Gemini as Google Gemini API
    participant FFmpeg as FFmpeg Binary
    participant S3 as S3/Cloud Storage

    User->>API: POST /api/v1/projects (Upload video / URL)
    API->>DB: INSERT project (status: "QUEUED")
    API->>Queue: Enqueue "ingest_task" {projectId, filePath}
    API-->>User: 202 Accepted {projectId, status: "QUEUED"}

    Queue->>Worker: Consume "ingest_task"
    Worker->>DB: UPDATE project (status: "PREPROCESSING")
    Worker->>FFmpeg: ffprobe (validate codecs & duration)
    Worker->>FFmpeg: ffmpeg (extract 64kbps mono audio / downsample sample)
    
    Worker->>DB: UPDATE project (status: "INFERRING")
    Worker->>Gemini: Upload preprocessed stream (Files API)
    Worker->>Gemini: GenerateContent (Prompt + Strict JSON Schema)
    Gemini-->>Worker: Return JSON {clips: [...]}

    Worker->>Worker: Validate & Clamp Timestamps via Zod
    Worker->>DB: INSERT clips (status: "IDENTIFIED", hook_score, titles)
    Worker->>DB: UPDATE project (status: "ANALYZED")

    loop For each clip with hook_score >= 7.0
        Worker->>Queue: Enqueue "render_clip_task" {clipId, cropCoords, subtitles}
    end

    Queue->>Worker: Consume "render_clip_task"
    Worker->>DB: UPDATE clip (status: "RENDERING")
    Worker->>FFmpeg: ffmpeg -ss start -to end -filter_complex (crop + ass/subtitles)
    FFmpeg-->>Worker: Output MP4 (9:16 vertical)
    Worker->>S3: Upload clip MP4
    S3-->>Worker: Return public/signed URL
    Worker->>DB: UPDATE clip (status: "COMPLETED", media_url)

    Worker->>API: Emit clip.completed event
    API-->>User: Webhook notification / WebSocket push
```

---

## 4. Data Modeling & Database Schema (ERD)

Sistem menggunakan skema relasional terstruktur dengan indeks optimal untuk mendukung kueri status berkecepatan tinggi:

```mermaid
erDiagram
    PROJECTS ||--|| SOURCE_VIDEOS : "has one"
    PROJECTS ||--o{ CLIPS : "contains"
    CLIPS ||--o{ RENDERING_JOBS : "triggers"
    CLIPS ||--o| CLIP_METADATA : "possesses"
    PROJECTS ||--o{ AUDIT_LOGS : "records"

    PROJECTS {
        uuid id PK
        string title
        string status "QUEUED|PREPROCESSING|INFERRING|ANALYZED|COMPLETED|FAILED"
        string source_type "FILE_UPLOAD|URL"
        float total_duration_seconds
        timestamp created_at
        timestamp updated_at
    }

    SOURCE_VIDEOS {
        uuid id PK
        uuid project_id FK
        string original_filename
        string file_format
        bigint file_size_bytes
        string storage_path
        int width
        int height
        float fps
        string video_codec
        string audio_codec
    }

    CLIPS {
        uuid id PK
        uuid project_id FK
        string clip_sequence_id "clip-01"
        float timestamp_start_seconds
        float timestamp_end_seconds
        float duration_seconds
        float hook_score
        string topic
        string suggested_title
        string target_aspect_ratio "9:16|1:1|16:9"
        string status "PENDING|RENDERING|COMPLETED|FAILED"
        string rendered_media_url
        timestamp created_at
    }

    CLIP_METADATA {
        uuid id PK
        uuid clip_id FK
        float crop_focus_x "0.0 - 1.0"
        float crop_focus_y "0.0 - 1.0"
        float curiosity_score
        float emotional_score
        float actionable_score
        json transcript_words "Array of {word, start, end}"
    }

    RENDERING_JOBS {
        uuid id PK
        uuid clip_id FK
        string worker_id
        int attempt_number
        string ffmpeg_command_log
        int render_time_ms
        string error_message
        timestamp started_at
        timestamp finished_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid project_id FK
        string event_type
        string actor
        json payload
        timestamp created_at
    }
```

---

## 5. State Machine Lifecycle

Siklus hidup pemrosesan proyek dan klip dikontrol oleh Finite State Machine (FSM) yang deterministik:

```mermaid
stateDiagram-v2
    [*] --> QUEUED : Project Created

    QUEUED --> DOWNLOADING : If URL Ingestion
    DOWNLOADING --> PREPROCESSING : Download Complete
    QUEUED --> PREPROCESSING : If Local Upload

    PREPROCESSING --> INFERRING : Audio Extracted & Normalized
    PREPROCESSING --> FAILED : Invalid Media / Codec Corrupt

    INFERRING --> ANALYZED : Gemini Output Validated by Zod
    INFERRING --> FAILED : AI Rate Limit / Malformed Schema

    state ANALYZED {
        [*] --> CLIP_IDENTIFIED
        CLIP_IDENTIFIED --> RENDERING : Render Triggered
        RENDERING --> COMPLETED : FFmpeg Succeeded
        RENDERING --> FAILED_RETRYABLE : Transient Encoding Error
        FAILED_RETRYABLE --> RENDERING : Retry (Max 3x)
        FAILED_RETRYABLE --> FAILED_PERMANENT : Max Retries Exceeded
    }

    ANALYZED --> COMPLETED : All Eligible Clips Rendered
    FAILED --> [*]
    COMPLETED --> [*]
```

---

## 6. Directory Hierarchy & Codebase Structure

Struktur direktori FutureFrame menerapkan prinsip *Modular Separation of Concerns* berbasis TypeScript:

```text
future-frame/
├── .cursorrules                     # Rules & syntax standards for Cursor IDE
├── AGENT.md                         # Active mentorship directives & guardrails
├── OVERVIEW.md                      # High-level product summary & milestones
├── package.json                     # Node.js dependencies & scripts
├── tsconfig.json                    # Strict TypeScript compiler options
├── vitest.config.ts                 # Vitest test runner configuration
│
├── docs/                            # Architectural & Engineering Specifications
│   ├── PRD.md                       # Product Requirements & Feature Specs
│   ├── ARCHITECTURE.md              # System Architecture & Diagrams (This file)
│   ├── INTEGRATION.md               # API Contracts, Payloads & Webhooks
│   ├── TESTING.md                   # Testing Standards, Mocks & CI/CD
│   └── SECURITY.md                  # Threat Modeling, Hardening & Guardrails
│
├── storage/                         # Local Storage Staging (Ignored by Git)
│   ├── staging/                     # Temp ingested raw videos
│   ├── preprocessed/                # Extracted mono audio & downsampled samples
│   └── rendered/                    # Final cropped & subtitled MP4 clips
│
├── src/                             # Source Code
│   ├── server.ts                    # HTTP API Server bootstrap entry point
│   ├── worker.ts                    # Background BullMQ worker entry point
│   │
│   ├── config/                      # Configuration & Environment Variables
│   │   ├── env.ts                   # Validated process.env via Zod
│   │   ├── redis.ts                 # Redis connection client setup
│   │   ├── gemini.ts                # Google Gen AI SDK client configuration
│   │   └── storage.ts               # Local disk & S3 storage credentials
│   │
│   ├── core/                        # Core Shared Domain Logic & Contracts
│   │   ├── errors/                  # Custom Typed Error Classes
│   │   │   ├── AppError.ts
│   │   │   ├── IngestError.ts
│   │   │   ├── InferenceError.ts
│   │   │   └── RenderError.ts
│   │   ├── schemas/                 # Zod Schemas (Single Source of Truth)
│   │   │   ├── project.schema.ts
│   │   │   ├── clip.schema.ts
│   │   │   └── gemini-response.schema.ts
│   │   └── types/                   # Reusable TypeScript interfaces & types
│   │
│   ├── modules/                     # Modular Business Domains
│   │   ├── ingest/                  # 1. Video Ingestion Domain
│   │   │   ├── ingest.controller.ts # Route handlers for upload & URLs
│   │   │   ├── ingest.service.ts    # File persistence & metadata probing
│   │   │   └── video-probe.ts       # FFprobe wrapper for stream discovery
│   │   │
│   │   ├── preprocessor/            # 2. Audio & Downsampling Pipeline
│   │   │   ├── preprocessor.service.ts
│   │   │   └── audio-extractor.ts   # FFmpeg audio normalization (mono AAC)
│   │   │
│   │   ├── agent/                   # 3. Gemini Multimodal Extraction Domain
│   │   │   ├── agent.service.ts     # Ingest to Files API & model orchestration
│   │   │   ├── prompt-builder.ts    # Strict system instructions & XML isolation
│   │   │   └── hook-evaluator.ts    # Scoring matrix (Curiosity, Emotion, Insight)
│   │   │
│   │   ├── clipping/                # 4. Temporal Boundary & Reframing Domain
│   │   │   ├── boundary-clamper.ts  # Padding, min/max length validation
│   │   │   └── coordinate-math.ts   # 16:9 to 9:16 crop calculation formulas
│   │   │
│   │   └── render/                  # 5. FFmpeg Execution Node Domain
│   │   │   ├── render.service.ts    # Orchestrate filtergraph execution
│   │   │   ├── filtergraph-builder.ts # Construct safe FFmpeg filter strings
│   │   │   ├── subtitle-burner.ts   # ASS/SRT caption generator & overlay
│   │   │   └── ffmpeg-process.ts    # Safe execFile wrapper with args array
│   │
│   ├── queue/                       # Asynchronous Task Queue Infrastructure
│   │   ├── queue.manager.ts         # BullMQ queue instantiations
│   │   ├── jobs/                    # Job definitions & payload interfaces
│   │   │   ├── ingest.job.ts
│   │   │   ├── inference.job.ts
│   │   │   └── render.job.ts
│   │   └── workers/                 # Worker task processor functions
│   │
│   └── utils/                       # Common Utilities & Helpers
│       ├── logger.ts                # Structured JSON Logger (Pino)
│       ├── time-converter.ts        # Timestamp parser (HH:MM:SS.mmm to seconds)
│       └── file-cleaner.ts          # Temp artifact shredder & disk scrubber
│
└── tests/                           # Automated Test Suites
    ├── fixtures/                    # Mock JSON responses & 5s test videos
    ├── unit/                        # Pure unit tests (Math, Zod, Parsers)
    ├── integration/                 # Integrated tests with mocked APIs
    └── e2e/                         # End-to-end pipeline verification
```
