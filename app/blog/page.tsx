import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import { MODEL_MAP } from '@/lib/models';

export const metadata = {
  title: 'Blog — The Bracket Lab',
};

const MODEL_COLOR_CLASSES: Record<string, { border: string; text: string }> = {
  'the-scout':       { border: 'border-scout/30',     text: 'text-scout' },
  'the-quant':       { border: 'border-quant/30',     text: 'text-quant' },
  'the-historian':   { border: 'border-historian/30', text: 'text-historian' },
  'the-chaos-agent': { border: 'border-chaos/30',     text: 'text-chaos' },
  'the-agent':       { border: 'border-agent/30',     text: 'text-agent' },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-12">
        <span className="font-mono text-xs text-lab-muted">DISPATCHES</span>
        <h1 className="text-3xl sm:text-4xl font-bold text-lab-white mt-2 mb-4">Blog</h1>
        <p className="text-lab-muted">
          Methodology deep dives, round recaps, model obituaries, and lessons learned.
        </p>
      </div>

      <div className="space-y-6">
        {posts.map((post) => {
          const modelMeta = post.model ? MODEL_MAP[post.model] : null;
          const colorClasses = post.model ? MODEL_COLOR_CLASSES[post.model] : null;

          return (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <article className="rounded-xl border border-lab-border bg-lab-surface p-6 hover:border-lab-muted transition-colors cursor-pointer">
                <div className="flex items-center gap-3 mb-3">
                  {post.date && (
                    <span className="font-mono text-xs text-lab-muted uppercase">
                      {formatDate(post.date)}
                    </span>
                  )}
                  {modelMeta && colorClasses && (
                    <span className={`text-xs px-2 py-0.5 rounded border ${colorClasses.border} ${colorClasses.text}`}>
                      {modelMeta.name}
                    </span>
                  )}
                  {post.type && (
                    <span className="text-xs px-2 py-0.5 rounded border border-lab-border text-lab-muted uppercase font-mono">
                      {post.type}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-lab-white mb-2">{post.title}</h2>
                {post.excerpt && (
                  <p className="text-sm text-lab-muted">{post.excerpt}</p>
                )}
              </article>
            </Link>
          );
        })}

        {posts.length === 0 && (
          <p className="text-lab-muted text-sm">No posts published yet. Check back March 15.</p>
        )}
      </div>
    </div>
  );
}
