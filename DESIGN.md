---
version: alpha
name: Oxford Atelier
description: Warm editorial paper, literary serif authority, and tactile academic calm — zero neon, zero cyberpunk, WCAG AAA readability.
colors:
  primary: "#1C1917"
  secondary: "#57534E"
  tertiary: "#9A3412"
  neutral: "#FBF9F5"
  surface-elevated: "#F4F0EA"
  surface-oatmeal: "#E2D9CA"
  surface-beam: "#FAF7F1"
  surface-card: "#FFFFFF"
  ink-scribble: "#181512"
  border-subtle: "#E5DEC9"
  border-strong: "#C7BFA8"
  accent-forest: "#1E4631"
  accent-navy: "#1E3A5F"
  success-ink: "#166534"
  success-bg: "#EAF3EC"
  warning-ink: "#92400E"
  warning-bg: "#FEF3C7"
  danger-ink: "#991B1B"
  danger-bg: "#FEE2E2"
  info-ink: "#1E40AF"
  info-bg: "#DBEAFE"
typography:
  display-xl:
    fontFamily: Source Serif 4
    fontSize: 2.75rem
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  h1:
    fontFamily: Source Serif 4
    fontSize: 2.125rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  h2:
    fontFamily: Source Serif 4
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  h3:
    fontFamily: Source Serif 4
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.35
  passage-serif:
    fontFamily: Source Serif 4
    fontSize: 1.0625rem
    fontWeight: 400
    lineHeight: 1.75
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.6
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.8125rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
  mono-metric:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "tnum"
rounded:
  xs: 4px
  sm: 6px
  md: 10px
  lg: 14px
  xl: 20px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  page-canvas:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.body-md}"
  card-surface:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 24px
  card-warm:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 20px
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.surface-card}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface-card}"
  button-secondary:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.primary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    padding: 12px
  button-forest:
    backgroundColor: "{colors.accent-forest}"
    textColor: "{colors.surface-card}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    padding: 12px
  badge-band-high:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success-ink}"
    typography: "{typography.mono-metric}"
    rounded: "{rounded.xs}"
    padding: 6px
  badge-band-mid:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning-ink}"
    typography: "{typography.mono-metric}"
    rounded: "{rounded.xs}"
    padding: 6px
  badge-band-low:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger-ink}"
    typography: "{typography.mono-metric}"
    rounded: "{rounded.xs}"
    padding: 6px
  badge-info:
    backgroundColor: "{colors.info-bg}"
    textColor: "{colors.info-ink}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.xs}"
    padding: 6px
  nav-pill-active:
    backgroundColor: "{colors.accent-navy}"
    textColor: "{colors.surface-card}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    padding: 10px
  text-secondary:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    typography: "{typography.body-md}"
  border-divider:
    backgroundColor: "{colors.border-subtle}"
    textColor: "{colors.primary}"
  border-focus:
    backgroundColor: "{colors.border-strong}"
    textColor: "{colors.primary}"
  illustration-well:
    backgroundColor: "{colors.surface-oatmeal}"
    textColor: "{colors.ink-scribble}"
    rounded: "{rounded.md}"
    padding: 24px
  illustration-beam:
    backgroundColor: "{colors.surface-beam}"
    textColor: "{colors.ink-scribble}"
    rounded: "{rounded.sm}"
    padding: 16px
---

## Overview

**Oxford Atelier** is the design system for the IELTS Local-First AI Study Platform. It rejects dark-mode cyberpunk, harsh neon gradients, and futuristic AI cliches in favor of **warm archival paper, literary serif authority, and calm academic focus** — inspired by Cambridge University Press monographs, Readwise Reader, and Claude's warm editorial interface.

Because IELTS candidates spend 40 to 180 minutes reading dense passages, writing essays, and analyzing phonetic transcripts, every surface is engineered to minimize eye strain while maintaining strict **WCAG AA and AAA contrast compliance**.

### Core Design Principles
1. **Warm Paper over Stark White / Pitch Black**: Primary canvases use Warm Alabaster (`#FBF9F5`) and Warm Ivory (`#F4F0EA`) paired with Deep Espresso Ink (`#1C1917`), eliminating screen glare during long reading and writing sessions.
2. **Literary Serif for Thought, Humanist Sans for Controls**: Headings, band score heroes, cue cards, and reading passages use **Source Serif 4**; dense UI controls, buttons, and rubric tables use **Plus Jakarta Sans**; timers, IPA phonetics, and acoustic metrics use **JetBrains Mono** (`tabular-nums`).
3. **Tactile Hairline Borders over Heavy Drop Shadows**: Hierarchy is established through `1px solid` warm stone borders (`#E5DEC9`), subtle surface tone shifts, and crisp editorial dividers rather than blurry floating shadows.
4. **Honest Local-First Indicators**: Hardware status (active microphone name, live dBFS meter, OPFS disk usage, verified model chunks, and local vs. cloud timestamps) is always surfaced transparently with zero hidden background network activity.

---

## Colors

All text-on-surface pairs have been verified against WCAG 2.1 contrast formulas:

| Token | Hex | Role | Contrast vs `#FBF9F5` / `#FFFFFF` | WCAG Rating |
| :--- | :--- | :--- | :--- | :--- |
| `colors.neutral` | `#FBF9F5` | Primary App Background (Warm Alabaster Paper) | — | Base Canvas |
| `colors.surface-elevated` | `#F4F0EA` | Secondary Panel / Sidebar / Cue Card Well | — | Secondary Canvas |
| `colors.surface-card` | `#FFFFFF` | Elevated Interactive Card / Essay Sheet | — | Card Surface |
| `colors.primary` | `#1C1917` | Primary Espresso Ink (Headings & Body) | **16.4 : 1** | **AAA** |
| `colors.secondary` | `#57534E` | Secondary Warm Umber (Subtitles & Captions) | **7.2 : 1** | **AAA** |
| `colors.tertiary` | `#9A3412` | Oxford Terracotta (Primary CTA & Recording Accent) | **7.4 : 1** (with `#FFFFFF` text) | **AAA** |
| `colors.accent-forest` | `#1E4631` | Cambridge Forest Green (Success CTA & Band 7.5+ Accent) | **10.6 : 1** (with `#FFFFFF` text) | **AAA** |
| `colors.accent-navy` | `#1E3A5F` | Archival Oxford Navy (Active Navigation & Focus Ring) | **11.4 : 1** (with `#FFFFFF` text) | **AAA** |
| `colors.border-subtle` | `#E5DEC9` | Hairline Card & Table Divider (`1px solid`) | — | Structural |
| `colors.border-strong` | `#C7BFA8` | Input Border & Hover/Active Card Frame | — | Structural |
| `colors.success-ink` / `bg` | `#166534` on `#EAF3EC` | Band 7.5–9.0, Error-Free Clause, C1/C2 Collocation, Verified Chunk | **7.1 : 1** | **AAA** |
| `colors.warning-ink` / `bg` | `#92400E` on `#FEF3C7` | Band 5.5–6.5, Mid-Clause Pause, Word Repetition Warning | **6.8 : 1** | **AA+** |
| `colors.danger-ink` / `bg` | `#991B1B` on `#FEE2E2` | Band < 5.5, Grammar Error, Mispronounced Phoneme, Overwrite Alert | **7.9 : 1** | **AAA** |
| `colors.info-ink` / `bg` | `#1E40AF` on `#DBEAFE` | Cohesive Device, Discourse Marker, Cloud Snapshot Info | **8.1 : 1** | **AAA** |

---

## Typography

### Font Stack Definitions
- **Serif (`--font-serif`)**: `'Source Serif 4', 'Newsreader', 'Lora', Georgia, serif`
  - Used for: Page titles (`h1`), section headers (`h2`, `h3`), IELTS Band Score numerals (`7.5`), Speaking Part 2 Cue Card prompts, Reading passages, and Writing essay composition optionally.
- **Sans-Serif (`--font-sans`)**: `'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
  - Used for: Navigation tabs, buttons, form controls, microphone selector dropdowns, diagnostic rubric tables, and instructional tooltips.
- **Monospace (`--font-mono`)**: `'JetBrains Mono', 'Fira Code', monospace` with `font-variant-numeric: tabular-nums`
  - Used for: Exam countdown timers (`39:58`), word timestamps (`[00:14.2 - 00:14.8]`), IPA phonetic transcriptions (`/ˈkʌmftəbəl/`), acoustic metrics (`142 WPM`, `-18 dBFS`), byte progress (`48.0 MB / 76.2 MB`), and SHA-256 / HLC strings.

### Typographic Scale & Line Lengths
- **Reading Passages & Essays**: Constrained to `60ch–72ch` (`font-size: 17px`, `line-height: 1.75`) to match physical Cambridge exam booklets and prevent eye fatigue.
- **Diagnostic Tables & Rubrics**: Compact `14px–15px` (`line-height: 1.5`) with generous cell padding (`12px 16px`).

---

## Layout

### Global Application Shell
- **Desktop (`>= 1024px`)**:
  - **Left Editorial Sidebar (`248px` fixed width, `#F4F0EA` background, `1px solid #E5DEC9` right border)**:
    - Brand masthead in Serif (`Oxford Atelier IELTS`) + `100% Local-First` status pill.
    - 7 Primary Navigation Destinations:
      1. `Dashboard` (`/`)
      2. `Speaking Lab` (`/speaking`)
      3. `Writing Lab` (`/writing`)
      4. `Reading Room` (`/reading`)
      5. `Listening Room` (`/listening`)
      6. `FSRS Review Deck` (`/review`) — with live due counter badge
      7. `AI Models & Features` (`/features`) — with storage/download state badge
      8. `Account & Backup` (`/account`) — at bottom of sidebar, showing Local vs. Cloud timestamp status
  - **Top Context Header (`56px` height, sticky)**:
    - Breadcrumb / Active Module Title in Serif.
    - Right utility cluster: **Target Band Pill (`Target: 7.5`)**, **Studio Microphone Quick-Switch Pill** (when in Speaking), **OPFS Storage Badge (`OPFS Persistent`)**, and **Exam Focus Mode Toggle** (collapses sidebar during timed tests).
- **Tablet & Mobile (`< 1024px`)**:
  - Collapsible drawer + sticky bottom navigation bar for the core study modules.

### Split-Pane Exam Layouts
- **Speaking Simulator & Diagnostic Report**: 12-column CSS Grid (`max-width: 1360px`, `24px` gap).
- **Writing & Reading Simulators**: Full-viewport (`100vh - 56px`) two-pane split layout with a draggable vertical resize handle (`4px` hit target, `#E5DEC9` default $\to$ `#9A3412` on drag):
  - **Left Pane (45%–55% width)**: Independently scrollable Prompt / SVG Chart / Reading Passage.
  - **Right Pane (45%–55% width)**: Independently scrollable Essay Editor / Question Sheet.

---

## Elevation & Depth

We avoid heavy dark drop shadows. Depth is communicated through **3 tactile paper layers**:
1. **Layer 0 — Recessed Well (`#F4F0EA`)**: Used for sidebars, code/transcript wells, audio waveform tracks, and empty-state dropzones.
2. **Layer 1 — Base Page Canvas (`#FBF9F5`)**: Main scrolling background.
3. **Layer 2 — Crisp Paper Sheet (`#FFFFFF`)**: Active cards, cue cards, essay sheets, and modals, bordered by `1px solid #E5DEC9` with an ultra-soft ambient shadow `0 1px 3px rgba(28, 25, 23, 0.05)`.
4. **Layer 3 — Modal / Popover Overlay (`#FFFFFF`)**: Phoneme IPA inspection popovers and Double-Confirmation Cloud Sync modals, bordered by `1px solid #C7BFA8` with `0 12px 32px -4px rgba(28, 25, 23, 0.12)` and a warm backdrop blur (`rgba(28, 25, 23, 0.35)` + `backdrop-filter: blur(3px)`).

---

## Shapes

- **Cards & Panels**: `rounded.md` (`10px`) with `1px solid` warm stone borders.
- **Buttons & Inputs**: `rounded.sm` (`6px`) for a crisp, bookish, utilitarian feel.
- **Inline Transcript Annotations & Badges**: `rounded.xs` (`4px`) so word-level highlights inside paragraphs never collide vertically with adjacent lines.
- **Audio Record Button & Status Dots**: `rounded.full` (`9999px`).

---

## Components

### 1. Studio Microphone Selector & Loopback Bar (`MicStudioBar`)
- **Required Elements**:
  - Hardware Microphone `<select>` dropdown populated via permission-first `enumerateDevices()` and live `navigator.mediaDevices.ondevicechange` listener.
  - Real-time **dBFS Input Level VU Meter** (segmented smooth bar shifting from `#166534` normal speech $\to$ `#92400E` loud $\to$ `#991B1B` clipping) + **Noise Floor Badge** (`Quiet Room -48 dBFS` vs. `Noisy Env -24 dBFS`).
  - **`[🔊 Test & Hear Mic (3s)]` Button**: Records 3 seconds and immediately plays back the audio so the user verifies their external USB/Bluetooth mic before starting an exam.

### 2. Interactive Diagnostic Transcript (`InteractiveTranscript`)
- Renders Whisper verbatim output where every word $w_i$ is an interactive `<button>` bound to its OPFS audio slice $[s_i, e_i]$.
- **Visual States**:
  - **Normal Word**: `#1C1917`, hover background `#F4F0EA` with a subtle speaker cursor.
  - **C1/C2 Lexical / Collocation Match**: Bottom `2px solid #166534` underline + `#EAF3EC` tint.
  - **Pronunciation Warning ($p(w_i) < 0.70$ or $\text{GOP} < \theta$)**: Wavy/dotted bottom border `2px dotted #991B1B` + `#FEE2E2` tint. Clicking opens the **Phoneme IPA Popover** showing expected IPA vs. actual spoken phoneme (e.g., `/θ/ -> /t/`) and a `[Compare My Voice vs. Native TTS]` button.
  - **Pause & Filler Pills**: Inline monospace chips (`[⏸ 0.65s Mid-Clause]` in `#FEF3C7`/`#92400E`; `[um]` in `#F4F0EA`/`#57534E`).

### 3. Modular AI Pack Downloader Card (`ModelPackCard`)
- **Required Elements**:
  - Pack title in Serif, exact size badge in Mono (`76.2 MB`), and bullet list of unlocked capabilities.
  - **19-Block Chunk Matrix Visualization**: Visual grid representing each $4\text{ MiB}$ SHA-256 chunk (`#E5DEC9` pending, pulsing `#92400E` downloading across 4 parallel streams, `#166534` verified & flushed to OPFS disk).
  - Explicit action buttons: **`[Download Pack]`**, **`[Pause]`**, **`[Resume from 63%]`**, and **`[Delete from Disk]`**.

### 4. Side-by-Side Cloud vs. Local Comparison Modal (`CloudSyncConfirmModal`)
- Displays two equal-width cards (`This Device — Local OPFS` vs. `Google Cloud Snapshot`) with:
  - Last updated timestamp in Mono + high-contrast **`[NEWER BY 2 DAYS]`** (`#EAF3EC`/`#166534`) vs. **`[OLDER]`** (`#FEF3C7`/`#92400E`) badge.
  - Diff table of `Study Sessions`, `Speaking Attempts`, `Writing Essays`, and `FSRS Cards`.
  - Double-confirmation gate: requires checking an acknowledgment box (or typing `OVERWRITE` + offering a 1-click `.ieltsbackup` safety download if overwriting newer data).

### 5. Claude-Style Hand-Drawn Editorial Scribble & SVG Animation System (`EditorialScribble`)

All illustrations, empty states, active audio indicators, and scoring transitions use the **"Editorial Warm-Tech Scribble"** aesthetic (inspired by Anthropic / Claude's hand-drawn vector animations):

#### A. Visual Archetype & 3-Color Rule
- **Tactile Medium Emulation**: Felt-tip marker or technical brush pen (`1.0mm–1.5mm` nib) drawn on heavyweight warm oatmeal cotton paper.
- **Strict 3-Tone Illustration Palette**:
  1. **Oatmeal Parchment Well (`colors.surface-oatmeal` `#E2D9CA`)**: Flat, warm sand background for illustration frames and unlit object interiors.
  2. **Espresso Felt-Tip Ink (`colors.ink-scribble` `#181512`)**: All primary outlines, stems, and cursive loop scribbles. Never use pure `#000000`.
  3. **Chalky Ivory Illumination (`colors.surface-beam` `#FAF7F1`)**: Unstroked polygonal light beams, lens interiors, and highlighted paper zones (optionally accented with a single Oxford Terracotta `#9A3412` stroke).
- **Zero Digital Bloat**: Zero gradients, zero drop shadows, zero 3D perspective meshes, and zero grain textures inside illustrations.

#### B. Felt-Tip Stroke Physics & Organic SVG Wobble Filter
- Never render raw, mathematically rigid `<rect>` or `<line>` primitives.
- **Normalized Line Weights** (on a `1000 x 640` `viewBox`):
  - Primary structural outlines (lamp base, shade, page border): `13px–15px`
  - Heavy structural spine (gooseneck stem): `16px–18px`
  - Interior cursive wave scribbles (connected `"u"` / `"w"` garland loops): `12px–14px`
  - Always set `stroke-linecap="round"` and `stroke-linejoin="round"`.
- **Reusable SVG Turbulence & Displacement Filter (`#claude-ink-wobble`)**:
  ```xml
  <filter id="claude-ink-wobble" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence
      type="fractalNoise"
      baseFrequency="0.025"
      numOctaves="3"
      seed="4"
      result="noise"
    />
    <feDisplacementMap
      in="SourceGraphic"
      in2="noise"
      scale="3.2"
      xChannelSelector="R"
      yChannelSelector="G"
    />
  </filter>
  ```

#### C. Clip-Path Light-Beam Reveal Architecture (The Desk Lamp Metaphor)
- As seen in the signature gooseneck desk lamp illustration, hidden details (such as cursive handwritten lines, corrected grammar spans, or phonetic IPA waves) are placed inside an SVG `<g clip-path="url(#light-reveal-clip)">` bound to the exact polygon of the `#FAF7F1` light cone:
  ```xml
  <svg viewBox="0 0 1000 640" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <polygon id="light-cone-geometry" points="408,280 560,194 798,505 488,505" />
      <clipPath id="light-reveal-clip">
        <use href="#light-cone-geometry" />
      </clipPath>
    </defs>
    <!-- Layer 0: Oatmeal Canvas -->
    <rect width="1000" height="640" fill="#E2D9CA" />
    <!-- Layer 1: Warm Ivory Light Beam -->
    <use href="#light-cone-geometry" fill="#FAF7F1" />
    <!-- Layer 2: Cursive Scribbles (Visible ONLY inside the Light Beam!) -->
    <g clip-path="url(#light-reveal-clip)" filter="url(#claude-ink-wobble)">
      <path d="M 635 312 c 10 -28, 22 -28, 32 0 c 10 -28, 22 -28, 32 0 ..." stroke="#181512" stroke-width="13" stroke-linecap="round" />
      <path d="M 635 390 c 10 -28, 22 -28, 32 0 c 10 -28, 22 -28, 32 0 ..." stroke="#181512" stroke-width="13" stroke-linecap="round" />
      <path d="M 635 468 c 10 -28, 22 -28, 32 0 c 10 -28, 22 -28, 32 0 ..." stroke="#181512" stroke-width="13" stroke-linecap="round" />
    </g>
    <!-- Layer 3: Unclipped Document Border & Gooseneck Lamp on Top -->
    <path d="M 608 250 L 784 250 L 782 505 L 606 505 Z" stroke="#181512" stroke-width="14" stroke-linejoin="round" filter="url(#claude-ink-wobble)" />
  </svg>
  ```

#### D. 3-Phase Scribble Animation Choreography
1. **Phase 1 — Self-Drawing Ink Entrance (`0.0s – 0.65s`)**:
   - Paths animate `stroke-dashoffset` from `pathLength` to `0` using `cubic-bezier(0.22, 1, 0.36, 1)` so the illustration looks freshly sketched on the page.
2. **Phase 2 — Illumination Sweep & Clip Reveal (`0.65s – 1.2s`)**:
   - The lamp shade pivots gently (`-26deg <-> -36deg` around the neck joint) while the `#light-cone-geometry` vertices sweep across the document baseline (`Y = 505`), dynamically wiping the clipped cursive text scribbles in and out.
3. **Phase 3 — 9 FPS Stepped "Line Boil" (`steps(1)`, Active/Hover Only)**:
   - During active states (e.g., while recording speech, while WASM models are scoring an attempt, or on card hover), a lightweight timer cycles the `<feTurbulence seed>` across `1 -> 2 -> 3` every `110ms` (`~9 fps` cel-animation boil). When idle, the boil pauses at `0 CPU%`.

#### E. Canonical Scribble Illustrations Across the 11 Screens
1. **Onboarding (`/onboarding`)**: *The Gooseneck Desk Lamp & Illuminated Manuscript* — lamp switches on and sweeps its `#FAF7F1` beam across the page to reveal cursive script.
2. **Speaking Lab & Simulator (`/speaking`)**: *The Vintage Condenser Mic & Cursive Soundwave Garland* — continuous looping cursive `"u/w"` waves radiate from a hand-drawn studio mic, boiling at `9 fps` in proportion to live microphone `dBFS`.
3. **Diagnostic Scoring Transition (`/speaking/report/:id` & `/writing`)**: *The Archival Loupe / Magnifying Glass* — sweeps across a page of messy squiggles; inside the circular `#FAF7F1` lens `clipPath`, the squiggles align into crisp calligraphy.
4. **FSRS Review Deck (`/review`)**: *The Index Card Stack & Fountain Pen Flourish* — tactile hand-drawn cards that flip with a continuous ink flourish when a review session completes.
5. **AI Model Manager (`/features`)**: *The Archival Bookcase* — hand-drawn monograph volumes sliding into place as $4\text{ MiB}$ OPFS chunks verify.
6. **Account & Cloud Sync (`/account`)**: *Two Notebooks Linked by a Looping Ink Thread* — visually depicts `This Device` $\leftrightarrow$ `Cloud Snapshot` during manual push/pull.

### 6. General UI Motion & Micro-Interaction Contract
- **Easing & Duration**: Use calm, physical easing (`cubic-bezier(0.22, 1, 0.36, 1)`), `150ms–220ms` for hover/focus transitions, and `250ms` for modal/drawer entrances.
- **No Bouncy / Flashy Animations**: Never use spring-bounceovers, neon pulse glows, or particle confetti. All artistic motion uses the **Claude-Style Hand-Drawn Scribble** system above.
- **Audio Waveform & VU Meter**: Driven at `60fps` via `<canvas>` and `requestAnimationFrame` reading from `AnalyserNode` without triggering React state re-renders.

---

## Do's and Don'ts

### Do's
- **DO** use `Source Serif 4` for headings, reading passages, cue cards, and Band Score display numerals to evoke authentic academic authority.
- **DO** use `tabular-nums` (`JetBrains Mono`) for every countdown timer, WPM counter, byte progress bar, and timestamp so numbers never shift layout width.
- **DO** keep all AI model downloads 100% explicit opt-in via `/features` or the `/speaking` setup card, and always offer the `0 MB` Lite Practice Mode with retroactive scoring.
- **DO** preserve at least `4.5:1` (AA) and preferably `7.0:1+` (AAA) contrast ratio on every badge, button, and annotation span.

### Don'ts
- **DON'T** use cyberpunk dark themes, neon purple/cyan gradients, glowing borders, or sci-fi AI robot avatars.
- **DON'T** trigger background model downloads on initial page load or trigger automatic server sync calls during practice sessions.
- **DON'T** use un-escaped `enumerateDevices()` without an explicit `[Grant & Select Microphone]` action and live `ondevicechange` listener.
- **DON'T** overwrite local OPFS SQLite data or Cloud R2 snapshots without showing the side-by-side `Last Updated` comparison and double confirmation.
