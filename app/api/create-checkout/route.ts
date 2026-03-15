import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') || 'https://the-bracket-lab.vercel.app';

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
