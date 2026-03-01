# Bug: Search dropdown overlaps with inline chatbot on landing page

## Bug Description
When a user types a commune name/code in the search bar on the landing page, the autocomplete dropdown results visually overlap with the "OU POSEZ UNE QUESTION" separator and the inline chatbot panel below. The dropdown items and the chatbot content appear at the same vertical position, creating a cluttered, broken layout. Expected behavior: the dropdown should fully overlay the chatbot content below, with a clean visual separation.

## Problem Statement
The `CommuneSearch` component creates a stacking context with `z-30` on its wrapper `<div>`. Its dropdown uses `z-50` (absolute) and its click-outside overlay uses `z-40` (fixed), but both are confined within the `z-30` stacking context. Meanwhile, the inline chatbot section below has no z-index constraints, so it paints at the same stacking level, causing the dropdown and chatbot to visually collide.

## Solution Statement
1. Elevate the `CommuneSearch` wrapper's z-index so its dropdown properly overlays sibling content below it.
2. Assign a lower, explicit `relative z-10` to the inline chatbot wrapper so it sits definitively behind the search dropdown.
3. This is a two-line CSS class change — no structural or logic changes needed.

## Steps to Reproduce
1. Open the app with no commune selected (landing page)
2. Type a commune code like `72540` in the search bar
3. Observe the autocomplete dropdown appearing
4. Notice the dropdown results overlap with the "OU POSEZ UNE QUESTION" separator and chatbot suggestion chips below

## Root Cause Analysis
The DOM structure in the hero section is:

```
<section class="relative z-20">           ← hero stacking context
  <div class="max-w-3xl">
    <div class="animate-fade-up-3">
      <CommuneSearch />                    ← wrapper: relative z-30
        dropdown: absolute z-50            ← confined to z-30 context
        click-outside overlay: fixed z-40  ← also confined to z-30 context
    </div>
  </div>
  <div class="max-w-3xl mt-8">            ← chatbot: no z-index (auto)
    separator + <McpChatbot inline />
  </div>
</section>
```

Within the `z-20` section, CommuneSearch's `z-30` stacking context traps the `z-50` dropdown. The chatbot div below has `z-auto`, which means it paints at the same level as other flow content. Because the dropdown is absolutely positioned and extends beyond its parent, it visually collides with the chatbot content at the same painting level.

Fix: bump CommuneSearch to `z-40` and give the chatbot wrapper `relative z-10`, ensuring clear stacking order within the `z-20` section.

## Relevant Files
Use these files to fix the bug:

- `components/CommuneSearch.vue` — Contains the search wrapper with `z-30` class and the dropdown with `z-50`. The wrapper z-index needs to be raised to ensure proper overlay of content below.
- `pages/index.vue` — Contains the hero section layout where CommuneSearch and the inline chatbot are siblings. The chatbot wrapper div needs an explicit lower z-index.

## Step by Step Tasks

### 1. Raise CommuneSearch wrapper z-index
- In `components/CommuneSearch.vue` line 2, change the wrapper class from `z-30` to `z-40`
- This ensures the dropdown (z-50 inside this context) paints above all sibling content

### 2. Lower inline chatbot wrapper z-index
- In `pages/index.vue` line 54, add `relative z-10` to the chatbot wrapper div's class list
- Change: `class="max-w-3xl mt-8 animate-fade-up-3"` → `class="max-w-3xl mt-8 animate-fade-up-3 relative z-10"`
- This explicitly places the chatbot below the search dropdown in the stacking order

### 3. Validate the fix
- Run validation commands below to confirm build passes and visual fix is correct

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cd /Users/antoine/claude/climate-poc && npx nuxi build` — Run full build to confirm no regressions
- Manual: open app, type `72540` in search, confirm dropdown fully overlays the chatbot area below with no visual collision
- Manual: click a result, confirm commune loads and tabs display correctly
- Manual: click outside dropdown to dismiss, confirm chatbot section reappears cleanly

## Notes
- This is a pure CSS stacking fix — two class attribute changes, no JS/logic changes.
- The z-index values chosen (z-40 for search, z-10 for chatbot) leave room for future intermediate layers if needed.
- The header already uses `z-40`, so this keeps the search dropdown at the same visual priority but below the sticky header (which is correct — the header should overlay everything on scroll).
