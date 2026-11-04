# Screen 11: Account, Offline Backup & Manual Cloud Sync (`/account`)

> **Route**: `/account`  
> **Design System**: [`../DESIGN.md`](../DESIGN.md) — Sovereign Data Ownership, Side-by-Side Timestamp Comparison, & Mandatory 2-Step Double Confirmation

---

## 1. Screen Purpose

Serve as the single, explicit hub for data portability and cloud synchronization.
1. **Zero Background Requests**: Studying in the app never pings the server. Only visiting `/account` and clicking an action communicates with Cloudflare.
2. **Offline Local Backup (`.ieltsbackup` & `.ielts-archive.zip`)**: Lets guest and logged-in users export/import their progress via files at any time, complete with a **1-Click Rollback** safety net.
3. **Google OAuth 2.0 + Manual Cloud Snapshot Push/Pull**: Lets logged-in users compare their **Local Device Data** vs. **Cloud Snapshot** side-by-side (`Last Updated`, `[NEWER]` / `[OLDER]` badges, session counts) and explicitly overwrite Cloud with Local (`Upload`) or overwrite Local with Cloud (`Pull`) after passing a **Double Confirmation Modal**.

---

## 2. Mandatory UI Elements Checklist

### 2.1 Section A — Manual Cloud Snapshot Sync (Google OAuth 2.0 + Cloudflare D1/R2)

#### State 1: Logged Out (Default Guest Mode)
- [ ] **Editorial Card (`#FFFFFF`, `1px solid #E5DEC9`)**:
  - Title in `Source Serif 4`: *"Optional Multi-Device Cloud Backup"*
  - Privacy & Zero-Background-Sync Notice: *"Your study data is currently stored 100% locally on this device. Sign in with Google only if you want to manually upload or pull your progress snapshot across devices. Zero background requests are ever sent while you study."*
  - Button: **`[G  Sign in with Google (OAuth 2.0 PKCE)]`**.

#### State 2: Logged In with Google
- [ ] **Authenticated Profile Bar (`#F4F0EA`)**:
  - Displays Google Avatar, Name, Email (`rafael.atantya@gmail.com`), `Zero Auto-Sync Mode: Active` pill, and **`[Sign Out]`** button.
- [ ] **Side-by-Side Comparison Arena (2 Equal Columns — `6 Cols` Each)**:
  - **Left Column Card: `💻 This Device (Local OPFS SQLite)`**:
    - **Last Updated Timestamp (`JetBrains Mono`)**: e.g., `04 Nov 2026, 14:30:12 WIB (2 mins ago)`
    - **Comparison Status Badge**:
      - **`[✓ NEWER BY 2 DAYS]`** (`#EAF3EC` bg, `#166534` text) if `local_updated_at > cloud_updated_at`
      - **`[⚠️ OLDER THAN CLOUD]`** (`#FEF3C7` bg, `#92400E` text) if `local_updated_at < cloud_updated_at`
    - **Inventory Breakdown Table (`JetBrains Mono`)**:
      - `Study Sessions`: `24`
      - `Speaking Attempts`: `68 (14.2 MB Opus audio)`
      - `Writing Essays`: `12`
      - `Reading & Listening`: `15`
      - `FSRS Flashcards`: `140 cards`
      - `Device Label`: `Chrome on Windows 11`
  - **Right Column Card: `☁️ Google Cloud Snapshot (Cloudflare D1 + R2)`**:
    - **Last Updated Timestamp (`JetBrains Mono`)**: e.g., `02 Nov 2026, 09:15:44 WIB (2 days ago)` (or `No Cloud Snapshot Uploaded Yet`)
    - **Comparison Status Badge**: **`[OLDER]`** or **`[✓ NEWER]`**
    - **Inventory Breakdown Table (`JetBrains Mono`)**:
      - `Study Sessions`: `19 (-5 vs Local)`
      - `Speaking Attempts`: `52 (-16 vs Local)`
      - `Writing Essays`: `10 (-2 vs Local)`
      - `Reading & Listening`: `14 (-1 vs Local)`
      - `FSRS Flashcards`: `110 cards (-30 vs Local)`
      - `Last Uploaded From`: `Safari on iPhone`
      - `Snapshot Size & Hash`: `640 KB | sha256: 8f3a...91c2`
      - Button: **`[↻ Refresh Cloud Metadata]`** (1 single row read from D1).

- [ ] **Two Explicit Cloud Action Buttons**:
  1. **`[⬆️ Upload Data to Cloud (Replace Cloud with This Device)]`** (`button-primary` `#9A3412`)
  2. **`[⬇️ Pull Data from Cloud (Replace This Device with Cloud)]`** (`button-secondary` `#F4F0EA` / `#1E3A5F`)

---

### 2.2 Mandatory Double-Confirmation Modal (`CloudSyncConfirmModal`)

Triggered whenever the user clicks **`Upload Data to Cloud`** or **`Pull Data from Cloud`**:

- [ ] **Confirmation Step 1 — Visual Diff & Direction Check**:
  - Large directional header:
    - For Upload: **`This Device (04 Nov 14:30)` $\longrightarrow$ `OVERWRITES` $\longrightarrow$ `Cloud Snapshot (02 Nov 09:15)`**
    - For Pull: **`Cloud Snapshot (02 Nov 09:15)` $\longrightarrow$ `OVERWRITES` $\longrightarrow$ `This Device (04 Nov 14:30)`**
  - Delta summary box showing exactly what will be gained or lost (`+5 Study Sessions, +16 Speaking Attempts, +30 FSRS Cards`).
  - Button **`[Proceed to Final Confirmation ->]`** or **`[Cancel]`**.
- [ ] **Confirmation Step 2 — Double Confirmation & Safety Lock**:
  - **Case A (Normal — Overwriting Older Target with Newer Source)**:
    - Checkbox required: `[x] I confirm that I want to replace all data in [Cloud / This Device] with the snapshot from [This Device / Cloud] (Last updated: 04 Nov 2026, 14:30 WIB).`
    - Button: **`[Confirm & Execute Replace Now]`**.
  - **Case B (High-Risk Warning — Overwriting NEWER Target with OLDER Source!)**:
    - Crimson Warning Banner (`#FEE2E2` bg, `#991B1B` border & text):
      *"⚠️ DANGER: The data on [This Device / Cloud] is **2 DAYS NEWER** than the snapshot you are about to overwrite it with! You will lose 5 Study Sessions and 16 Speaking Attempts."*
    - 1-Click Safety Button right inside the modal: **`[💾 Download Local Backup (.ieltsbackup) First]`**.
    - Text Input Lock: User must type **`OVERWRITE`** into the input box to unlock the **`[Confirm Overwrite with Older Data]`** button.

---

### 2.3 Section B — Sovereign Offline File Export, Import & 1-Click Rollback

Works 100% offline without any Google account:

- [ ] **Offline Export Card (Left — 6 Cols)**:
  - **Option 1: Compact Progress Backup (`.ieltsbackup` — `JSON.gz`, `~450 KB`)**:
    - Exports all sessions, transcripts, band scores, writing essays, and FSRS cards + SHA-256 manifest checksum.
    - Button: **`[⬇️ Export .ieltsbackup (Fast JSON.gz)]`**.
  - **Option 2: Full Studio Archive with Voice Recordings (`.ielts-archive.zip` — Streaming ZIP)**:
    - Exports the raw SQLite `.db` binary + JSON dump + all `/audio/attempts/*.opus` voice recordings.
    - Button: **`[📦 Export Full .ielts-archive.zip (Includes Audio)]`**.
- [ ] **Offline Import & Blue-Green Rollback Card (Right — 6 Cols)**:
  - **Drag-and-Drop File Zone (`#F4F0EA` dashed border)**: Accepts `.ieltsbackup` or `.ielts-archive.zip`.
  - Upon dropping a file:
    1. Immediately verifies the `manifest.json` SHA-256 integrity hash and displays the file's `Exported At` timestamp and session count compared to the current device.
    2. Lets the user choose between:
       - **`CRDT/HLC Smart Merge (Recommended)`**: Non-destructively combines sessions from both databases without losing anything.
       - **`Clean Overwrite (Replace Device DB)`**: Atomically swaps `/db/ielts.sqlite3` using the Blue-Green swap protocol.
  - **Automatic 7-Day Rollback Safety Bar (`ielts.rollback.sqlite3`)**:
    - Whenever a `Pull from Cloud` or `File Import` overwrites the local database, the previous database is preserved in OPFS at `/db/ielts.rollback.sqlite3`.
    - Displays: *"Previous local database snapshot from `04 Nov 2026, 14:28` is saved in OPFS rollback slot."* + **`[↺ Undo & Restore Previous Local Database]`** button.
