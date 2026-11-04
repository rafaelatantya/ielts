# Screen 02: Study Command Center — Dashboard (`/`)

> **Route**: `/`  
> **Design System**: [`../DESIGN.md`](../DESIGN.md) — 12-Column Editorial Grid (`max-width: 1360px`, `24px` gap)

---

## 1. Screen Purpose

Provide an immediate, calm academic overview of the candidate's current estimated IELTS Band Score across all 4 skills (`Speaking`, `Writing`, `Reading`, `Listening`), surface due FSRS flashcards, highlight any unscored offline voice recordings waiting for retroactive evaluation, and offer 1-click entry into any exam simulator.

---

## 2. Mandatory UI Elements Checklist

### 2.1 Top Masthead & Readiness Banner
- [ ] **Editorial Greeting (`h1` in `Source Serif 4`)**: e.g., *"Study Command Center"* + current date and exam countdown pill (`42 Days to IELTS Academic`).
- [ ] **Conditional Retroactive Scoring Banner (Only visible if `speaking_attempts` has rows with `status = 'unscored_audio'`)**:
  - Warm Ivory card (`#F4F0EA`, `1px solid #C7BFA8`) showing: *"You have **3 recorded Speaking responses** saved in Lite Mode (`0 MB`)."*
  - If the Speaking AI Pack is now `ready` on disk: shows **`[⚡ Score 3 Saved Recordings Now]`**.
  - If the Speaking AI Pack is not downloaded yet: shows **`[Download Speaking AI Pack (76.2 MB) on Wi-Fi to Score]`** linking to `/features`.

### 2.2 Row 1 — Band Score Hero & 4-Skill Breakdown (12 Columns)
- [ ] **Left Card (5 Cols): Overall Estimated Band Hero (`#FFFFFF`, `1px solid #E5DEC9`)**:
  - Large display numeral in `Source Serif 4` (`56px`, `#1C1917`), e.g., **`7.0`**, with target comparison badge (`Target: 7.5 — Gap: +0.5`).
  - Official IELTS rounding formula breakdown caption: `Average of 4 Skills: (7.5 + 6.5 + 7.5 + 7.0) / 4 = 7.125 -> Band 7.0`.
  - Empty State (0 attempts): Shows `--` with a calm prompt to complete a 3-minute diagnostic drill.
- [ ] **Right Card (7 Cols): 4-Pillar Skill Cards (`Speaking`, `Writing`, `Reading`, `Listening`)**:
  - 4 equal sub-cards in a 2x2 or 4-column grid, each displaying:
    - Skill Name (`Source Serif 4`, `18px`) + Latest Band Score (`JetBrains Mono`, `24px`).
    - 4 sub-criterion mini-bars for Speaking (`FC`, `LR`, `GRA`, `P`) and Writing (`TA/TR`, `CC`, `LR`, `GRA`), or Raw Score (`34/40`) for Reading/Listening.
    - SVG Trend Sparkline of the last 10 sessions (`#1E4631` stroke).

### 2.3 Row 2 — Quick-Start Exam Simulators & Daily FSRS Review (12 Columns)
- [ ] **4 Module Launch Cards (8 Cols — 2x2 Grid)**:
  1. **Speaking Lab (`/speaking`)**: Shows current mic status (`🎙️ FIFINE USB Mic`), AI Pack status badge (`Ready` or `Lite 0MB`), and **`[Start Part 1/2/3 Drill ->]`**.
  2. **Writing Lab (`/writing`)**: Shows prompt count (`40 Academic Task 1 Charts & 60 Task 2 Prompts`) and **`[Open Split Editor ->]`**.
  3. **Reading Simulator (`/reading`)**: Shows passage count and **`[Start Timed Passage ->]`**.
  4. **Listening Simulator (`/listening`)**: Shows audio section count and **`[Start Audio Test ->]`**.
- [ ] **FSRS v5 Spaced Repetition Due Card (4 Cols — `#F4F0EA` Warm Well)**:
  - Displays total cards due today in `Source Serif 4` (`36px`, e.g., **`18 Cards Due`**), broken down by error origin:
    - `7 Pronunciation & IPA Cards`
    - `6 Grammar Cloze Fixes`
    - `5 C1/C2 Collocation Upgrades`
  - Primary Forest CTA (`button-forest` `#1E4631`): **`[Review Due Cards (Est. 4 mins) ->]`** (navigates to `/review`).

### 2.4 Row 3 — Recent Study Sessions & Local Backup Health (12 Columns)
- [ ] **Recent Attempts Table (8 Cols)**:
  - Columns: `Date/Time` (`JetBrains Mono`), `Module` (`Speaking P2`, `Writing T2`, etc.), `Prompt Title` (`Source Serif 4`), `Band Score` (semantic badge), and `Action` (`[View Diagnostic Report]`).
- [ ] **Local-First Data Health Card (4 Cols)**:
  - Shows `Local OPFS DB Last Updated: 04 Nov 2026, 14:30` (`JetBrains Mono`).
  - Shows `Last Manual Backup (.ieltsbackup): 3 days ago` + **`[1-Click Export .ieltsbackup]`** quick button.
  - Shows `Cloud Snapshot (/account): Not Logged In` (or `Cloud Last Updated: 02 Nov 2026`).
