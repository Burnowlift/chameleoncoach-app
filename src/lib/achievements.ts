import type { ExerciseLog } from "@/hooks/useExerciseLogs";
import type { RmRecord } from "@/hooks/useRmHistory";

export interface Achievement {
  id: string;
  label: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
}

/**
 * Conquistas calculadas em tempo real a partir dos dados do aluno
 * (sem tabela nova no banco — derivação pura).
 */
export function computeAchievements(logs: ExerciseLog[], rmRecords: RmRecord[]): Achievement[] {
  const completed = logs.filter(l => l.completed);
  const sessions = new Set(completed.map(l => `${l.blockId}-${l.weekNumber}-${l.sessionId}`));
  const sets = completed.reduce((acc, l) => acc + (l.setsData?.length ?? 0), 0);
  const totalVolume = completed.reduce((acc, l) => {
    if (l.setsData && l.setsData.length > 0) {
      return acc + l.setsData.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0);
    }
    return acc + (l.weight || 0);
  }, 0);

  const hasPr = (type: "squat" | "bench" | "deadlift") =>
    rmRecords.some(r => r.sbdType === type);

  const streakDays = new Set<string>();
  completed.forEach(l => {
    const d = new Date(l.createdAt);
    streakDays.add(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
  });

  return [
    {
      id: "first-workout",
      label: "Primeiro treino",
      description: "Registre cargas em pelo menos um exercício",
      unlocked: completed.length > 0,
    },
    {
      id: "ten-sessions",
      label: "Treino número 10",
      description: "Complete 10 sessões de treino",
      unlocked: sessions.size >= 10,
    },
    {
      id: "fifty-sets",
      label: "Máquina de séries",
      description: "Registre 50 séries no total",
      unlocked: sets >= 50,
    },
    {
      id: "volume-ton",
      label: "1.000.000 de quilos",
      description: "Acumule 1 tonelada de volume levantado",
      unlocked: totalVolume >= 1000,
    },
    {
      id: "pr-squat",
      label: "PR no agachamento",
      description: "Registre um 1RM estimado de agachamento",
      unlocked: hasPr("squat"),
    },
    {
      id: "pr-bench",
      label: "PR no supino",
      description: "Registre um 1RM estimado de supino",
      unlocked: hasPr("bench"),
    },
    {
      id: "pr-deadlift",
      label: "PR no terra",
      description: "Registre um 1RM estimado de terra",
      unlocked: hasPr("deadlift"),
    },
    {
      id: "streak-3",
      label: "Sequência de 3 dias",
      description: "Treine 3 dias seguidos",
      unlocked: streakDays.size >= 3 && hasStreakOf(streakDays, 3),
    },
    {
      id: "streak-7",
      label: "Sequência de 7 dias",
      description: "Treine 7 dias seguidos",
      unlocked: streakDays.size >= 7 && hasStreakOf(streakDays, 7),
    },
  ];
}

function hasStreakOf(days: Set<string>, target: number): boolean {
  const sorted = [...days]
    .map(k => k.split("-").map(Number))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  let run = 0;
  let prev: Date | null = null;
  for (const [y, m, d] of sorted) {
    const date = new Date(y, m - 1, d);
    if (prev && Math.round((date.getTime() - prev.getTime()) / 86400000) === 1) run += 1;
    else run = 1;
    if (run >= target) return true;
    prev = date;
  }
  return false;
}
