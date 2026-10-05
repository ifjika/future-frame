# Engineering Implementation Plan (IMPLEMENTATION_PLAN)
# FutureFrame (FF-Frame)
> **Autonomous Video Clipping & Semantic Temporal Extraction Agent**  
> *Author: Future Foundation Research & Engineering Team*  
> *Version: 1.0.0 | Status: Active Delivery Roadmap*

---

## 1. Phased Delivery Roadmap Overview

Proyek FutureFrame dipecah menjadi 5 sprint bertahap untuk memastikan setiap blok fungsional diverifikasi secara independen sebelum integrasi lanjutan:

```text
Sprint 1: Media Ingest & Preprocessing Foundation (Week 1)
   └── Validasi FFprobe, stream audio extraction (mono 64k), storage staging

Sprint 2: Gemini Multimodal Agent & Schema Enforcement (Week 2)
   └── Integrasi Files API, prompt template dengan XML isolation, Zod validation

Sprint 3: FFmpeg Execution Engine, Smart Crop & Subtitles (Week 3)
   └── Algoritma reframing 9:16, subtitle styler ASS/Karaoke, hardware rendering

Sprint 4: Distributed Job Queue & Webhook Infrastructure (Week 4)
   └── BullMQ + Redis, worker concurrency gate, idempotency, event webhooks

Sprint 5: FutureFrame Studio Web UI & Telemetry Dashboard (Week 5)
   └── Design system implementation, 9:16 video framer, metric monitoring
```

---

## 2. Sprint-by-Sprint Breakdown

### Sprint 1: Media Ingest & Preprocessing Foundation
* **Tujuan Utama:** Menghadirkan fondasi I/O media yang aman, deterministik, dan efisien biaya.
* **Tasks:**
  * [x] Setup proyek TypeScript strict mode (`tsconfig.json`, `package.json`, dual entry points `src/server.ts` & `src/worker.ts`).
  * [x] Implementasi modul `video-probe.ts` untuk membaca resolusi, durasi, dan codec via FFprobe (beserta hierarki `AppError` & `video-probe.schema.ts`).
  * [ ] Implementasi modul `audio-extractor.ts` untuk downsampling track audio mono 64 kbps mono AAC.
  * [ ] Setup direktori staging `./storage/` dengan skrip auto-cleaner (`file-cleaner.ts`) untuk menghapus file kedaluwarsa.
* **Prasyarat & Masukan:** FFmpeg 6.0+ terpasang pada host / container.
* **Definition of Done (DoD):**
  * Video berdurasi 60 menit berhasil diekstraksi audionya dalam waktu < 45 detik.
  * Unit test untuk sanitasi argumen FFmpeg lolos 100%.

---

### Sprint 2: Gemini Multimodal Agent & Schema Enforcement
* **Tujuan Utama:** Menghubungkan engine ekstraksi semantik dengan Google Gemini API menggunakan kontrak JSON yang ketat.
* **Tasks:**
  * [ ] Konfigurasi SDK `@google/genai` dengan kredensial aman dari environment variable.
  * [ ] Implementasi pipeline upload audio preprocessed ke Gemini Files API.
  * [ ] Perancangan prompt sistem deklaratif dengan isolasi boundary XML `<untrusted_audio_stream>`.
  * [ ] Registrasi JSON Schema terstruktur pada API Gemini dan validasi runtime via Zod (`gemini-response.schema.ts`).
  * [ ] Implementasi formulasi skor hook ($Curiosity \times 0.4 + Emotion \times 0.3 + Actionable \times 0.3$).
* **Prasyarat & Masukan:** Sprint 1 selesai; file audio mono tersedia dari staging.
* **Definition of Done (DoD):**
  * Respons model Gemini selalu lolos validasi Zod tanpa exception *schema mismatch*.
  * Waktu inferensi < 45 detik untuk audio video 60 menit.

---

### Sprint 3: FFmpeg Execution Engine, Smart Crop & Subtitles
* **Tujuan Utama:** Memotong video secara deterministik, mengubah orientasi ke 9:16, dan membakar subtitle dinamis.
* **Tasks:**
  * [ ] Implementasi algoritma koordinat $X_{crop}$ dengan padding silang dan batasan piksel aman ([TSD.md](file:///d:/projects/future-frame/docs/TSD.md)).
  * [ ] Implementasi filtergraph builder untuk cropping vertikal (16:9 ke 9:16) via `execFile` terparameterisasi.
  * [ ] Pembuatan generator subtitle Advanced SubStation Alpha (`.ass`) dengan gaya highlight kata aktif (Karaoke Yellow).
  * [ ] Integrasi akselerasi hardware NVENC / VAAPI untuk eksekusi render cepat.
* **Prasyarat & Masukan:** Sprint 2 selesai; daftar stempel waktu dan koordinat crop tersedia.
* **Definition of Done (DoD):**
  * Klip 60 detik berhasil dirender dalam format MP4 (H.264/AAC) dalam waktu < 15 detik.
  * Subtitle terbakar sempurna tanpa distorsi rasio aspek.

---

### Sprint 4: Distributed Job Queue & Webhook Infrastructure
* **Tujuan Utama:** Mengelola skalabilitas pemrosesan video paralel tanpa membebani thread HTTP server.
* **Tasks:**
  * [ ] Setup antrean BullMQ dengan backend Redis 7.x (`ingestQueue`, `renderQueue`).
  * [ ] Implementasi worker pool dengan *concurrency limit* (maksimal 2–4 job render simultan per worker).
  * [ ] Mekanisme retry otomatis dengan *exponential backoff* untuk menangani kegagalan sementara.
  * [ ] Implementasi dispatcher webhook dengan enkripsi signature HMAC-SHA256 pada header `X-FutureFrame-Signature`.
* **Prasyarat & Masukan:** Sprint 1, 2, dan 3 selesai; Redis server aktif.
* **Definition of Done (DoD):**
  * Server HTTP mampu menerima 50 request proyek simultan tanpa mengalami *event loop blockage*.
  * Webhook terkirim deterministik ke consumer mock.

---

### Sprint 5: FutureFrame Studio Web UI & Telemetry Dashboard
* **Tujuan Utama:** Membangun antarmuka studio visual yang elegan untuk kurasi dan pratinjau klip.
* **Tasks:**
  * [ ] Implementasi token desain [DESIGN_SYSTEM.md](file:///d:/projects/future-frame/docs/DESIGN_SYSTEM.md) (dark mode, glassmorphism card, glowing badges).
  * [ ] Komponen pratinjau video 9:16 interaktif dengan overlay safe-zone media sosial.
  * [ ] Scrubber audio interaktif dengan visualisasi skor viral (Gold/Violet/Cyan).
  * [ ] Telemetry dashboard untuk memantau konsumsi token Gemini, waktu render worker, dan antrean tugas aktif.
* **Prasyarat & Masukan:** API RESTful & WebSocket dari Sprint 4 siap dikonsumsi.
* **Definition of Done (DoD):**
  * Antarmuka responsif dan lulus pengujian visual pada resolusi mobile, tablet, dan desktop.

---

## 3. Risk Management & Technical Mitigation Matrix

| Risiko Teknis | Probabilitas | Dampak | Strategi Mitigasi Terapan |
| :--- | :--- | :--- | :--- |
| **Batas Kuota Gemini (Rate Limit 429)** | Sedang | Tinggi | Terapkan exponential backoff dengan jitter di BullMQ, serta opsi model fallback (Gemini 2.0 Flash ➔ Gemini 1.5 Flash). |
| **Out-of-Memory (OOM) pada Worker FFmpeg** | Sedang | Kritis | Batasi concurrency worker (maksimal 2 proses render aktif per container) dan tetapkan memory limit Docker 4GB. |
| **Kapasitas Disk Staging Penuh** | Rendah | Tinggi | Skrip pembersih cron otomatis menghapus file mentah setelah status `COMPLETED` atau jika usia file > 24 jam. |
| **Injeksi Perintah Shell via Metadata Video** | Rendah | Bencana (RCE) | Seluruh pemanggilan FFmpeg wajib menggunakan `execFile` dengan array argumen statis terpisah; dilarang menggunakan shell string. |
| **Prompt Injection Audio** | Rendah | Sedang | Isolasi transkrip di dalam blok tag XML `<untrusted_audio_stream>` dan kunci output hanya melalui Zod JSON Schema. |

---

## 4. Overall Definition of Done (DoD) Criteria

Sebelum setiap modul dinyatakan selesai (*production-ready*):
1. **Strict TypeScript:** Tidak ada penggunaan tipe `any`, tidak ada kompilasi error, dan strict mode aktif.
2. **Test Coverage:** Minimal **85% Line Coverage** dan **80% Branch Coverage** pada seluruh modul core dan services.
3. **Security Audit:** Lulus pengecekan statis linter dan audit dependensi (`npm audit` 0 vulnerability kritis/tinggi).
4. **Documentation Integrity:** Setiap perubahan API tercatat dan tersinkronisasi pada [INTEGRATION.md](file:///d:/projects/future-frame/docs/INTEGRATION.md).

---

## 5. Deployment Strategy & Scaling Evolution (< 5 Users to Commercial SaaS)

### 5.1 Phase 1: Internal Deployment (< 5 Users)
* **Pola:** Single Repository Monorepo Ramping (`src/` untuk backend engine, `web/` untuk Next.js Studio).
* **Infrastruktur:** 1 VPS Terjangkau (4 vCPU / 8 GB RAM) atau mesin lokal pengembang.
* **Orkestrasi:** Dijalankan dengan satu file `docker-compose.yml`:
  * Container 1: `web` (Next.js Studio pada port 3000).
  * Container 2: `api` (Fastify Gateway pada port 4000).
  * Container 3: `worker` (FFmpeg & Gemini Engine, CPU/NVENC hardware passthrough).
  * Container 4: `redis` (BullMQ state store).

### 5.2 Phase 2: Commercial Scale-Up Evolution (SaaS 100+ Users)
Tanpa merombak kode fondasi, sistem siap ditingkatkan skalanya secara modular:
* **Frontend:** Next.js di-deploy ke **Vercel / Cloudflare Pages** (Global Edge CDN, serverless SSR).
* **Storage:** Local staging bermigrasi ke **Cloudflare R2** ($0 Egress bandwidth fee untuk download video).
* **Compute Workers:** FFmpeg workers di-scale horizontal menggunakan **Serverless GPU / Spot Instances** (RunPod, Modal.com, atau AWS ECS Auto-Scaler) yang menyala hanya ketika ada antrean video.
* **Multi-Tenancy & Billing:** Integrasi otentikasi **Clerk / Supabase Auth** dengan proteksi IDOR dan penagihan berbasis kuota menit video via **Stripe / Midtrans**.
