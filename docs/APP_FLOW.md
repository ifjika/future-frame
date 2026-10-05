# Application Flow & User Journey Specification (APP_FLOW)
# FutureFrame (FF-Frame)
> **Autonomous Video Clipping & Semantic Temporal Extraction Agent**  
> *Author: Future Foundation Product & UX Team*  
> *Version: 1.0.0 | Status: Active Specification*

---

## 1. End-to-End User Journey Overview

Alur interaksi pengguna dengan FutureFrame Studio dirancang secara intuitif melalui 4 tahapan utama:

```mermaid
flowchart LR
    A[1. Media Ingestion] --> B[2. AI Semantic Inspection]
    B --> C[3. Studio Review & Framing]
    C --> D[4. Render & Distribution]
```

1. **Media Ingestion:** Pengguna mengunggah video lokal (drag & drop) atau memasukkan URL video (YouTube, Google Drive, direct MP4).
2. **AI Semantic Inspection:** Sistem memproses video, mengekstraksi audio mono, dan menginstruksikan Gemini untuk mengidentifikasi momen berdaya pikat tinggi (*viral hooks*).
3. **Studio Review & Framing:** Pengguna memeriksa kartu klip yang ditemukan, meninjau pratinjau vertikal 9:16, menyesuaikan titik fokus pembicara (*speaker tracking*), dan memilih gaya takarir.
4. **Render & Distribution:** Pengguna memicu perenderan satu klip atau batch klip, memantau progres secara real-time, dan mengunduh hasil akhir MP4.

---

## 2. Detailed Functional Flowchart

```mermaid
flowchart TD
    Start([Pengguna Membuka FutureFrame Studio]) --> IngestChoice{Metode Masukan?}

    %% Step 1: Ingestion
    IngestChoice -->|Local Upload| UploadFile[Pilih / Drag File MP4/MOV]
    IngestChoice -->|Public URL| InputURL[Input URL Video Publik]
    UploadFile --> ClientProbe[Validasi Klien: Format & Ukuran <= 3GB]
    InputURL --> ServerProbe[Server Mendownload Head & Validasi Durasi]
    ClientProbe --> UploadStaging[Upload ke Staging Server]
    ServerProbe --> DownloadStaging[Download Stream ke Staging]

    %% Step 2: Processing Pipeline
    UploadStaging & DownloadStaging --> JobQueued[Proyek Dibuat: Status QUEUED]
    JobQueued --> Preprocess[Worker Preprocessing: FFprobe Codec Check + Extract Audio Mono 64k]
    Preprocess --> GeminiUpload[Upload Audio ke Gemini Files API]
    GeminiUpload --> GeminiInference[Gemini Multimodal: Hook Detection & Temporal Extraction]
    
    GeminiInference --> SchemaCheck{Skema JSON Valid?}
    SchemaCheck -->|Tidak| RetryInference[Retry Gemini dengan Fallback Model]
    RetryInference --> GeminiInference
    SchemaCheck -->|Ya| ZodValidate[Zod Validation & Timestamp Clamping]

    %% Step 3: Studio Review
    ZodValidate --> ClipsReady[Status ANALYZED: Tampilkan Klip di Studio]
    ClipsReady --> UserReview[Pengguna Memeriksa Daftar Klip]
    UserReview --> AdjustFraming[Penyesuaian Opsional: Crop Coordinate x & Subtitle Style]

    %% Step 4: Rendering & Download
    AdjustFraming --> TriggerRender{Pilih Render}
    TriggerRender -->|Auto Render| RenderAll[Kirim Seluruh Klip Score >= 8.0 ke Queue]
    TriggerRender -->|Manual Selection| RenderSelected[Kirim Klip Terpilih ke Queue]

    RenderAll & RenderSelected --> FFmpegRender[FFmpeg Worker: 9:16 Crop + Karaoke Subtitles]
    FFmpegRender --> S3Upload[Upload Klip ke S3 Storage]
    S3Upload --> GenerateSignedURL[Generate Presigned URL Unduhan]
    GenerateSignedURL --> ReadyToDownload([Status COMPLETED: Unduh MP4 Siap Publikasi])
```

---

## 3. Interactive State Machine (FSM)

Siklus status proyek dan klip dimodelkan dalam diagram status deterministik:

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Form Ingestion Dibuka
    DRAFT --> QUEUED : File Terunggah / URL Valid
    
    state QUEUED {
        [*] --> WAITING_WORKER
        WAITING_WORKER --> DOWNLOADING : If Remote URL
        DOWNLOADING --> PREPROCESSING : Download Finish
        WAITING_WORKER --> PREPROCESSING : If Local File
    }

    PREPROCESSING --> INFERRING : Audio Extracted
    PREPROCESSING --> FAILED : Codec Rusak / Media Corrupt

    state INFERRING {
        [*] --> GEMINI_DISPATCH
        GEMINI_DISPATCH --> WAITING_AI_RESPONSE
        WAITING_AI_RESPONSE --> VALIDATING_SCHEMA
    }

    INFERRING --> ANALYZED : Zod Validation Passed
    INFERRING --> FAILED : AI Rate Limit Exhausted / Malformed Output

    state ANALYZED {
        [*] --> CLIPS_IDENTIFIED
        CLIPS_IDENTIFIED --> RENDERING : Render Triggered
        RENDERING --> COMPLETED : FFmpeg Berhasil
        RENDERING --> RETRYING : Subprocess Glitch (Max 3x)
        RETRYING --> RENDERING
        RETRYING --> FAILED_CLIP : Max Retries Exceeded
    }

    ANALYZED --> COMPLETED : Seluruh Klip Terpilih Selesai
    FAILED --> [*] : Notifikasi Error ke Pengguna
    COMPLETED --> [*] : Siap Diunduh
```

---

## 4. UI States & UX Feedback Loops

Untuk menjaga transparansi sistem dan mencegah pengguna merasa aplikasi macet (*hanging*), sistem menyediakan visualisasi status yang komprehensif:

| Tahapan Sistem | State UI | Indikator Visual & Komponen | Umpan Balik Pengguna (Feedback Loop) |
| :--- | :--- | :--- | :--- |
| **Ingestion** | `UPLOADING` | Progress bar persentase biner upload + file size indicator. | Pengguna dapat membatalkan upload (*Cancel Ingest*). |
| **Preprocessing** | `EXTRACTING` | Indeterminate neon shimmer animation + teks *"Mengoptimalkan stream audio untuk AI..."*. | Mencegah kebingungan saat video berukuran besar sedang diurai. |
| **Gemini Inference** | `INFERRING` | Animasi radar semantik + estimasi waktu tersisa (*"Menganalisis retensi semantik video... ~30s"*). | Memberikan informasi tahapan kognitif AI yang sedang berlangsung. |
| **Review Studio** | `ANALYZED` | Grid kartu klip, badge skor viral (Gold/Violet/Cyan), scrubber audio, pratinjau 9:16 live. | Pengguna dapat memutar preview audio/video klip secara instan. |
| **Rendering** | `RENDERING` | Progress spinner per kartu klip + log waktu render (*"Rendering 9:16 & Subtitle... 60%"*). | Pengguna dapat meninggalkan halaman; sistem mengirimkan webhook / browser push notification. |
| **Completed** | `COMPLETED` | Tombol *"Download MP4"* aktif (hijau menyala) + opsi *"Copy Share Link"*. | Klip siap diputar atau diunduh langsung. |
| **Failed** | `FAILED` | Banner error merah dengan kode kesalahan terstruktur + tombol *"Coba Ulang (Retry)"*. | Menyajikan alasan kegagalan yang manusiawi (misal: audio tidak terdeteksi atau file korup). |

---

## 5. Error Recovery Pathways

1. **Jalur Pemulihan Kegagalan Jaringan Ingest:**
   * Jika koneksi terputus saat upload multipart, klien mendukung *resumable chunk upload* (TUS protocol atau S3 multipart upload) untuk melanjutkan tanpa mengulang dari 0%.
2. **Jalur Pemulihan AI Rate Limit (HTTP 429):**
   * Antrean BullMQ secara otomatis menahan eksekusi (*exponential backoff* dengan penundaan 10s, 30s, 60s) dan mencoba kembali secara transparan tanpa mengubah status UI menjadi failed.
3. **Jalur Pemulihan FFmpeg Crash:**
   * Jika rendering klip individual gagal (misal: kehabisan memori sementara), hanya klip tersebut yang ditandai `FAILED_CLIP` dengan tombol *"Re-render Klip"*, sementara klip lainnya pada proyek yang sama tetap berjalan normal (*Fault Isolation*).
