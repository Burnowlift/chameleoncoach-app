import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RankingPenalty {
  reason: string;
  days: number;
  points: number; // pontos descontados (positivo)
}

export interface RankingEntry {
  studentId: string;
  name: string;
  avatar: string | null;
  score: number;            // 1.0 - 5.0 (já com penalidade)
  baseScore: number;        // 1.0 - 5.0 (antes da penalidade)
  penalty: number;          // total descontado (>= 0)
  penalties: RankingPenalty[];
  loadFillRate: number;     // 0 - 1
  mobilityRate: number;     // 0 - 1
  messageRate: number;      // 0 - 1
  expectedLoadLogs: number;
  actualLoadLogs: number;
  expectedMobility: number;
  actualMobility: number;
  expectedMessages: number;
  actualMessages: number;
  position: number;         // posição real no ranking global
}

export interface ArchivedRanking {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar: string | null;
  score: number;
  position: number;
  year: number;
  semester: number;
  archivedAt: string;
}

const WINDOW_DAYS = 7;
const MESSAGE_GOAL = 3; // meta de DIAS ÚNICOS com mensagem em 7 dias (anti-spam)

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Local timezone of the viewer (browser). Used to group messages by the day
// the student actually experienced, so a message at 23:50 doesn't slip into the next UTC day.
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const LOCAL_DAY_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: LOCAL_TZ, year: "numeric", month: "2-digit", day: "2-digit",
});

function localDayKey(iso: string): string {
  // Returns YYYY-MM-DD in the viewer's local timezone (en-CA locale yields ISO format).
  return LOCAL_DAY_FMT.format(new Date(iso));
}

/**
 * Returns current semester key { year, semester } where semester is 1 (Jan-Jun) or 2 (Jul-Dec).
 */
export function getCurrentSemester(date = new Date()) {
  return {
    year: date.getFullYear(),
    semester: date.getMonth() < 6 ? 1 : 2,
  };
}

/**
 * Returns the previous semester (the one to be archived when reset triggers).
 */
function getPreviousSemester(date = new Date()) {
  const cur = getCurrentSemester(date);
  if (cur.semester === 1) return { year: cur.year - 1, semester: 2 };
  return { year: cur.year, semester: 1 };
}

/**
 * Maps a 0-1 adherence rate to the 1.0-5.0 scale (decimal).
 */
function rateToScore(rate: number): number {
  const clamped = Math.max(0, Math.min(1, rate));
  return Math.round((1 + clamped * 4) * 10) / 10;
}

/**
 * Computes ranking using the last 7 days as the rolling window.
 * - Load fill rate: distinct (block, week, session, exercise) logs in window / expected slots
 *   We approximate "expected" as the number of unique sessions the student should have done in 7 days
 *   based on training_blocks.frequency * (avg exercises per session).
 * - Mobility rate: completed mobility days in window / (total mobility items × 7).
 * - Message rate: messages sent by student to coach in window / MESSAGE_GOAL.
 * Final score = 40% loads + 40% mobility + 20% messages, mapped to 1.0-5.0.
 */
export function useRanking() {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastResetCheck, setLastResetCheck] = useState<string | null>(null);

  const compute = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_ranking");
    if (error) {
      console.error("get_ranking failed", error);
      setEntries([]);
      setLoading(false);
      return [];
    }
    const result: RankingEntry[] = (data || []).map((r: any) => ({
      studentId: r.student_id,
      name: r.name,
      avatar: r.avatar || null,
      score: Number(r.score),
      baseScore: Number(r.base_score),
      penalty: Number(r.penalty),
      penalties: Array.isArray(r.penalties)
        ? r.penalties.map((p: any) => ({
            reason: String(p.reason),
            days: Number(p.days),
            points: Number(p.points),
          }))
        : [],
      loadFillRate: Number(r.load_fill_rate),
      mobilityRate: Number(r.mobility_rate),
      messageRate: Number(r.message_rate),
      expectedLoadLogs: Number(r.expected_load_logs),
      actualLoadLogs: Number(r.actual_load_logs),
      expectedMobility: Number(r.expected_mobility),
      actualMobility: Number(r.actual_mobility),
      expectedMessages: Number(r.expected_messages),
      actualMessages: Number(r.actual_messages),
      position: Number(r.rank_position),
    }));
    setEntries(result);
    setLoading(false);
    return result;
  }, []);

  /**
   * Checks whether the current period requires archiving the previous semester.
   * Triggers between Jan 1 and Jan 7 (for H2 of previous year), and between Jul 1 and Jul 7 (for H1 of current year),
   * if no archive exists yet for that semester.
   */
  const ensureSemesterArchive = useCallback(async () => {
    const today = new Date();
    const month = today.getMonth(); // 0-indexed
    const day = today.getDate();
    const inResetWindow = (month === 0 && day <= 7) || (month === 6 && day <= 7);
    if (!inResetWindow) return;

    const prev = getPreviousSemester(today);
    const { data: existing } = await supabase
      .from("ranking_archive")
      .select("id")
      .eq("year", prev.year)
      .eq("semester", prev.semester)
      .limit(1);

    if (existing && existing.length > 0) return; // already archived

    // Compute current ranking and archive it as the closing snapshot for the previous semester.
    const snapshot = await compute();
    if (!snapshot.length) return;

    const rows = snapshot.map((e, idx) => ({
      student_id: e.studentId,
      student_name: e.name,
      student_avatar: e.avatar,
      score: e.score,
      position: idx + 1,
      year: prev.year,
      semester: prev.semester,
    }));

    await supabase.from("ranking_archive").insert(rows);
    setLastResetCheck(new Date().toISOString());
  }, [compute]);

  useEffect(() => {
    ensureSemesterArchive().finally(() => compute());
  }, [compute, ensureSemesterArchive]);

  return { entries, loading, refetch: compute, lastResetCheck };
}

export function useRankingArchive() {
  const [archive, setArchive] = useState<ArchivedRanking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from("ranking_archive")
      .select("*")
      .order("year", { ascending: false })
      .order("semester", { ascending: false })
      .order("position", { ascending: true });
    if (data) {
      setArchive(data.map((r: any) => ({
        id: r.id, studentId: r.student_id, studentName: r.student_name,
        studentAvatar: r.student_avatar, score: Number(r.score),
        position: r.position, year: r.year, semester: r.semester,
        archivedAt: r.archived_at,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { archive, loading, refetch: fetchAll };
}
