import ModelCard from '@/components/ModelCard';
import { VISIBLE_MODELS } from '@/lib/models';

export const metadata = {
  title: 'The Models — The Bracket Lab',
};

export default function ModelsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-12">
        <span className="font-mono text-xs text-lab-muted">THE COMPETITORS</span>
        <h1 className="text-3xl sm:text-4xl font-bold text-lab-white mt-2 mb-4">
          Meet the Models
        </h1>
        <p className="text-lab-muted max-w-2xl">
          Six fundamentally different approaches to predicting March Madness.
          Each model sees the tournament through a completely different lens —
          where they agree, pay attention. Where they diverge, that&apos;s where it gets interesting.
        </p>
      </div>

      {/* Model cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
        {VISIBLE_MODELS.map((model, i) => (
          <ModelCard key={model.id} model={model} index={i} />
        ))}
      </div>

      {/* Consensus */}
      <section className="mb-16">
        <h2 className="text-xl font-bold text-lab-white mb-6">Where They Agree</h2>
        <div className="space-y-4">
          {/* Champion */}
          <div className="rounded-xl border border-lab-border bg-lab-surface p-6">
            <span className="font-mono text-xs text-lab-muted uppercase tracking-wider">Champion Pick</span>
            <p className="text-lab-white font-semibold text-lg mt-2">
              Duke <span className="text-lab-muted font-normal text-sm">(5 of 9 models)</span>
            </p>
            <p className="text-lab-muted text-sm mt-1">
              The Scout, The Quant, The Historian, The Scout Prime, and The Auto Researcher all pick Duke. The contrarian bloc splits between Illinois (Super Agent, Optimizer), Florida (Agent), and Gonzaga (Chaos Agent).
            </p>
          </div>

          {/* Final Four */}
          <div className="rounded-xl border border-lab-border bg-lab-surface p-6">
            <span className="font-mono text-xs text-lab-muted uppercase tracking-wider">Final Four Consensus</span>
            <div className="mt-3 space-y-2">
              {[
                { team: 'Duke', count: 7, total: 9, note: 'All but Optimizer and Agent' },
                { team: 'Florida', count: 6, total: 9, note: 'Scout, Quant, Historian, Agent, Scout Prime, Auto Researcher' },
                { team: 'Arizona', count: 6, total: 9, note: 'Scout, Quant, Historian, Agent, Scout Prime, Auto Researcher' },
                { team: 'Michigan', count: 5, total: 9, note: 'Scout, Quant, Historian, Agent, Scout Prime' },
              ].map((pick) => (
                <div key={pick.team} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-20 bg-lab-border/50 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-lab-white/60 rounded-full"
                      style={{ width: `${(pick.count / pick.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-lab-white text-sm font-medium w-24">{pick.team}</span>
                  <span className="text-lab-muted text-xs">{pick.count}/{pick.total} &mdash; {pick.note}</span>
                </div>
              ))}
            </div>
            <p className="text-lab-muted text-sm mt-4">
              Four models &mdash; The Scout, The Quant, The Historian, and The Scout Prime &mdash; have the <em>identical</em> Final Four: all four 1-seeds. Remarkable given their completely different methodologies.
            </p>
          </div>

          {/* Upset consensus */}
          <div className="rounded-xl border border-lab-border bg-lab-surface p-6">
            <span className="font-mono text-xs text-lab-muted uppercase tracking-wider">Consensus Upsets</span>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-baseline gap-2">
                <span className="text-lab-white font-medium">(9) Iowa over (8) Clemson</span>
                <span className="text-lab-muted">&mdash; 5/9 models</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lab-white font-medium">(9) Utah St. over (8) Villanova</span>
                <span className="text-lab-muted">&mdash; 5/9 models</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lab-white font-medium">(10) Santa Clara over (7) Kentucky</span>
                <span className="text-lab-muted">&mdash; 4/9 models</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divergence */}
      <section>
        <h2 className="text-xl font-bold text-lab-white mb-6">Where They Disagree</h2>
        <div className="space-y-4">
          {/* Championship game */}
          <div className="rounded-xl border border-lab-border bg-lab-surface p-6">
            <span className="font-mono text-xs text-lab-muted uppercase tracking-wider">Championship Game</span>
            <p className="text-lab-muted text-sm mt-2 mb-3">
              The chalk bloc agrees on Duke, but the path there splits. The contrarian models each tell a completely different story.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {[
                { model: 'The Scout', game: 'Duke vs Michigan', color: '#3b82f6' },
                { model: 'The Quant', game: 'Duke vs Michigan', color: '#22c55e' },
                { model: 'The Historian', game: 'Duke vs Michigan', color: '#f59e0b' },
                { model: 'The Chaos Agent', game: 'Illinois vs Gonzaga', color: '#ef4444' },
                { model: 'The Agent', game: 'Florida vs Arizona', color: '#00ff88' },
                { model: 'The Super Agent', game: 'Illinois vs Purdue', color: '#a855f7' },
                { model: 'The Optimizer', game: 'Illinois vs Purdue', color: '#06b6d4' },
                { model: 'The Scout Prime', game: 'Duke vs Arizona', color: '#64748b' },
                { model: 'The Auto Researcher', game: 'Duke vs Arizona', color: '#10b981' },
              ].map((row) => (
                <div key={row.model} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                  <span className="text-lab-muted">{row.model}:</span>
                  <span className="text-lab-white">{row.game}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Midwest chaos */}
          <div className="rounded-xl border border-lab-border bg-lab-surface p-6">
            <span className="font-mono text-xs text-lab-muted uppercase tracking-wider">Midwest Region: Maximum Chaos</span>
            <p className="text-lab-muted text-sm mt-2">
              Three completely different teams winning the region. Michigan (5 models), Iowa State (2), Texas Tech (2). The path diverges as early as the Round of 32.
            </p>
          </div>

          {/* The two blocs */}
          <div className="rounded-xl border border-lab-border bg-lab-surface p-6">
            <span className="font-mono text-xs text-lab-muted uppercase tracking-wider">The Two Blocs</span>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-lab-white font-medium mb-1">Chalk Bloc</p>
                <p className="text-lab-muted">
                  The Scout, The Quant, The Historian, and The Scout Prime trust the 1-seeds. All four make the Final Four. Duke wins.
                </p>
              </div>
              <div>
                <p className="text-lab-white font-medium mb-1">Contrarian Bloc</p>
                <p className="text-lab-muted">
                  The Chaos Agent and The Optimizer bet on mid-seeds. Zero 1-seeds in The Optimizer&apos;s Final Four. Gonzaga and Illinois as champions.
                </p>
              </div>
            </div>
            <p className="text-lab-muted text-sm mt-3">
              The Auto Researcher splits the difference &mdash; three 1-seeds plus Iowa State as a dark horse.
            </p>
          </div>

          {/* Louisville polarization */}
          <div className="rounded-xl border border-lab-border bg-lab-surface p-6">
            <span className="font-mono text-xs text-lab-muted uppercase tracking-wider">Most Polarizing Team: Louisville</span>
            <p className="text-lab-muted text-sm mt-2">
              Most models have Louisville out by the Sweet 16. The Optimizer has them in the Final Four. Same team, wildly different reads.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
