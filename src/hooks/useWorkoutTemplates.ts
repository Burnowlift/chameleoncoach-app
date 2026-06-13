import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WorkoutTemplate, WorkoutSession } from "@/lib/mock-data";

const mapRow = (row: any): WorkoutTemplate => {
  const sessions = (row.sessions as WorkoutSession[]) || [];
  const weekSessions = (row.week_sessions as Record<number, WorkoutSession[]>) || {};
  return {
    id: row.id,
    templateName: row.template_name,
    category: row.category || undefined,
    frequency: row.frequency ?? Math.max(1, sessions.length),
    duration: row.duration ?? 1,
    sessions,
    weekSessions: Object.keys(weekSessions).length > 0 ? weekSessions : { 1: sessions },
  };
};

export function useWorkoutTemplates() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("workout_templates")
      .select("*")
      .order("template_name");
    if (!error && data) setTemplates(data.map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (item: Omit<WorkoutTemplate, "id">): Promise<string> => {
    const { data, error } = await supabase.from("workout_templates").insert({
      template_name: item.templateName,
      category: item.category || null,
      frequency: item.frequency,
      duration: item.duration,
      sessions: item.sessions as any,
      week_sessions: item.weekSessions as any,
    }).select("id").single();
    if (error) throw error;
    await fetch();
    return data!.id as string;
  };

  const update = async (id: string, item: Omit<WorkoutTemplate, "id">) => {
    const { error } = await supabase.from("workout_templates").update({
      template_name: item.templateName,
      category: item.category || null,
      frequency: item.frequency,
      duration: item.duration,
      sessions: item.sessions as any,
      week_sessions: item.weekSessions as any,
    }).eq("id", id);
    if (error) throw error;
    await fetch();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("workout_templates").delete().eq("id", id);
    if (error) throw error;
    await fetch();
  };

  return { templates, loading, create, update, remove, refetch: fetch };
}
