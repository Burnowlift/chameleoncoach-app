import { useRef, useState, useEffect, useMemo } from "react";
import { z } from "zod";
import { useExercises } from "@/hooks/useExercises";
import { useTrainingBlocks } from "@/hooks/useTrainingBlocks";

import { useRmHistory } from "@/hooks/useRmHistory";
import { useRmBackfill } from "@/hooks/useRmBackfill";
import { useExerciseLogs } from "@/hooks/useExerciseLogs";
import { RmEvolutionChart } from "@/components/RmEvolutionChart";
import { useSessionNotes } from "@/hooks/useSessionNotes";
import { useBlockNotes } from "@/hooks/useBlockNotes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Trash2, Dumbbell, Calendar, Copy, MessageSquare, Send, Pencil, ArrowUpDown, Gauge, Weight, TrendingUp, ChevronUp, ChevronDown } from "lucide-react";
import { type Student, type TrainingBlock, type WorkoutExercise, type WorkoutSession } from "@/lib/mock-data";
import { toast } from "sonner";
import { formatKg } from "@/lib/utils";
import { calculate1RM, snapToTableRpe, type LiftType } from "@/lib/rpe-tables";
import { computeBestByWeek, pickBestWeek } from "@/lib/best-week";
import { useIsCoach } from "@/hooks/useIsCoach";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableSessionCard } from "@/components/SortableSessionCard";
import { WeekNotesCard } from "@/components/WeekNotesCard";
import { DeleteWeekButton } from "@/components/DeleteWeekButton";

const MUSCLE_ABBREV: Record<string, string> = {
  "Peito": "P", "Costas": "C", "Ombro": "O", "Bíceps": "B", "Tríceps": "T",
  "Quadríceps": "Q", "Posterior": "Pos", "Glúteo": "G", "Panturrilha": "PAN",
  "Abdômen": "AB", "Core": "Co",
};

const sessionLabels = ["Sessão 1", "Sessão 2", "Sessão 3", "Sessão 4", "Sessão 5", "Sessão 6"];

const LIFT_SHORT: Record<LiftType, string> = { squat: "S", bench: "B", deadlift: "D" };
const LIFT_FULL: Record<LiftType, string> = {
  squat: "Agachamento",
  bench: "Supino",
  deadlift: "Levantamento Terra",
};
const RM_PANEL_CLASS = "rounded-md border border-primary/30 bg-primary/10 p-3 shadow-sm";
const RM_LABEL_CLASS = "flex items-center gap-1.5 text-xs font-semibold text-primary mb-2";
const RM_BADGE_CLASS = "min-h-7 min-w-[4.75rem] justify-center rounded-md px-2.5 py-1 text-[13px] font-bold leading-none tabular-nums shadow-sm ring-1 ring-primary/25 whitespace-nowrap";
const RM_GRID_CLASS = "grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5";
const RM_BADGE_TEXT_CLASS = "block w-full truncate text-center";

const SECTION_PANEL_CLASS = "rounded-md border border-border bg-muted/40 p-3 shadow-sm";
const SECTION_LABEL_CLASS = "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2";
const BADGE_GRID_CLASS = "grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5";
const BADGE_BASE_CLASS = "inline-flex items-center justify-center min-w-0 max-w-full min-h-7 w-full rounded-md px-2.5 py-1 text-xs font-bold shadow-sm tabular-nums whitespace-nowrap overflow-hidden border";
const SESSION_BADGE_CLASS = "inline-flex items-center justify-center min-w-0 max-w-full min-h-7 w-full rounded-md border border-secondary-foreground/15 bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground shadow-sm whitespace-nowrap overflow-hidden";
const BADGE_TEXT_CLASS = "block w-full truncate text-center";

// Themed panels (consistent label + badge style per color)
const SBD_PANEL_CLASS = "rounded-md border border-blue-500/40 bg-blue-500/15 p-3 shadow-sm";
const SBD_LABEL_CLASS = "inline-flex items-center gap-1.5 font-extrabold uppercase tracking-wider mb-2 text-[#0049db] text-xs bg-white w-fit px-2 py-1 rounded shadow-sm ring-1 ring-blue-500/30";
const SBD_VOLUME_BADGE_CLASS = `${BADGE_BASE_CLASS} border-blue-700 bg-blue-800 text-blue-50`;
const SBD_SQ_BADGE_CLASS = `${BADGE_BASE_CLASS} border-blue-700 bg-blue-800 text-blue-50`;
const SBD_BP_BADGE_CLASS = `${BADGE_BASE_CLASS} border-[#5a2d0d] bg-[#8b4513] text-amber-50`;
const SBD_DL_BADGE_CLASS = `${BADGE_BASE_CLASS} border-orange-700 bg-orange-600 text-orange-50`;

const TONNAGE_PANEL_CLASS = "rounded-md border border-zinc-700 bg-zinc-950 p-3 shadow-sm";
const TONNAGE_LABEL_CLASS = "inline-flex items-center gap-1.5 font-extrabold uppercase tracking-wider mb-2 text-zinc-900 text-xs bg-white w-fit px-2 py-1 rounded shadow-sm ring-1 ring-zinc-700";
const TONNAGE_BADGE_CLASS = `${BADGE_BASE_CLASS} border-zinc-700 bg-zinc-900 text-zinc-50`;

const AUX_PANEL_CLASS = "rounded-md border border-purple-500/40 bg-purple-500/15 p-3 shadow-sm";
const AUX_LABEL_CLASS = "inline-flex items-center gap-1.5 font-extrabold uppercase tracking-wider mb-2 text-[#47008f] text-xs bg-white w-fit px-2 py-1 rounded shadow-sm ring-1 ring-purple-500/30";
const AUX_BADGE_CLASS = `${BADGE_BASE_CLASS} border-purple-400/40 bg-purple-500/25 text-purple-50 font-semibold`;

const BEST1RM_PANEL_CLASS = "rounded-md border border-emerald-500/40 bg-emerald-500/15 p-3 shadow-sm";
const BEST1RM_LABEL_CLASS = "inline-flex items-center gap-1.5 font-extrabold uppercase tracking-wider mb-2 text-emerald-700 text-xs bg-white w-fit px-2 py-1 rounded shadow-sm ring-1 ring-emerald-500/30";
const BEST1RM_BADGE_CLASS = `${BADGE_BASE_CLASS} border-emerald-700 bg-emerald-800 text-emerald-50`;

type View =
  | { type: "blocks" }
  | { type: "weeks"; blockId: string }
  | { type: "sessions"; blockId: string; week: number };

interface Props {
  student: Student;
  onBack: () => void;
}

export function StudentWorkoutPage({ student, onBack }: Props) {
  const { blocks, loading: blocksLoading, createBlock, updateBlock, deleteBlock } = useTrainingBlocks(student.id);
  const { records: rmRecords, loading: rmLoading, deleteRecord: deleteRmRecord, refetch: refetchRm } = useRmHistory(student.id);
  useRmBackfill(student.id, refetchRm);
  const { logs: exerciseLogs } = useExerciseLogs(student.id);
  const { notes, addNote, deleteNote } = useSessionNotes(student.id);
  const { blockNotes, addNote: addBlockNote, deleteNote: deleteBlockNote } = useBlockNotes(student.id);
  const [view, setView] = useState<View>({ type: "blocks" });
  const isCoach = useIsCoach();
  const [coachNoteInputs, setCoachNoteInputs] = useState<Record<string, string>>({});
  const [blockNoteInputs, setBlockNoteInputs] = useState<Record<string, string>>({});
  const [rpeSort, setRpeSort] = useState<"none" | "desc" | "asc">("none");
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const [openNewBlock, setOpenNewBlock] = useState(false);
  const [blockName, setBlockName] = useState("");
  const [blockFrequency, setBlockFrequency] = useState("3");
  const [blockDuration, setBlockDuration] = useState("4");
  const [sessionNames, setSessionNames] = useState<string[]>([]);
  const [createMode, setCreateMode] = useState<"scratch" | "duplicate">("scratch");
  const [sourceBlockId, setSourceBlockId] = useState<string>("");
  

  useEffect(() => {
    const n = Number(blockFrequency) || 0;
    setSessionNames(prev => Array.from({ length: n }, (_, i) => prev[i] ?? ""));
  }, [blockFrequency, openNewBlock]);
  const [deleteBlockId, setDeleteBlockId] = useState<string | null>(null);
  const [weekToClear, setWeekToClear] = useState<number | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<{ sessionId: string; exerciseId: string; name: string } | null>(null);
  const [deletingExercise, setDeletingExercise] = useState(false);

  const [openExercise, setOpenExercise] = useState(false);
  const [savingExercise, setSavingExercise] = useState(false);
  const lastSaveAtRef = useRef(0);
  const [targetSessionId, setTargetSessionId] = useState<string | null>(null);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exName, setExName] = useState("");
  const [exSets, setExSets] = useState("");
  const [exReps, setExReps] = useState("");
  const [exRpe, setExRpe] = useState("");
  const [exPercentage, setExPercentage] = useState("");
  const [exIsMain, setExIsMain] = useState(false);

  const [openCopy, setOpenCopy] = useState(false);
  const [copyFromWeek, setCopyFromWeek] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { exercises: exerciseDB } = useExercises();

  const tagsByName = useMemo(() => {
    const out: Record<string, LiftType[]> = {};
    exerciseDB.forEach((exercise) => {
      const tags: LiftType[] = [];
      if (exercise.isSquatRm) tags.push("squat");
      if (exercise.isBenchRm) tags.push("bench");
      if (exercise.isDeadliftRm) tags.push("deadlift");
      if (tags.length > 0) out[exercise.name] = tags;
    });
    return out;
  }, [exerciseDB]);

  const bestByBlock = useMemo(() => {
    const out: Record<string, ReturnType<typeof pickBestWeek>> = {};
    blocks.forEach((block) => {
      out[block.id] = pickBestWeek(computeBestByWeek(block, exerciseLogs, tagsByName));
    });
    return out;
  }, [blocks, exerciseLogs, tagsByName]);

  const getDBInfo = (name: string) => exerciseDB.find(e => e.name.toLowerCase() === name.toLowerCase());

  const calcWeekVolume = (block: TrainingBlock, week: number) => {
    const sessions = block.weekSessions?.[week] || block.sessions;
    const sbd = { squat: 0, bench: 0, deadlift: 0 };
    const tonnage = { squat: 0, bench: 0, deadlift: 0 };
    const muscle: Record<string, number> = {};
    const exMeta: Record<string, { sets: number; reps: number; lift: LiftType | null }> = {};
    sessions.forEach(s => {
      s.exercises.forEach(ex => {
        const info = getDBInfo(ex.name);
        if (info) {
          const sbdFromMg3: LiftType | null =
            info.muscleGroup3 === "S" ? "squat" :
            info.muscleGroup3 === "B" ? "bench" :
            info.muscleGroup3 === "D" ? "deadlift" : null;
          if (sbdFromMg3) sbd[sbdFromMg3] += ex.sets;
          [info.muscleGroup, info.muscleGroup2].forEach(mg => {
            if (mg) muscle[mg] = (muscle[mg] || 0) + ex.sets;
          });
          const repsNum = parseInt(String(ex.reps).replace(/[^0-9]/g, ""), 10);
          exMeta[ex.id] = {
            sets: ex.sets || 0,
            reps: Number.isFinite(repsNum) && repsNum > 0 ? repsNum : 0,
            lift: sbdFromMg3,
          };
        }
      });
    });
    exerciseLogs
      .filter(log => log.blockId === block.id && log.weekNumber === week && log.completed && log.weight > 0)
      .forEach(log => {
        const meta = exMeta[log.exerciseId];
        if (!meta || !meta.lift || !meta.reps || !meta.sets) return;
        tonnage[meta.lift] += log.weight * meta.sets * meta.reps;
      });
    return { sbd, tonnage, muscle };
  };

  const calcWeekBest1Rm = (block: TrainingBlock, week: number) => {
    const sessions = block.weekSessions?.[week] || block.sessions;
    const best: Partial<Record<LiftType, number>> = {};
    const exerciseMeta: Record<string, { name: string; reps: number; rpe: number | null }> = {};

    sessions.forEach(session => {
      session.exercises.forEach(ex => {
        const repsNum = parseInt(String(ex.reps).replace(/[^0-9]/g, ""), 10);
        const rpeNum = ex.rpe ? Number(String(ex.rpe).replace(",", ".")) : NaN;
        exerciseMeta[ex.id] = {
          name: ex.name,
          reps: Number.isFinite(repsNum) && repsNum > 0 ? repsNum : 1,
          rpe: Number.isFinite(rpeNum) ? rpeNum : null,
        };
      });
    });

    exerciseLogs
      .filter(log => log.blockId === block.id && log.weekNumber === week && log.completed && log.weight > 0)
      .forEach(log => {
        const meta = exerciseMeta[log.exerciseId];
        if (!meta) return;
        const info = getDBInfo(meta.name);
        if (!info) return;
        const perceived = log.actualRpe ?? meta.rpe;
        if (perceived == null) return;
        const tableRpe = snapToTableRpe(perceived);
        if (tableRpe == null) return;
        const lifts: LiftType[] = [];
        if (info.isSquatRm) lifts.push("squat");
        if (info.isBenchRm) lifts.push("bench");
        if (info.isDeadliftRm) lifts.push("deadlift");
        lifts.forEach(lift => {
          const est = calculate1RM(lift, log.weight, meta.reps, tableRpe);
          if (est > (best[lift] || 0)) best[lift] = est;
        });
      });

    return best;
  };

  const currentBlock = view.type !== "blocks" ? blocks.find(b => b.id === view.blockId) : null;

  const handleCreateBlock = async () => {
    const blockNameSchema = z.string().trim().min(1, "Informe o nome do bloco.").max(100);
    const nameResult = blockNameSchema.safeParse(blockName);
    if (!nameResult.success) {
      toast.error(nameResult.error.issues[0]?.message ?? "Nome inválido.");
      return;
    }

    let newBlock: TrainingBlock;

    if (createMode === "duplicate") {
      const source = blocks.find(b => b.id === sourceBlockId);
      if (!source) {
        toast.error("Selecione um bloco para duplicar.");
        return;
      }
      const cloneExercises = (exs: WorkoutExercise[] = []) =>
        exs.map(e => ({ ...e, id: crypto.randomUUID() }));
      const newBaseSessions = source.sessions.map(s => ({
        id: crypto.randomUUID(),
        name: s.name,
        exercises: cloneExercises(s.exercises),
      }));
      const newWeekSessions: Record<number, WorkoutSession[]> = {};
      for (let w = 1; w <= source.duration; w++) {
        const wkArr = (source.weekSessions?.[w] as WorkoutSession[]) || source.sessions;
        newWeekSessions[w] = wkArr.map(s => ({
          id: crypto.randomUUID(),
          name: s.name,
          exercises: cloneExercises(s.exercises),
        }));
      }
      newBlock = {
        id: crypto.randomUUID(),
        name: nameResult.data.slice(0, 100),
        frequency: source.frequency,
        duration: source.duration,
        sessions: newBaseSessions,
        weekSessions: newWeekSessions,
      };
    } else {
      const sessionNameSchema = z
        .string()
        .transform((v) => v.replace(/\s+/g, " ").trim())
        .pipe(z.string().max(50, "Cada nome de sessão deve ter no máximo 50 caracteres."));
      const freq = Number(blockFrequency) || 1;
      const dur = Number(blockDuration) || 4;
      const normalizedSessionNames: string[] = [];
      for (let i = 0; i < freq; i++) {
        const raw = sessionNames[i] ?? "";
        const parsed = sessionNameSchema.safeParse(raw);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? "Nome de sessão inválido.");
          return;
        }
        normalizedSessionNames.push(parsed.data || sessionLabels[i]);
      }
      const baseSessions = Array.from({ length: freq }, (_, i) => ({
        id: crypto.randomUUID(),
        name: normalizedSessionNames[i],
        exercises: [] as WorkoutExercise[],
      }));
      const weekSessions: Record<number, typeof baseSessions> = {};
      for (let w = 1; w <= dur; w++) {
        weekSessions[w] = baseSessions.map(s => ({ ...s, id: crypto.randomUUID(), exercises: [] }));
      }
      newBlock = {
        id: crypto.randomUUID(),
        name: nameResult.data.slice(0, 100),
        frequency: freq,
        duration: dur,
        sessions: baseSessions,
        weekSessions,
      };
    }

    try {
      await createBlock(newBlock);
      setBlockName(""); setBlockFrequency("3"); setBlockDuration("4"); setSessionNames([]);
      setCreateMode("scratch"); setSourceBlockId("");
      setOpenNewBlock(false);
      toast.success("Bloco criado!");
    } catch { toast.error("Erro ao criar bloco."); }
  };

  const handleDeleteBlock = async () => {
    if (!deleteBlockId) return;
    try {
      await deleteBlock(deleteBlockId);
      setDeleteBlockId(null);
      if (view.type !== "blocks" && view.blockId === deleteBlockId) setView({ type: "blocks" });
      toast.success("Bloco removido!");
    } catch { toast.error("Erro ao remover bloco."); }
  };

  const handleClearWeek = async (weekNum: number) => {
    if (view.type !== "weeks" || !currentBlock) return;
    try {
      const baseSessions = currentBlock.weekSessions?.[weekNum] || currentBlock.sessions;
      const clearedSessions = baseSessions.map((session) => ({
        ...session,
        id: session.id || crypto.randomUUID(),
        exercises: [],
      }));
      await updateBlock({
        ...currentBlock,
        weekSessions: { ...currentBlock.weekSessions, [weekNum]: clearedSessions },
      });
      toast.success(`Exercícios da Semana ${weekNum} apagados. Anotações preservadas.`);
    } catch {
      toast.error("Erro ao apagar exercícios da semana.");
    } finally {
      setWeekToClear(null);
    }
  };

  const resetExerciseForm = () => {
    setExName(""); setExSets(""); setExReps(""); setExRpe(""); setExPercentage(""); setExIsMain(false);
    setEditingExerciseId(null);
    setOpenExercise(false);
  };

  const openEditExercise = (sessionId: string, exercise: WorkoutExercise) => {
    setTargetSessionId(sessionId);
    setEditingExerciseId(exercise.id);
    setExName(exercise.name);
    setExSets(String(exercise.sets));
    setExReps(exercise.reps);
    setExRpe(exercise.rpe || "");
    setExPercentage(exercise.percentage || "");
    setExIsMain(exercise.isMainLift || false);
    setOpenExercise(true);
  };

  const handleSaveExercise = async () => {
    const now = Date.now();
    if (now - lastSaveAtRef.current < 600) return;
    lastSaveAtRef.current = now;
    if (savingExercise) return;
    if (!exName.trim() || !exSets.trim() || !exReps.trim() || !targetSessionId || view.type !== "sessions") {
      toast.error("Preencha nome, séries e repetições."); return;
    }
    const dbMatch = exerciseDB.find(e => e.name.toLowerCase() === exName.trim().toLowerCase());
    if (!dbMatch) {
      toast.error("Selecione um exercício do banco de dados."); return;
    }
    const block = blocks.find(b => b.id === view.blockId);
    if (!block) return;
    const sessions = block.weekSessions?.[view.week] || block.sessions;

    setSavingExercise(true);
    try {
      if (editingExerciseId) {
        const newSessions = sessions.map(s =>
          s.id === targetSessionId
            ? { ...s, exercises: s.exercises.map(e => e.id === editingExerciseId
                ? { ...e, name: exName.trim(), sets: Number(exSets) || 1, reps: exReps.trim(), rpe: exRpe && exRpe !== "none" ? exRpe : undefined, percentage: exPercentage.trim() || undefined, isMainLift: exIsMain }
                : e) }
            : s
        );
        const updated = { ...block, weekSessions: { ...block.weekSessions, [view.week]: newSessions } };
        await updateBlock(updated);
        resetExerciseForm();
        toast.success("Exercício atualizado!");
      } else {
        const newEx: WorkoutExercise = {
          id: crypto.randomUUID(), name: exName.trim().slice(0, 100),
          sets: Number(exSets) || 1, reps: exReps.trim(),
          rpe: exRpe && exRpe !== "none" ? exRpe : undefined,
          percentage: exPercentage.trim() || undefined, isMainLift: exIsMain,
        };
        const newSessions = sessions.map(s => s.id === targetSessionId ? { ...s, exercises: [...s.exercises, newEx] } : s);
        const updated = { ...block, weekSessions: { ...block.weekSessions, [view.week]: newSessions } };
        await updateBlock(updated);
        resetExerciseForm();
        toast.success("Exercício adicionado!");
      }
    } catch {
      toast.error("Erro ao salvar exercício.");
    } finally {
      setSavingExercise(false);
    }
  };

  const handleDeleteExercise = async (sessionId: string, exerciseId: string) => {
    if (view.type !== "sessions") return;
    const block = blocks.find(b => b.id === view.blockId);
    if (!block) return;
    const sessions = block.weekSessions?.[view.week] || block.sessions;
    const newSessions = sessions.map(s => s.id === sessionId ? { ...s, exercises: s.exercises.filter(e => e.id !== exerciseId) } : s);
    const updated = { ...block, weekSessions: { ...block.weekSessions, [view.week]: newSessions } };
    try { await updateBlock(updated); } catch { toast.error("Erro ao remover exercício."); }
  };

  const handleMoveExercise = async (sessionId: string, exerciseId: string, direction: -1 | 1) => {
    if (view.type !== "sessions") return;
    const block = blocks.find(b => b.id === view.blockId);
    if (!block) return;
    const sessions = block.weekSessions?.[view.week] || block.sessions;
    const newSessions = sessions.map(session => {
      if (session.id !== sessionId) return session;
      const currentIndex = session.exercises.findIndex(exercise => exercise.id === exerciseId);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= session.exercises.length) return session;
      const exercises = [...session.exercises];
      const [movedExercise] = exercises.splice(currentIndex, 1);
      exercises.splice(targetIndex, 0, movedExercise);
      return { ...session, exercises };
    });
    const updated = { ...block, weekSessions: { ...block.weekSessions, [view.week]: newSessions } };
    try { await updateBlock(updated); } catch { toast.error("Erro ao mover exercício."); }
  };

  const handleReorderSessions = async (activeId: string, overId: string) => {
    if (view.type !== "sessions") return;
    const block = blocks.find(b => b.id === view.blockId);
    if (!block) return;
    const sessions = block.weekSessions?.[view.week] || block.sessions;
    const oldIdx = sessions.findIndex(s => s.id === activeId);
    const newIdx = sessions.findIndex(s => s.id === overId);
    if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return;
    const arr = arrayMove(sessions, oldIdx, newIdx);
    const updated = { ...block, weekSessions: { ...block.weekSessions, [view.week]: arr } };
    try { await updateBlock(updated); } catch { toast.error("Erro ao reordenar sessão."); }
  };

  const handleSessionsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    handleReorderSessions(String(active.id), String(over.id));
  };

  const handleMoveSession = async (sessionId: string, direction: -1 | 1) => {
    if (view.type !== "sessions") return;
    const block = blocks.find(b => b.id === view.blockId);
    if (!block) return;
    const sessions = block.weekSessions?.[view.week] || block.sessions;
    const idx = sessions.findIndex(s => s.id === sessionId);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= sessions.length) return;
    const arr = arrayMove(sessions, idx, target);
    const updated = { ...block, weekSessions: { ...block.weekSessions, [view.week]: arr } };
    try { await updateBlock(updated); } catch { toast.error("Erro ao reordenar sessão."); }
  };

  const handleRenameSession = async (sessionId: string, newName: string) => {
    if (view.type !== "sessions") return;
    const trimmed = newName.trim().slice(0, 60);
    if (!trimmed) { toast.error("Nome não pode ficar vazio."); return; }
    const block = blocks.find(b => b.id === view.blockId);
    if (!block) return;
    const sessions = block.weekSessions?.[view.week] || block.sessions;
    const arr = sessions.map(s => s.id === sessionId ? { ...s, name: trimmed } : s);
    const updated = { ...block, weekSessions: { ...block.weekSessions, [view.week]: arr } };
    try {
      await updateBlock(updated);
      setRenamingSessionId(null);
      toast.success("Sessão renomeada!");
    } catch { toast.error("Erro ao renomear sessão."); }
  };

  const handleCopyFromWeek = async () => {
    if (view.type !== "sessions") return;
    const sourceWeek = Number(copyFromWeek);
    if (!sourceWeek || sourceWeek === view.week) return;
    const block = blocks.find(b => b.id === view.blockId);
    if (!block) return;
    const sourceSessions = block.weekSessions?.[sourceWeek];
    if (!sourceSessions) { toast.error("Semana de origem não encontrada."); return; }
    const copied = sourceSessions.map(s => ({ ...s, id: crypto.randomUUID(), exercises: s.exercises.map(e => ({ ...e, id: crypto.randomUUID() })) }));
    const updated = { ...block, weekSessions: { ...block.weekSessions, [view.week]: copied } };
    try {
      await updateBlock(updated);
      setOpenCopy(false); setCopyFromWeek("");
      toast.success(`Sessões copiadas da Semana ${sourceWeek}!`);
    } catch { toast.error("Erro ao copiar sessões."); }
  };

  const handleBack = () => {
    if (view.type === "sessions") setView({ type: "weeks", blockId: view.blockId });
    else if (view.type === "weeks") setView({ type: "blocks" });
    else onBack();
  };

  const renderBlocks = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Blocos de Treino</h2>
        <Button size="sm" className="gap-2" onClick={() => setOpenNewBlock(true)}>
          <Plus className="h-4 w-4" /> Novo Bloco
        </Button>
      </div>
      {blocksLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : blocks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum bloco de treino criado.</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => setOpenNewBlock(true)}>
            <Plus className="h-4 w-4" /> Criar primeiro bloco
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {blocks.map(block => {
            const best = bestByBlock[block.id];
            return (
            <div key={block.id} className="space-y-2">
              <Card className="hover:border-primary/30 transition-colors cursor-pointer group"
                onClick={() => setView({ type: "weeks", blockId: block.id })}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-primary" /> {block.name}
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setDeleteBlockId(block.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">{block.frequency}x/sem</Badge>
                    <Badge variant="outline" className="text-xs">{block.duration} sem</Badge>
                  </div>
                  {isCoach && best && (
                    <div className={RM_PANEL_CLASS}>
                      <div className={RM_LABEL_CLASS}>
                        <TrendingUp className="h-3 w-3" />
                        <span>Melhor semana — Semana {best.week}</span>
                      </div>
                      <div className={RM_GRID_CLASS}>
                        {(["squat", "bench", "deadlift"] as LiftType[]).map(lift => {
                          const value = best.best[lift];
                          if (!value) return null;
                          return (
                            <Badge key={lift} variant="default" className={RM_BADGE_CLASS} title={`${LIFT_FULL[lift]}: ${formatKg(value)}`}>
                              <span className={RM_BADGE_TEXT_CLASS}>{LIFT_SHORT[lift]} {formatKg(value)}</span>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {block.sessions.map(s => (
                      <Badge key={s.id} variant="default" className="text-[10px]">{s.name}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-1.5">
                {blockNotes.filter(n => n.blockId === block.id).map(note => (
                  <div key={note.id} className="bg-muted/50 rounded p-2 text-xs flex items-start justify-between gap-2">
                    <div>
                      <p>{note.message}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{new Date(note.createdAt).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive shrink-0"
                      onClick={() => deleteBlockNote(note.id)}>
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                ))}
                {blockNotes.filter(n => n.blockId === block.id).length < 12 ? (
                  <div className="flex gap-1.5">
                    <Textarea
                      placeholder="Nota sobre o aluno..."
                      className="min-h-[36px] text-xs"
                      maxLength={200}
                      value={blockNoteInputs[block.id] || ""}
                      onChange={(e) => setBlockNoteInputs(prev => ({ ...prev, [block.id]: e.target.value }))}
                    />
                    <Button size="sm" className="h-auto px-2" onClick={async () => {
                      const msg = blockNoteInputs[block.id]?.trim();
                      if (!msg) return;
                      if (msg.length > 200) { toast.error("Máximo de 200 caracteres."); return; }
                      try {
                        await addBlockNote({ studentId: student.id, blockId: block.id, message: msg });
                        setBlockNoteInputs(prev => ({ ...prev, [block.id]: "" }));
                        toast.success("Nota adicionada!");
                      } catch { toast.error("Erro ao adicionar nota."); }
                    }}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-[9px] text-muted-foreground italic">Limite de 12 notas atingido.</p>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderWeeks = () => {
    if (!currentBlock) return null;
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">{currentBlock.name}</h2>
          <p className="text-sm text-muted-foreground">{currentBlock.frequency}x/sem · {currentBlock.duration} semanas</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: currentBlock.duration }, (_, i) => {
            const { sbd, tonnage, muscle } = calcWeekVolume(currentBlock, i + 1);
            const best1Rm = calcWeekBest1Rm(currentBlock, i + 1);
            const hasBest1Rm = (["squat", "bench", "deadlift"] as LiftType[]).some(lift => best1Rm[lift]);
            const hasSbd = sbd.squat > 0 || sbd.bench > 0 || sbd.deadlift > 0;
            const hasTonnage = tonnage.squat > 0 || tonnage.bench > 0 || tonnage.deadlift > 0;
            const muscleEntries = Object.entries(muscle).sort((a, b) => b[1] - a[1]);
            return (
              <Card key={i} className="hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => setView({ type: "sessions", blockId: currentBlock.id, week: i + 1 })}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" /> Semana {i + 1}
                    </CardTitle>
                    <DeleteWeekButton weekNum={i + 1} onRequestDelete={setWeekToClear} allowInWorkoutTab />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {hasBest1Rm && (
                    <div className={BEST1RM_PANEL_CLASS}>
                      <div className={BEST1RM_LABEL_CLASS}>
                        <TrendingUp className="h-3 w-3" />
                        <span>Melhor 1RM estimada</span>
                      </div>
                      <div className={BADGE_GRID_CLASS}>
                        {(["squat", "bench", "deadlift"] as LiftType[]).map(lift => {
                          const value = best1Rm[lift];
                          if (!value) return null;
                          return (
                            <Badge key={lift} variant="secondary" className={BEST1RM_BADGE_CLASS} title={`${LIFT_FULL[lift]}: ${formatKg(value)}`}>
                              <span className={BADGE_TEXT_CLASS}>{LIFT_SHORT[lift]} {formatKg(value)}</span>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {hasSbd && (
                    <div className={SBD_PANEL_CLASS}>
                      <div className={SBD_LABEL_CLASS}>SBD Volume</div>
                      <div className={BADGE_GRID_CLASS}>
                        {sbd.squat > 0 && <Badge variant="secondary" className={SBD_SQ_BADGE_CLASS} title={`Agachamento: ${sbd.squat} séries`}><span className={BADGE_TEXT_CLASS}>SQ: {sbd.squat} séries</span></Badge>}
                        {sbd.bench > 0 && <Badge variant="secondary" className={SBD_BP_BADGE_CLASS} title={`Supino: ${sbd.bench} séries`}><span className={BADGE_TEXT_CLASS}>BP: {sbd.bench} séries</span></Badge>}
                        {sbd.deadlift > 0 && <Badge variant="secondary" className={SBD_DL_BADGE_CLASS} title={`Levantamento Terra: ${sbd.deadlift} séries`}><span className={BADGE_TEXT_CLASS}>DL: {sbd.deadlift} séries</span></Badge>}
                      </div>
                    </div>
                  )}
                  {hasTonnage && (
                    <div className={TONNAGE_PANEL_CLASS}>
                      <div className={TONNAGE_LABEL_CLASS}>Tonelagem SBD</div>
                      <div className={BADGE_GRID_CLASS}>
                        {tonnage.squat > 0 && <Badge variant="secondary" className={TONNAGE_BADGE_CLASS} title={`Agachamento: ${formatKg(tonnage.squat)}`}><span className={BADGE_TEXT_CLASS}>SQ: {formatKg(tonnage.squat)}</span></Badge>}
                        {tonnage.bench > 0 && <Badge variant="secondary" className={TONNAGE_BADGE_CLASS} title={`Supino: ${formatKg(tonnage.bench)}`}><span className={BADGE_TEXT_CLASS}>BP: {formatKg(tonnage.bench)}</span></Badge>}
                        {tonnage.deadlift > 0 && <Badge variant="secondary" className={TONNAGE_BADGE_CLASS} title={`Levantamento Terra: ${formatKg(tonnage.deadlift)}`}><span className={BADGE_TEXT_CLASS}>DL: {formatKg(tonnage.deadlift)}</span></Badge>}
                      </div>
                    </div>
                  )}
                  {muscleEntries.length > 0 && (
                    <div className={AUX_PANEL_CLASS}>
                      <div className={AUX_LABEL_CLASS}>Volume Auxiliares</div>
                      <div className={BADGE_GRID_CLASS}>
                        {muscleEntries.map(([mg, sets]) => (
                          <Badge key={mg} variant="secondary" className={AUX_BADGE_CLASS} title={`${mg}: ${sets} séries`}>
                            <span className={BADGE_TEXT_CLASS}>{mg}: {sets}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {isCoach && currentBlock.id && student?.id && (
                    <WeekNotesCard blockId={currentBlock.id} studentId={student.id} weekNumber={i + 1} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSessions = () => {
    if (view.type !== "sessions" || !currentBlock) return null;
    const sessions = currentBlock.weekSessions?.[view.week] || currentBlock.sessions;
    const otherWeeks = Array.from({ length: currentBlock.duration }, (_, i) => i + 1).filter(w => w !== view.week);

    const getLog = (sessionId: string, exerciseId: string) =>
      exerciseLogs.find(l => l.blockId === currentBlock.id && l.weekNumber === view.week && l.sessionId === sessionId && l.exerciseId === exerciseId);

    const sortExercises = (sessionId: string, exercises: WorkoutExercise[]) => {
      if (rpeSort === "none") return exercises;
      return [...exercises].sort((a, b) => {
        const ra = getLog(sessionId, a.id)?.actualRpe;
        const rb = getLog(sessionId, b.id)?.actualRpe;
        const va = ra ?? -Infinity;
        const vb = rb ?? -Infinity;
        return rpeSort === "desc" ? vb - va : va - vb;
      });
    };

    const cycleRpeSort = () => setRpeSort(prev => prev === "none" ? "desc" : prev === "desc" ? "asc" : "none");

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold">{currentBlock.name} - Semana {view.week}</h2>
            <p className="text-sm text-muted-foreground">{student.name} · {currentBlock.frequency}x/sem</p>
          </div>
          <div className="flex items-center gap-2">
            {otherWeeks.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setOpenCopy(true)}>
                <Copy className="h-3.5 w-3.5" /> Buscar Treino
              </Button>
            )}
          </div>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSessionsDragEnd}>
        <SortableContext items={sessions.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session, sIdx) => (
            <SortableSessionCard key={session.id} id={session.id}>
              {({ dragHandle }) => (
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  {dragHandle}
                  {renamingSessionId === session.id ? (
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <Input
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameSession(session.id, renameDraft);
                          if (e.key === "Escape") setRenamingSessionId(null);
                        }}
                        maxLength={60}
                        className="h-7 text-sm px-2"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-primary"
                        onClick={() => handleRenameSession(session.id, renameDraft)} title="Salvar">
                        ✓
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground"
                        onClick={() => setRenamingSessionId(null)} title="Cancelar">
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <>
                      <CardTitle className="text-sm truncate">{session.name}</CardTitle>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary"
                        onClick={() => { setRenamingSessionId(session.id); setRenameDraft(session.name); }}
                        title="Renomear sessão">
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex h-8 w-16 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-background shadow-sm ring-1 ring-primary/10">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none text-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-35 disabled:hover:bg-transparent"
                    disabled={sIdx === 0}
                    onClick={() => handleMoveSession(session.id, -1)} title="Mover sessão para cima">
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <div className="h-5 w-px bg-border" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none text-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-35 disabled:hover:bg-transparent"
                    disabled={sIdx === sessions.length - 1}
                    onClick={() => handleMoveSession(session.id, 1)} title="Mover sessão para baixo">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {session.exercises.length === 0 && (
                  <p className="text-xs text-muted-foreground py-1">Nenhum exercício.</p>
                )}
                {sortExercises(session.id, session.exercises).map(exercise => {
                  const originalIndex = session.exercises.findIndex(item => item.id === exercise.id);
                  const log = getLog(session.id, exercise.id);
                  const rpeColor = log?.actualRpe == null ? "" :
                    log.actualRpe >= 9 ? "bg-red-500/15 text-red-600 border-red-300" :
                    log.actualRpe >= 8 ? "bg-amber-500/15 text-amber-600 border-amber-300" :
                    log.actualRpe >= 7 ? "bg-yellow-500/15 text-yellow-700 border-yellow-300" :
                    "bg-emerald-500/15 text-emerald-600 border-emerald-300";
                  // Estimativa de 1RM a partir do log executado
                  const dbInfoEx = getDBInfo(exercise.name);
                  const liftFromMg3: LiftType | null =
                    dbInfoEx?.muscleGroup3 === "S" ? "squat" :
                    dbInfoEx?.muscleGroup3 === "B" ? "bench" :
                    dbInfoEx?.muscleGroup3 === "D" ? "deadlift" : null;
                  let estimated1rm: number | null = null;
                  if (liftFromMg3 && log?.completed && log.weight > 0) {
                    const repsNum = parseInt(String(exercise.reps).replace(/[^0-9]/g, ""), 10);
                    const prescribedRpe = exercise.rpe ? Number(String(exercise.rpe).replace(",", ".")) : NaN;
                    const perceived = log.actualRpe ?? (Number.isFinite(prescribedRpe) ? prescribedRpe : null);
                    const tableRpe = perceived != null ? snapToTableRpe(perceived) : null;
                    if (Number.isFinite(repsNum) && repsNum > 0 && tableRpe != null) {
                      const est = calculate1RM(liftFromMg3, log.weight, repsNum, tableRpe);
                      if (est > 0) estimated1rm = est;
                    }
                  }
                  return (
                    <div key={exercise.id}
                      className={`p-2 rounded text-xs grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 overflow-visible ${exercise.isMainLift ? "bg-primary/10 border border-primary/20" : "bg-muted/50"}`}>
                      <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                        {exercise.isMainLift && <Badge variant="default" className="text-[9px] px-1 py-0">Main</Badge>}
                        <span className="font-medium truncate">{exercise.name}</span>
                        {estimated1rm != null && (
                          <Badge
                            variant="default"
                            className="text-[9px] py-0 px-1 gap-0.5 bg-emerald-600 hover:bg-emerald-600 text-white border-emerald-700 shrink-0"
                            title={`1RM estimada — ${LIFT_FULL[liftFromMg3!]} (${log!.weight}kg × ${parseInt(String(exercise.reps).replace(/[^0-9]/g, ""),10)} @RPE${log!.actualRpe ?? exercise.rpe})`}
                          >
                            <TrendingUp className="h-2.5 w-2.5" />~{estimated1rm}kg
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 shrink-0 min-w-max overflow-visible">
                        <span className="text-muted-foreground whitespace-nowrap tabular-nums">
                          {exercise.sets}x{exercise.reps}
                          {exercise.rpe && ` @RPE${exercise.rpe}`}
                          {exercise.percentage && ` ${exercise.percentage}`}
                        </span>
                        {log?.completed && log.weight > 0 && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 gap-0.5 border-primary/30 text-primary">
                            <Weight className="h-2.5 w-2.5" />{formatKg(log.weight)}
                          </Badge>
                        )}
                        {log?.actualRpe != null && (
                          <Badge variant="outline" className={`text-[9px] py-0 px-1 gap-0.5 ${rpeColor}`}>
                            <Gauge className="h-2.5 w-2.5" />RPE {log.actualRpe}
                          </Badge>
                        )}
                        <div className="flex h-8 w-16 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-background shadow-sm ring-1 ring-primary/10">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none text-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-35 disabled:hover:bg-transparent"
                            disabled={originalIndex <= 0 || rpeSort !== "none"}
                            onClick={() => handleMoveExercise(session.id, exercise.id, -1)} title="Mover para cima">
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <div className="h-5 w-px bg-border" />
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none text-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-35 disabled:hover:bg-transparent"
                            disabled={originalIndex === session.exercises.length - 1 || rpeSort !== "none"}
                            onClick={() => handleMoveExercise(session.id, exercise.id, 1)} title="Mover para baixo">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEditExercise(session.id, exercise)}>
                          <Pencil className="h-2.5 w-2.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => setExerciseToDelete({ sessionId: session.id, exerciseId: exercise.id, name: exercise.name })}>
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" className="w-full mt-1 gap-1 text-xs h-7"
                  onClick={() => { setTargetSessionId(session.id); setEditingExerciseId(null); setExName(""); setExSets(""); setExReps(""); setExRpe(""); setExPercentage(""); setExIsMain(false); setOpenExercise(true); }}>
                  <Plus className="h-3 w-3" /> Adicionar Exercício
                </Button>
                {(() => {
                  const sessionMuscle: Record<string, number> = {};
                  const sessionSbd: Record<string, number> = {};
                  session.exercises.forEach(ex => {
                    const info = getDBInfo(ex.name);
                    if (info) {
                      [info.muscleGroup, info.muscleGroup2].forEach(mg => {
                        if (mg) sessionMuscle[mg] = (sessionMuscle[mg] || 0) + ex.sets;
                      });
                      const sbdFromMg3 =
                        info.muscleGroup3 === "S" ? "squat" :
                        info.muscleGroup3 === "B" ? "bench" :
                        info.muscleGroup3 === "D" ? "deadlift" : null;
                      if (sbdFromMg3) sessionSbd[sbdFromMg3] = (sessionSbd[sbdFromMg3] || 0) + ex.sets;
                    }
                  });
                  const totalSets = Object.values(sessionMuscle).reduce((a, b) => a + b, 0);
                  const muscleEntries = Object.entries(MUSCLE_ABBREV)
                    .map(([full, abbr]) => ({ full, abbr, val: sessionMuscle[full] || 0 }))
                    .filter(m => m.val > 0)
                    .sort((a, b) => b.val - a.val);
                  const hasSbd = (sessionSbd.squat || 0) + (sessionSbd.bench || 0) + (sessionSbd.deadlift || 0) > 0;
                  if (totalSets === 0 && !hasSbd) return null;
                  return (
                    <div className="pt-2 space-y-2">
                      <div className="rounded-lg border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 p-2.5 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-1">
                            <Dumbbell className="h-3 w-3" /> Volume da Sessão
                          </p>
                          {totalSets > 0 && (
                            <span className="text-[11px] font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-md tabular-nums">
                              {totalSets} sets
                            </span>
                          )}
                        </div>
                        {hasSbd && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {sessionSbd.squat > 0 && (
                              <Badge className="text-[11px] font-bold py-1 px-2.5 border-blue-700 bg-blue-800 hover:bg-blue-800 text-blue-50 tabular-nums">
                                SQ · {sessionSbd.squat}
                              </Badge>
                            )}
                            {sessionSbd.bench > 0 && (
                              <Badge className="text-[11px] font-bold py-1 px-2.5 border-[#5a2d0d] bg-[#8b4513] hover:bg-[#8b4513] text-amber-50 tabular-nums">
                                BP · {sessionSbd.bench}
                              </Badge>
                            )}
                            {sessionSbd.deadlift > 0 && (
                              <Badge className="text-[11px] font-bold py-1 px-2.5 border-orange-700 bg-orange-600 hover:bg-orange-600 text-orange-50 tabular-nums">
                                DL · {sessionSbd.deadlift}
                              </Badge>
                            )}
                          </div>
                        )}
                        {muscleEntries.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {muscleEntries.map(m => (
                              <Badge
                                key={m.full}
                                variant="secondary"
                                className="text-[11px] font-semibold py-1 px-2 tabular-nums"
                                title={`${m.full}: ${m.val} sets`}
                              >
                                {m.abbr} · {m.val}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Student messages */}
                {(() => {
                  const studentNotes = notes.filter(n => n.sender === "student" && n.sessionId === session.id && view.type === "sessions" && n.blockId === view.blockId && n.weekNumber === view.week);
                  if (studentNotes.length === 0) return null;
                  return (
                    <div className="border-t border-border pt-2 mt-2 space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Mensagens do aluno
                      </p>
                      {studentNotes.map(note => (
                        <div key={note.id} className="bg-muted/50 rounded p-1.5 text-xs">
                          <p>{note.message}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">{new Date(note.createdAt).toLocaleDateString("pt-BR")}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Coach messages */}
                {(() => {
                  if (view.type !== "sessions") return null;
                  const coachNotes = notes.filter(n => n.sender === "coach" && n.sessionId === session.id && n.blockId === view.blockId && n.weekNumber === view.week);
                  const noteKey = `${session.id}-${view.blockId}-${view.week}`;
                  return (
                    <div className="border-t border-border pt-2 mt-2 space-y-1">
                      <p className="text-[10px] font-medium text-primary flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Mensagem para o aluno
                      </p>
                      {coachNotes.map(note => (
                        <div key={note.id} className="bg-primary/5 border border-primary/20 rounded p-1.5 text-xs flex items-start justify-between gap-1">
                          <div>
                            <p>{note.message}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{new Date(note.createdAt).toLocaleDateString("pt-BR")}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive shrink-0"
                            onClick={async () => { try { await deleteNote(note.id); toast.success("Mensagem removida!"); } catch { toast.error("Erro."); } }}>
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      ))}
                      {coachNotes.length < 2 ? (
                        <div className="flex gap-1.5">
                          <Textarea
                            placeholder="Mensagem para o aluno..."
                            className="min-h-[40px] text-xs"
                            maxLength={200}
                            value={coachNoteInputs[noteKey] || ""}
                            onChange={(e) => setCoachNoteInputs(prev => ({ ...prev, [noteKey]: e.target.value }))}
                          />
                          <Button size="sm" className="h-auto px-2" onClick={async () => {
                            const msg = coachNoteInputs[noteKey]?.trim();
                            if (!msg) return;
                            if (msg.length > 200) { toast.error("Máximo de 200 caracteres."); return; }
                            try {
                              await addNote({ studentId: student.id, blockId: view.blockId, weekNumber: view.week, sessionId: session.id, message: msg, sender: "coach" });
                              setCoachNoteInputs(prev => ({ ...prev, [noteKey]: "" }));
                              toast.success("Mensagem enviada!");
                            } catch { toast.error("Erro ao enviar."); }
                          }}>
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-[9px] text-muted-foreground italic">Limite de 2 mensagens atingido.</p>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
              )}
            </SortableSessionCard>
          ))}
        </div>
        </SortableContext>
        </DndContext>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Treino — {student.name}
          </h1>
        </div>
      </div>

      {view.type === "blocks" && (
        <>
          <RmEvolutionChart records={rmRecords} loading={rmLoading} onDeleteRecord={deleteRmRecord} />
          {renderBlocks()}
        </>
      )}
      {view.type === "weeks" && renderWeeks()}
      {view.type === "sessions" && renderSessions()}

      {/* New Block Dialog */}
      <Dialog open={openNewBlock} onOpenChange={setOpenNewBlock}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Bloco de Treino</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Como deseja criar?</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={createMode === "scratch" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setCreateMode("scratch"); setSourceBlockId(""); }}
                >
                  Começar do zero
                </Button>
                <Button
                  type="button"
                  variant={createMode === "duplicate" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCreateMode("duplicate")}
                >
                  Duplicar existente
                </Button>
              </div>
            </div>

            {createMode === "duplicate" && (
              <div className="space-y-2">
                <Label>Bloco de origem</Label>
                <Select
                  value={sourceBlockId}
                  onValueChange={(v) => {
                    setSourceBlockId(v);
                    const src = blocks.find(b => b.id === v);
                    if (src && !blockName.trim()) setBlockName(`Cópia de ${src.name}`.slice(0, 100));
                  }}
                  disabled={blocksLoading || blocks.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={blocksLoading ? "Carregando..." : blocks.length === 0 ? "Este aluno ainda não tem blocos" : "Selecione um bloco..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {blocks.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.frequency}x · {b.duration}sem)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Estrutura, sessões e exercícios serão copiados. Anotações não são copiadas.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nome do Bloco</Label>
              <Input placeholder="Ex: Bloco de Força" value={blockName} onChange={(e) => setBlockName(e.target.value)} maxLength={100} />
            </div>

            {createMode === "scratch" && (
              <>
                <div className="space-y-2">
                  <Label>Frequência semanal</Label>
                  <Select value={blockFrequency} onValueChange={setBlockFrequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}x por semana</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {Number(blockFrequency) > 0 && (
                  <div className="space-y-2">
                    <Label>Nomes das sessões</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: Number(blockFrequency) }, (_, i) => (
                        <Input
                          key={i}
                          value={sessionNames[i] ?? ""}
                          placeholder={sessionLabels[i]}
                          maxLength={50}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSessionNames(prev => {
                              const next = [...prev];
                              next[i] = v;
                              return next;
                            });
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Deixe em branco para usar o padrão (Sessão 1, 2…).</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Duração</Label>
                  <Select value={blockDuration} onValueChange={setBlockDuration}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[3,4,5,6,7,8,9,10].map(n => (
                        <SelectItem key={n} value={String(n)}>{n} semanas</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNewBlock(false)}>Cancelar</Button>
            <Button onClick={handleCreateBlock}>Criar Bloco</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy from week */}
      <Dialog open={openCopy} onOpenChange={setOpenCopy}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Copiar de outra semana</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={copyFromWeek} onValueChange={setCopyFromWeek}>
              <SelectTrigger><SelectValue placeholder="Selecione a semana" /></SelectTrigger>
              <SelectContent>
                {view.type === "sessions" && currentBlock &&
                  Array.from({ length: currentBlock.duration }, (_, i) => i + 1)
                    .filter(w => w !== view.week)
                    .map(w => <SelectItem key={w} value={String(w)}>Semana {w}</SelectItem>)
                }
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCopy(false)}>Cancelar</Button>
            <Button onClick={handleCopyFromWeek} disabled={!copyFromWeek}>Copiar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Exercise Dialog */}
      <Dialog open={openExercise} onOpenChange={(open) => { if (!open) resetExerciseForm(); else setOpenExercise(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingExerciseId ? "Editar Exercício" : "Adicionar Exercício"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Exercício</Label>
              <Input placeholder="Buscar exercício..." value={exName} onChange={(e) => setExName(e.target.value)} maxLength={100} />
              {exName.length >= 1 && !exerciseDB.some(e => e.name.toLowerCase() === exName.toLowerCase()) && (
                <div className="flex flex-wrap gap-1 mt-1 max-h-32 overflow-y-auto">
                  {exerciseDB.filter(e => e.name.toLowerCase().includes(exName.toLowerCase())).slice(0, 10).map(e => (
                    <Badge key={e.id} variant="outline" className="cursor-pointer text-xs hover:bg-primary/10"
                      onClick={() => setExName(e.name)}>{e.name}</Badge>
                  ))}
                  {exerciseDB.filter(e => e.name.toLowerCase().includes(exName.toLowerCase())).length === 0 && (
                    <p className="text-xs text-destructive">Nenhum exercício encontrado. Cadastre no Banco de Exercícios primeiro.</p>
                  )}
                </div>
              )}
              {exerciseDB.some(e => e.name.toLowerCase() === exName.toLowerCase()) && (
                <p className="text-xs text-primary">✓ Exercício selecionado</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Séries</Label>
                <Input type="number" placeholder="4" value={exSets} onChange={(e) => setExSets(e.target.value)} min={1} />
              </div>
              <div className="space-y-2">
                <Label>Repetições</Label>
                <Input placeholder="8" value={exReps} onChange={(e) => setExReps(e.target.value)} maxLength={20} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>RPE (opcional)</Label>
                <Select value={exRpe} onValueChange={setExRpe}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {Array.from({ length: 10 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>% 1RM (opcional)</Label>
                <Input placeholder="75%" value={exPercentage} onChange={(e) => setExPercentage(e.target.value)} maxLength={10} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetExerciseForm} disabled={savingExercise}>Cancelar</Button>
            <Button onClick={handleSaveExercise} disabled={savingExercise}>
              {savingExercise ? "Salvando..." : (editingExerciseId ? "Salvar" : "Adicionar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Block Confirmation */}
      <AlertDialog open={!!deleteBlockId} onOpenChange={(open) => !open && setDeleteBlockId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir bloco?</AlertDialogTitle>
            <AlertDialogDescription>Todas as sessões e exercícios serão removidos permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBlock}>Sim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={weekToClear !== null} onOpenChange={(open) => !open && setWeekToClear(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar exercícios da semana?</AlertDialogTitle>
            <AlertDialogDescription>
              Os exercícios da Semana {weekToClear} serão removidos, mas as sessões e anotações serão preservadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => weekToClear !== null && handleClearWeek(weekToClear)}
            >
              Apagar semana
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!exerciseToDelete} onOpenChange={(open) => { if (!open && !deletingExercise) setExerciseToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir exercício?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover &quot;{exerciseToDelete?.name}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingExercise}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingExercise}
              onClick={async (e) => {
                e.preventDefault();
                if (!exerciseToDelete) return;
                setDeletingExercise(true);
                try {
                  await handleDeleteExercise(exerciseToDelete.sessionId, exerciseToDelete.exerciseId);
                  setExerciseToDelete(null);
                } finally {
                  setDeletingExercise(false);
                }
              }}
            >
              {deletingExercise ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
