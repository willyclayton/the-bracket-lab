import Link from 'next/link';
import { Model } from '@/lib/models';

interface ModelCardProps {
  model: Model;
  index: number;
  champion?: string;
  championEliminated?: boolean;
  score?: number;
  locked?: boolean;
}

export default function ModelCard({
  model,
  index,
  champion,
  championEliminated = false,
  score,
  locked = false,
}: ModelCardProps) {
  return (
    <Link href={`/models/${model.slug}`}>
      <div
        className={`
          group relative overflow-hidden rounded-xl border border-lab-border
          bg-lab-surface p-6 transition-all duration-300
          hover:border-opacity-60 hover:translate-y-[-2px]
          ${model.bgClass} ${model.glowClass}
          ${championEliminated ? 'eliminated' : ''}
        `}
        style={{ borderColor: `${model.color}33` }}
      >
        {/* Model number */}
        <div className="absolute top-4 right-4 font-mono text-xs text-lab-muted">
          MODEL {String(index + 1).padStart(2, '0')}
        </div>

        {/* Icon + Name */}
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl">{model.icon}</span>
          <div>
            <h3
              className="text-lg font-bold tracking-tight"
              style={{ color: model.color }}
            >
              {model.name}
            </h3>
            <p className="text-xs font-mono text-lab-muted">{model.subtitle}</p>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-sm italic text-lab-muted mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
          &ldquo;{model.tagline}&rdquo;
        </p>

        {/* Champion pick + Score */}
        <div className="flex items-end justify-between">
          <div>
            {champion ? (
              <>
                <p className="text-[10px] uppercase tracking-widest text-lab-muted mb-1">
                  Champion
                </p>
                <p className="text-sm font-semibold text-lab-white">
                  {championEliminated ? <s>{champion}</s> : champion}
                </p>
              </>
            ) : (
              <p className="text-xs font-mono text-lab-muted">
                {locked ? 'Picks locked' : 'Picks lock Mar 19'}
              </p>
            )}
          </div>
          {score !== undefined && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-lab-muted mb-1">
                Score
              </p>
              <p className="text-lg font-bold font-mono" style={{ color: model.color }}>
                {score}
              </p>
            </div>
          )}
        </div>

        {/* Hover indicator */}
        <div
          className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500"
          style={{ backgroundColor: model.color }}
        />
      </div>
    </Link>
  );
}
