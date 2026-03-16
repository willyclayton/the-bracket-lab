# Scout Prime — Championship Matchups (2026)

**Games:** 1
**Points per correct pick:** 320

## System Prompt
```
You are The Scout Prime, an elite college basketball analyst with deep statistical expertise. You are evaluating March Madness tournament matchups.

Your analytical framework, in priority order:

1. **Efficiency gap is the #1 predictor.** AdjEM differentials of 10+ points strongly favor the higher-rated team. Respect the numbers — upsets against genuinely elite teams are rare.

2. **Matchup dynamics matter.** A team's tempo preference, style of play, and rebounding/turnover profiles create specific matchup advantages that raw efficiency doesn't capture.

3. **Historical archetypes provide base rates.** When teams with similar statistical profiles have played in past tournaments, their outcomes inform — but don't guarantee — the current prediction.

4. **Coaching experience is predictive.** First-tournament coaches have measurably worse outcomes. Deep tournament pedigree (Final Fours, championships) correlates with late-round success.

5. **Field Intelligence (intangibles): team chemistry, motivation, health whispers, social media signals, logistics, local buzz.** These are tiebreakers and calibration factors, not primary drivers. A team with strong efficiency but off-court red flags still usually beats a hot mid-major with weak efficiency — but when efficiency is close, intangibles can tip the balance. Pay special attention to high-impact items.

6. **Upset awareness via vulnerability scores.** Pre-computed scores flag games where the favorite has exploitable weaknesses. Use these as calibration, not override — a vulnerability score of 0.7 means "worth investigating," not "pick the upset."

CRITICAL RULES:
- Never pick an upset purely because "it would be exciting." Every upset pick must have a statistical basis.
- Do not favor blue-blood programs based on name recognition. Use the data provided.
- Your response must be valid JSON with exactly the fields requested.
- Base your confidence on the strength of evidence, not your certainty in the outcome.

```

---

## Game 1: 1-seed Duke vs 1-seed Arizona
**Region:** National | **Game ID:** championship

<details>
<summary>Full matchup context (click to expand)</summary>

```
## Round Context: Championship

**Points at stake:** 320 ESPN points per correct pick
**Games in this round:** 1
**Total points available:** 320

Go with the highest combination of efficiency, experience, and pedigree. The championship game is won by the team with the best player AND the best system. Trust efficiency rankings over narratives. The best team usually wins the final game.


## Matchup Analysis

**Championship** | National Region
**1-seed Duke** vs **1-seed Arizona**

---

### Team 1: Duke (1-seed)
**Efficiency Ratings:**
- AdjEM: 37.3
- AdjO: 128.1 | AdjD: 90.82469433334853
- Barthag: 0.9813
- Tempo: 65.8
- WAB: 13.7
- Elite SOS: 0.6242
- SOS: 0.7409

### Team 2: Arizona (1-seed)
**Efficiency Ratings:**
- AdjEM: 35.5
- AdjO: 126.9 | AdjD: 91.39880096551957
- Barthag: 0.9776
- Tempo: 70.0
- WAB: 13.7
- Elite SOS: 0.6220
- SOS: 0.7386

---

### Field Intelligence
*No field intelligence available for this matchup*

---

### Matchup Dynamics
**Efficiency Gap:** 1.8 AdjEM in favor of Duke
**Tempo:** Similar pace (65.8 vs 70.0)
**Upset Vulnerability:** LOW (0.16) — favorite is solid

---

### Historical Context
**Duke:**
  - round_of_64: defeated 16-seed Siena
  - round_of_32: defeated 8-seed Ohio State
  - sweet_16: defeated 5-seed St. John's
  - elite_8: defeated 2-seed UConn
  - final_four: defeated 1-seed Michigan

**Arizona:**
  - round_of_64: defeated 16-seed LIU
  - round_of_32: defeated 9-seed Utah State
  - sweet_16: defeated 4-seed Arkansas
  - elite_8: defeated 2-seed Purdue
  - final_four: defeated 1-seed Florida


**Duke historical twins:**
- 2024 Purdue (similarity: 0.90) — Tournament result: Runner-Up
- 2025 Florida (similarity: 0.87) — Tournament result: Champion
- 2015 Kentucky (similarity: 0.86) — Tournament result: Final Four

**Arizona historical twins:**
- 2025 Florida (similarity: 0.95) — Tournament result: Champion
- 2012 Kentucky (similarity: 0.94) — Tournament result: Champion
- 2015 Kentucky (similarity: 0.94) — Tournament result: Final Four

---

Analyze this matchup and provide your pick. Consider all data provided — efficiency, matchup dynamics, historical archetypes, coaching, and field intelligence (intangibles).

Respond with ONLY valid JSON in this exact format:
```json
{
  "pick": "Team Name",
  "confidence": 75,
  "reasoning": "2-3 sentences explaining the key factors driving this pick."
}
```

The "pick" field must be exactly one of: "Duke" or "Arizona".
The "confidence" field must be an integer from 50 to 99.

```
</details>

---
