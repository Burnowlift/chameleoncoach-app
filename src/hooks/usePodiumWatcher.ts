import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RankingEntry } from "@/hooks/useRanking";
import { getCurrentSemester } from "@/hooks/useRanking";

export interface PodiumEvent {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar: string | null;
  position: number;
  score: number;
  year: number;
  semester: number;
  acknowledged: boolean;
  detectedAt: string;
}

const mapEvent = (r: any): PodiumEvent => ({
  id: r.id, studentId: r.student_id, studentName: r.student_name,
  studentAvatar: r.student_avatar, position: r.position,
  score: Number(r.score), year: r.year, semester: r.semester,
  acknowledged: r.acknowledged, detectedAt: r.detected_at,
});

const positionEmoji = (p: number) => p === 1 ? "🥇" : p === 2 ? "🥈" : "🥉";

/**
 * Detects which students are currently in the top 3 of the current semester
 * and persists each (student, position, semester) combination once.
 * Fires a toast for any newly detected podium entry.
 */
export function usePodiumWatcher(entries: RankingEntry[], enabled: boolean) {
  const [events, setEvents] = useState<PodiumEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from("podium_events")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(20);
    if (data) setEvents(data.map(mapEvent));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Detect new podium entries when ranking entries arrive.
  useEffect(() => {
    if (!enabled || entries.length === 0) return;
    const cur = getCurrentSemester();
    const top3 = entries.slice(0, 3);

    (async () => {
      // Fetch what we already know for this semester
      const { data: known } = await supabase
        .from("podium_events")
        .select("student_id, position")
        .eq("year", cur.year)
        .eq("semester", cur.semester);
      const knownSet = new Set((known || []).map((k: any) => `${k.student_id}|${k.position}`));

      const toInsert = top3
        .map((e, idx) => ({ entry: e, position: idx + 1 }))
        .filter(({ entry, position }) => entry.score > 1 && !knownSet.has(`${entry.studentId}|${position}`));

      if (toInsert.length === 0) return;

      const rows = toInsert.map(({ entry, position }) => ({
        student_id: entry.studentId,
        student_name: entry.name,
        student_avatar: entry.avatar,
        position,
        score: entry.score,
        year: cur.year,
        semester: cur.semester,
      }));

      const { error } = await supabase.from("podium_events").insert(rows);
      if (error) return;

      toInsert.forEach(({ entry, position }) => {
        toast.success(`${positionEmoji(position)} ${entry.name} entrou no pódio!`, {
          description: `${position}º lugar do semestre ${cur.semester}/${cur.year} • Pontuação ${entry.score.toFixed(1)}`,
          duration: 9000,
        });
      });

      await fetchAll();
    })();
  }, [entries, enabled, fetchAll]);

  const acknowledgeAll = async () => {
    const unread = events.filter(e => !e.acknowledged).map(e => e.id);
    if (!unread.length) return;
    await supabase.from("podium_events").update({ acknowledged: true }).in("id", unread);
    setEvents(prev => prev.map(e => unread.includes(e.id) ? { ...e, acknowledged: true } : e));
  };

  const unreadCount = events.filter(e => !e.acknowledged).length;

  return { events, loading, unreadCount, acknowledgeAll, refetch: fetchAll };
}
