# Project: Oxford Atelier — Local-First IELTS AI Study Studio

## Source of Truth Documents
1. `DESIGN.md` — Normative **Oxford Atelier** design system (Warm Alabaster Paper `#FBF9F5`, Warm Ivory `#F4F0EA`, Oatmeal Illustration Well `#E2D9CA`, Chalky Beam `#FAF7F1`, Espresso Ink `#1C1917`, Felt-Tip Scribble Ink `#181512`, Oxford Terracotta `#9A3412`, Cambridge Forest `#1E4631`, Oxford Navy `#1E3A5F`). Fonts: `Source Serif 4`, `Plus Jakarta Sans`, `JetBrains Mono` (`tabular-nums`).
2. `screen/00-index.md` — Global App Shell & **Strict Anti-Hallucination UI Contract** (Zero unlisted badges, zero marketing fluff, exact verbatim copy).
3. `screen/01-onboarding.md` .. `screen/11-account-backup-sync.md` — Exhaustive per-screen element specification tables (`Element ID`, `Tag/Component`, `Exact Verbatim Copy`, `Design Tokens`, `Exact Function`).
4. `megaplan.md` — Full system architecture, SQLite-WASM OPFS schema, and Cloudflare Pages/Workers/D1/R2 setup.

## Key Commands
- `pnpm install` — install dependencies
- `pnpm dev` — start Vite dev server
- `pnpm build` — typecheck and build static bundle for Cloudflare Pages (`dist/`)
- `pnpm pages:dev` — preview with Cloudflare Pages (`wrangler pages dev dist`)

## Strict Rules
- Never invent unlisted badges (`"✨ AI Powered"`, `"PRO"`, `"Beta"`, `"🔥 Streak"`).
- Every `Element ID` and `Exact Verbatim Copy` in `screen/*.md` must be implemented with its exact `id` attribute and exact text string.
- Never auto-download AI models on page load.
