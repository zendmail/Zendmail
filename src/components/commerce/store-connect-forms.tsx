"use client";

import { useActionState, useEffect, useRef } from "react";
import { LoaderCircle, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorBanner, Field, Input, SuccessBanner } from "@/components/auth/form-elements";
import { connectWooCommerceAction } from "@/lib/actions/store-actions";

export function ShopifyConnectForm({ configured }: { configured: boolean }) {
  return (
    <form action="/api/integrations/shopify/connect" method="post" className="space-y-3">
      <Field label="Shopify domain" htmlFor="shopify-domain">
        <Input
          id="shopify-domain"
          name="shop"
          type="text"
          autoComplete="url"
          placeholder="your-store.myshopify.com"
          pattern="[A-Za-z0-9][A-Za-z0-9-]*\.myshopify\.com"
          required
          disabled={!configured}
        />
      </Field>
      <Button type="submit" size="md" disabled={!configured} className="text-[13px]">
        <PlugZap size={15} /> Connect Shopify
      </Button>
      {!configured && (
        <p className="text-[12px] leading-[1.5] text-warning">
          Shopify OAuth and store encryption need to be configured by your administrator before connecting.
        </p>
      )}
    </form>
  );
}

export function WooCommerceConnectForm({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState(connectWooCommerceAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <ErrorBanner message={state?.error} />
      <SuccessBanner message={state?.success} />
      <Field label="Store URL" htmlFor="woocommerce-url">
        <Input
          id="woocommerce-url"
          name="storeUrl"
          type="url"
          autoComplete="url"
          placeholder="https://your-store.com"
          required
          disabled={!configured || pending}
        />
      </Field>
      <Field label="Read-only consumer key" htmlFor="woocommerce-key">
        <Input
          id="woocommerce-key"
          name="consumerKey"
          type="password"
          autoComplete="off"
          placeholder="ck_..."
          required
          disabled={!configured || pending}
        />
      </Field>
      <Field label="Consumer secret" htmlFor="woocommerce-secret">
        <Input
          id="woocommerce-secret"
          name="consumerSecret"
          type="password"
          autoComplete="new-password"
          placeholder="cs_..."
          required
          disabled={!configured || pending}
        />
      </Field>
      {configured ? (
        <p className="text-[12px] leading-[1.5] text-text-secondary">
          Create a read-only REST API key in WooCommerce settings. Credentials are encrypted before storage.
        </p>
      ) : (
        <p className="text-[12px] leading-[1.5] text-warning">
          Store credential encryption must be configured by your administrator before connecting.
        </p>
      )}
      <Button type="submit" size="md" disabled={!configured || pending} className="text-[13px]">
        {pending ? <LoaderCircle size={15} className="animate-spin" /> : <PlugZap size={15} />}
        {pending ? "Verifying store..." : "Connect WooCommerce"}
      </Button>
    </form>
  );
}