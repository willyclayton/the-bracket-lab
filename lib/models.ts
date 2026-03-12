export interface Model {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  tagline: string;
  color: string;
  colorClass: string;
  bgClass: string;
  glowClass: string;
  icon: string; // emoji for now, swap for custom icons later
  description: string;
  espnBracketUrl?: string;
}

export const MODELS: Model[] = [
  {
    id: 'the-scout',
    slug: 'the-scout',
    name: 'The Scout',
    subtitle: 'LLM Matchup Analyst',
    tagline: 'Film room intelligence at machine speed.',
    color: '#3b82f6',
    colorClass: 'text-scout',
    bgClass: 'model-scout-bg',
    glowClass: 'glow-scout',
    icon: '🎬',
    description: 'Evaluates every matchup like a head scout — coaching experience, roster age, injuries, clutch performance, travel distance, and momentum. The eye test, automated.',
  },
  {
    id: 'the-quant',
    slug: 'the-quant',
    name: 'The Quant',
    subtitle: 'Monte Carlo Simulation',
    tagline: '10,000 simulations. Zero feelings.',
    color: '#22c55e',
    colorClass: 'text-quant',
    bgClass: 'model-quant-bg',
    glowClass: 'glow-quant',
    icon: '📊',
    description: 'Ingests efficiency ratings, assigns win probabilities, simulates the tournament 10,000 times. The bracket is whatever outcome happens most. No feelings, no narratives.',
  },
  {
    id: 'the-historian',
    slug: 'the-historian',
    name: 'The Historian',
    subtitle: 'Archetype Matching',
    tagline: 'Every team has a twin. History already played this game.',
    color: '#f59e0b',
    colorClass: 'text-historian',
    bgClass: 'model-historian-bg',
    glowClass: 'glow-historian',
    icon: '📜',
    description: 'Finds every 2026 team\'s closest statistical twin from past tournaments (2010–2025). Uses what actually happened to that twin as the prediction.',
  },
  {
    id: 'the-chaos-agent',
    slug: 'the-chaos-agent',
    name: 'The Chaos Agent',
    subtitle: 'Upset Detector',
    tagline: 'Your bracket is too safe. This one isn\'t.',
    color: '#ef4444',
    colorClass: 'text-chaos',
    bgClass: 'model-chaos-bg',
    glowClass: 'glow-chaos',
    icon: '🔥',
    description: 'Doesn\'t ask who\'s better. Asks what could go wrong for the favorite. Engineered to find upsets. The bracket everyone screenshots.',
  },
  {
    id: 'the-agent',
    slug: 'the-agent',
    name: 'The Agent',
    subtitle: 'Autonomous AI Researcher',
    tagline: 'No rules. No prompts. Just: build me a bracket.',
    color: '#00ff88',
    colorClass: 'text-agent',
    bgClass: 'model-agent-bg',
    glowClass: 'glow-agent',
    icon: '🤖',
    description: 'Claude Code pointed at the tournament with one instruction: figure it out. No methodology defined. The agent decides what matters. The story is the process.',
  },
  {
    id: 'the-super-agent',
    slug: 'the-super-agent',
    name: 'The Super Agent',
    subtitle: 'Iterative ML Predictor',
    tagline: 'The Agent improvised. This one trained.',
    color: '#a855f7',
    colorClass: 'text-superagent',
    bgClass: 'model-superagent-bg',
    glowClass: 'glow-superagent',
    icon: '🧠',
    description: 'Trains on a decade of tournament data, tests against a holdout year, and iterates across 3 research cycles. No cherrypicking — the model earns its bracket through measurable improvement.',
  },
  {
    id: 'the-optimizer',
    slug: 'the-optimizer',
    name: 'The Optimizer',
    subtitle: 'ESPN Points Maximizer',
    tagline: 'Every other model predicts games. This one plays the scoring system.',
    color: '#06b6d4',
    colorClass: 'text-optimizer',
    bgClass: 'model-optimizer-bg',
    glowClass: 'glow-optimizer',
    icon: '🎯',
    description: 'Doesn\'t optimize for correct picks — optimizes for ESPN bracket points. A correct champion is worth 32 first-round picks. This model exploits the scoring system by maximizing expected value across the full bracket path.',
  },
  {
    id: 'the-scout-prime',
    slug: 'the-scout-prime',
    name: 'The Scout Prime',
    subtitle: 'Data-Saturated LLM Analyst',
    tagline: 'Same instincts. Ten times the intel.',
    color: '#64748b',
    colorClass: 'text-scoutprime',
    bgClass: 'model-scoutprime-bg',
    glowClass: 'glow-scoutprime',
    icon: '🔬',
    description: 'The Scout saw 6 factors per matchup. Scout Prime sees 30. Same LLM analysis method, radically more data — efficiency ratings, shooting splits, rebounding, historical archetypes, coaching records, upset vulnerability scores. The question: does more intel mean better picks?',
  },
];

export const MODEL_MAP = Object.fromEntries(MODELS.map((m) => [m.id, m]));

// ESPN-style scoring
export const ROUND_POINTS = {
  round_of_64: 10,
  round_of_32: 20,
  sweet_16: 40,
  elite_8: 80,
  final_four: 160,
  championship: 320,
};

export const ROUND_LABELS: Record<string, string> = {
  round_of_64: 'R64',
  round_of_32: 'R32',
  sweet_16: 'S16',
  elite_8: 'E8',
  final_four: 'F4',
  championship: 'Final',
};

export const MAX_SCORE = 1920;
