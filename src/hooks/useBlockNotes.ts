import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BlockNote {
  id: string;
  studentId: string;
  blockId: string;
  message: string;
  createdAt: string;
}

export function useBlockNotes(studentId: string | undefined) {
  const [blockNotes, setBlockNotes] = useState<BlockNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!studentId) { setBlockNotes([]); setLoading(false); return; }
    const { data } = await supabase
      .from("block_notes")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: true });
    if (data) {
      setBlockNotes(data.map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        blockId: r.block_id,
        message: r.message,
        createdAt: r.created_at,
      })));
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const addNote = async (note: Omit<BlockNote, "id" | "createdAt">) => {
    const { data, error } = await supabase.from("block_notes").insert({
      student_id: note.studentId,
      block_id: note.blockId,
      message: note.message,
    }).select().single();
    if (error) throw error;
    if (data) {
      setBlockNotes(prev => [...prev, {
        id: data.id,
        studentId: data.student_id,
        blockId: data.block_id,
        message: data.message,
        createdAt: data.created_at,
      }]);
    }
  };

  const deleteNote = async (noteId: string) => {
    const { error } = await supabase.from("block_notes").delete().eq("id", noteId);
    if (error) throw error;
    setBlockNotes(prev => prev.filter(n => n.id !== noteId));
  };

  return { blockNotes, loading, addNote, deleteNote, refetch: fetchNotes };
}
