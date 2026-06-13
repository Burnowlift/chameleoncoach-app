import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sbdTotal } from "@/lib/utils";
import { glPoints, type Sex } from "@/lib/glPoints";

export type LiftKey =
  | "total" | "squat" | "bench" | "deadlift"
  | "gl_total" | "gl_squat" | "gl_bench" | "gl_deadlift";

export interface StrengthEntry {
  studentId: string;
  name: string;
  avatar: string | null;
  squat: number;
  bench: number;
  deadlift: number;
  total: number;
  sex: Sex | null;
  bodyWeight: number | null;
}

/**
 * Strength ranking based on the static 1RM values (squat_1rm, bench_1rm, deadlift_1rm)
 * stored on each student. The Total is the simple sum of the three lifts.
 * GL Points são derivados (sexo + peso corporal + lift) usando os coeficientes
 * oficiais IPF raw (`src/lib/glPoints.ts`).
 */
export function useStrengthRanking() {
  const [entries, setEntries] = useState<StrengthEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_strength_ranking");
    if (error) {
      console.error("get_strength_ranking error", error);
      setEntries([]);
      setLoading(false);
      return;
    }
    const rows: StrengthEntry[] = (data || []).map((s: any) => {
      const squat = Number(s.squat) || 0;
      const bench = Number(s.bench) || 0;
      const deadlift = Number(s.deadlift) || 0;
      return {
        studentId: s.student_id,
        name: s.name,
        avatar: s.avatar || null,
        squat, bench, deadlift,
        total: sbdTotal(squat, bench, deadlift),
        sex: (s.sex as Sex | null) ?? null,
        bodyWeight: s.body_weight_kg != null ? Number(s.body_weight_kg) : null,
      };
    });
    setEntries(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    // Realtime: refetch whenever a student's 1RM changes (coach edits the profile).
    const channel = supabase
      .channel(`strength-ranking-students-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, () => {
        fetchAll();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  return { entries, loading, refetch: fetchAll };
}

export function getLiftValue(e: StrengthEntry, lift: LiftKey): number {
  switch (lift) {
    case "squat": return e.squat;
    case "bench": return e.bench;
    case "deadlift": return e.deadlift;
    case "total": return e.total;
    case "gl_total":
      return glPoints({ load: e.total, sex: e.sex, bw: e.bodyWeight, kind: "total" });
    case "gl_squat":
      return glPoints({ load: e.squat, sex: e.sex, bw: e.bodyWeight, kind: "squat" });
    case "gl_bench":
      return glPoints({ load: e.bench, sex: e.sex, bw: e.bodyWeight, kind: "bench" });
    case "gl_deadlift":
      return glPoints({ load: e.deadlift, sex: e.sex, bw: e.bodyWeight, kind: "deadlift" });
    default: return 0;
  }
}

export function isGlLift(lift: LiftKey): boolean {
  return lift.startsWith("gl_");
}

export const LIFT_LABELS: Record<LiftKey, string> = {
  total: "Total SBD",
  squat: "Agachamento",
  bench: "Supino",
  deadlift: "Terra",
  gl_total: "GL Total",
  gl_squat: "GL Agachamento",
  gl_bench: "GL Supino",
  gl_deadlift: "GL Terra",
};
