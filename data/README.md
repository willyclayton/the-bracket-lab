# Data Integrity Policy

## Core Principle

**Results data must NEVER be AI-generated or fabricated.** Every game score, winner, and bracket path in `actual-results.json` must come from a verified sports data source.

## Sources of Truth

### Game Results
- **Primary:** ESPN box scores — `espn.com/mens-college-basketball/game/_/gameId/{id}`
- **Secondary:** NCAA.com official scores, CBS Sports
- **Cross-reference:** Always verify against at least two sources before committing

### Bracket Structure (Teams, Seeds, Regions)
- **Primary:** Official NCAA bracket released on Selection Sunday
- **Play-in corrections:** After First Four games, update the bracket with actual play-in winners (e.g., Xavier won play-in vs Texas for the Midwest 11-seed in 2025)

## Verification Process

1. **Before committing any results data**, verify the score from ESPN or NCAA.com
2. **Include source URLs in commit messages** when adding results (e.g., "Update R64 results — source: ESPN game IDs 401234567, 401234568")
3. **Never rely on AI-generated scores** — even if an AI model "remembers" a score, always verify against an authoritative source
4. **Cross-check bracket paths** — ensure teams advancing match the winners from the previous round

## What IS AI-generated (and that's fine)

- Model predictions (picks, confidence scores, reasoning) — that's the whole point
- Blog content and writeups
- UI components and code

## What is NOT allowed to be AI-generated

- Game scores and final results
- Tournament bracket structure (teams, seeds, regions)
- Team metadata (conferences, records)

## Archive Data

The `data/archive/` directory contains completed tournament data. Even archived data must maintain integrity — it represents the historical record that validates model accuracy.

## 2025 Tournament Data Integrity Note

The 2025 archive data was initially generated with fabricated scores and incorrect team assignments. It was corrected on 2026-03-10 using ESPN-verified box scores for all 63 games. Four teams were corrected in the Round of 64:
- Midwest 9-seed: Georgia (was incorrectly listed as Drake)
- Midwest 11-seed: Xavier (was incorrectly listed as Texas; Xavier won play-in vs Texas)
- West 12-seed: Colorado State (was incorrectly listed as New Mexico State)
- West 11-seed: Drake (was incorrectly listed as Colorado State)
