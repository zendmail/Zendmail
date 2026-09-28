import Link from "next/link";
import { ArrowLeft, Check, LayoutTemplate } from "lucide-react";
import { TemplateCreateForm } from "@/components/templates/template-create-form";

export default function CreateTemplatePage() {
  return (
    <div className="mx-auto max-w-[1040px] space-y-5">
      <Link href="/templates" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary">
        <ArrowLeft size={15} /> Back to templates
      </Link>

      <header className="flex items-start gap-3 border-b border-border pb-5">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-primary-surface text-primary">
          <LayoutTemplate size={20} />
        </span>
        <div>
          <h1 className="text-[28px] font-bold leading-[1.2] tracking-normal text-text-primary">Create template</h1>
          <p className="mt-1 text-[14px] leading-[1.5] text-text-secondary">Set up a reusable starting point for your next email.</p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-[10px] border border-border bg-surface p-5 sm:p-6">
          <h2 className="mb-5 text-[16px] font-semibold text-text-primary">Template details</h2>
          <TemplateCreateForm />
        </section>

        <aside className="h-fit rounded-[10px] border border-border bg-surface p-5">
          <p className="text-[12px] font-semibold tracking-[0.02em] text-text-tertiary">STARTER CONTENT</p>
          <h2 className="mt-2 text-[16px] font-semibold text-text-primary">A useful foundation</h2>
          <p className="mt-1.5 text-[13px] leading-[1.5] text-text-secondary">Your template starts with a heading, message, call to action, and footer. Adjust the content in the campaign editor.</p>
          <ul className="mt-4 space-y-2.5">
            {["Heading", "Body copy", "Call-to-action button", "Email footer"].map((item) => (
              <li key={item} className="flex items-center gap-2 text-[12px] text-text-secondary">
                <Check size={14} className="text-success" /> {item}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}