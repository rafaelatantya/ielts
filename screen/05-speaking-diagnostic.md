# Screen 05: Speaking 5-Panel Diagnostic Report (`/speaking/report/:attemptId`)

> **Route**: `/speaking/report/:attemptId`  
> **Design System**: [`../DESIGN.md`](../DESIGN.md) — Academic Assessment Monograph Layout, Interactive Word-Timestamp Audio Player, & Phoneme/Grammar Diffs

---

## 1. Screen Purpose

Deliver the most detailed, transparent IELTS Speaking evaluation possible—combining **macro Band Score accuracy** (from Stage 2 Trained QWK Calibrator) with **microscopic word- and phoneme-level feedback** (from Stage 1's 5 Specialist Models). Every score is backed by clickable acoustic and textual evidence.

---

## 2. Mandatory UI Elements Checklist

### 2.1 Top Band Score Summary Masthead
- [ ] **Overall Speaking Band Hero Card (`#FFFFFF`, `1px solid #E5DEC9`)**:
  - Overall Band Score in `Source Serif 4` (`52px`, `#1C1917`), e.g., **`7.0`**, with 95% Psychometric Confidence Interval (`± 0.25`) in `JetBrains Mono`.
  - Official rounding formula pill: `(FC 7.5 + LR 7.5 + GRA 7.0 + P 6.5) / 4 = 7.125 -> 7.0`.
- [ ] **4 Official Criterion Cards (`25%` weight each)**:
  1. **Fluency & Coherence (`FC`)**: Band Score + key metrics (`136 WPM`, `MLR: 9.4 words`, `2 mid-clause pauses`, `Topic Relevance: 88%`).
  2. **Lexical Resource (`LR`)**: Band Score + key metrics (`MTLD: 78.2`, `6 C1/C2 words`, `4 IELTS collocations`, `Paraphrase Score: High`).
  3. **Grammatical Range & Accuracy (`GRA`)**: Band Score + key metrics (`Error-Free Clauses: 84% (27/32)`, `Subordination SCR: 0.34`, `4/10 Complex Families`).
  4. **Pronunciation (`P`)**: Band Score + key metrics (`Phoneme GOP: 86%`, `Pitch Expressiveness: 2.9 ST`, `Stress-Timed Rhythm nPVI: 54.2`).
- [ ] **Primary Action Button (`button-forest` `#1E4631`)**:
  - **`[+ Add 6 Detected Mistakes to FSRS Flashcard Deck]`** (one-click extraction of mispronounced words, grammar fixes, and collocations into `srs_cards`).

### 2.2 Panel 1 — Interactive Click-to-Replay Verbatim Transcript
- [ ] **Synced Opus Audio Player Bar**:
  - Plays the user's full recording from OPFS (`/audio/attempts/{id}.opus`) with `0.75x / 1.0x / 1.25x` speed controls and a toggle **`[Skip Silence]
`**.
- [ ] **Filter Legend Bar**:
  - Toggle switches to highlight/filter: `[✓ All Annotations]`, `[⏸ Mid-Clause Pauses]`, `[💬 Fillers & Repeats]`, `[🔴 Pronunciation GOP Warnings]`, `[🟢 C1/C2 & Collocations]`.
- [ ] **Word-by-Word Interactive Transcript Well (`Source Serif 4`, `18px`, `line-height: 2.0`)**:
  - **Clicking ANY word $w_i$** seeks the audio player to `[s_i, e_i]` and plays that exact word in the user's voice.
  - **Inline Pause Chips**:
    - Natural clause-boundary pause: subtle grey dot `·` (0 penalty).
    - Mid-clause hesitation pause ($\ge 0.40\text{ s}$ inside a phrase): amber badge `[⏸ 0.65s Mid-Clause]` (`#FEF3C7` bg, `#92400E` text).
    - Long freeze pause ($\ge 1.20\text{ s}$): crimson badge `[⏸ 1.45s Freeze]` (`#FEE2E2` bg, `#991B1B` text).
  - **Verbatim Disfluency Chips**: Fillers (`[um]`, `[uh]`) and stutters (`[I- I]`) badged in `#F4F0EA`.
  - **C1/C2 & Collocation Highlights**: Underlined in `#166534` with hover tooltip showing CEFR level (`C1 — Oxford 5000`).

### 2.3 Panel 2 — Phoneme IPA & Indonesian L1 Interference Inspector (Popover + Table)
- [ ] **Interactive Phoneme Popover (Triggered on clicking a red/amber underlined word)**:
  - Word header + Expected IPA (`/θɪŋk/`) vs. Detected Spoken IPA (`/tɪŋk/`).
  - Per-phoneme Goodness of Pronunciation ($\text{GOP}$) bars:
    - `/θ/`: `32%` (`#991B1B` — *"Substituted with dental stop `/t/`. Place tongue tip lightly between upper and lower teeth and blow air continuously."*)
    - `/ɪ/`: `94%` (`#166534`)
    - `/ŋ/`: `89%` (`#166534`)
    - `/k/`: `91%` (`#166534`)
  - Side-by-side Audio Comparison Buttons: **`[▶️ Hear My Pronunciation]`** vs. **`[🔊 Hear Native Model (TTS)]`**.
- [ ] **Summary Table of L1 Transfer & Inflectional Coda Alerts**:
  - Specifically lists words where final `-ed` (`/t, d, ɪd/`) or `-s` (`/s, z, ɪz/`) was dropped, or `/θ, ð, v, ʃ/` was substituted.

### 2.4 Panel 3 — ERRANT Grammatical Error Correction (GEC) & Band 8.5 Sentence Upgrades
- [ ] **Clause-by-Clause Diff Table (`Flan-T5-small-GEC` + `DeBERTa-GED` + `harper.js`)**:
  - For every clause containing an error or upgrade opportunity:
    - **Column 1 (Your Spoken Clause)**: With strikethrough red spans (`#FEE2E2`/`#991B1B`), e.g., *"In the past decade, technology ~~change~~ the way people ~~communicated~~."*
    - **Column 2 (Minimal Grammatical Fix + ERRANT Tag)**: With green spans (`#EAF3EC`/`#166534`), e.g., *"...technology **has changed** `[R:VERB:TENSE]` the way people **communicate**."*
    - **Column 3 (Band 8.5 Structural & Lexical Upgrade)**: Shows how to elevate the clause using advanced syntax (e.g., *participial clause* or *cleft structure*).
- [ ] **10-Family Syntactic Range Checklist**:
  - Visual checklist showing which of the 10 complex grammar families the user successfully used (`✓ Relative Clauses`, `✓ Conditionals`, `✓ Passive Voice`, `✗ Cleft Sentences`, `✗ Participial Clauses`).

### 2.5 Panel 4 — Discourse Coherence & Cue Card Bullet Coverage (`DeBERTa Cross-Encoder`)
- [ ] **Prompt Completeness Checklist**:
  - Lists each sub-question or Part 2 Cue Card bullet point with an entailment badge:
    - `✓ Covered (92% match)` + quote of the user's matching sentence.
    - `⚠️ Partially Covered (48% match)` or `✗ Omitted (12% match — penalized in FC)`.
- [ ] **Pre-Generated Band 8.5 Model Answer Comparison**:
  - Expandable side-by-side view of the curated Band 8.5 Model Answer from the Question Bank with highlighted target collocations and discourse markers.

### 2.6 Panel 5 — Acoustic Prosody Charts (Pitch $F_0$ Semitones & WPM Pacing)
- [ ] **Intonation Contour Chart (`Canvas` / `SVG`)**:
  - Plots speaker-normalized pitch $f_{\text{ST}}(t)$ in semitones over time alongside the target expressive band ($\pm 2.5\text{ to }4.5\text{ ST}$), visually highlighting flat/monotone segments.
- [ ] **Rolling 15-Second Speech Rate ($\text{WPM}$) & Rhythm ($\text{nPVI}$) Chart**:
  - Shows where the candidate spoke smoothly ($130\text{--}160\text{ WPM}$) vs. where speed dropped due to lexical searching.
