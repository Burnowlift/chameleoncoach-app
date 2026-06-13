import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MobilityCatalogItem {
  id: string;
  name: string;
  area?: string;
  videoUrl?: string;
}

export interface StudentMobilityItem {
  id: string;
  studentId: string;
  mobilityExerciseId?: string;
  name: string;
  area?: string;
  videoUrl?: string;
  prescription?: string;
  position: number;
  sessionIndex: number;
}

export interface MobilityLog {
  id: string;
  studentId: string;
  studentMobilityId: string;
  doneDate: string;
}

const mapCatalog = (r: any): MobilityCatalogItem => ({
  id: r.id, name: r.name,
  area: r.area || undefined, videoUrl: r.video_url || undefined,
});

const mapItem = (r: any): StudentMobilityItem => ({
  id: r.id, studentId: r.student_id,
  mobilityExerciseId: r.mobility_exercise_id || undefined,
  name: r.name, area: r.area || undefined,
  videoUrl: r.video_url || undefined,
  prescription: r.prescription || undefined,
  position: r.position,
  sessionIndex: r.session_index ?? 1,
});

const mapLog = (r: any): MobilityLog => ({
  id: r.id, studentId: r.student_id,
  studentMobilityId: r.student_mobility_id, doneDate: r.done_date,
});

export function useMobilityCatalog() {
  const [items, setItems] = useState<MobilityCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase.from("mobility_exercises").select("*").order("name");
    if (!error && data) setItems(data.map(mapCatalog));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = async (item: Omit<MobilityCatalogItem, "id">) => {
    const { error } = await supabase.from("mobility_exercises").insert({
      name: item.name, area: item.area || null, video_url: item.videoUrl || null,
    });
    if (error) throw error;
    await fetchAll();
  };

  const update = async (id: string, item: Omit<MobilityCatalogItem, "id">) => {
    const { error } = await supabase.from("mobility_exercises").update({
      name: item.name, area: item.area || null, video_url: item.videoUrl || null,
    }).eq("id", id);
    if (error) throw error;
    await fetchAll();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("mobility_exercises").delete().eq("id", id);
    if (error) throw error;
    await fetchAll();
  };

  return { items, loading, create, update, remove, refetch: fetchAll };
}

export function useStudentMobility(studentId: string | undefined) {
  const [items, setItems] = useState<StudentMobilityItem[]>([]);
  const [logs, setLogs] = useState<MobilityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!studentId) { setItems([]); setLogs([]); setLoading(false); return; }
    const [{ data: it }, { data: lg }] = await Promise.all([
      supabase.from("student_mobility").select("*").eq("student_id", studentId).order("position"),
      supabase.from("mobility_logs").select("*").eq("student_id", studentId),
    ]);
    if (it) setItems(it.map(mapItem));
    if (lg) setLogs(lg.map(mapLog));
    setLoading(false);
  }, [studentId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addItem = async (item: Omit<StudentMobilityItem, "id" | "studentId" | "position">) => {
    if (!studentId) return;
    const sessionIndex = item.sessionIndex ?? 1;
    const position = items.filter(i => i.sessionIndex === sessionIndex).length;
    const { error } = await supabase.from("student_mobility").insert({
      student_id: studentId,
      mobility_exercise_id: item.mobilityExerciseId || null,
      name: item.name, area: item.area || null,
      video_url: item.videoUrl || null,
      prescription: item.prescription || null,
      position,
      session_index: sessionIndex,
    });
    if (error) throw error;
    await fetchAll();
  };

  const updateItem = async (id: string, patch: Partial<StudentMobilityItem>) => {
    const { error } = await supabase.from("student_mobility").update({
      name: patch.name, area: patch.area || null,
      video_url: patch.videoUrl || null, prescription: patch.prescription || null,
    }).eq("id", id);
    if (error) throw error;
    await fetchAll();
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("student_mobility").delete().eq("id", id);
    if (error) throw error;
    await fetchAll();
  };

  const toggleDoneToday = async (studentMobilityId: string) => {
    if (!studentId) return;
    const today = new Date().toISOString().slice(0, 10);
    const existing = logs.find(l => l.studentMobilityId === studentMobilityId && l.doneDate === today);
    if (existing) {
      await supabase.from("mobility_logs").delete().eq("id", existing.id);
    } else {
      await supabase.from("mobility_logs").insert({
        student_id: studentId, student_mobility_id: studentMobilityId, done_date: today,
      });
    }
    await fetchAll();
  };

  const isDoneToday = (studentMobilityId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    return logs.some(l => l.studentMobilityId === studentMobilityId && l.doneDate === today);
  };

  const applyTemplate = async (templateId: string) => {
    if (!studentId) return null;
    const [{ data: tpl }, { data: tplItems }] = await Promise.all([
      supabase.from("mobility_templates" as any).select("*").eq("id", templateId).maybeSingle(),
      supabase.from("mobility_template_items" as any).select("*").eq("template_id", templateId).order("position"),
    ]);
    if (!tpl) throw new Error("Template não encontrado");
    // Wipe current student mobility
    const { error: delErr } = await supabase.from("student_mobility").delete().eq("student_id", studentId);
    if (delErr) throw delErr;
    const rows = ((tplItems as any[]) || []).map((it) => ({
      student_id: studentId,
      mobility_exercise_id: it.mobility_exercise_id || null,
      name: it.name,
      area: it.area || null,
      video_url: it.video_url || null,
      prescription: it.prescription || null,
      position: it.position ?? 0,
      session_index: it.session_index ?? 1,
    }));
    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("student_mobility").insert(rows);
      if (insErr) throw insErr;
    }
    await fetchAll();
    return {
      sessionCount: (tpl as any).session_count ?? 1,
      sessionNames: ((tpl as any).session_names as Record<string, string>) || {},
    };
  };

  return { items, logs, loading, addItem, updateItem, removeItem, toggleDoneToday, isDoneToday, applyTemplate, refetch: fetchAll };
}
