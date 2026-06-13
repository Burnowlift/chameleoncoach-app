import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Activity, Trash2, LibraryBig } from "lucide-react";
import { toast } from "sonner";
import { useMobilityTemplates } from "@/hooks/useMobilityTemplates";

const MAX_SESSIONS = 7;

const MobilityTemplates = () => {
  const navigate = useNavigate();
  const { templates, loading, create, remove } = useMobilityTemplates();

  const [openNew, setOpenNew] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [sessionCount, setSessionCount] = useState(3);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const reset = () => { setName(""); setCategory(""); setSessionCount(3); };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Informe um nome."); return; }
    try {
      const t = await create({ name: name.trim(), category: category.trim() || undefined, sessionCount });
      toast.success("Template criado!");
      setOpenNew(false); reset();
      navigate(`/mobility-templates/${t.id}`);
    } catch { toast.error("Erro ao criar template."); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await remove(deleteId); setDeleteId(null); toast.success("Template removido!"); }
    catch { toast.error("Erro ao remover."); }
  };

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LibraryBig className="h-6 w-6 text-primary" /> Mobilidade Templates
            </h1>
            <p className="text-sm text-muted-foreground">
              Crie protocolos de mobilidade reutilizáveis para aplicar aos seus alunos.
            </p>
          </div>
          <Button className="gap-2" onClick={() => { reset(); setOpenNew(true); }}>
            <Plus className="h-4 w-4" /> Novo template
          </Button>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-12">Carregando...</p>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <Activity className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <div>
                <p className="font-medium">Nenhum template criado</p>
                <p className="text-sm text-muted-foreground">
                  Comece criando seu primeiro template de mobilidade.
                </p>
              </div>
              <Button className="gap-2" onClick={() => { reset(); setOpenNew(true); }}>
                <Plus className="h-4 w-4" /> Criar template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <Card key={t.id} className="group hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => navigate(`/mobility-templates/${t.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2 min-w-0">
                      <Activity className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">{t.name}</span>
                    </CardTitle>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(t.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {t.sessionCount} sessão{t.sessionCount > 1 ? "es" : ""}
                  </Badge>
                  {t.category && <Badge variant="outline" className="text-[10px]">{t.category}</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo template de mobilidade</DialogTitle>
            <DialogDescription>
              Defina o nome, categoria (opcional) e quantas sessões o protocolo terá.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Mobilidade Lombar" maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label>Categoria (opcional)</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Lombar, Ombro, Full body" maxLength={40} />
            </div>
            <div className="space-y-2">
              <Label>Número de sessões</Label>
              <Input
                type="number"
                min={1}
                max={MAX_SESSIONS}
                value={sessionCount}
                onChange={(e) => setSessionCount(Math.min(MAX_SESSIONS, Math.max(1, Number(e.target.value) || 1)))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover template?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todos os exercícios deste template serão removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CoachLayout>
  );
};

export default MobilityTemplates;
