# Screen 10: AI Features & Offline Model Manager (`/features`)

> **Route**: `/features`  
> **Design System**: [`../DESIGN.md`](../DESIGN.md) — Strict Zero-Auto-Download Control Center, 19-Block SHA-256 Chunk Matrix, & OPFS Storage Inspector

---

## 1. Screen Purpose

Give the user 100% transparent, quota-safe control over all client-side WASM/ONNX AI models. **Nothing downloads automatically.** Users can inspect exact byte sizes, start/pause/resume multi-point downloads across 4–6 parallel HTTP Range connections, see which $4\text{ MiB}$ chunks are already flushed to OPFS disk, or delete models to free up space.

---

## 2. Mandatory UI Elements Checklist

### 2.1 Top Storage & Quota Protection Banner
- [ ] **Strict Zero-Auto-Download Guarantee Badge (`#EAF3EC` bg, `#166534` text)**:
  - *"Quota Guard Active: Models only download when you explicitly click Download below. All progress is saved in 4 MiB chunks to OPFS disk—if you close the browser or your device powers off, downloads resume from the exact last verified chunk."*
- [ ] **OPFS Disk Usage & Persistence Meter (`#FFFFFF`, `1px solid #E5DEC9`)**:
  - Reads `navigator.storage.estimate()` and `navigator.storage.persisted()`.
  - Segmented horizontal bar showing:
    - `SQLite DB & Study History` (e.g., `4.2 MB` in `#1E3A5F` Navy)
    - `Speaking Audio Recordings (.opus)` (e.g., `12.8 MB` in `#9A3412` Terracotta)
    - `Downloaded AI Models (ONNX/WASM)` (e.g., `82.3 MB` in `#1E4631` Forest)
    - `Free Browser Quota` (e.g., `14.8 GB Free`)
- [ ] **CDN Mirror Selector & Connection Concurrency Control**:
  - Dropdown: `Auto Multi-Mirror (HuggingFace LFS CDN + Cloudflare Edge Cache)` | `Prefer Cloudflare Edge CDN (SEA/Jakarta PoP)` | `Prefer HuggingFace Global CDN`.
  - Parallel Streams Selector: `4 Parallel Connections (Recommended)` | `6 Parallel Connections (Fast Wi-Fi)` | `1 Connection (Metered/Cellular)`.

### 2.2 Modular AI Feature Pack Cards (4 Cards in 2x2 Grid)

Each card uses the `ModelPackCard` specification from `DESIGN.md`:

#### Card 1: Tier 1 — Writing & Fast Lexical/Grammar Pack (`6.1 MB`)
- [ ] **Unlocked Features**: `harper.js` WASM grammar linter, 15,000-word Oxford CEFR + AWL SQLite lexicon, 6,500-phrase Aho-Corasick Collocation Trie, and Stage 2 LightGBM Psychometric Band Calibrator (`0.4 MB`).
- [ ] **Chunk Grid**: 2 blocks (`2 x 4 MiB`).
- [ ] **Controls**: `[Download (6.1 MB)]` / `[Ready on Disk ✓]` / `[Delete]`.

#### Card 2: Tier 2 — Speaking Core Auto-Scoring Pack (`76.2 MB` — Primary Speaking Engine)
- [ ] **Unlocked Features**: `Whisper-base.en` ONNX (verbatim transcription + word timestamps + confidence posteriors), `Silero VAD v5` ($30\text{ ms}$ pause classifier), and `Rust pYIN DSP` ($F_0$ semitone intonation & $\text{nPVI}$ rhythm).
- [ ] **19-Chunk Visual Matrix (`19 x 4 MiB` blocks)**:
  - Renders 19 small squares in a row:
    - `#E5DEC9` (Pending)
    - Pulsing `#92400E` (Actively downloading in parallel stream)
    - `#166534` (SHA-256 Verified & Flushed to OPFS via `FileSystemSyncAccessHandle.flush()`)
- [ ] **Live Telemetry Row (`JetBrains Mono`, `tabular-nums`)**:
  - `Status: Paused at 63% (12 / 19 Chunks Verified on Disk — 48.0 MB / 76.2 MB)`
  - `Speed: 14.2 MB/s (4 Streams) | ETA: 00:02`
- [ ] **Controls**: **`[⬇️ Download Pack]`**, **`[⏸ Pause]`**, **`[⏯️ Resume from 63%]`**, **`[🔍 Verify SHA-256]`**, **`[🗑️ Delete from Disk]`**.

#### Card 3: Tier 3 — Deep Phoneme GOP & Advanced Grammar GEC Pack (`116.0 MB` — Pro Diagnostics)
- [ ] **Unlocked Features**:
  - `Wav2Vec2-CTC + SpeechOcean762 GOPT` (`36 MB`) for per-phoneme IPA Goodness of Pronunciation and Indonesian L1 transfer diagnosis (`/θ/ -> /t/`, missing `-ed`/`-s`).
  - `Flan-T5-small-GEC + DeBERTa-GED` (`55 MB`) for Cambridge BEA-2019 ERRANT grammar diffs.
  - `DeBERTa-v3-xsmall Cross-Encoder` (`25 MB`) for Cue Card bullet-point coverage verification.
- [ ] **29-Chunk Visual Matrix (`29 x 4 MiB` blocks)** + independent `[Download / Pause / Resume / Delete]` controls (can also be downloaded sub-module by sub-module!).

#### Card 4: Offline AI Examiner Voice Pack (`Kokoro-82M / Opus Pack` — `80.0 MB` Optional)
- [ ] **Unlocked Features**: Natural British, Australian, and North American offline neural TTS voices for Speaking Parts 1–3 and additional Listening drills (falls back to built-in Web Speech synthesis / pre-packaged compressed clips if not downloaded).
- [ ] **20-Chunk Visual Matrix** + `[Download / Pause / Resume / Delete]` controls.
