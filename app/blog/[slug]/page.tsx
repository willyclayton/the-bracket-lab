import { MDXRemote } from 'next-mdx-remote/rsc';
import { getAllPosts, getPostBySlug } from '@/lib/blog';
import { MODEL_MAP } from '@/lib/models';
import { notFound } from 'next/navigation';

interface Props {
  params: { slug: string };
}

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
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  try {
    const { meta } = getPostBySlug(params.slug);
    return { title: `${meta.title} — The Bracket Lab` };
  } catch {
    return { title: 'Post Not Found — The Bracket Lab' };
  }
}

export default function BlogPostPage({ params }: Props) {
  let meta, content;
  try {
    ({ meta, content } = getPostBySlug(params.slug));
  } catch {
    notFound();
  }

  const modelMeta = meta.model ? MODEL_MAP[meta.model] : null;
  const colorClasses = meta.model ? MODEL_COLOR_CLASSES[meta.model] : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          {meta.date && (
            <span className="font-mono text-xs text-lab-muted">{formatDate(meta.date)}</span>
          )}
          {modelMeta && colorClasses && (
            <span className={`text-xs px-2 py-0.5 rounded border ${colorClasses.border} ${colorClasses.text}`}>
              {modelMeta.icon} {modelMeta.name}
            </span>
          )}
          {meta.type && (
            <span className="text-xs px-2 py-0.5 rounded border border-lab-border text-lab-muted uppercase font-mono">
              {meta.type}
            </span>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-lab-white leading-tight">{meta.title}</h1>
        {meta.excerpt && (
          <p className="mt-4 text-lab-muted text-lg leading-relaxed">{meta.excerpt}</p>
        )}
        <div className="mt-6 border-t border-lab-border" />
      </div>

      {/* Body */}
      <article className="prose prose-invert prose-lab max-w-none">
        <MDXRemote source={content} />
      </article>
    </div>
  );
}
