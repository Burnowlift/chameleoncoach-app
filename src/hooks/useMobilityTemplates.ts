import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MobilityTemplate {
  id: string;
  name: string;
  category?: string;
  sessionCount: number;
  sessionNames: Record<string, string>;
  createdAt: string;
}

export interface MobilityTemplateItem {
  id: string;
  templateId: string;
  mobilityExerciseId?: string;
  name: string;
  area?: string;
  videoUrl?: string;
  prescription?: string;
  position: number;
  sessionIndex: number;
}

const mapTemplate = (r: any): MobilityTemplate => ({
  id: r.id,
  name: r.name,
  category: r.category || undefined,
  sessionCount: r.session_count ?? 1,
  sessionNames: (r.session_names as Record<string, string>) || {},
  createdAt: r.created_at,
});

const mapItem = (r: any): MobilityTemplateItem => ({
  id: r.id,
  templateId: r.template_id,
  mobilityExerciseId: r.mobility_exercise_id || undefined,
  name: r.name,
  area: r.area || undefined,
  videoUrl: r.video_url || undefined,
  prescription: r.prescription || undefined,
  position: r.position,
  sessionIndex: r.session_index ?? 1,
});

export function useMobilityTemplates() {
  const [templates, setTemplates] = useState<MobilityTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from("mobility_templates" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setTemplates((data as any[]).map(mapTemplate));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = async (input: { name: string; category?: string; sessionCount: number }) => {
    const { data, error } = await supabase
      .from("mobility_templates" as any)
      .insert({
        name: input.name,
        category: input.category || null,
        session_count: input.sessionCount,
        session_names: {},
      })
      .select("*")
      .single();
    if (error) throw error;
    await fetchAll();
    return mapTemplate(data);
  };

  const update = async (id: string, patch: Partial<{ name: string; category: string; sessionCount: number; sessionNames: Record<string, string> }>) => {
    const upd: any = {};
    if (patch.name !== undefined) upd.name = patch.name;
    if (patch.category !== undefined) upd.category = patch.category || null;
    if (patch.sessionCount !== undefined) upd.session_count = patch.sessionCount;
    if (patch.sessionNames !== undefined) upd.session_names = patch.sessionNames;
    const { error } = await supabase.from("mobility_templates" as any).update(upd).eq("id", id);
    if (error) throw error;
    await fetchAll();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("mobility_templates" as any).delete().eq("id", id);
    if (error) throw error;
    await fetchAll();
  };

  return { templates, loading, create, update, remove, refetch: fetchAll };
}

export function useMobilityTemplate(templateId: string | undefined) {
  const [template, setTemplate] = useState<MobilityTemplate | null>(null);
  const [items, setItems] = useState<MobilityTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!templateId) { setTemplate(null); setItems([]); setLoading(false); return; }
    const [{ data: t }, { data: it }] = await Promise.all([
      supabase.from("mobility_templates" as any).select("*").eq("id", templateId).maybeSingle(),
      supabase.from("mobility_template_items" as any).select("*").eq("template_id", templateId).order("position"),
    ]);
    if (t) setTemplate(mapTemplate(t));
    if (it) setItems((it as any[]).map(mapItem));
    setLoading(false);
  }, [templateId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const updateTemplate = async (patch: Partial<{ name: string; category: string; sessionCount: number; sessionNames: Record<string, string> }>) => {
    if (!templateId) return;
    const upd: any = {};
    if (patch.name !== undefined) upd.name = patch.name;
    if (patch.category !== undefined) upd.category = patch.category || null;
    if (patch.sessionCount !== undefined) upd.session_count = patch.sessionCount;
    if (patch.sessionNames !== undefined) upd.session_names = patch.sessionNames;
    const { error } = await supabase.from("mobility_templates" as any).update(upd).eq("id", templateId);
    if (error) throw error;
    await fetchAll();
  };

  const addItem = async (item: Omit<MobilityTemplateItem, "id" | "templateId" | "position">) => {
    if (!templateId) return;
    const sessionIndex = item.sessionIndex ?? 1;
    const position = items.filter(i => i.sessionIndex === sessionIndex).length;
    const { error } = await supabase.from("mobility_template_items" as any).insert({
      template_id: templateId,
      mobility_exercise_id: item.mobilityExerciseId || null,
      name: item.name,
      area: item.area || null,
      video_url: item.videoUrl || null,
      prescription: item.prescription || null,
      position,
      session_index: sessionIndex,
    });
    if (error) throw error;
    await fetchAll();
  };

  const updateItem = async (id: string, patch: Partial<MobilityTemplateItem>) => {
    const { error } = await supabase.from("mobility_template_items" as any).update({
      name: patch.name,
      area: patch.area || null,
      video_url: patch.videoUrl || null,
      prescription: patch.prescription || null,
    }).eq("id", id);
    if (error) throw error;
    await fetchAll();
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("mobility_template_items" as any).delete().eq("id", id);
    if (error) throw error;
    await fetchAll();
  };

  return { template, items, loading, updateTemplate, addItem, updateItem, removeItem, refetch: fetchAll };
}
