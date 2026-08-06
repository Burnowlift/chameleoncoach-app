import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AnamneseData {
  id?: string;
  student_id: string;
  status: "draft" | "completed";
  sexo: "M" | "F" | null;
  rg: string;
  cep: string;
  endereco: string;
  profissao: string;
  data_nascimento: string;
  limitacao_cirurgia: string;
  limitacao_arquivo_url: string;
  comorbidades: string;
  horas_trabalho: string;
  horas_sono: string;
  dias_treino_semana: string;
  tempo_treino_dia: string;
  disponibilidade_cardio: string;
  objetivo: string;
  exercicios_preferidos: string;
  fotos: string[]; // URLs
  aceite_compromisso: boolean;
  aceite_sinceridade: boolean;
  current_step: number;
}

const EMPTY_ANAMNESE: Omit<AnamneseData, "student_id"> = {
  status: "draft",
  sexo: null,
  rg: "",
  cep: "",
  endereco: "",
  profissao: "",
  data_nascimento: "",
  limitacao_cirurgia: "",
  limitacao_arquivo_url: "",
  comorbidades: "",
  horas_trabalho: "",
  horas_sono: "",
  dias_treino_semana: "",
  tempo_treino_dia: "",
  disponibilidade_cardio: "",
  objetivo: "",
  exercicios_preferidos: "",
  fotos: [],
  aceite_compromisso: false,
  aceite_sinceridade: false,
  current_step: 1,
};

function mapRow(row: any): AnamneseData {
  return {
    id: row.id,
    student_id: row.student_id,
    status: row.status,
    sexo: row.sexo,
    rg: row.rg || "",
    cep: row.cep || "",
    endereco: row.endereco || "",
    profissao: row.profissao || "",
    data_nascimento: row.data_nascimento || "",
    limitacao_cirurgia: row.limitacao_cirurgia || "",
    limitacao_arquivo_url: row.limitacao_arquivo_url || "",
    comorbidades: row.comorbidades || "",
    horas_trabalho: row.horas_trabalho || "",
    horas_sono: row.horas_sono || "",
    dias_treino_semana: row.dias_treino_semana || "",
    tempo_treino_dia: row.tempo_treino_dia || "",
    disponibilidade_cardio: row.disponibilidade_cardio || "",
    objetivo: row.objetivo || "",
    exercicios_preferidos: row.exercicios_preferidos || "",
    fotos: Array.isArray(row.fotos) ? row.fotos : [],
    aceite_compromisso: !!row.aceite_compromisso,
    aceite_sinceridade: !!row.aceite_sinceridade,
    current_step: row.current_step || 1,
  };
}

export function useAnamnese(studentId: string | undefined) {
  const [anamnese, setAnamnese] = useState<AnamneseData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnamnese = useCallback(async () => {
    if (!studentId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("anamneses")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();

    if (!error && data) {
      setAnamnese(mapRow(data));
    } else {
      // Ainda não existe — vamos criar ao salvar o primeiro step
      setAnamnese(null);
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => { fetchAnamnese(); }, [fetchAnamnese]);

  const saveStep = async (stepData: Partial<AnamneseData>, step: number) => {
    if (!studentId) return null;

    const payload: any = {
      ...stepData,
      current_step: step,
      updated_at: new Date().toISOString(),
    };

    if (payload.data_nascimento === "") {
      payload.data_nascimento = null;
    }

    let targetId = anamnese?.id;
    if (!targetId) {
      const { data: existing } = await supabase
        .from("anamneses")
        .select("id")
        .eq("student_id", studentId)
        .maybeSingle();
      targetId = existing?.id;
    }

    let resultRow: AnamneseData | null = null;

    if (targetId) {
      // Update
      const { data, error } = await supabase
        .from("anamneses")
        .update(payload)
        .eq("id", targetId)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (data) resultRow = mapRow(data);
    } else {
      // Insert
      const { data, error } = await supabase
        .from("anamneses")
        .insert({ student_id: studentId, ...payload })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (data) resultRow = mapRow(data);
    }

    if (resultRow) {
      setAnamnese(resultRow);
    }
    return resultRow;
  };

  const completeAnamnese = async (anamneseIdOverride?: string) => {
    let targetId = anamneseIdOverride || anamnese?.id;
    if (!targetId && studentId) {
      const { data: existing } = await supabase
        .from("anamneses")
        .select("id")
        .eq("student_id", studentId)
        .maybeSingle();
      targetId = existing?.id;
    }

    if (!targetId) return;

    const { data, error } = await supabase
      .from("anamneses")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", targetId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (data) setAnamnese(mapRow(data));

    if (studentId) {
      await supabase
        .from("students")
        .update({ anamnese_completed: true } as any)
        .eq("id", studentId);
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from("anamnese-files")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    // O bucket é privado: armazenamos o caminho relativo; a exibição
    // resolve via signed URL (ver useSignedFileUrl).
    return data.path;
  };

  const fallbackAnamnese = React.useMemo(() => {
    return studentId ? { ...EMPTY_ANAMNESE, student_id: studentId } : null;
  }, [studentId]);

  return {
    anamnese: anamnese ? anamnese : fallbackAnamnese,
    loading,
    saveStep,
    completeAnamnese,
    uploadFile,
    refetch: fetchAnamnese,
  };
}
