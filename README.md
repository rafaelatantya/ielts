# IELTS Local-First AI Study Platform

A browser-native, **local-first** IELTS preparation web application covering **Speaking, Writing, Reading, and Listening** with **100% client-side WASM/ONNX auto-scoring**, a **pre-generated curated Question Bank**, deterministic offline backup/restore, and optional zero-cost multi-device sync via **Google OAuth + Cloudflare Edge (Pages, Workers, D1, R2)**.

📄 **[Read the Full System Design & Ultra Megaplan (`megaplan.md`)](./megaplan.md)**

---

## Key Architectural Highlights

- **Pre-Generated Curated Question Bank (Zero On-Device Generative LLM)**:
  - All Speaking Part 1/2/3 prompts, follow-up trees, Writing Task 1/2 prompts, Reading passages, Listening scripts, and Band 7.0/8.0/9.0 model answers are **pre-generated and curated offline** — eliminating small-LLM hallucinations and $800\text{ MB+}$ VRAM bloat.
  - Every prompt ships with **pre-computed $384\text{-d}$ semantic anchor vectors**, **target C1/C2 collocations**, and **Task 1 chart ground-truth metadata**.
- **Two-Stage Specialist AI Scoring (`~195 MB` Total ONNX/WASM Suite + Trained QWK Calibrator)**:
  - **Stage 1 (5 Micro-Diagnostic Specialist Models)**:
    1. **Acoustic & Pause Engine**: Silero VAD v5 (`1.8 MB`) + Whisper DTW (`74 MB`) + Rust pYIN DSP (`0.4 MB`) for mid-clause hesitation pauses, $\text{WPM}$, $\text{MLR}$, semitone pitch ($\sigma_{F_0,\text{ST}}$), and rhythm ($\text{nPVI}$).
    2. **Phoneme & Pronunciation Engine**: Wav2Vec2-CTC (`32 MB`) + SpeechOcean762 GOPT (`4 MB`) for per-phoneme IPA Goodness of Pronunciation ($\text{GOP}$), word stress, and Indonesian L1 phonological transfer detection.
    3. **Grammar GED/GEC Engine**: `harper.js` WASM (`3.2 MB`) + `Flan-T5-small-GEC / DeBERTa-GED` (`55 MB`) for inline red/green grammar diffs and ERRANT error classification.
    4. **Lexical Profiler**: Bidirectional $\text{MTLD}$, Oxford CEFR ($\text{A1--C2}$) + Academic Word List SQLite lookup, and $6,500+$ Aho-Corasick collocation matcher.
    5. **Discourse Cross-Encoder**: `DeBERTa-v3-xsmall` (`25 MB`) + `bge-small-en-v1.5` (`22 MB`) for per-bullet Cue Card coverage and inter-sentence coherence.
  - **Stage 2 (Psychometric Band Calibrator)**: Ordinal LightGBM / MLP Calibrator (`0.4 MB` ONNX) trained on $10,000+$ examiner-graded IELTS samples (Quadratic Weighted Kappa loss).
- **Zero-Pain Multi-Point Model Downloader, Strict Opt-In Quota Protection & Crash-Resilient OPFS Resume**:
  - **Strict Zero Auto-Download Policy**: Models are **never** downloaded automatically on boot or silently in the background. Users explicitly trigger downloads either from the dedicated **`/features` (AI Packs) Tab** or via an **Opt-In Prompt** when entering the Speaking Lab (with a `0 MB` Lite Recording Mode + **Retroactive Scoring** once models are downloaded on Wi-Fi).
  - **Unlimited Free Multi-CDN**: Primary **HuggingFace LFS Global CDN** + Secondary **Cloudflare R2 Custom Domain with `Cache Everything` Edge Rules** (unlimited free CDN cache hits, zero egress/request cost) + Tertiary **jsDelivr CDN**.
  - **Multi-Point Range Connections + OPFS Sparse Flush**: Models are fetched across $4\text{--}6$ parallel HTTP Range streams in $4\text{ MiB}$ SHA-256-verified chunks written directly via `FileSystemSyncAccessHandle.write(chunk, { at: offset })` + `flush()`. If the user closes the browser tab or the device dies at 63%, reopening the page resumes immediately from chunk $12$ with zero lost bytes.
- **Local-First Persistence**:
  - Powered by **SQLite-WASM over OPFS (`FileSystemSyncAccessHandle`)** inside a Dedicated Web Worker.
  - Works 100% offline with zero account required.
- **Sovereign Progress Export / Import**:
  - Single-click export to `.ieltsbackup` (compact `JSON.gz`) or `.ielts-archive.zip` (SQLite binary + Opus audio recordings) with **CRDT/HLC Smart Merge** or **Snapshot Restore**.
- **Optional Google Login & Multi-Device Sync (Cloudflare Free Tier — USD 0/month)**:
  - Direct Google OAuth 2.0 / OIDC (PKCE) verified on Cloudflare Workers.
  - Conflict-free delta sync via **Hybrid Logical Clocks (HLC)** to **Cloudflare D1** and content-addressed Opus audio sync to **Cloudflare R2**.
