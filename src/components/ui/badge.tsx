import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "primary";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-surface-secondary text-text-secondary",
  success: "bg-success-surface text-success",
  warning: "bg-warning-surface text-warning",
  danger: "bg-danger-surface text-danger",
  primary: "bg-primary-surface text-primary",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}

const campaignStatusTone: Record<string, BadgeTone> = {
  Draft: "neutral",
  Scheduled: "primary",
  Sending: "warning",
  Sent: "success",
  Paused: "warning",
  Failed: "danger",
  DRAFT: "neutral",
  SCHEDULED: "primary",
  SENDING: "warning",
  SENT: "success",
  PAUSED: "warning",
  FAILED: "danger",
};

const campaignStatusLabel: Record<string, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  SENDING: "Sending",
  SENT: "Sent",
  PAUSED: "Paused",
  FAILED: "Failed",
};

export function CampaignStatusBadge({ status }: { status: string }) {
  return <Badge tone={campaignStatusTone[status] ?? "neutral"}>{campaignStatusLabel[status] ?? status}</Badge>;
}

const contactStatusTone: Record<string, BadgeTone> = {
  SUBSCRIBER: "neutral",
  CUSTOMER: "primary",
  LEAD: "warning",
  VIP: "success",
  INACTIVE: "neutral",
  UNSUBSCRIBED: "danger",
  BOUNCED: "danger",
};

const contactStatusLabel: Record<string, string> = {
  SUBSCRIBER: "Subscriber",
  CUSTOMER: "Customer",
  LEAD: "Lead",
  VIP: "VIP",
  INACTIVE: "Inactive",
  UNSUBSCRIBED: "Unsubscribed",
  BOUNCED: "Bounced",
};

export function ContactStatusBadge({ status }: { status: string }) {
  return <Badge tone={contactStatusTone[status] ?? "neutral"}>{contactStatusLabel[status] ?? status}</Badge>;
}
