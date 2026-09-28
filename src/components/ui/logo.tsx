import { cn } from "@/lib/utils";

/**
 * The Zendmail lockup, recolored from the transparent logo silhouette.
 */
export function Logo({ height = 20, className }: { height?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label="Zendmail"
      className={cn("logo-lockup logo-lockup--two-tone inline-block shrink-0", className)}
      style={{
        width: height * (571 / 84),
        height,
      }}
    />
  );
}

export function LogoWordmark({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("font-semibold tracking-tight", className)} style={{ fontSize: size }}>
      Zendmail
    </span>
  );
}
