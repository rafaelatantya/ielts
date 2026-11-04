# Screen 01: First-Time Onboarding & Local-First Setup (`/onboarding`)

> **Route**: `/onboarding` (or rendered as a full-canvas introductory sheet on first visit when `local_meta.onboarding_completed` is not set)  
> **Design System**: [`../DESIGN.md`](../DESIGN.md) — Warm Alabaster Canvas (`#FBF9F5`), Centered Editorial Sheet (`max-width: 680px`, `#FFFFFF`, `1px solid #E5DEC9`)

---

## 1. Screen Purpose

Welcome the user without requiring registration or downloading any AI models upfront. Configure their IELTS target parameters, request persistent local disk storage (`navigator.storage.persist()`), and optionally verify their preferred microphone in under 30 seconds.

---

## 2. Mandatory UI Elements Checklist

### 2.1 Editorial Welcome Header
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
