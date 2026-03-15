import { BracketData, Game } from './types';
import { MODELS } from './models';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ModelPick {
  modelId: string;
  modelName: string;
  color: string;
  pick: string;
  confidence: number;
  reasoning: string;
}

export interface GameAgreement {
  gameId: string;
  round: string;
  region: string;
  seed1: number;
  team1: string;
  seed2: number;
  team2: string;
  consensusPick: string;
  consensusSeed: number;
  otherTeam: string;
  otherSeed: number;
  agreementCount: number;
  totalModels: number;
  avgConfidence: number;
  modelPicks: ModelPick[];
}

export interface SleeperPick {
  team: string;
  deepestRound: string;
  deepestRoundLabel: string;
  modelPicks: ModelPick[];
  avgConfidence: number;
}

export interface FinalFourEntry {
  team: string;
  count: number;
  models: { modelId: string; modelName: string; color: string }[];
}

export interface ChampionEntry {
  team: string;
  count: number;
  avgConfidence: number;
  models: { modelId: string; modelName: string; color: string }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const ROUND_ORDER = ['round_of_64', 'round_of_32', 'sweet_16', 'elite_8', 'final_four', 'championship'] as const;

const ROUND_DISPLAY: Record<string, string> = {
  round_of_64: 'Round of 64',
  round_of_32: 'Round of 32',
  sweet_16: 'Sweet 16',
  elite_8: 'Elite 8',
  final_four: 'Final Four',
  championship: 'Championship',
};

function getModelMeta(id: string) {
  const m = MODELS.find((m) => m.id === id);
  return { modelName: m?.name ?? id, color: m?.color ?? '#888' };
}

// ── Core: build per-game agreement across all models ───────────────────────

export function buildAgreementMap(
  brackets: Record<string, BracketData>
): Record<string, GameAgreement> {
  const gameMap: Record<string, { game: Game; picks: ModelPick[] }> = {};
  const modelIds = Object.keys(brackets);

  for (const modelId of modelIds) {
    const bracket = brackets[modelId];
    if (!bracket) continue;
    const { modelName, color } = getModelMeta(modelId);

    for (const roundKey of ROUND_ORDER) {
      const games = bracket.rounds[roundKey as keyof typeof bracket.rounds] ?? [];
      for (const game of games) {
        if (!game.pick) continue;
        if (!gameMap[game.gameId]) {
          gameMap[game.gameId] = { game, picks: [] };
        }
        gameMap[game.gameId].picks.push({
          modelId,
          modelName,
          color,
          pick: game.pick,
          confidence: game.confidence,
          reasoning: game.reasoning,
        });
      }
    }
  }

  const result: Record<string, GameAgreement> = {};
  for (const [gameId, { game, picks }] of Object.entries(gameMap)) {
    // Count picks per team
    const counts: Record<string, number> = {};
    const confSums: Record<string, number> = {};
    for (const p of picks) {
      counts[p.pick] = (counts[p.pick] || 0) + 1;
      confSums[p.pick] = (confSums[p.pick] || 0) + p.confidence;
    }

    // Find consensus (most-picked team)
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const consensusPick = sorted[0][0];
    const agreementCount = sorted[0][1];
    const avgConfidence = Math.round(confSums[consensusPick] / agreementCount);

    const consensusSeed = consensusPick === game.team1 ? game.seed1 : game.seed2;
    const otherTeam = consensusPick === game.team1 ? game.team2 : game.team1;
    const otherSeed = consensusPick === game.team1 ? game.seed2 : game.seed1;

    result[gameId] = {
      gameId,
      round: game.round,
      region: game.region,
      seed1: game.seed1,
      team1: game.team1,
      seed2: game.seed2,
      team2: game.team2,
      consensusPick,
      consensusSeed,
      otherTeam,
      otherSeed,
      agreementCount,
      totalModels: picks.length,
      avgConfidence,
      modelPicks: picks,
    };
  }

  return result;
}

// ── Lock Picks: 7+/N agreement ──────────────────────────────────────────

export function getLockPicks(
  agreementMap: Record<string, GameAgreement>,
  minAgreement = 7
): GameAgreement[] {
  return Object.values(agreementMap)
    .filter((g) => g.agreementCount >= minAgreement)
    .sort((a, b) => b.agreementCount - a.agreementCount || b.avgConfidence - a.avgConfidence);
}

// ── Smart Upsets: consensus pick is the higher seed number (lower-seeded team) ──

export function getSmartUpsets(
  agreementMap: Record<string, GameAgreement>,
  minAgreement = 4
): GameAgreement[] {
  return Object.values(agreementMap)
    .filter((g) => {
      // Consensus pick is the "underdog" (higher seed number = lower seed)
      return g.consensusSeed > g.otherSeed && g.agreementCount >= minAgreement;
    })
    .sort((a, b) => b.agreementCount - a.agreementCount || b.avgConfidence - a.avgConfidence);
}

// ── Trap Games: favorite (lower seed number) wins but agreement is only 4-5/N ──

export function getTrapGames(
  agreementMap: Record<string, GameAgreement>,
  maxAgreement = 5
): GameAgreement[] {
  return Object.values(agreementMap)
    .filter((g) => {
      // Consensus is the favorite (lower seed number) but agreement is weak
      const totalModels = g.totalModels;
      const minForTrap = Math.ceil(totalModels / 2); // must be consensus (majority)
      return (
        g.consensusSeed < g.otherSeed &&
        g.agreementCount >= minForTrap &&
        g.agreementCount <= maxAgreement &&
        g.round === 'round_of_64' // trap games are most actionable in R64
      );
    })
    .sort((a, b) => a.agreementCount - b.agreementCount || a.avgConfidence - b.avgConfidence);
}

// ── Final Four & Champion consensus ─────────────────────────────────────

export function getFinalFourConsensus(
  brackets: Record<string, BracketData>
): { finalFour: FinalFourEntry[]; champions: ChampionEntry[] } {
  const ffCounts: Record<string, { count: number; models: { modelId: string; modelName: string; color: string }[] }> = {};
  const champCounts: Record<string, { count: number; confSum: number; models: { modelId: string; modelName: string; color: string }[] }> = {};

  for (const [modelId, bracket] of Object.entries(brackets)) {
    if (!bracket) continue;
    const { modelName, color } = getModelMeta(modelId);
    const modelRef = { modelId, modelName, color };

    // Final Four
    for (const team of bracket.finalFour ?? []) {
      if (!team) continue;
      if (!ffCounts[team]) ffCounts[team] = { count: 0, models: [] };
      ffCounts[team].count++;
      ffCounts[team].models.push(modelRef);
    }

    // Champion
    if (bracket.champion) {
      if (!champCounts[bracket.champion]) champCounts[bracket.champion] = { count: 0, confSum: 0, models: [] };
      champCounts[bracket.champion].count++;
      champCounts[bracket.champion].models.push(modelRef);
      // Get championship game confidence
      const champGame = bracket.rounds.championship?.[0];
      if (champGame) champCounts[bracket.champion].confSum += champGame.confidence;
    }
  }

  const finalFour: FinalFourEntry[] = Object.entries(ffCounts)
    .map(([team, d]) => ({ team, count: d.count, models: d.models }))
    .sort((a, b) => b.count - a.count);

  const champions: ChampionEntry[] = Object.entries(champCounts)
    .map(([team, d]) => ({
      team,
      count: d.count,
      avgConfidence: d.count > 0 ? Math.round(d.confSum / d.count) : 0,
      models: d.models,
    }))
    .sort((a, b) => b.count - a.count);

  return { finalFour, champions };
}

// ── Sleeper Pick: team in S16+ picked by only 1-2 models with high confidence ──

export function getSleeperPick(
  brackets: Record<string, BracketData>
): SleeperPick | null {
  // For each team, track the deepest round any model picks them in
  const deepRounds = ['sweet_16', 'elite_8', 'final_four', 'championship'] as const;
  const teamDeep: Record<string, { round: string; picks: ModelPick[] }> = {};

  for (const [modelId, bracket] of Object.entries(brackets)) {
    if (!bracket) continue;
    const { modelName, color } = getModelMeta(modelId);

    for (const roundKey of deepRounds) {
      const games = bracket.rounds[roundKey as keyof typeof bracket.rounds] ?? [];
      for (const game of games) {
        if (!game.pick) continue;
        const team = game.pick;
        const roundIdx = deepRounds.indexOf(roundKey as typeof deepRounds[number]);

        if (!teamDeep[team]) {
          teamDeep[team] = { round: roundKey, picks: [] };
        }

        const currentIdx = deepRounds.indexOf(teamDeep[team].round as typeof deepRounds[number]);
        if (roundIdx > currentIdx) {
          teamDeep[team].round = roundKey;
        }

        // Track that this model picks this team in a deep round
        if (!teamDeep[team].picks.find((p) => p.modelId === modelId)) {
          teamDeep[team].picks.push({
            modelId,
            modelName,
            color,
            pick: team,
            confidence: game.confidence,
            reasoning: game.reasoning,
          });
        }
      }
    }
  }

  // Find teams picked by 1-2 models in deep rounds with high avg confidence
  const candidates: SleeperPick[] = [];
  for (const [team, data] of Object.entries(teamDeep)) {
    if (data.picks.length >= 1 && data.picks.length <= 2) {
      const avgConf = Math.round(data.picks.reduce((s, p) => s + p.confidence, 0) / data.picks.length);
      if (avgConf >= 55) {
        candidates.push({
          team,
          deepestRound: data.round,
          deepestRoundLabel: ROUND_DISPLAY[data.round] ?? data.round,
          modelPicks: data.picks,
          avgConfidence: avgConf,
        });
      }
    }
  }

  // Sort by deepest round (later = better), then confidence
  candidates.sort((a, b) => {
    const aIdx = deepRounds.indexOf(a.deepestRound as typeof deepRounds[number]);
    const bIdx = deepRounds.indexOf(b.deepestRound as typeof deepRounds[number]);
    return bIdx - aIdx || b.avgConfidence - a.avgConfidence;
  });

  return candidates[0] ?? null;
}
