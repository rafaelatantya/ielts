# IELTS Local-First AI Study Platform

A browser-native, **local-first** IELTS preparation web application covering **Speaking, Writing, Reading, and Listening** with **100% client-side WASM/ONNX auto-scoring**, a **pre-generated curated Question Bank**, deterministic offline backup/restore, and optional zero-cost multi-device sync via **Google OAuth + Cloudflare Edge (Pages, Workers, D1, R2)**.

📄 **[Read the Full System Design & Ultra Megaplan (`megaplan.md`)](./megaplan.md)**

---

## Key Architectural Highlights

- **Pre-Generated Curated Question Bank (Zero On-Device Generative LLM)**:
  - All Speaking Part 1/2/3 prompts, follow-up trees, Writing Task 1/2 prompts, Reading passages, Listening scripts, and Band 7.0/8.0/9.0 model answers are **pre-generated and curated offline** — eliminating small-LLM hallucinations and $800\text{ MB+}$ VRAM bloat.
  - Every prompt ships with **pre-computed $384\text{-d}$ semantic anchor vectors**, **target C1/C2 collocations**, and **Task 1 chart ground-truth metadata**.
- **100% Client-Side Speaking Auto-Scoring (`~135 MB` Total ONNX/WASM Footprint)**:
  - **Fluency & Coherence ($B_{\text{FC}}$)**: Silero VAD v5 frame-level pause analysis (distinguishing clause-boundary pauses from mid-clause hesitation pauses), $\text{WPM}$, Articulation Rate ($\text{AR}$), Mean Length of Run ($\text{MLR}$), verbatim filler detection, and `bge-small-en-v1.5` semantic topic-relevance verification.
  - **Lexical Resource ($B_{\text{LR}}$)**: Bidirectional $\text{MTLD}$ lexical diversity, embedded CEFR ($\text{A1--C2}$) & Academic Word List profiler, and $6,500+$ idiom/collocation Aho-Corasick matcher.
  - **Grammatical Range & Accuracy ($B_{\text{GRA}}$)**: Offline `harper.js` WASM grammar checker, Error-Free Clause Ratio ($\text{EFC}$), and syntactic subordination index ($\text{SCR}$).
  - **Pronunciation ($B_{\text{P}}$)**: Whisper ONNX word-level confidence, Wav2Vec2-CTC Goodness of Pronunciation ($\text{GOP}$) with Indonesian L1 transfer detection, gender-invariant semitone pitch contour ($\sigma_{F_0,\text{ST}}$), and stress-timed rhythm ($\text{nPVI}$).
- **Local-First Persistence**:
  - Powered by **SQLite-WASM over OPFS (`FileSystemSyncAccessHandle`)** inside a Dedicated Web Worker.
  - Works 100% offline with zero account required.
- **Sovereign Progress Export / Import**:
  - Single-click export to `.ieltsbackup` (compact `JSON.gz`) or `.ielts-archive.zip` (SQLite binary + Opus audio recordings) with **CRDT/HLC Smart Merge** or **Snapshot Restore**.
- **Optional Google Login & Multi-Device Sync (Cloudflare Free Tier — USD 0/month)**:
  - Direct Google OAuth 2.0 / OIDC (PKCE) verified on Cloudflare Workers.
  - Conflict-free delta sync via **Hybrid Logical Clocks (HLC)** to **Cloudflare D1** and content-addressed Opus audio sync to **Cloudflare R2**.
