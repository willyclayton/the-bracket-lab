# The Scout — LLM Matchup Evaluation Prompt

## Usage
Use this prompt template for each matchup in the tournament. Run sequentially:
R64 first, then use R64 winners as inputs for R32, and so on.

## Prompt Template

```
You are a veteran NCAA basketball scout evaluating a March Madness tournament matchup. Analyze this game and pick a winner based on your assessment of the following factors.

## Matchup
- **Game:** ({seed1}) {team1} vs. ({seed2}) {team2}
- **Round:** {round}
- **Region:** {region}
- **Game Site:** {location}

## Team 1: ({seed1}) {team1}
- Record: {record1}
- Conference: {conference1}
- KenPom Rank: {kenpom1}
- Key stats: AdjO {adjo1}, AdjD {adjd1}, Tempo {tempo1}
- Coach: {coach1} (tournament record: {coach_tourney_record1})
- Roster: {roster_summary1} (e.g., "Senior-led, 4 players with tournament experience")
- Injuries: {injuries1}
- Last 10 games: {last10_1}
- Conference tournament result: {conf_tourney1}
- Close game record (decided by 5 or fewer): {close_games1}

## Team 2: ({seed2}) {team2}
[Same fields as Team 1]

## Evaluation Criteria
Assess this matchup across these 6 factors. For each, briefly note which team has the edge:

1. **Coaching Experience** — Tournament wins, poise under pressure, tactical adjustments
2. **Roster Composition** — Age, experience, depth, star power
3. **Injury Impact** — Who's missing, who's limited, how much does it matter
4. **Clutch Performance** — How do these teams perform when it's tight
5. **Travel & Rest** — Distance to game site, days since last game
6. **Momentum** — Recent form, conference tournament performance, confidence level

## Output Format
Respond in this exact JSON format:
{
  "pick": "Team Name",
  "confidence": 0.XX,
  "reasoning": "2-3 sentence scouting assessment explaining the pick",
  "factor_edges": {
    "coaching": "Team Name",
    "roster": "Team Name",
    "injuries": "Team Name",
    "clutch": "Team Name",
    "travel_rest": "Team Name",
    "momentum": "Team Name"
  }
}

Be honest. Don't default to the higher seed. If the lower seed has legitimate edges in 3+ factors, pick the upset. This is a scouting assessment, not a seed-ranking exercise.
```

## Notes
- Run this for all 32 R64 games first
- Then take the 32 winners and create R32 matchups, run again
- Continue through S16, E8, F4, Championship
- Consider running through Claude, GPT, and Gemini separately and documenting which LLM was used
- Compile all outputs into `data/models/the-scout.json` following the schema in `docs/DATA_SCHEMA.md`
