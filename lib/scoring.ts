import { BracketData, Results, ModelScore } from './types';
import { ROUND_POINTS } from './models';

export function calculateScore(bracket: BracketData, results: Results): ModelScore {
  const score: ModelScore = {
    modelId: bracket.model,
    round_of_64: 0,
    round_of_32: 0,
    sweet_16: 0,
    elite_8: 0,
    final_four: 0,
    championship: 0,
    total: 0,
    correctPicks: 0,
    totalPicks: 0,
    accuracy: 0,
  };

  const completedGames = results.games.filter((g) => g.completed);
  const resultMap = new Map(completedGames.map((g) => [g.gameId, g]));

  for (const [round, points] of Object.entries(ROUND_POINTS)) {
    const picks = bracket.rounds[round as keyof typeof bracket.rounds] || [];

    for (const pick of picks) {
      const result = resultMap.get(pick.gameId);
      if (!result) continue;

      score.totalPicks++;

      if (pick.pick === result.winner) {
        score.correctPicks++;
        score[round as keyof typeof ROUND_POINTS] += points;
        score.total += points;
      }
    }
  }

  score.accuracy = score.totalPicks > 0
    ? Math.round((score.correctPicks / score.totalPicks) * 100)
    : 0;

  return score;
}

export function rankModels(scores: ModelScore[]): ModelScore[] {
  return [...scores].sort((a, b) => b.total - a.total);
}
