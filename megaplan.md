# IELTS Local-First AI Study Platform — Ultra System Design & Megaplan

> **Project**: `rafaelatantya/ielts`  
> **Architecture Paradigm**: Local-First Web Application (PWA) + Client-Side WebAssembly/WebGPU AI + Optional Zero-Cost Edge Sync  
> **Target Hosting & Backend**: Cloudflare Pages + Cloudflare Workers + Cloudflare D1 + Cloudflare R2 (100% Free Tier)  
> **Auth Provider**: Google OAuth 2.0 / OpenID Connect (PKCE + FedCM)  
> **Offline Capability**: 100% functional without account or internet connection (after initial model/asset cache)

---

## Table of Contents

1. [Executive Summary & Core Architectural Tenets](#1-executive-summary--core-architectural-tenets)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [Complete Technology Stack & Runtime Requirements](#3-complete-technology-stack--runtime-requirements)
4. [IELTS Speaking Auto-Scoring Engine (WASM + WebGPU Deep Dive)](#4-ielts-speaking-auto-scoring-engine-wasm--webgpu-deep-dive)
5. [Writing, Reading, Listening & FSRS Study Modules](#5-writing-reading-listening--fsrs-study-modules)
6. [Local-First Storage Architecture & SQLite-WASM Schema](#6-local-first-storage-architecture--sqlite-wasm-schema)
7. [Deterministic Export & Import System (Backup / Restore / Merge)](#7-deterministic-export--import-system-backup--restore--merge)
8. [Google OAuth 2.0 & Multi-Device Sync Protocol (Cloudflare Edge)](#8-google-oauth-20--multi-device-sync-protocol-cloudflare-edge)
9. [Cloudflare Free-Tier Capacity Math & Cost Guardrails](#9-cloudflare-free-tier-capacity-math--cost-guardrails)
10. [Security, Privacy & Cross-Origin Isolation](#10-security-privacy--cross-origin-isolation)
11. [Repository Structure & Monorepo Layout](#11-repository-structure--monorepo-layout)
12. [Phased Implementation Roadmap & TDD Verification Plan](#12-phased-implementation-roadmap--tdd-verification-plan)

---

## 1. Executive Summary & Core Architectural Tenets

Most IELTS preparation platforms fail in one of two ways: either they are static question banks without speaking/writing evaluation, or they rely on expensive cloud GPU inference APIs (OpenAI Realtime/Whisper/GPT-4o) that force high subscription fees and break offline.

This system solves that tradeoff by moving **the entire database, audio DSP pipeline, speech recognition, prosodic analysis, grammar engine, and LLM rubric evaluator into the user's browser** via **WebAssembly (WASM)**, **WebGPU**, and the **Origin Private File System (OPFS)**.

### Core Architectural Tenets

1. **Local-First by Default (Zero-Server Dependency)**
   - A user can open the website, never log in, turn off Wi-Fi, take full Speaking, Writing, Reading, and Listening mock tests, get instant Band 0.0–9.0 diagnostic scores, and review flashcards for months.
   - All relational data lives locally in **SQLite-WASM** backed by **OPFS (`FileSystemSyncAccessHandle`)**.
2. **100% Client-Side AI Auto-Scoring**
   - **Speaking**: Audio is captured via `AudioWorklet`, segmented with **Silero VAD (ONNX WASM)**, analyzed for pitch/rhythm via **Rust/C++ DSP WASM**, transcribed with word-level timestamps and token probabilities via **Whisper ONNX (WebGPU / WASM SIMD)**, checked for phoneme accuracy via **Wav2Vec2 CTC**, and evaluated on coherence/lexical/grammar via a hybrid **Deterministic NLP + WebLLM (`Qwen2.5-1.5B-Instruct` q4f16)** pipeline.
   - **Examiner Voice**: Spoken prompts for Speaking Parts 1–3 are synthesized locally via **Kokoro-82M ONNX** or **Piper TTS WASM**.
3. **Sovereign Data Ownership (Export / Import)**
   - Users own their database. Single-click export produces either a lightweight `.ieltsbackup` JSON/CRDT bundle or a full `.ielts-archive.zip` containing the raw SQLite `.db` file and compressed `.opus` audio recordings.
   - Imports support **CRDT Smart Merge** (non-destructive union of progress) or **Full Snapshot Restore**.
4. **Optional Google Login + Multi-Device Sync on $0 Infrastructure**
   - Logging in with Google activates a background **Delta Sync Worker**.
   - Local changes are tracked via **Hybrid Logical Clocks (HLC)** in an outbox table and synced to **Cloudflare D1** (relational state) and **Cloudflare R2** (content-addressed Opus audio blobs).
   - Because all heavy compute happens on the client and the server only handles tiny JSON diffs, Cloudflare's Free Tier (100k Worker requests/day, 5 GB D1, 10 GB R2) easily supports **10,000+ Daily Active Users at $0.00/month**.

---

## 2. End-to-End System Architecture

### 2.1 High-Level Topology

```
+===================================================================================================+
|                                  USER BROWSER (CLIENT-SIDE PWA)                                   |
|  Cross-Origin Isolated: COOP: same-origin | COEP: credentialless (Unlocks SharedArrayBuffer)      |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | MAIN THREAD (UI Layer — React 19 + Vite + TanStack Router + Tailwind v4 + Zustand)          |  |
|  | - Speaking Mock Room (Part 1/2/3 Timer, Waveform Canvas, Live Transcript, Diagnostic Radar) |  |
|  | - Writing Split-Editor | Reading 3-Pane Annotator | Listening Audio Sync | FSRS Deck UI     |  |
|  +----------+------------------------+-------------------------+-----------------------+-------+  |
|             | Comlink RPC            | AudioWorklet / Port     | Comlink RPC           |          |
|             v                        v                         v                       v          |
|  +--------------------+  +-----------------------+  +-----------------------+  +---------------+  |
|  |   db.worker.ts     |  |  audio-dsp.worker.ts  |  |  ai-scorer.worker.ts  |  | sync.worker.ts|  |
|  |                    |  |                       |  |                       |  |               |  |
|  | - SQLite-WASM      |  | - 16kHz PCM Resampler |  | - Whisper-base.en     |  | - HLC Clock   |  |
|  | - OPFS SAHPool VFS |  | - Silero VAD v5 (WASM)|  |   (ONNX WebGPU/WASM)  |  | - Outbox Queue|  |
|  | - FSRS v5 Engine   |  | - YIN Pitch (F0) &    |  | - Wav2Vec2 Phoneme GOP|  | - Delta Pull/ |  |
|  | - CRDT Merge Logic |  |   nPVI Rhythm WASM    |  | - harper.js Grammar   |  |   Push Batcher|  |
|  | - ZIP Export/Import|  | - Opus WebM Encoder   |  | - CEFR/AWL Trie       |  | - R2 Blob Sync|  |
|  +---------+----------+  +-----------+-----------+  | - WebLLM Qwen2.5-1.5B |  +-------+-------+  |
|            |                         |              | - Kokoro/Piper TTS    |          |          |
|            v                         v              +-----------+-----------+          |          |
|  +--------------------------------------------------------------+                      |          |
|  |              LOCAL PERSISTENCE LAYER (BROWSER)               |                      |          |
|  | 1. OPFS (/db/ielts.sqlite3, /audio/*.opus, /exports/*.zip)   |                      |          |
|  | 2. Cache API / IndexedDB (Quantized ONNX & MLC Model Shards) |                      |          |
|  | 3. localStorage (Theme, Device ID, Last Synced HLC Watermark)|                      |          |
|  +--------------------------------------------------------------+                      |          |
+========================================================================================|==========+
                                                                                         |
                                             HTTPS (Optional — Only when Logged In & Online)
                                             1. Google OAuth 2.0 / OIDC PKCE
                                             2. Batched HLC Delta Sync (JSON + gzip)
                                             3. Content-Addressed Audio Upload (SHA-256)
                                                                                         |
                                                                                         v
+===================================================================================================+
|                              CLOUDFLARE EDGE INFRASTRUCTURE ($0 FREE TIER)                        |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  +----------------------------+     +----------------------------------------------------------+  |
|  |     Cloudflare Pages       |     |            Cloudflare Workers (Hono API)                 |  |
|  | - Static SPA Bundle        |     | - GET/POST /api/auth/google/* (JWT + JWKS Verification)  |  |
|  | - Static Question Packs    |     | - POST     /api/sync/push     (Idempotent HLC Upsert)    |  |
|  | - COOP/COEP Edge Headers   |     | - GET      /api/sync/pull     (Cursor Delta Query)       |  |
|  +----------------------------+     | - PUT/GET  /api/audio/:sha256 (Signed R2 Stream)         |  |
|                                     +---------------+------------------------------+-----------+  |
|                                                     |                              |              |
|                                                     v                              v              |
|                                     +-------------------------------+  +-----------------------+  |
|                                     |     Cloudflare D1 (SQLite)    |  |     Cloudflare R2     |  |
|                                     | - users                       |  | - /audio/{uid}/{hash} |  |
|                                     | - sync_oplog (HLC indexed)    |  |   .opus (Quota-capped |  |
|                                     | - user_snapshots              |  |   at 25MB/user)       |  |
|                                     +-------------------------------+  +-----------------------+  |
+===================================================================================================+
```

### 2.2 Multi-Worker Concurrency Model

Why isolate work into 4 dedicated Web Workers?
- **Zero UI Jank**: Running Whisper transcription or SQLite disk writes on the main thread freezes React animations and audio recording buffers.
- **Synchronous OPFS Access**: `FileSystemSyncAccessHandle` (which makes SQLite-WASM 10x faster than IndexedDB) is **only available inside Dedicated Web Workers**.
- **Memory Management**: AI models (Whisper + WebLLM) consume 300 MB – 1.2 GB of ArrayBuffer/WebGPU memory. Isolating `ai-scorer.worker.ts` allows terminating or unloading heavy model pipelines immediately after a Speaking session completes without leaking memory in the main tab.

---

## 3. Complete Technology Stack & Runtime Requirements

| Layer | Technology | Exact Package / Engine | Purpose |
| :--- | :--- | :--- | :--- |
| **UI Framework** | React 19 + TypeScript 5.8 | `react`, `vite`, `@tanstack/react-router` | Type-safe SPA routing, instant view transitions |
| **Styling & UI** | Tailwind CSS v4 + Shadcn | `tailwindcss`, `radix-ui`, `lucide-react` | Exam-authentic interfaces + accessible diagnostics |
| **State & IPC** | Zustand + Comlink | `zustand`, `comlink` | Typed proxy RPC between Main Thread and Workers |
| **Local Database** | SQLite-WASM (Official) | `@sqlite.org/sqlite-wasm` | Full relational SQL + FTS5 search over OPFS |
| **Audio Capture** | Web Audio API + Worklet | Native `AudioWorkletProcessor` + `MediaRecorder` | Simultaneous 16kHz PCM float stream + Opus file encode |
| **Voice Activity (VAD)** | Silero VAD v5 | `onnxruntime-web` (`silero_vad.onnx`, 1.8 MB) | Frame-exact speech vs silence detection (30ms frames) |
| **Prosody & Pitch DSP** | Rust -> WASM DSP module | Custom `wasm-bindgen` crate (`pitch-detection`, `rustfft`) | $F_0$ contour (pYIN), RMS energy, nPVI rhythm, HNR |
| **Speech-to-Text (ASR)** | Whisper ONNX (Transformers.js) | `@huggingface/transformers` (`whisper-base.en` q8/q4) | Verbatim transcription + word timestamps + token logprobs |
| **Phoneme Alignment** | Wav2Vec2 CTC ONNX | `Xenova/wav2vec2-lv-60-espeak-cv-ft` (quantized q8) | Phoneme Goodness of Pronunciation (GOP) scoring |
| **Examiner TTS** | Kokoro-82M / Piper WASM | `kokoro-js` or `@diffusionstudio/vits-web` | Natural offline British/Australian/US examiner voices |
| **Fast Grammar NLP** | Harper WASM + Compromise | `harper.js` (WASM) + custom dependency heuristics | Sub-50ms offline grammar, spelling, & clause segmentation |
| **On-Device LLM** | WebLLM (MLC-LLM WebGPU) | `@mlc-ai/web-llm` (`Qwen2.5-1.5B-Instruct-q4f16_1-MLC`) | Semantic coherence, Part 3 dynamic follow-ups, Band-9 rewrites |
| **Spaced Repetition** | FSRS v5 | `ts-fsrs` | State-of-the-art memory scheduling for vocabulary & errors |
| **Archive / Backup** | fflate (Streaming ZIP) | `fflate` | Zero-dependency fast ZIP/GZIP compression in Web Worker |
| **Edge API** | Cloudflare Workers + Hono | `hono`, `jose` | Lightweight edge routing, Google OIDC verification, D1/R2 |
| **Cloud Storage** | Cloudflare D1 + R2 | Serverless SQLite + S3-compatible Object Store | Free-tier cloud sync for metadata & Opus recordings |

### 3.1 Tiered Hardware Adaptation Strategy (Graceful Degradation)

Not every user has an M-series MacBook or dedicated RTX GPU. During onboarding (or first visit to the Speaking Lab), a **Hardware Capability Probe** checks `navigator.gpu` (WebGPU), `navigator.deviceMemory`, and `navigator.hardwareConcurrency`:

| Tier | Device Profile | ASR & Pronunciation | Grammar & Rubric Evaluation | Download Footprint |
| :--- | :--- | :--- | :--- | :--- |
| **Tier A (Ultra Local)** | Desktop/Laptop with WebGPU ($\ge 4\text{ GB}$ VRAM/RAM) | `whisper-small.en` (WebGPU fp16/q4) + `wav2vec2-espeak` | Deterministic NLP + **WebLLM (`Qwen2.5-1.5B` or `Llama-3.2-1B`)** | ~850 MB (cached once in IndexedDB) |
| **Tier B (Standard Local)** | Any Laptop / Modern Phone (WASM SIMD, no WebGPU or low VRAM) | `whisper-base.en` (WASM SIMD q8) + Acoustic Prosody DSP | Deterministic NLP (`harper.js` + CEFR Trie + Acoustic/Fluency Formula) | ~95 MB (cached once) |
| **Tier C (Lite + Optional Edge Assist)** | Low-end Android / Old iOS Safari | `whisper-tiny.en` (WASM q8, ~40 MB) | Deterministic NLP locally + Optional free Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct`) when online | ~42 MB |

---

## 4. IELTS Speaking Auto-Scoring Engine (WASM + WebGPU Deep Dive)

Official IELTS Speaking is graded across **4 equally weighted criteria** (25% each):
1. **Fluency and Coherence (FC)**
2. **Lexical Resource (LR)**
3. **Grammatical Range and Accuracy (GRA)**
4. **Pronunciation (P)**

Below is the complete mathematical and algorithmic pipeline executed inside `audio-dsp.worker.ts` and `ai-scorer.worker.ts`.

### 4.1 Audio Capture & Dual-Stream Processing Pipeline

When the candidate clicks **Record** (or when the examiner TTS finishes speaking in Mock Mode):

```
Microphone (MediaStream)
   |
   +---> [1] MediaRecorder (audio/webm;codecs=opus @ 24kbps)
   |         └──> Saved directly to OPFS: /audio/attempts/{attempt_id}.opus (~180KB/min)
   |
   +---> [2] AudioContext (16,000 Hz) ---> AudioWorkletProcessor (pcm-ring-buffer)
             └──> Transfers 512-sample Float32 chunks to audio-dsp.worker.ts
                    ├──> Silero VAD v5 (30ms windows) -> Voice/Silence State Machine
                    ├──> Rust DSP WASM -> Pitch (F0), RMS Energy, Spectral Flux
                    └──> Accumulated 16kHz Float32Array -> Sent to Whisper ONNX
```

#### Crucial Detail: Preserving Verbatim Disfluencies in Whisper
By default, Whisper models are trained to strip out `"um"`, `"uh"`, and word repetitions. In IELTS Speaking, stripping disfluencies artificially inflates Fluency and Grammar scores!
To force **verbatim transcription**, we pass a conditioned `initial_prompt` (decoder prefix tokens) to Whisper:
```ts
const VERBATIM_PROMPT =
  "Um, uh, er, ah, like, you know, I mean, well, so, actually... " +
  "I- I think, the the thing is, let me see.";
```
Combined with `return_timestamps: "word"` (Dynamic Time Warping over cross-attention weights), Whisper outputs every word, filler, hesitation, start/end timestamp $[t_{\text{start}}, t_{\text{end}}]$, and token probability $p(w_i) \in (0, 1]$.

---

### 4.2 Criterion 1: Fluency and Coherence ($B_{\text{FC}}$)

#### Extracted Features
Let $T_{\text{total}}$ be total response duration (seconds), $T_{\text{speech}}$ be total phonation time where Silero VAD probability $p_{\text{VAD}} > 0.5$, and $W = \{w_1, \dots, w_N\}$ be the transcribed word sequence with timestamps $[s_i, e_i]$.

1. **Speech Rate ($\text{WPM}$)**:
   $$\text{WPM} = \frac{N}{T_{\text{total}} / 60}$$
   *(Band 8–9 native/fluent target: $130 \le \text{WPM} \le 165$. Below $90\text{ WPM}$ indicates severe hesitation; above $185\text{ WPM}$ with low clarity indicates rushed cluttering).*

2. **Articulation Rate ($\text{AR}$, syllables/sec of pure speech)**:
   $$\text{AR} = \frac{\sum_{i=1}^N \text{syllables}(w_i)}{T_{\text{speech}}}$$

3. **Phonation-Time Ratio ($\text{PTR}$)**:
   $$\text{PTR} = \frac{T_{\text{speech}}}{T_{\text{total}}} \in [0, 1]$$

4. **Structural vs. Hesitation Pause Classification (The Secret Sauce)**:
   A pause between $w_i$ and $w_{i+1}$ has duration $\Delta t_i = s_{i+1} - e_i$.
   - Ignore micro-pauses $\Delta t_i < 0.25\text{ s}$ (natural stop consonant closure).
   - **Natural Clause-Boundary Pause**: $\Delta t_i \in [0.25\text{ s}, 0.80\text{ s}]$ occurring after a clause boundary (punctuation `.`, `,`, `;` or coordinating/subordinating conjunction boundary). *Not penalized!*
   - **Mid-Clause Hesitation Pause ($P_{\text{mid}}$)**: $\Delta t_i \ge 0.40\text{ s}$ occurring **inside** a syntactic phrase (e.g., between determiner and noun `"the [0.6s] government"`, or auxiliary and verb `"have been [0.7s] trying"`). *Heavily penalized!*
   - **Long Freeze Pause ($P_{\text{long}}$)**: Any pause $\Delta t_i \ge 1.20\text{ s}$.

5. **Mean Length of Run ($\text{MLR}$)**:
   Mean number of words uttered continuously between any pauses $\ge 0.30\text{ s}$:
   $$\text{MLR} = \frac{N}{1 + |\{i : \Delta t_i \ge 0.30\}|}$$

6. **Disfluency & Self-Correction Rate ($\text{DFR}$ per 100 words)**:
   $$\text{DFR} = \frac{100}{N} \left( N_{\text{fillers}} + N_{\text{repeats}} + N_{\text{false\_starts}} \right)$$
   where:
   - $N_{\text{fillers}}$: count of `um, uh, er, ah, hmm, like (non-verb/prep), you know`.
   - $N_{\text{repeats}}$: consecutive identical n-grams ($n \in \{1, 2, 3\}$), e.g., `"I think I think"`.

7. **Discourse Marker & Cohesive Device Score ($S_{\text{cohesion}}$)**:
   Evaluates variety across 6 functional categories:
   - *Addition*: `furthermore, moreover, in addition, on top of that`
   - *Contrast/Concession*: `however, nevertheless, having said that, whereas, on the flip side`
   - *Cause/Effect*: `consequently, as a result, owing to, therefore`
   - *Exemplification*: `for instance, to illustrate, a case in point is`
   - *Structuring/Sequencing*: `firstly, moving on to, primarily, all things considered`
   - *Hedging/Opinion*: `from my perspective, arguably, it seems plausible that`

#### Mathematical Scoring Mapping for $B_{\text{FC}}$
$$\hat{B}_{\text{FC}} = 9.0 - \min\Big(6.0,\; \alpha_1 \max(0, 125 - \text{WPM}) + \alpha_2 R_{P_{\text{mid}}} + \alpha_3 R_{P_{\text{long}}} + \alpha_4 \text{DFR} + \alpha_5 \max(0, 7.5 - \text{MLR})\Big) \cdot (1 - 0.15 S_{\text{cohesion}}) + \Delta_{\text{LLM,coherence}}$$
where $\Delta_{\text{LLM,coherence}} \in [-1.0, +0.5]$ adjusts for topic relevance and logical progression (checking that the candidate actually answered the prompt rather than reciting a memorized script).

---

### 4.3 Criterion 2: Lexical Resource ($B_{\text{LR}}$)

#### Extracted Features

1. **Length-Invariant Lexical Diversity (MTLD — Measure of Textual Lexical Diversity)**:
   Standard Type-Token Ratio ($\text{TTR} = V/N$) penalizes longer answers (such as a 2-minute Part 2 speech). Instead, we compute **bidirectional MTLD** with threshold $\theta = 0.72$:
   - Scan tokens sequentially, computing running TTR; each time $\text{TTR} \le 0.72$, increment factor count and reset.
   - Average forward and backward scans:
     $$\text{MTLD} = \frac{\text{MTLD}_{\text{forward}} + \text{MTLD}_{\text{backward}}}{2}$$
   *(Band 5: $\text{MTLD} \approx 40–50$; Band 7: $\text{MTLD} \approx 65–80$; Band 8.5–9: $\text{MTLD} \ge 90$).*

2. **CEFR Lexical Sophistication Profile ($S_{\text{CEFR}}$)**:
   Every lemmatized content word (nouns, verbs, adjectives, adverbs; excluding stopwords) is looked up in an embedded SQLite table (`cefr_lexicon`, ~15,000 headwords from Oxford 5000 + EFLLex + Academic Word List):
   $$S_{\text{CEFR}} = \frac{1.0 N_{\text{B1}} + 2.0 N_{\text{B2}} + 3.5 N_{\text{C1}} + 5.0 N_{\text{C2}}}{N_{\text{content}}}$$
   We also compute the **Rare/Advanced Word Ratio**:
   $$R_{\text{adv}} = \frac{N_{\text{B2}} + N_{\text{C1}} + N_{\text{C2}} + N_{\text{AWL}}}{N_{\text{content}}}$$

3. **Collocation & Idiomatic Expression Detection ($S_{\text{idiom}}$)**:
   An Aho-Corasick automaton scans the lemmatized token stream against **6,500+ curated IELTS collocations, phrasal verbs, and idiomatic phrases** (e.g., `"strike a balance"`, `"detrimental effect"`, `"fast-paced environment"`, `"take for granted"`, `"double-edged sword"`).
   - Cliche penalty: Overused memorized template idioms (`"every coin has two sides"`, `"in a nutshell"`) are flagged as cliché and given $0.2\times$ weight.

4. **Prompt Paraphrasing Ratio ($S_{\text{para}}$)**:
   Computes lemmatized content-word Jaccard similarity between the examiner's question $Q$ and the candidate's first 2 sentences $A_{1:2}$:
   $$J(Q, A_{1:2}) = \frac{|\text{lemmas}(Q) \cap \text{lemmas}(A_{1:2})|}{|\text{lemmas}(Q)|}$$
   High semantic similarity with low exact lexical overlap ($J < 0.35$) indicates successful paraphrasing (Band 7+).

---

### 4.4 Criterion 3: Grammatical Range and Accuracy ($B_{\text{GRA}}$)

IELTS rewards **both** attempting complex structures (*Range*) and producing error-free clauses (*Accuracy*).

#### Extracted Features

1. **Clause Segmentation & Error-Free Clause Ratio ($\text{EFC}$)**:
   The transcript is segmented into independent and dependent clauses $C = \{c_1, c_2, \dots, c_K\}$.
   `harper.js` (WASM) + custom grammatical dependency rules + WebLLM inspect each clause $c_k$:
   $$\text{EFC} = \frac{|\{c_k \in C : \text{errors}(c_k) = 0\}|}{K}$$
   *Empirical SLA Mapping to IELTS GRA*:
   - $\text{EFC} \ge 0.85 \implies$ Band 8.0–9.0 ("produces majority of error-free sentences with only very occasional inappropriacies")
   - $0.65 \le \text{EFC} < 0.85 \implies$ Band 7.0–7.5 ("frequently produces error-free sentences")
   - $0.45 \le \text{EFC} < 0.65 \implies$ Band 6.0–6.5 ("makes some errors in complex structures, though these rarely impede communication")
   - $\text{EFC} < 0.45 \implies$ Band 4.5–5.5

2. **Syntactic Complexity & Structural Variety Index ($S_{\text{range}}$)**:
   - **Subordinate Clause Ratio ($\text{SCR}$)**:
     $$\text{SCR} = \frac{K_{\text{subordinate}}}{K_{\text{total}}}$$
   - **Grammatical Family Checklist** (checks presence across 10 target grammatical families):
     1. Relative clauses (`who, which, that, whose, where`)
     2. Conditional structures (`if/unless/provided that` + modal past/perfect)
     3. Passive voice (`be/get + V3`)
     4. Perfect & Perfect Continuous aspects (`have/had been V-ing`, `have V3`)
     5. Modal verbs of probability/deduction (`might have, must be, could potentially`)
     6. Cleft sentences (`What I find fascinating is...`, `It is the youth who...`)
     7. Comparative/Superlative correlatives (`the more..., the more...`, `far more X than Y`)
     8. Participial clauses (`Having lived there for years,...`, `Driven by economic growth,...`)
     9. Subjunctive / Hypothetical (`I wish I had...`, `It is vital that the government invest...`)
     10. Negative inversion (`Not only does it..., Rarely do we see...`)

   $$S_{\text{range}} = \min\left(1.0,\; \frac{N_{\text{distinct\_families\_used}}}{5.0}\right) \cdot 0.6 + \min\left(1.0,\; \frac{\text{SCR}}{0.40}\right) \cdot 0.4$$

---

### 4.5 Criterion 4: Pronunciation ($B_{\text{P}}$)

A common mistake in naive browser apps is using only browser `webkitSpeechRecognition` text output, which has zero acoustic visibility. Our pipeline analyzes the **raw 16 kHz audio waveform** alongside **ASR token posteriors** and **CTC phoneme alignment**.

#### Extracted Acoustic & Phonetic Features

1. **ASR Acoustic Intelligibility & Word Confidence ($\bar{P}_{\text{ASR}}$ & $\text{LCWR}$)**:
   From Whisper ONNX's per-word probability $p(w_i)$:
   $$\bar{P}_{\text{ASR}} = \frac{1}{N} \sum_{i=1}^N p(w_i), \qquad \text{LCWR} = \frac{|\{w_i : p(w_i) < 0.65\}|}{N}$$
   Words with $p(w_i) < 0.65$ are highlighted in yellow/red in the UI as **Unclear / Mispronounced Tokens**.

2. **Phoneme-Level Goodness of Pronunciation (GOP) & L1 Indonesian Interference Detector**:
   For words flagged with $p(w_i) < 0.80$ (or all content words on Tier A/B devices), we run forced alignment using **Wav2Vec2-CTC (`wav2vec2-lv-60-espeak-cv-ft` ONNX)** over the word's audio slice $[s_i, e_i]$ and compare the observed phoneme posterior $P(\phi \mid X)$ against the expected IPA sequence from the CMU/eSpeak Pronouncing Dictionary:
   $$\text{GOP}(\phi) = \frac{1}{T_\phi} \sum_{t \in \phi} \log \frac{P(\phi \mid x_t)}{\max_{\psi \in \Phi} P(\psi \mid x_t)} \le 0$$
   Specifically tracks common **Indonesian L1 -> English L2 phonological transfer patterns**:
   - Dental fricative substitution: `/θ/` $\to$ `/t/` (*think* $\to$ *tink*), `/ð/` $\to$ `/d/` (*they* $\to$ *dey*)
   - Labiodental voicing: `/v/` $\to$ `/f/` (*very* $\to$ *fery*)
   - Palato-alveolar sibilant: `/ʃ/` $\to$ `/s/` (*she* $\to$ *see*)
   - Word-final consonant cluster reduction: dropping final `/t, d, k/` (*fact* $\to$ *fac*, *helped* $\to$ *help*)
   - Missing grammatical `-ed` (`/t, d, ɪd/`) and `-s/-es` (`/s, z, ɪz/`) endings (which simultaneously hurts Pronunciation and GRA!).

3. **Intonation & Pitch Expressiveness ($\sigma_{F_0,\text{ST}}$)**:
   Using the YIN / pYIN algorithm in `audio-dsp.worker.ts` (50 Hz – 450 Hz voiced frames), we convert fundamental frequency $F_0(t)$ into **semitones relative to the speaker's median pitch** $F_{0,\text{med}}$ (making the metric gender-invariant!):
   $$f_{\text{ST}}(t) = 12 \log_2 \left( \frac{F_0(t)}{F_{0,\text{med}}} \right)$$
   $$\sigma_{F_0,\text{ST}} = \sqrt{\frac{1}{T_{\text{voiced}}} \sum_{t} \big(f_{\text{ST}}(t) - \bar{f}_{\text{ST}}\big)^2}$$
   - Monotone / Robotic delivery: $\sigma_{F_0,\text{ST}} < 1.8\text{ semitones}$ (penalized to Band 5–6).
   - Natural expressive English intonation: $2.5 \le \sigma_{F_0,\text{ST}} \le 4.8\text{ semitones}$ (Band 7.5–9).

4. **Stress-Timed Rhythm via Normalized Pairwise Variability Index ($\text{nPVI}$)**:
   English is a *stress-timed* language (large duration contrast between stressed and unstressed syllables), whereas Bahasa Indonesia is *syllable-timed* (nearly equal syllable durations).
   Given vocalic energy peak durations $\{d_1, d_2, \dots, d_m\}$:
   $$\text{nPVI} = \frac{100}{m - 1} \sum_{k=1}^{m-1} \left| \frac{d_k - d_{k+1}}{(d_k + d_{k+1}) / 2} \right|$$
   - Syllable-timed (flat rhythm): $\text{nPVI} < 42$
   - Native/Fluent stress-timed English target: $52 \le \text{nPVI} \le 68$

---

### 4.6 Final Band Score Aggregation & Calibration

1. Each criterion raw score $\hat{B}_c \in [1.0, 9.0]$ ($c \in \{\text{FC, LR, GRA, P}\}$) is rounded to the nearest half-band:
   $$B_c = \frac{\lfloor 2 \hat{B}_c + 0.5 \rfloor}{2}$$
2. The overall Speaking Band Score follows the official Cambridge / British Council / IDP rounding rule:
   $$\bar{B} = \frac{B_{\text{FC}} + B_{\text{LR}} + B_{\text{GRA}} + B_{\text{P}}}{4}$$
   $$B_{\text{overall}} = \frac{\lfloor 2 \bar{B} + 0.5 \rfloor}{2}$$
   *(Specifically: `.25` rounds UP to `.50`; `.75` rounds UP to the next whole band `.0`; `.125` rounds DOWN to `.0`; `.625` rounds DOWN to `.50`).*

---

## 5. Writing, Reading, Listening & FSRS Study Modules

### 5.1 IELTS Writing Auto-Scoring Lab (Task 1 & Task 2)
- **Supported Modes**:
  - **Academic Task 1** (20 mins, $\ge 150$ words): Data chart/graph/process/map rendered via SVG/Chart.js alongside a structured JSON ground-truth descriptor (`key_trends`, `extrema`, `comparisons`) so the local scorer verifies whether the user actually reported the key features!
  - **General Training Task 1** (20 mins, $\ge 150$ words): Formal, semi-formal, and informal letter prompts with tone consistency checker.
  - **Task 2 Essay** (40 mins, $\ge 250$ words): Opinion, Discussion, Problem-Solution, Two-Part Question, and Advantage-Disadvantage prompts.
- **4-Criterion Scoring Engine**:
  - **Task Achievement / Task Response (TA/TR)**: Word count penalty check (under 150/250 words), paragraph structure check (Intro + Overview/Body 1 + Body 2 + Conclusion), prompt keyword/aspect coverage, and WebLLM thesis-to-argument alignment check.
  - **Coherence and Cohesion (CC)**: Paragraph transition analysis, cohesive device density & variety, pronoun reference ambiguity check, and topic sentence detection.
  - **Lexical Resource (LR)**: Academic Word List (AWL) coverage, MTLD diversity, spelling accuracy via `harper.js`, repetition heatmap (highlights words repeated $>3$ times in close proximity).
  - **Grammatical Range and Accuracy (GRA)**: Clause complexity, punctuation check, error-free sentence ratio, inline red/green diff rewrite suggestions.
- **Overall Writing Band**:
  $$B_{\text{Writing}} = \text{round}_{0.5}\left( \frac{1}{3} B_{\text{Task1}} + \frac{2}{3} B_{\text{Task2}} \right)$$
  *(Task 2 carries $2\times$ the weight of Task 1, matching official IELTS weighting).*

### 5.2 IELTS Reading Simulator
- **Exam-Authentic Split View**: Resizable left passage pane (with text highlighter: Yellow/Pink/Cyan + inline margin notes persisted locally) and right question navigator.
- **All 14 Official Question Types**:
  1. True / False / Not Given
  2. Yes / No / Not Given
  3. Matching Headings (drag-and-drop)
  4. Matching Paragraph Information
  5. Matching Features / Names
  6. Matching Sentence Endings
  7. Multiple Choice (Single & Multiple Answer)
  8. Summary / Note / Table / Flow-chart Completion (with or without word bank)
  9. Diagram Label Completion
  10. Short-Answer Questions (strict word-limit validator: e.g., `NO MORE THAN TWO WORDS AND/OR A NUMBER`)
- **Post-Test Evidence Jump**: Clicking any graded question scrolls the passage to the exact `evidence_span_id` and explains *why* False vs. Not Given applies.

### 5.3 IELTS Listening Simulator
- **Offline Multi-Voice Audio Engine**:
  - Pre-packaged high-compression Opus audio tracks (`24 kbps`, ~4.5 MB per full 30-minute test) **plus** dynamic infinite drill generation using **Kokoro-82M multi-speaker TTS** (British, Australian, North American voices for Section 1 dialogues and Section 4 university lectures).
- **Answer Normalizer Engine**:
  - Deterministic parser supporting British/American spelling equivalence (`colour`/`color`, `centre`/`center`), number/word equivalence (`14`/`fourteen`), time/date normalizations (`14th Oct` / `October 14` / `14 October`), and optional bracketed words `(the) station`.

### 5.4 Automated FSRS v5 Spaced Repetition Deck
- Every Speaking and Writing session automatically extracts:
  1. **Mispronounced Words** (with embedded TTS audio + IPA + user's recorded clip for comparison)
  2. **Grammar Corrections** (Cloze deletion card: user's erroneous sentence $\to$ corrected Band-8 sentence)
  3. **Vocabulary Upgrades** (B1 word the user overused $\to$ context-appropriate C1/C2 collocation)
- Scheduled locally using **FSRS v5 (`ts-fsrs`)** stored in SQLite-WASM (`srs_cards` & `srs_review_logs`).

---

## 6. Local-First Storage Architecture & SQLite-WASM Schema

### 6.1 Browser Storage Tier Allocation

| Storage Mechanism | Data Stored | Typical Size | Persistence Guarantee |
| :--- | :--- | :--- | :--- |
| **OPFS (`/db/ielts.sqlite3`)** | All relational tables, transcripts, scores, SRS cards, CRDT oplog | 5 MB – 50 MB | `navigator.storage.persist()` requested on first test |
| **OPFS (`/audio/attempts/*.opus`)** | User's recorded Speaking answers (`audio/webm;codecs=opus`) | ~200 KB / minute of speech | Persistent disk file handle; streamable to ZIP/R2 |
| **Cache API / IndexedDB** | ONNX / WebLLM model weights (`whisper`, `silero`, `kokoro`, `qwen`) | 95 MB – 900 MB | Content-addressed by HuggingFace revision hash |
| **`localStorage`** | `device_id`, `theme`, `last_sync_hlc`, `auth_user_preview` | `< 4 KB` | Instant synchronous read before Worker boots |

### 6.2 Complete SQLite-WASM Database Schema (`schema.sql`)

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

-- 1. Local User & Device Metadata
CREATE TABLE IF NOT EXISTS local_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 2. Question Bank (Seeded from static JSON packs + custom prompts)
CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY,                      -- e.g., 'spk_p2_describe_book_01'
    module TEXT NOT NULL,                     -- 'speaking' | 'writing' | 'reading' | 'listening'
    part INTEGER NOT NULL,                    -- 1, 2, 3, or 4
    category TEXT NOT NULL,                   -- e.g., 'Technology', 'Environment', 'Academic_T1_Bar'
    title TEXT NOT NULL,
    payload_json TEXT NOT NULL,               -- Cue card bullets, sub-questions, chart SVG data, or passage markdown
    difficulty_band REAL DEFAULT 7.0,
    version INTEGER NOT NULL DEFAULT 1
);

-- 3. Exam / Practice Sessions
CREATE TABLE IF NOT EXISTS study_sessions (
    id TEXT PRIMARY KEY,                      -- UUIDv7 (time-sortable!)
    user_id TEXT,                             -- NULL when anonymous, Google sub ID when logged in
    module TEXT NOT NULL,                     -- 'speaking' | 'writing' | 'reading' | 'listening' | 'full_mock'
    mode TEXT NOT NULL,                       -- 'exam_simulation' | 'part_drill' | 'pronunciation_drill'
    started_at INTEGER NOT NULL,              -- Unix ms
    completed_at INTEGER,
    overall_band REAL,                        -- 0.0 to 9.0 (step 0.5)
    subscores_json TEXT,                      -- e.g., {"fc":7.0,"lr":7.5,"gra":6.5,"p":7.0}
    hlc TEXT NOT NULL,                        -- Hybrid Logical Clock timestamp for sync
    is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_module_date ON study_sessions(module, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_hlc ON study_sessions(hlc);

-- 4. Speaking Attempts (1-to-many per study_session)
CREATE TABLE IF NOT EXISTS speaking_attempts (
    id TEXT PRIMARY KEY,                      -- UUIDv7
    session_id TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    prompt_id TEXT NOT NULL,
    part INTEGER NOT NULL,                    -- 1, 2, or 3
    question_text TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    audio_opfs_path TEXT,                     -- e.g., '/audio/attempts/0192f...opus'
    audio_sha256 TEXT,                        -- Content hash for deduplicated R2 upload
    audio_size_bytes INTEGER,
    audio_r2_synced INTEGER NOT NULL DEFAULT 0,
    transcript_raw TEXT NOT NULL,
    word_timestamps_json TEXT NOT NULL,       -- [{w, start, end, prob, gop, is_filler, pause_after_ms}]
    acoustic_metrics_json TEXT NOT NULL,      -- {wpm, ar, ptr, mlr, spf, mid_clause_pauses, f0_std_st, npvi}
    lexical_metrics_json TEXT NOT NULL,       -- {mtld, cefr_dist, collocations_found, paraphrase_score}
    grammar_metrics_json TEXT NOT NULL,       -- {efc_ratio, scr, families_detected, errors: [...]}
    llm_feedback_json TEXT,                   -- {coherence_notes, sentence_upgrades: [...], model_answer}
    band_fc REAL NOT NULL,
    band_lr REAL NOT NULL,
    band_gra REAL NOT NULL,
    band_p REAL NOT NULL,
    band_overall REAL NOT NULL,
    created_at INTEGER NOT NULL,
    hlc TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_speaking_session ON speaking_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_speaking_hlc ON speaking_attempts(hlc);

-- 5. Writing Attempts
CREATE TABLE IF NOT EXISTS writing_attempts (
    id TEXT PRIMARY KEY,                      -- UUIDv7
    session_id TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    prompt_id TEXT NOT NULL,
    task_number INTEGER NOT NULL,             -- 1 or 2
    essay_text TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    time_spent_ms INTEGER NOT NULL,
    metrics_json TEXT NOT NULL,               -- {mtld, awl_ratio, efc_ratio, paragraph_count}
    inline_annotations_json TEXT NOT NULL,    -- [{start_char, end_char, category, severity, replacement, explanation}]
    band_ta_tr REAL NOT NULL,
    band_cc REAL NOT NULL,
    band_lr REAL NOT NULL,
    band_gra REAL NOT NULL,
    band_overall REAL NOT NULL,
    created_at INTEGER NOT NULL,
    hlc TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

-- 6. Reading & Listening Attempts
CREATE TABLE IF NOT EXISTS receptive_attempts (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    prompt_id TEXT NOT NULL,
    module TEXT NOT NULL,                     -- 'reading' | 'listening'
    raw_score INTEGER NOT NULL,               -- 0 to 40
    total_questions INTEGER NOT NULL DEFAULT 40,
    band_score REAL NOT NULL,
    answers_json TEXT NOT NULL,               -- [{q_num, user_ans, correct_ans, is_correct, time_ms}]
    highlights_json TEXT,                     -- User passage highlights & margin notes
    created_at INTEGER NOT NULL,
    hlc TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

-- 7. FSRS v5 Spaced Repetition Cards
CREATE TABLE IF NOT EXISTS srs_cards (
    id TEXT PRIMARY KEY,                      -- Deterministic hash or UUIDv7
    source_attempt_id TEXT,
    card_type TEXT NOT NULL,                  -- 'pronunciation' | 'grammar_fix' | 'collocation' | 'vocabulary'
    front_text TEXT NOT NULL,
    back_text TEXT NOT NULL,
    context_sentence TEXT,
    ipa_phonetic TEXT,
    due_at INTEGER NOT NULL,                  -- Unix ms
    stability REAL NOT NULL DEFAULT 0,
    difficulty REAL NOT NULL DEFAULT 0,
    elapsed_days INTEGER NOT NULL DEFAULT 0,
    scheduled_days INTEGER NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    state INTEGER NOT NULL DEFAULT 0,         -- 0=New, 1=Learning, 2=Review, 3=Relearning
    last_review_at INTEGER,
    hlc TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_srs_due ON srs_cards(is_deleted, due_at ASC);

-- 8. CRDT / HLC Sync Outbox Queue (Local Changes Pending Push to Cloudflare D1)
CREATE TABLE IF NOT EXISTS sync_outbox (
    hlc TEXT PRIMARY KEY,                     -- '<phys_ms_base36>-<counter_hex>-<device_id>'
    table_name TEXT NOT NULL,                 -- 'study_sessions' | 'speaking_attempts' | 'writing_attempts' | 'receptive_attempts' | 'srs_cards'
    row_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,               -- Full serialized row state at this HLC
    created_at INTEGER NOT NULL,
    synced_at INTEGER                         -- NULL until acknowledged by Cloudflare Worker
);

CREATE INDEX IF NOT EXISTS idx_outbox_unsynced ON sync_outbox(synced_at) WHERE synced_at IS NULL;
```

---

## 7. Deterministic Export & Import System (Backup / Restore / Merge)

Because a local-first user might never create an account (or might want an offline cold backup before switching browsers), the Export/Import system is a first-class feature.

### 7.1 Two Export Formats

1. **Format A: Compact Progress Backup (`.ieltsbackup` — gzipped JSON, ~100 KB – 2 MB)**
   - Exports all rows from `study_sessions`, `speaking_attempts`, `writing_attempts`, `receptive_attempts`, and `srs_cards` (excluding binary `.opus` files).
   - Includes a `manifest` with `schema_version`, `exported_at`, `device_id`, `max_hlc`, and a **SHA-256 integrity hash** of the canonicalized payload.
   - Ideal for quick sharing, messaging to oneself, or transferring progress in $<1\text{ second}$.

2. **Format B: Full Studio Archive with Audio (`.ielts-archive.zip` — Streaming ZIP via `fflate`)**
   - Built inside `db.worker.ts` without loading everything into RAM:
     ```
     ielts-backup-2026-11-04.ielts-archive.zip
     ├── manifest.json                 (version, counts, sha256 manifest)
     ├── db/
     │   ├── ielts.sqlite3             (raw binary export via sqlite3_js_db_export)
     │   └── canonical-dump.json       (schema-independent JSON dump for cross-version safety)
     └── audio/
         └── attempts/
             ├── 0192f4a1-....opus
             └── 0192f4b8-....opus
     ```

### 7.2 Three Import Modes

When the user drops a `.ieltsbackup` or `.ielts-archive.zip` file into the app:
1. **Verify Integrity**: Worker validates `manifest.json` schema version and verifies the SHA-256 checksum of every entry before touching the database.
2. **User Chooses Resolution Mode**:
   - **Smart Merge (Default & Recommended)**:
     - For every row $r$ in the imported dump, compare its Hybrid Logical Clock `r.hlc` against the existing local row `local.hlc` (if `id` exists):
       $$\text{if } \text{local} = \varnothing \lor r.\text{hlc} > \text{local}.\text{hlc} \implies \text{UPSERT } r$$
     - Copies any missing `/audio/attempts/*.opus` files into OPFS.
     - Zero data loss: combines yesterday's laptop sessions with today's phone sessions offline!
   - **Clean Overwrite (Restore Snapshot)**:
     - Replaces `/db/ielts.sqlite3` and `/audio/attempts/*` with the archive contents.

---

## 8. Google OAuth 2.0 & Multi-Device Sync Protocol (Cloudflare Edge)

### 8.1 Zero-Cost Google Authentication Flow (OIDC + PKCE)

We do **not** need Firebase Auth, Auth0, or Supabase Auth (which introduce third-party SDK bloat or MAU limits). We use direct **Google OAuth 2.0 / OpenID Connect** verified at the edge by our Cloudflare Worker using Web Crypto (`crypto.subtle` + cached Google JWKS).

```
[Browser PWA]                               [Cloudflare Worker]                     [Google OAuth 2.0]
      |                                              |                                      |
      | 1. Click "Sign in with Google"               |                                      |
      |    (Generate PKCE code_verifier & challenge) |                                      |
      |--------------------------------------------->|                                      |
      |                                              | 2. Redirect to accounts.google.com   |
      |                                              |------------------------------------->|
      |                                              |                                      |
      | 3. User consents -> Redirects to /api/auth/google/callback?code=...                 |
      |--------------------------------------------->|                                      |
      |                                              | 4. POST /token (exchange code + PKCE)|
      |                                              |------------------------------------->|
      |                                              |<-------------------------------------|
      |                                              |    Returns id_token (JWT)            |
      |                                              |                                      |
      |                                              | 5. Verify id_token signature via     |
      |                                              |    cached Google JWKS + Upsert D1    |
      |                                              |    `users` table                     |
      |                                              |                                      |
      | 6. Set HttpOnly, Secure, SameSite=Lax JWT    |                                      |
      |    session cookie (30d) + return user profile|                                      |
      |<---------------------------------------------|                                      |
```

#### Seamless Guest-to-Google Account Upgrade
When a user who has already completed 20 practice sessions locally logs in with Google for the first time:
1. `db.worker.ts` runs:
   ```sql
   UPDATE study_sessions SET user_id = :google_sub WHERE user_id IS NULL;
   ```
2. Every existing local record not yet in `sync_outbox` is enqueued into `sync_outbox`.
3. `sync.worker.ts` immediately runs a **Push -> Pull** cycle, merging any historical data already stored in the user's Google cloud account with their current device's local OPFS data.

---

### 8.2 Hybrid Logical Clock (HLC) & Conflict-Free Sync Protocol

#### Why Hybrid Logical Clocks?
If a user practices on their phone (whose clock is 2 minutes behind) and on their laptop, naive `updated_at` timestamps cause data corruption.
Every mutation in `db.worker.ts` stamps rows with a **Hybrid Logical Clock** string:
$$\text{HLC} = \texttt{<48-bit physical ms in padded base36>}-\texttt{<16-bit logical counter in hex>}-\texttt{<8-char device\_id>}$$
Example: `01jbx9k2m0-0001-a8f39c12`.
- Lexicographically sortable in SQLite (`WHERE hlc > ? ORDER BY hlc ASC`)!
- Strictly monotonic on both client and server.

#### Cloudflare D1 Schema (`workers/api/migrations/0001_init.sql`)
Instead of duplicating complex relational migrations on both client and server, **Cloudflare D1 stores a normalized User Table + an Append/Upsert Entity Sync Store (`sync_entities`)**:

```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                      -- Google 'sub' claim
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    picture_url TEXT,
    audio_bytes_used INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_sync_at INTEGER NOT NULL
);

-- Stores latest state of every synced entity row per user, indexed by HLC for fast delta pulls!
CREATE TABLE IF NOT EXISTS sync_entities (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,                 -- 'study_sessions' | 'speaking_attempts' | 'writing_attempts' | 'receptive_attempts' | 'srs_cards'
    row_id TEXT NOT NULL,
    hlc TEXT NOT NULL,
    device_id TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    payload_json TEXT NOT NULL,               -- Compressed/canonical JSON of the row
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, table_name, row_id)
);

-- Covering index so delta pull `WHERE user_id = ? AND hlc > ?` reads ONLY changed rows!
CREATE INDEX IF NOT EXISTS idx_sync_pull ON sync_entities(user_id, hlc ASC);
```

#### Why the `sync_entities` Pattern in D1 is Genius for Cloudflare Free Tier:
1. **Zero Server-Side Schema Drift**: When we add a new metric column to `speaking_attempts` in SQLite-WASM on the client, D1 requires **zero migrations** because `payload_json` holds the serialized row.
2. **Minimal D1 Row Reads/Writes**:
   - **Push (`POST /api/sync/push`)**: Uses D1 batch `INSERT INTO sync_entities ... ON CONFLICT(user_id, table_name, row_id) DO UPDATE SET hlc = excluded.hlc, payload_json = excluded.payload_json WHERE excluded.hlc > sync_entities.hlc`.
   - **Pull (`GET /api/sync/pull?since_hlc=...`)**: Runs `SELECT table_name, row_id, hlc, is_deleted, payload_json FROM sync_entities WHERE user_id = ? AND hlc > ? ORDER BY hlc ASC LIMIT 500`.
   - If 0 rows changed on other devices, the query reads **0 rows** via the `idx_sync_pull` index!

#### Sync Trigger Policy (Minimizing Worker Requests)
`sync.worker.ts` does **not** poll continuously. It triggers a sync cycle only on:
1. App boot (if logged in & online, max once per 5 minutes).
2. Completion of an Exam Session or SRS Review batch (debounced by 3 seconds).
3. `window.addEventListener('online')` after recovering from offline mode.
4. Manual "Sync Now" button click in the top bar.

---

### 8.3 Optional Audio Blob Sync with Cloudflare R2 + Automatic Quota Pruning

- Opus audio @ 24 kbps is tiny (~180 KB per 1-minute response, ~900 KB for a full 5-minute Speaking session).
- Users have a setting: **"Sync Speaking Recordings Across Devices"** (`ON` by default for last 25 MB of audio per user, or `Metadata & Transcripts Only`).
- **Ring-Buffer Quota Guardrail**: Each user gets a 25 MB R2 audio quota (roughly 125 minutes of speaking recordings). When uploading a new recording that would exceed 25 MB for that `user_id`, the Worker automatically deletes the oldest R2 audio object for that user while keeping the transcript, word timestamps, and band scores forever in D1 and local OPFS!

---

## 9. Cloudflare Free-Tier Capacity Math & Cost Guardrails

Let's verify mathematically that this architecture stays 100% within Cloudflare's $0 Free Plan limits:

| Cloudflare Resource | Free Tier Limit | Usage Per Active User / Day | Max Free DAU Supported |
| :--- | :--- | :--- | :--- |
| **Cloudflare Pages** | Unlimited static requests & bandwidth | Static HTML/JS/CSS/Questions | **Unlimited** |
| **Cloudflare Workers** | **100,000 requests / day** | ~6 requests/day (1 pull on open, 3 pushes after practice, 2 audio puts) | **~16,500 DAU** (Logged-in users; anonymous users use 0 Worker requests!) |
| **Cloudflare D1 Reads** | **5,000,000 rows read / day** | ~15 rows read per delta pull (indexed by `user_id, hlc`) | **~330,000 DAU** |
| **Cloudflare D1 Writes** | **100,000 rows written / day** | ~10 rows written per active study day (1 session + 3 speaking + 6 SRS cards) | **~10,000 DAU** |
| **Cloudflare D1 Storage** | **5 GB total** | ~3 KB per attempt $\times$ 100 attempts = ~300 KB/user | **~16,000 heavy users** |
| **Cloudflare R2 Storage** | **10 GB / month** (0 egress fee) | Capped at 20–25 MB per opted-in user | **400–500 full audio-sync users** (or 100% unlimited if audio stays local-only) |

> **Hard Cost Guardrail**: Because Cloudflare Workers + D1 Free Plan does **not** auto-bill overages without upgrading to Paid, your credit card can never be surprise-charged. Furthermore, if Worker/D1 daily quota ever hits 100%, the client app continues working 100% normally in Local-First mode and simply flushes `sync_outbox` the next day!

---

## 10. Security, Privacy & Cross-Origin Isolation

### 10.1 Required HTTP Headers (`public/_headers` on Cloudflare Pages)

To unlock **multi-threaded WASM (`SharedArrayBuffer`)** for ONNX Runtime Web and Whisper WASM, the site must be Cross-Origin Isolated. We use `COEP: credentialless` instead of `require-corp` so Google OAuth profile pictures and HuggingFace Hub model fetches work without CORS breakage:

```text
/*
  Cross-Origin-Opener-Policy: same-origin-allow-popups
  Cross-Origin-Embedder-Policy: credentialless
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: microphone=(self), camera=()
```
*(Note: `same-origin-allow-popups` or a top-level redirect flow for Google OAuth ensures both OAuth login and `SharedArrayBuffer` coexist cleanly).*

### 10.2 Optional Client-Side Encryption (E2EE Sync Passphrase)
- Because `sync_entities.payload_json` is opaque to the Cloudflare Worker, users can optionally set an **End-to-End Encryption Passphrase** (derived via `PBKDF2-SHA256` / `AES-256-GCM` in Web Crypto API) so even Cloudflare D1 and R2 only ever see encrypted ciphertext!

---

## 11. Repository Structure & Monorepo Layout

```text
ielts/
├── megaplan.md                         # This comprehensive system design document
├── README.md                           # Project overview & quickstart
├── package.json                        # Bun / pnpm workspace root
├── tsconfig.base.json
├── apps/
│   └── web/                            # Frontend PWA (React 19 + Vite + Tailwind v4)
│       ├── public/
│       │   ├── _headers                # Cloudflare Pages COOP/COEP headers
│       │   ├── manifest.webmanifest    # PWA installable manifest
│       │   └── data/
│       │       ├── cefr-lexicon.json   # Compact CEFR A1-C2 + AWL dictionary
│       │       ├── collocations.json   # 6,500+ IELTS idioms & collocations
│       │       └── questions/          # Static question packs (Speaking, Writing, Reading, Listening)
│       ├── src/
│       │   ├── main.tsx
│       │   ├── routes/                 # TanStack Router pages
│       │   │   ├── index.tsx           # Dashboard, Band Estimator, Streak & Sync Status
│       │   │   ├── speaking/           # Mock Simulator, Part 1/2/3 Drill, Post-Test Diagnostic UI
│       │   │   ├── writing/            # Task 1 & 2 Split Editor + Inline Diff Feedback
│       │   │   ├── reading/            # 3-Passage Annotator + 14 Question Types
│       │   │   ├── listening/          # Multi-part Audio Player + Normalizer Grading
│       │   │   ├── review/             # FSRS v5 Flashcard Deck (Pronunciation + Grammar + Vocab)
│       │   │   └── settings/           # AI Model Manager, Export/Import Backup, Google Sync
│       │   ├── workers/
│       │   │   ├── db.worker.ts        # SQLite-WASM OPFS + FSRS + Export/Import + CRDT Merge
│       │   │   ├── audio-dsp.worker.ts # Silero VAD + Pitch (F0) + nPVI Rhythm + Opus Encoder
│       │   │   ├── ai-scorer.worker.ts # Whisper ONNX + Wav2Vec2 GOP + harper.js + WebLLM + Kokoro TTS
│       │   │   └── sync.worker.ts      # HLC Generator + Delta Push/Pull + R2 Audio Sync
│       │   ├── worklets/
│       │   │   └── pcm-processor.ts    # 16kHz Float32 ring buffer AudioWorklet
│       │   └── lib/
│       │       ├── scoring/            # Pure TypeScript mathematical rubric formulas (FC, LR, GRA, P)
│       │       ├── hlc/                # Hybrid Logical Clock implementation
│       │       └── backup/             # fflate ZIP/JSON export & SHA-256 verification
│       └── vite.config.ts
├── packages/
│   ├── dsp-wasm/                       # Optional Rust -> WASM crate for ultra-fast pYIN pitch & nPVI
│   └── shared/                         # Shared Zod schemas & TypeScript types between Web & Worker
└── workers/
    └── api/                            # Cloudflare Worker (Hono + D1 + R2 + Google OIDC)
        ├── wrangler.toml
        ├── migrations/
        │   └── 0001_init.sql
        └── src/
            ├── index.ts
            ├── auth/
            │   └── google-oidc.ts      # PKCE exchange + Google JWKS verification + JWT cookie
            └── sync/
                ├── delta-sync.ts       # D1 HLC upsert & cursor pull
                └── audio-r2.ts         # Content-addressed R2 upload/download with 25MB ring quota
```

---

## 12. Phased Implementation Roadmap & TDD Verification Plan

### Phase 1: Foundation, Local-First DB & Export/Import Engine
- **Deliverables**:
  - Scaffold monorepo (`apps/web`, `packages/shared`, `workers/api`).
  - Implement Hybrid Logical Clock (`hlc.ts`) with unit tests proving monotonicity and causal ordering.
  - Implement `db.worker.ts` with `@sqlite.org/sqlite-wasm` over OPFS, running `schema.sql`.
  - Build the **Export / Import Backup Engine** (`.ieltsbackup` JSON.gz and `.ielts-archive.zip` via `fflate`) with **Smart CRDT Merge** and **Clean Overwrite** modes.
- **Verification**:
  - Vitest suite verifying HLC collision handling, deterministic CRDT merge of two divergent databases, and SHA-256 tamper rejection on corrupted backup files.

### Phase 2: Audio Pipeline & IELTS Speaking Auto-Scoring Engine (Core Differentiator)
- **Deliverables**:
  - Build `pcm-processor.ts` (`AudioWorklet`) + simultaneous `MediaRecorder` Opus saver to OPFS.
  - Build `audio-dsp.worker.ts`: Silero VAD v5 integration (detecting exact speech/silence timestamps, mid-clause pauses vs clause-boundary pauses), YIN pitch ($F_0$ semitone variance), and nPVI rhythm calculator.
  - Build `ai-scorer.worker.ts`:
    - Integrate `@huggingface/transformers` Whisper (`whisper-base.en` / `whisper-tiny.en`) with verbatim disfluency prompt and word-level timestamps.
    - Implement the 4 deterministic scoring calculators (`scoreFluencyCoherence`, `scoreLexicalResource`, `scoreGrammaticalRangeAccuracy`, `scorePronunciation`) + official IELTS half-band rounding.
    - Integrate `harper.js` WASM for instant offline grammatical error detection + embedded CEFR/AWL lexicon & Aho-Corasick collocation matcher.
    - Integrate progressive WebLLM (`Qwen2.5-1.5B-Instruct-q4f16_1-MLC`) for deep semantic coherence feedback and Band-9 sentence rewrites, plus Kokoro/Piper TTS for the AI Examiner voice.
- **Verification**:
  - Automated benchmark tests against synthetic and sample IELTS Band 5.0, 6.5, and 8.5 transcripts/audio fixtures verifying that:
    - Mid-clause pauses and high disfluency rates lower $B_{\text{FC}}$.
    - High C1/C2 lexical density and high MTLD raise $B_{\text{LR}}$.
    - High Error-Free Clause ratio ($\text{EFC} > 0.85$) and subordinate clauses raise $B_{\text{GRA}}$.
    - Monotone pitch ($\sigma_{F_0,\text{ST}} < 1.5$) or low Whisper word confidence lowers $B_{\text{P}}$.

### Phase 3: Speaking Simulator UI & Diagnostic Dashboard
- **Deliverables**:
  - **AI Model Manager UI**: Progressive download cards with pause/resume, cache size inspector, and 1-click model clear.
  - **Full Mock Test Room**: Examiner TTS avatar/waveform, Part 1 timed Q&A, Part 2 Cue Card with 1-min preparation notepad + 2-min countdown, Part 3 abstract discussion.
  - **Interactive Diagnostic Report**:
    - Word-by-word interactive transcript (click any word to play that exact audio slice!).
    - Color-coded badges for `[0.8s pause]`, `[filler: um]`, `[C1 collocation]`, `[grammar fix]`, and `[low pronunciation confidence]`.
    - Pitch contour graph & 4-pillar Band Score breakdown card.

### Phase 4: Writing, Reading, Listening & FSRS v5 Modules
- **Deliverables**:
  - **Writing Lab**: Task 1 (with SVG charts) & Task 2 split-screen editor, live word count, timer, local 4-criterion rubric grading, and inline sentence diff critique.
  - **Reading & Listening Simulators**: Split-pane passage annotator, all 14 question types, spelling/number answer normalizer, and raw-to-band conversion tables.
  - **FSRS v5 Flashcard Deck**: Automatic card extraction from Speaking/Writing errors + daily review queue.

### Phase 5: Cloudflare Edge Worker, Google OAuth & Multi-Device Sync
- **Deliverables**:
  - Implement `workers/api` with Hono, D1 (`0001_init.sql`), and R2 bindings.
  - Implement Google OAuth 2.0 PKCE + JWKS verification (`/api/auth/google/login`, `/api/auth/google/callback`, `/api/auth/me`, `/api/auth/logout`).
  - Implement `/api/sync/push` and `/api/sync/pull` with HLC conflict resolution and Guest-to-Authenticated local data migration.
  - Implement `/api/audio/:sha256` with 25 MB per-user ring-buffer pruning on R2.
- **Verification**:
  - Miniflare / Wrangler local integration tests verifying multi-device sync (Device A pushes offline attempts $\to$ Device B pulls delta $\to$ states converge identically).
