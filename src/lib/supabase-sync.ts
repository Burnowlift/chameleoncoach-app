import { supabase } from "@/integrations/supabase/client";
import type { ExerciseSetLog } from "@/hooks/useExerciseLogs";

export interface UpsertLogPayload {
  studentId: string;
  blockId: string;
  weekNumber: number;
  sessionId: string;
  exerciseId: string;
  weight: number;
  notes: string | null;
  completed: boolean;
  actualRpe: number | null;
  setsData: ExerciseSetLog[];
}

export interface ToggleWeekPayload {
  studentId: string;
  blockId: string;
  weekNumber: number;
  completed: boolean;
}

export interface AddRmRecordPayload {
  studentId: string;
  exerciseId: string;
  sbdType: "squat" | "bench" | "deadlift";
  weight: number;
  reps: number;
  estimated1rm: number;
}

/**
 * Upsert de exercise_logs por chave composta (idempotente).
 * Usado tanto online (useExerciseLogs) quanto no replay da fila offline.
 */
export async function syncUpsertExerciseLog(p: UpsertLogPayload) {
  const { data: existing } = await supabase
    .from("exercise_logs")
    .select("id")
    .eq("student_id", p.studentId)
    .eq("block_id", p.blockId)
    .eq("week_number", p.weekNumber)
    .eq("session_id", p.sessionId)
    .eq("exercise_id", p.exerciseId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("exercise_logs")
      .update({
        weight: p.weight,
        notes: p.notes,
        completed: p.completed,
        actual_rpe: p.actualRpe,
        sets_data: p.setsData as any,
      })
      .eq("id", existing.id);
    return { error, existing: true };
  }

  const { data, error } = await supabase
    .from("exercise_logs")
    .insert({
      student_id: p.studentId,
      block_id: p.blockId,
      week_number: p.weekNumber,
      session_id: p.sessionId,
      exercise_id: p.exerciseId,
      weight: p.weight,
      notes: p.notes,
      completed: p.completed,
      actual_rpe: p.actualRpe,
      sets_data: p.setsData as any,
    })
    .select()
    .single();
  return { data, error, existing: false };
}

/** Marca/desmarca uma semana como concluída (idempotente). */
export async function syncToggleCompletedWeek(p: ToggleWeekPayload) {
  if (p.completed) {
    const { error } = await supabase
      .from("completed_weeks")
      .insert({
        student_id: p.studentId,
        block_id: p.blockId,
        week_number: p.weekNumber,
      });
    return { error };
  }
  const { error } = await supabase
    .from("completed_weeks")
    .delete()
    .eq("student_id", p.studentId)
    .eq("block_id", p.blockId)
    .eq("week_number", p.weekNumber);
  return { error };
}

/** Registra um 1RM estimado: atualiza o registro existente do lift ou insere novo. */
export async function syncAddRmRecord(p: AddRmRecordPayload) {
  const { data: existingRecords } = await supabase
    .from("rm_history")
    .select("id")
    .eq("student_id", p.studentId)
    .eq("exercise_id", p.exerciseId)
    .eq("sbd_type", p.sbdType)
    .order("recorded_at", { ascending: false })
    .limit(1);

  const existing = existingRecords?.[0];

  if (existing) {
    const { error } = await supabase
      .from("rm_history")
      .update({
        weight: p.weight,
        reps: p.reps,
        estimated_1rm: p.estimated1rm,
        recorded_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return { error };
  }

  const { error } = await supabase
    .from("rm_history")
    .insert({
      student_id: p.studentId,
      exercise_id: p.exerciseId,
      sbd_type: p.sbdType,
      weight: p.weight,
      reps: p.reps,
      estimated_1rm: p.estimated1rm,
    });
  return { error };
}
