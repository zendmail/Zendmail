import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import type { ReactNode } from "react";

// Official brand assets are not bundled. Download them from each platform's brand page and place them at
// public/logos/shopify.svg and public/logos/woocommerce.svg (see public/logos/README.md).
const logoFiles = {
  shopify: { file: "shopify.svg", width: 500, height: 142.8 },
  woocommerce: { file: "woocommerce.svg", width: 183.6, height: 47.5 },
} as const;

export function BrandLogo({ brand, fallback }: { brand: keyof typeof logoFiles; fallback: ReactNode }) {
  const { file, width, height } = logoFiles[brand];
  const available = existsSync(path.join(process.cwd(), "public", "logos", file));
  if (!available) return <>{fallback}</>;
  const label = brand === "shopify" ? "Shopify" : "WooCommerce";
  return <Image src={`/logos/${file}`} alt={`${label} logo`} width={width} height={height} className="h-5 w-auto" />;
}
