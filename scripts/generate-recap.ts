#!/usr/bin/env npx tsx
/**
 * generate-recap.ts
 *
 * Auto-generates recap MDX files with real tournament data.
 * Reads actual results + all model bracket JSONs, computes per-model stats,
 * and outputs recap/obituary MDX templates with data tables pre-filled.
 *
 * Usage:
 *   npx tsx scripts/generate-recap.ts --round "Round of 64"
 *   npx tsx scripts/generate-recap.ts --round "Round of 32"
 *   npx tsx scripts/generate-recap.ts --round "Sweet 16"
 *   npx tsx scripts/generate-recap.ts --round "Elite 8"
 *   npx tsx scripts/generate-recap.ts --round "Final Four"
 *   npx tsx scripts/generate-recap.ts --round "Championship"
 */

import fs from 'fs';
import path from 'path';

// ---- Types (mirroring lib/types.ts for standalone script use) ----

interface Game {
  gameId: string;
  round: string;
  region: string;
  seed1: number;
  team1: string;
  seed2: number;
  team2: string;
  pick: string;
  confidence: number;
  reasoning: string;
}

interface BracketData {
  model: string;
  displayName: string;
  tagline: string;
  color: string;
  champion: string | null;
  championEliminated: boolean;
  rounds: Record<string, Game[]>;
}

interface ResultGame {
  gameId: string;
  round: string;
  region: string;
  team1: string;
  seed1: number;
  team2: string;
  seed2: number;
  score1: number;
  score2: number;
  winner: string;
  completed: boolean;
}

interface Results {
  lastUpdated: string | null;
  currentRound: string;
  games: ResultGame[];
}

// ---- Scoring constants (mirroring lib/models.ts) ----

const ROUND_POINTS: Record<string, number> = {
  round_of_64: 10,
  round_of_32: 20,
  sweet_16: 40,
  elite_8: 80,
  final_four: 160,
  championship: 320,
};

const ROUND_KEY_MAP: Record<string, string> = {
  'Round of 64': 'round_of_64',
  'Round of 32': 'round_of_32',
  'Sweet 16': 'sweet_16',
  'Elite 8': 'elite_8',
  'Final Four': 'final_four',
  'Championship': 'championship',
};

const ROUND_GAME_COUNTS: Record<string, number> = {
  round_of_64: 32,
  round_of_32: 16,
  sweet_16: 8,
  elite_8: 4,
  final_four: 2,
  championship: 1,
};

const ROUND_SLUG_MAP: Record<string, string> = {
  round_of_64: 'round-of-64',
  round_of_32: 'round-of-32',
  sweet_16: 'sweet-16',
  elite_8: 'elite-8',
  final_four: 'final-four',
  championship: 'championship',
};

const ROUND_TITLES: Record<string, string> = {
  round_of_64: 'Round of 64 Recap: First Blood',
  round_of_32: 'Round of 32 Recap: Separation',
  sweet_16: 'Sweet 16 Recap: The Real Tournament Begins',
  elite_8: 'Elite 8 Recap: Final Four On The Line',
  final_four: 'Final Four Recap: The Last Stand',
  championship: 'Championship Recap: And The Winner Is...',
};

// ---- Helpers ----

const ROOT = path.resolve(__dirname, '..');

function loadJSON<T>(relPath: string): T {
  const full = path.join(ROOT, relPath);
  return JSON.parse(fs.readFileSync(full, 'utf-8'));
}

function loadAllBrackets(): BracketData[] {
  const dir = path.join(ROOT, 'data/models');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  return files.map((f) => loadJSON<BracketData>(`data/models/${f}`));
}

function isUpset(game: ResultGame): boolean {
  if (!game.completed || !game.winner) return false;
  const winnerSeed = game.winner === game.team1 ? game.seed1 : game.seed2;
  const loserSeed = game.winner === game.team1 ? game.seed2 : game.seed1;
  return winnerSeed > loserSeed;
}

// ---- Per-model stats for a round ----

interface ModelRoundStats {
  modelId: string;
  displayName: string;
  pointsThisRound: number;
  totalPoints: number;
  correctThisRound: number;
  totalGamesThisRound: number;
  upsetsCalledCorrectly: string[];
  champion: string | null;
  championEliminated: boolean;
}

function computeStats(
  bracket: BracketData,
  results: Results,
  targetRoundKey: string
): ModelRoundStats {
  const completedGames = results.games.filter((g) => g.completed);
  const resultMap = new Map(completedGames.map((g) => [g.gameId, g]));

  let totalPoints = 0;
  let pointsThisRound = 0;
  let correctThisRound = 0;
  let totalGamesThisRound = 0;
  const upsetsCalledCorrectly: string[] = [];

  for (const [roundKey, pts] of Object.entries(ROUND_POINTS)) {
    const picks = bracket.rounds[roundKey] || [];
    for (const pick of picks) {
      const result = resultMap.get(pick.gameId);
      if (!result) continue;

      const correct = pick.pick === result.winner;
      if (correct) totalPoints += pts;

      if (roundKey === targetRoundKey) {
        totalGamesThisRound++;
        if (correct) {
          pointsThisRound += pts;
          correctThisRound++;
          if (isUpset(result)) {
            const winnerSeed = result.winner === result.team1 ? result.seed1 : result.seed2;
            upsetsCalledCorrectly.push(`${winnerSeed}-seed ${result.winner}`);
          }
        }
      }
    }
  }

  return {
    modelId: bracket.model,
    displayName: bracket.displayName,
    pointsThisRound,
    totalPoints,
    correctThisRound,
    totalGamesThisRound,
    upsetsCalledCorrectly,
    champion: bracket.champion,
    championEliminated: bracket.championEliminated,
  };
}

// ---- Upset breakdown ----

interface UpsetDetail {
  game: ResultGame;
  calledBy: string[];
  missedBy: string[];
}

function getUpsets(
  results: Results,
  brackets: BracketData[],
  targetRoundKey: string
): UpsetDetail[] {
  const roundGames = results.games.filter(
    (g) => g.round === targetRoundKey && g.completed && isUpset(g)
  );

  return roundGames.map((game) => {
    const calledBy: string[] = [];
    const missedBy: string[] = [];

    for (const bracket of brackets) {
      const picks = bracket.rounds[targetRoundKey] || [];
      const pick = picks.find((p) => p.gameId === game.gameId);
      if (!pick) continue;
      if (pick.pick === game.winner) {
        calledBy.push(bracket.displayName);
      } else {
        missedBy.push(bracket.displayName);
      }
    }

    return { game, calledBy, missedBy };
  });
}

// ---- MDX generation ----

function generateRecapMDX(
  roundKey: string,
  roundLabel: string,
  stats: ModelRoundStats[],
  upsets: UpsetDetail[]
): string {
  const title = ROUND_TITLES[roundKey] || `${roundLabel} Recap`;
  const totalGames = ROUND_GAME_COUNTS[roundKey] || stats[0]?.totalGamesThisRound || 0;
  const today = new Date().toISOString().split('T')[0];

  // Sort by total points descending
  const sorted = [...stats].sort((a, b) => b.totalPoints - a.totalPoints);

  let mdx = `---
title: "${title}"
date: "${today}"
type: "recap"
excerpt: "${totalGames} games. The models diverge. Here's who nailed it and who didn't."
---

## Leaderboard After ${roundLabel}

| Model | Round Pts | Total Pts | Correct | Upsets Called |
|-------|-----------|-----------|---------|--------------|
`;

  for (const s of sorted) {
    const upsetsStr = s.upsetsCalledCorrectly.length > 0
      ? String(s.upsetsCalledCorrectly.length)
      : '0';
    mdx += `| ${s.displayName} | ${s.pointsThisRound} | ${s.totalPoints} | ${s.correctThisRound}/${s.totalGamesThisRound} | ${upsetsStr} |\n`;
  }

  // Upsets section
  if (upsets.length > 0) {
    mdx += `\n## The Upsets\n\n`;
    mdx += `<!-- EDIT: Add narrative about each upset -->\n\n`;

    for (const u of upsets) {
      const winnerSeed = u.game.winner === u.game.team1 ? u.game.seed1 : u.game.seed2;
      const loserSeed = u.game.winner === u.game.team1 ? u.game.seed2 : u.game.seed1;
      const loser = u.game.winner === u.game.team1 ? u.game.team2 : u.game.team1;
      mdx += `**${winnerSeed}-seed ${u.game.winner} over ${loserSeed}-seed ${loser}, ${u.game.region}**\n\n`;
      mdx += `Called by: ${u.calledBy.length > 0 ? u.calledBy.join(', ') : 'Nobody'}\n`;
      mdx += `Missed by: ${u.missedBy.length > 0 ? u.missedBy.join(', ') : 'Nobody'}\n\n`;
    }
  } else {
    mdx += `\n## The Upsets\n\nNo upsets this round — chalk held.\n\n`;
  }

  // Champion watch
  mdx += `## Champion Watch\n\n`;
  mdx += `| Model | Champion Pick | Status |\n`;
  mdx += `|-------|--------------|--------|\n`;

  for (const s of sorted) {
    const status = s.championEliminated ? 'ELIMINATED' : 'Alive';
    mdx += `| ${s.displayName} | ${s.champion || 'TBD'} | ${status} |\n`;
  }

  const eliminated = sorted.filter((s) => s.championEliminated);
  if (eliminated.length > 0) {
    mdx += `\n<!-- EDIT: ${eliminated.map((e) => e.displayName).join(', ')} champion eliminated — link to obituary post -->\n`;
  }

  mdx += `\n## Looking Ahead\n\n`;
  mdx += `<!-- EDIT: Preview of next round matchups -->\n`;

  return mdx;
}

function generateObituaryMDX(stat: ModelRoundStats, roundLabel: string): string {
  const today = new Date().toISOString().split('T')[0];
  const slug = stat.modelId;

  return `---
title: "Obituary: ${stat.displayName}"
date: "${today}"
type: "obituary"
model: "${slug}"
excerpt: "${stat.displayName} picked ${stat.champion} to win it all. ${stat.champion} is out. Here lies a bracket's dream."
---

## ${stat.displayName} (${stat.champion} — Eliminated in ${roundLabel})

**Final champion pick:** ${stat.champion}

**Total points at time of elimination:** ${stat.totalPoints}

<!-- EDIT: Write the dramatic eulogy here. What went wrong? Was the pick defensible? How does the model's remaining bracket look? -->

## The Case For ${stat.champion}

<!-- EDIT: Why did the model pick this champion? What was the reasoning? -->

## What Went Wrong

<!-- EDIT: How did the elimination happen? Was it an upset? A bad matchup? -->

## The Road Ahead

${stat.displayName} is still competing on the leaderboard for remaining picks. The champion dream is dead, but the points race continues.

<!-- EDIT: Outlook for remaining bracket strength -->
`;
}

// ---- Main ----

function main() {
  const args = process.argv.slice(2);
  const roundIdx = args.indexOf('--round');
  if (roundIdx === -1 || !args[roundIdx + 1]) {
    console.error('Usage: npx tsx scripts/generate-recap.ts --round "Round of 64"');
    console.error('Valid rounds: Round of 64, Round of 32, Sweet 16, Elite 8, Final Four, Championship');
    process.exit(1);
  }

  const roundLabel = args[roundIdx + 1];
  const roundKey = ROUND_KEY_MAP[roundLabel];
  if (!roundKey) {
    console.error(`Unknown round: "${roundLabel}"`);
    console.error('Valid rounds: ' + Object.keys(ROUND_KEY_MAP).join(', '));
    process.exit(1);
  }

  // Load data
  const results = loadJSON<Results>('data/results/actual-results.json');
  const brackets = loadAllBrackets();

  // Check if any games in this round are completed
  const roundGames = results.games.filter((g) => g.round === roundKey && g.completed);
  if (roundGames.length === 0) {
    console.error(`No completed games found for ${roundLabel}. Update actual-results.json first.`);
    process.exit(1);
  }

  console.log(`Found ${roundGames.length} completed games in ${roundLabel}`);
  console.log(`Processing ${brackets.length} model brackets...\n`);

  // Compute stats
  const allStats = brackets.map((b) => computeStats(b, results, roundKey));
  const upsets = getUpsets(results, brackets, roundKey);

  // Generate recap MDX
  const recapContent = generateRecapMDX(roundKey, roundLabel, allStats, upsets);
  const recapSlug = ROUND_SLUG_MAP[roundKey];
  const recapPath = path.join(ROOT, `content/blog/${recapSlug}-recap.mdx`);
  fs.writeFileSync(recapPath, recapContent, 'utf-8');
  console.log(`Wrote recap: ${recapPath}`);

  // Generate obituaries for newly eliminated champions
  const eliminated = allStats.filter((s) => s.championEliminated);
  for (const stat of eliminated) {
    const obituaryPath = path.join(ROOT, `content/blog/obituary-${stat.modelId}.mdx`);
    if (fs.existsSync(obituaryPath)) {
      console.log(`Obituary already exists for ${stat.displayName}, skipping: ${obituaryPath}`);
      continue;
    }
    const obituaryContent = generateObituaryMDX(stat, roundLabel);
    fs.writeFileSync(obituaryPath, obituaryContent, 'utf-8');
    console.log(`Wrote obituary: ${obituaryPath}`);
  }

  // Summary
  console.log('\n--- Summary ---');
  const sorted = [...allStats].sort((a, b) => b.totalPoints - a.totalPoints);
  for (const s of sorted) {
    const champ = s.championEliminated ? ` [ELIMINATED: ${s.champion}]` : '';
    console.log(`  ${s.displayName}: ${s.totalPoints} pts (${s.correctThisRound}/${s.totalGamesThisRound} this round, ${s.upsetsCalledCorrectly.length} upsets)${champ}`);
  }

  if (upsets.length > 0) {
    console.log(`\n${upsets.length} upset(s) this round`);
  }
}

main();
