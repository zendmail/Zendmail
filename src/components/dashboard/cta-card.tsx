import { Plus } from "lucide-react";
import { EnvelopeArt } from "@/components/dashboard/dashboard-illustrations";
import { createDraftCampaignAction } from "@/lib/actions/campaign-actions";

export function CtaCard() {
  return (
    <section className="dashboard-cta rounded-[18px] px-6 pb-7 pt-5 text-center text-white shadow-[var(--shadow-md)]">
      <EnvelopeArt className="relative z-10 mx-auto h-[84px] w-auto" />
      <h2 className="relative z-10 mt-2 text-[16.5px] font-bold leading-snug">Turn your ideas into campaigns</h2>
      <p className="relative z-10 mx-auto mt-2 max-w-[260px] text-[12.5px] leading-[1.55] text-[#C5D5F2]">
        Create beautiful emails, automate your workflows, and grow your business.
      </p>
      <form action={createDraftCampaignAction} className="relative z-10 mt-4">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-white px-7 text-[13.5px] font-semibold text-[#0A3FB8] shadow-[0_8px_20px_rgb(0_0_0/0.2)] transition-transform hover:-translate-y-0.5"
        >
          <Plus size={16} strokeWidth={2.4} /> Create campaign
        </button>
      </form>
    </section>
  );
}
