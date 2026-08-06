import { describe, it, expect } from "vitest";
import { computeWorkoutStreak } from "@/lib/streaks";
import { computeAchievements } from "@/lib/achievements";
import type { ExerciseLog } from "@/hooks/useExerciseLogs";
import type { RmRecord } from "@/hooks/useRmHistory";

const log = (daysAgo: number, overrides: Partial<ExerciseLog> = {}): ExerciseLog => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id: `log-${daysAgo}-${Math.random()}`,
    studentId: "s1",
    blockId: "b1",
    weekNumber: 1,
    sessionId: "sess-1",
    exerciseId: "ex-1",
    weight: 40,
    notes: null,
    completed: true,
    actualRpe: 7,
    setsData: [{ setIndex: 1, weight: 40, reps: 8, rpe: 7 }],
    createdAt: date.toISOString(),
    ...overrides,
  };
};

describe("computeWorkoutStreak", () => {
  it("retorna 0 quando não há treinos", () => {
    expect(computeWorkoutStreak([])).toEqual({ current: 0, best: 0 });
  });

  it("conta sequência consecutiva de ontem até hoje", () => {
    const logs = [log(1), log(0)];
    expect(computeWorkoutStreak(logs).current).toBe(2);
  });

  it("não quebra a streak quando hoje ainda não treinou", () => {
    const logs = [log(2), log(1)];
    expect(computeWorkoutStreak(logs).current).toBe(2);
  });

  it("quebra a streak após dois dias sem treino", () => {
    const logs = [log(4), log(3)];
    expect(computeWorkoutStreak(logs).current).toBe(0);
    expect(computeWorkoutStreak(logs).best).toBe(2);
  });

  it("ignora logs não concluídos", () => {
    const logs = [log(1, { completed: false }), log(0, { completed: false })];
    expect(computeWorkoutStreak(logs).current).toBe(0);
  });
});

describe("computeAchievements", () => {
  it("desbloqueia primeiro treino com um log concluído", () => {
    const achievements = computeAchievements([log(0)], []);
    expect(achievements.find(a => a.id === "first-workout")?.unlocked).toBe(true);
  });

  it("desbloqueia PRs conforme registros de 1RM", () => {
    const rm: RmRecord = {
      id: "rm1",
      studentId: "s1",
      exerciseId: "ex1",
      sbdType: "squat",
      weight: 100,
      reps: 3,
      estimated1rm: 110,
      recordedAt: new Date().toISOString(),
    };
    const achievements = computeAchievements([log(0)], [rm]);
    expect(achievements.find(a => a.id === "pr-squat")?.unlocked).toBe(true);
    expect(achievements.find(a => a.id === "pr-bench")?.unlocked).toBe(false);
  });

  it("não desbloqueia nada sem dados", () => {
    const achievements = computeAchievements([], []);
    expect(achievements.every(a => !a.unlocked)).toBe(true);
  });
});
