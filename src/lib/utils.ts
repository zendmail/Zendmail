import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}
