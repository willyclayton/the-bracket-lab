# The Agent — Claude Code Autonomous Research Prompt

## Context
This is the prompt given to Claude Code with MINIMAL constraints. The entire point is that the agent decides its own methodology. Do NOT add detailed instructions — that defeats the purpose.

## Pre-run Setup
1. Make sure the repo has the latest `data/meta/teams.json` populated with all 64 tournament teams
2. Make sure `lib/types.ts` has the BracketData interface available for reference
3. Start screen recording (OBS, QuickTime, or similar)
4. Open Claude Code in the `the-bracket-lab` repo directory

## The Prompt

```
You are participating in an experiment. You are one of 5 AI models competing to predict the 2026 NCAA March Madness tournament. The other 4 models have defined methodologies — Monte Carlo simulation, LLM scouting, historical archetype matching, and upset detection.

You are different. You have NO predefined methodology. You decide what matters.

Your task:
1. Research the 2026 NCAA men's basketball tournament. The 64 teams are listed in data/meta/teams.json.
2. Analyze teams however you see fit. You decide what data to look for, what factors matter, and how to weigh them.
3. Build a complete 64-team bracket — every game from the Round of 64 through the Championship.
4. Output your bracket to data/models/the-agent.json following the schema defined in lib/types.ts (BracketData interface).

Rules:
- You have full web search access. Use it however you want.
- You must pick a winner for every game — no ties, no skips.
- Include a confidence score (0-1) and reasoning (2-3 sentences) for every pick.
- Include your champion, Final Four picks, and set locked: true when done.
- Set the model field to "the-agent" and displayName to "The Agent".

Important: I am documenting your entire research process for a blog post. After you finish, also create a file at scripts/agent_research_log.md that documents:
- What you chose to research and why
- What data sources you used
- What factors you decided mattered most
- Any surprising findings
- Your overall strategy

Go.
```

## After the Run
1. Stop screen recording
2. Review the output JSON for completeness (all 63 games filled)
3. Review the research log for the blog post
4. Edit the timelapse video for LinkedIn (speed up boring parts, highlight interesting moments)
5. Write the blog post: "I Gave an AI Zero Instructions and Let It Build a March Madness Bracket. Here's What Happened."
