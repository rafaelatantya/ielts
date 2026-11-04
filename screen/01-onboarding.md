# Screen 01: First-Time Onboarding & Local-First Setup (`/onboarding`)

> **Route**: `/onboarding` (or rendered as a full-canvas introductory sheet on first visit when `local_meta.onboarding_completed` is not set)  
> **Design System**: [`../DESIGN.md`](../DESIGN.md) — Warm Alabaster Canvas (`#FBF9F5`), Centered Editorial Sheet (`max-width: 680px`, `#FFFFFF`, `1px solid #E5DEC9`)

---

## 1. Screen Purpose

Welcome the user without requiring registration or downloading any AI models upfront. Configure their IELTS target parameters, request persistent local disk storage (`navigator.storage.persist()`), and optionally verify their preferred microphone in under 30 seconds.

---

## 2. Mandatory UI Elements Checklist

### 2.1 Editorial Welcome Header & Claude-Style Gooseneck Lamp Scribble Animation
- [ ] **Hero Animated SVG Illustration (`GooseneckLampScribble` — `viewBox="0 0 1000 640"`, height `200px`, `#E2D9CA` Oatmeal Well)**:
  - Hand-drawn felt-tip (`#181512`, `stroke-width: 14px–17px`, `#claude-ink-wobble` displacement filter) gooseneck desk lamp on the left shining a diagonal polygon cone of warm chalky light (`#FAF7F1`) across a rectangular manuscript page on the right.
  - Inside the light beam's `<clipPath id="light-reveal-clip">`, three rows of looping cursive `"u/w"` text scribbles are dynamically revealed as the lamp switches on (`stroke-dashoffset` draw-in over `600ms` followed by a gentle `-28deg <-> -36deg` beam sweep and `9 fps` stepped line boil).
- [ ] **Serif Title (`h1` — `Source Serif 4`, `34px`, `#1C1917`)**: *"Your Private, Local-First IELTS Study Studio."*
- [ ] **Subtitle (`body-md` — `Plus Jakarta Sans`, `#57534E`)**: Explains that 100% of study sessions, recordings, and band diagnostics run locally in the browser on OPFS disk—with zero mandatory login and zero background data drain.
- [ ] **3 Trust Pills (`#F4F0EA` background, `#1C1917` text)**:
  1. `100% Offline-Capable (SQLite OPFS)`
  2. `Zero Auto-Download Quota Drain`
  3. `Sovereign Export / Import (.ieltsbackup)`

### 2.2 Step 1 — IELTS Track & Target Band Selector
- [ ] **Exam Module Segmented Control**:
  - Option A: **IELTS Academic** (default — university admission & professional registration; includes Chart/Graph/Process Task 1).
  - Option B: **IELTS General Training** (migration & work; includes Formal/Informal Letter Task 1).
- [ ] **Target Band Score Picker (`6.0` to `9.0`, step `0.5`)**:
  - Interactive horizontal pill selector (`6.0`, `6.5`, `7.0`, `7.5`, `8.0`, `8.5`, `9.0`) rendered in `JetBrains Mono` (`tabular-nums`).
  - Selecting a band dynamically updates a 1-line descriptor below in `Source Serif 4` italic (e.g., `Band 7.5 — Very Good User: Handles complex language well with detailed reasoning`).
- [ ] **Optional Exam Date Input**:
  - Date picker (`Target Exam Date`) that powers the countdown badge on the Dashboard (`e.g., 42 Days to Exam`).

### 2.3 Step 2 — Local Disk Persistence & Hardware Check Card
- [ ] **Persistent Storage Activator Row**:
  - Displays current browser OPFS quota via `navigator.storage.estimate()` (e.g., `Available Local Storage: 14.2 GB`).
  - Button **`[Lock Persistent Local Storage]`** calling `navigator.storage.persist()` so the browser never auto-evicts SQLite or ONNX models.
  - Status badge transitions from `Unverified` (`#FEF3C7`/`#92400E`) $\to$ `Persistent Storage Locked` (`#EAF3EC`/`#166534`).
- [ ] **Quick Microphone Selector Preview (Optional in Onboarding)**:
  - Button **`[🎙️ Select & Test Preferred Microphone]`**:
    - Calls `navigator.mediaDevices.getUserMedia({ audio: true })` to unlock hardware device names.
    - Renders a `<select>` dropdown of all detected `audioinput` devices + a live `60fps` dBFS input bar so the user can pick their USB/external mic right away and save `preferred_mic_device_id`.

### 2.4 Step 3 — Have Existing Progress? (Quick Restore Link)
- [ ] **Footer Secondary Action**:
  - *"Already have a `.ieltsbackup` file or a Google Cloud Snapshot?"*
  - Two secondary links: **`[Import .ieltsbackup File]`** (opens file picker directly) and **`[Sign in on /account to Pull Cloud Data]`**.

### 2.5 Primary CTA Bar
- [ ] **Primary Button (`button-primary` — `#9A3412` Terracotta)**: **`[Enter Study Studio ->]`**
  - Saves profile to `local_meta` in SQLite-WASM (`exam_track`, `target_band`, `exam_date`, `onboarding_completed = 1`) and navigates to `/` (Dashboard).
- [ ] **Skip Link**: **`[Skip Setup (Use Defaults: Academic, Band 7.5)]`** — never traps the user.

---

## 3. Micro-Interactions & Edge Cases
- **Transition**: Step cards fade in with a subtle `8px` upward slide (`200ms cubic-bezier(0.22, 1, 0.36, 1)`).
- **Incognito Detection**: If `storage.estimate().quota < 150 MB`, display a warm amber notice (`#FEF3C7` bg, `#92400E` text): *"You appear to be in a Private/Incognito window. Local data will be cleared when you close all tabs—remember to Export Backup before exiting."*

---

## 4. Exhaustive Element Specification Table (Exact Copy & Function Lock)

| Element ID | Tag / Component | Exact Verbatim Copy | Design Tokens | Exact Function & SQLite/API Binding |
| :--- | :--- | :--- | :--- | :--- |
| `onb-scribble-hero` | `<GooseneckLampScribble />` | *(Animated SVG — no text inside SVG)* | `viewBox="0 0 1000 640"`, height `190px`, bg `#E2D9CA`, stroke `#181512`, beam `#FAF7F1` | Plays the 3-phase Claude-style Gooseneck Desk Lamp animation (`600ms` `stroke-dashoffset` draw-in + `#FAF7F1` light cone sweeping across the manuscript to reveal 3 rows of cursive scribbles). |
| `onb-title` | `<h1>` | `Your Private, Local-First IELTS Study Studio.` | `h1` (`Source Serif 4`, `32px`, `600`, `#1C1917`) | Static main heading. |
| `onb-subtitle` | `<p>` | `All speaking recordings, essays, and band diagnostics are processed and stored directly on your device using WebAssembly and SQLite. Zero mandatory account, zero background data drain.` | `body-md` (`Plus Jakarta Sans`, `15px`, `#57534E`) | Static explanatory lead paragraph. |
| `onb-pill-1` | `<span>` | `100% Offline SQLite OPFS` | `label-sm` (`12px`), `#F4F0EA` bg, `#1C1917` text, `rounded.xs` | Static trust badge 1. |
| `onb-pill-2` | `<span>` | `Zero Auto-Download Quota Drain` | `label-sm` (`12px`), `#F4F0EA` bg, `#1C1917` text, `rounded.xs` | Static trust badge 2. |
| `onb-pill-3` | `<span>` | `Sovereign .ieltsbackup Export` | `label-sm` (`12px`), `#F4F0EA` bg, `#1C1917` text, `rounded.xs` | Static trust badge 3. |
| `onb-section-1-label` | `<h2>` | `1. Exam Track & Target Band` | `h3` (`Source Serif 4`, `18px`, `600`, `#1C1917`) | Section 1 subheader. |
| `onb-track-academic` | `<button role="radio">` | `IELTS Academic` + subtext `University & Professional Registration (Charts/Graphs Task 1)` | Active: `#FFFFFF` bg, `2px solid #1E3A5F`; Inactive: `#F4F0EA` bg, `1px solid #E5DEC9` | Sets `exam_track = 'academic'` (Default selected). |
| `onb-track-general` | `<button role="radio">` | `IELTS General Training` + subtext `Migration & Work Experience (Formal/Informal Letter Task 1)` | Active: `#FFFFFF` bg, `2px solid #1E3A5F`; Inactive: `#F4F0EA` bg, `1px solid #E5DEC9` | Sets `exam_track = 'general'`. |
| `onb-band-picker` | `<div role="radiogroup">` | Buttons: `6.0`, `6.5`, `7.0`, `7.5`, `8.0`, `8.5`, `9.0` | `mono-metric` (`15px`, `600`), selected: `#1E3A5F` bg + `#FFFFFF` text | Sets `target_band` (Default: `7.5`). |
| `onb-band-desc` | `<p>` | Dynamic lookup (`6.0 Competent User` .. `9.0 Expert User`) | `Source Serif 4` italic (`14px`, `#57534E`) | Updates immediately when a band button is clicked. |
| `onb-exam-date` | `<input type="date">` | Label: `Target Exam Date (Optional)` | `mono-metric` (`14px`), `#FFFFFF` bg, `1px solid #C7BFA8` | Saves ISO date string to `local_meta.exam_date`. |
| `onb-section-2-label` | `<h2>` | `2. Local Storage & Microphone Check` | `h3` (`Source Serif 4`, `18px`, `600`, `#1C1917`) | Section 2 subheader. |
| `onb-storage-status` | `<div>` | `Local Disk Quota: {freeGb} GB available` | `mono-metric` (`13px`, `#1C1917`) | Populated on mount from `navigator.storage.estimate()`. |
| `onb-storage-btn` | `<button>` | Unverified: `Lock Persistent Storage` / Verified: `Persistent Storage Locked ✓` | Unverified: `button-secondary`; Verified: `#EAF3EC` bg + `#166534` text | Calls `navigator.storage.persist()` so the browser never evicts OPFS SQLite or AI models. |
| `onb-mic-btn` | `<button>` | Default: `Prompt Browser & Select Microphone` / Selected: `Active Mic: {deviceLabel}` | `button-secondary` (`#F4F0EA` bg, `#1C1917` text, `1px solid #C7BFA8`) | Calls `navigator.mediaDevices.getUserMedia({ audio: true })`, reveals `<select id="onb-mic-select">` + live dBFS bar, and saves `preferred_mic_device_id`. |
| `onb-restore-btn` | `<button>` | `Already have a .ieltsbackup file? Import Progress` | `label-sm` (`13px`, `#1E3A5F` underline) | Opens hidden `<input type="file" accept=".ieltsbackup,.zip">` to restore a backup immediately. |
| `onb-skip-btn` | `<button>` | `Skip (Use Defaults: Academic, Band 7.5)` | `label-sm` (`13px`, `#57534E`) | Writes default metadata (`academic`, `7.5`, `onboarding_completed = '1'`) to SQLite and navigates to `/`. |
| `onb-submit-btn` | `<button>` | `Enter Study Studio ->` | `button-primary` (`#9A3412` Terracotta bg, `#FFFFFF` text) | Writes selected `exam_track`, `target_band`, `exam_date`, and `onboarding_completed = '1'` to `local_meta` in SQLite and navigates to `/`. |

---

## 5. Forbidden Elements (`DO NOT ADD`)
- **DO NOT** add email/password signup inputs or mandatory Google Login buttons on the Onboarding screen (login lives strictly on `/account`).
- **DO NOT** trigger any AI model downloads during Onboarding (`0 MB` network rule).
