# Screen 08: Listening 4-Section Audio Simulator (`/listening`)

> **Route**: `/listening` (Test Bank & Audio Simulator) & `/listening/report/:attemptId` (Transcript Sync Review)  
> **Design System**: [`../DESIGN.md`](../DESIGN.md) — Multi-Section Opus Audio Deck, Word-Limit Guardrails, & Deterministic UK/US Answer Normalizer

---

## 1. Screen Purpose

Simulate the 4-section IELTS Listening exam (`Section 1: Everyday Dialogue`, `Section 2: Public Monologue`, `Section 3: Academic Group Discussion`, `Section 4: University Lecture`) using ultra-compact offline Opus audio (`24 kbps`), strict word-and-number limit validation, and an intelligent post-test answer normalizer.

---

## 2. Mandatory UI Elements Checklist

### 2.1 Top Audio & Section Control Bar (`64px` height)
- [ ] **4-Section Progress Stepper**: `Sec 1 (Q1–10)` | `Sec 2 (Q11–20)` | `Sec 3 (Q21–30)` | `Sec 4 (Q31–40)`.
- [ ] **Exam-Authentic Audio Player (`#F4F0EA` Warm Well)**:
  - **Strict Exam Mode**: Audio plays once continuously (no scrubbing back), including the official `30-second` pre-section reading time countdown (`"You now have 30 seconds to read Questions 1 to 5"`).
  - **Practice / Review Mode**: Unlocks full waveform scrubbing, `0.85x / 1.0x / 1.25x` playback speed, and `[⏪ -5s]` / `[⏩ +5s]` skip buttons.
  - **Volume Slider & Output Speaker Test Button**.

### 2.2 Main Question Sheet (`max-width: 960px`, Centered Paper Sheet `#FFFFFF`)
- [ ] **Instruction Banner with Strict Word-Limit Parser**:
  - Highlights instructions such as **`WRITE NO MORE THAN TWO WORDS AND/OR A NUMBER`** in `#9A3412` Terracotta bold.
  - If the user types 3 words into a `TWO WORDS` field, a subtle inline amber hint (`#92400E`) warns: *"Exceeds 2-word limit"*.
- [ ] **Question Layouts**:
  - Form / Note / Table / Flow-Chart Completion (structured like authentic Cambridge Section 1 booking forms and Section 4 lecture notes).
  - Multiple Choice & Map/Plan Labeling (interactive SVG map with lettered buildings `A–H`).
- [ ] **Scratchpad Margin Notes**: Quick notepad alongside questions for jotting down numbers/spellings while listening.

### 2.3 Post-Test Grading & Answer Normalizer Breakdown
- [ ] **Deterministic Answer Normalizer Engine Inspection**:
  - Grades `0–40` raw score and converts to Band `0.0–9.0`.
  - Shows why a user's answer was accepted or rejected:
    - Accepted equivalences: British vs. American spelling (`colour` = `color`, `theatre` = `theater`), numeric vs. word (`14` = `fourteen`), optional determiners (`(the) library`), and standard date formats (`14th October` = `October 14`).
    - Rejected errors: Spelling mistakes (`accomodation` $\to$ `accommodation` — 1-click button to add misspelled word to FSRS deck!).
- [ ] **Interactive Time-Synced Listening Transcript (Review Mode Only)**:
  - Displays the full dialogue/lecture transcript in `Source Serif 4`.
  - Clicking any sentence jumps the Opus audio player to that exact timestamp, and highlights the exact phrase where `Answer Q17` was spoken (including **Distractor Warnings** explaining how the speaker first said *"Tuesday"* and then corrected themselves to *"Thursday"*!).

---

## 3. Exhaustive Element Specification Table (Exact Copy & Function Lock)

| Element ID | Tag / Component | Exact Verbatim Copy | Design Tokens | Exact Function & SQLite/Audio Binding |
| :--- | :--- | :--- | :--- | :--- |
| `lst-section-tabs` | `<div role="tablist">` | Tabs: `Section 1 (Q1–10)`, `Section 2 (Q11–20)`, `Section 3 (Q21–30)`, `Section 4 (Q31–40)` | Active: `#1E3A5F` bg + `#FFFFFF` text | Switches between the 4 Listening sections. |
| `lst-audio-deck` | `<section>` | Status: `Pre-Section Reading Time: {sec}s` or `Playing Section {n}: {mm:ss} / {total}` \| Mode toggle: `Strict Exam Audio (No Rewind)` vs. `Practice Mode (Scrubbing Enabled)` | `card-warm` (`#F4F0EA` bg, `1px solid #E5DEC9`), `mono-metric` | Plays offline Opus track and enforces official non-scrubbable playback when in Strict Exam Mode. |
| `lst-wordlimit-banner` | `<div>` | `Complete the notes below. Write {wordLimitRule} for each answer.` | `#FEF3C7` bg, `#92400E` text, `label-sm` (`13px`) | Parses word/number count live; shows inline warning `Exceeds {max} word limit` if violated. |
| `lst-question-sheet` | `<article>` | Structured Note/Form/Table/Multiple-Choice/Map inputs `Q1` .. `Q40` | `card-surface` (`#FFFFFF` bg, `max-width: 920px`) | Stores user responses in state and auto-saves to `receptive_attempts`. |
| `lst-submit-btn` | `<button>` | `Submit Listening Answers ->` | `button-primary` (`#9A3412` bg, `#FFFFFF` text) | Runs deterministic UK/US/Number/Date Answer Normalizer and reveals Review Mode. |
| `lst-normalizer-badge` | `<span>` *(Review Mode)* | Correct: `✓ Correct (Accepted: {canonicalVariants})` / Incorrect: `✗ Your Answer: "{userAns}" · Correct: "{correctAns}"` | Correct: `#EAF3EC`/`#166534`; Incorrect: `#FEE2E2`/`#991B1B` | Explains spelling/number normalization or flags misspelling with `[+ Add Spelling to FSRS]`. |
| `lst-transcript-panel` | `<section>` *(Review Mode)* | Section Title: `Time-Synced Audio Transcript & Distractor Notes` \| Clickable dialogue turns `[{mm:ss}] Speaker: ...` | `card-surface`, `Source Serif 4` (`17px`) | Clicking any line seeks audio to `turn.start_sec`; highlights distractor traps in `#FEF3C7`. |

---

## 4. Forbidden Elements (`DO NOT ADD`)
- **DO NOT** reveal the listening transcript while a test is in progress—the transcript panel is strictly locked until after `Submit Listening Answers ->` is clicked.
