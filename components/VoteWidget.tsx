'use client';

import { useEffect, useState } from 'react';
import { MODELS } from '@/lib/models';

const STORAGE_KEY = 'bracket-lab-vote-2026';

export default function VoteWidget() {
  const [vote, setVote] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setVote(data.vote ?? null);
        setVotes(data.votes ?? {});
      } catch {
        // ignore bad data
      }
    } else {
      // seed some initial counts so bar chart isn't empty
      const seed: Record<string, number> = {};
      MODELS.forEach((m, i) => { seed[m.id] = [34, 28, 19, 12, 7][i] ?? 10; });
      setVotes(seed);
    }
  }, []);

  function handleVote(modelId: string) {
    if (vote) return; // already voted
    const newVotes = { ...votes, [modelId]: (votes[modelId] ?? 0) + 1 };
    const data = { vote: modelId, votes: newVotes };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setVote(modelId);
    setVotes(newVotes);
  }

  const total = Object.values(votes).reduce((a, b) => a + b, 0);

  if (!mounted) {
    return (
      <div className="rounded-2xl border border-lab-border bg-lab-surface p-8 text-center">
        <div className="h-40" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-lab-border bg-lab-surface p-8">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-lab-white mb-1">Who are you riding with?</h2>
        <p className="text-sm text-lab-muted">
          {vote ? 'Your vote is locked in. No switching.' : 'Pick your model before the tournament starts.'}
        </p>
      </div>

      <div className="space-y-3">
        {MODELS.map((model) => {
          const count = votes[model.id] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isVoted = vote === model.id;
          const hasVoted = !!vote;

          return (
            <button
              key={model.id}
              onClick={() => handleVote(model.id)}
              disabled={hasVoted}
              className={`
                relative w-full flex items-center justify-between rounded-lg px-4 py-3 text-left
                border transition-all duration-150
                ${hasVoted ? 'cursor-default' : 'cursor-pointer hover:border-opacity-80'}
                ${isVoted ? 'border-opacity-60' : 'border-lab-border'}
              `}
              style={{
                borderColor: isVoted ? model.color : undefined,
                background: isVoted ? `${model.color}0d` : undefined,
              }}
            >
              {/* Progress bar fill */}
              {hasVoted && (
                <div
                  className="absolute inset-y-0 left-0 rounded-lg transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: `${model.color}12`,
                  }}
                />
              )}

              <span className="relative flex items-center gap-3 text-sm font-medium" style={{ color: isVoted ? model.color : '#efefef' }}>
                <span>{model.icon}</span>
                <span>{model.name}</span>
                {isVoted && (
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: `${model.color}22`, color: model.color }}>
                    YOUR PICK
                  </span>
                )}
              </span>

              {hasVoted && (
                <span className="relative font-mono text-sm text-lab-muted">
                  {pct}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {vote && (
        <p className="text-center text-xs font-mono text-lab-muted mt-5">
          {total} VOTES CAST
        </p>
      )}
    </div>
  );
}
