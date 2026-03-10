import { MODELS } from '@/lib/models';

export const metadata = {
  title: 'About — The Bracket Lab',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-lab-white mb-4">
          About The Bracket Lab
        </h1>
      </div>

      <div className="prose space-y-6 mb-16">
        <p>
          The Bracket Lab is an experiment: what happens when you pit five fundamentally
          different AI-powered prediction approaches against each other in the NCAA
          Tournament, then track their accuracy in real time?
        </p>
        <p>
          Each model sees the tournament through a completely different lens. One runs
          10,000 statistical simulations. Another evaluates matchups like a basketball
          scout. A third finds historical twins for every team. The fourth is
          specifically engineered to find upsets. And the fifth? An autonomous AI agent
          with zero instructions — it decided its own methodology.
        </p>
        <p>
          Every pick is locked before the tournament starts and verified via ESPN
          Tournament Challenge. No retroactive edits. No cherry-picking. Just five
          brackets, published in advance, tracked against reality.
        </p>
      </div>

      <section className="mb-16">
        <h2 className="text-xl font-bold text-lab-white mb-6">Built By</h2>
        <div className="rounded-xl border border-lab-border bg-lab-surface p-6">
          <p className="text-lab-text font-semibold mb-1">Will Clayton</p>
          <p className="text-sm text-lab-muted mb-3">Data & AI Consultant · Chicago, IL</p>
          <div className="flex gap-4 text-sm">
            <a href="https://willyclayton.com" className="text-scout hover:underline">willyclayton.com</a>
            <a href="https://linkedin.com/in/willclayton" className="text-scout hover:underline">LinkedIn</a>
            <a href="https://github.com/willclayton" className="text-scout hover:underline">GitHub</a>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-xl font-bold text-lab-white mb-6">Tech Stack</h2>
        <div className="rounded-xl border border-lab-border bg-lab-surface p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-lab-muted font-mono text-xs mb-1">FRONTEND</p>
              <p className="text-lab-text">Next.js · Tailwind CSS · MDX · Recharts</p>
            </div>
            <div>
              <p className="text-lab-muted font-mono text-xs mb-1">HOSTING</p>
              <p className="text-lab-text">Vercel · GitHub</p>
            </div>
            <div>
              <p className="text-lab-muted font-mono text-xs mb-1">MODEL SCRIPTS</p>
              <p className="text-lab-text">Python · Claude API · Claude Code</p>
            </div>
            <div>
              <p className="text-lab-muted font-mono text-xs mb-1">DATA</p>
              <p className="text-lab-text">KenPom · BartTorvik · ESPN · JSON</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-lab-white mb-6">ESPN Bracket Links</h2>
        <div className="rounded-xl border border-lab-border bg-lab-surface p-6">
          <p className="text-sm text-lab-muted mb-4">
            All picks verified and locked via ESPN Tournament Challenge before the Round of 64.
          </p>
          <div className="space-y-2">
            {MODELS.map((model) => (
              <div key={model.id} className="flex items-center justify-between py-2 border-b border-lab-border last:border-0">
                <span className="text-sm font-medium" style={{ color: model.color }}>
                  {model.icon} {model.name}
                </span>
                <span className="text-xs font-mono text-lab-muted">
                  {/* TODO: Replace with actual ESPN links */}
                  Link posted March 19
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
