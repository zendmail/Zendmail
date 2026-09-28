"use client";

import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SendCampaignButton({ count, disabled }: { count: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <Button
      type="submit"
      className="send-campaign-button relative min-h-11 w-full overflow-hidden"
      disabled={isDisabled}
      aria-live="polite"
    >
      {pending ? (
        <>
          <span className="send-flight-trail" aria-hidden="true" />
          <LoaderCircle size={16} className="send-spinner" />
          Dispatching to {count} contacts...
        </>
      ) : (
        <>
          <Send size={15} className="send-icon" />
          Send now to {count} contacts
          <CheckCircle2 size={15} className="send-ready-mark" aria-hidden="true" />
        </>
      )}
    </Button>
  );
}
