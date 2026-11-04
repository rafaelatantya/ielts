# Screen 03: Speaking Lab Lobby & Studio Microphone Setup (`/speaking`)

> **Route**: `/speaking`  
> **Design System**: [`../DESIGN.md`](../DESIGN.md) — Warm Editorial Canvas with dedicated **Studio Microphone Bar** & **Strict Opt-In AI Pack Gate**

---

## 1. Screen Purpose

Serve as the preparation hub before entering a live Speaking simulation. This screen solves the two biggest pain points in browser speech apps:
1. **Zero-Pain Microphone Selection & Testing**: Lets the user explicitly prompt the browser for microphone permissions, pick their exact hardware mic from a live auto-updating list (`ondevicechange`), see a real-time dBFS input meter, and test-record a 3-second loopback clip.
2. **Quota-Safe AI Model Opt-In**: Never auto-downloads the `76.2 MB` Speaking AI Pack without consent. Offers an explicit choice between downloading the pack (with multi-point resume) or practicing immediately in **`0 MB` Lite Recording Mode** (with retroactive scoring later).

---

## 2. Mandatory UI Elements Checklist

### 2.1 Top Studio Microphone Selector & Loopback Tester Card (`MicStudioBar`)
> **Mandatory First-Class Component** — always visible at the top of `/speaking`.

- [ ] **Microphone Permission & Hardware Dropdown**:
  - If microphone permission is not yet granted (`permissionState === 'prompt'`):
    - Renders prominent button **`[🎙️ Prompt Browser & Select Microphone]`** which calls `navigator.mediaDevices.getUserMedia({ audio: true })` and immediately populates the hardware device list.
  - Once granted:
    - Renders a styled `<select>` dropdown listing all `audioinput` devices with their real hardware names (e.g., `FIFINE K669 USB Microphone`, `AirPods Pro Hands-Free`, `Internal Dual-Mic Array`).
    - Subscribes to `navigator.mediaDevices.addEventListener('devicechange', ...)` so plugging/unplugging a USB or Bluetooth mic updates the list instantaneously with a toast notification (`"New microphone detected: FIFINE USB Mic"`).
    - Persists the selected `deviceId` in `localStorage.preferred_mic_device_id`.
- [ ] **Real-Time dBFS Input Level VU Meter & SNR Noise Badge**:
  - `60fps` horizontal canvas bar showing live microphone input volume in `dBFS` (`-60 dBFS` to `0 dBFS`).
  - Color-coded zones: `#166534` (Optimal Speech `-24` to `-6 dBFS`), `#92400E` (Low/Quiet), `#991B1B` (Clipping `> -1 dBFS`).
  - **Ambient Noise Floor Badge**: Automatically measures room silence level (`e.g., Quiet Room (-48 dBFS)` in green `#EAF3EC` vs. `Noisy Background (-22 dBFS)` in amber `#FEF3C7`).
- [ ] **3-Second Loopback Mic Tester (`[🔊 Test & Hear My Mic (3s)]`)**:
  - Clicking records a 3-second sample from the currently selected `deviceId` (`audio: { deviceId: { exact: selectedId } }`), then immediately plays it back through the user's speakers/headphones so they can verify audio clarity before starting the exam.

### 2.2 Contextual AI Scoring Pack Banner (Strict Zero Auto-Download)
- [ ] **State A — Speaking Core AI Pack Not Downloaded (`status !== 'ready'`)**:
  - Warm Ivory Banner (`#F4F0EA`, `1px solid #C7BFA8`) with two clear side-by-side mode cards:
    1. **Card 1: Enable Local AI Auto-Scoring (`76.2 MB` One-Time Download)**:
       - Lists unlocked features: Verbatim Whisper ASR, Silero VAD Pause Analysis, Pitch/Rhythm DSP, and 4-Criterion Band Score.
       - Shows cellular/data-saver warning if `navigator.connection?.saveData` is active.
       - Button: **`[⬇️ Download Speaking AI Pack (76.2 MB)]`** (or **`[⏯️ Resume Download from 63% (48.0 MB saved)]`** if partially downloaded), with inline 19-chunk progress bar and `[Pause]` button.
    2. **Card 2: Practice in 0 MB Lite Mode (Record Now, Score Later)**:
       - Explains that the user can take the full timed test, record their voice to local OPFS (`.opus`), and read Band 8.5 Model Answers using **0 MB of model quota** — then score the recording retroactively whenever they download the AI pack on Wi-Fi.
       - Radio/Toggle: **`[Use 0 MB Lite Mode for This Session]`**.
- [ ] **State B — Speaking Core AI Pack Ready (`status === 'ready'`)**:
  - Compact green badge (`#EAF3EC` bg, `#166534` text): `✓ Local Speaking Auto-Scoring Engine Ready Offline (Whisper + VAD + Prosody DSP)` + link to `/features` to manage or add Tier 3 Deep Phoneme GOP (`36 MB`).

### 2.3 Practice Mode & Pre-Generated Prompt Selector
- [ ] **4 Simulation Mode Tabs**:
  1. **Full Speaking Mock Exam (11–14 mins)**: Complete Part 1 + Part 2 + Part 3 sequence with AI Examiner voice prompts.
  2. **Part 1 Drill (4–5 mins)**: Rapid-fire personal & everyday topic questions (3–4 questions per set).
  3. **Part 2 Cue Card Long Turn (3–4 mins)**: `1-minute` preparation timer + `2-minute` uninterrupted monologue.
  4. **Part 3 Abstract Discussion (4–5 mins)**: Analytical follow-up questions with Band 8.5 model comparisons.
- [ ] **Curated Topic Bank Grid (Filterable by Category & Status)**:
  - Filter pills: `All Topics`, `Technology`, `Environment`, `Education`, `Work & Economy`, `Culture & Media`, `Unpracticed Only`.
  - Prompt Cards (`#FFFFFF`, `1px solid #E5DEC9`):
    - Topic Category badge + Part badge (`Part 2 + Part 3`).
    - Prompt Title in `Source Serif 4` (`19px`, `#1C1917`), e.g., *"Describe a piece of technology (not a phone) that you find particularly useful."*
    - Preview of target C1/C2 collocations (`steep learning curve`, `indispensable tool`).
    - User's best previous Band Score badge on this prompt (if attempted) + **`[Start Practice ->]`** button.

### 2.4 Saved & Unscored Recordings Queue (Bottom Section)
- [ ] Lists past Speaking attempts stored in OPFS (`/audio/attempts/*.opus`), showing:
  - Date, Prompt Title, Duration (`01:54`), Audio Playback Mini-Bar, and Status:
  - Either `Scored: Band 7.0` (`[Open Diagnostic Report]`) OR `Unscored Audio (Lite Mode)` with **`[⚡ Run Auto-Scoring Now]`** button.

---

## 3. Exhaustive Element Specification Table (Exact Copy & Function Lock)

| Element ID | Tag / Component | Exact Verbatim Copy | Design Tokens | Exact Function & WebAudio/SQLite Binding |
| :--- | :--- | :--- | :--- | :--- |
| `mic-bar-title` | `<h3>` | `Studio Microphone & Input Check` | `h3` (`Source Serif 4`, `17px`, `600`, `#1C1917`) | Section title on left of Studio Microphone Bar. |
| `mic-scribble-icon` | `<CondenserMicScribble />` | *(Animated SVG Studio Mic + Cursive Soundwave)* | `48x48px`, stroke `#181512`, bg `#E2D9CA` | Cursive wave loops boil at `9 fps` when input level $> -40\text{ dBFS}$. |
| `mic-grant-btn` | `<button>` *(Shown when permission not granted)* | `Prompt Browser & Select Microphone` | `button-primary` (`#9A3412` bg, `#FFFFFF` text) | Calls `navigator.mediaDevices.getUserMedia({ audio: true })`, then immediately runs `enumerateDevices()` so hardware device labels are unlocked. |
| `mic-device-select` | `<select id="mic-device-select">` *(Shown once granted)* | Options: `{device.label \|\| 'Microphone ' + idx}` | `body-md` (`14px`), `#FFFFFF` bg, `1px solid #C7BFA8`, `min-width: 280px` | Switches active stream via `getUserMedia({ audio: { deviceId: { exact: value } } })`, stops old tracks, and saves `localStorage.preferred_mic_device_id`. Auto-updates on `navigator.mediaDevices.ondevicechange`. |
| `mic-refresh-btn` | `<button>` | `Rescan Mics` | `label-sm` (`12px`), `#F4F0EA` bg, `1px solid #E5DEC9` | Manually re-runs `enumerateDevices()` and reconnects the selected microphone. |
| `mic-vu-canvas` | `<canvas id="mic-vu-meter">` | Label: `Input: {dbValue} dBFS` | `mono-metric` (`12px`), bar colors: `#166534` / `#92400E` / `#991B1B` | `60fps` RMS/Peak meter driven by `AnalyserNode` (`getFloatTimeDomainData`). |
| `mic-noise-badge` | `<span>` | If noise floor $\le -40\text{ dBFS}$: `Quiet Room ({noiseDb} dBFS)` / Else: `Noisy Environment ({noiseDb} dBFS)` | Quiet: `#EAF3EC`/`#166534`; Noisy: `#FEF3C7`/`#92400E` | Measures 500ms minimum RMS floor to warn users before recording in noisy environments. |
| `mic-loopback-btn` | `<button>` | Idle: `Test & Hear My Mic (3s)` / Recording: `Speak Now... ({sec}s)` / Playing: `Playing Back Your Voice...` | `button-secondary` (`#F4F0EA` bg, `#1C1917` text, `1px solid #C7BFA8`) | Records a 3-second blob from the selected `deviceId` and immediately plays it back via `<audio>` so the user hears their exact microphone quality. |
| `spk-gate-ready-pill` | `<div>` *(Shown when Tier 2 status === 'ready')* | `Local Speaking Auto-Scoring Engine Ready Offline (Whisper + Silero VAD + Prosody DSP)` + link `Manage Packs in /features ->` | `#EAF3EC` bg, `#166534` text, `1px solid #166534` | Confirms models are verified in OPFS. |
| `spk-gate-optin-card` | `<div>` *(Shown when Tier 2 status !== 'ready')* | Heading: `Choose How You Want to Practice Speaking Today` \| Subtext: `AI scoring models are never auto-downloaded without your permission.` | `card-warm` (`#F4F0EA` bg, `1px solid #C7BFA8`) | Prevents surprise bandwidth usage. |
| `spk-optin-download-btn` | `<button>` | If 0%: `Download Speaking Auto-Scoring Pack (76.2 MB)` / If paused: `Resume Download from {pct}% ({verifiedMb} MB saved on disk)` | `button-primary` (`#9A3412` bg, `#FFFFFF` text) | Calls `modelDownloader.start('tier2-speaking-core')` across 4 parallel HTTP Range streams into OPFS. |
| `spk-optin-lite-btn` | `<button>` | `Practice in 0 MB Lite Mode (Record Audio Now, Score Later on Wi-Fi)` | `button-secondary` (`#FFFFFF` bg, `#1C1917` text, `1px solid #C7BFA8`) | Sets session mode to `lite_unscored` so the user can practice immediately with 0 MB download. |
| `spk-mode-tabs` | `<div role="tablist">` | 4 Tabs: `Full Mock Exam (Part 1–3)`, `Part 1: Interview`, `Part 2: Cue Card`, `Part 3: Discussion` | Active tab: `#1E3A5F` bg + `#FFFFFF` text | Filters `prompts` query by `part`. |
| `spk-topic-filters` | `<div>` | Pills: `All Topics`, `Technology`, `Environment`, `Education`, `Work & Economy`, `Culture & Society`, `Unpracticed Only` | Active pill: `#1C1917` bg + `#FFFFFF` text | Filters `prompts` query by `category`. |
| `spk-prompt-card-{id}` | `<article>` | Badges: `Part {part}` · `{category}` \| Title: `{prompt.title}` \| Collocations label: `Target Collocations: {c1, c2, c3}` \| CTA: `Start Speaking Session ->` | `card-surface` (`#FFFFFF`, `1px solid #E5DEC9`) | Creates a new row in `study_sessions` and navigates to `/speaking/session/{sessionId}`. |
| `spk-saved-attempts` | `<table>` | Heading: `Saved Speaking Recordings & Reports` \| Columns: `Date`, `Part & Topic`, `Duration`, `Audio Preview`, `Status / Band`, `Action` | `card-surface` | Lists all rows in `speaking_attempts`. Rows with `band_overall = 0` show button `Run Auto-Scoring Now`. |

---

## 4. Forbidden Elements (`DO NOT ADD`)
- **DO NOT** auto-start `modelDownloader` when `/speaking` mounts.
- **DO NOT** hide the microphone `<select>` dropdown inside a buried settings modal—it must always be directly accessible at the top of `/speaking`.
