import type { ExerciseLog } from "@/hooks/useExerciseLogs";

export interface StreakInfo {
  /** Sequência atual em dias (não quebra no dia corrente se ainda não treinou). */
  current: number;
  /** Maior sequência já alcançada. */
  best: number;
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/**
 * Sequência de dias com pelo menos um exercício concluído.
 * O dia de hoje não quebra a streak até terminar (off-by-one clássico).
 */
export function computeWorkoutStreak(logs: ExerciseLog[]): StreakInfo {
  const days = new Set<string>();
  logs.forEach(l => {
    if (l.completed) days.add(dayKey(new Date(l.createdAt)));
  });

  const today = new Date();
  let cursor = new Date(today);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);

  let current = 0;
  while (days.has(dayKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  const all = [...days].sort();
  for (const key of all) {
    if (prev) {
      const [py, pm, pd] = prev.split("-").map(Number);
      const [cy, cm, cd] = key.split("-").map(Number);
      const prevDate = new Date(py, pm - 1, pd);
      const currDate = new Date(cy, cm - 1, cd);
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86400000);
      if (diffDays === 1) run += 1;
      else run = 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = key;
  }

  return { current, best };
}
