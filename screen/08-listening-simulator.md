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
