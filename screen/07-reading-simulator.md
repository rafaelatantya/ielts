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
