import Link from "next/link";
import { ArrowRight, Mail, UsersRound, Waypoints, Zap } from "lucide-react";
import { createDraftCampaignAction } from "@/lib/actions/campaign-actions";

const actions = [
  {
    href: "/contacts/import",
    label: "Import contacts",
    description: "Add your contacts from a CSV file or connect your store.",
    icon: UsersRound,
    kind: "link",
  },
  {
    href: "/campaigns",
    label: "Create campaign",
    description: "Design and send your first campaign.",
    icon: Mail,
    kind: "campaign",
  },
  {
    href: "/automations/new",
    label: "Build automation",
    description: "Save time with automated workflows.",
    icon: Waypoints,
    kind: "link",
  },
] as const;

function ActionContents({ action }: { action: (typeof actions)[number] }) {
  const Icon = action.icon;
  return (
    <>
      <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-primary-surface text-primary">
        <Icon size={22} strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[14px] font-bold text-text-primary">{action.label}</span>
        <span className="mt-1 block text-[12.5px] leading-[1.45] text-text-secondary">{action.description}</span>
      </span>
      <ArrowRight
        size={16}
        className="shrink-0 text-text-secondary transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
      />
    </>
  );
}

export function LaunchPad() {
  const cardClass =
    "group flex w-full min-w-0 items-center gap-3.5 rounded-[14px] border border-border bg-surface p-4 shadow-[var(--shadow-xs)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

  return (
    <section className="dashboard-reveal" style={{ animationDelay: "70ms" }} aria-labelledby="quick-actions-title">
      <div className="mb-3 flex items-start gap-2.5 px-1">
        <Zap size={22} className="mt-0.5 text-primary" strokeWidth={2} />
        <div>
          <h2 id="quick-actions-title" className="text-[17px] font-bold leading-tight text-text-primary">Quick actions</h2>
          <p className="mt-0.5 text-[13px] text-text-secondary">Get started with these essential tasks.</p>
        </div>
      </div>
      <div className="grid gap-3.5 md:grid-cols-3">
        {actions.map((action) =>
          action.kind === "campaign" ? (
            <form key={action.label} action={createDraftCampaignAction} className="flex">
              <button type="submit" className={cardClass}>
                <ActionContents action={action} />
              </button>
            </form>
          ) : (
            <Link key={action.label} href={action.href} className={cardClass}>
              <ActionContents action={action} />
            </Link>
          )
        )}
      </div>
    </section>
  );
}
