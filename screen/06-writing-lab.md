# Screen 06: Writing Simulator & 4-Criterion Diagnostic Lab (`/writing`)

> **Route**: `/writing` (Prompt Library & Split Editor) & `/writing/report/:attemptId` (Post-Test Diagnostic)  
> **Design System**: [`../DESIGN.md`](../DESIGN.md) — Resizable Split-Screen Layout, SVG Data Chart Renderer, & Inline Red/Green ERRANT Diffs

---

## 1. Screen Purpose

Provide an authentic IELTS Writing environment for **Task 1** ($20\text{ mins}$, $\ge 150\text{ words}$) and **Task 2** ($40\text{ mins}$, $\ge 250\text{ words}$) with 1.5-second OPFS draft auto-saving, followed by a deterministic + ONNX 4-criterion evaluation (`Task Achievement / Task Response`, `Coherence & Cohesion`, `Lexical Resource`, `Grammatical Range & Accuracy`).

---

## 2. Mandatory UI Elements Checklist

### 2.1 Top Exam Header (`56px` height)
- [ ] **Task Switcher Tabs**: `Task 1 (20m — 33% Weight)` vs. `Task 2 (40m — 67% Weight)`.
- [ ] **Monotonic Wall-Clock Timer (`JetBrains Mono`, `tabular-nums`)**:
  - Computes `remaining = deadline_ms - Date.now()` so backgrounding the browser tab never causes timer drift.
- [ ] **Live Word Counter & Threshold Pill (`JetBrains Mono`)**:
  - Displays `Words: 142 / 150 min` in `#92400E` amber when under the official minimum word count, transitioning to `#166534` green once $\ge 150$ (Task 1) or $\ge 250$ (Task 2).
- [ ] **OPFS Auto-Save Indicator**: `✓ Draft saved to OPFS (1.5s debounce)`.
- [ ] **Primary Action (`button-primary` `#9A3412`)**: **`[Submit Essay for Local Scoring ->]`**.

### 2.2 Split-Screen Workspace (`100vh - 56px`, Draggable Divider)
- [ ] **Left Pane (48% Default Width) — Prompt & Visual Data Sheet (`#F4F0EA` / `#FFFFFF`)**:
  - **Academic Task 1**:
    - Prompt instructions in `Source Serif 4` (`17px`).
    - **Crisp Vector SVG Chart / Graph / Table / Process Diagram** rendered using the Oxford Atelier palette (`#1E3A5F` navy, `#9A3412` terracotta, `#1E4631` forest, `#92400E` ochre) with accessible data tooltips.
  - **General Training Task 1**:
    - Letter scenario prompt + 3 bullet points + required register badge (`Formal`, `Semi-Formal`, or `Informal`).
  - **Task 2 Essay**:
    - Curated Cambridge-style essay prompt + essay type badge (`Opinion`, `Discussion + Opinion`, `Problem & Solution`, `Two-Part Question`, `Advantages vs Disadvantages`).
- [ ] **Right Pane (52% Default Width) — Distraction-Free Essay Sheet (`#FFFFFF`)**:
  - Optional typography toggle: `Serif Essay Font (Source Serif 4)` vs. `Official Computer-Delivered Sans (Plus Jakarta Sans)`.
  - Spellcheck disabled during **Strict Exam Mode** (matching official IELTS computer-delivered rules), or enabled in **Guided Practice Mode**.
  - Paragraph counter & per-paragraph word count gutter on the left margin (`P1: 48w`, `P2: 96w`, `P3: 88w`, `P4: 42w`).

### 2.3 Post-Submission 4-Criterion Diagnostic Report View
- [ ] **Weighted Overall Writing Band Card**:
  - Displays Task 1 Band, Task 2 Band, and official weighted calculation:
    $$B_{\text{Writing}} = \text{round}_{0.5}\left( \frac{B_{\text{Task1}} + 2 \cdot B_{\text{Task2}}}{3} \right)$$
- [ ] **4 Criterion Breakdown Cards (`TA/TR`, `CC`, `LR`, `GRA`)**:
  - **Task Achievement (Task 1 Ground-Truth Check)**: Checklist verifying whether the essay included a clear **Overview paragraph**, reported the **key trends/extrema** from the prompt's ground-truth JSON, and made **numerical comparisons** (rather than just listing numbers mechanically).
  - **Task Response (Task 2 Relevance Check)**: `DeBERTa Cross-Encoder` verification that all parts of the prompt were addressed and the conclusion aligns with the thesis.
  - **Coherence & Cohesion (`CC`)**: Highlights paragraph topic sentences, cohesive devices (flagging mechanical/overused linkers at the start of every sentence), and pronoun reference clarity.
  - **Lexical Resource (`LR`)**: Displays `MTLD` diversity score, **Academic Word List (AWL)** highlights, and an interactive **Word Repetition Heatmap** (flags content words repeated $\ge 4$ times with suggested C1 synonyms).
  - **Grammatical Range & Accuracy (`GRA`)**: Inline red/green ERRANT diff view (`harper.js` + `Flan-T5-GEC / DeBERTa-GED`), Error-Free Sentence percentage, and a `1-Click [+ Save Grammar & Vocab Fixes to FSRS Deck]` button.
- [ ] **Curated Band 8.5 Model Essay Tab**:
  - Side-by-side comparison with the pre-generated Band 8.5 model essay from the Question Bank, annotated with structural commentary.
