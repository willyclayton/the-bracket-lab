import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { VISIBLE_MODELS } from '@/lib/models';

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export async function GET(req: NextRequest) {
  const redis = getRedis();

  if (!redis) {
    return NextResponse.json({ counts: {}, userVote: null });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipHash = hashIp(ip);

  const [counts, existingVote] = await Promise.all([
    redis.hgetall('votes:counts'),
    redis.get<string>(`votes:ips:${ipHash}`),
  ]);

  return NextResponse.json({
    counts: counts ?? {},
    userVote: existingVote ?? null,
  });
}

export async function POST(req: NextRequest) {
  const redis = getRedis();

  if (!redis) {
    return NextResponse.json({ error: 'Redis not configured (missing KV_REST_API_URL or KV_REST_API_TOKEN)' }, { status: 503 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipHash = hashIp(ip);
  const { modelId } = await req.json();

  // Validate modelId
  const validIds = VISIBLE_MODELS.map((m) => m.id);
  if (!validIds.includes(modelId)) {
    return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
  }

  // Check if already voted
  const existing = await redis.get<string>(`votes:ips:${ipHash}`);
  if (existing) {
    return NextResponse.json({ error: 'Already voted' }, { status: 409 });
  }

  // Record vote atomically
  await Promise.all([
    redis.hincrby('votes:counts', modelId, 1),
    redis.set(`votes:ips:${ipHash}`, modelId),
  ]);

  // Return updated counts
  const counts = await redis.hgetall('votes:counts');
  return NextResponse.json({ counts: counts ?? {}, userVote: modelId });
}
