# Data Schema & Scoring

## File Structure

```
data/
  models/                              # 2026 bracket picks (current season)
    the-scout.json
    the-quant.json
    the-historian.json
    the-chaos-agent.json
    the-agent.json
  results/
    actual-results.json                # 2026 real game outcomes (updated live)
  meta/
    teams.json                         # Team metadata (populated after Selection Sunday)
  research/                            # Research data used by models
    historical-teams.json
    seed-history.json
    upset-factors.json
  archive/                             # Completed tournament data
    2025/
      models/                          # 2025 model bracket picks
        the-scout.json
        the-quant.json
        the-historian.json
        the-chaos-agent.json
        the-agent.json
      results/
        actual-results.json            # 2025 verified results (ESPN-sourced)
  README.md                            # Data integrity policy
```

## Data Integrity

**Results data must NEVER be AI-generated.** See `data/README.md` for the full verification policy.

- All game scores must come from ESPN box scores or NCAA.com
- Bracket structure must match the official NCAA bracket
- Model predictions ARE AI-generated (that's the point)
- After play-in games, use actual winners in bracket structure

## Bracket JSON Schema (per model)

Each model outputs one JSON file. TypeScript interface in `lib/types.ts`.

```json
{
  "model": "the-scout",
  "displayName": "The Scout",
  "tagline": "Film room intelligence at machine speed.",
  "color": "#3b82f6",
  "generated": "2025-03-19",
  "locked": true,
  "espnBracketUrl": null,
  "champion": "Florida",
  "championEliminated": false,
  "finalFour": ["Duke", "Houston", "Michigan State", "Florida"],
  "rounds": {
    "round_of_64": [
      {
        "gameId": "r64-south-1",
        "round": "round_of_64",
        "region": "South",
        "seed1": 1,
        "team1": "Auburn",
        "seed2": 16,
        "team2": "Alabama State",
        "pick": "Auburn",
        "confidence": 97,
        "reasoning": "Auburn's interior depth and Johni Broome's dominance..."
      }
    ],
    "round_of_32": [ ... ],
    "sweet_16": [ ... ],
    "elite_8": [ ... ],
    "final_four": [ ... ],
    "championship": [ ... ]
  }
}
```

### Game ID Convention
Format: `{round}-{region}-{number}`
- Rounds: `r64`, `r32`, `s16`, `e8`, `f4`, `championship`
- Regions: `south`, `east`, `midwest`, `west`
- Numbers: 1-8 for R64, 1-4 for R32, 1-2 for S16, no number for E8
- Final Four: `f4-south-west`, `f4-east-midwest`
- Championship: `championship`

Examples: `r64-south-1`, `r32-east-3`, `s16-midwest-2`, `e8-west`, `f4-south-west`, `championship`

Game IDs must be consistent across all model files and the results file.

### Round Keys
```
round_of_64    — 32 games
round_of_32    — 16 games
sweet_16       — 8 games
elite_8        — 4 games
final_four     — 2 games
championship   — 1 game
```

### Bracket Population Rules
- round_of_64: Determined by NCAA bracket seeding (Selection Sunday)
- round_of_32: Winners of R64 games in each region
- sweet_16: Winners of R32 games in each region
- elite_8: Winners of S16 games in each region
- final_four: Winners of E8 games (region champions)
- championship: Winners of F4 games

## Results JSON Schema

Updated during the tournament as games complete. Source of truth for scoring.

```json
{
  "lastUpdated": "2025-04-07T23:59:00Z",
  "currentRound": "completed",
  "games": [
    {
      "gameId": "r64-south-1",
      "round": "round_of_64",
      "region": "South",
      "team1": "Auburn",
      "seed1": 1,
      "team2": "Alabama State",
      "seed2": 16,
      "score1": 83,
      "score2": 63,
      "winner": "Auburn",
      "completed": true,
      "gameTime": "2025-03-20T12:15:00Z"
    }
  ]
}
```

### Update process
1. Game finishes
2. **Verify score from ESPN** (never use AI-generated scores)
3. Add/update game entry in `actual-results.json` with `completed: true` and `winner`
4. `git push` → Vercel redeploys
5. Scoring engine recalculates on next page load

## Teams Metadata

Populated after Selection Sunday (March 15). Used for display and validation.

```json
{
  "teams": [
    {
      "name": "Duke",
      "seed": 1,
      "region": "East",
      "conference": "ACC",
      "record": "28-3",
      "kenpomRank": 2
    }
  ]
}
```

## Scoring Engine

Defined in `lib/scoring.ts`. Runs client-side — compares each model's picks against `actual-results.json`.

### Point values (ESPN-style)
```typescript
const ROUND_POINTS = {
  round_of_64: 10,
  round_of_32: 20,
  sweet_16: 40,
  elite_8: 80,
  final_four: 160,
  championship: 320,
};
```

### Max possible score
- R64: 32 games x 10 = 320
- R32: 16 games x 20 = 320
- S16: 8 games x 40 = 320
- E8: 4 games x 80 = 320
- F4: 2 games x 160 = 320
- Championship: 1 game x 320 = 320
- **Total: 1,920 points**

### Scoring logic
For each completed game in results:
1. Find the corresponding pick in the model's bracket (match by `gameId`)
2. If `pick === winner`, award the points for that round
3. Sum across all rounds for total score
4. Calculate accuracy = correctPicks / totalCompletedGames

### ModelScore output
```typescript
interface ModelScore {
  modelId: string;
  round_of_64: number;
  round_of_32: number;
  sweet_16: number;
  elite_8: number;
  final_four: number;
  championship: number;
  total: number;
  correctPicks: number;
  totalPicks: number;
  accuracy: number;
}
```

## Important: Team Name Consistency

Team names MUST be exactly the same across all files:
- Model bracket JSONs (`pick`, `team1`, `team2`)
- Results JSON (`team1`, `team2`, `winner`)
- Teams metadata (`name`)

Use official NCAA short names. Be careful with things like "UConn" vs "Connecticut", "St. John's" vs "Saint John's", etc. Define a canonical name list in `teams.json` and reference it everywhere.
