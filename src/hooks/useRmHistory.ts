import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RmRecord {
  id: string;
  studentId: string;
  exerciseId: string;
  sbdType: "squat" | "bench" | "deadlift";
  weight: number;
  reps: number;
  estimated1rm: number;
  recordedAt: string;
}

import { calculate1RM, type LiftType } from "@/lib/rpe-tables";

/** Calcula 1RM via tabela RPE × Reps. */
export function calculate1RMFromRpe(
  lift: LiftType,
  weight: number,
  reps: number,
  rpe: number,
): number {
  return calculate1RM(lift, weight, reps, rpe);
}

export function useRmHistory(studentId: string | undefined) {
  const [records, setRecords] = useState<RmRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!studentId) { setRecords([]); setLoading(false); return; }
    const { data } = await supabase
      .from("rm_history")
      .select("*")
      .eq("student_id", studentId)
      .order("recorded_at", { ascending: true });
    if (data) {
      setRecords(data.map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        exerciseId: r.exercise_id,
        sbdType: r.sbd_type,
        weight: Number(r.weight),
        reps: Number(r.reps),
        estimated1rm: Number(r.estimated_1rm),
        recordedAt: r.recorded_at,
      })));
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => { fetch(); }, [fetch]);

  // Realtime: refetch automaticamente quando novos PRs são inseridos para este aluno
  useEffect(() => {
    if (!studentId) return;
    const channel = supabase
      .channel(`rm_history_${studentId}_${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rm_history", filter: `student_id=eq.${studentId}` },
        () => { fetch(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [studentId, fetch]);

  const addRecord = async (record: Omit<RmRecord, "id" | "recordedAt">) => {
    const { data, error } = await supabase.from("rm_history").insert({
      student_id: record.studentId,
      exercise_id: record.exerciseId,
      sbd_type: record.sbdType,
      weight: record.weight,
      reps: record.reps,
      estimated_1rm: record.estimated1rm,
    }).select().single();
    if (error) throw error;
    if (data) {
      const r: any = data;
      setRecords(prev => {
        if (prev.some(x => x.id === r.id)) return prev;
        return [...prev, {
          id: r.id,
          studentId: r.student_id,
          exerciseId: r.exercise_id,
          sbdType: r.sbd_type,
          weight: Number(r.weight),
          reps: Number(r.reps),
          estimated1rm: Number(r.estimated_1rm),
          recordedAt: r.recorded_at,
        }];
      });
    }
  };

  const deleteRecord = async (id: string) => {
    const { error } = await supabase.from("rm_history").delete().eq("id", id);
    if (error) throw error;
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  return { records, loading, addRecord, deleteRecord, refetch: fetch };
}
