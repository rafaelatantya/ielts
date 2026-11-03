# IELTS Local-First AI Study Platform

A browser-native, **local-first** IELTS preparation web application covering **Speaking, Writing, Reading, and Listening** with **100% client-side AI/WASM auto-scoring**, deterministic offline backup/restore, and optional zero-cost multi-device sync via **Google OAuth + Cloudflare Edge (Pages, Workers, D1, R2)**.

📄 **[Read the Full System Design & Ultra Megaplan (`megaplan.md`)](./megaplan.md)**

---

## Key Highlights

- **100% Client-Side Speaking Auto-Scoring (WASM + WebGPU)**:
  - **Fluency & Coherence**: Silero VAD v5 frame-level pause analysis (distinguishing clause-boundary pauses from mid-clause hesitation pauses), WPM/Articulation Rate, Mean Length of Run (MLR), and verbatim filler/disfluency detection.
  - **Lexical Resource**: Length-invariant MTLD lexical diversity, embedded CEFR (A1–C2) & Academic Word List profiler, and 6,500+ idiom/collocation Aho-Corasick matcher.
  - **Grammatical Range & Accuracy**: Offline `harper.js` WASM grammar checker, Error-Free Clause Ratio ($\text{EFC}$), syntactic subordination index, and WebLLM (`Qwen2.5-1.5B-Instruct`) sentence rewrites.
  - **Pronunciation**: Whisper ONNX word-level confidence, Wav2Vec2-CTC Goodness of Pronunciation (GOP) with Indonesian L1 transfer detection, gender-invariant semitone pitch contour ($\sigma_{F_0,\text{ST}}$), and stress-timed rhythm ($\text{nPVI}$).
- **Local-First Persistence**:
  - Powered by **SQLite-WASM over OPFS (`FileSystemSyncAccessHandle`)** inside a Dedicated Web Worker.
  - Works 100% offline with zero account required.
- **Sovereign Progress Export / Import**:
  - Single-click export to `.ieltsbackup` (compact JSON.gz) or `.ielts-archive.zip` (SQLite binary + Opus audio recordings) with **CRDT/HLC Smart Merge** or **Snapshot Restore**.
- **Optional Google Login & Multi-Device Sync ($0 Cloudflare Free Tier)**:
  - Direct Google OAuth 2.0 / OIDC (PKCE) verified on Cloudflare Workers.
  - Conflict-free delta sync via **Hybrid Logical Clocks (HLC)** to **Cloudflare D1** and content-addressed Opus audio sync to **Cloudflare R2**.
