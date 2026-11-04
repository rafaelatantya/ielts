# Screen 09: FSRS v5 Spaced Repetition Review Deck (`/review`)

> **Route**: `/review`  
> **Design System**: [`../DESIGN.md`](../DESIGN.md) — Tactile Index Card Aesthetics, Audio Comparison Playback, & `ts-fsrs` Memory Scheduling

---

## 1. Screen Purpose

Turn every mistake the user makes in Speaking, Writing, Reading, and Listening into long-term mastery using the **FSRS v5 (`ts-fsrs`)** spaced repetition algorithm stored locally in OPFS SQLite (`srs_cards`).

---

## 2. Mandatory UI Elements Checklist

### 2.1 Deck Overview & Filter Bar
- [ ] **Deck Summary Header**:
  - Shows `Due Today` (`#9A3412`), `New` (`#1E40AF`), `Learning` (`#92400E`), and `Mastered (Stability > 21d)` (`#166534`) counts in `JetBrains Mono`.
- [ ] **4 Card Category Filter Pills**:
  1. `All Due Cards (18)`
  2. `🎙️ Pronunciation & IPA Fixes (7)` (auto-created from Wav2Vec2 GOP errors)
  3. `✍️ Grammar & ERRANT Cloze Fixes (6)` (auto-created from Speaking/Writing GEC diffs)
  4. `🏛️ C1/C2 Collocations & Upgrades (5)` (auto-created from lexical upgrades & Reading passages)
- [ ] **Secondary Actions**: **`[+ Create Custom Card]`** and **`[Browse All Cards in SQLite]`**.

### 2.2 Active Flashcard Stage (Centered Index Card `max-width: 680px`, `#FFFFFF`, `1px solid #C7BFA8`)
- [ ] **Card Header Metadata**:
  - Origin badge (e.g., `From Speaking Part 2 — Technology (02 Nov 2026)`), Card Type pill, and current FSRS metrics (`Stability: 4.2d | Difficulty: 5.8`).
- [ ] **Front of Card (Question / Prompt State)**:
  - **For Pronunciation Cards**: Displays the word in `Source Serif 4` (`36px`), the sentence context where the user mispronounced it, and prompts the user to speak it aloud or mentally recall the stress/IPA.
  - **For Grammar Fix Cards**: Displays the user's original sentence with the erroneous span highlighted or blanked as a Cloze deletion (`"In the past decade, technology [change -> ?] the way people communicate."`).
  - **For Collocation Cards**: Displays the B1/B2 concept (`"a very hard process to learn something new"`) and prompts for the target C1 collocation (`"a s____ l_______ c____"`).
- [ ] **Reveal Button**: **`[Spacebar / Click to Reveal Answer]`**.
- [ ] **Back of Card (Revealed State)**:
  - **For Pronunciation Cards**:
    - Target IPA (`/θɪŋk/`) vs. user's previous spoken error (`/tɪŋk/`).
    - Two audio buttons: **`[🔊 Play Native TTS]`** and **`[🎙️ Record & Check GOP Now]`** (lets the user test their pronunciation right on the flashcard!).
  - **For Grammar & Collocation Cards**:
    - Shows the corrected Band 8.5 sentence in `Source Serif 4`, the ERRANT rule explanation, and 2 example sentences.

### 2.3 FSRS v5 4-Button Rating Bar (Bottom of Card)
- [ ] Four keyboard-accessible buttons (`1`, `2`, `3`, `4`) displaying the **exact next review interval** calculated live by `ts-fsrs`:
  1. **`[1 — Again]`** (`#FEE2E2` bg, `#991B1B` text) — e.g., `< 10 mins`
  2. **`[2 — Hard]`** (`#FEF3C7` bg, `#92400E` text) — e.g., `2 days`
  3. **`[3 — Good]`** (`#EAF3EC` bg, `#166534` text) — e.g., `5 days`
  4. **`[4 — Easy]`** (`#DBEAFE` bg, `#1E40AF` text) — e.g., `12 days`
- [ ] Clicking any rating updates `stability`, `difficulty`, `reps`, `lapses`, `state`, and `due_at` in SQLite `srs_cards` and advances smoothly to the next card.
