import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTrainingBlocks } from "@/hooks/useTrainingBlocks";
import { useExerciseLogs } from "@/hooks/useExerciseLogs";
import { useSessionNotes } from "@/hooks/useSessionNotes";
import { useRmHistory, calculate1RMFromRpe } from "@/hooks/useRmHistory";
import { useRmBackfill } from "@/hooks/useRmBackfill";
import { snapToTableRpe } from "@/lib/rpe-tables";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dumbbell, LogOut, User, Loader2, ArrowLeft, MessageSquare, Weight, Send, Calendar, Check, Trash2, Play, CheckCircle2, Camera, Gauge } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RmEvolutionChart } from "@/components/RmEvolutionChart";
import { RpeReferenceTable } from "@/components/RpeReferenceTable";
import { WarmupCalculator } from "@/components/WarmupCalculator";
import StudentAvatarDialog from "@/components/StudentAvatarDialog";
import type { Student, TrainingBlock, WorkoutSession } from "@/lib/mock-data";
import { StudentMobilitySection } from "@/components/StudentMobilitySection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentRankingSection } from "@/components/StudentRankingSection";
import { StrengthRankingSection } from "@/components/StrengthRankingSection";
import { WeeklySummary } from "@/components/WeeklySummary";
import { toast } from "sonner";
import { format } from "date-fns";
import { sbdTotal, formatKg } from "@/lib/utils";

type View =
  | { type: "blocks" }
  | { type: "weeks"; blockId: string }
  | { type: "sessions"; blockId: string; week: number };

const StudentDashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>({ type: "blocks" });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  // Fetch student profile
  const refreshStudent = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setStudent({
        id: data.id, name: data.name, email: data.email,
        phone: data.phone || undefined, state: data.state || undefined,
        plan: data.plan, planValue: Number(data.plan_value),
        status: data.status as Student["status"],
        joinedAt: data.joined_at, paymentDueDate: data.payment_due_date || "",
        squat1RM: Number(data.squat_1rm), bench1RM: Number(data.bench_1rm),
        deadlift1RM: Number(data.deadlift_1rm), renewalDay: data.renewal_day || undefined,
      });
      setAvatarUrl(data.avatar || null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/aluno/login"); return; }
    if (!user) return;
    refreshStudent();
  }, [user, authLoading, navigate, refreshStudent]);

  const { blocks, loading: blocksLoading } = useTrainingBlocks(student?.id);
  const { logs, upsertLog } = useExerciseLogs(student?.id);
  const { notes, addNote, deleteNote } = useSessionNotes(student?.id);
  const { records: rmRecords, loading: rmLoading, addRecord: addRmRecord, deleteRecord: deleteRmRecord, refetch: refetchRm } = useRmHistory(student?.id);
  useRmBackfill(student?.id, refetchRm);
  const [completedWeeks, setCompletedWeeks] = useState<{ blockId: string; weekNumber: number }[]>([]);

  // Fetch completed weeks
  useEffect(() => {
    if (!student) return;
    supabase
      .from("completed_weeks")
      .select("block_id, week_number")
      .eq("student_id", student.id)
      .then(({ data }) => {
        if (data) setCompletedWeeks(data.map(d => ({ blockId: d.block_id, weekNumber: d.week_number })));
      });
  }, [student]);

  const isWeekCompleted = (blockId: string, week: number) =>
    completedWeeks.some(cw => cw.blockId === blockId && cw.weekNumber === week);

  const toggleWeekCompleted = async (blockId: string, week: number) => {
    if (!student) return;
    const completed = isWeekCompleted(blockId, week);
    if (completed) {
      await supabase.from("completed_weeks").delete()
        .eq("student_id", student.id).eq("block_id", blockId).eq("week_number", week);
      setCompletedWeeks(prev => prev.filter(cw => !(cw.blockId === blockId && cw.weekNumber === week)));
      toast.error("Semana desmarcada!");
    } else {
      await supabase.from("completed_weeks").insert({
        student_id: student.id, block_id: blockId, week_number: week,
      });
      setCompletedWeeks(prev => [...prev, { blockId, weekNumber: week }]);
      toast.success("Semana concluída!");
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Sessão encerrada", { description: "Você saiu da sua conta com sucesso." });
    navigate("/aluno/login");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <User className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Conta não vinculada</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Seu e-mail ainda não está vinculado a nenhum aluno. Peça ao seu treinador para vincular sua conta.
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const total = sbdTotal(student.squat1RM, student.bench1RM, student.deadlift1RM);
  const currentBlock = view.type !== "blocks" ? blocks.find(b => b.id === view.blockId) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{student.plan}</p>
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <LogOut className="h-4 w-4" /> Sair
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sair da sua conta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você precisará fazer login novamente para acessar seus treinos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout}>Sair</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <StudentAvatarDialog
        open={avatarDialogOpen}
        onOpenChange={setAvatarDialogOpen}
        studentId={student.id}
        studentName={student.name}
        avatarUrl={avatarUrl}
        onAvatarChange={setAvatarUrl}
      />

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {/* Profile */}
        <div className="flex flex-col items-center gap-2">
          <button onClick={() => setAvatarDialogOpen(true)} className="focus:outline-none hover-scale relative group">
            <Avatar className="h-28 w-28 border-2 border-primary/20 cursor-pointer">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={student.name} className="object-cover" />
              ) : null}
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {student.name.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </button>
          <p className="font-semibold text-lg">{student.name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total SBD</p>
            <p className="text-xl font-bold text-primary">{formatKg(total)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Squat</p>
            <p className="text-xl font-bold">{formatKg(student.squat1RM)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Bench</p>
            <p className="text-xl font-bold">{formatKg(student.bench1RM)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Deadlift</p>
            <p className="text-xl font-bold">{formatKg(student.deadlift1RM)}</p>
          </CardContent></Card>
        </div>

        {/* Weekly Summary */}
        {view.type === "blocks" && <WeeklySummary studentId={student.id} />}

        {/* 1RM Evolution */}
        <RmEvolutionChart records={rmRecords} loading={rmLoading} onDeleteRecord={deleteRmRecord} />
        {student.joinedAt && (Date.now() - new Date(student.joinedAt).getTime()) < 60 * 24 * 60 * 60 * 1000 && (
          <RpeReferenceTable />
        )}
        <WarmupCalculator />
        {view.type !== "blocks" && (
          <Button variant="ghost" size="sm" className="gap-1 -ml-2"
            onClick={() => view.type === "sessions" ? setView({ type: "weeks", blockId: view.blockId }) : setView({ type: "blocks" })}>
            <ArrowLeft className="h-4 w-4" />
            {view.type === "sessions" ? "Voltar às semanas" : "Voltar aos blocos"}
          </Button>
        )}

        {/* Tabs: Mobilidade + Treinos (apenas na visão de blocos) */}
        {view.type === "blocks" && (
          <Tabs defaultValue="mobility" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mobility">Minhas Mobilidades</TabsTrigger>
              <TabsTrigger value="workouts">Meus Treinos</TabsTrigger>
            </TabsList>

            <TabsContent value="mobility" className="mt-4">
              <StudentMobilitySection studentId={student.id} />
            </TabsContent>

            <TabsContent value="workouts" className="mt-4">
              {blocksLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : blocks.length === 0 ? (
                <Card><CardContent className="py-12 text-center">
                  <Dumbbell className="h-10 w-10 mx-auto text-muted-foreground/30" />
                  <p className="text-muted-foreground mt-3">Nenhum bloco de treino disponível.</p>
                  <p className="text-sm text-muted-foreground">Aguarde seu treinador montar seu programa.</p>
                </CardContent></Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {blocks.map(block => (
                    <Card key={block.id} className="cursor-pointer hover:border-primary/30 transition-colors"
                      onClick={() => setView({ type: "weeks", blockId: block.id })}>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Dumbbell className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{block.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {block.frequency}x/semana • {block.duration} semanas
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {view.type === "blocks" && <StudentRankingSection studentId={student.id} />}
        {view.type === "blocks" && <StrengthRankingSection highlightStudentId={student.id} compact limit={4} showSelfRow />}

        {/* Weeks View */}
        {view.type === "weeks" && currentBlock && (
          <div>
            <h2 className="text-lg font-semibold mb-3">{currentBlock.name}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: currentBlock.duration }, (_, i) => i + 1).map(week => {
                const done = isWeekCompleted(currentBlock.id, week);
                return (
                  <Card key={week} className={`cursor-pointer transition-colors ${done ? "border-green-500 bg-green-50 dark:bg-green-950/30" : "hover:border-primary/30"}`}
                    onClick={() => setView({ type: "sessions", blockId: currentBlock.id, week })}>
                    <CardContent className="p-4 text-center">
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 mx-auto text-green-600 mb-1" />
                      ) : (
                        <Calendar className="h-4 w-4 mx-auto text-primary mb-1" />
                      )}
                      <p className={`font-medium ${done ? "text-green-700 dark:text-green-400" : ""}`}>Semana {week}</p>
                      <p className="text-xs text-muted-foreground">{currentBlock.sessions.length} sessões</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Sessions View with exercise logging */}
        {view.type === "sessions" && currentBlock && (
          <SessionsView
            student={student}
            block={currentBlock}
            week={view.week}
            logs={logs}
            notes={notes}
            onUpsertLog={upsertLog}
            onAddNote={addNote}
            onDeleteNote={deleteNote}
            onAddRmRecord={addRmRecord}
            onRefreshStudent={refreshStudent}
            isWeekCompleted={isWeekCompleted(currentBlock.id, view.week)}
            onToggleWeekCompleted={() => toggleWeekCompleted(currentBlock.id, view.week)}
          />
        )}
      </main>
    </div>
  );
};

interface SessionsViewProps {
  student: Student;
  block: TrainingBlock;
  week: number;
  logs: ReturnType<typeof useExerciseLogs>["logs"];
  notes: ReturnType<typeof useSessionNotes>["notes"];
  onUpsertLog: ReturnType<typeof useExerciseLogs>["upsertLog"];
  onAddNote: ReturnType<typeof useSessionNotes>["addNote"];
  onDeleteNote: ReturnType<typeof useSessionNotes>["deleteNote"];
  onAddRmRecord: ReturnType<typeof useRmHistory>["addRecord"];
  isWeekCompleted: boolean;
  onToggleWeekCompleted: () => void;
  onRefreshStudent: () => Promise<void>;
}

function SessionsView({ student, block, week, logs, notes, onUpsertLog, onAddNote, onDeleteNote, onAddRmRecord, isWeekCompleted, onToggleWeekCompleted, onRefreshStudent }: SessionsViewProps) {
  const sessions = block.weekSessions?.[week] || block.sessions;
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [exerciseTags, setExerciseTags] = useState<Record<string, ("squat" | "bench" | "deadlift")[]>>({});
  const [exerciseDbIds, setExerciseDbIds] = useState<Record<string, string>>({});
  const [openRpePopover, setOpenRpePopover] = useState<string | null>(null);
  const [editConfirm, setEditConfirm] = useState<{ mode: "edit" | "clear"; sessionId: string; exerciseId: string; key: string; reps: number; rpe: number } | null>(null);
  const [unlockedEdits, setUnlockedEdits] = useState<Set<string>>(new Set());
  const weightInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const suppressBlurRef = useRef<Set<string>>(new Set());

  // Close RPE popover automatically when user scrolls (avoids stuck overlay on mobile)
  useEffect(() => {
    if (!openRpePopover) return;
    const handleScroll = () => setOpenRpePopover(null);
    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", handleScroll, { capture: true } as any);
  }, [openRpePopover]);

  // Fetch video URLs and RM tags for exercises by name (session exercise IDs are instance IDs, not DB IDs)
  useEffect(() => {
    const exerciseNames = sessions.flatMap(s => s.exercises.map(e => e.name));
    const uniqueNames = [...new Set(exerciseNames)];
    if (uniqueNames.length === 0) return;
    supabase
      .from("exercises")
      .select("id, name, video_url, is_squat_rm, is_bench_rm, is_deadlift_rm")
      .in("name", uniqueNames)
      .then(({ data }) => {
        if (data) {
          const dbByName: Record<string, {
            dbId: string;
            videoUrl?: string;
            tags: ("squat" | "bench" | "deadlift")[];
          }> = {};
          data.forEach((e: any) => {
            const tags: ("squat" | "bench" | "deadlift")[] = [];
            if (e.is_squat_rm) tags.push("squat");
            if (e.is_bench_rm) tags.push("bench");
            if (e.is_deadlift_rm) tags.push("deadlift");
            dbByName[e.name] = { dbId: e.id, videoUrl: e.video_url, tags };
          });
          const urls: Record<string, string> = {};
          const tagsMap: Record<string, ("squat" | "bench" | "deadlift")[]> = {};
          const dbIdMap: Record<string, string> = {};
          sessions.forEach(s => s.exercises.forEach(ex => {
            const info = dbByName[ex.name];
            if (info) {
              if (info.videoUrl) urls[ex.id] = info.videoUrl;
              if (info.tags.length > 0) tagsMap[ex.id] = info.tags;
              dbIdMap[ex.id] = info.dbId;
            }
          }));
          setVideoUrls(urls);
          setExerciseTags(tagsMap);
          setExerciseDbIds(dbIdMap);
        }
      });
  }, [sessions]);

  // Initialize weight inputs from existing logs
  useEffect(() => {
    const initial: Record<string, string> = {};
    logs.forEach(log => {
      if (log.blockId === block.id && log.weekNumber === week) {
        const key = `${log.sessionId}-${log.exerciseId}`;
        initial[key] = log.weight > 0 ? String(log.weight) : "";
      }
    });
    setWeightInputs(prev => ({ ...initial, ...prev }));
  }, [logs, block.id, week]);

  const getLog = (sessionId: string, exerciseId: string) =>
    logs.filter(l => l.blockId === block.id && l.weekNumber === week && l.sessionId === sessionId && l.exerciseId === exerciseId).at(-1);

  const getSessionNotes = (sessionId: string) =>
    notes.filter(n => n.blockId === block.id && n.weekNumber === week && n.sessionId === sessionId);

  const commitWeight = async (
    sessionId: string,
    exerciseId: string,
    weight: number,
    repsFromExercise?: number,
    rpeFromExercise?: number,
  ) => {
    const log = getLog(sessionId, exerciseId);
    try {
      await onUpsertLog({
        studentId: student.id,
        blockId: block.id,
        weekNumber: week,
        sessionId,
        exerciseId,
        weight,
        notes: log?.notes ?? null,
        completed: weight > 0,
        actualRpe: weight > 0 ? (log?.actualRpe ?? null) : null,
      });

      if (weight > 0) {
        const tags = exerciseTags[exerciseId] || [];
        const perceivedRpe = log?.actualRpe ?? rpeFromExercise ?? null;
        const tableRpe = perceivedRpe != null ? snapToTableRpe(perceivedRpe) : null;
        if (tags.length > 0 && tableRpe != null) {
          const reps = repsFromExercise || 1;
          for (const tag of tags) {
            const estimated1rm = calculate1RMFromRpe(tag, weight, reps, tableRpe);
            if (estimated1rm > 0) {
              try {
                await onAddRmRecord({
                  studentId: student.id,
                  exerciseId: exerciseDbIds[exerciseId] || exerciseId,
                  sbdType: tag,
                  weight,
                  reps,
                  estimated1rm,
                });
              } catch { /* silently fail rm record */ }
            }
          }
          await onRefreshStudent();
        }
      }

      if (weight === 0) {
        toast.success("Carga removida.");
      } else {
        toast.success(log && log.weight > 0 ? "Carga atualizada!" : "Carga registrada!");
      }
    } catch { toast.error("Erro ao salvar carga."); }
  };


  const handleSaveActualRpe = async (
    sessionId: string,
    exerciseId: string,
    rpe: number | null,
    repsFromExercise?: number,
  ) => {
    const key = `${sessionId}-${exerciseId}`;
    const existingLog = getLog(sessionId, exerciseId);
    const weight = Number(weightInputs[key]) || existingLog?.weight || 0;
    try {
      await onUpsertLog({
        studentId: student.id,
        blockId: block.id,
        weekNumber: week,
        sessionId,
        exerciseId,
        weight,
        notes: existingLog?.notes ?? null,
        completed: existingLog?.completed ?? false,
        actualRpe: rpe,
      });

      // Recalcula 1RM usando o RPE PERCEBIDO recém-marcado (auto-PR) para cada tag.
      const tags = exerciseTags[exerciseId] || [];
      const tableRpe = rpe != null ? snapToTableRpe(rpe) : null;
      if (tags.length > 0 && weight > 0 && tableRpe != null) {
        const reps = repsFromExercise || 1;
        for (const tag of tags) {
          const estimated1rm = calculate1RMFromRpe(tag, weight, reps, tableRpe);
          if (estimated1rm > 0) {
            try {
              await onAddRmRecord({
                studentId: student.id,
                exerciseId: exerciseDbIds[exerciseId] || exerciseId,
                sbdType: tag,
                weight,
                reps,
                estimated1rm,
              });
            } catch { /* silently */ }
          }
        }
        await onRefreshStudent();
      }

      toast.success(rpe === null ? "RPE removido!" : `RPE ${rpe} salvo!`);
    } catch { toast.error("Erro ao salvar RPE."); }
  };

  const handleSendNote = async (sessionId: string) => {
    const message = noteInputs[sessionId]?.trim();
    if (!message) return;
    if (message.length > 200) { toast.error("Máximo de 200 caracteres."); return; }
    const sessionNotes = getSessionNotes(sessionId);
    const studentNotes = sessionNotes.filter(n => n.sender === "student");
    if (studentNotes.length >= 2) { toast.error("Máximo de 2 mensagens por sessão."); return; }
    try {
      await onAddNote({
        studentId: student.id,
        blockId: block.id,
        weekNumber: week,
        sessionId,
        message,
        sender: "student",
      });
      setNoteInputs(prev => ({ ...prev, [sessionId]: "" }));
      toast.success("Mensagem enviada!");
    } catch { toast.error("Erro ao enviar mensagem."); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{block.name} — Semana {week}</h2>
      {sessions.map(session => (
        <Card key={session.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{session.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            {session.exercises.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem exercícios nesta sessão.</p>
            ) : (
              session.exercises.map(ex => {
                const log = getLog(session.id, ex.id);
                const key = `${session.id}-${ex.id}`;
                return (
                  <div key={ex.id} className={`p-3 rounded-lg border transition-colors ${log?.completed ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <span className={`font-medium text-sm break-words min-w-0 ${log?.completed ? "line-through text-muted-foreground" : ""}`}>
                          {ex.name}
                        </span>
                        {videoUrls[ex.id] && (
                          <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-6 sm:w-6 shrink-0" asChild>
                            <a href={videoUrls[ex.id]} target="_blank" rel="noopener noreferrer">
                              <Play className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-primary" />
                            </a>
                          </Button>
                        )}
                        {ex.isMainLift && <Badge variant="default" className="text-[10px]">Main</Badge>}
                        {(exerciseTags[ex.id]?.length ?? 0) > 0 && Number(ex.rpe) >= 6 && (
                          <Badge className="text-[10px] bg-amber-500/15 text-amber-600 border-amber-300 hover:bg-amber-500/20">1RM</Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground font-bold shrink-0 tabular-nums">
                        {ex.sets}x{ex.reps}
                        {ex.rpe && ` @RPE${ex.rpe}`}
                        {ex.percentage && ` ${ex.percentage}`}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="relative w-full">
                        <Weight className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          ref={(el) => { weightInputRefs.current[key] = el; }}
                          type="number"
                          inputMode="decimal"
                          placeholder="Carga (kg)"
                          className={`h-11 sm:h-9 text-base sm:text-sm pl-8 pr-9 w-full ${log && log.weight > 0 ? "border-green-500/60 focus-visible:ring-green-500/30" : ""}`}
                          value={weightInputs[key] || ""}
                          onChange={(e) => setWeightInputs(prev => ({ ...prev, [key]: e.target.value }))}
                          onFocus={(e) => {
                            if (log && log.weight > 0 && !unlockedEdits.has(key)) {
                              suppressBlurRef.current.add(key);
                              e.target.blur();
                              setEditConfirm({ mode: "edit", sessionId: session.id, exerciseId: ex.id, key, reps: Number(ex.reps) || 1, rpe: Number(ex.rpe) || 0 });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              (e.currentTarget as HTMLInputElement).blur();
                            }
                          }}
                          onBlur={() => {
                            if (suppressBlurRef.current.has(key)) {
                              suppressBlurRef.current.delete(key);
                              return;
                            }
                            const raw = (weightInputs[key] ?? "").trim();
                            const currentWeight = log?.weight ?? 0;
                            if (raw === "") {
                              if (currentWeight > 0) {
                                suppressBlurRef.current.add(key);
                                setEditConfirm({ mode: "clear", sessionId: session.id, exerciseId: ex.id, key, reps: Number(ex.reps) || 1, rpe: Number(ex.rpe) || 0 });
                              }
                              return;
                            }
                            const num = Number(raw);
                            if (!Number.isFinite(num) || num <= 0) return;
                            if (num === currentWeight) {
                              setUnlockedEdits(prev => { const n = new Set(prev); n.delete(key); return n; });
                              return;
                            }
                            commitWeight(session.id, ex.id, num, Number(ex.reps) || 1, Number(ex.rpe) || 0);
                            setUnlockedEdits(prev => { const n = new Set(prev); n.delete(key); return n; });
                          }}
                        />
                        {log && log.weight > 0 && (
                          <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" aria-label="Carga salva" />
                        )}
                      </div>
                      <Popover
                        open={openRpePopover === key}
                        onOpenChange={(open) => setOpenRpePopover(open ? key : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            size="sm"
                            variant={log?.actualRpe != null ? "default" : "outline"}
                            
                            className={`h-11 sm:h-9 w-full gap-1 text-sm ${log?.actualRpe != null ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500" : ""}`}
                          >
                            <Gauge className="h-4 w-4" />
                            {log?.actualRpe != null ? `RPE percebido: ${log.actualRpe}` : "RPE percebido"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[min(16rem,calc(100vw-1.5rem))] p-3"
                          align="center"
                          sideOffset={6}
                          collisionPadding={12}
                        >
                          <p className="text-xs font-medium mb-2">Como você sentiu? (RPE)</p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                            {[5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(v => (
                              <Button
                                key={v}
                                size="sm"
                                variant={log?.actualRpe === v ? "default" : "outline"}
                                className="h-11 sm:h-9 px-0 text-sm"
                                onClick={() => {
                                  handleSaveActualRpe(session.id, ex.id, v, Number(ex.reps) || 1);
                                  setOpenRpePopover(null);
                                }}
                              >
                                {v}
                              </Button>
                            ))}
                          </div>
                          {log?.actualRpe != null && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mt-2 h-9 text-xs text-muted-foreground"
                              onClick={() => {
                                handleSaveActualRpe(session.id, ex.id, null, Number(ex.reps) || 1);
                                setOpenRpePopover(null);
                              }}
                            >
                              Limpar RPE
                            </Button>
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>


                );
              })
            )}



            {/* Coach Messages */}
            {getSessionNotes(session.id).filter(n => n.sender === "coach").length > 0 && (
              <div className="border-t border-border pt-3 mt-3 space-y-2">
                <p className="text-xs font-medium text-primary flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Mensagens do treinador
                </p>
                {getSessionNotes(session.id).filter(n => n.sender === "coach").map(note => (
                  <div key={note.id} className="bg-primary/5 border border-primary/20 rounded-lg p-2 text-sm">
                    <p>{note.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(note.createdAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Student Notes */}
            <div className="border-t border-border pt-3 mt-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> Anotações para o treinador
              </p>
              {getSessionNotes(session.id).filter(n => n.sender === "student").map(note => (
                <div key={note.id} className="bg-muted/50 rounded-lg p-2 text-sm flex items-start justify-between gap-2">
                  <div>
                    <p>{note.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(note.createdAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={async () => {
                      try {
                        await onDeleteNote(note.id);
                        toast.success("Mensagem excluída!");
                      } catch { toast.error("Erro ao excluir mensagem."); }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {getSessionNotes(session.id).filter(n => n.sender === "student").length < 2 ? (
              <div className="space-y-1">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Deixe uma mensagem para o treinador..."
                    className="min-h-[60px] text-base sm:text-sm"
                    maxLength={200}
                    value={noteInputs[session.id] || ""}
                    onChange={(e) => setNoteInputs(prev => ({ ...prev, [session.id]: e.target.value }))}
                  />
                  <Button size="sm" className="min-h-11 sm:min-h-0 sm:h-auto px-3 shrink-0" onClick={() => handleSendNote(session.id)}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground text-right">
                  {(noteInputs[session.id] || "").length}/200 • {2 - getSessionNotes(session.id).filter(n => n.sender === "student").length} restante(s)
                </p>
              </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Limite de 2 mensagens por sessão atingido.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      <Button
        className={`w-full mt-4 gap-2 ${isWeekCompleted ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
        variant={isWeekCompleted ? "default" : "outline"}
        onClick={onToggleWeekCompleted}
      >
        <CheckCircle2 className="h-5 w-5" />
        {isWeekCompleted ? "Semana concluída ✓" : "Semana concluída"}
      </Button>

      <AlertDialog
        open={!!editConfirm}
        onOpenChange={(open) => {
          if (!open) {
            if (editConfirm) {
              const log = getLog(editConfirm.sessionId, editConfirm.exerciseId);
              setWeightInputs(prev => ({ ...prev, [editConfirm.key]: log && log.weight > 0 ? String(log.weight) : "" }));
              suppressBlurRef.current.delete(editConfirm.key);
            }
            setEditConfirm(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editConfirm?.mode === "clear" ? "Remover a carga registrada?" : "Alterar a carga deste exercício?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {editConfirm?.mode === "clear"
                ? "Você apagou o campo. Deseja remover a carga salva deste exercício?"
                : "Tem certeza que deseja alterar a carga registrada? A nova carga digitada substituirá a anterior."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                if (!editConfirm) return;
                const log = getLog(editConfirm.sessionId, editConfirm.exerciseId);
                setWeightInputs(prev => ({ ...prev, [editConfirm.key]: log && log.weight > 0 ? String(log.weight) : "" }));
                suppressBlurRef.current.delete(editConfirm.key);
                setEditConfirm(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!editConfirm) return;
                const ec = editConfirm;
                setEditConfirm(null);
                suppressBlurRef.current.delete(ec.key);
                if (ec.mode === "clear") {
                  setWeightInputs(prev => ({ ...prev, [ec.key]: "" }));
                  await commitWeight(ec.sessionId, ec.exerciseId, 0, ec.reps, ec.rpe);
                } else {
                  setUnlockedEdits(prev => new Set(prev).add(ec.key));
                  setTimeout(() => {
                    const el = weightInputRefs.current[ec.key];
                    if (el) { el.focus(); el.select(); }
                  }, 50);
                }
              }}
            >
              {editConfirm?.mode === "clear" ? "Sim, remover" : "Sim, alterar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

export default StudentDashboard;
