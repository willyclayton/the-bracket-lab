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
  generated: string | null;
  locked: boolean;
  espnBracketUrl: string | null;
  champion: string | null;
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
  gameClock?: string; // e.g. "1H 12:00", "HT", "2H 8:42", "OT 3:15" — present when game is in progress
}

export interface Results {
  lastUpdated: string | null;
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
