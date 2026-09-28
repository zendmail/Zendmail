"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Admin route error:", error);
  }, [error]);

  return (
    <div className="max-w-[1200px]">
      <ErrorState reset={reset} />
    </div>
  );
}
