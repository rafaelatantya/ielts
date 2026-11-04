# Screen 07: Reading 3-Passage Annotator & Evidence Review (`/reading`)

> **Route**: `/reading` (Passage Bank & Split Simulator) & `/reading/report/:attemptId` (Evidence Review)  
> **Design System**: [`../DESIGN.md`](../DESIGN.md) — Literary Serif Passage Typography (`Source Serif 4`), 3-Color Persistent Highlighter, & 1-Click Evidence Span Jump

---

## 1. Screen Purpose

Replicate the computer-delivered IELTS Reading test (3 Passages, 40 Questions, 60 Minutes) with a comfortable, eye-friendly warm paper layout (`#FBF9F5`), persistent text highlighting and margin notes stored in OPFS SQLite, and a post-test review mode that jumps directly to the exact passage sentence proving each answer.

---

## 2. Mandatory UI Elements Checklist

### 2.1 Top Reading Header (`56px` height)
- [ ] **Passage Switcher Tabs**: `Passage 1 (Q1–13)` | `Passage 2 (Q14–26)` | `Passage 3 (Q27–40)`.
- [ ] **Text Size & Line-Spacing Controls**: `A-` / `A` / `A+` (`16px` / `17.5px` / `19px` in `Source Serif 4`).
- [ ] **Monotonic 60-Minute Countdown Timer (`JetBrains Mono`, `tabular-nums`)** + **`[Submit Reading Test ->]`**.

### 2.2 Resizable Two-Pane Reading Workspace (`100vh - 108px`)
- [ ] **Left Pane — Literary Serif Passage Reader (`#FBF9F5` Warm Paper, `65ch` max measure)**:
  - **Paragraph Letter Badges (`A`, `B`, `C`, `D`...)**: Crisp margin labels in `JetBrains Mono` for `Matching Headings` and `Matching Paragraph Information` questions.
  - **Floating Selection Highlighter Popover**:
    - Selecting any phrase in the passage reveals a compact toolbar:
      - `[🟡 Amber Highlight]` (`#FEF3C7`)
      - `[🟢 Sage Highlight]` (`#EAF3EC`)
      - `[🔴 Rose Highlight]` (`#FEE2E2`)
      - `[📝 Add Margin Note]`
      - `[✕ Clear]`
    - All highlights and margin notes are immediately saved to `receptive_attempts.highlights_json` in OPFS SQLite.
- [ ] **Right Pane — Question Sheet (All 14 Official IELTS Question Types)**:
  - Supports:
    1. `True / False / Not Given` & `Yes / No / Not Given` (radio pills)
    2. `Matching Headings` (drag-and-drop heading pills onto paragraph slots or `<select>` fallback)
    3. `Matching Paragraph Information` / `Matching Features` / `Matching Sentence Endings`
    4. `Multiple Choice (Single & Choose TWO/THREE)`
    5. `Summary / Note / Table / Flow-Chart / Diagram Completion` (inline input boxes with strict word-count validation badge, e.g., `ONE WORD ONLY` — warns immediately if user types 2 words!)
    6. `Short-Answer Questions`
  - Each question row includes a **`[🚩 Flag for Review]`** bookmark icon.

### 2.3 Bottom 40-Question Palette Bar (`52px` fixed dock)
- [ ] Compact numbered buttons `1` through `40` in `JetBrains Mono`:
  - **Unanswered**: `#FFFFFF` with `#E5DEC9` border.
  - **Answered**: `#1E3A5F` Oxford Navy fill with white text.
  - **Flagged for Review**: `#92400E` amber corner dot.
  - **Post-Test Review Mode**: `#166534` green (correct) vs. `#991B1B` crimson (incorrect).

### 2.4 Post-Test Evidence Review Mode
- [ ] **Raw Score $\to$ Official Band Conversion Card**: e.g., `35 / 40 Correct -> Band 8.0 (Academic Reading)`.
- [ ] **1-Click `[🔍 Jump to Evidence in Passage]` Button on Every Question**:
  - Clicking smoothly scrolls the Left Passage Pane to the exact `data-evidence-span="q14"`, flashes a warm terracotta border around the sentence, and displays the pre-generated explanation (especially clarifying *why* an answer is **`FALSE`** [contradicts passage] vs. **`NOT GIVEN`** [no information provided]).
- [ ] **1-Click `[+ Save Unknown Passage Vocabulary to FSRS Deck]`**: Double-clicking any academic word in the passage opens its CEFR definition + IPA and lets the user add it to `srs_cards`.

---

## 3. Exhaustive Element Specification Table (Exact Copy & Function Lock)

| Element ID | Tag / Component | Exact Verbatim Copy | Design Tokens | Exact Function & SQLite Binding |
| :--- | :--- | :--- | :--- | :--- |
| `rdg-passage-tabs` | `<div role="tablist">` | Tabs: `Passage 1 (Q1–13)`, `Passage 2 (Q14–26)`, `Passage 3 (Q27–40)` | Active: `#1E3A5F` bg + `#FFFFFF` text | Switches active reading passage and question range. |
| `rdg-font-controls` | `<div>` | Buttons: `A-`, `A`, `A+` | `label-sm` (`12px`), `#F4F0EA` bg, `1px solid #E5DEC9` | Adjusts passage font size (`16px` / `17.5px` / `19px`). |
| `rdg-timer-pill` | `<div>` | `Time Remaining: {mm:ss}` | `mono-metric` (`16px`, `600`, `tabular-nums`) | Monotonic 60-minute wall-clock countdown. |
| `rdg-submit-btn` | `<button>` | `Submit Reading Test ->` | `button-primary` (`#9A3412` bg, `#FFFFFF` text) | Grades all 40 questions deterministically, saves to `receptive_attempts`, and switches to Evidence Review Mode. |
| `rdg-passage-article` | `<article>` | Title: `{passage.title}` \| Paragraphs labeled `A`, `B`, `C`... in margin | Left split pane (`#FBF9F5` bg), `Source Serif 4` (`17.5px`, `line-height: 1.78`, `max-width: 66ch`) | Renders reading passage with `data-evidence-span="q{N}"` anchors. |
| `rdg-highlight-toolbar` | `<div role="toolbar">` *(On text selection)* | Buttons: `Amber`, `Sage`, `Rose`, `Add Note`, `Clear` | Floating pill (`#FFFFFF` bg, `1px solid #C7BFA8`) | Wraps selected DOM range and persists offsets to `highlights_json`. |
| `rdg-question-pane` | `<section>` | Group instruction banner (e.g., `Questions 1–6: Do the following statements agree with the information given in Reading Passage 1?` + `TRUE / FALSE / NOT GIVEN` rules) | Right split pane (`#FFFFFF` bg), `Plus Jakarta Sans` (`15px`) | Renders all 14 official question types with strict word-limit validators on completion inputs. |
| `rdg-bottom-palette` | `<nav>` | 40 buttons: `1` .. `40` + `[Flag Q{active}]` | Fixed bottom bar (`52px`), `mono-metric` (`12px`) | Jumps directly to Question `N` and shows answered/unanswered/flagged status. |
| `rdg-evidence-jump-btn` | `<button>` *(Review Mode only)* | `Jump to Passage Evidence (Paragraph {para}) ->` | `label-sm` (`12px`, `#1E3A5F` bg/border) | Smooth-scrolls `#rdg-passage-article` to `data-evidence-span="q{N}"` and reveals the pre-generated rationale. |

---

## 4. Forbidden Elements (`DO NOT ADD`)
- **DO NOT** show the `Jump to Passage Evidence` buttons or correct/incorrect colors *before* the user clicks `Submit Reading Test ->`.
