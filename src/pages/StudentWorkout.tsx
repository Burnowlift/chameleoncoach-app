import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Dumbbell, TrendingUp, LibraryBig } from "lucide-react";
import { type TrainingBlock, type WorkoutExercise, type WorkoutSession } from "@/lib/mock-data";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useStudents } from "@/hooks/useStudents";
import { useTrainingBlocks } from "@/hooks/useTrainingBlocks";
import { useExerciseLogs } from "@/hooks/useExerciseLogs";
import { useWorkoutTemplates } from "@/hooks/useWorkoutTemplates";
import { supabase } from "@/integrations/supabase/client";
import { computeBestByWeek, pickBestWeek } from "@/lib/best-week";
import { type LiftType } from "@/lib/rpe-tables";
import { sbdTotal, formatKg } from "@/lib/utils";

const sessionLabels = ["Sessão 1", "Sessão 2", "Sessão 3", "Sessão 4", "Sessão 5", "Sessão 6"];

const LIFT_SHORT: Record<LiftType, string> = { squat: "S", bench: "B", deadlift: "D" };
const LIFT_FULL: Record<LiftType, string> = { squat: "Agachamento", bench: "Supino", deadlift: "Levantamento Terra" };
const RM_PANEL_CLASS = "rounded-md border border-primary/30 bg-primary/10 p-3 shadow-sm";
const RM_LABEL_CLASS = "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary mb-2";
const RM_GRID_CLASS = "grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5";
const RM_BADGE_CLASS = "inline-flex items-center justify-center min-w-0 max-w-full min-h-7 w-full rounded-md px-2.5 py-1 text-[13px] font-bold leading-none tabular-nums shadow-sm ring-1 ring-primary/25 whitespace-nowrap overflow-hidden";
const RM_BADGE_TEXT_CLASS = "block w-full truncate text-center";

const StudentWorkout = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { students } = useStudents();
  const student = students.find((s) => s.id === studentId);
  const { blocks, loading, error, createBlock, deleteBlock } = useTrainingBlocks(studentId);
  const { logs } = useExerciseLogs(studentId);

  const allExerciseNames = useMemo(() => {
    const names = new Set<string>();
    const collect = (sess: WorkoutSession[] | undefined) => {
      sess?.forEach((s) => s.exercises.forEach((e) => names.add(e.name)));
    };
    blocks.forEach((b) => {
      collect(b.sessions);
      if (b.weekSessions) Object.values(b.weekSessions).forEach((arr: any) => collect(arr));
    });
    return [...names];
  }, [blocks]);

  const [tagsByName, setTagsByName] = useState<Record<string, LiftType[]>>({});
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

  const bestByBlock = useMemo(() => {
    const out: Record<string, ReturnType<typeof pickBestWeek>> = {};
    blocks.forEach((b) => {
      out[b.id] = pickBestWeek(computeBestByWeek(b, logs, tagsByName));
    });
    return out;
  }, [blocks, logs, tagsByName]);

  const [openBlock, setOpenBlock] = useState(false);
  const [blockName, setBlockName] = useState("");
  const [blockFrequency, setBlockFrequency] = useState("3");
  const [blockDuration, setBlockDuration] = useState("4");
  const [deleteBlockId, setDeleteBlockId] = useState<string | null>(null);

  const { templates } = useWorkoutTemplates();
  const [openTpl, setOpenTpl] = useState(false);
  const [tplId, setTplId] = useState("");
  const [tplBlockName, setTplBlockName] = useState("");
  const [tplDuration, setTplDuration] = useState("4");
  const [creatingTpl, setCreatingTpl] = useState(false);

  const handleCreateFromTemplate = async () => {
    const tpl = templates.find(t => t.id === tplId);
    if (!tpl) { toast.error("Selecione um template."); return; }
    if (!tplBlockName.trim()) { toast.error("Informe o nome do bloco."); return; }
    const dur = Number(tplDuration) || 4;
    const baseSessions: WorkoutSession[] = structuredClone(tpl.sessions).map(s => ({
      ...s, id: crypto.randomUUID(),
      exercises: s.exercises.map(e => ({ ...e, id: crypto.randomUUID() })),
    }));
    const weekSessions: Record<number, WorkoutSession[]> = {};
    for (let w = 1; w <= dur; w++) {
      weekSessions[w] = structuredClone(tpl.sessions).map(s => ({
        ...s, id: crypto.randomUUID(),
        exercises: s.exercises.map(e => ({ ...e, id: crypto.randomUUID() })),
      }));
    }
    const newBlock: TrainingBlock = {
      id: crypto.randomUUID(),
      name: tplBlockName.trim().slice(0, 100),
      frequency: tpl.sessions.length || 1,
      duration: dur,
      sessions: baseSessions,
      weekSessions,
    };
    setCreatingTpl(true);
    try {
      await createBlock(newBlock);
      toast.success(`Bloco criado a partir de "${tpl.templateName}"!`);
      setOpenTpl(false); setTplId(""); setTplBlockName(""); setTplDuration("4");
    } catch { toast.error("Erro ao criar bloco."); }
    finally { setCreatingTpl(false); }
  };

  if (!student && !loading) {
    return (
      <CoachLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Aluno não encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/students")}>Voltar</Button>
        </div>
      </CoachLayout>
    );
  }

  const handleCreateBlock = async () => {
    if (!blockName.trim()) { toast.error("Informe o nome do bloco."); return; }
    const freq = Number(blockFrequency) || 1;
    const dur = Number(blockDuration) || 4;
    const baseSessions = Array.from({ length: freq }, (_, i) => ({
      id: crypto.randomUUID(), name: sessionLabels[i], exercises: [] as WorkoutExercise[],
    }));
    const weekSessions: Record<number, typeof baseSessions> = {};
    for (let w = 1; w <= dur; w++) {
      weekSessions[w] = baseSessions.map(s => ({ ...s, id: crypto.randomUUID(), exercises: [] }));
    }
    const newBlock: TrainingBlock = {
      id: crypto.randomUUID(), name: blockName.trim().slice(0, 100),
      frequency: freq, duration: dur, sessions: baseSessions, weekSessions,
    };
    try {
      await createBlock(newBlock);
      setBlockName(""); setBlockFrequency("3"); setBlockDuration("4");
      setOpenBlock(false);
      toast.success("Bloco criado!");
    } catch { toast.error("Erro ao criar bloco."); }
  };

  const handleDeleteBlock = async () => {
    if (!deleteBlockId) return;
    try {
      await deleteBlock(deleteBlockId);
      setDeleteBlockId(null);
      toast.success("Bloco removido!");
    } catch { toast.error("Erro ao remover bloco."); }
  };

  const total = student ? sbdTotal(student.squat1RM, student.bench1RM, student.deadlift1RM) : 0;

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/students")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {student && (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {student.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{student.name}</h1>
                <p className="text-sm text-muted-foreground">
                  SQ: {formatKg(student.squat1RM)} · BP: {formatKg(student.bench1RM)} · DL: {formatKg(student.deadlift1RM)} · Total: {formatKg(total)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-semibold">Blocos de Treino</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            {templates.length > 0 && (
              <Button variant="outline" className="gap-2" onClick={() => setOpenTpl(true)}>
                <LibraryBig className="h-4 w-4" /> Carregar Template
              </Button>
            )}
            <Button className="gap-2" onClick={() => setOpenBlock(true)}>
              <Plus className="h-4 w-4" /> Novo Bloco
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : error ? (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="py-12 text-center">
              <p className="text-destructive font-semibold">Erro ao carregar blocos</p>
              <p className="text-sm text-destructive/80 mt-1">{error.message}</p>
              <p className="text-xs text-muted-foreground mt-4">Verifique sua conexão ou contate o suporte técnico se o problema persistir.</p>
            </CardContent>
          </Card>
        ) : blocks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum bloco de treino criado para este aluno.</p>
              <Button variant="outline" className="mt-4 gap-2" onClick={() => setOpenBlock(true)}>
                <Plus className="h-4 w-4" /> Criar primeiro bloco
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {blocks.map((block) => (
              <Card key={block.id} className="hover:border-primary/30 transition-colors cursor-pointer group"
                onClick={() => navigate(`/students/${studentId}/workout/${block.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-primary" /> {block.name}
                    </CardTitle>
                    <Button variant="ghost" size="icon"
                      className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setDeleteBlockId(block.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">{block.frequency}x por semana</Badge>
                    <Badge variant="outline" className="text-xs">{block.duration} semanas</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {block.sessions.map((session) => (
                      <Badge key={session.id} variant="default" className="text-xs">
                        {session.name} <span className="ml-1 text-primary-foreground/70">({session.exercises.length})</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={openBlock} onOpenChange={setOpenBlock}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Bloco de Treino</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do Bloco</Label>
              <Input placeholder="Ex: Bloco de Força" value={blockName} onChange={(e) => setBlockName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Frequência semanal</Label>
              <Select value={blockFrequency} onValueChange={setBlockFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6].map(n => <SelectItem key={n} value={String(n)}>{n}x por semana</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {Number(blockFrequency) > 0 && (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: Number(blockFrequency) }, (_, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{sessionLabels[i]}</Badge>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Label>Duração</Label>
              <Select value={blockDuration} onValueChange={setBlockDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3,4,5,6,7,8,9,10].map(n => <SelectItem key={n} value={String(n)}>{n} semanas</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenBlock(false)}>Cancelar</Button>
            <Button onClick={handleCreateBlock}>Criar Bloco</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteBlockId} onOpenChange={(open) => !open && setDeleteBlockId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir bloco?</AlertDialogTitle>
            <AlertDialogDescription>Todas as sessões e exercícios serão removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBlock}>Sim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={openTpl} onOpenChange={setOpenTpl}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Criar Bloco a partir de Template</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={tplId} onValueChange={(v) => { setTplId(v); const t = templates.find(t => t.id === v); if (t && !tplBlockName) setTplBlockName(t.templateName); }}>
                <SelectTrigger><SelectValue placeholder="Selecione um template..." /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.templateName}{t.category ? ` · ${t.category}` : ""} ({t.sessions.length} treinos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome do Bloco</Label>
              <Input placeholder="Ex: Bloco de Força" value={tplBlockName} onChange={(e) => setTplBlockName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Duração</Label>
              <Select value={tplDuration} onValueChange={setTplDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3,4,5,6,7,8,9,10].map(n => <SelectItem key={n} value={String(n)}>{n} semanas</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTpl(false)} disabled={creatingTpl}>Cancelar</Button>
            <Button onClick={handleCreateFromTemplate} disabled={creatingTpl || !tplId}>
              {creatingTpl ? "Criando..." : "Criar Bloco"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CoachLayout>
  );
};

export default StudentWorkout;
