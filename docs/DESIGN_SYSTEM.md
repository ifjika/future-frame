# FutureFrame Studio Design System
# Specification & UI Guidelines
> **Design Tokens, Components, Micro-Interactions & Media Aesthetics**  
> *Author: Future Foundation Design & Experience Team*  
> *Version: 1.0.0 | Status: Active Design System*

---

## 1. Design Philosophy & Aesthetic Identity

FutureFrame Studio mengusung estetika visual **High-Tech Cyber Elegance**:
* **Deep Dark Mode First:** Mengurangi kelelahan mata kreator saat kurasi video berdurasi panjang, sekaligus memberikan kontras tinggi bagi visual video.
* **Glassmorphism & Depth:** Pemanfaatan transparansi halus (*backdrop blur*), border tipis berpendar (*subtle glowing borders*), dan elevasi bertingkat untuk memisahkan fokus kontrol dari kanvas video.
* **Responsive & Alive:** Setiap komponen interaktif merespons kursor dan sentuhan pengguna dengan transisi mikro yang halus (*tactile feedback*).
* **Deterministic Layout Safe-Zones:** Panel pratinjau klip 9:16 dirancang dengan visualisasi zona aman media sosial (*TikTok/Reels overlay guides*).

---

## 2. Color Palette & Design Tokens

### 2.1 Base Surface & Neutral Tones
```css
:root {
  /* Surfaces & Backgrounds */
  --ff-bg-void: #07090E;         /* Deepest background layer */
  --ff-surface-base: #0D111A;    /* Main dashboard background */
  --ff-surface-raised: #141B27;  /* Card containers & sidebars */
  --ff-surface-glass: rgba(20, 27, 39, 0.72); /* Glassmorphic overlays */
  --ff-surface-glass-border: rgba(255, 255, 255, 0.08);

  /* Typography Colors */
  --ff-text-primary: #F8FAFC;    /* High-contrast headings & labels */
  --ff-text-secondary: #94A3B8;  /* Secondary descriptions & subtitles */
  --ff-text-muted: #64748B;      /* Timestamp meta & disabled states */
  --ff-text-inverse: #07090E;    /* Text inside high-contrast badges */
}
```

### 2.2 Brand Accents & Neon Gradients
```css
:root {
  /* Primary Cyber Cyan */
  --ff-brand-cyan: #06B6D4;
  --ff-brand-cyan-glow: rgba(6, 182, 212, 0.25);

  /* Electric Violet Accent */
  --ff-brand-violet: #8B5CF6;
  --ff-brand-violet-glow: rgba(139, 92, 246, 0.25);

  /* Status Colors */
  --ff-status-success: #10B981;  /* Completed render */
  --ff-status-warning: #F59E0B;  /* Low audio warning / processing */
  --ff-status-danger: #EF4444;   /* Pipeline failed */
  --ff-status-info: #38BDF8;     /* Ingestion in progress */
}
```

---

## 3. Typography & Scale Hierarchy

* **Primary Font Family:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
* **Heading & Display Font Family:** `'Outfit', 'Inter', sans-serif`
* **Monospace Font Family (Timestamps, Code, FFmpeg Specs):** `'JetBrains Mono', 'Fira Code', monospace`

| Tingkat (Token) | Ukuran (Font Size) | Line Height | Bobot (Weight) | Penggunaan Utama |
| :--- | :--- | :--- | :--- | :--- |
| `display-1` | 36px (2.25rem) | 1.15 | 800 (ExtraBold) | Hero headlines, Project Title |
| `heading-1` | 24px (1.5rem) | 1.25 | 700 (Bold) | Section headers, Modal titles |
| `heading-2` | 20px (1.25rem) | 1.30 | 600 (SemiBold) | Clip cards, Settings group |
| `body-base` | 15px (0.9375rem) | 1.50 | 400 (Regular) | Primary text, topic explanations |
| `body-small` | 13px (0.8125rem) | 1.45 | 500 (Medium) | Meta labels, status notifications |
| `mono-code` | 12px (0.75rem) | 1.40 | 500 (Medium) | Timestamps (`00:04:12.500`), duration |

---

## 4. Spacing, Elevation & Glassmorphism

```css
/* Glassmorphism Surface Utility */
.ff-glass-card {
  background: var(--ff-surface-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--ff-surface-glass-border);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  border-radius: 12px;
}

/* Subtle Interactive Glow on Hover */
.ff-glass-card:hover {
  border-color: rgba(6, 182, 212, 0.35);
  box-shadow: 0 12px 40px 0 rgba(6, 182, 212, 0.12);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

## 5. Domain-Specific Micro-Components

### 5.1 Hook Score Indicator Badges
Komponen lencana skor viralitas yang dikelompokkan dalam 3 tier visual:

```html
<!-- Tier 1: Gold / Viral Hook (Score 9.0 - 10.0) -->
<div class="ff-hook-badge ff-hook-gold">
  <span class="ff-hook-flame">🔥</span>
  <span class="ff-hook-score">9.2</span>
  <span class="ff-hook-label">Viral Potential</span>
</div>

<!-- Tier 2: Violet / High Signal (Score 8.0 - 8.9) -->
<div class="ff-hook-badge ff-hook-violet">
  <span class="ff-hook-icon">⚡</span>
  <span class="ff-hook-score">8.4</span>
  <span class="ff-hook-label">High Retention</span>
</div>

<!-- Tier 3: Cyan / Good Insight (Score 7.0 - 7.9) -->
<div class="ff-hook-badge ff-hook-cyan">
  <span class="ff-hook-icon">✨</span>
  <span class="ff-hook-score">7.5</span>
  <span class="ff-hook-label">Insightful</span>
</div>
```

```css
.ff-hook-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-family: var(--ff-mono-code);
  font-size: 12px;
  font-weight: 700;
}

.ff-hook-gold {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: #FBBF24;
  box-shadow: 0 0 14px rgba(245, 158, 11, 0.2);
}

.ff-hook-violet {
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.5);
  color: #C4B5FD;
}

.ff-hook-cyan {
  background: rgba(6, 182, 212, 0.15);
  border: 1px solid rgba(6, 182, 212, 0.5);
  color: #67E8F9;
}
```

---

### 5.2 9:16 Aspect Ratio Preview Framer dengan Speaker Safe-Zone
Komponen pratinjau yang menampilkan pemotongan visual dari video 16:9 menjadi 9:16 vertikal:
* **Bounding Box Crop Guide:** Garis putus-putus neon yang merefleksikan posisi horizontal $X_{crop}$.
* **Social Safe-Zone Overlay:** Menampilkan area tersembunyi yang biasanya tertutup oleh UI TikTok/Reels (tombol like di kanan, judul video di bawah) untuk memastikan wajah pembicara dan takarir tidak tertutup.

```text
┌──────────────────────────────────────────────┐
│ Horizontal 16:9 Source Video                 │
│         ┌───────────┐                        │
│         │ 9:16 Crop │                        │
│         │  Target   │                        │
│         │   (o_o)   │ ◄── Active Speaker     │
│         │  [Focus]  │                        │
│         │           │                        │
│         │ [Subtitle]│ ◄── Safe Subtitle Zone │
│         │ ░░░░░░░░░ │ ◄── TikTok Overlay UI  │
│         └───────────┘                        │
└──────────────────────────────────────────────┘
```

---

### 5.3 Dynamic Word-Level Karaoke Subtitle Styler
Pratinjau visual subtitle dinamis dengan penanda kata aktif:
```html
<div class="ff-subtitle-preview">
  <span class="ff-word ff-word-spoken">Rahasia</span>
  <span class="ff-word ff-word-spoken">kenaikan</span>
  <span class="ff-word ff-word-active">suku bunga</span>
  <span class="ff-word ff-word-pending">yang ditutupi...</span>
</div>
```

```css
.ff-subtitle-preview {
  font-family: 'Outfit', sans-serif;
  font-size: 26px;
  font-weight: 800;
  text-transform: uppercase;
  text-align: center;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.9);
}

.ff-word-spoken {
  color: #FFFFFF;
}

.ff-word-active {
  color: #FACC15; /* Active word in glowing yellow */
  transform: scale(1.12);
  display: inline-block;
  text-shadow: 0 0 16px rgba(250, 204, 21, 0.7);
  transition: transform 0.1s ease-out;
}

.ff-word-pending {
  color: rgba(255, 255, 255, 0.6);
}
```

---

## 6. Motion & Interactive Feedback Tokens

* **Fast Micro-interaction:** `150ms ease-out` (Tombol klik, hover chip).
* **Standard Transition:** `250ms cubic-bezier(0.16, 1, 0.3, 1)` (Buka accordion klip, ekspansi kartu).
* **Progress Bar Animation:** Linear pulse shimmer pada bar pemrosesan rendering klip.
