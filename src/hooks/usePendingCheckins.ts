import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PendingCheckin {
  id: string;
  student_id: string;
  week_start: string;
  responded_at: string;
  student_name: string;
  student_avatar?: string;
}

export function usePendingCheckins() {
  const [checkins, setCheckins] = useState<PendingCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPending() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("weekly_checkins")
          .select(`
            id, student_id, week_start, responded_at,
            students(name, avatar)
          `)
          .eq("status", "completed")
          .is("coach_comment", null)
          .order("responded_at", { ascending: false });

        if (error) throw error;
        
        const mapped = data.map((c: any) => ({
          id: c.id,
          student_id: c.student_id,
          week_start: c.week_start,
          responded_at: c.responded_at,
          student_name: c.students?.name || "Aluno",
          student_avatar: c.students?.avatar,
        }));
        setCheckins(mapped);
      } catch (err) {
        console.error("Error fetching pending checkins", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPending();
  }, []);

  return { checkins, loading };
}
