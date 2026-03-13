# Bracket View Plan & Learnings

## Issues Found (2025 archive review, 2026-03-12)

### 1. FF Region Mapping Bug (Critical)
**Problem:** `getGamesByRegion()` in `BracketsClient.tsx` only mapped `"national"` to `"ff"`, but model data uses three different region values for Final Four / Championship games:
- `"National"` (some models)
- `"Final Four"` (other models)
- `"Championship"` (championship game)

After `toLowerCase()`, only `"national"` was caught. `"final four"` and `"championship"` created orphan keys that didn't match the `REGIONS` constant (`['east', 'west', 'south', 'midwest', 'ff']`), causing blank FF cards for affected models.

**Fix:** Map all three values to `"ff"`:
```ts
if (region === 'national' || region === 'final four' || region === 'championship') region = 'ff';
```

**Lesson:** When generating bracket JSON from model pipelines, standardize the region field. Use `"National"` for all FF/Championship games. Add a validation step in the pipeline scripts that checks region values against `['East', 'West', 'South', 'Midwest', 'National']`.

### 2. Final Four Layout (Stacked vs Sides)
**Problem:** All FF games and Championship were stacked vertically in a single center column. This doesn't match how real brackets work — each FF semifinal feeds from its two feeder regions.

**Fix:** Split FF games to sides:
- Left FF game (`f4-south-west`) positioned between South/West regions and center
- Right FF game (`f4-east-midwest`) positioned between East/Midwest regions and center
- Championship stays centered between the two FF games

**Lesson:** FF game IDs must follow the `f4-{region1}-{region2}` naming convention so the grid panel can route them to the correct side. The convention is:
- `f4-south-west` — left side semifinal
- `f4-east-midwest` — right side semifinal
- `championship` — center

### 3. Champion Correct/Wrong Styling
**Problem:** Champion display showed model color regardless of whether the pick was correct or wrong.

**Fix:** Added correctness check against `winnerMap['championship']`:
- Correct: green text (`#22c55e`)
- Wrong: red text (`#ef4444`) + `line-through` + slight opacity
- Pending (no result yet): model color (unchanged)

Applied in both:
- Summary strip (BracketsClient.tsx)
- Champion card (BracketGridPanel.tsx)

### 4. Mobile Centering
**Problem:** Region pills and view toggle were left-aligned on mobile.

**Fix:** Added `justify-center` to the mobile controls flex container.

---

## Pre-Launch Checklist (Before Publishing 2026 Brackets)

### Data Validation
- [ ] Every model JSON has `final_four` array with exactly 2 games
- [ ] Every model JSON has `championship` array with exactly 1 game
- [ ] Every model JSON has `champion` field set (non-null)
- [ ] FF game IDs follow `f4-south-west` / `f4-east-midwest` convention
- [ ] Championship game ID is `championship`
- [ ] All region values are one of: `East`, `West`, `South`, `Midwest`, `National`
- [ ] Each region has correct game counts: R64=8, R32=4, S16=2, E8=1

### Visual QA
- [ ] Switch to 2025 year on /brackets, verify all 8 models show FF games on sides
- [ ] Verify champion shows green for Florida (actual 2025 winner) on models that picked Florida
- [ ] Verify champion shows red+strikethrough for models that picked wrong champion
- [ ] Check mobile: pills centered, cards readable, bracket scrollable
- [ ] Check all models' FF cards view shows games (not blank)

### Pipeline Scripts
When generating 2026 brackets, ensure scripts output:
```json
{
  "rounds": {
    "final_four": [
      { "gameId": "f4-south-west", "region": "National", ... },
      { "gameId": "f4-east-midwest", "region": "National", ... }
    ],
    "championship": [
      { "gameId": "championship", "region": "National", ... }
    ]
  },
  "champion": "Team Name"
}
```

---

## Architecture Notes

### Key Files
| File | Responsibility |
|------|---------------|
| `app/brackets/BracketsClient.tsx` | Orchestrator: model tabs, year toggle, data loading, region mapping |
| `components/BracketGridPanel.tsx` | Full bracket visualization (4 regions + FF + championship + champion) |
| `components/BracketCardsPanel.tsx` | Scrollable card stack view by region |
| `components/MatchupPopover.tsx` | Click-to-expand matchup detail overlay |

### Data Flow
1. JSON imports at top of BracketsClient
2. `getGamesByRegion()` normalizes region keys → `GamesByRegion` object
3. `winnerMap` built from results data for correct/wrong styling
4. Both panels receive same data, highlight state syncs via `highlightedMatchId`
