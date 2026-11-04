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
