import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Trash2, Copy, Pencil, ChevronUp, ChevronDown } from "lucide-react";
import { type WorkoutExercise, type WorkoutSession } from "@/lib/mock-data";
import { useExercises } from "@/hooks/useExercises";
import { useWorkoutTemplates } from "@/hooks/useWorkoutTemplates";
import { toast } from "sonner";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { SortableSessionCard } from "@/components/SortableSessionCard";

const MUSCLE_ABBREV: Record<string, string> = {
  "Peito": "P", "Costas": "C", "Ombro": "O", "Bíceps": "B", "Tríceps": "T",
  "Quadríceps": "Q", "Posterior": "Pos", "Glúteo": "G", "Panturrilha": "PAN",
  "Abdômen": "AB", "Core": "Co",
};

const BADGE_BASE_CLASS = "inline-flex items-center justify-center min-w-0 max-w-full min-h-7 w-full rounded-md px-2.5 py-1 text-xs font-bold shadow-sm tabular-nums whitespace-nowrap overflow-hidden border";
const BADGE_GRID_CLASS = "grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5";
const BADGE_TEXT_CLASS = "block w-full truncate text-center";

const SBD_PANEL_CLASS = "rounded-md border border-blue-500/40 bg-blue-500/15 p-3 shadow-sm";
const SBD_LABEL_CLASS = "inline-flex items-center gap-1.5 font-extrabold uppercase tracking-wider mb-2 text-[#0049db] text-xs bg-white w-fit px-2 py-1 rounded shadow-sm ring-1 ring-blue-500/30";
const SBD_VOLUME_BADGE_CLASS = `${BADGE_BASE_CLASS} border-blue-700 bg-blue-800 text-blue-50`;

const AUX_PANEL_CLASS = "rounded-md border border-purple-500/40 bg-purple-500/15 p-3 shadow-sm";
const AUX_LABEL_CLASS = "inline-flex items-center gap-1.5 font-extrabold uppercase tracking-wider mb-2 text-[#47008f] text-xs bg-white w-fit px-2 py-1 rounded shadow-sm ring-1 ring-purple-500/30";
const AUX_BADGE_CLASS = `${BADGE_BASE_CLASS} border-purple-400/40 bg-purple-500/25 text-purple-50 font-semibold`;

const TemplateSessions = () => {
  const { templateId, weekNumber } = useParams();
  const navigate = useNavigate();
  const currentWeek = Number(weekNumber) || 1;

  const { templates, loading, update } = useWorkoutTemplates();
  const template = templates.find((t) => t.id === templateId);

  const [openCopy, setOpenCopy] = useState(false);
  const [copyFromWeek, setCopyFromWeek] = useState("");

  const [openExercise, setOpenExercise] = useState(false);
  const [savingExercise, setSavingExercise] = useState(false);
  const lastSaveAtRef = useRef(0);
  const [targetSessionId, setTargetSessionId] = useState<string | null>(null);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<{ sessionId: string; exerciseId: string; name: string } | null>(null);
  const [deletingExercise, setDeletingExercise] = useState(false);
  const [exName, setExName] = useState("");
  const [exSets, setExSets] = useState("");
  const [exReps, setExReps] = useState("");
  const [exRpe, setExRpe] = useState("");
  const [exPercentage, setExPercentage] = useState("");
  const [exIsMain, setExIsMain] = useState(false);

  const { exercises: exerciseDB } = useExercises();
  const getDBInfo = (name: string) => exerciseDB.find(e => e.name.toLowerCase() === name.toLowerCase());

  const calcSessionVolume = (session: WorkoutSession) => {
    const sbdVolume: Record<string, number> = {};
    const muscleVolume: Record<string, number> = {};
    session.exercises.forEach((ex) => {
      const dbInfo = getDBInfo(ex.name);
      if (dbInfo) {
        const sbd = dbInfo.muscleGroup3 === "S" ? "squat" : dbInfo.muscleGroup3 === "B" ? "bench" : dbInfo.muscleGroup3 === "D" ? "deadlift" : null;
        if (sbd) sbdVolume[sbd] = (sbdVolume[sbd] || 0) + ex.sets;
        [dbInfo.muscleGroup, dbInfo.muscleGroup2].forEach((mg) => {
          if (mg) muscleVolume[mg] = (muscleVolume[mg] || 0) + ex.sets;
        });
      }
    });
    return { sbdVolume, muscleVolume };
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );


  const sessions = template?.weekSessions?.[currentWeek] || template?.sessions || [];

  const persist = async (newSessions: WorkoutSession[]) => {
    if (!template) return;
    const newWeekSessions = { ...template.weekSessions, [currentWeek]: newSessions };
    await update(template.id, {
      templateName: template.templateName,
      category: template.category,
      frequency: template.frequency,
      duration: template.duration,
      sessions: template.sessions,
      weekSessions: newWeekSessions,
    });
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

  const resetExerciseForm = () => {
    setExName(""); setExSets(""); setExReps(""); setExRpe(""); setExPercentage(""); setExIsMain(false);
    setEditingExerciseId(null);
    setOpenExercise(false);
  };

  const handleSaveExercise = async () => {
    const now = Date.now();
    if (now - lastSaveAtRef.current < 600) return;
    lastSaveAtRef.current = now;
    if (savingExercise) return;
    if (!exName.trim() || !exSets.trim() || !exReps.trim() || !targetSessionId) {
      toast.error("Preencha nome, séries e repetições."); return;
    }
    const dbMatch = exerciseDB.find(e => e.name.toLowerCase() === exName.trim().toLowerCase());
    if (!dbMatch) { toast.error("Selecione um exercício do banco de dados."); return; }

    setSavingExercise(true);
    try {
      let newSessions: WorkoutSession[];
      if (editingExerciseId) {
        newSessions = sessions.map(s =>
          s.id === targetSessionId
            ? { ...s, exercises: s.exercises.map(e => e.id === editingExerciseId
                ? { ...e, name: exName.trim(), sets: Number(exSets) || 1, reps: exReps.trim(), rpe: exRpe && exRpe !== "none" ? exRpe : undefined, percentage: exPercentage.trim() || undefined, isMainLift: exIsMain }
                : e) }
            : s
        );
      } else {
        const newExercise: WorkoutExercise = {
          id: crypto.randomUUID(), name: exName.trim().slice(0, 100),
          sets: Number(exSets) || 1, reps: exReps.trim(),
          rpe: exRpe && exRpe !== "none" ? exRpe : undefined,
          percentage: exPercentage.trim() || undefined, isMainLift: exIsMain,
        };
        newSessions = sessions.map(s => s.id === targetSessionId ? { ...s, exercises: [...s.exercises, newExercise] } : s);
      }
      await persist(newSessions);
      resetExerciseForm();
      toast.success(editingExerciseId ? "Exercício atualizado!" : "Exercício adicionado!");
    } catch {
      toast.error("Erro ao salvar exercício.");
    } finally {
      setSavingExercise(false);
    }
  };

  const handleDeleteExercise = async (sessionId: string, exerciseId: string) => {
    const newSessions = sessions.map(s => s.id === sessionId ? { ...s, exercises: s.exercises.filter(e => e.id !== exerciseId) } : s);
    try { await persist(newSessions); } catch { toast.error("Erro ao remover exercício."); }
  };

  const handleMoveExercise = async (sessionId: string, exerciseId: string, direction: -1 | 1) => {
    const newSessions = sessions.map(s => {
      if (s.id !== sessionId) return s;
      const idx = s.exercises.findIndex(e => e.id === exerciseId);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= s.exercises.length) return s;
      const arr = [...s.exercises];
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return { ...s, exercises: arr };
    });
    try { await persist(newSessions); } catch { toast.error("Erro ao reordenar."); }
  };

  const handleMoveSession = async (sessionId: string, direction: -1 | 1) => {
    const idx = sessions.findIndex(s => s.id === sessionId);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= sessions.length) return;
    const arr = arrayMove(sessions, idx, target);
    try { await persist(arr); } catch { toast.error("Erro ao reordenar sessão."); }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sessions.findIndex(s => s.id === active.id);
    const newIdx = sessions.findIndex(s => s.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const arr = arrayMove(sessions, oldIdx, newIdx);
    try { await persist(arr); } catch { toast.error("Erro ao reordenar sessão."); }
  };

  const handleRenameSession = async (sessionId: string, newName: string) => {
    const newSessions = sessions.map(s => s.id === sessionId ? { ...s, name: newName } : s);
    try { await persist(newSessions); } catch { toast.error("Erro ao renomear."); }
  };

  const handleCopyFromWeek = async () => {
    const sourceWeek = Number(copyFromWeek);
    if (!sourceWeek || sourceWeek === currentWeek) return;
    const sourceSessions = template.weekSessions?.[sourceWeek];
    if (!sourceSessions) { toast.error("Semana de origem não encontrada."); return; }
    const copied = sourceSessions.map(s => ({
      ...s, id: crypto.randomUUID(),
      exercises: s.exercises.map(e => ({ ...e, id: crypto.randomUUID() })),
    }));
    try {
      await persist(copied);
      setOpenCopy(false); setCopyFromWeek("");
      toast.success(`Sessões copiadas da Semana ${sourceWeek}!`);
    } catch { toast.error("Erro ao copiar."); }
  };

  const otherWeeks = Array.from({ length: template?.duration ?? 0 }, (_, i) => i + 1).filter(w => w !== currentWeek);

  if (loading) {
    return <CoachLayout><p className="text-center text-muted-foreground py-8">Carregando...</p></CoachLayout>;
  }
  if (!template) {
    return (
      <CoachLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Template não encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/templates")}>Voltar</Button>
        </div>
      </CoachLayout>
    );
  }

  return (
    <CoachLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/templates/${templateId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{template.templateName} — Semana {currentWeek}</h1>
              <p className="text-sm text-muted-foreground">Template · {template.frequency}x por semana</p>
            </div>
          </div>
          {otherWeeks.length > 0 && (
            <Button variant="outline" className="gap-2" onClick={() => setOpenCopy(true)}>
              <Copy className="h-4 w-4" /> Copiar de outra semana
            </Button>
          )}
        </div>

        {sessions.length > 0 && (() => {
          const weekSbd: Record<string, number> = {};
          const weekMuscle: Record<string, number> = {};
          sessions.forEach(s => {
            const { sbdVolume, muscleVolume } = calcSessionVolume(s);
            Object.entries(sbdVolume).forEach(([k, v]) => { weekSbd[k] = (weekSbd[k] || 0) + v; });
            Object.entries(muscleVolume).forEach(([m, v]) => { weekMuscle[m] = (weekMuscle[m] || 0) + v; });
          });
          const hasSbd = Object.values(weekSbd).some(v => v > 0);
          const muscleEntries = Object.entries(weekMuscle).sort((a, b) => b[1] - a[1]);
          if (!hasSbd && muscleEntries.length === 0) return null;
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hasSbd && (
                <div className={SBD_PANEL_CLASS}>
                  <div className={SBD_LABEL_CLASS}>SBD Volume — Semana {currentWeek}</div>
                  <div className={BADGE_GRID_CLASS}>
                    {weekSbd.squat > 0 && <Badge variant="secondary" className={SBD_VOLUME_BADGE_CLASS} title={`Agachamento: ${weekSbd.squat} séries`}><span className={BADGE_TEXT_CLASS}>SQ: {weekSbd.squat} séries</span></Badge>}
                    {weekSbd.bench > 0 && <Badge variant="secondary" className={SBD_VOLUME_BADGE_CLASS} title={`Supino: ${weekSbd.bench} séries`}><span className={BADGE_TEXT_CLASS}>BP: {weekSbd.bench} séries</span></Badge>}
                    {weekSbd.deadlift > 0 && <Badge variant="secondary" className={SBD_VOLUME_BADGE_CLASS} title={`Levantamento Terra: ${weekSbd.deadlift} séries`}><span className={BADGE_TEXT_CLASS}>DL: {weekSbd.deadlift} séries</span></Badge>}
                  </div>
                </div>
              )}
              {muscleEntries.length > 0 && (
                <div className={AUX_PANEL_CLASS}>
                  <div className={AUX_LABEL_CLASS}>Volume Auxiliares</div>
                  <div className={BADGE_GRID_CLASS}>
                    {muscleEntries.map(([m, sets]) => (
                      <Badge key={m} variant="secondary" className={AUX_BADGE_CLASS} title={`${m}: ${sets} séries`}>
                        <span className={BADGE_TEXT_CLASS}>{m}: {sets}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sessions.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {sessions.map((session, sIdx) => (
                <SortableSessionCard key={session.id} id={session.id}>
                  {({ dragHandle }) => (
                    <Card className="hover:border-primary/30 transition-colors">
                      <CardHeader className="pb-3 flex flex-row items-center gap-2 space-y-0">
                        {dragHandle}
                        <Input
                          value={session.name}
                          onChange={(e) => handleRenameSession(session.id, e.target.value)}
                          className="h-8 text-base font-semibold flex-1"
                          maxLength={50}
                        />
                        <div className="flex h-8 w-16 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-background">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" disabled={sIdx === 0} onClick={() => handleMoveSession(session.id, -1)} title="Mover sessão para cima"><ChevronUp className="h-4 w-4" /></Button>
                          <div className="h-5 w-px bg-border" />
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none" disabled={sIdx === sessions.length - 1} onClick={() => handleMoveSession(session.id, 1)} title="Mover sessão para baixo"><ChevronDown className="h-4 w-4" /></Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {session.exercises.length === 0 && (
                          <p className="text-xs text-muted-foreground py-2">Nenhum exercício adicionado.</p>
                        )}
                        {session.exercises.map((exercise, idx) => (
                          <div key={exercise.id}
                            className={`p-2 rounded-md text-sm grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 ${exercise.isMainLift ? "bg-primary/10 border border-primary/20" : "bg-muted/50"}`}>
                            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                              {exercise.isMainLift && <Badge variant="default" className="text-[10px] px-1.5 py-0">Main</Badge>}
                              <span className="font-medium truncate">{exercise.name}</span>
                            </div>
                            <div className="flex items-center justify-end gap-2 shrink-0">
                              <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
                                {exercise.sets}x{exercise.reps}{exercise.rpe && ` @RPE${exercise.rpe}`}{exercise.percentage && ` ${exercise.percentage}`}
                              </span>
                              <div className="flex h-8 w-16 items-center justify-center rounded-md border border-primary/30 bg-background">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" disabled={idx === 0} onClick={() => handleMoveExercise(session.id, exercise.id, -1)}><ChevronUp className="h-4 w-4" /></Button>
                                <div className="h-5 w-px bg-border" />
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none" disabled={idx === session.exercises.length - 1} onClick={() => handleMoveExercise(session.id, exercise.id, 1)}><ChevronDown className="h-4 w-4" /></Button>
                              </div>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditExercise(session.id, exercise)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setExerciseToDelete({ sessionId: session.id, exerciseId: exercise.id, name: exercise.name })}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="w-full mt-2 gap-1 text-xs"
                          onClick={() => { setTargetSessionId(session.id); setEditingExerciseId(null); setExName(""); setExSets(""); setExReps(""); setExRpe(""); setExPercentage(""); setExIsMain(false); setOpenExercise(true); }}>
                          <Plus className="h-3.5 w-3.5" /> Adicionar Exercício
                        </Button>
                        {(() => {
                          const { sbdVolume, muscleVolume } = calcSessionVolume(session);
                          const hasMuscle = Object.keys(muscleVolume).length > 0;
                          const hasSbd = Object.values(sbdVolume).some(v => v > 0);
                          if (!hasMuscle && !hasSbd) return null;
                          return (
                            <div className="pt-1 space-y-1">
                              {hasMuscle && (
                                <div className="flex flex-wrap gap-1 text-[10px]">
                                  {Object.entries(MUSCLE_ABBREV).map(([full, abbr]) => {
                                    const val = muscleVolume[full];
                                    if (!val) return null;
                                    return <Badge key={full} variant="secondary" className="text-[9px] py-0 px-1 font-mono">{abbr}: {val}</Badge>;
                                  })}
                                </div>
                              )}
                              {hasSbd && (
                                <div className="flex flex-wrap gap-1 text-[10px]">
                                  {sbdVolume.squat > 0 && <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">SQ: {sbdVolume.squat}</Badge>}
                                  {sbdVolume.bench > 0 && <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">BP: {sbdVolume.bench}</Badge>}
                                  {sbdVolume.deadlift > 0 && <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">DL: {sbdVolume.deadlift}</Badge>}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </SortableSessionCard>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      <Dialog open={openCopy} onOpenChange={setOpenCopy}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Copiar de outra semana</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Copiar sessões para a Semana {currentWeek}.</p>
            <Select value={copyFromWeek} onValueChange={setCopyFromWeek}>
              <SelectTrigger><SelectValue placeholder="Selecione a semana" /></SelectTrigger>
              <SelectContent>
                {otherWeeks.map(w => <SelectItem key={w} value={String(w)}>Semana {w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCopy(false)}>Cancelar</Button>
            <Button onClick={handleCopyFromWeek} disabled={!copyFromWeek}>Copiar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    <Badge key={e.id} variant="outline" className="cursor-pointer text-xs hover:bg-primary/10" onClick={() => setExName(e.name)}>{e.name}</Badge>
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
              <div className="space-y-2"><Label>Séries</Label><Input type="number" placeholder="4" value={exSets} onChange={(e) => setExSets(e.target.value)} min={1} /></div>
              <div className="space-y-2"><Label>Repetições</Label><Input placeholder="8" value={exReps} onChange={(e) => setExReps(e.target.value)} maxLength={20} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>RPE (opcional)</Label>
                <Select value={exRpe} onValueChange={setExRpe}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {Array.from({ length: 10 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>% 1RM (opcional)</Label><Input placeholder="75%" value={exPercentage} onChange={(e) => setExPercentage(e.target.value)} maxLength={10} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetExerciseForm} disabled={savingExercise}>Cancelar</Button>
            <Button onClick={handleSaveExercise} disabled={savingExercise}>{savingExercise ? "Salvando..." : (editingExerciseId ? "Salvar" : "Adicionar")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!exerciseToDelete} onOpenChange={(open) => { if (!open && !deletingExercise) setExerciseToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir exercício?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja remover &quot;{exerciseToDelete?.name}&quot;?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingExercise}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deletingExercise}
              onClick={async (e) => {
                e.preventDefault();
                if (!exerciseToDelete) return;
                setDeletingExercise(true);
                try { await handleDeleteExercise(exerciseToDelete.sessionId, exerciseToDelete.exerciseId); setExerciseToDelete(null); }
                finally { setDeletingExercise(false); }
              }}>
              {deletingExercise ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CoachLayout>
  );
};

export default TemplateSessions;
