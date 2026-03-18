import percentileData from '@/data/espn-percentiles.json';

type YearData = {
  totalBrackets: number;
  scoreToPercentile: number[][];
} | null;

const data = percentileData as Record<string, YearData>;

export interface PercentileResult {
  percentile: number;
  isEstimate: boolean;
}

/**
 * Look up ESPN percentile for a score in a given year.
 * Falls back to most recent year with data if the requested year is null.
 */
export function getEspnPercentile(score: number, year: string): PercentileResult | null {
  let yearData = data[year];
  let isEstimate = false;

  // If no data for this year, fall back to most recent year with data
  if (!yearData) {
    const availableYears = Object.keys(data)
      .filter((y) => data[y] !== null)
      .sort((a, b) => Number(b) - Number(a));
    if (availableYears.length === 0) return null;
    yearData = data[availableYears[0]];
    isEstimate = true;
  }

  if (!yearData) return null;

  const table = yearData.scoreToPercentile; // sorted descending by score

  // Above highest data point
  if (score >= table[0][0]) return { percentile: table[0][1], isEstimate };
  // Below lowest data point
  if (score <= table[table.length - 1][0]) return { percentile: table[table.length - 1][1], isEstimate };

  // Find the two points to interpolate between
  for (let i = 0; i < table.length - 1; i++) {
    const [hiScore, hiPct] = table[i];
    const [loScore, loPct] = table[i + 1];
    if (score <= hiScore && score >= loScore) {
      const t = (score - loScore) / (hiScore - loScore);
      const percentile = Math.round((loPct + t * (hiPct - loPct)) * 10) / 10;
      return { percentile, isEstimate };
    }
  }

  return null;
}
