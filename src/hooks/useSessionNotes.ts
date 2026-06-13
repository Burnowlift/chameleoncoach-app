import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SessionNote {
  id: string;
  studentId: string;
  blockId: string;
  weekNumber: number;
  sessionId: string;
  message: string;
  sender: "student" | "coach";
  createdAt: string;
}

export function useSessionNotes(studentId: string | undefined, blockId?: string) {
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!studentId) { setNotes([]); setLoading(false); return; }
    let query = supabase
      .from("session_notes")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    if (blockId) query = query.eq("block_id", blockId);

    const { data } = await query;
    if (data) {
      setNotes(data.map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        blockId: r.block_id,
        weekNumber: r.week_number,
        sessionId: r.session_id,
        message: r.message,
        sender: r.sender || "student",
        createdAt: r.created_at,
      })));
    }
    setLoading(false);
  }, [studentId, blockId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const addNote = async (note: Omit<SessionNote, "id" | "createdAt">) => {
    const { data, error } = await supabase.from("session_notes").insert({
      student_id: note.studentId,
      block_id: note.blockId,
      week_number: note.weekNumber,
      session_id: note.sessionId,
      message: note.message,
      sender: note.sender || "student",
    }).select().single();
    if (error) throw error;
    if (data) {
      setNotes(prev => [{
        id: data.id,
        studentId: data.student_id,
        blockId: data.block_id,
        weekNumber: data.week_number,
        sessionId: data.session_id,
        message: data.message,
        sender: (data as any).sender || "student",
        createdAt: data.created_at,
      }, ...prev]);
    }
  };

  const deleteNote = async (noteId: string) => {
    const { error } = await supabase.from("session_notes").delete().eq("id", noteId);
    if (error) throw error;
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  return { notes, loading, addNote, deleteNote, refetch: fetchNotes };
}
