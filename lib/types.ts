export interface Game {
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

export interface BracketData {
  model: string;
  displayName: string;
  tagline: string;
  color: string;
  generated: string;
  locked: boolean;
  espnBracketUrl: string;
  champion: string;
  championEliminated: boolean;
  finalFour: string[];
  rounds: {
    round_of_64: Game[];
    round_of_32: Game[];
    sweet_16: Game[];
    elite_8: Game[];
    final_four: Game[];
    championship: Game[];
  };
}

export interface ResultGame {
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
  gameTime: string;
}

export interface Results {
  lastUpdated: string;
  currentRound: string;
  games: ResultGame[];
}

export interface ModelScore {
  modelId: string;
  round_of_64: number;
  round_of_32: number;
  sweet_16: number;
  elite_8: number;
  final_four: number;
  championship: number;
  total: number;
  correctPicks: number;
  totalPicks: number;
  accuracy: number;
}
