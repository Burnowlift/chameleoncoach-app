import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ExerciseDBItem } from "@/lib/mock-data";

const mapRow = (row: any): ExerciseDBItem => ({
  id: row.id,
  name: row.name,
  muscleGroup: row.muscle_group,
  muscleGroup2: row.muscle_group_2 || undefined,
  muscleGroup3: row.muscle_group_3 || undefined,
  isSquatRm: !!row.is_squat_rm,
  isBenchRm: !!row.is_bench_rm,
  isDeadliftRm: !!row.is_deadlift_rm,
  videoUrl: row.video_url || undefined,
});

export function useExercises() {
  const [exercises, setExercises] = useState<ExerciseDBItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase.from("exercises").select("*").order("name");
    if (!error && data) setExercises(data.map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (item: Omit<ExerciseDBItem, "id">) => {
    const { error } = await supabase.from("exercises").insert({
      name: item.name,
      muscle_group: item.muscleGroup,
      muscle_group_2: item.muscleGroup2 || null,
      muscle_group_3: item.muscleGroup3 || null,
      is_squat_rm: !!item.isSquatRm,
      is_bench_rm: !!item.isBenchRm,
      is_deadlift_rm: !!item.isDeadliftRm,
      video_url: item.videoUrl || null,
    });
    if (error) throw error;
    await fetch();
  };

  const update = async (id: string, item: Omit<ExerciseDBItem, "id">) => {
    const { error } = await supabase.from("exercises").update({
      name: item.name,
      muscle_group: item.muscleGroup,
      muscle_group_2: item.muscleGroup2 || null,
      muscle_group_3: item.muscleGroup3 || null,
      is_squat_rm: !!item.isSquatRm,
      is_bench_rm: !!item.isBenchRm,
      is_deadlift_rm: !!item.isDeadliftRm,
      video_url: item.videoUrl || null,
    }).eq("id", id);
    if (error) throw error;
    await fetch();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("exercises").delete().eq("id", id);
    if (error) throw error;
    await fetch();
  };

  return { exercises, loading, create, update, remove, refetch: fetch };
}
