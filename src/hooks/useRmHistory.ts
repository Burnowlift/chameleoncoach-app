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
    // 1. Verificar se já existe um registro de 1RM para este aluno, exercício e sbdType
    const { data: existingRecords } = await supabase
      .from("rm_history")
      .select("id")
      .eq("student_id", record.studentId)
      .eq("exercise_id", record.exerciseId)
      .eq("sbd_type", record.sbdType)
      .order("recorded_at", { ascending: false })
      .limit(1);

    const existing = existingRecords?.[0];

    if (existing) {
      // 2. Se já existe, sobrescreve/atualiza o registro existente
      const { data, error } = await supabase
        .from("rm_history")
        .update({
          weight: record.weight,
          reps: record.reps,
          estimated_1rm: record.estimated1rm,
          recorded_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const r: any = data;
        const updated: RmRecord = {
          id: r.id,
          studentId: r.student_id,
          exerciseId: r.exercise_id,
          sbdType: r.sbd_type as RmRecord["sbdType"],
          weight: Number(r.weight),
          reps: Number(r.reps),
          estimated1rm: Number(r.estimated_1rm),
          recordedAt: r.recorded_at,
        };
        setRecords(prev => prev.map(x => x.id === r.id ? updated : x));
      }
    } else {
      // 3. Se não existe, insere um novo registro
      const { data, error } = await supabase
        .from("rm_history")
        .insert({
          student_id: record.studentId,
          exercise_id: record.exerciseId,
          sbd_type: record.sbdType,
          weight: record.weight,
          reps: record.reps,
          estimated_1rm: record.estimated1rm,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const r: any = data;
        const inserted: RmRecord = {
          id: r.id,
          studentId: r.student_id,
          exerciseId: r.exercise_id,
          sbdType: r.sbd_type as RmRecord["sbdType"],
          weight: Number(r.weight),
          reps: Number(r.reps),
          estimated1rm: Number(r.estimated_1rm),
          recordedAt: r.recorded_at,
        };
        setRecords(prev => {
          if (prev.some(x => x.id === r.id)) return prev;
          return [...prev, inserted];
        });
      }
    }
  };

  const deleteRecord = async (id: string) => {
    const { error } = await supabase.from("rm_history").delete().eq("id", id);
    if (error) throw error;
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  return { records, loading, addRecord, deleteRecord, refetch: fetch };
}
