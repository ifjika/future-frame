# FutureFrame (FF-Frame)
> Autonomous Video Clipping & Semantic Temporal Extraction Agent  
> *An Initiative by Future Foundation*

---

## 1. Executive Summary
**FutureFrame** adalah AI Agent otonom yang dirancang untuk mengeliminasi inefisiensi manual dalam kurasi konten video berdurasi panjang (*long-form*). Mengintegrasikan kapabilitas multimodal **Google Gemini**, FutureFrame membedah audio-visual stream, mengidentifikasi segmen bernilai tinggi (*high-signal events / viral hooks*), menghasilkan metadata kontekstual, dan memotong video secara deterministik via automated rendering pipeline.

---

## 2. Core Architecture & Workflow Pipeline

Sistem dirancang dengan pola *separation of concerns* (ingest, inference, execution):

```text
[ Raw Long-form Video / URL ]
             │
             ▼
   [ 1. Ingestion Engine ]
   ├── Video Pre-processing (Downsampling / Audio Extraction)
   └── Metadata Tagging
             │
             ▼
   [ 2. Gemini Multimodal Agent ]
   ├── Semantic Understanding & Hook Detection
   ├── Retention Scoring & Context Tracing
   └── Temporal Boundary Extraction (Start/End Time)
             │
             ▼
   [ 3. Structured Data Validation ]
   └── Strict Schema Enforcement (JSON Output)
             │
             ▼
   [ 4. Execution Node (FFmpeg / Worker) ]
   ├── Stream Clipping (Zero-loss / Re-encode)
   ├── Aspect Ratio Auto-Crop (16:9 to 9:16)
   └── Subtitle Generation / Burn-in
             │
             ▼
   [ Final Output: Ready-to-Publish Micro-Content ]
```

---

## 3. Key Capabilities & Features

1. **Multimodal Deep Inspection:**
   * Menganalisis konteks pembicaraan, dinamika intonasi, dan perubahan visual secara simultan menggunakan Gemini API context window.
2. **Hook & Climax Scoring:**
   * Mengklasifikasikan setiap potongan video berdasarkan matriks: *Curiosity Gap*, *Emotional Resonance*, dan *Actionable Insight*.
3. **Smart Reframing (Dynamic Aspect Ratio):**
   * Deteksi subjek utama (*speaker tracking*) untuk konversi otomatis dari format horizontal (*16:9*) menjadi vertikal (*9:16 Reels/Shorts/TikTok*).
4. **Automated Dynamic Captions:**
   * Sinkronisasi subtitle kata-per-kata (*word-level timestamps*) dengan styling visual otomatis.

---

## 4. Technical Specifications & Vulnerability Hardening

* **Inference Engine:** Google Gemini API (mengutamakan pemanfaatan multimodal ingestion & Structured Outputs via JSON Schema).
* **CLI/Media Processing:** FFmpeg (dilengkapi stream-copy optimization dan hardware acceleration NVENC/VAAPI).
* **Security & System Hardening:**
  * **Input Sanitization:** Parameter timestamp diformat ketat sebagai integer milidetik atau float standar untuk mencegah *command injection* pada runtime FFmpeg.
  * **Adversarial Audio Guardrail:** Isolasi instruksi sistem agar tidak terdistraksi oleh audio video yang berupaya melakukan *prompt override*.
  * **Cost-Efficiency Gate:** Kompresi audio/visual awal sebelum dikirim ke Gemini guna menekan *token expenditure* tanpa mengorbankan akurasi semantik.

---

## 5. Structured Output Contract (Agent Response Schema)

Agen diinstruksikan untuk selalu mengembalikan respon deterministik dalam format skema berikut:

```json
{
  "project_id": "ff-task-uuid",
  "source_duration_seconds": 1824.5,
  "clips": [
    {
      "clip_id": "clip-01",
      "timestamp_start": "00:04:12.500",
      "timestamp_end": "00:04:58.200",
      "duration_seconds": 45.7,
      "hook_score": 9.2,
      "topic": "Analisis Moneter dan Kebijakan Suku Bunga",
      "suggested_title": "Rahasia di Balik Naiknya Suku Bunga yang Ditutupi Pasar",
      "recommended_aspect_ratio": "9:16",
      "crop_focus_coordinates": {
        "x": 0.5,
        "y": 0.5
      }
    }
  ]
}
```

---

## 6. Milestone & Delivery Roadmap

* [ ] **Phase 1: Pipeline Core (CLI & API)**
  * Setup integrasi Gemini API dengan file uploading pipeline.
  * Implementasi prompt template evaluasi video + validasi JSON Schema.
  * Eksekusi pemotongan video dasar via wrapper FFmpeg lokal.
* [ ] **Phase 2: Vision & Reframing Optimization**
  * Auto-detect pembicara aktif untuk cropping 9:16 presisi.
  * Pipeline pembuatan subtitle otomatis berbasis Whisper/Gemini transcripts.
* [ ] **Phase 3: Autonomous Queue & Distributed Workers**
  * Desain task queue (Redis/BullMQ atau Go worker pool) untuk pemrosesan paralel video panjang.
  * Dashboard monitoring utilisasi token, akurasi klip, dan rendering time.

---

## 7. Governance
Project ini dikembangkan dan dikelola di bawah standardisasi riset otomasi dan sistem kecerdasan **Future Foundation**.