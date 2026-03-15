import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

function getRedis() {
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });
}

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const purchased = await getRedis().get(`cs:email:${normalizedEmail}`);

  if (!purchased) {
    return NextResponse.json({ error: 'No purchase found for this email' }, { status: 404 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('cs_unlocked', '1', {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: false,
    sameSite: 'lax',
  });
  return response;
}
