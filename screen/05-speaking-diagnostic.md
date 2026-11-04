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

---

## 3. Exhaustive Element Specification Table (Exact Copy & Function Lock)

| Element ID | Tag / Component | Exact Verbatim Copy | Design Tokens | Exact Function & Data Binding |
| :--- | :--- | :--- | :--- | :--- |
| `rep-title` | `<h1>` | `Speaking Diagnostic Report` | `h1` (`Source Serif 4`, `28px`, `600`, `#1C1917`) | Main report header. |
| `rep-meta-sub` | `<p>` | `Part {part}: {prompt.title} · Recorded {formattedDate} · Duration {mm:ss}` | `mono-metric` (`13px`, `#57534E`) | Reads metadata from `speaking_attempts`. |
| `rep-add-fsrs-btn` | `<button>` | `Add {mistakeCount} Detected Mistakes to FSRS Deck` *(or `Added to FSRS Deck ✓`)* | `button-forest` (`#1E4631` bg, `#FFFFFF` text) | Inserts mispronounced words, ERRANT grammar fixes, and missed target collocations into `srs_cards`. |
| `rep-overall-card` | `<article>` | Eyebrow: `OVERALL SPEAKING BAND` \| Score: `{band_overall}` \| Sub: `95% Calibrator CI: ± 0.25` \| Formula: `({fc} + {lr} + {gra} + {p}) / 4 = {rawMean} -> {band_overall}` | `card-surface` (`#FFFFFF`), score in `Source Serif 4` (`52px`) | Displays calibrated overall band from `speaking_attempts`. |
| `rep-card-fc` | `<article>` | Title: `Fluency & Coherence` \| Band: `{band_fc}` \| Metrics: `Speech Rate: {wpm} WPM · Mean Run (MLR): {mlr} words · Mid-Clause Pauses: {midPauses} · Topic Relevance: {topicPct}%` | `card-surface` (`#FFFFFF`, `1px solid #E5DEC9`) | Binds to `acoustic_metrics_json` & `semantic_metrics_json`. |
| `rep-card-lr` | `<article>` | Title: `Lexical Resource` \| Band: `{band_lr}` \| Metrics: `Diversity (MTLD): {mtld} · C1/C2 Words: {c1Count} · Idioms/Collocations: {collocCount} · Paraphrase: {paraScore}%` | `card-surface` (`#FFFFFF`, `1px solid #E5DEC9`) | Binds to `lexical_metrics_json`. |
| `rep-card-gra` | `<article>` | Title: `Grammatical Range & Accuracy` \| Band: `{band_gra}` \| Metrics: `Error-Free Clauses (EFC): {efcPct}% ({clean}/{total}) · Subordination (SCR): {scr} · Complex Families: {famCount}/10` | `card-surface` (`#FFFFFF`, `1px solid #E5DEC9`) | Binds to `grammar_metrics_json`. |
| `rep-card-p` | `<article>` | Title: `Pronunciation` \| Band: `{band_p}` \| Metrics: `Phoneme GOP: {gopPct}% · Pitch Variation: {f0Std} ST · Rhythm (nPVI): {npvi} · L1 Alerts: {l1Count}` | `card-surface` (`#FFFFFF`, `1px solid #E5DEC9`) | Binds to `acoustic_metrics_json` & `word_timestamps_json`. |
| `rep-audio-bar` | `<div>` | Controls: `[Play / Pause]`, `{currentTime} / {duration}`, Speed pills `0.75x` / `1.0x` / `1.25x` | `card-warm` (`#F4F0EA` bg), `mono-metric` | Streams `/audio/attempts/{attemptId}.opus` from OPFS. |
| `rep-transcript-filters` | `<div>` | Filter toggles: `All Annotations`, `Mid-Clause Pauses ({n})`, `Fillers & Repeats ({n})`, `Pronunciation Alerts ({n})`, `C1/C2 & Collocations ({n})` | `label-sm` (`12px`) pills | Toggles highlight classes in `#rep-transcript-well`. |
| `rep-transcript-well` | `<div>` | Interactive word buttons `{w_i}` + inline pause chips: `[⏸ {sec}s Mid-Clause]` (`#FEF3C7`/`#92400E`), `[⏸ {sec}s Freeze]` (`#FEE2E2`/`#991B1B`), `[Filler: {w}]` (`#F4F0EA`) | `Source Serif 4` (`18px`, `line-height: 2.05`), `#FFFFFF` bg | Clicking any word `w_i` seeks audio to `w_i.start` and plays until `w_i.end`. |
| `rep-phoneme-popover` | `<div role="dialog">` | Header: `"{word}" — Expected: /{ipa_expected}/ · Spoken: /{ipa_actual}/` \| Phoneme GOP bars \| Diagnostic tip \| Buttons: `Hear My Voice ({start}s)` & `Hear Native Pronunciation` | `#FFFFFF` bg, `1px solid #C7BFA8`, `rounded.md` | Opens when clicking any word with `gop < 75` or L1 Indonesian transfer flag (`/θ/->/t/`, `/ð/->/d/`, `/v/->/f/`, missing `-ed`/`-s`). |
| `rep-gec-table` | `<table>` | Section Title: `Grammatical Range & ERRANT Error Analysis` \| Columns: `#`, `Your Spoken Clause`, `Minimal Grammatical Fix (ERRANT Code)`, `Band 8.5 Structural Upgrade` | `card-surface`, red diff `#FEE2E2`/`#991B1B`, green diff `#EAF3EC`/`#166534` | Renders clause-level diffs from `grammar_metrics_json.errors`. |
| `rep-coverage-card` | `<section>` | Section Title: `Prompt Coverage & Band 8.5 Model Comparison` \| Checklist of Cue Card bullets with `Covered ({pct}%)` or `Omitted` badge + expandable `Band 8.5 Model Answer` | `card-surface` | Binds to `semantic_metrics_json.bullet_scores` & `prompt.model_answer_band85`. |
| `rep-prosody-charts` | `<section>` | Left Chart: `Pitch Intonation Contour (Semitones Relative to Speaker Median)` \| Right Chart: `Rolling Speech Rate (WPM) & Stress-Timed Rhythm (nPVI)` | `card-surface`, SVG charts with `#1E3A5F` & `#9A3412` strokes | Renders time-series arrays from `acoustic_metrics_json`. |

---

## 4. Forbidden Elements (`DO NOT ADD`)
- **DO NOT** invent generic AI praise paragraphs without citing specific words, timestamps, or clauses from the user's transcript.
- **DO NOT** use radar spider charts with unlabeled axes—always show the exact numeric metric (`WPM`, `MTLD`, `EFC%`, `ST`, `nPVI`) next to every score.
