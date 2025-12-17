import { loadStripe, Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null>

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!key) {
      console.warn('Stripe publishable key not found')
      return Promise.resolve(null)
    }
    stripePromise = loadStripe(key)
  }
  return stripePromise
}

export interface CheckoutSessionParams {
  priceId: string
  successUrl?: string
  cancelUrl?: string
}

export async function createCheckoutSession(
  params: CheckoutSessionParams,
  token: string
): Promise<string> {
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      priceId: params.priceId,
      successUrl: params.successUrl || `${window.location.origin}/dashboard?success=true`,
      cancelUrl: params.cancelUrl || `${window.location.origin}/pricing?canceled=true`,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create checkout session')
  }

  return data.sessionId
}

export async function redirectToCheckout(
  sessionId: string
): Promise<void> {
  const stripe = await getStripe()
  if (!stripe) {
    throw new Error('Stripe not initialized')
  }

  const { error } = await stripe.redirectToCheckout({ sessionId })

  if (error) {
    throw error
  }
}

export async function createPortalSession(token: string): Promise<string> {
  const response = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create portal session')
  }

  return data.url
}

export const STRIPE_PRICE_IDS = {
  free: process.env.NEXT_PUBLIC_STRIPE_PRICE_FREE,
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
  team: process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM,
}
