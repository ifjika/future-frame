# Product Requirements Document (PRD)
# FutureFrame (FF-Frame)
> **Autonomous Video Clipping & Semantic Temporal Extraction Agent**  
> *Author: Future Foundation Research & Engineering Team*  
> *Version: 1.1.0 | Status: Approved Specification*

---

## 1. Executive Summary & Problem Statement

### 1.1 Problem Statement
Dalam era konsumsi video mikro (*short-form content* seperti TikTok, Instagram Reels, dan YouTube Shorts), kreator konten, podcaster, dan agensi media menghadapi tantangan operasional signifikan dalam mendaur ulang konten video panjang (*long-form*, 30–120 menit). Proses manual membutuhkan:
* 4–8 jam untuk menonton ulang, menandai kutipan menarik, dan mencatat stempel waktu (*timestamps*).
* Rekonversi manual dari rasio aspek horizontal (16:9) ke format vertikal (9:16) dengan pelacakan pembicara aktif (*speaker tracking*).
* Pembuatan takarir dinamis (*dynamic word-level subtitles*) yang memakan waktu.

Inefisiensi ini menyebabkan biaya kurasi tinggi, lambatnya distribusi konten, dan hilangnya momentum viralitas.

### 1.2 Product Vision
**FutureFrame** adalah platform AI Agent otonom yang mentransformasikan video panjang menjadi beberapa klip pendek bernilai tinggi (*high-signal micro-content*) secara otomatis dan deterministik. Mengintegrasikan model **Google Gemini Multimodal** dipadukan dengan **automated FFmpeg rendering pipeline**, FutureFrame mengekstraksi klip, melakukan *smart reframing*, membakar subtitle dinamis, dan menghasilkan metadata siap publikasi tanpa intervensi manual yang membosankan.

---

## 2. Product Goals & Scope Boundaries

### 2.1 Goals (In-Scope)
* **Autonomous Semantic Extraction:** Menganalisis stream audio-visual secara utuh untuk mendeteksi segmen berdaya retensi tinggi (*viral hooks*) dengan akurasi temporal presisi.
* **Deterministic Structured Output:** Menghasilkan metadata klip (skor hook, judul rekomendasi, rasio aspek, koordinat crop) dalam format skema JSON yang tervalidasi.
* **Smart Reframing (16:9 ➔ 9:16):** Mengonversi orientasi horizontal menjadi vertikal dengan penentuan titik fokus pembicara aktif (*speaker-centric auto-crop*).
* **Automated Dynamic Captions:** Menghasilkan subtitle tersinkronisasi per kata (*word-level timing*) dengan gaya visual modern.
* **Scalable Background Processing:** Mampu memproses antrean video panjang secara paralel tanpa membebani server utama.

### 2.2 Non-Goals (Out of Scope for v1.0)
* **Bukan Non-Linear Video Editor (NLE) Penuh:** Tidak menyediakan timeline editing manual dengan multi-track VFX, stiker dinamis kompleks, atau transisi 3D sinematik.
* **Bukan Platform Social Auto-Publishing:** Integrasi langsung posting ke akun TikTok/Instagram pengguna ditunda ke Phase 4.
* **Tidak Mendukung Video Non-Standar:** Batas durasi masukan maksimal 120 menit dan ukuran file maksimal 3 GB pada peluncuran perdana.

---

## 3. Target User Personas

| Persona | Profil & Kebutuhan | Pain Point Utama |
| :--- | :--- | :--- |
| **Budi – Podcaster & Independent Creator** | Menghasilkan podcast video mingguan 60 menit. Membutuhkan 5–10 klip TikTok/Reels setiap episode. | Kehabisan waktu untuk kurasi manual; tidak memiliki tim editor video khusus. |
| **Siti – Head of Content Marketing Agency** | Mengelola 15+ akun media sosial klien korporat dengan webinar dan sesi tanya-jawab mingguan. | Biaya operasional editor tinggi; lambat merespons tren konten segar. |
| **Rama – Event & Conference Producer** | Merekam seminar seharian (multi-session). Perlu highlights cepat untuk publikasi pasca-acara. | Sulit menemukan kutipan tajam dari pembicara tanpa menonton seluruh rekaman. |

---

## 4. User Stories & Acceptance Criteria

### US-1: Ingestion Video dari File Lokal atau URL
* **Sebagai:** Konten kreator.
* **Saya ingin:** Mengunggah file video (MP4/MOV) atau menyematkan URL video langsung.
* **Agar:** Sistem dapat segera memproses video tanpa konversi format manual di pihak saya.
* **Acceptance Criteria (Gherkin):**
  * *Given* file video valid berformat `.mp4`, `.mov`, atau `.mkv` dengan ukuran ≤ 3 GB dan durasi ≤ 120 menit.
  * *When* pengguna mengirimkan request ingest via Web Studio atau API.
  * *Then* sistem memvalidasi integritas file via FFprobe, membuat `project_id` baru, dan mengembalikan status `QUEUED` dalam waktu < 5 detik.

### US-2: Ekstraksi Temporal Berbasis AI Multimodal
* **Sebagai:** Content strategist.
* **Saya ingin:** AI memindai video dan menandai bagian-bagian paling menarik beserta alasan kurasinya.
* **Agar:** Saya mendapatkan klip berkualitas tinggi yang berpotensi memikat audiens.
* **Acceptance Criteria (Gherkin):**
  * *Given* video telah selesai di-preprocess dan diunggah ke Gemini Files API.
  * *When* Gemini Multimodal Agent mengeksekusi inferensi semantik.
  * *Then* sistem mengembalikan daftar klip dengan durasi antara 15–90 detik, lengkap dengan `timestamp_start`, `timestamp_end`, `hook_score` (1.0–10.0), dan rekomendasi judul.

### US-3: Smart Reframing Otomatis (16:9 ke 9:16)
* **Sebagai:** Social media specialist.
* **Saya ingin:** Klip horizontal dipotong menjadi format vertikal yang selalu memfokuskan pembicara di tengah.
* **Agar:** Klip tampak alami dan profesional di layar smartphone vertikal.
* **Acceptance Criteria (Gherkin):**
  * *Given* klip terpilih dengan rekomendasi orientasi `9:16`.
  * *When* pipeline FFmpeg merender klip.
  * *Then* video dipotong sesuai `crop_focus_coordinates` tanpa distorsi aspek rasio, menjaga wajah pembicara tetap berada dalam *safe zone* vertikal.

### US-4: Dynamic Captions & Subtitle Burn-In
* **Sebagai:** Penonton platform mobile yang sering menonton tanpa suara (*muted*).
* **Saya ingin:** Video menampilkan takarir dinamis kata-per-kata yang jelas dan estetis.
* **Agar:** Pesan dalam video dapat dipahami dengan mudah dan retensi tonton meningkat.
* **Acceptance Criteria (Gherkin):**
  * *Given* transkrip audio dengan stempel waktu per kata (*word-level timing*).
  * *When* proses render klip dijalankan dengan opsi `burn_subtitles: true`.
  * *Then* subtitle terbakar langsung pada video (Hardsub) dengan font kontras tinggi, penanda kata aktif (*karaoke highlight*), dan bebas dari artefak visual.

### US-5: Ekspor dan Unduhan Deterministik
* **Sebagai:** Pengguna sistem.
* **Saya ingin:** Mengunduh klip individual atau seluruh klip sekaligus dalam format MP4 standar industri.
* **Agar:** Klip dapat langsung didistribusikan ke berbagai kanal media sosial.
* **Acceptance Criteria (Gherkin):**
  * *Given* status klip adalah `COMPLETED`.
  * *When* pengguna mengakses tombol unduh atau link penyimpanan bertanda tangan (*presigned URL*).
  * *Then* file terunduh berupa MP4 (H.264 video, AAC audio) yang dapat diputar sempurna di iOS, Android, dan desktop.

---

## 5. Core Business Logic & Feature Specifications

### 5.1 Ingestion Gate & Cost-Efficiency Pre-processing
* Menerima payload file biner multipart atau link publik HTTP/HTTPS.
* Sebelum video utuh dikirim ke AI API, sistem menjalankan pre-processing untuk mengekstraksi stream audio mono berkualitas 64 kbps atau downsampling video ke resolusi 480p pada 1 fps.
* Mengurangi konsumsi token dan bandwidth hingga 70% dengan mempertahankan kualitas konteks semantik.

### 5.2 Hook Scoring Matrix & Prioritisasi
Klip dinilai berdasarkan 3 dimensi inti (skala total 1.0 – 10.0):
1. **Curiosity Gap (Bobot 40%):** Seberapa kuat 3–5 detik pertama memicu rasa ingin tahu audiens.
2. **Emotional Resonance (Bobot 30%):** Tingkat intensitas emosi, tawa, keterkejutan, atau perdebatan dalam segmen.
3. **Actionable Insight / Clarity (Bobot 30%):** Kejelasan pesan, kesimpulan bernilai, atau solusi konkret yang disampaikan pembicara.

Hanya klip dengan skor gabungan $\ge 7.0$ yang ditandai untuk rendering otomatis secara default. Detail rumus matematis dapat dilihat pada [TSD.md](file:///d:/projects/future-frame/docs/TSD.md).

### 5.3 Batch Rendering & Job Management
* Pengguna dapat memilih untuk merender seluruh klip yang lolos ambang batas skor (*auto-render*) atau memilih klip tertentu secara manual.
* Antrean render dikelola secara terdistribusi dan dapat diulang (*retryable*) jika terjadi interupsi jaringan.

---

## 6. Non-Functional Requirements (NFR)

* **Performance & Latency:**
  * Ingestion & Audio Extraction: < 2 menit untuk video berdurasi 60 menit.
  * Gemini Multimodal Inference: < 45 detik untuk video berdurasi 60 menit.
  * FFmpeg Segment Rendering: Render per klip 60 detik < 15 detik (dengan hardware acceleration).
* **Availability & Reliability:**
  * Ketersediaan service target 99.5%.
  * Antrean tugas idempotent; kegagalan satu worker tidak menyebabkan pemrosesan ganda.
* **Data Retention & Privacy:**
  * File video sementara di staging server otomatis dihapus setelah 24 jam.
  * Presigned URL kedaluwarsa setelah 3600 detik (1 jam).

---

## 7. Cross-Document References

* Detail formulasi matematis, kalkulasi koordinat crop, dan konfigurasi filtergraph FFmpeg diatur pada [TSD.md](file:///d:/projects/future-frame/docs/TSD.md).
* Pedoman desain antarmuka, token visual, dan komponen UI diatur pada [DESIGN_SYSTEM.md](file:///d:/projects/future-frame/docs/DESIGN_SYSTEM.md).
* Diagram arsitektur dan pemodelan database diatur pada [ARCHITECTURE.md](file:///d:/projects/future-frame/docs/ARCHITECTURE.md).
* Alur pengguna dan diagram state machine diatur pada [APP_FLOW.md](file:///d:/projects/future-frame/docs/APP_FLOW.md).
