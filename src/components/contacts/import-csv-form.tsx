"use client";

import { useActionState } from "react";
import { importContactsCsvAction, type ImportResult } from "@/lib/actions/contact-actions";
import { ErrorBanner, SuccessBanner } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";

export function ImportCsvForm() {
  const [state, formAction, pending] = useActionState<ImportResult | undefined, FormData>(
    importContactsCsvAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <ErrorBanner message={state?.error} />
      <SuccessBanner message={state?.success} />
      {state?.skippedInvalid || state?.skippedDuplicate ? (
        <p className="text-[12.5px] text-text-tertiary -mt-2">
          Skipped {state.skippedInvalid ?? 0} invalid row{state.skippedInvalid === 1 ? "" : "s"} and{" "}
          {state.skippedDuplicate ?? 0} duplicate{state.skippedDuplicate === 1 ? "" : "s"}.
        </p>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="file" className="block text-[13px] font-medium text-text-primary">
          CSV file
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-[13px] text-text-secondary file:mr-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-surface-secondary file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-text-primary"
        />
        <p className="text-[12px] text-text-tertiary">
          Recognized columns: email, first name, last name, phone.
        </p>
      </div>

      <label className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-surface-secondary/60 p-3.5 text-[12.5px] text-text-secondary">
        <input type="checkbox" name="consentConfirmed" className="mt-0.5" required />
        <span>
          I confirm these contacts have given consent to receive marketing emails from this business, and I am
          responsible for lawful use of this list.
        </span>
      </label>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Importing…" : "Import contacts"}
      </Button>
    </form>
  );
}
