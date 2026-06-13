/**
 * Tabelas de RPE × Repetições para estimar 1RM nos levantamentos básicos do Powerlifting.
 *
 * Estrutura escalável: cada levantamento tem sua própria matriz.
 * - Chaves: RPE (10, 9, 8, 7.5, 7, 6, 5)
 * - Array (índice 0..11): repetições 1..12
 * - Valor: percentual do 1RM (0..1)
 *
 * Cálculo: 1RM = peso / percentual
 */

export type LiftType = "squat" | "bench" | "deadlift";

export const LIFT_LABELS: Record<LiftType, string> = {
  squat: "Agachamento",
  bench: "Supino",
  deadlift: "Levantamento Terra",
};

export const SUPPORTED_RPES = [10, 9, 8, 7.5, 7, 6, 5] as const;
export type SupportedRpe = (typeof SUPPORTED_RPES)[number];

export const MIN_REPS = 1;
export const MAX_REPS = 12;

type RpeMatrix = Record<number, number[]>;

const SQUAT_PERCENTAGES: RpeMatrix = {
  10:  [1.0,   0.965, 0.94,  0.92,  0.895, 0.87,  0.845, 0.82,  0.8,   0.78,  0.76,  0.74],
  9:   [0.975, 0.95,  0.925, 0.9,   0.875, 0.85,  0.825, 0.8,   0.78,  0.76,  0.74,  0.72],
  8:   [0.95,  0.925, 0.9,   0.875, 0.85,  0.825, 0.8,   0.78,  0.76,  0.74,  0.72,  0.7],
  7.5: [0.935, 0.9125,0.8875,0.8625,0.8375,0.8125,0.7875,0.7675,0.7475,0.7275,0.7075,0.6875],
  7:   [0.92,  0.9,   0.875, 0.85,  0.825, 0.8,   0.775, 0.755, 0.735, 0.715, 0.695, 0.675],
  6:   [0.895, 0.875, 0.85,  0.825, 0.8,   0.775, 0.75,  0.73,  0.71,  0.69,  0.67,  0.65],
  5:   [0.87,  0.85,  0.825, 0.8,   0.775, 0.75,  0.725, 0.705, 0.685, 0.665, 0.645, 0.625],
};

const BENCH_PERCENTAGES: RpeMatrix = {
  10:  [1.0,   0.95,  0.915, 0.885, 0.86,  0.83,  0.805, 0.78,  0.755, 0.73,  0.705, 0.68],
  9:   [0.96,  0.92,  0.89,  0.86,  0.835, 0.805, 0.78,  0.755, 0.73,  0.705, 0.68,  0.655],
  8:   [0.925, 0.895, 0.865, 0.835, 0.81,  0.78,  0.755, 0.73,  0.705, 0.68,  0.655, 0.63],
  7.5: [0.91,  0.88,  0.85,  0.82,  0.795, 0.765, 0.74,  0.715, 0.69,  0.665, 0.64,  0.615],
  7:   [0.895, 0.865, 0.835, 0.805, 0.78,  0.75,  0.725, 0.7,   0.675, 0.65,  0.625, 0.6],
  6:   [0.865, 0.835, 0.805, 0.775, 0.75,  0.72,  0.695, 0.67,  0.645, 0.62,  0.595, 0.57],
  5:   [0.835, 0.805, 0.775, 0.745, 0.735, 0.705, 0.68,  0.655, 0.625, 0.6,   0.58,  0.55],
};

const DEADLIFT_PERCENTAGES: RpeMatrix = {
  10:  [1.0,   0.965, 0.935, 0.9,   0.875, 0.85,  0.825, 0.8,   0.78,  0.76,  0.74,  0.72],
  9:   [0.98,  0.95,  0.92,  0.885, 0.855, 0.83,  0.805, 0.78,  0.76,  0.74,  0.72,  0.7],
  8:   [0.96,  0.93,  0.9,   0.865, 0.835, 0.81,  0.785, 0.76,  0.74,  0.72,  0.7,   0.68],
  7.5: [0.95,  0.92,  0.89,  0.855, 0.825, 0.8,   0.775, 0.75,  0.73,  0.71,  0.69,  0.67],
  7:   [0.94,  0.91,  0.88,  0.845, 0.815, 0.79,  0.765, 0.74,  0.72,  0.7,   0.68,  0.66],
  6:   [0.92,  0.895, 0.875, 0.835, 0.805, 0.78,  0.755, 0.73,  0.71,  0.69,  0.67,  0.65],
  5:   [0.9,   0.875, 0.85,  0.81,  0.78,  0.755, 0.73,  0.705, 0.685, 0.665, 0.645, 0.625],
};

const TABLES: Record<LiftType, RpeMatrix> = {
  squat: SQUAT_PERCENTAGES,
  bench: BENCH_PERCENTAGES,
  deadlift: DEADLIFT_PERCENTAGES,
};

/** Retorna o percentual da tabela ou null se inválido. */
export function getRpePercentage(lift: LiftType, rpe: number, reps: number): number | null {
  const table = TABLES[lift];
  if (!table) return null;
  const row = table[rpe];
  if (!row) return null;
  if (reps < MIN_REPS || reps > MAX_REPS) return null;
  const pct = row[reps - 1];
  return typeof pct === "number" ? pct : null;
}

/** Calcula o 1RM estimado. Retorna 0 se a entrada for inválida. */
export function calculate1RM(lift: LiftType, weight: number, reps: number, rpe: number): number {
  if (!Number.isFinite(weight) || weight <= 0) return 0;
  const pct = getRpePercentage(lift, rpe, reps);
  if (!pct || pct <= 0) return 0;
  return Math.round((weight / pct) * 10) / 10;
}

/**
 * Aproxima um RPE arbitrário (ex: 6.5, 8.5) para o RPE válido mais próximo
 * presente na tabela. Retorna null se o valor for inválido ou abaixo do mínimo.
 */
export function snapToTableRpe(rpe: number): SupportedRpe | null {
  if (!Number.isFinite(rpe) || rpe < 5) return null;
  let best: SupportedRpe = SUPPORTED_RPES[0];
  let bestDiff = Math.abs(rpe - best);
  for (const r of SUPPORTED_RPES) {
    const d = Math.abs(rpe - r);
    if (d < bestDiff) { best = r; bestDiff = d; }
  }
  return best;
}

/**
 * Infere o RPE a partir de um registro já calculado, procurando na tabela
 * do lift qual RPE (para a mesma reps) gera o percentual mais próximo de
 * `weight / estimated1rm`. Retorna null quando não há correspondência razoável
 * (ex: registros legados sem RPE associado).
 */
export function inferRpe(
  lift: LiftType,
  weight: number,
  reps: number,
  estimated1rm: number,
): SupportedRpe | null {
  if (!Number.isFinite(weight) || !Number.isFinite(estimated1rm) || estimated1rm <= 0) return null;
  if (reps < MIN_REPS || reps > MAX_REPS) return null;
  const targetPct = weight / estimated1rm;
  let bestRpe: SupportedRpe | null = null;
  let bestDiff = Infinity;
  for (const r of SUPPORTED_RPES) {
    const pct = getRpePercentage(lift, r, reps);
    if (pct == null) continue;
    const diff = Math.abs(pct - targetPct);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestRpe = r;
    }
  }
  // Tolerância: >3 p.p. = provavelmente legado, não inferir.
  if (bestDiff > 0.03) return null;
  return bestRpe;
}
