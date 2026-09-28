import Link from "next/link";
import { ArrowUpRight, ListPlus, MailPlus, Workflow } from "lucide-react";
import { createDraftCampaignAction } from "@/lib/actions/campaign-actions";

const actions = [
  {
    href: "/contacts/import",
    label: "Import contacts",
    description: "Add people to your audience",
    icon: ListPlus,
    tone: "bg-surface-secondary text-text-secondary",
    kind: "link",
  },
  {
    href: "/campaigns",
    label: "Create campaign",
    description: "Reach your audience",
    icon: MailPlus,
    tone: "bg-primary-surface text-primary",
    kind: "campaign",
  },
  {
    href: "/automations/new",
    label: "Build automation",
    description: "Automate a customer journey",
    icon: Workflow,
    tone: "bg-success-surface text-success",
    kind: "link",
  },
];

function ActionContents({ action }: { action: (typeof actions)[number] }) {
  const Icon = action.icon;
  return (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${action.tone}`}>
        <Icon size={17} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-[13px] font-semibold text-text-primary">
          {action.label}
          <ArrowUpRight size={13} className="text-text-tertiary transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-text-secondary">{action.description}</span>
      </span>
    </>
  );
}

export function LaunchPad() {
  return (
    <section className="dashboard-reveal dashboard-launch-pad rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-xs)]" style={{ animationDelay: "70ms" }}>
      <div className="mb-3 flex items-center justify-between gap-4 px-1">
        <div>
          <h2 className="text-[16px] font-semibold text-text-primary">Quick actions</h2>
          <p className="mt-0.5 text-[13px] text-text-secondary">Shortcuts for common workflows.</p>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {actions.map((action, index) => {
          const className = "dashboard-launch-action group flex min-w-0 items-center gap-3 rounded-[var(--radius-md)] border border-transparent bg-surface-secondary/55 p-3 text-left transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";
          const style = { animationDelay: `${160 + index * 70}ms` };
          return (
            action.kind === "campaign" ? (
              <form key={action.label} action={createDraftCampaignAction} style={style}>
                <button type="submit" className={`${className} w-full`}>
                  <ActionContents action={action} />
                </button>
              </form>
            ) : (
              <Link key={action.label} href={action.href} className={className} style={style}>
                <ActionContents action={action} />
              </Link>
            )
          );
        })}
      </div>
    </section>
  );
}
