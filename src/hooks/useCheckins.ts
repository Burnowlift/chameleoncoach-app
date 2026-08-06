import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CheckinData {
  id: string;
  student_id: string;
  week_start: string;
  status: "pending" | "completed" | "expired";
  available_at: string;
  expires_at: string;
  treinos_perdidos: number | null;
  motivo_falta: string | null;
  avaliacao_execucao: number | null;
  rpe_medio: number | null;
  peso_corporal: number | null;
  qualidade_sono: number | null;
  horas_sono_media: number | null;
  nivel_estresse: number | null;
  aderencia_alimentacao: number | null;
  dor_desconforto: string | null;
  pr_progressao: string | null;
  avaliacao_consultoria: number | null;
  duvidas_sugestoes: string | null;
  responded_at: string | null;
  coach_comment: string | null;
  coach_commented_at: string | null;
  created_at: string;
}

function mapRow(row: any): CheckinData {
  return {
    id: row.id,
    student_id: row.student_id,
    week_start: row.week_start,
    status: row.status,
    available_at: row.available_at,
    expires_at: row.expires_at,
    treinos_perdidos: row.treinos_perdidos,
    motivo_falta: row.motivo_falta,
    avaliacao_execucao: row.avaliacao_execucao,
    rpe_medio: row.rpe_medio,
    peso_corporal: row.peso_corporal ? Number(row.peso_corporal) : null,
    qualidade_sono: row.qualidade_sono,
    horas_sono_media: row.horas_sono_media ? Number(row.horas_sono_media) : null,
    nivel_estresse: row.nivel_estresse,
    aderencia_alimentacao: row.aderencia_alimentacao,
    dor_desconforto: row.dor_desconforto,
    pr_progressao: row.pr_progressao,
    avaliacao_consultoria: row.avaliacao_consultoria,
    duvidas_sugestoes: row.duvidas_sugestoes,
    responded_at: row.responded_at,
    coach_comment: row.coach_comment,
    coach_commented_at: row.coach_commented_at,
    created_at: row.created_at,
  };
}

/**
 * Hook para check-ins do aluno: busca pendentes, submete respostas, lista histórico.
 */
export function useCheckins(studentId: string | undefined) {
  const [pending, setPending] = useState<CheckinData | null>(null);
  const [history, setHistory] = useState<CheckinData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCheckins = useCallback(async () => {
    if (!studentId) { setLoading(false); return; }

    // Sincroniza a janela do check-in (gera no sábado 08:00 e encerra na
    // segunda-feira 23:59). Best-effort: falhas não quebram a consulta.
    const { error: syncError } = await supabase.rpc("fn_sync_weekly_checkins", {
      p_student_id: studentId,
    });
    if (syncError) {
      console.warn("fn_sync_weekly_checkins:", syncError.message);
    }

    // Busca check-in pendente
    const { data: pendingData } = await supabase
      .from("weekly_checkins")
      .select("*")
      .eq("student_id", studentId)
      .eq("status", "pending")
      .order("available_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setPending(pendingData ? mapRow(pendingData) : null);

    // Busca histórico (todos, exceto pendente)
    const { data: historyData } = await supabase
      .from("weekly_checkins")
      .select("*")
      .eq("student_id", studentId)
      .neq("status", "pending")
      .order("week_start", { ascending: false });

    setHistory(historyData?.map(mapRow) || []);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { fetchCheckins(); }, [fetchCheckins]);

  const submitCheckin = async (
    checkinId: string,
    responses: Partial<CheckinData>
  ) => {
    // Reforça a regra da janela: após a segunda-feira 23:59 o check-in
    // é encerrado e não pode mais ser respondido.
    if (pending && new Date(pending.expires_at).getTime() < Date.now()) {
      throw new Error(
        "Prazo encerrado: este check-in só pode ser respondido até o final da segunda-feira.",
      );
    }
    const { error } = await supabase
      .from("weekly_checkins")
      .update({
        ...responses,
        status: "completed",
        responded_at: new Date().toISOString(),
      })
      .eq("id", checkinId);
    if (error) throw error;
    await fetchCheckins();
  };

  return { pending, history, loading, submitCheckin, refetch: fetchCheckins };
}

/**
 * Hook para o treinador: lista check-ins de um aluno específico + comentários.
 */
export function useStudentCheckins(studentId: string | undefined) {
  const [checkins, setCheckins] = useState<CheckinData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCheckins = useCallback(async () => {
    if (!studentId) { setLoading(false); return; }

    // Sincroniza a janela do check-in do aluno (best-effort, idempotente)
    const { error: syncError } = await supabase.rpc("fn_sync_weekly_checkins", {
      p_student_id: studentId,
    });
    if (syncError) {
      console.warn("fn_sync_weekly_checkins:", syncError.message);
    }

    const { data } = await supabase
      .from("weekly_checkins")
      .select("*")
      .eq("student_id", studentId)
      .order("week_start", { ascending: false });
    setCheckins(data?.map(mapRow) || []);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { fetchCheckins(); }, [fetchCheckins]);

  const addCoachComment = async (checkinId: string, comment: string) => {
    const { error } = await supabase
      .from("weekly_checkins")
      .update({
        coach_comment: comment,
        coach_commented_at: new Date().toISOString(),
      })
      .eq("id", checkinId);
    if (error) throw error;
    await fetchCheckins();
  };

  const forceCheckin = async () => {
    if (!studentId) return;
    
    const now = new Date();
    // Início da semana (Segunda-feira)
    const weekStart = new Date(now);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const availableAt = new Date().toISOString();
    const expiresAt = new Date(now);
    expiresAt.setDate(now.getDate() + 7); // Expira em 7 dias
    
    const { error } = await supabase
      .from("weekly_checkins")
      .insert({
        student_id: studentId,
        week_start: weekStartStr,
        status: "pending",
        available_at: availableAt,
        expires_at: expiresAt.toISOString()
      });
      
    if (error) {
      if (error.code === '23505') {
        throw new Error('Já existe um check-in para a semana atual.');
      }
      throw error;
    }
    
    await fetchCheckins();
  };

  // Métricas
  const completedCheckins = checkins.filter((c) => c.status === "completed");
  const totalCheckins = checkins.length;
  const adherenceRate = totalCheckins > 0 ? (completedCheckins.length / totalCheckins) * 100 : 0;

  const alerts = completedCheckins.filter((c) => {
    const hasPain = !!c.dor_desconforto?.trim();
    const lowScore = (c.avaliacao_consultoria ?? 5) < 3;
    return hasPain || lowScore;
  });

  return {
    checkins,
    loading,
    addCoachComment,
    forceCheckin,
    adherenceRate,
    completedCount: completedCheckins.length,
    totalCount: totalCheckins,
    alerts,
    refetch: fetchCheckins,
  };
}
