import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BodyWeightRecord {
  id: string;
  studentId: string;
  weightKg: number;
  measuredAt: string; // YYYY-MM-DD
  notes: string | null;
  createdAt: string;
}

const mapRow = (row: any): BodyWeightRecord => ({
  id: row.id,
  studentId: row.student_id,
  weightKg: Number(row.weight_kg),
  measuredAt: row.measured_at,
  notes: row.notes ?? null,
  createdAt: row.created_at,
});

export function useBodyWeightHistory(studentId: string | undefined) {
  const [records, setRecords] = useState<BodyWeightRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!studentId) { setRecords([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("body_weight_history")
      .select("*")
      .eq("student_id", studentId)
      .order("measured_at", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error && data) setRecords(data.map(mapRow));
    setLoading(false);
  }, [studentId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const add = async (weightKg: number, measuredAt: string, notes?: string | null) => {
    if (!studentId) return;
    const { error } = await supabase.from("body_weight_history").insert({
      student_id: studentId,
      weight_kg: weightKg,
      measured_at: measuredAt,
      notes: notes || null,
    });
    if (error) throw error;
    await fetchAll();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("body_weight_history").delete().eq("id", id);
    if (error) throw error;
    await fetchAll();
  };

  const latest = records[0] ?? null;

  return { records, latest, loading, add, remove, refetch: fetchAll };
}
