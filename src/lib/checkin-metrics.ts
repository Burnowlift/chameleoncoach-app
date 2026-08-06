import type { CheckinData } from "@/hooks/useCheckins";

export interface MonthlyCheckinProgress {
  total: number;
  responded: number;
  pct: number;
}

/**
 * Percentual de check-ins respondidos no mês.
 *
 * Considera todos os check-ins disponibilizados no mês informado
 * (pending, completed ou expired) e calcula quantos foram respondidos.
 * Retorna 0% quando não existe nenhum check-in no mês.
 */
export function monthlyCheckinProgress(
  checkins: Pick<CheckinData, "available_at" | "status">[],
  now: Date = new Date(),
): MonthlyCheckinProgress {
  const inMonth = checkins.filter((c) => {
    const d = new Date(c.available_at);
    return (
      !Number.isNaN(d.getTime()) &&
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    );
  });
  const total = inMonth.length;
  const responded = inMonth.filter((c) => c.status === "completed").length;
  return { total, responded, pct: total > 0 ? Math.round((responded / total) * 100) : 0 };
}
