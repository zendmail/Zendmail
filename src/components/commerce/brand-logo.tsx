import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import type { ReactNode } from "react";

// Official brand assets are not bundled. Download them from each platform's brand page and place them at
// public/logos/shopify.svg and public/logos/woocommerce.svg (see public/logos/README.md).
const logoFiles = {
  shopify: "shopify.svg",
  woocommerce: "woocommerce.svg",
} as const;

export function BrandLogo({ brand, fallback }: { brand: keyof typeof logoFiles; fallback: ReactNode }) {
  const file = logoFiles[brand];
  const available = existsSync(path.join(process.cwd(), "public", "logos", file));
  if (!available) return <>{fallback}</>;
  const label = brand === "shopify" ? "Shopify" : "WooCommerce";
  return <Image src={`/logos/${file}`} alt={`${label} logo`} width={28} height={28} className="h-7 w-7 object-contain" />;
}
