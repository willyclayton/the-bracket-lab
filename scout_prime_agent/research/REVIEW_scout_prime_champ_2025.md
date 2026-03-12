# Scout Prime — Championship Matchups (2025)

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

## Game 1: 1-seed Houston vs 1-seed Florida
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
**1-seed Houston** vs **1-seed Florida**

---

### Team 1: Houston (1-seed)
**Efficiency Ratings:**
- AdjEM: 37.3
- AdjO: 124.7 | AdjD: 87.34753529472775
- Barthag: 0.9836
- Tempo: 61.8
- WAB: 11.5
- Elite SOS: 0.5857
- SOS: 0.7741

### Team 2: Florida (1-seed)
**Efficiency Ratings:**
- AdjEM: 33.6
- AdjO: 127.8 | AdjD: 94.18033178963256
- Barthag: 0.9709
- Tempo: 69.9
- WAB: 11.1
- Elite SOS: 0.5948
- SOS: 0.7453

---

### Field Intelligence
*No field intelligence available for this matchup*

---

### Matchup Dynamics
**Efficiency Gap:** 3.7 AdjEM in favor of Houston
**Tempo Mismatch:** Florida (61.8) wants to push pace; Houston (69.9) prefers to slow it down. 8.1 possession gap.
**Upset Vulnerability:** LOW (0.20) — favorite is solid

---

### Historical Context
**Houston:**
  - round_of_64: defeated 16-seed SIU Edwardsville
  - round_of_32: defeated 8-seed Gonzaga
  - sweet_16: defeated 4-seed Purdue
  - elite_8: defeated 2-seed Tennessee
  - final_four: defeated 1-seed Duke

**Florida:**
  - round_of_64: defeated 16-seed Norfolk State
  - round_of_32: defeated 8-seed UConn
  - sweet_16: defeated 4-seed Maryland
  - elite_8: defeated 3-seed Texas Tech
  - final_four: defeated 1-seed Auburn


**Houston historical twins:**
- 2019 Virginia (similarity: 0.89) — Tournament result: Champion
- 2015 Wisconsin (similarity: 0.87) — Tournament result: Runner-Up
- 2014 Wisconsin (similarity: 0.84) — Tournament result: Final Four

**Florida historical twins:**
- 2017 Gonzaga (similarity: 0.92) — Tournament result: Runner-Up
- 2019 Gonzaga (similarity: 0.92) — Tournament result: Sweet 16
- 2024 Connecticut (similarity: 0.91) — Tournament result: Champion

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

The "pick" field must be exactly one of: "Houston" or "Florida".
The "confidence" field must be an integer from 50 to 99.

```
</details>

---
