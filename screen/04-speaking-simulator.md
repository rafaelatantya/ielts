# Screen 04: Live Speaking Exam Simulator Room (`/speaking/session/:sessionId`)

> **Route**: `/speaking/session/:sessionId`  
> **Design System**: [`../DESIGN.md`](../DESIGN.md) — Distraction-Free Focus Mode, Literary Serif Cue Card, 60fps Acoustic Waveform, & 2-Second Crash-Safe OPFS Recording

---

## 1. Screen Purpose

Provide an authentic, calm IELTS Speaking test environment covering Part 1, Part 2, and Part 3. Ensures zero data loss if a microphone disconnects or a tab closes mid-speech via 2-second OPFS timeslice flushing, and allows hot-swapping microphones without aborting the session.

---

## 2. Mandatory UI Elements Checklist

### 2.1 Top Exam Control Bar (`56px` height)
- [ ] **Left — Part Progress Stepper**:
  - `Part 1: Interview` $\to$ `Part 2: Cue Card (1m Prep + 2m Talk)` $\to$ `Part 3: Discussion` (or single-part indicator in Drill Mode).
- [ ] **Center — Monotonic Wall-Clock Timer (`JetBrains Mono`, `20px`, `tabular-nums`)**:
  - Displays phase countdown (`Prep: 00:48` in `#92400E` amber; `Speaking: 01:42 / 02:00` in `#1C1917` ink, shifting to `#9A3412` in final 15 seconds).
- [ ] **Right — Live Microphone Hot-Swap Pill & OPFS Flush Indicator**:
  - **Mic Pill**: `🎙️ FIFINE USB Mic [Live dBFS Mini-Meter]`. Clicking opens an inline dropdown to hot-swap microphones mid-session (`getUserMedia` with new `deviceId`).
  - **Crash-Safe Disk Indicator**: Subtle pulse dot `Saved to OPFS (01:24)` updating every 2 seconds as `mediaRecorder.ondataavailable` flushes `.opus` chunks to disk.

### 2.2 Main Stage — Examiner Prompt & Cue Card Sheet
- [ ] **Examiner Audio Prompt Bar (`#F4F0EA` Warm Well)**:
  - Plays pre-generated Opus examiner voice (or local Kokoro TTS) asking the current question.
  - Includes `[🔊 Replay Examiner Question]` button and a toggle `[Show/Hide Question Text]` (so advanced users can practice pure listening comprehension in Part 1 & Part 3 without reading the text first).
- [ ] **Part 2 Official Booklet Cue Card (`#FFFFFF`, `1px solid #C7BFA8`, `padding: 32px`, `max-width: 720px`)**:
  - Rendered strictly in `Source Serif 4` to mirror the physical Cambridge candidate booklet:
    - Main prompt (`22px`, weight `600`, `#1C1917`): *"Describe a piece of technology (not a phone) that you find particularly useful."*
    - *"You should say:"* subheader followed by the 4 bullet points (`17px`, `line-height: 1.7`).
- [ ] **Part 2 Preparation Scratchpad (1-Minute Prep Phase)**:
  - Right/bottom collapsible notepad (`#FBF9F5` paper surface, ruled subtle lines) where the candidate can type quick bullet notes during their 1-minute preparation time (`[Skip Prep & Start Speaking Now]` button included).
  - Notes remain visible while speaking in Part 2.

### 2.3 Recording Deck & Acoustic Waveform Visualizer (Bottom Dock)
- [ ] **60fps Acoustic Waveform & VAD State Canvas**:
  - Smooth vertical bar waveform rendered in Warm Terracotta (`#9A3412`) during active speech and Warm Stone (`#C7BFA8`) during pauses.
  - Real-time **Pace & Audibility Guardrail Hints** (non-intrusive):
    - If 4+ seconds of total silence at start: *"Speak clearly into your microphone..."*
    - If clipping: *"Input level is slightly high—move a few inches back from the mic."*
- [ ] **Primary Recording Controls**:
  - **`[⏹ Finish Answer & Next Question ->]`** (or **`[⏹ Complete & Run Diagnostic Scoring ->]`** on final question).
  - **`[⏸ Pause / Switch Mic]`** and **`[↺ Re-record This Question]`** (available in Drill Mode).

### 2.4 Edge-Case Recovery Modals (Built into Simulator)
- [ ] **Microphone Disconnected Auto-Pause Modal (`AudioTrack.onended`)**:
  - Automatically pauses the monotonic countdown timer and flushes all recorded chunks up to the exact 2-second boundary.
  - Shows: *"Your microphone (`AirPods Pro`) was disconnected at `01:18`. Select another microphone below to resume from `01:18` or finish with the audio recorded so far."*
- [ ] **Insufficient Speech / Silence Gate Modal (`INSUFFICIENT_SPEECH_DETECTED`)**:
  - If the user clicks Finish but Silero VAD detected $< 2.0\text{ seconds}$ of human voice, prevents Whisper from hallucinating (`"Thank you for watching"`) and prompts: *"We detected less than 2 seconds of speech. Check your selected microphone in the top bar and try recording again."*
