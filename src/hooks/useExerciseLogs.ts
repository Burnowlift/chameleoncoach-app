import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ExerciseLog {
  id: string;
  studentId: string;
  blockId: string;
  weekNumber: number;
  sessionId: string;
  exerciseId: string;
  weight: number;
  notes: string | null;
  completed: boolean;
  actualRpe: number | null;
  createdAt: string;
}

const isSameExerciseLog = (a: Pick<ExerciseLog, "studentId" | "blockId" | "weekNumber" | "sessionId" | "exerciseId">, b: Pick<ExerciseLog, "studentId" | "blockId" | "weekNumber" | "sessionId" | "exerciseId">) =>
  a.studentId === b.studentId &&
  a.blockId === b.blockId &&
  a.weekNumber === b.weekNumber &&
  a.sessionId === b.sessionId &&
  a.exerciseId === b.exerciseId;

export function useExerciseLogs(studentId: string | undefined, blockId?: string) {
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!studentId) { setLogs([]); setLoading(false); return; }
    let query = supabase
      .from("exercise_logs")
      .select("*")
      .eq("student_id", studentId);
    if (blockId) query = query.eq("block_id", blockId);

    const { data } = await query.order("created_at", { ascending: true });
    if (data) {
      setLogs(data.map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        blockId: r.block_id,
        weekNumber: r.week_number,
        sessionId: r.session_id,
        exerciseId: r.exercise_id,
        weight: Number(r.weight),
        notes: r.notes,
        completed: r.completed,
        actualRpe: r.actual_rpe !== null && r.actual_rpe !== undefined ? Number(r.actual_rpe) : null,
        createdAt: r.created_at,
      })));
    }
    setLoading(false);
  }, [studentId, blockId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const upsertLog = async (log: Omit<ExerciseLog, "id" | "createdAt">) => {
    const existing = logs.find(l => isSameExerciseLog(l, log));
    if (existing) {
      const { error } = await supabase.from("exercise_logs")
        .update({
          weight: log.weight,
          notes: log.notes,
          completed: log.completed,
          actual_rpe: log.actualRpe,
        } as any)
        .eq("student_id", log.studentId)
        .eq("block_id", log.blockId)
        .eq("week_number", log.weekNumber)
        .eq("session_id", log.sessionId)
        .eq("exercise_id", log.exerciseId);
      if (error) throw error;
      setLogs(prev => prev.map(l => isSameExerciseLog(l, log) ? { ...l, ...log } : l));
    } else {
      const { data, error } = await supabase.from("exercise_logs").insert({
        student_id: log.studentId,
        block_id: log.blockId,
        week_number: log.weekNumber,
        session_id: log.sessionId,
        exercise_id: log.exerciseId,
        weight: log.weight,
        notes: log.notes,
        completed: log.completed,
        actual_rpe: log.actualRpe,
      } as any).select().single();
      if (error) throw error;
      if (data) {
        const row: any = data;
        setLogs(prev => [...prev, {
          id: row.id,
          studentId: row.student_id,
          blockId: row.block_id,
          weekNumber: row.week_number,
          sessionId: row.session_id,
          exerciseId: row.exercise_id,
          weight: Number(row.weight),
          notes: row.notes,
          completed: row.completed,
          actualRpe: row.actual_rpe !== null && row.actual_rpe !== undefined ? Number(row.actual_rpe) : null,
          createdAt: row.created_at,
        }]);
      }
    }
  };

  return { logs, loading, upsertLog, refetch: fetchLogs };
}
