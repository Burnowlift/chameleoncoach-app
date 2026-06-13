import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, TrendingUp, LibraryBig, Pencil, Check, X } from "lucide-react";
import { DeleteWeekButton } from "@/components/DeleteWeekButton";
import { Input } from "@/components/ui/input";
import { WeekNotesCard } from "@/components/WeekNotesCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStudents } from "@/hooks/useStudents";
import { useTrainingBlocks } from "@/hooks/useTrainingBlocks";
import { useExerciseLogs } from "@/hooks/useExerciseLogs";
import { useWorkoutTemplates } from "@/hooks/useWorkoutTemplates";
import { supabase } from "@/integrations/supabase/client";
import { calculate1RM, snapToTableRpe, type LiftType } from "@/lib/rpe-tables";
import type { WorkoutSession } from "@/lib/mock-data";
import { toast } from "sonner";

const LIFT_SHORT: Record<LiftType, string> = { squat: "S", bench: "B", deadlift: "D" };
const LIFT_FULL: Record<LiftType, string> = {
  squat: "Agachamento",
  bench: "Supino",
  deadlift: "Levantamento Terra",
};
const RM_PANEL_CLASS = "mb-3 rounded-md border border-primary/30 bg-primary/10 p-3 shadow-sm";
const RM_LABEL_CLASS = "flex items-center gap-1.5 text-xs font-semibold text-primary mb-2";
const RM_BADGE_CLASS = "min-h-7 min-w-[4.75rem] justify-center rounded-md px-2.5 py-1 text-[13px] font-bold leading-none tabular-nums shadow-sm ring-1 ring-primary/25 whitespace-nowrap";
const SECTION_PANEL_CLASS = "rounded-md border border-border bg-muted/40 p-3 shadow-sm";
const SECTION_LABEL_CLASS = "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2";
const SESSION_BADGE_CLASS = "inline-flex items-center justify-center min-w-0 max-w-full min-h-7 w-full rounded-md border border-secondary-foreground/15 bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground shadow-sm whitespace-nowrap overflow-hidden";
const BADGE_GRID_CLASS = "grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5";
const BADGE_TEXT_CLASS = "block w-full truncate text-center";

const BlockWeeks = () => {
  const { studentId, blockId } = useParams();
  const navigate = useNavigate();
  const { students } = useStudents();
  const student = students.find((s) => s.id === studentId);
  const { blocks, loading, updateBlock } = useTrainingBlocks(studentId);
  const block = blocks.find((b) => b.id === blockId);
  const { logs } = useExerciseLogs(studentId, blockId);
  const { templates } = useWorkoutTemplates();
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [openTplDialog, setOpenTplDialog] = useState(false);
  const [selectedTplId, setSelectedTplId] = useState<string>("");
  const [importMode, setImportMode] = useState<"structure" | "repeat">("structure");
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [weekToClear, setWeekToClear] = useState<number | null>(null);

  const handleClearWeek = async (weekNum: number) => {
    if (!block) return;
    try {
      const baseSessions: WorkoutSession[] =
        (block.weekSessions?.[weekNum] as WorkoutSession[]) || block.sessions || [];
      const clearedSessions: WorkoutSession[] = baseSessions.map((s) => ({
        ...s,
        id: s.id || crypto.randomUUID(),
        exercises: [],
      }));
      const newWeekSessions: Record<number, WorkoutSession[]> = {
        ...(block.weekSessions || {}),
        [weekNum]: clearedSessions,
      };
      await updateBlock({ ...block, weekSessions: newWeekSessions });
      toast.success(`Exercícios da Semana ${weekNum} apagados. Anotações preservadas.`);
    } catch {
      toast.error("Erro ao apagar exercícios da semana.");
    } finally {
      setWeekToClear(null);
    }
  };

  const handleRenameSession = async (sessionId: string, newName: string) => {
    if (!block) return;
    const trimmed = newName.trim().slice(0, 60);
    if (!trimmed) { toast.error("Nome não pode ficar vazio."); return; }
    const idx = block.sessions.findIndex((s) => s.id === sessionId);
    if (idx < 0) return;
    const newSessions = block.sessions.map((s) => s.id === sessionId ? { ...s, name: trimmed } : s);
    const newWeekSessions: Record<number, WorkoutSession[]> = { ...(block.weekSessions || {}) };
    Object.keys(newWeekSessions).forEach((w) => {
      const wkArr = newWeekSessions[Number(w)];
      if (Array.isArray(wkArr) && wkArr[idx]) {
        newWeekSessions[Number(w)] = wkArr.map((s, i) => i === idx ? { ...s, name: trimmed } : s);
      }
    });
    try {
      await updateBlock({ ...block, sessions: newSessions, weekSessions: newWeekSessions });
      setRenamingSessionId(null);
      toast.success("Sessão renomeada!");
    } catch { toast.error("Erro ao renomear sessão."); }
  };

  const selectedTpl = templates.find((t) => t.id === selectedTplId);

  const handleApplyTemplate = async () => {
    if (!block || !selectedTpl) return;
    setLoadingTemplate(true);
    try {
      const tplWeekSessions = selectedTpl.weekSessions || {};
      const tplWeek1 = tplWeekSessions[1] || selectedTpl.sessions || [];

      if (importMode === "structure" && selectedTpl.duration > 1) {
        // Aplica a estrutura completa do template ajustando o bloco
        const newWeekSessions: Record<number, WorkoutSession[]> = {};
        for (let w = 1; w <= selectedTpl.duration; w++) {
          const src = tplWeekSessions[w] || tplWeek1;
          newWeekSessions[w] = structuredClone(src).map((s) => ({
            ...s,
            id: crypto.randomUUID(),
            exercises: s.exercises.map((e) => ({ ...e, id: crypto.randomUUID() })),
          }));
        }
        await updateBlock({
          ...block,
          duration: selectedTpl.duration,
          frequency: selectedTpl.frequency,
          weekSessions: newWeekSessions,
        });
        toast.success(`Template "${selectedTpl.templateName}" aplicado (${selectedTpl.duration} semanas)!`);
      } else {
        // Repete a primeira semana do template em todas as semanas atuais do bloco
        const newWeekSessions: Record<number, WorkoutSession[]> = { ...(block.weekSessions || {}) };
        for (let w = 1; w <= block.duration; w++) {
          newWeekSessions[w] = structuredClone(tplWeek1).map((s) => ({
            ...s,
            id: crypto.randomUUID(),
            exercises: s.exercises.map((e) => ({ ...e, id: crypto.randomUUID() })),
          }));
        }
        await updateBlock({ ...block, weekSessions: newWeekSessions });
        toast.success(`Template "${selectedTpl.templateName}" aplicado em todas as ${block.duration} semanas!`);
      }
      setOpenTplDialog(false);
      setSelectedTplId("");
    } catch {
      toast.error("Erro ao carregar template.");
    } finally {
      setLoadingTemplate(false);
    }
  };

  // exerciseName -> SBD tags
  const [tagsByName, setTagsByName] = useState<Record<string, LiftType[]>>({});

  const allExerciseNames = useMemo(() => {
    if (!block) return [];
    const names = new Set<string>();
    const collect = (sess: WorkoutSession[] | undefined) => {
      sess?.forEach((s) => s.exercises.forEach((e) => names.add(e.name)));
    };
    collect(block.sessions);
    if (block.weekSessions) Object.values(block.weekSessions).forEach((arr: any) => collect(arr));
    return [...names];
  }, [block]);

  useEffect(() => {
    if (allExerciseNames.length === 0) { setTagsByName({}); return; }
    supabase
      .from("exercises")
      .select("name, is_squat_rm, is_bench_rm, is_deadlift_rm")
      .in("name", allExerciseNames)
      .then(({ data }) => {
        if (!data) return;
        const m: Record<string, LiftType[]> = {};
        data.forEach((e: any) => {
          const t: LiftType[] = [];
          if (e.is_squat_rm) t.push("squat");
          if (e.is_bench_rm) t.push("bench");
          if (e.is_deadlift_rm) t.push("deadlift");
          if (t.length) m[e.name] = t;
        });
        setTagsByName(m);
      });
  }, [allExerciseNames.join("|")]);

  // Map weekNumber -> { lift -> bestEstimated1rm }
  const bestByWeek = useMemo(() => {
    const out: Record<number, Partial<Record<LiftType, number>>> = {};
    if (!block) return out;
    for (let w = 1; w <= block.duration; w++) {
      const weekSess: WorkoutSession[] = (block.weekSessions?.[w] as any) || block.sessions;
      // Build map exerciseId -> { name, reps, rpe }
      const exMeta: Record<string, { name: string; reps: number; rpe: number | null }> = {};
      weekSess?.forEach((s) =>
        s.exercises.forEach((e) => {
          const repsNum = parseInt(String(e.reps).replace(/[^0-9]/g, ""), 10);
          const rpeNum = e.rpe ? Number(String(e.rpe).replace(",", ".")) : NaN;
          exMeta[e.id] = {
            name: e.name,
            reps: Number.isFinite(repsNum) && repsNum > 0 ? repsNum : 1,
            rpe: Number.isFinite(rpeNum) ? rpeNum : null,
          };
        })
      );

      const weekLogs = logs.filter((l) => l.weekNumber === w && l.completed && l.weight > 0);
      for (const log of weekLogs) {
        const meta = exMeta[log.exerciseId];
        if (!meta) continue;
        const tags = tagsByName[meta.name];
        if (!tags || tags.length === 0) continue;
        const perceived = log.actualRpe ?? meta.rpe;
        if (perceived == null) continue;
        const tableRpe = snapToTableRpe(perceived);
        if (tableRpe == null) continue;
        for (const lift of tags) {
          const est = calculate1RM(lift, log.weight, meta.reps, tableRpe);
          if (est <= 0) continue;
          const cur = out[w]?.[lift] ?? 0;
          if (est > cur) {
            out[w] = { ...(out[w] || {}), [lift]: est };
          }
        }
      }
    }
    return out;
  }, [block, logs, tagsByName]);

  if (!loading && (!student || !block)) {
    return (
      <CoachLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Bloco não encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(`/students/${studentId}/workout`)}>Voltar</Button>
        </div>
      </CoachLayout>
    );
  }

  if (loading || !block || !student) {
    return (
      <CoachLayout>
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      </CoachLayout>
    );
  }

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/students/${studentId}/workout`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{block.name}</h1>
              <p className="text-sm text-muted-foreground">
                {student.name} · {block.frequency}x por semana · {block.duration} semanas
              </p>
            </div>
          </div>
          <Button
            variant="default"
            className="gap-2 w-full sm:w-auto"
            onClick={() => setOpenTplDialog(true)}
            disabled={loadingTemplate || templates.length === 0}
            title={templates.length === 0 ? "Nenhum template disponível" : "Carregar Template"}
          >
            <LibraryBig className="h-4 w-4" />
            {loadingTemplate ? "Carregando..." : "Carregar Template"}
          </Button>
        </div>

        <h2 className="text-lg font-semibold">Semanas</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: block.duration }, (_, i) => {
            const weekNum = i + 1;
            const best = bestByWeek[weekNum] || {};
            const hasAny = (["squat", "bench", "deadlift"] as LiftType[]).some((l) => best[l]);
            return (
              <Card key={i} className="hover:border-primary/30 transition-colors cursor-pointer group"
                onClick={() => navigate(`/students/${studentId}/workout/${blockId}/week/${weekNum}`)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" /> Semana {weekNum}
                    </CardTitle>
                    <DeleteWeekButton weekNum={weekNum} onRequestDelete={setWeekToClear} />
                  </div>
                </CardHeader>

                <CardContent>
                  {hasAny && (
                    <div className={RM_PANEL_CLASS}>
                      <div className={RM_LABEL_CLASS}>
                        <TrendingUp className="h-3 w-3" />
                        <span>Melhor 1RM estimada</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(["squat", "bench", "deadlift"] as LiftType[]).map((lift) => {
                          const v = best[lift];
                          if (!v) return null;
                          return (
                            <Badge
                              key={lift}
                              variant="default"
                              className={RM_BADGE_CLASS}
                              title={LIFT_FULL[lift]}
                            >
                              {LIFT_SHORT[lift]} {v} kg
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className={SECTION_PANEL_CLASS}>
                    <div className={SECTION_LABEL_CLASS}>Sessões</div>
                    <div className={BADGE_GRID_CLASS}>
                      {block.sessions.map((session) => (
                        renamingSessionId === session.id ? (
                          <div key={session.id} className="flex items-center gap-1 col-span-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              autoFocus
                              value={renameDraft}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameSession(session.id, renameDraft);
                                if (e.key === "Escape") setRenamingSessionId(null);
                              }}
                              maxLength={60}
                              className="h-7 text-xs px-2"
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-primary"
                              onClick={() => handleRenameSession(session.id, renameDraft)} title="Salvar">
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground"
                              onClick={() => setRenamingSessionId(null)} title="Cancelar">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div key={session.id} className="flex items-center gap-1 min-w-0">
                            <Badge variant="secondary" className={SESSION_BADGE_CLASS} title={session.name}>
                              <span className={BADGE_TEXT_CLASS}>{session.name}</span>
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary"
                              onClick={(e) => { e.stopPropagation(); setRenamingSessionId(session.id); setRenameDraft(session.name); }}
                              title="Renomear sessão">
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        )
                      ))}
                    </div>
                  </div>

                  {blockId && studentId && (
                    <WeekNotesCard blockId={blockId} studentId={studentId} weekNumber={weekNum} />
                  )}

                  <p className="text-xs text-muted-foreground mt-2">Clique para editar as sessões</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={openTplDialog} onOpenChange={setOpenTplDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Carregar Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum template disponível. Crie um em "Biblioteca de Templates".</p>
            ) : (
              <>
                <Select value={selectedTplId} onValueChange={setSelectedTplId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.templateName}{t.category ? ` · ${t.category}` : ""} ({t.duration}sem · {t.frequency}x)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedTpl && selectedTpl.duration > 1 && (
                  <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Modo de importação</p>
                    <label className="flex items-start gap-2 text-sm cursor-pointer">
                      <input type="radio" className="mt-1" checked={importMode === "structure"} onChange={() => setImportMode("structure")} />
                      <span>
                        <strong>Manter estrutura do template</strong>
                        <span className="block text-xs text-muted-foreground">
                          Ajusta o bloco para {selectedTpl.duration} semanas, {selectedTpl.frequency}x por semana.
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 text-sm cursor-pointer">
                      <input type="radio" className="mt-1" checked={importMode === "repeat"} onChange={() => setImportMode("repeat")} />
                      <span>
                        <strong>Repetir Semana 1</strong>
                        <span className="block text-xs text-muted-foreground">
                          Mantém as {block.duration} semanas atuais, replicando a Semana 1 do template em todas.
                        </span>
                      </span>
                    </label>
                  </div>
                )}

                {selectedTpl && selectedTpl.duration === 1 && (
                  <p className="text-xs text-muted-foreground">
                    Esse template tem 1 semana e será replicado nas {block.duration} semanas do bloco.
                  </p>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTplDialog(false)}>Cancelar</Button>
            <Button disabled={!selectedTplId || loadingTemplate} onClick={handleApplyTemplate}>
              {loadingTemplate ? "Aplicando..." : "Aplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={weekToClear !== null} onOpenChange={(o) => !o && setWeekToClear(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar exercícios da Semana {weekToClear}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar os exercícios desta semana? As anotações da semana serão mantidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => weekToClear !== null && handleClearWeek(weekToClear)}
            >
              Apagar exercícios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CoachLayout>
  );
};

export default BlockWeeks;
