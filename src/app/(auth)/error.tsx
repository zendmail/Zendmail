"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function AuthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Auth route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px]">
        <ErrorState reset={reset} compact />
      </div>
    </div>
  );
}
