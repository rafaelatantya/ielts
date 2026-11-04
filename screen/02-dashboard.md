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

---

## 3. Exhaustive Element Specification Table (Exact Copy & Function Lock)

| Element ID | Tag / Component | Exact Verbatim Copy | Design Tokens | Exact Function & SQLite/Worker Binding |
| :--- | :--- | :--- | :--- | :--- |
| `dash-retro-banner` | `<section>` *(Rendered ONLY if `unscoredCount > 0`)* | `You have {unscoredCount} recorded Speaking response(s) saved in 0 MB Lite Mode.` | `card-warm` (`#F4F0EA` bg, `1px solid #C7BFA8`) | Queries `SELECT COUNT(*) FROM speaking_attempts WHERE band_overall = 0 AND audio_opfs_path IS NOT NULL`. |
| `dash-retro-btn` | `<button>` | If Tier 2 Ready: `Score {unscoredCount} Saved Recording(s) Now` / If Not Ready: `Manage Speaking AI Pack (76.2 MB) ->` | `button-primary` (`#9A3412`) | Either triggers batch scoring in `ai-scorer.worker.ts` or navigates to `/features`. |
| `dash-hero-label` | `<span>` | `ESTIMATED OVERALL BAND` | `label-sm` (`12px`, uppercase, `#57534E`) | Static card eyebrow label. |
| `dash-hero-score` | `<div>` | `{overallBand}` *(or `--` if 0 completed sessions)* | `Source Serif 4`, `56px`, `600`, `#1C1917` | Computed using official IELTS half-band rounding over the latest module scores in `study_sessions`. |
| `dash-hero-target-badge` | `<span>` | `Target: {targetBand} ({gapText})` | `mono-metric` (`13px`), `#F4F0EA` bg, `#1C1917` text | Reads `target_band` from `local_meta`. |
| `dash-hero-formula` | `<p>` | If scored: `Official Mean: ({spk} + {wrt} + {rdg} + {lst}) / 4 = {rawMean} -> Band {overallBand}` / If empty: `Complete at least one practice session to calculate your estimated band.` | `mono-metric` (`12px`, `#57534E`) | Shows transparent mathematical calculation. |
| `dash-skill-speaking` | `<article>` | Title: `Speaking` \| Score: `{spkBand}` \| Sub-pills: `FC {fc} · LR {lr} · GRA {gra} · P {p}` | `card-surface` (`#FFFFFF`, `1px solid #E5DEC9`) | Displays latest row from `speaking_attempts` + 10-attempt SVG trend line (`#1E4631`). |
| `dash-skill-writing` | `<article>` | Title: `Writing` \| Score: `{wrtBand}` \| Sub-pills: `TA/TR {ta} · CC {cc} · LR {lr} · GRA {gra}` | `card-surface` (`#FFFFFF`, `1px solid #E5DEC9`) | Displays latest row from `writing_attempts` + 10-attempt SVG trend line. |
| `dash-skill-reading` | `<article>` | Title: `Reading` \| Score: `{rdgBand}` \| Sub-pill: `Latest Raw Score: {raw}/40 ({track})` | `card-surface` (`#FFFFFF`, `1px solid #E5DEC9`) | Displays latest `reading` row from `receptive_attempts`. |
| `dash-skill-listening` | `<article>` | Title: `Listening` \| Score: `{lstBand}` \| Sub-pill: `Latest Raw Score: {raw}/40` | `card-surface` (`#FFFFFF`, `1px solid #E5DEC9`) | Displays latest `listening` row from `receptive_attempts`. |
| `dash-launch-speaking` | `<Link to="/speaking">` | Title: `Speaking Lab` \| Meta: `Part 1, 2 & 3 Simulator · Mic: {activeMicShort}` \| CTA: `Open Speaking Lab ->` | `card-surface`, hover border `#C7BFA8` | Navigates to `/speaking`. |
| `dash-launch-writing` | `<Link to="/writing">` | Title: `Writing Lab` \| Meta: `Task 1 SVG Charts & Task 2 Split Editor` \| CTA: `Open Writing Lab ->` | `card-surface`, hover border `#C7BFA8` | Navigates to `/writing`. |
| `dash-launch-reading` | `<Link to="/reading">` | Title: `Reading Room` \| Meta: `3-Passage Annotator & 14 Question Types` \| CTA: `Open Reading Room ->` | `card-surface`, hover border `#C7BFA8` | Navigates to `/reading`. |
| `dash-launch-listening` | `<Link to="/listening">` | Title: `Listening Room` \| Meta: `4-Section Audio Player & Spelling Normalizer` \| CTA: `Open Listening Room ->` | `card-surface`, hover border `#C7BFA8` | Navigates to `/listening`. |
| `dash-fsrs-card` | `<aside>` | Eyebrow: `FSRS v5 SPACED REPETITION` \| Heading: `{dueTotal} Cards Due Today` | `card-warm` (`#F4F0EA` bg, `1px solid #E5DEC9`) | Queries `SELECT card_type, COUNT(*) FROM srs_cards WHERE is_deleted = 0 AND due_at <= :now GROUP BY card_type`. |
| `dash-fsrs-breakdown` | `<ul>` | Rows: `Pronunciation & IPA: {pronCount}`, `Grammar Cloze Fixes: {gramCount}`, `C1/C2 Collocations: {collocCount}` | `mono-metric` (`13px`, `#57534E`) | Exact breakdown of due cards. |
| `dash-fsrs-cta` | `<Link to="/review">` | If `dueTotal > 0`: `Review {dueTotal} Due Cards ->` / If `0`: `All Caught Up — Browse Deck ->` | `button-forest` (`#1E4631` bg, `#FFFFFF` text) | Navigates to `/review`. |
| `dash-history-table` | `<table>` | Section Title: `Recent Study Sessions` \| Columns: `Date`, `Module`, `Prompt`, `Band`, `Report` | `card-surface` (`#FFFFFF`, `1px solid #E5DEC9`) | Queries last 8 rows from `study_sessions ORDER BY started_at DESC LIMIT 8`. |
| `dash-history-empty` | `<div>` *(When 0 sessions)* | `No study sessions recorded on this device yet. Select a simulator above to begin.` | `body-md` (`#57534E`, centered in table well) | Shown when `study_sessions` is empty. |
| `dash-storage-card` | `<aside>` | Section Title: `Local Data & Backup Status` \| Rows: `OPFS Database: {dbSizeMb} MB`, `Last Local Activity: {lastUpdatedStr}`, `Last File Export: {lastExportStr}` | `card-surface` (`#FFFFFF`, `1px solid #E5DEC9`) | Reads storage stats & `local_meta.last_export_at`. |
| `dash-quick-export-btn` | `<button>` | `Export .ieltsbackup Now` | `button-secondary` (`#F4F0EA` bg, `#1C1917` text) | Triggers immediate download of `.ieltsbackup` (`JSON.gz`) from `db.worker.ts`. |

---

## 4. Forbidden Elements (`DO NOT ADD`)
- **DO NOT** invent fake streak fire emojis (`🔥 7 Day Streak!`), XP points, leaderboards, or gamified avatars.
- **DO NOT** display fake sample scores (`Band 7.5`) when the user's SQLite database has `0` completed attempts—always show `--` until real attempts exist.
