import percentileData from '@/data/espn-percentiles.json';

type YearData = {
  totalBrackets: number;
  scoreToPercentile: number[][];
} | null;

const data = percentileData as Record<string, YearData>;

export function getEspnPercentile(score: number, year: string): number | null {
  const yearData = data[year];
  if (!yearData) return null;

  const table = yearData.scoreToPercentile; // sorted descending by score

  // Above highest data point
  if (score >= table[0][0]) return table[0][1];
  // Below lowest data point
  if (score <= table[table.length - 1][0]) return table[table.length - 1][1];

  // Find the two points to interpolate between
  for (let i = 0; i < table.length - 1; i++) {
    const [hiScore, hiPct] = table[i];
    const [loScore, loPct] = table[i + 1];
    if (score <= hiScore && score >= loScore) {
      const t = (score - loScore) / (hiScore - loScore);
      return Math.round((loPct + t * (hiPct - loPct)) * 10) / 10;
    }
  }

  return null;
}
