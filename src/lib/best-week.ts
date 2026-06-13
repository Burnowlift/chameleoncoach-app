import { calculate1RM, snapToTableRpe, type LiftType } from "@/lib/rpe-tables";
import type { TrainingBlock, WorkoutSession } from "@/lib/mock-data";
import type { ExerciseLog } from "@/hooks/useExerciseLogs";

export type Best1RmByLift = Partial<Record<LiftType, number>>;

export function computeBestByWeek(
  block: TrainingBlock,
  logs: ExerciseLog[],
  tagsByName: Record<string, LiftType[]>
): Record<number, Best1RmByLift> {
  const out: Record<number, Best1RmByLift> = {};
  for (let w = 1; w <= block.duration; w++) {
    const weekSess: WorkoutSession[] = (block.weekSessions?.[w] as any) || block.sessions;
    const exMeta: Record<string, { name: string; reps: number; rpe: number | null }> = {};
    weekSess?.forEach((s) =>
      s.exercises.forEach((e) => {
        const repsNum = parseInt(String(e.reps).replace(/[^0-9]/g, ""), 10);
        const rpeNum = e.rpe ? Number(String(e.rpe).replace(",", ".")) : NaN;
        exMeta[e.id] = {
          name: e.name,
          reps: Number.isFinite(repsNum) && repsNum > 0 ? repsNum : 1,
          rpe: Number.isFinite(rpeNum) ? rpeNum : null,
        };
      })
    );

    const weekLogs = logs.filter(
      (l) => l.blockId === block.id && l.weekNumber === w && l.completed && l.weight > 0
    );
    for (const log of weekLogs) {
      const meta = exMeta[log.exerciseId];
      if (!meta) continue;
      const tags = tagsByName[meta.name];
      if (!tags || tags.length === 0) continue;
      const perceived = log.actualRpe ?? meta.rpe;
      if (perceived == null) continue;
      const tableRpe = snapToTableRpe(perceived);
      if (tableRpe == null) continue;
      for (const lift of tags) {
        const est = calculate1RM(lift, log.weight, meta.reps, tableRpe);
        if (est <= 0) continue;
        const cur = out[w]?.[lift] ?? 0;
        if (est > cur) out[w] = { ...(out[w] || {}), [lift]: est };
      }
    }
  }
  return out;
}

export function pickBestWeek(
  bestByWeek: Record<number, Best1RmByLift>
): { week: number; best: Best1RmByLift; total: number } | null {
  let pick: { week: number; best: Best1RmByLift; total: number } | null = null;
  for (const [wStr, best] of Object.entries(bestByWeek)) {
    const total = (best.squat ?? 0) + (best.bench ?? 0) + (best.deadlift ?? 0);
    if (total <= 0) continue;
    if (!pick || total > pick.total) {
      pick = { week: Number(wStr), best, total };
    }
  }
  return pick;
}
