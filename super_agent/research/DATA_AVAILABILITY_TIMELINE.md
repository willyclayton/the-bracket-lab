# Data Availability Timeline

## Purpose
Document when each data source becomes available relative to the tournament. This ensures no future data leaks into the model.

## Key Dates (Typical NCAA Season)
- **November:** Season begins
- **Early March:** Conference tournaments
- **Selection Sunday (mid-March):** Bracket announced — seeds, regions, matchups finalized
- **Mid-March:** First Four play-in games
- **Late March - Early April:** Tournament rounds (R64 through Championship)

## Feature Availability

| Feature | Available When | Safe for Pre-Tournament Model? |
|---------|---------------|-------------------------------|
| Team seed | Selection Sunday | Yes |
| Adjusted offensive efficiency (AdjO) | End of regular season | Yes |
| Adjusted defensive efficiency (AdjD) | End of regular season | Yes |
| Tempo (possessions/game) | End of regular season | Yes |
| Strength of schedule (SOS) | End of regular season | Yes |
| Win-loss record | End of regular season | Yes |
| Conference tournament result | Conference tournament end | Yes (if using data from before Selection Sunday) |
| Coach tournament experience | Historical — always available | Yes |
| Historical seed upset rates | Historical — always available | Yes |
| Tournament round reached | AFTER tournament | NO — this is the outcome |
| Tournament game scores | AFTER tournament | NO — this is the outcome |
| Tournament opponent | Selection Sunday (R64 only) | Partial — only R64 matchups known pre-tournament |

## Rules
1. Training features must be available BEFORE the tournament starts
2. The target variable (game outcome) is from during the tournament — this is what we predict
3. For the 2021 test year, we use pre-tournament 2021 features to predict 2021 tournament outcomes
4. We NEVER use 2021 tournament outcomes as features — only as the ground truth for evaluation
