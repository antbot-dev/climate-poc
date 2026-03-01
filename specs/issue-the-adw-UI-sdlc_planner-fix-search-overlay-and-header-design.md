# Bug: Search dropdown overlay blocks page + header/logo design is poor

## Bug Description
Two issues visible on the landing page:

1. **Search dropdown overlay**: When typing a commune name/postal code, the "click outside to close" backdrop in `CommuneSearch.vue` uses `bg-ink-50/90` (90% opaque), which covers the entire page with a near-solid beige wash. The chatbot section below the search becomes unreadable. The backdrop should be invisible or nearly so — its only job is to catch click events.

2. **Header/logo design**: The current logo is a dark square with "°C" in it — it looks generic and unpolished. The header banner overall feels flat. The user wants a better visual identity for the top bar.

## Problem Statement
- The search dropdown's dismiss-overlay is visually obtrusive (90% opaque background) instead of transparent.
- The header logo (°C in a dark box) and banner layout lack visual distinction.

## Solution Statement
1. **Overlay fix**: Change the click-outside backdrop from `bg-ink-50/90` to fully transparent (`bg-transparent`) so it captures clicks without obscuring content.
2. **Header redesign**: Replace the °C box logo with a warm, editorial-style SVG mark (a stylised thermometer or heat-wave motif) that fits the book's identity. Refine the header layout with better spacing and a subtle bottom-border treatment.

## Steps to Reproduce
1. Run `npm run dev`, open `http://localhost:3000`
2. Type "72540" in the search field
3. Observe: the entire page below the search is covered by a milky-beige overlay; the "ou posez une question" chatbot section is barely visible behind it
4. Observe the header: the °C logo in a dark square looks generic

## Root Cause Analysis
- **Overlay**: `CommuneSearch.vue` line 46 uses class `bg-ink-50/90` on the fixed click-outside div. `ink-50` is `#faf9f7` at 90% opacity — nearly opaque. This was likely intended to be transparent or very subtle.
- **Header**: The logo is a plain `div` with a `°C` text span inside a dark square — no SVG, no visual craft. The header uses minimal styling with no strong identity.

## Relevant Files
Use these files to fix the bug:

- `components/CommuneSearch.vue` — contains the search dropdown and the offending backdrop overlay (line 46)
- `pages/index.vue` — contains the header markup (lines 7–34) including the logo, title, subtitle, and nav

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Fix the search dropdown overlay opacity
- In `components/CommuneSearch.vue`, change the click-outside backdrop from `bg-ink-50/90` to `bg-transparent`
- This keeps the full-screen click target but removes the visual obstruction
- Verify the dropdown itself (`z-50`) still renders above all other content

### 2. Redesign the header logo and banner
- In `pages/index.vue`, replace the current logo block (the dark square with °C) with an inline SVG that conveys climate/warmth — e.g. a minimal heat-wave or rising-temperature mark using the `heat` palette
- Use `heat-600`/`heat-500` for the SVG strokes to tie into the colour system
- Keep the title "Gérer l'inévitable" and subtitle, but refine spacing
- Ensure the logo + title group still links to `/`
- Ensure the header remains sticky, uses backdrop blur, and the nav links ("Le livre", "Données ouvertes") stay in place

### 3. Visual validation
- Run the dev server, open the app
- Type a commune name — confirm the dropdown appears cleanly with no page-wide overlay
- Click outside — confirm dropdown closes
- Inspect the header — confirm the new logo looks clean and distinct
- Check mobile responsiveness (the logo should scale down gracefully)

### 4. Run validation commands

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cd /Users/antoine/claude/climate-poc && npx nuxt typecheck` — Type-check the project (no TS errors)
- `cd /Users/antoine/claude/climate-poc && npm run build` — Ensure production build succeeds with zero errors
- Manual: open `http://localhost:3000`, type "72540" → dropdown should appear with **no opaque overlay** behind it; chatbot section remains fully visible
- Manual: inspect the header logo — should be a refined SVG mark, not the old °C dark square

## Notes
- No new dependencies needed — the logo is a pure inline SVG
- The fix is surgical: one class change in `CommuneSearch.vue` and a markup swap in the header section of `pages/index.vue`
- The grain texture overlay (`z-50`, pointer-events-none) in `pages/index.vue` line 4 is unrelated and should not be touched
