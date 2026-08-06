import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TrainingBlock, WorkoutSession } from "@/lib/mock-data";
import { readCachedJson, writeCachedJson } from "@/lib/offline-cache";

const cacheKey = (studentId: string) => `blocks:${studentId}`;

export function useTrainingBlocks(studentId: string | undefined) {
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);

  const fetchBlocks = useCallback(async () => {
    if (!studentId) { setBlocks([]); setLoading(false); return; }
    setLoading(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from("training_blocks")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      setFetchError(new Error(error.message));
      const cached = readCachedJson<TrainingBlock[]>(cacheKey(studentId));
      if (cached) setBlocks(cached);
    }

    if (data) {
      const mapped = data.map((row: any) => ({
        id: row.id,
        name: row.name,
        frequency: row.frequency,
        duration: row.duration,
        sessions: row.sessions as WorkoutSession[],
        weekSessions: row.week_sessions as Record<number, WorkoutSession[]>,
      }));
      setBlocks(mapped);
      writeCachedJson(cacheKey(studentId), mapped);
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

  const createBlock = async (block: TrainingBlock) => {
    if (!studentId) return;
    const { error } = await supabase.from("training_blocks").insert({
      id: block.id,
      student_id: studentId,
      name: block.name,
      frequency: block.frequency,
      duration: block.duration,
      sessions: block.sessions as any,
      week_sessions: block.weekSessions as any,
    });
    if (error) throw error;
    setBlocks(prev => [...prev, block]);
  };

  const updateBlock = async (block: TrainingBlock) => {
    const { error } = await supabase.from("training_blocks").update({
      name: block.name,
      frequency: block.frequency,
      duration: block.duration,
      sessions: block.sessions as any,
      week_sessions: block.weekSessions as any,
    }).eq("id", block.id);
    if (error) throw error;
    setBlocks(prev => prev.map(b => b.id === block.id ? block : b));
  };

  const deleteBlock = async (blockId: string) => {
    const { error } = await supabase.from("training_blocks").delete().eq("id", blockId);
    if (error) throw error;
    setBlocks(prev => prev.filter(b => b.id !== blockId));
  };

  return { blocks, loading, error: fetchError, createBlock, updateBlock, deleteBlock, refetch: fetchBlocks };
}
