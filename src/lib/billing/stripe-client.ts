import "server-only";
import Stripe from "stripe";

export class BillingNotConfiguredError extends Error {
  constructor() {
    super("Billing isn't connected yet — set STRIPE_SECRET_KEY in your environment to enable it.");
    this.name = "BillingNotConfiguredError";
  }
}

let client: Stripe | null = null;

/** Lazily constructs the Stripe client so a missing key doesn't crash the app at import time. */
export function getStripeClient(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new BillingNotConfiguredError();
  client = new Stripe(key);
  return client;
}

export function isBillingConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
