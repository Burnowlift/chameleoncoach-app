/**
 * GL Points (IPF Goodlift Coefficient) - powerlifting clássico/raw.
 *
 * Fórmula oficial: GL = Total * 100 / (A - B * exp(-C * BW))
 * Onde BW = peso corporal em kg, Total = soma dos lifts em kg.
 *
 * Coeficientes IPF GL para powerlifting raw (M/F) e para supino raw isolado.
 * Para agachamento e terra isolados, a convenção é usar os mesmos coeficientes
 * do powerlifting raw aplicando só o lift como "total".
 *
 * Referência: IPF GL Coefficients (Goodlift), válidos desde 2020.
 */

export type Sex = "M" | "F";
export type GLKind = "total" | "squat" | "bench" | "deadlift";

interface Coeffs { A: number; B: number; C: number }

// Powerlifting raw (Classic) - usado para Total, Agachamento e Terra
const PL_RAW: Record<Sex, Coeffs> = {
  M: { A: 1199.72839, B: 1025.18162, C: 0.00921 },
  F: { A: 610.32796,  B: 1045.59282, C: 0.03048 },
};

// Bench-only raw (Classic) - apenas supino
const BENCH_RAW: Record<Sex, Coeffs> = {
  M: { A: 320.98041, B: 281.40258, C: 0.01008 },
  F: { A: 142.40398, B: 442.52671, C: 0.04724 },
};

function getCoeffs(sex: Sex, kind: GLKind): Coeffs {
  return kind === "bench" ? BENCH_RAW[sex] : PL_RAW[sex];
}

export interface GLPointsInput {
  /** Carga (kg) - total dos 3 lifts para `total`, ou o 1RM do lift isolado. */
  load: number;
  sex?: Sex | null;
  /** Peso corporal em kg. */
  bw?: number | null;
  kind: GLKind;
}

/**
 * Calcula GL Points. Retorna 0 quando faltam dados (sexo/peso) ou inputs inválidos.
 * Usar 0 (em vez de null) facilita a integração com a ordenação do ranking,
 * que já filtra entradas com valor ≤ 0.
 */
export function glPoints({ load, sex, bw, kind }: GLPointsInput): number {
  if (!sex || !bw || bw <= 0 || !load || load <= 0) return 0;
  const { A, B, C } = getCoeffs(sex, kind);
  const denom = A - B * Math.exp(-C * bw);
  if (denom <= 0) return 0;
  const pts = (load * 100) / denom;
  if (!Number.isFinite(pts) || pts < 0) return 0;
  return Math.round(pts * 100) / 100; // 2 casas decimais
}
