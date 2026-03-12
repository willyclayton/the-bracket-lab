import { VISIBLE_MODELS } from '@/lib/models';

export const metadata = {
  title: 'Live Dashboard — The Bracket Lab',
};

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-mono text-xs text-lab-muted">LIVE</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-lab-white mb-2">
          Tournament Dashboard
        </h1>
        <p className="text-lab-muted">
          Real-time accuracy tracking across all 6 models.
        </p>
      </div>

      {/* Pre-tournament state */}
      <div className="rounded-xl border border-dashed border-lab-border bg-lab-surface/50 p-12 text-center mb-12">
        <p className="text-4xl mb-4">🏀</p>
        <p className="text-lab-white font-semibold text-lg mb-2">Tournament hasn&apos;t started yet</p>
        <p className="text-sm text-lab-muted max-w-md mx-auto">
          Picks lock March 19. Round of 64 tips off March 20.
          The leaderboard, bracket view, and accuracy tracker will go live once games start.
        </p>
      </div>

      {/* Leaderboard placeholder */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-lab-white mb-4">Leaderboard</h2>
        <div className="rounded-xl border border-lab-border bg-lab-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-lab-border">
                <th className="text-left px-4 py-3 text-lab-muted font-mono text-xs">#</th>
                <th className="text-left px-4 py-3 text-lab-muted font-mono text-xs">Model</th>
                <th className="text-center px-3 py-3 text-lab-muted font-mono text-xs">R64</th>
                <th className="text-center px-3 py-3 text-lab-muted font-mono text-xs">R32</th>
                <th className="text-center px-3 py-3 text-lab-muted font-mono text-xs">S16</th>
                <th className="text-center px-3 py-3 text-lab-muted font-mono text-xs">E8</th>
                <th className="text-center px-3 py-3 text-lab-muted font-mono text-xs">F4</th>
                <th className="text-center px-3 py-3 text-lab-muted font-mono text-xs">Final</th>
                <th className="text-right px-4 py-3 text-lab-muted font-mono text-xs">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {VISIBLE_MODELS.map((model, i) => (
                <tr key={model.id} className="border-b border-lab-border last:border-0">
                  <td className="px-4 py-3 font-mono text-lab-muted">{i + 1}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span>{model.icon}</span>
                      <span className="font-medium" style={{ color: model.color }}>{model.name}</span>
                    </span>
                  </td>
                  <td className="text-center px-3 py-3 font-mono text-lab-muted">—</td>
                  <td className="text-center px-3 py-3 font-mono text-lab-muted">—</td>
                  <td className="text-center px-3 py-3 font-mono text-lab-muted">—</td>
                  <td className="text-center px-3 py-3 font-mono text-lab-muted">—</td>
                  <td className="text-center px-3 py-3 font-mono text-lab-muted">—</td>
                  <td className="text-center px-3 py-3 font-mono text-lab-muted">—</td>
                  <td className="text-right px-4 py-3 font-mono text-lab-muted">0 / 1920</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bracket view placeholder */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-lab-white mb-4">Bracket View</h2>
        <div className="rounded-xl border border-lab-border bg-lab-surface p-12 text-center text-lab-muted text-sm">
          Interactive bracket visualization coming when picks lock.
          Toggle models on/off. Click any matchup to see each model&apos;s pick.
        </div>
      </section>

      {/* Round recaps placeholder */}
      <section>
        <h2 className="text-xl font-bold text-lab-white mb-4">Round Recaps</h2>
        <div className="rounded-xl border border-lab-border bg-lab-surface p-8 text-center text-lab-muted text-sm">
          Round-by-round analysis will be posted as the tournament progresses.
        </div>
      </section>
    </div>
  );
}
