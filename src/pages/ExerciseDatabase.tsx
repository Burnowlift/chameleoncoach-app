import { useState } from "react";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Search, Dumbbell, Play, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useExercises } from "@/hooks/useExercises";
import type { ExerciseDBItem } from "@/lib/mock-data";

const muscleGroups = [
  "Peito", "Costas", "Ombros", "Bíceps", "Tríceps",
  "Quadríceps", "Posterior", "Glúteos", "Panturrilha",
  "Abdômen", "Core", "Full Body", "Abdutor/Adutor", "Antebraço",
];

const ExerciseDatabase = () => {
  const { exercises, loading, create, update, remove } = useExercises();
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<ExerciseDBItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [muscleGroup2, setMuscleGroup2] = useState("");
  const [muscleGroup3, setMuscleGroup3] = useState("");
  const [isSquatRm, setIsSquatRm] = useState(false);
  const [isBenchRm, setIsBenchRm] = useState(false);
  const [isDeadliftRm, setIsDeadliftRm] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  const resetForm = () => {
    setName(""); setMuscleGroup(""); setMuscleGroup2(""); setMuscleGroup3("");
    setIsSquatRm(false); setIsBenchRm(false); setIsDeadliftRm(false);
    setVideoUrl("");
  };

  const openEdit = (ex: ExerciseDBItem) => {
    setEditing(ex);
    setName(ex.name);
    setMuscleGroup(ex.muscleGroup);
    setMuscleGroup2(ex.muscleGroup2 || "none");
    setMuscleGroup3(ex.muscleGroup3 || "none");
    setIsSquatRm(!!ex.isSquatRm);
    setIsBenchRm(!!ex.isBenchRm);
    setIsDeadliftRm(!!ex.isDeadliftRm);
    setVideoUrl(ex.videoUrl || "");
  };

  const handleCreate = async () => {
    if (!name.trim() || !muscleGroup) {
      toast.error("Preencha o nome e o grupo muscular.");
      return;
    }
    try {
      await create({
        name: name.trim(),
        muscleGroup,
        muscleGroup2: muscleGroup2 && muscleGroup2 !== "none" ? muscleGroup2 : undefined,
        muscleGroup3: muscleGroup3 && muscleGroup3 !== "none" ? muscleGroup3 : undefined,
        isSquatRm,
        isBenchRm,
        isDeadliftRm,
        videoUrl: videoUrl.trim() || undefined,
      });
      resetForm();
      setOpenNew(false);
      toast.success("Exercício cadastrado!");
    } catch {
      toast.error("Erro ao cadastrar exercício.");
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    if (!name.trim() || !muscleGroup) {
      toast.error("Preencha o nome e o grupo muscular.");
      return;
    }
    try {
      await update(editing.id, {
        name: name.trim(),
        muscleGroup,
        muscleGroup2: muscleGroup2 && muscleGroup2 !== "none" ? muscleGroup2 : undefined,
        muscleGroup3: muscleGroup3 && muscleGroup3 !== "none" ? muscleGroup3 : undefined,
        isSquatRm,
        isBenchRm,
        isDeadliftRm,
        videoUrl: videoUrl.trim() || undefined,
      });
      resetForm();
      setEditing(null);
      toast.success("Exercício atualizado!");
    } catch {
      toast.error("Erro ao atualizar exercício.");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await remove(deleteId);
      setDeleteId(null);
      toast.success("Exercício removido!");
    } catch {
      toast.error("Erro ao remover exercício.");
    }
  };

  const filtered = exercises.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchGroup = filterGroup === "all" || e.muscleGroup === filterGroup;
    return matchSearch && matchGroup;
  });

  const groupedCounts = muscleGroups.map(g => ({
    group: g,
    count: exercises.filter(e => e.muscleGroup === g).length,
  })).filter(g => g.count > 0);

  const currentTag: "none" | "squat" | "bench" | "deadlift" =
    isSquatRm ? "squat" : isBenchRm ? "bench" : isDeadliftRm ? "deadlift" : "none";

  const setTag = (tag: "none" | "squat" | "bench" | "deadlift") => {
    setIsSquatRm(tag === "squat");
    setIsBenchRm(tag === "bench");
    setIsDeadliftRm(tag === "deadlift");
  };

  const RmTagsFields = () => (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div>
        <Label className="text-sm">Tag de cálculo de 1RM</Label>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Selecione no máximo uma tag. O sistema calcula a estimativa de 1RM do levantamento
          marcado a partir da carga + RPE registrados pelo aluno.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {([
          { value: "none", label: "Nenhuma" },
          { value: "squat", label: "Squatrm" },
          { value: "bench", label: "Benchrm" },
          { value: "deadlift", label: "Deadliftrm" },
        ] as const).map(opt => (
          <Button
            key={opt.value}
            type="button"
            variant={currentTag === opt.value ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setTag(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Banco de Exercícios</h1>
            <p className="text-muted-foreground">Gerencie todos os exercícios da sua consultoria</p>
          </div>
          <Button className="gap-2" onClick={() => setOpenNew(true)}>
            <Plus className="h-4 w-4" /> Novo Exercício
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">{exercises.length} exercícios</Badge>
          {groupedCounts.map(g => (
            <Badge key={g.group} variant="outline" className="text-xs cursor-pointer"
              onClick={() => setFilterGroup(filterGroup === g.group ? "all" : g.group)}>
              {g.group}: {g.count}
            </Badge>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar exercício..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Grupo muscular" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {muscleGroups.map(g => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground mt-3">Nenhum exercício encontrado.</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={() => setOpenNew(true)}>
              <Plus className="h-4 w-4" /> Cadastrar exercício
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(ex => (
              <Card key={ex.id} className="group hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Dumbbell className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{ex.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="secondary" className="text-[10px]">{ex.muscleGroup}</Badge>
                          {ex.muscleGroup2 && <Badge variant="secondary" className="text-[10px]">{ex.muscleGroup2}</Badge>}
                          {ex.muscleGroup3 === "S" && <Badge className="text-[10px] bg-blue-500/15 text-blue-600 border-blue-300 hover:bg-blue-500/20">S — Squat</Badge>}
                          {ex.muscleGroup3 === "B" && <Badge className="text-[10px] bg-rose-500/15 text-rose-600 border-rose-300 hover:bg-rose-500/20">B — Bench</Badge>}
                          {ex.muscleGroup3 === "D" && <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-300 hover:bg-emerald-500/20">D — Deadlift</Badge>}
                        </div>
                        {(ex.isSquatRm || ex.isBenchRm || ex.isDeadliftRm) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ex.isSquatRm && (
                              <Badge className="text-[10px] bg-blue-500/15 text-blue-600 border-blue-300 hover:bg-blue-500/20">Squatrm</Badge>
                            )}
                            {ex.isBenchRm && (
                              <Badge className="text-[10px] bg-rose-500/15 text-rose-600 border-rose-300 hover:bg-rose-500/20">Benchrm</Badge>
                            )}
                            {ex.isDeadliftRm && (
                              <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-300 hover:bg-emerald-500/20">Deadliftrm</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {ex.videoUrl && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer">
                            <Play className="h-3.5 w-3.5 text-primary" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => openEdit(ex)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setDeleteId(ex.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Exercício</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do Exercício</Label>
              <Input placeholder="Ex: Agachamento Livre" value={name} onChange={e => setName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Grupo Muscular</Label>
              <Select value={muscleGroup} onValueChange={setMuscleGroup}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {muscleGroups.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grupo Muscular 2 (opcional)</Label>
              <Select value={muscleGroup2} onValueChange={setMuscleGroup2}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {muscleGroups.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grupo Muscular 3 — Volume SBD (opcional)</Label>
              <Select value={muscleGroup3} onValueChange={setMuscleGroup3}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="S">S — Squat (Agachamento)</SelectItem>
                  <SelectItem value="B">B — Bench (Supino)</SelectItem>
                  <SelectItem value="D">D — Deadlift (Terra)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Define a contagem de volume SBD na montagem de treinos.</p>
            </div>
            <RmTagsFields />
            <div className="space-y-2">
              <Label>Link do Vídeo (opcional)</Label>
              <Input placeholder="https://youtube.com/watch?v=..." value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">Cole o link do vídeo ensinando a execução correta.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenNew(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleCreate}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={o => { if (!o) { setEditing(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Exercício</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do Exercício</Label>
              <Input value={name} onChange={e => setName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Grupo Muscular</Label>
              <Select value={muscleGroup} onValueChange={setMuscleGroup}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {muscleGroups.map(g => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grupo Muscular 2 (opcional)</Label>
              <Select value={muscleGroup2} onValueChange={setMuscleGroup2}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {muscleGroups.map(g => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grupo Muscular 3 — Volume SBD (opcional)</Label>
              <Select value={muscleGroup3} onValueChange={setMuscleGroup3}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="S">S — Squat (Agachamento)</SelectItem>
                  <SelectItem value="B">B — Bench (Supino)</SelectItem>
                  <SelectItem value="D">D — Deadlift (Terra)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Define a contagem de volume SBD na montagem de treinos.</p>
            </div>
            <RmTagsFields />
            <div className="space-y-2">
              <Label>Link do Vídeo (opcional)</Label>
              <Input placeholder="https://youtube.com/watch?v=..." value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleUpdate}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir exercício?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CoachLayout>
  );
};

export default ExerciseDatabase;
