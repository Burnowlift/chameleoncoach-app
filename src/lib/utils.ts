import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Round a number to 1 decimal place avoiding floating-point noise (e.g. 415.29999999999995 → 415.3). */
export function round1(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}

/** Sum SBD lifts and round to 1 decimal place. */
export function sbdTotal(squat: number, bench: number, deadlift: number): number {
  return round1((Number(squat) || 0) + (Number(bench) || 0) + (Number(deadlift) || 0));
}

/**
 * Format a weight value in kilograms using pt-BR locale (comma decimal separator)
 * and a fixed number of decimal places. Examples:
 *   formatKg(415.29999999999995)        → "415,3 kg"
 *   formatKg(180)                       → "180,0 kg"
 *   formatKg(180, { decimals: 0 })      → "180 kg"
 *   formatKg(180, { withUnit: false })  → "180,0"
 */
export function formatKg(
  value: number | null | undefined,
  options: { decimals?: number; withUnit?: boolean } = {},
): string {
  const { decimals = 1, withUnit = true } = options;
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  const formatted = safe.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return withUnit ? `${formatted} kg` : formatted;
}
