"""
Prompt templates for The Scout Prime.
All LLM prompts are defined here as string templates.
"""

SYSTEM_PROMPT = """You are The Scout Prime, an elite college basketball analyst with deep statistical expertise. You are evaluating March Madness tournament matchups.

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
"""

ROUND_CONTEXT_TEMPLATE = """## Round Context: {round_name}

**Points at stake:** {points_per_game} ESPN points per correct pick
**Games in this round:** {num_games}
**Total points available:** {total_points}

{round_guidance}
"""

ROUND_GUIDANCE = {
    "round_of_64": (
        "Focus on efficiency gaps under 10 AdjEM — these are the upset danger zone. "
        "Look for 3-point variance risk (teams that live by the 3 are volatile). "
        "Coaching mismatches matter most in R64 — first-tournament coaches choke at a measurable rate. "
        "Don't overthink: when AdjEM gap is 15+, the favorite wins ~90% of the time."
    ),
    "round_of_32": (
        "Surviving R64 doesn't change team quality. Re-evaluate each matchup fresh. "
        "Momentum narratives are overrated — a team that barely survived a 12-seed isn't 'battle-tested,' they're probably not that good. "
        "Rebounding advantages start mattering more in the second weekend."
    ),
    "sweet_16": (
        "Cinderellas die here unless they have genuine efficiency advantages. "
        "The talent gap reasserts itself in S16. Low seeds with weak AdjD get exposed. "
        "Close-game resilience becomes a factor — teams playing their 3rd game in 5 days need depth."
    ),
    "elite_8": (
        "Only 8 teams remain. Coaching experience separates contenders from pretenders. "
        "AdjEM gaps are smaller now — look at tempo mismatches and rebounding margins for edges. "
        "Free throw shooting under pressure is a real factor in E8 games."
    ),
    "final_four": (
        "The Final Four is about pedigree, depth, and composure. "
        "Favor teams with tournament-experienced coaches and senior-heavy rosters. "
        "Style matters — teams that can adjust tempo win F4 games."
    ),
    "championship": (
        "Go with the highest combination of efficiency, experience, and pedigree. "
        "The championship game is won by the team with the best player AND the best system. "
        "Trust efficiency rankings over narratives. The best team usually wins the final game."
    ),
}

MATCHUP_PROMPT_TEMPLATE = """## Matchup Analysis

**{round_label}** | {region} Region
**{seed1}-seed {team1}** vs **{seed2}-seed {team2}**

---

### Team 1: {team1} ({seed1}-seed)
{team1_profile}

### Team 2: {team2} ({seed2}-seed)
{team2_profile}

---

### Field Intelligence
{field_intelligence}

---

### Matchup Dynamics
{matchup_dynamics}

---

### Historical Context
{historical_context}

---

Analyze this matchup and provide your pick. Consider all data provided — efficiency, matchup dynamics, historical archetypes, coaching, and field intelligence (intangibles).

Respond with ONLY valid JSON in this exact format:
```json
{{
  "pick": "Team Name",
  "confidence": 75,
  "reasoning": "2-3 sentences explaining the key factors driving this pick."
}}
```

The "pick" field must be exactly one of: "{team1}" or "{team2}".
The "confidence" field must be an integer from 50 to 99.
"""

HOW_THEY_GOT_HERE_TEMPLATE = """### How They Got Here
{team_name} ({seed}-seed) advanced by defeating:
{victories}
"""


def format_intangibles(team_name, stats):
    """Format a team's intangibles intel into a readable prompt section."""
    intangibles = stats.get("intangibles") if stats else None
    if not intangibles:
        return None

    lines = []
    vibe = intangibles.get("overall_vibe_score")
    summary = intangibles.get("summary", "")

    lines.append(f"**{team_name}** — Vibe Score: {vibe:.1f}/10")
    if summary:
        lines.append(f"*{summary}*")

    # Intel items grouped by signal
    intel_items = intangibles.get("intel", [])
    positives = [i for i in intel_items if i.get("signal") == "positive"]
    negatives = [i for i in intel_items if i.get("signal") == "negative"]
    neutrals = [i for i in intel_items if i.get("signal") == "neutral"]

    if positives:
        lines.append("\nTailwinds:")
        for item in positives:
            impact_tag = f" [{item.get('impact', 'moderate').upper()}]" if item.get("impact") == "high" else ""
            lines.append(f"  + {item['detail']}{impact_tag}")

    if negatives:
        lines.append("\nRed Flags:")
        for item in negatives:
            impact_tag = f" [{item.get('impact', 'moderate').upper()}]" if item.get("impact") == "high" else ""
            lines.append(f"  - {item['detail']}{impact_tag}")

    if neutrals:
        lines.append("\nNotable:")
        for item in neutrals:
            lines.append(f"  ~ {item['detail']}")

    return "\n".join(lines)


def format_field_intelligence(team1, team2, stats1, stats2):
    """Format the Field Intelligence section for both teams in a matchup."""
    intel1 = format_intangibles(team1, stats1)
    intel2 = format_intangibles(team2, stats2)

    if not intel1 and not intel2:
        return "*No field intelligence available for this matchup*"

    parts = []
    if intel1:
        parts.append(intel1)
    if intel2:
        parts.append(intel2)

    return "\n\n".join(parts)


def format_team_profile(stats, team_name, seed):
    """Format a team's stats into a readable profile block for the prompt."""
    if not stats:
        return f"*No detailed stats available for {team_name} ({seed}-seed)*"

    lines = []

    # Efficiency block
    lines.append("**Efficiency Ratings:**")
    if "adj_em" in stats:
        lines.append(f"- AdjEM: {stats['adj_em']:.1f}")
    if "adj_o" in stats:
        lines.append(f"- AdjO: {stats['adj_o']:.1f} | AdjD: {stats.get('adj_d', 'N/A')}")
    if "barthag" in stats:
        lines.append(f"- Barthag: {stats['barthag']:.4f}")
    if "tempo" in stats:
        lines.append(f"- Tempo: {stats['tempo']:.1f}")
    if "wab" in stats:
        lines.append(f"- WAB: {stats['wab']:.1f}")
    if "elite_sos" in stats:
        lines.append(f"- Elite SOS: {stats['elite_sos']:.4f}")
    if "sos" in stats:
        lines.append(f"- SOS: {stats['sos']:.4f}")

    # Shooting (enhanced with teams.json data)
    shooting = []
    if "threep_pct" in stats:
        shooting.append(f"3pt%: {stats['threep_pct']:.1f}%")
    if "threep_rate" in stats:
        shooting.append(f"3pt Rate: {stats['threep_rate']:.1f}%")
    if "three_pt_variance_risk" in stats:
        risk = stats["three_pt_variance_risk"]
        risk_label = "HIGH" if risk > 0.05 else "moderate" if risk > 0.02 else "low"
        shooting.append(f"3pt Variance Risk: {risk:.3f} ({risk_label})")
    if "ft_pct" in stats:
        shooting.append(f"FT%: {stats['ft_pct']:.1f}%")
    if "ft_pct_close_games" in stats:
        shooting.append(f"FT% in Close Games: {stats['ft_pct_close_games']:.1f}%")
    if "ft_pressure_delta" in stats:
        delta = stats["ft_pressure_delta"]
        if delta != 0:
            direction = "drops" if delta < 0 else "improves"
            shooting.append(f"FT Pressure Delta: {delta:+.1f}% ({direction} under pressure)")
    if "efg_pct" in stats:
        shooting.append(f"eFG%: {stats['efg_pct']:.1f}%")
    if shooting:
        lines.append("\n**Shooting:**")
        for s in shooting:
            lines.append(f"- {s}")

    # Rebounding
    rebounding = []
    if "oreb_pct" in stats:
        rebounding.append(f"OReb%: {stats['oreb_pct']:.1f}%")
    if "dreb_pct" in stats:
        rebounding.append(f"DReb%: {stats['dreb_pct']:.1f}%")
    if rebounding:
        lines.append("\n**Rebounding:**")
        for r in rebounding:
            lines.append(f"- {r}")

    # Ball control (enhanced with teams.json data)
    ball_control = []
    if "tov_pct" in stats:
        ball_control.append(f"TO Rate: {stats['tov_pct']:.1f}%")
    if "forced_to_rate" in stats:
        ball_control.append(f"Forced TO Rate: {stats['forced_to_rate']:.1f}%")
    if "turnover_margin" in stats:
        margin = stats["turnover_margin"]
        label = "net positive" if margin > 0 else "net negative"
        ball_control.append(f"TO Margin: {margin:+.1f} ({label})")
    if ball_control:
        lines.append(f"\n**Ball Control:**")
        for bc in ball_control:
            lines.append(f"- {bc}")

    # Coaching block
    coaching = []
    if stats.get("coach"):
        coaching.append(f"Coach: {stats['coach']}")
    if stats.get("coach_tournament_record"):
        coaching.append(f"Tournament Record: {stats['coach_tournament_record']}")
    if stats.get("coach_tournament_appearances"):
        coaching.append(f"Tournament Appearances (HC): {stats['coach_tournament_appearances']}")
    if stats.get("coach_final_fours"):
        coaching.append(f"Final Fours: {stats['coach_final_fours']}")
    if stats.get("coach_championships"):
        coaching.append(f"Championships: {stats['coach_championships']}")
    if stats.get("first_tournament_coach"):
        coaching.append("FIRST TOURNAMENT as head coach")
    if coaching:
        lines.append("\n**Coaching:**")
        for c in coaching:
            lines.append(f"- {c}")

    # Roster block
    roster = []
    if "returning_minutes_pct" in stats:
        roster.append(f"Returning Minutes: {stats['returning_minutes_pct']:.0%}" if stats['returning_minutes_pct'] <= 1 else f"Returning Minutes: {stats['returning_minutes_pct']:.1f}%")
    if "avg_player_year" in stats and stats["avg_player_year"]:
        roster.append(f"Avg Player Year: {stats['avg_player_year']:.1f}")
    if stats.get("is_freshman_heavy"):
        roster.append("Freshman-heavy roster")
    if stats.get("is_senior_led"):
        roster.append("Senior-led roster")
    if "tournament_experience_count" in stats:
        roster.append(f"Players with Tournament Experience: {stats['tournament_experience_count']}")
    if roster:
        lines.append("\n**Roster:**")
        for r in roster:
            lines.append(f"- {r}")

    # Context block (record, close games, momentum, style, injuries, conference)
    context = []
    if stats.get("record"):
        context.append(f"Record: {stats['record']}")
    if stats.get("conference"):
        conf = stats["conference"]
        if stats.get("conference_strength_score"):
            conf += f" (strength: {stats['conference_strength_score']})"
        context.append(f"Conference: {conf}")
    if stats.get("close_game_record"):
        cg = f"Close Games (<=5pt): {stats['close_game_record']}"
        if stats.get("close_game_win_pct"):
            cg += f" ({stats['close_game_win_pct']:.0%} win rate)"
        context.append(cg)
    if stats.get("last_10"):
        l10 = f"Last 10: {stats['last_10']}"
        if stats.get("momentum_flag") and stats["momentum_flag"] != "neutral":
            l10 += f" [{stats['momentum_flag'].upper()}]"
        context.append(l10)
    if stats.get("conf_tourney_result"):
        context.append(f"Conference Tournament: {stats['conf_tourney_result']}")
    if stats.get("style"):
        style = f"Style: {stats['style']}"
        if stats.get("tempo_bucket"):
            style += f" ({stats['tempo_bucket']} tempo)"
        context.append(style)
    if stats.get("injury_impact") and stats["injury_impact"] != "none":
        injuries = stats.get("injuries", [])
        inj_str = ", ".join(injuries) if isinstance(injuries, list) and injuries else str(injuries)
        context.append(f"Injuries: {inj_str} (impact: {stats['injury_impact']})")
    if context:
        lines.append("\n**Context:**")
        for c in context:
            lines.append(f"- {c}")

    return "\n".join(lines)


def format_matchup_dynamics(stats1, stats2, team1, team2, upset_score=None):
    """Format computed matchup dynamics for the prompt."""
    lines = []

    if stats1 and stats2:
        # Efficiency gap
        em1 = stats1.get("adj_em", 0)
        em2 = stats2.get("adj_em", 0)
        gap = abs(em1 - em2)
        favored = team1 if em1 > em2 else team2
        lines.append(f"**Efficiency Gap:** {gap:.1f} AdjEM in favor of {favored}")

        # Tempo mismatch
        t1 = stats1.get("tempo", 0)
        t2 = stats2.get("tempo", 0)
        tempo_diff = abs(t1 - t2)
        if tempo_diff > 5:
            faster = team1 if t1 > t2 else team2
            slower = team2 if t1 > t2 else team1
            lines.append(f"**Tempo Mismatch:** {faster} ({t1:.1f}) wants to push pace; {slower} ({t2:.1f}) prefers to slow it down. {tempo_diff:.1f} possession gap.")
        else:
            lines.append(f"**Tempo:** Similar pace ({t1:.1f} vs {t2:.1f})")

        # Rebounding edge
        or1 = stats1.get("oreb_pct", 0)
        or2 = stats2.get("oreb_pct", 0)
        dr1 = stats1.get("dreb_pct", 0)
        dr2 = stats2.get("dreb_pct", 0)
        if or1 and or2 and dr1 and dr2:
            reb_edge1 = (or1 + dr1) - (or2 + dr2)
            if abs(reb_edge1) > 3:
                reb_fav = team1 if reb_edge1 > 0 else team2
                lines.append(f"**Rebounding Edge:** {reb_fav} has a significant rebounding advantage")

        # Turnover comparison (basic TO rate)
        tov1 = stats1.get("tov_pct", 0)
        tov2 = stats2.get("tov_pct", 0)
        if tov1 and tov2:
            if abs(tov1 - tov2) > 2:
                cleaner = team1 if tov1 < tov2 else team2
                lines.append(f"**Ball Security:** {cleaner} takes better care of the ball ({min(tov1, tov2):.1f}% vs {max(tov1, tov2):.1f}% TO rate)")

        # Turnover margin comparison (net TO advantage from teams.json)
        tm1 = stats1.get("turnover_margin")
        tm2 = stats2.get("turnover_margin")
        if tm1 is not None and tm2 is not None:
            margin_diff = tm1 - tm2
            if abs(margin_diff) > 1:
                to_fav = team1 if margin_diff > 0 else team2
                lines.append(f"**Turnover Margin Edge:** {to_fav} ({max(tm1, tm2):+.1f} vs {min(tm1, tm2):+.1f}) — creates more turnovers than it commits")

        # 3pt variance risk comparison
        var1 = stats1.get("three_pt_variance_risk")
        var2 = stats2.get("three_pt_variance_risk")
        if var1 is not None and var2 is not None:
            if var1 > 0.05 or var2 > 0.05:
                risky = team1 if var1 > var2 else team2
                risk_val = max(var1, var2)
                lines.append(f"**3pt Variance Risk:** {risky} is more volatile from 3 (risk score: {risk_val:.3f}) — boom-or-bust shooting could swing this game")

        # Coaching mismatch detection
        first1 = stats1.get("first_tournament_coach", False)
        first2 = stats2.get("first_tournament_coach", False)
        if first1 and not first2:
            lines.append(f"**Coaching Mismatch:** {team1}'s coach is in their FIRST tournament — historical disadvantage vs experienced coaches")
        elif first2 and not first1:
            lines.append(f"**Coaching Mismatch:** {team2}'s coach is in their FIRST tournament — historical disadvantage vs experienced coaches")

    if upset_score is not None:
        if upset_score >= 0.7:
            lines.append(f"**Upset Vulnerability:** HIGH ({upset_score:.2f}) — favorite has exploitable weaknesses")
        elif upset_score >= 0.5:
            lines.append(f"**Upset Vulnerability:** MODERATE ({upset_score:.2f}) — some upset potential")
        else:
            lines.append(f"**Upset Vulnerability:** LOW ({upset_score:.2f}) — favorite is solid")

    return "\n".join(lines) if lines else "*No matchup dynamics computed*"


def format_historical_context(archetypes1, archetypes2, seed_history, team1, team2, seed1, seed2):
    """Format historical context (archetypes + seed history) for the prompt."""
    lines = []

    # Seed matchup history
    if seed_history:
        lines.append(f"**{seed1} vs {seed2} seed history:**")
        if isinstance(seed_history, dict):
            win_rate = seed_history.get("favorite_win_rate", "N/A")
            sample = seed_history.get("sample_size", "N/A")
            lines.append(f"- Higher seed wins {win_rate}% of the time (n={sample})")
            if seed_history.get("notable_upsets"):
                lines.append(f"- Notable upsets: {seed_history['notable_upsets']}")
        elif isinstance(seed_history, str):
            lines.append(f"- {seed_history}")

    # Team archetypes
    if archetypes1:
        lines.append(f"\n**{team1} historical twins:**")
        for twin in archetypes1[:3]:
            if isinstance(twin, dict):
                lines.append(f"- {twin.get('year', '?')} {twin.get('team', '?')} "
                           f"(similarity: {twin.get('similarity', 0):.2f}) — "
                           f"Tournament result: {twin.get('result', 'N/A')}")
            else:
                lines.append(f"- {twin}")

    if archetypes2:
        lines.append(f"\n**{team2} historical twins:**")
        for twin in archetypes2[:3]:
            if isinstance(twin, dict):
                lines.append(f"- {twin.get('year', '?')} {twin.get('team', '?')} "
                           f"(similarity: {twin.get('similarity', 0):.2f}) — "
                           f"Tournament result: {twin.get('result', 'N/A')}")
            else:
                lines.append(f"- {twin}")

    return "\n".join(lines) if lines else "*No historical context available*"


def build_full_prompt(round_name, region, team1, team2, seed1, seed2,
                      stats1, stats2, archetypes1=None, archetypes2=None,
                      seed_history=None, upset_score=None, how_they_got_here=None):
    """Build the complete matchup prompt for a single game."""
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import prompts  # self-reference for templates

    round_labels = {
        "round_of_64": "Round of 64",
        "round_of_32": "Round of 32",
        "sweet_16": "Sweet 16",
        "elite_8": "Elite 8",
        "final_four": "Final Four",
        "championship": "Championship",
    }
    round_label = round_labels.get(round_name, round_name)

    team1_profile = format_team_profile(stats1, team1, seed1)
    team2_profile = format_team_profile(stats2, team2, seed2)
    field_intelligence = format_field_intelligence(team1, team2, stats1, stats2)
    matchup_dynamics = format_matchup_dynamics(stats1, stats2, team1, team2, upset_score)
    historical_context = format_historical_context(
        archetypes1, archetypes2, seed_history, team1, team2, seed1, seed2
    )

    # Add "how they got here" for rounds after R64
    if how_they_got_here:
        historical_context = how_they_got_here + "\n\n" + historical_context

    prompt = MATCHUP_PROMPT_TEMPLATE.format(
        round_label=round_label,
        region=region,
        seed1=seed1, team1=team1,
        seed2=seed2, team2=team2,
        team1_profile=team1_profile,
        team2_profile=team2_profile,
        field_intelligence=field_intelligence,
        matchup_dynamics=matchup_dynamics,
        historical_context=historical_context,
    )

    return prompt
