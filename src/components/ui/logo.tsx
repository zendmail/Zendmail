import Image from "next/image";
import { cn } from "@/lib/utils";

// Intrinsic sizes of the files in /public (see logo.png, logo-dark.png, logo-icon.png).
const LOGO_RATIO = 720 / 131;
const ICON_RATIO = 160 / 175;

type LogoVariant =
  /** Full-colour logo on light surfaces, white-wordmark logo when the `.dark` theme is active. */
  | "auto"
  /** Full-colour logo — for white / light backgrounds. */
  | "light"
  /** Logo with a white wordmark — for dark backgrounds such as the navy sidebar. */
  | "onDark";

/**
 * The Zendmail logo (Z-arrow mark + "Zendmail" wordmark).
 * Assets live in /public: logo.png, logo-dark.png and logo-icon.png.
 */
export function Logo({
  height = 28,
  variant = "auto",
  priority = false,
  className,
}: {
  height?: number;
  variant?: LogoVariant;
  priority?: boolean;
  className?: string;
}) {
  const width = Math.round(height * LOGO_RATIO);
  const common = { width, height, priority, unoptimized: true, draggable: false } as const;

  return (
    <span
      role="img"
      aria-label="Zendmail"
      className={cn("inline-flex shrink-0 items-center", className)}
      style={{ width, height }}
    >
      {variant === "onDark" ? (
        <Image src="/logo-dark.png" alt="" {...common} />
      ) : variant === "light" ? (
        <Image src="/logo.png" alt="" {...common} />
      ) : (
        <>
          <Image src="/logo.png" alt="" className="dark:hidden" {...common} />
          <Image src="/logo-dark.png" alt="" className="hidden dark:block" {...common} />
        </>
      )}
    </span>
  );
}

/** Just the Z-arrow mark, for compact spots (collapsed nav, avatars, favicons). */
export function LogoIcon({
  size = 28,
  priority = false,
  className,
}: {
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/logo-icon.png"
      alt="Zendmail"
      width={Math.round(size * ICON_RATIO)}
      height={size}
      priority={priority}
      unoptimized
      draggable={false}
      className={cn("shrink-0", className)}
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
