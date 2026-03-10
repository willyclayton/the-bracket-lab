import Link from 'next/link';
import { Model } from '@/lib/models';

interface LeaderboardEntry {
  model: Model;
  score?: number;
  accuracy?: number;
  champion: string;
  rank: number;
}

export default function HomeLeaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  const hasData = entries.some((e) => e.score !== undefined && e.score > 0);

  return (
    <section className="mb-16">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-lab-muted mb-5">
        Leaderboard
      </h3>
      <div className="rounded-xl border border-lab-border bg-lab-surface overflow-hidden">
        <table className="w-full border-collapse">
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.model.id}
                className="border-b border-[#2a2a2a] last:border-b-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-5 py-4 w-10 text-center">
                  <span className="font-mono text-xs text-[#666]">
                    #{entry.rank}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <Link
                    href={`/brackets?model=${entry.model.id}`}
                    className="flex items-center gap-3 group"
                  >
                    <span
                      className="w-[3px] h-[22px] rounded-sm flex-shrink-0"
                      style={{ background: entry.model.color }}
                    />
                    <span className="font-semibold text-lab-white text-sm group-hover:underline underline-offset-2">
                      {entry.model.name}
                    </span>
                  </Link>
                </td>
                <td className="py-4 px-4 text-right hidden sm:table-cell">
                  <span
                    className="font-mono text-sm font-semibold"
                    style={{ color: hasData ? entry.model.color : '#888' }}
                  >
                    {hasData && entry.score !== undefined ? entry.score : '\u2014'}
                  </span>
                </td>
                <td className="py-4 px-4 text-right hidden md:table-cell">
                  <span className="font-mono text-xs text-lab-muted">
                    {hasData && entry.accuracy !== undefined ? `${entry.accuracy}%` : '\u2014'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
