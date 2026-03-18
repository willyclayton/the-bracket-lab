'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { VISIBLE_MODELS } from '@/lib/models';

interface Props {
  currentSlug: string;
}

export default function ModelNavStrip({ currentSlug }: Props) {
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ inline: 'center', behavior: 'instant', block: 'nearest' });
    }
  }, []);

  const index = VISIBLE_MODELS.findIndex((m) => m.slug === currentSlug);
  const prevModel = index > 0 ? VISIBLE_MODELS[index - 1] : null;
  const nextModel = index < VISIBLE_MODELS.length - 1 ? VISIBLE_MODELS[index + 1] : null;

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
