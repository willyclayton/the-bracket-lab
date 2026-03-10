# Data Schema & Scoring

## File Structure

```
data/
  models/
    the-scout.json          # Bracket picks + reasoning
    the-quant.json          # Bracket picks + probability distributions
    the-historian.json      # Bracket picks + archetype mappings
    the-chaos-agent.json    # Bracket picks + upset scores
    the-agent.json          # Bracket picks + research log
  results/
    actual-results.json     # Real game outcomes (updated live during tournament)
  meta/
    teams.json              # Team metadata (populated after Selection Sunday)
    schedule.json           # Game schedule (optional)
```

## Bracket JSON Schema (per model)

Each model outputs one JSON file following this schema. TypeScript interface in `lib/types.ts`.

```json
{
  "model": "the-scout",
  "displayName": "The Scout",
  "tagline": "Film room intelligence at machine speed.",
  "color": "#3b82f6",
  "generated": "2026-03-19T12:00:00Z",
  "locked": true,
  "espnBracketUrl": "https://fantasy.espn.com/tournament-challenge-bracket/2026/en/entry?entryID=XXXXX",
  "champion": "Duke",
  "championEliminated": false,
  "finalFour": ["Duke", "Arizona", "Michigan", "Florida"],
  "rounds": {
    "round_of_64": [
      {
        "gameId": "R64_E1",
        "region": "East",
        "seed1": 1,
        "team1": "Duke",
        "seed2": 16,
        "team2": "Norfolk State",
        "pick": "Duke",
        "confidence": 0.97,
        "reasoning": "Elite coaching + 5-star talent depth vs. 16-seed with no tournament experience"
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
Format: `{ROUND}_{REGION}{NUMBER}`
- Regions: E (East), W (West), S (South), MW (Midwest) — or whatever the NCAA uses in 2026
- Examples: `R64_E1`, `R64_E2`, ... `R32_E1`, ... `S16_E1`, ... `E8_E1`, `F4_1`, `CHAMP`
- Game IDs must be consistent across all model files and the results file

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
- Each round's games are derived from the previous round's winners
- round_of_64: Determined by NCAA bracket seeding (Selection Sunday)
- round_of_32: Winners of R64 games in each region
- sweet_16: Winners of R32 games in each region
- elite_8: Winners of S16 games in each region
- final_four: Winners of E8 games (region champions)
- championship: Winners of F4 games

## Results JSON Schema

Updated during the tournament as games complete. This is the source of truth for scoring.

```json
{
  "lastUpdated": "2026-03-20T22:30:00Z",
  "currentRound": "round_of_64",
  "games": [
    {
      "gameId": "R64_E1",
      "round": "round_of_64",
      "region": "East",
      "team1": "Duke",
      "seed1": 1,
      "team2": "Norfolk State",
      "seed2": 16,
      "score1": 82,
      "score2": 56,
      "winner": "Duke",
      "completed": true,
      "gameTime": "2026-03-20T12:15:00Z"
    }
  ]
}
```

### Update process
1. Game finishes
2. Add/update game entry in `actual-results.json` with `completed: true` and `winner`
3. `git push` → Vercel redeploys
4. Scoring engine recalculates on next page load

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
- R64: 32 games × 10 = 320
- R32: 16 games × 20 = 320
- S16: 8 games × 40 = 320
- E8: 4 games × 80 = 320
- F4: 2 games × 160 = 320
- Championship: 1 game × 320 = 320
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
  round_of_64: number;   // points earned in this round
  round_of_32: number;
  sweet_16: number;
  elite_8: number;
  final_four: number;
  championship: number;
  total: number;          // sum of all rounds
  correctPicks: number;
  totalPicks: number;
  accuracy: number;       // correctPicks / totalPicks as percentage
}
```

## Important: Team Name Consistency

Team names MUST be exactly the same across all files:
- Model bracket JSONs (`pick`, `team1`, `team2`)
- Results JSON (`team1`, `team2`, `winner`)
- Teams metadata (`name`)

Use official NCAA short names. Be careful with things like "UConn" vs "Connecticut", "St. John's" vs "Saint John's", etc. Define a canonical name list in `teams.json` and reference it everywhere.
