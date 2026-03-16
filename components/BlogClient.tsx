'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import type { BlogPostMeta } from '@/lib/blog';
import { MODELS } from '@/lib/models';

const FILTERS = ['all', 'recap', 'obituary', 'analysis', 'preview', 'methodology'] as const;
type Filter = typeof FILTERS[number];

const PILL_MAP: Record<string, string> = {
  analysis: 'cat-pill-analysis',
  recap: 'cat-pill-recap',
  obituary: 'cat-pill-obituary',
  preview: 'cat-pill-preview',
  methodology: 'cat-pill-methodology',
};

const MODEL_COLOR_MAP: Record<string, string> = Object.fromEntries(
  MODELS.map((m) => [m.slug, m.color])
);

function formatGroupDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

function groupByDate(posts: BlogPostMeta[]): [string, BlogPostMeta[]][] {
  const groups = new Map<string, BlogPostMeta[]>();
  for (const post of posts) {
    const key = post.date || 'undated';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(post);
  }
  return Array.from(groups.entries());
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

  const dateGroups = groupByDate(filtered);

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
      <div className="flex gap-1 border-b border-lab-border mt-6 mb-0 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => handleFilter(f)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors capitalize whitespace-nowrap ${
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
          <div className="blog-timeline">
            {dateGroups.map(([dateStr, groupPosts]) => (
              <div key={dateStr} className="blog-date-group">
                <div className="blog-date-header">
                  <span className="blog-date-header-text font-mono">
                    {formatGroupDate(dateStr)}
                  </span>
                </div>

                {groupPosts.map((post) => {
                  const pill = PILL_MAP[post.type ?? 'analysis'] ?? 'cat-pill-analysis';
                  const accentColor = post.model ? MODEL_COLOR_MAP[post.model] : undefined;

                  return (
                    <Link key={post.slug} href={`/blog/${post.slug}`} className="block">
                      <div className="blog-entry group">
                        {accentColor && (
                          <div
                            className="blog-entry-accent"
                            style={{ background: accentColor }}
                          />
                        )}
                        <div className="flex items-center justify-between mb-2.5">
                          <span
                            className={`${pill} inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide font-mono`}
                          >
                            {post.type ?? 'post'}
                          </span>
                        </div>
                        <h3
                          className="text-xl text-lab-white mb-1.5 leading-snug"
                          style={{ fontFamily: 'var(--font-serif)' }}
                        >
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="text-sm text-lab-muted leading-relaxed">
                            {post.excerpt}
                          </p>
                        )}
                        <span className="blog-entry-link font-mono text-xs text-[#555] mt-2.5 inline-block transition-colors group-hover:text-lab-white">
                          Read &rarr;
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
