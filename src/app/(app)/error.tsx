"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // The real error detail (message/stack) is logged here, server-side
    // console, not rendered to the user — see ErrorState for why.
    console.error("App route error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-[1200px]">
      <ErrorState reset={reset} />
    </div>
  );
}
