import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculate1RM, snapToTableRpe, type LiftType } from "@/lib/rpe-tables";

/**
 * Backfill automático de rm_history.
 *
 * Detecta exercise_logs concluídos (com peso e RPE) cujos exercícios estão
 * tagueados como SBD (is_squat_rm/is_bench_rm/is_deadlift_rm) mas não possuem
 * registro correspondente em rm_history, e insere as estimativas faltantes.
 *
 * Roda uma única vez por sessão do navegador para cada aluno (controlado via
 * sessionStorage), de forma silenciosa e idempotente.
 */
export function useRmBackfill(studentId: string | undefined, onComplete?: () => void) {
  const ranRef = useRef(false);

  useEffect(() => {
    if (!studentId || ranRef.current) return;
    const sessionKey = `rm_backfill_${studentId}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(sessionKey)) return;
    ranRef.current = true;

    (async () => {
      try {
        // 1. Buscar exercícios SBD-tagueados
        const { data: exercises } = await supabase
          .from("exercises")
          .select("id, name, is_squat_rm, is_bench_rm, is_deadlift_rm")
          .or("is_squat_rm.eq.true,is_bench_rm.eq.true,is_deadlift_rm.eq.true");
        if (!exercises || exercises.length === 0) {
          sessionStorage.setItem(sessionKey, "1");
          return;
        }
        const tagsByName: Record<string, { dbId: string; tags: LiftType[] }> = {};
        for (const e of exercises as any[]) {
          const tags: LiftType[] = [];
          if (e.is_squat_rm) tags.push("squat");
          if (e.is_bench_rm) tags.push("bench");
          if (e.is_deadlift_rm) tags.push("deadlift");
          if (tags.length > 0) tagsByName[e.name] = { dbId: e.id, tags };
        }

        // 2. Buscar blocos para resolver instance exerciseId -> nome/reps
        const { data: blocks } = await supabase
          .from("training_blocks")
          .select("id, sessions, week_sessions")
          .eq("student_id", studentId);
        if (!blocks) {
          sessionStorage.setItem(sessionKey, "1");
          return;
        }

        // Map: blockId -> sessionId -> exerciseInstanceId -> { name, reps }
        const exerciseMap: Record<string, Record<string, Record<string, { name: string; reps: number }>>> = {};
        for (const b of blocks as any[]) {
          exerciseMap[b.id] = {};
          const collect = (sessionsArr: any[]) => {
            if (!Array.isArray(sessionsArr)) return;
            for (const s of sessionsArr) {
              if (!s?.id || !Array.isArray(s.exercises)) continue;
              if (!exerciseMap[b.id][s.id]) exerciseMap[b.id][s.id] = {};
              for (const ex of s.exercises) {
                if (!ex?.id || !ex?.name) continue;
                const reps = Number(ex.reps);
                exerciseMap[b.id][s.id][ex.id] = {
                  name: ex.name,
                  reps: Number.isFinite(reps) && reps > 0 ? reps : 1,
                };
              }
            }
          };
          collect(b.sessions);
          if (b.week_sessions && typeof b.week_sessions === "object") {
            for (const wk of Object.values(b.week_sessions)) {
              collect(wk as any[]);
            }
          }
        }

        // 3. Buscar logs concluídos com peso e RPE
        const { data: logs } = await supabase
          .from("exercise_logs")
          .select("block_id, session_id, exercise_id, weight, actual_rpe, created_at")
          .eq("student_id", studentId)
          .eq("completed", true)
          .gt("weight", 0)
          .not("actual_rpe", "is", null);
        if (!logs || logs.length === 0) {
          sessionStorage.setItem(sessionKey, "1");
          return;
        }

        // 4. Buscar rm_history existente para detectar duplicatas
        const { data: existing } = await supabase
          .from("rm_history")
          .select("exercise_id, sbd_type, weight, reps")
          .eq("student_id", studentId);
        const existingKeys = new Set(
          (existing || []).map((r: any) =>
            `${r.exercise_id}|${r.sbd_type}|${Number(r.weight)}|${Number(r.reps)}`,
          ),
        );

        // 5. Montar inserts faltantes
        const inserts: any[] = [];
        for (const log of logs as any[]) {
          const meta = exerciseMap[log.block_id]?.[log.session_id]?.[log.exercise_id];
          if (!meta) continue;
          const tagInfo = tagsByName[meta.name];
          if (!tagInfo) continue;
          const weight = Number(log.weight);
          const rpe = Number(log.actual_rpe);
          const tableRpe = snapToTableRpe(rpe);
          if (!tableRpe) continue;
          for (const tag of tagInfo.tags) {
            const est = calculate1RM(tag, weight, meta.reps, tableRpe);
            if (!(est > 0)) continue;
            const key = `${tagInfo.dbId}|${tag}|${weight}|${meta.reps}`;
            if (existingKeys.has(key)) continue;
            existingKeys.add(key);
            inserts.push({
              student_id: studentId,
              exercise_id: tagInfo.dbId,
              sbd_type: tag,
              weight,
              reps: meta.reps,
              estimated_1rm: est,
              recorded_at: log.created_at,
            });
          }
        }

        if (inserts.length > 0) {
          const { error } = await supabase.from("rm_history").insert(inserts);
          if (!error) {
            onComplete?.();
          }
        }
        sessionStorage.setItem(sessionKey, "1");
      } catch {
        // silencioso
      }
    })();
  }, [studentId, onComplete]);
}
