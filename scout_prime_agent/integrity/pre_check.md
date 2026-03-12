# Scout Prime — Pre-Run Integrity Check

## Template (copy for each run)

### Run: [Name]
**Date:** [YYYY-MM-DD]
**Year:** [Tournament year being predicted]
**Model:** [Claude Sonnet / Opus]

#### Data Sources Used
- [ ] BartTorvik efficiency data (barttorvik_YYYY.csv)
- [ ] Team metadata (teams.json)
- [ ] Historical archetypes (teams from years < target year only)
- [ ] Seed matchup history
- [ ] Upset vulnerability scores

#### Temporal Integrity Checks
- [ ] No actual game results from the target year appear in any prompt
- [ ] Historical archetype matching only uses teams from years BEFORE target year
- [ ] BartTorvik data is from the regular season (pre-tournament)
- [ ] All features are knowable BEFORE the tournament starts
- [ ] No tournament outcome data encoded as features

#### Feature Audit
List all data points used per team in prompts:
1. AdjEM, AdjO, AdjD — pre-tournament efficiency (OK)
2. Tempo — season-long pace (OK)
3. Barthag, WAB, Elite SOS — season-long metrics (OK)
4. Shooting splits — season-long (OK)
5. Rebounding rates — season-long (OK)
6. Coaching records — career/historical (OK)
7. Historical twins — from prior years only (OK)

#### Sign-off
- [ ] All checks passed
- [ ] Logged to audit_log.md after run
