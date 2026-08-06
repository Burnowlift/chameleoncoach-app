import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readCachedJson, writeCachedJson } from "@/lib/offline-cache";
import { enqueueAction } from "@/lib/offline-queue";
import { syncUpsertExerciseLog, type UpsertLogPayload } from "@/lib/supabase-sync";

export interface ExerciseSetLog {
  setIndex: number;
  weight: number;
  reps: number;
  rpe?: number | null;
}

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
  setsData?: ExerciseSetLog[];
  createdAt: string;
}

const isSameExerciseLog = (a: Pick<ExerciseLog, "studentId" | "blockId" | "weekNumber" | "sessionId" | "exerciseId">, b: Pick<ExerciseLog, "studentId" | "blockId" | "weekNumber" | "sessionId" | "exerciseId">) =>
  a.studentId === b.studentId &&
  a.blockId === b.blockId &&
  a.weekNumber === b.weekNumber &&
  a.sessionId === b.sessionId &&
  a.exerciseId === b.exerciseId;

const cacheKey = (studentId: string) => `exercise_logs:${studentId}`;

const mapRow = (r: any): ExerciseLog => ({
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
  setsData: Array.isArray(r.sets_data) ? r.sets_data : [],
  createdAt: r.created_at,
});

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

    const { data, error } = await query.order("created_at", { ascending: true });
    if (!error && data) {
      const mapped = data.map(mapRow);
      setLogs(mapped);
      if (!blockId) writeCachedJson(cacheKey(studentId), mapped);
    } else if (error && !blockId) {
      const cached = readCachedJson<ExerciseLog[]>(cacheKey(studentId));
      if (cached) setLogs(cached);
    }
    setLoading(false);
  }, [studentId, blockId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const upsertLog = async (log: Omit<ExerciseLog, "id" | "createdAt">) => {
    if (!navigator.onLine) {
      await enqueueAction({
        type: "upsert-log",
        payload: {
          studentId: log.studentId,
          blockId: log.blockId,
          weekNumber: log.weekNumber,
          sessionId: log.sessionId,
          exerciseId: log.exerciseId,
          weight: log.weight,
          notes: log.notes,
          completed: log.completed,
          actualRpe: log.actualRpe,
          setsData: log.setsData || [],
        } satisfies UpsertLogPayload,
        createdAt: new Date().toISOString(),
      });
      setLogs(prev => {
        const next = prev.some(l => isSameExerciseLog(l, log))
          ? prev.map(l => isSameExerciseLog(l, log) ? { ...l, ...log } : l)
          : [...prev, { ...log, id: `local-${Date.now()}`, createdAt: new Date().toISOString() }];
        if (studentId) writeCachedJson(cacheKey(studentId), next);
        return next;
      });
      return;
    }

    const existing = logs.find(l => isSameExerciseLog(l, log));
    if (existing) {
      const { error } = await supabase.from("exercise_logs")
        .update({
          weight: log.weight,
          notes: log.notes,
          completed: log.completed,
          actual_rpe: log.actualRpe,
          sets_data: log.setsData as any,
        })
        .eq("student_id", log.studentId)
        .eq("block_id", log.blockId)
        .eq("week_number", log.weekNumber)
        .eq("session_id", log.sessionId)
        .eq("exercise_id", log.exerciseId);
      if (error) throw error;
      setLogs(prev => {
        const next = prev.map(l => isSameExerciseLog(l, log) ? { ...l, ...log } : l);
        if (studentId) writeCachedJson(cacheKey(studentId), next);
        return next;
      });
    } else {
      const result = await syncUpsertExerciseLog({
        studentId: log.studentId,
        blockId: log.blockId,
        weekNumber: log.weekNumber,
        sessionId: log.sessionId,
        exerciseId: log.exerciseId,
        weight: log.weight,
        notes: log.notes,
        completed: log.completed,
        actualRpe: log.actualRpe,
        setsData: log.setsData || [],
      } satisfies UpsertLogPayload);
      const { error } = result;
      if (error) throw error;
      if (result.data) {
        const row: any = result.data;
        setLogs(prev => {
          const next = [...prev, mapRow(row)];
          if (studentId) writeCachedJson(cacheKey(studentId), next);
          return next;
        });
      }
    }
  };

  return { logs, loading, upsertLog, refetch: fetchLogs };
}
