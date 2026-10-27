import type { ReactNode } from "react";
import { legal } from "@/lib/legal";

export function LegalDoc({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <article className="space-y-6 text-[14.5px] leading-[1.7] text-text-secondary [&_h2]:mt-8 [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:text-text-primary [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-text-primary [&_a]:text-primary [&_a]:underline">
      <header>
        <h1 className="text-[28px] font-extrabold tracking-[-0.025em] text-text-primary">{title}</h1>
        <p className="mt-1 text-[12.5px] text-text-tertiary">Last updated: {legal.lastUpdated}</p>
        {intro && <p className="mt-4">{intro}</p>}
      </header>
      {children}
    </article>
  );
}
