import { getAllPosts } from '@/lib/blog';
import BlogClient from '@/components/BlogClient';

export const metadata = {
  title: 'Blog — The Bracket Lab',
};

export default function BlogPage() {
  const posts = getAllPosts();

  return <BlogClient posts={posts} />;
}
