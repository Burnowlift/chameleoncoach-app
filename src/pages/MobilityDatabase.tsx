import { useState, useMemo } from "react";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Search, Activity, Play, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useMobilityCatalog, type MobilityCatalogItem } from "@/hooks/useMobility";

const MobilityDatabase = () => {
  const { items, loading, create, update, remove } = useMobilityCatalog();
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<MobilityCatalogItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const resetForm = () => {
    setName(""); setArea(""); setVideoUrl(""); setEditing(null);
  };

  const openEdit = (item: MobilityCatalogItem) => {
    setEditing(item);
    setName(item.name);
    setArea(item.area || "");
    setVideoUrl(item.videoUrl || "");
    setOpenForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Informe o nome do exercício."); return; }
    try {
      if (editing) {
        await update(editing.id, { name: name.trim(), area: area.trim(), videoUrl: videoUrl.trim() });
        toast.success("Exercício atualizado!");
      } else {
        await create({ name: name.trim(), area: area.trim(), videoUrl: videoUrl.trim() });
        toast.success("Exercício cadastrado!");
      }
      resetForm();
      setOpenForm(false);
    } catch { toast.error("Erro ao salvar."); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await remove(deleteId);
      setDeleteId(null);
      toast.success("Removido!");
    } catch { toast.error("Erro ao remover."); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      i.name.toLowerCase().includes(q) || (i.area || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" /> Banco de Mobilidade
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Catálogo central de exercícios de mobilidade. Apenas estes podem ser prescritos aos alunos.
            </p>
          </div>
          <Button className="gap-2" onClick={() => { resetForm(); setOpenForm(true); }}>
            <Plus className="h-4 w-4" /> Cadastrar
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou área..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-muted-foreground mt-3">
                {items.length === 0 ? "Nenhum exercício cadastrado." : "Nenhum resultado para a busca."}
              </p>
              {items.length === 0 && (
                <Button variant="outline" className="mt-4 gap-2" onClick={() => { resetForm(); setOpenForm(true); }}>
                  <Plus className="h-4 w-4" /> Cadastrar primeiro
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((item) => (
              <Card key={item.id} className="group hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.area && <Badge variant="secondary" className="text-[10px] mt-1">{item.area}</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.videoUrl && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <a href={item.videoUrl} target="_blank" rel="noopener noreferrer">
                            <Play className="h-3.5 w-3.5 text-primary" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setDeleteId(item.id)}
                      >
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

      <Dialog open={openForm} onOpenChange={(o) => { setOpenForm(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Exercício" : "Novo Exercício de Mobilidade"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Mobilidade de Quadril 90/90"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Área (opcional)</Label>
              <Input
                placeholder="Ex: Quadril, Ombro, Tornozelo"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label>Link do Vídeo (opcional)</Label>
              <Input
                placeholder="https://youtube.com/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenForm(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover do banco?</AlertDialogTitle>
            <AlertDialogDescription>
              Este exercício deixará de estar disponível para prescrição. Alunos que já tinham este exercício prescrito não serão afetados.
            </AlertDialogDescription>
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

export default MobilityDatabase;
