# Scout Prime — Matchup Prompt Template

## Structure

Each matchup prompt includes:

1. **Round Context** — Points at stake, number of games, round-specific guidance
2. **Team 1 Profile** — Full statistical profile (efficiency, shooting, rebounding, ball control, context)
3. **Team 2 Profile** — Same structure
4. **Matchup Dynamics** — Computed comparisons (efficiency gap, tempo mismatch, rebounding edge, upset vulnerability)
5. **Historical Context** — Seed matchup history + top 3 historical twins per team

## Expected Response Format

```json
{
  "pick": "Team Name",
  "confidence": 75,
  "reasoning": "2-3 sentences explaining key factors."
}
```

## Data Density

Scout Prime's differentiator: every matchup prompt contains ~30 data points per team plus computed dynamics. This is intentionally dense — the hypothesis is that more context produces better picks than curated subsets.

## Comparison to The Scout

| Dimension | The Scout | Scout Prime |
|-----------|-----------|-------------|
| Factors per team | 6 | ~30 |
| Historical context | None | Top 3 archetype twins |
| Seed history | None | Win rates + trends |
| Upset scoring | None | Pre-computed vulnerability |
| Matchup dynamics | Implicit | Explicitly computed |
