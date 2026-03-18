'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { VISIBLE_MODELS, MODELS } from '@/lib/models';

const HIDDEN_MODELS = MODELS.filter((m) => m.hidden);

interface Props {
  currentSlug: string;
}

export default function ModelNavStrip({ currentSlug }: Props) {
  const activeRef = useRef<HTMLAnchorElement | null>(null);
  const isHiddenModel = HIDDEN_MODELS.some((m) => m.slug === currentSlug);
  const [showHidden, setShowHidden] = useState(isHiddenModel);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ inline: 'center', behavior: 'instant', block: 'nearest' });
    }
  }, []);

  const allModels = showHidden ? [...VISIBLE_MODELS, ...HIDDEN_MODELS] : VISIBLE_MODELS;
  const index = allModels.findIndex((m) => m.slug === currentSlug);
  const prevModel = index > 0 ? allModels[index - 1] : null;
  const nextModel = index < allModels.length - 1 ? allModels[index + 1] : null;

  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
      {/* Prev arrow */}
      {prevModel ? (
        <Link
          href={`/models/${prevModel.slug}`}
          className="flex-shrink-0 w-8 h-8 rounded-lg border border-lab-border flex items-center justify-center text-lab-muted hover:text-lab-white hover:border-lab-muted transition-all text-sm"
          aria-label={`Previous: ${prevModel.name}`}
        >
          &#8592;
        </Link>
      ) : (
        <span className="flex-shrink-0 w-8 h-8 rounded-lg border border-lab-border flex items-center justify-center text-[#333] text-sm">
          &#8592;
        </span>
      )}

      {/* Model buttons */}
      {VISIBLE_MODELS.map((m) => {
        const isCurrent = m.slug === currentSlug;
        return (
          <Link
            key={m.id}
            href={`/models/${m.slug}`}
            ref={isCurrent ? activeRef : undefined}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isCurrent
                ? 'bg-white/[0.08] text-lab-white'
                : 'text-lab-muted hover:text-lab-white'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: m.color }}
            />
            <span>{m.name}</span>
          </Link>
        );
      })}

      {/* Toggle for hidden models */}
      <button
        onClick={() => setShowHidden(!showHidden)}
        className="flex-shrink-0 w-8 h-8 rounded-lg border border-lab-border flex items-center justify-center text-lab-muted hover:text-lab-white hover:border-lab-muted transition-all text-sm"
        aria-label={showHidden ? 'Hide experimental models' : 'Show experimental models'}
        title={showHidden ? 'Hide experimental models' : 'Show experimental models'}
      >
        {showHidden ? '−' : '+'}
      </button>

      {/* Hidden model buttons (shown when toggled) */}
      {showHidden && HIDDEN_MODELS.map((m) => {
        const isCurrent = m.slug === currentSlug;
        return (
          <Link
            key={m.id}
            href={`/models/${m.slug}`}
            ref={isCurrent ? activeRef : undefined}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isCurrent
                ? 'bg-white/[0.08] text-lab-white'
                : 'text-lab-muted hover:text-lab-white'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: m.color }}
            />
            <span>{m.name}</span>
          </Link>
        );
      })}

      {/* Next arrow */}
      {nextModel ? (
        <Link
          href={`/models/${nextModel.slug}`}
          className="flex-shrink-0 w-8 h-8 rounded-lg border border-lab-border flex items-center justify-center text-lab-muted hover:text-lab-white hover:border-lab-muted transition-all text-sm"
          aria-label={`Next: ${nextModel.name}`}
        >
          &#8594;
        </Link>
      ) : (
        <span className="flex-shrink-0 w-8 h-8 rounded-lg border border-lab-border flex items-center justify-center text-[#333] text-sm">
          &#8594;
        </span>
      )}
    </div>
  );
}
