'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import type { BlogPostMeta } from '@/lib/blog';

const FILTERS = ['all', 'recap', 'obituary', 'analysis', 'preview', 'methodology'] as const;
type Filter = typeof FILTERS[number];

const GRADIENT_MAP: Record<string, string> = {
  analysis: 'bg-cat-analysis',
  recap: 'bg-cat-recap',
  obituary: 'bg-cat-obituary',
  preview: 'bg-cat-preview',
  methodology: 'bg-cat-analysis',
};

const PILL_MAP: Record<string, string> = {
  analysis: 'cat-pill-analysis',
  recap: 'cat-pill-recap',
  obituary: 'cat-pill-obituary',
  preview: 'cat-pill-preview',
  methodology: 'cat-pill-methodology',
};

function formatDateBadge(dateStr: string): { month: string; day: string } {
  if (!dateStr) return { month: '', day: '' };
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = String(d.getDate());
  return { month, day };
}

export default function BlogClient({ posts }: { posts: BlogPostMeta[] }) {
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const [fading, setFading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  function handleFilter(filter: Filter) {
    if (filter === activeFilter) return;
    setFading(true);
    setTimeout(() => {
      setActiveFilter(filter);
      setFading(false);
    }, 150);
  }

  const filtered = activeFilter === 'all'
    ? posts
    : posts.filter((p) => p.type === activeFilter);

  const heroCards = filtered.slice(0, 2);
  const smallCards = filtered.slice(2);

  return (
    <div className="mx-auto max-w-[1100px] px-6 sm:px-8">
      {/* Header */}
      <div className="pt-10 pb-0">
        <h1 className="text-[32px] font-bold text-lab-white mb-1.5">The Lab Notes</h1>
        <p className="text-sm text-lab-muted">
          Recaps, analysis, and the occasional eulogy from 6 AI models competing in March Madness 2026.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-lab-border mt-6 mb-0">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => handleFilter(f)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors capitalize ${
              activeFilter === f
                ? 'text-lab-white border-lab-white'
                : 'text-lab-muted border-transparent hover:text-lab-white'
            }`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className={`blog-fade py-8 ${fading ? 'fading' : ''}`}
      >
        {filtered.length === 0 ? (
          <p className="text-lab-muted text-center py-12">
            No posts in this category yet.
          </p>
        ) : (
          <>
            {/* Top row: hero cards */}
            {heroCards.length > 0 && (
              <div
                className={`grid gap-5 mb-6 ${
                  heroCards.length >= 2
                    ? 'grid-cols-1 md:grid-cols-[3fr_2fr]'
                    : 'grid-cols-1'
                }`}
              >
                {heroCards.map((post, i) => {
                  const { month, day } = formatDateBadge(post.date);
                  const gradient = GRADIENT_MAP[post.type ?? 'analysis'] ?? 'bg-cat-analysis';
                  const pill = PILL_MAP[post.type ?? 'analysis'] ?? 'cat-pill-analysis';
                  return (
                    <Link key={post.slug} href={`/blog/${post.slug}`}>
                      <div className="rounded-xl overflow-hidden cursor-pointer hover:-translate-y-0.5 transition-transform">
                        <div
                          className={`${gradient} relative flex flex-col justify-end min-h-[320px] p-6`}
                        >
                          {/* Date badge */}
                          {month && (
                            <div className="absolute top-5 left-5 font-mono text-center leading-tight">
                              <span className="text-[11px] uppercase text-lab-muted tracking-wider block">
                                {month}
                              </span>
                              <span className={`text-lab-white font-medium block ${i === 0 ? 'text-[28px]' : 'text-[22px]'}`}>
                                {day}
                              </span>
                            </div>
                          )}
                          {/* Overlay */}
                          <div
                            className="absolute bottom-0 left-0 right-0 p-6"
                            style={{
                              background:
                                'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
                            }}
                          >
                            <span
                              className={`${pill} inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wide mb-2`}
                            >
                              {post.type ?? 'post'}
                            </span>
                            <h2
                              className={`text-lab-white mb-2 leading-tight ${
                                i === 0 ? 'text-[28px]' : 'text-xl'
                              }`}
                              style={{ fontFamily: 'var(--font-serif)' }}
                            >
                              {post.title}
                            </h2>
                            {post.excerpt && (
                              <p className="text-[13px] text-white/70 leading-snug">
                                {post.excerpt}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Small grid */}
            {smallCards.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {smallCards.map((post) => {
                  const { month, day } = formatDateBadge(post.date);
                  const gradient = GRADIENT_MAP[post.type ?? 'analysis'] ?? 'bg-cat-analysis';
                  const pill = PILL_MAP[post.type ?? 'analysis'] ?? 'cat-pill-analysis';
                  return (
                    <Link key={post.slug} href={`/blog/${post.slug}`}>
                      <div className="rounded-[10px] border border-lab-border bg-lab-surface overflow-hidden cursor-pointer hover:border-[#555] hover:-translate-y-0.5 transition-all">
                        <div className={`${gradient} h-[100px] relative`}>
                          {month && (
                            <div className="absolute top-3 left-3 font-mono text-center leading-tight">
                              <span className="text-[11px] uppercase text-lab-muted tracking-wider block">
                                {month}
                              </span>
                              <span className="text-[22px] text-lab-white font-medium block">
                                {day}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <span
                            className={`${pill} inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wide mb-2`}
                          >
                            {post.type ?? 'post'}
                          </span>
                          <h3
                            className="text-base text-lab-white mb-1.5 leading-snug"
                            style={{ fontFamily: 'var(--font-serif)' }}
                          >
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p className="text-xs text-lab-muted leading-snug">
                              {post.excerpt}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
