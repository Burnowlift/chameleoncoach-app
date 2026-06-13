import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BlockEndInfo {
  daysRemaining: number;
  endDate: Date;
  weeksCount: number;
}

/**
 * Para cada studentId, calcula info sobre o último bloco de treino:
 * - quantidade de semanas montadas (Object.keys(week_sessions).length)
 * - data prevista de término (created_at + semanas * 7 dias)
 * - dias restantes em relação a hoje (negativo = expirado)
 *
 * Recalcula automaticamente quando o treinador adiciona/remove semanas
 * (via Supabase Realtime em training_blocks).
 *
 * Retorna `null` quando o aluno não possui blocos ou nenhuma semana montada.
 */
export function useStudentsBlockEnd(studentIds: string[]) {
  const [map, setMap] = useState<Record<string, BlockEndInfo | null>>({});
  const [loading, setLoading] = useState(false);

  // Estabiliza a key para evitar refetch a cada render
  const key = studentIds.slice().sort().join(",");
  const idsRef = useRef<string[]>(studentIds);
  idsRef.current = studentIds;

  const fetchData = useCallback(async () => {
    const ids = idsRef.current;
    if (!ids.length) {
      setMap({});
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("training_blocks")
      .select("student_id, week_sessions, duration, created_at")
      .in("student_id", ids)
      .order("created_at", { ascending: false });
    if (error || !data) {
      setMap({});
      setLoading(false);
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result: Record<string, BlockEndInfo | null> = {};
    for (const id of ids) result[id] = null;
    const seen = new Set<string>();
    for (const row of data as Array<{
      student_id: string;
      week_sessions: Record<string, unknown> | null;
      duration: number | null;
      created_at: string;
    }>) {
      if (seen.has(row.student_id)) continue; // já é o mais recente (ordenado desc)
      seen.add(row.student_id);
      const weeksCount = row.week_sessions
        ? Object.keys(row.week_sessions).length
        : 0;
      if (!weeksCount) {
        result[row.student_id] = null;
        continue;
      }
      const start = new Date(row.created_at);
      start.setHours(0, 0, 0, 0);
      const endDate = new Date(start);
      endDate.setDate(endDate.getDate() + weeksCount * 7);
      const daysRemaining = Math.round(
        (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      result[row.student_id] = { daysRemaining, endDate, weeksCount };
    }
    setMap(result);
    setLoading(false);
  }, []);

  // Fetch inicial + sempre que a lista de alunos mudar
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchData();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Realtime: refetch quando qualquer training_block for criado/atualizado/removido
  useEffect(() => {
    if (!studentIds.length) return;
    const channel = supabase
      .channel(`students-block-end-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "training_blocks" },
        (payload) => {
          const row =
            (payload.new as { student_id?: string } | null) ??
            (payload.old as { student_id?: string } | null);
          if (!row?.student_id) {
            fetchData();
            return;
          }
          if (idsRef.current.includes(row.student_id)) {
            fetchData();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { blockEndMap: map, loading, refetch: fetchData };
}
