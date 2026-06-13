import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, LibraryBig, Layers, Calendar } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useWorkoutTemplates } from "@/hooks/useWorkoutTemplates";
import { WorkoutTemplateDialog } from "@/components/WorkoutTemplateDialog";
import type { WorkoutTemplate } from "@/lib/mock-data";
import { toast } from "sonner";

const WorkoutTemplates = () => {
  const navigate = useNavigate();
  const { templates, loading, create, update, remove } = useWorkoutTemplates();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WorkoutTemplate | null>(null);
  const [toDelete, setToDelete] = useState<WorkoutTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (data: Omit<WorkoutTemplate, "id">) => {
    if (editing) {
      await update(editing.id, data);
      return;
    }
    const newId = await create(data);
    toast.success("Template criado! Abrindo editor...");
    if (newId) navigate(`/templates/${newId}`);
    return newId;
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await remove(toDelete.id);
      toast.success("Template removido!");
      setToDelete(null);
    } catch { toast.error("Erro ao remover template."); }
    finally { setDeleting(false); }
  };

  const totalExercises = (t: WorkoutTemplate) =>
    Object.values(t.weekSessions || {}).reduce((acc, sess) => acc + sess.reduce((a, s) => a + s.exercises.length, 0), 0);

  return (
    <CoachLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LibraryBig className="h-6 w-6 text-primary" />
              Biblioteca de Templates
            </h1>
            <p className="text-sm text-muted-foreground">
              Crie blocos de treino completos (semanas + sessões) e importe-os para qualquer aluno com um clique.
            </p>
          </div>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Template
          </Button>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : templates.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center space-y-3">
              <LibraryBig className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <div>
                <p className="font-medium">Nenhum template ainda</p>
                <p className="text-sm text-muted-foreground">
                  Crie seu primeiro template para reutilizá-lo na montagem de treinos.
                </p>
              </div>
              <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Criar Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.map((t) => (
              <Card key={t.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate(`/templates/${t.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base truncate">{t.templateName}</CardTitle>
                    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(t); setDialogOpen(true); }} title="Editar meta">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setToDelete(t)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {t.category && <Badge variant="secondary" className="text-[10px] w-fit">{t.category}</Badge>}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {t.duration} semana{t.duration === 1 ? "" : "s"}</span>
                    <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {t.frequency}x por semana</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {totalExercises(t)} exercícios no total · clique para editar
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <WorkoutTemplateDialog open={dialogOpen} onOpenChange={setDialogOpen} template={editing} onSave={handleSave} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover template?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{toDelete?.templateName}&quot; será excluído permanentemente. Treinos já importados em alunos não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CoachLayout>
  );
};

export default WorkoutTemplates;
