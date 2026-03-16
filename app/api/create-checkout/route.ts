import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  });
}

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

const RATE_LIMIT_MAX = 10; // max checkout sessions per window
const RATE_LIMIT_WINDOW = 300; // 5 minutes in seconds

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') || 'https://the-bracket-lab.vercel.app';

  // Rate limiting
  const redis = getRedis();
  if (redis) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const ipHash = hashIp(ip);
    const key = `ratelimit:checkout:${ipHash}`;

    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }
    if (count > RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(RATE_LIMIT_WINDOW) } }
      );
    }
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'AI Cheat Sheet — March Madness 2026',
              description:
                '9 AI models. Lock picks, smart upsets, trap games, and sleeper picks.',
            },
            unit_amount: 299, // $2.99
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/api/unlock?session_id={CHECKOUT_SESSION_ID}&product=cheat-sheet`,
      cancel_url: `${origin}/cheat-sheet`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
