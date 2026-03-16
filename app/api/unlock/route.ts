import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Redis } from '@upstash/redis';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  });
}

function getRedis() {
  return new Redis({
    url: process.env.stripe_emails_KV_REST_API_URL!,
    token: process.env.stripe_emails_KV_REST_API_TOKEN!,
  });
}

const PRODUCTS: Record<string, { cookie: string; redirect: string }> = {
  'cheat-sheet': {
    cookie: 'cs_unlocked',
    redirect: '/cheat-sheet',
  },
};

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');
  const product = request.nextUrl.searchParams.get('product') ?? 'cheat-sheet';
  const config = PRODUCTS[product] ?? PRODUCTS['cheat-sheet'];

  if (!sessionId) {
    return NextResponse.redirect(new URL(`${config.redirect}?error=missing_session`, request.url));
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      // Store purchase by email in Redis for cross-device access
      const email = session.customer_details?.email;
      if (email) {
        const normalizedEmail = email.toLowerCase().trim();
        try {
          await getRedis().set(`cs:email:${normalizedEmail}`, '1');
        } catch (redisErr) {
          console.warn('[unlock] Redis set failed — cookie unlock still applied:', redisErr);
        }
      }

      const response = NextResponse.redirect(new URL(config.redirect, request.url));
      response.cookies.set(config.cookie, '1', {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: false,
        sameSite: 'lax',
      });
      return response;
    }

    return NextResponse.redirect(new URL(`${config.redirect}?error=payment_failed`, request.url));
  } catch {
    return NextResponse.redirect(new URL(`${config.redirect}?error=payment_failed`, request.url));
  }
}
