"use server";

import { redirect } from "next/navigation";
import { confirmSignup } from "@/lib/signup-forms";

/** Runs only on a button press (POST), so mail scanners that pre-open links cannot confirm a signup by accident. */
export async function confirmSubscriptionAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const { outcome } = await confirmSignup(token);
  redirect(`/confirm-subscription/${encodeURIComponent(token)}?result=${outcome.toLowerCase()}`);
}
