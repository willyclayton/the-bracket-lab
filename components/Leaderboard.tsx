import { ModelScore } from '@/lib/types';
import { MODEL_MAP, ROUND_LABELS, MAX_SCORE } from '@/lib/models';

interface LeaderboardProps {
  scores: ModelScore[];
  compact?: boolean;
}

export default function Leaderboard({ scores, compact = false }: LeaderboardProps) {
  const sorted = [...scores].sort((a, b) => b.total - a.total);

  if (compact) {
    return (
      <div className="rounded-xl border border-lab-border bg-lab-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-lab-border">
          <h3 className="text-sm font-semibold text-lab-white">Leaderboard</h3>
        </div>
        {sorted.map((s, i) => {
          const model = MODEL_MAP[s.modelId];
          if (!model) return null;
          return (
            <div
              key={s.modelId}
              className="flex items-center justify-between px-4 py-2.5 border-b border-lab-border last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-lab-muted w-4">
                  {i + 1}
                </span>
                <span className="text-sm" style={{ color: model.color }}>
                  {model.icon}
                </span>
                <span className="text-sm font-medium text-lab-text">
                  {model.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-lab-muted">{s.accuracy}%</span>
                <span className="text-sm font-bold font-mono" style={{ color: model.color }}>
                  {s.total}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Full leaderboard with round breakdown
  return (
    <div className="rounded-xl border border-lab-border bg-lab-surface overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-lab-border">
            <th className="text-left px-4 py-3 text-lab-muted font-mono text-xs">#</th>
            <th className="text-left px-4 py-3 text-lab-muted font-mono text-xs">Model</th>
            {Object.values(ROUND_LABELS).map((label) => (
              <th key={label} className="text-center px-3 py-3 text-lab-muted font-mono text-xs">
                {label}
              </th>
            ))}
            <th className="text-center px-4 py-3 text-lab-muted font-mono text-xs">ACC</th>
            <th className="text-right px-4 py-3 text-lab-muted font-mono text-xs">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => {
            const model = MODEL_MAP[s.modelId];
            if (!model) return null;
            const rounds = Object.keys(ROUND_LABELS) as (keyof typeof ROUND_LABELS)[];
            return (
              <tr key={s.modelId} className="border-b border-lab-border last:border-0 hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-lab-muted">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{model.icon}</span>
                    <span className="font-medium" style={{ color: model.color }}>
                      {model.name}
                    </span>
                  </div>
                </td>
                {rounds.map((round) => (
                  <td key={round} className="text-center px-3 py-3 font-mono text-lab-text">
                    {s[round as keyof ModelScore] || 0}
                  </td>
                ))}
                <td className="text-center px-4 py-3 font-mono text-lab-muted">{s.accuracy}%</td>
                <td className="text-right px-4 py-3">
                  <span className="font-bold font-mono text-base" style={{ color: model.color }}>
                    {s.total}
                  </span>
                  <span className="text-lab-muted text-xs font-mono"> / {MAX_SCORE}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
