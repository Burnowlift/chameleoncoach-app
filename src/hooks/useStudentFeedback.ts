import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfWeek, format } from "date-fns";

export type CardType = "orange" | "green";

interface Mark {
  id: string;
  student_id: string;
  card_type: CardType;
  weekday: number; // 0=Sun..6=Sat
  marked_at: string;
  week_start: string; // yyyy-MM-dd
}

interface NoteRow {
  student_id: string;
  card_type: CardType;
  note: string;
}

export function currentWeekStart(): string {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function useStudentFeedback() {
  const { user } = useAuth();
  const [marks, setMarks] = useState<Mark[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<string>(currentWeekStart());
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const fetchAll = useCallback(async () => {
    const [m, n] = await Promise.all([
      supabase.from("student_feedback_marks").select("*"),
      supabase.from("student_feedback_notes").select("student_id, card_type, note"),
    ]);
    if (m.data) setMarks(m.data as Mark[]);
    if (n.data) setNotes(n.data as NoteRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Semana corrente (segunda-feira). Atualiza automaticamente na virada de segunda 00:00
  // e também ao reabrir a aba (caso a máquina tenha hibernado).
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const now = new Date();
      const next = new Date(now);
      // Próxima segunda 00:00 local
      const day = now.getDay(); // 0=Dom..6=Sáb
      const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7 || 7;
      next.setDate(now.getDate() + daysUntilMonday);
      next.setHours(0, 0, 0, 0);
      const ms = Math.max(1000, next.getTime() - now.getTime());
      timeoutId = setTimeout(() => {
        setWeekStart(currentWeekStart());
        scheduleNext();
      }, ms);
    };

    const checkNow = () => {
      const ws = currentWeekStart();
      setWeekStart((prev) => (prev !== ws ? ws : prev));
    };

    scheduleNext();
    window.addEventListener("focus", checkNow);
    document.addEventListener("visibilitychange", checkNow);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("focus", checkNow);
      document.removeEventListener("visibilitychange", checkNow);
    };
  }, []);

  // Active marks this week: studentId -> cardType -> Set<weekday>
  const activeThisWeek = useMemo(() => {
    const map: Record<string, Record<CardType, Set<number>>> = {};
    for (const m of marks) {
      if (m.week_start !== weekStart) continue;
      if (!map[m.student_id]) map[m.student_id] = { orange: new Set(), green: new Set() };
      map[m.student_id][m.card_type].add(m.weekday);
    }
    return map;
  }, [marks, weekStart]);

  // Last response timestamp per student (max across all marks)
  const lastResponseByStudent = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of marks) {
      const t = new Date(m.marked_at).getTime();
      if (!map[m.student_id] || t > map[m.student_id]) map[m.student_id] = t;
    }
    return map;
  }, [marks]);

  const notesMap = useMemo(() => {
    const map: Record<string, Partial<Record<CardType, string>>> = {};
    for (const n of notes) {
      if (!map[n.student_id]) map[n.student_id] = {};
      map[n.student_id][n.card_type] = n.note;
    }
    return map;
  }, [notes]);

  const isActive = useCallback(
    (studentId: string, card: CardType, weekday: number) => {
      return !!activeThisWeek[studentId]?.[card]?.has(weekday);
    },
    [activeThisWeek],
  );

  const toggleMark = useCallback(
    async (studentId: string, card: CardType, weekday: number) => {
      const existing = marks.find(
        (m) =>
          m.student_id === studentId &&
          m.card_type === card &&
          m.weekday === weekday &&
          m.week_start === weekStart,
      );
      if (existing) {
        setMarks((prev) => prev.filter((m) => m.id !== existing.id));
        await supabase.from("student_feedback_marks").delete().eq("id", existing.id);
      } else {
        const tempId = `tmp-${Math.random()}`;
        const optimistic: Mark = {
          id: tempId,
          student_id: studentId,
          card_type: card,
          weekday,
          marked_at: new Date().toISOString(),
          week_start: weekStart,
        };
        setMarks((prev) => [...prev, optimistic]);
        const { data } = await supabase
          .from("student_feedback_marks")
          .insert({
            student_id: studentId,
            card_type: card,
            weekday,
            week_start: weekStart,
            marked_by_email: user?.email ?? null,
          })
          .select()
          .single();
        if (data) {
          setMarks((prev) => prev.map((m) => (m.id === tempId ? (data as Mark) : m)));
        }
      }
    },
    [marks, weekStart, user?.email],
  );

  const setNoteLocal = useCallback((studentId: string, card: CardType, text: string) => {
    setNotes((prev) => {
      const idx = prev.findIndex((n) => n.student_id === studentId && n.card_type === card);
      if (idx === -1) return [...prev, { student_id: studentId, card_type: card, note: text }];
      const copy = [...prev];
      copy[idx] = { ...copy[idx], note: text };
      return copy;
    });
    const key = `${studentId}:${card}`;
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(async () => {
      await supabase.from("student_feedback_notes").upsert(
        {
          student_id: studentId,
          card_type: card,
          note: text,
          updated_by_email: user?.email ?? null,
        },
        { onConflict: "student_id,card_type" },
      );
    }, 600);
  }, [user?.email]);

  return {
    loading,
    marks,
    isActive,
    toggleMark,
    notesMap,
    setNoteLocal,
    lastResponseByStudent,
    refetch: fetchAll,
  };
}
