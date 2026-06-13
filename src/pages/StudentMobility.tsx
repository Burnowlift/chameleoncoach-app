import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Trash2, Pencil, Play, Activity, Layers, Settings, Check, X, FileStack, Search } from "lucide-react";
import { toast } from "sonner";
import { useStudents } from "@/hooks/useStudents";
import { useStudentMobility, useMobilityCatalog } from "@/hooks/useMobility";
import { useMobilityTemplates } from "@/hooks/useMobilityTemplates";

const SESSION_LABELS = ["A", "B", "C", "D", "E", "F", "G"];
const MAX_SESSIONS = 7;

const StudentMobility = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { students } = useStudents();
  const student = students.find((s) => s.id === studentId);
  const { items, loading, addItem, updateItem, removeItem, applyTemplate } = useStudentMobility(studentId);
  const { items: catalog } = useMobilityCatalog();
  const { templates, loading: loadingTemplates } = useMobilityTemplates();

  const storageKey = `mobility-sessions-${studentId ?? ""}`;
  const namesKey = `mobility-session-names-${studentId ?? ""}`;
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [configOpen, setConfigOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(3);
  const [sessionNames, setSessionNames] = useState<Record<number, string>>({});
  const [renamingSession, setRenamingSession] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Initialize from items or localStorage
  useEffect(() => {
    if (!studentId) return;
    const stored = Number(localStorage.getItem(storageKey) || "0");
    const fromItems = items.reduce((m, i) => Math.max(m, i.sessionIndex), 0);
    setSessionCount(Math.max(stored, fromItems));
    try {
      const raw = localStorage.getItem(namesKey);
      if (raw) setSessionNames(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [studentId, items, storageKey, namesKey]);

  const labelFor = (sessionNum: number) =>
    sessionNames[sessionNum]?.trim() || `Mob ${SESSION_LABELS[sessionNum - 1] ?? sessionNum}`;

  const startRename = (sessionNum: number) => {
    setRenamingSession(sessionNum);
    setRenameValue(sessionNames[sessionNum] ?? "");
  };

  const saveRename = () => {
    if (renamingSession == null) return;
    const next = { ...sessionNames };
    const trimmed = renameValue.trim();
    if (trimmed) next[renamingSession] = trimmed;
    else delete next[renamingSession];
    setSessionNames(next);
    localStorage.setItem(namesKey, JSON.stringify(next));
    setRenamingSession(null);
    toast.success("Sessão renomeada!");
  };

  const [openAdd, setOpenAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<number>(1);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  const [selectedCatalogId, setSelectedCatalogId] = useState<string>("");
  const [prescription, setPrescription] = useState("");

  const resetForm = () => {
    setSelectedCatalogId(""); setPrescription(""); setEditingId(null);
  };

  const openEdit = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    setEditingId(id);
    setActiveSession(item.sessionIndex);
    setSelectedCatalogId(item.mobilityExerciseId || "");
    setPrescription(item.prescription || "");
    setOpenAdd(true);
  };

  const openAddForSession = (session: number) => {
    resetForm();
    setActiveSession(session);
    setOpenAdd(true);
  };

  const selectedCatalog = catalog.find(c => c.id === selectedCatalogId);
  const editingItem = editingId ? items.find(i => i.id === editingId) : null;

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateItem(editingId, {
          name: editingItem?.name || "",
          area: editingItem?.area || "",
          videoUrl: editingItem?.videoUrl || "",
          prescription: prescription.trim(),
        });
        toast.success("Prescrição atualizada!");
      } else {
        if (!selectedCatalog) {
          toast.error("Selecione um exercício do Banco de Mobilidade.");
          return;
        }
        await addItem({
          mobilityExerciseId: selectedCatalog.id,
          name: selectedCatalog.name,
          area: selectedCatalog.area || "",
          videoUrl: selectedCatalog.videoUrl || "",
          prescription: prescription.trim(),
          sessionIndex: activeSession,
        });
        toast.success(`Adicionado à ${labelFor(activeSession)}!`);
      }
      resetForm(); setOpenAdd(false);
    } catch { toast.error("Erro ao salvar."); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await removeItem(deleteId); setDeleteId(null); toast.success("Removido!"); }
    catch { toast.error("Erro ao remover."); }
  };

  const handleConfirmConfig = () => {
    const n = Math.max(1, Math.min(MAX_SESSIONS, pendingCount));
    setSessionCount(n);
    localStorage.setItem(storageKey, String(n));
    setConfigOpen(false);
    toast.success(`Protocolo com ${n} sessão${n > 1 ? "es" : ""} de mobilidade.`);
  };

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(t =>
      t.name.toLowerCase().includes(q) || (t.category || "").toLowerCase().includes(q)
    );
  }, [templates, templateSearch]);

  const doApplyTemplate = async (templateId: string) => {
    try {
      setApplyingTemplate(true);
      const result = await applyTemplate(templateId);
      if (result) {
        const n = Math.max(1, Math.min(MAX_SESSIONS, result.sessionCount || 1));
        setSessionCount(n);
        localStorage.setItem(storageKey, String(n));
        // Convert string keys to number keys for local state
        const namesObj: Record<number, string> = {};
        Object.entries(result.sessionNames || {}).forEach(([k, v]) => {
          const num = Number(k);
          if (!Number.isNaN(num) && typeof v === "string") namesObj[num] = v;
        });
        setSessionNames(namesObj);
        localStorage.setItem(namesKey, JSON.stringify(namesObj));
      }
      toast.success("Template aplicado!");
      setPendingTemplateId(null);
      setTemplateDialogOpen(false);
    } catch {
      toast.error("Erro ao aplicar template.");
    } finally {
      setApplyingTemplate(false);
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    if (items.length > 0 || sessionCount > 0) {
      setPendingTemplateId(templateId);
    } else {
      doApplyTemplate(templateId);
    }
  };

  const itemsBySession = useMemo(() => {
    const map = new Map<number, typeof items>();
    for (const it of items) {
      const arr = map.get(it.sessionIndex) || [];
      arr.push(it);
      map.set(it.sessionIndex, arr);
    }
    for (const [k, arr] of map) arr.sort((a, b) => a.position - b.position);
    return map;
  }, [items]);

  if (!student) {
    return (
      <CoachLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Aluno não encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/students")}>Voltar</Button>
        </div>
      </CoachLayout>
    );
  }

  const hasProtocol = sessionCount > 0;

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/students")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {student.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{student.name}</h1>
              <p className="text-sm text-muted-foreground">Plano de Mobilidade</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Protocolo de Mobilidade
            {hasProtocol && (
              <Badge variant="secondary" className="text-[10px]">
                {sessionCount} sessão{sessionCount > 1 ? "es" : ""}
              </Badge>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => { setTemplateSearch(""); setTemplateDialogOpen(true); }}
            >
              <FileStack className="h-4 w-4" /> Usar template
            </Button>
            {hasProtocol ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => { setPendingCount(sessionCount); setConfigOpen(true); }}
              >
                <Settings className="h-4 w-4" /> Reconfigurar sessões
              </Button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : !hasProtocol ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <Activity className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <div>
                <p className="font-medium">Nenhum protocolo de mobilidade criado</p>
                <p className="text-sm text-muted-foreground">
                  Comece criando o protocolo e definindo quantas sessões de mobilidade o aluno terá.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Button className="gap-2" onClick={() => { setPendingCount(3); setConfigOpen(true); }}>
                  <Plus className="h-4 w-4" /> Criar protocolo de mobilidade
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => { setTemplateSearch(""); setTemplateDialogOpen(true); }}>
                  <FileStack className="h-4 w-4" /> Usar template
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Array.from({ length: sessionCount }, (_, i) => i + 1).map((sessionNum) => {
              const sessionItems = itemsBySession.get(sessionNum) || [];
              return (
                <Card key={sessionNum} className="border-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <CardTitle className="text-base flex items-center gap-2 flex-1 min-w-0">
                        <Layers className="h-4 w-4 text-primary shrink-0" />
                        {renamingSession === sessionNum ? (
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <Input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveRename();
                                if (e.key === "Escape") setRenamingSession(null);
                              }}
                              maxLength={40}
                              placeholder={`Mob ${SESSION_LABELS[sessionNum - 1]}`}
                              className="h-8 text-sm"
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveRename}>
                              <Check className="h-4 w-4 text-primary" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setRenamingSession(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="truncate">{labelFor(sessionNum)}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => startRename(sessionNum)}
                              title="Renomear sessão"
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Badge variant="secondary" className="text-[10px]">
                              {sessionItems.length} exercício{sessionItems.length === 1 ? "" : "s"}
                            </Badge>
                          </>
                        )}
                      </CardTitle>
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => openAddForSession(sessionNum)}
                      >
                        <Plus className="h-4 w-4" /> Adicionar mobilidade
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {sessionItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum exercício nesta sessão ainda.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sessionItems.map((item) => (
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
                                    {item.prescription && (
                                      <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{item.prescription}</p>
                                    )}
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
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item.id)}>
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setDeleteId(item.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Configure session count */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sessões de mobilidade</DialogTitle>
            <DialogDescription>
              Defina quantas sessões de mobilidade este protocolo terá (1 a {MAX_SESSIONS}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Número de sessões</Label>
            <Input
              type="number"
              min={1}
              max={MAX_SESSIONS}
              value={pendingCount}
              onChange={(e) => setPendingCount(Math.min(MAX_SESSIONS, Math.max(1, Number(e.target.value) || 1)))}
            />
            {sessionCount > 0 && pendingCount < sessionCount && (
              <p className="text-[11px] text-amber-600">
                Atenção: exercícios das sessões removidas continuarão no banco, mas ficarão ocultos até você aumentar de novo.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmConfig}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Item */}
      <Dialog open={openAdd} onOpenChange={(o) => { setOpenAdd(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? "Editar Prescrição"
                : `Adicionar mobilidade — ${labelFor(activeSession)}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editingId && (
              <>
                {catalog.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <Activity className="h-8 w-8 mx-auto text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Nenhum exercício no banco.
                    </p>
                    <Button asChild variant="outline" size="sm" className="mt-3">
                      <Link to="/mobility-database">Ir para o Banco de Mobilidade</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Exercício do Banco de Mobilidade *</Label>
                    <Select value={selectedCatalogId} onValueChange={setSelectedCatalogId}>
                      <SelectTrigger><SelectValue placeholder="Selecione um exercício" /></SelectTrigger>
                      <SelectContent>
                        {catalog.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}{c.area ? ` — ${c.area}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCatalog && (
                      <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
                        <p><span className="text-muted-foreground">Nome:</span> {selectedCatalog.name}</p>
                        {selectedCatalog.area && <p><span className="text-muted-foreground">Área:</span> {selectedCatalog.area}</p>}
                        {selectedCatalog.videoUrl && (
                          <p className="truncate">
                            <span className="text-muted-foreground">Vídeo:</span>{" "}
                            <a href={selectedCatalog.videoUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                              abrir
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {editingId && editingItem && (
              <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
                <p><span className="text-muted-foreground">Exercício:</span> {editingItem.name}</p>
                {editingItem.area && <p><span className="text-muted-foreground">Área:</span> {editingItem.area}</p>}
                <p><span className="text-muted-foreground">Sessão:</span> {labelFor(editingItem.sessionIndex)}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Prescrição (opcional)</Label>
              <Textarea
                placeholder="Ex: 3 séries de 30s cada lado, antes do treino"
                value={prescription}
                onChange={e => setPrescription(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenAdd(false); resetForm(); }}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={!editingId && (catalog.length === 0 || !selectedCatalogId)}
            >
              {editingId ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover exercício?</AlertDialogTitle>
            <AlertDialogDescription>O aluno deixará de ver este exercício.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template selection dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={(o) => { if (!applyingTemplate) setTemplateDialogOpen(o); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Aplicar template de mobilidade</DialogTitle>
            <DialogDescription>
              Escolha um template para preencher automaticamente as sessões deste aluno.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar template..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
              {loadingTemplates ? (
                <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
              ) : filteredTemplates.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <FileStack className="h-8 w-8 mx-auto text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {templates.length === 0 ? "Nenhum template criado ainda." : "Nenhum template encontrado."}
                  </p>
                  {templates.length === 0 && (
                    <Button asChild variant="outline" size="sm" className="mt-3">
                      <Link to="/mobility-templates">Criar template</Link>
                    </Button>
                  )}
                </div>
              ) : (
                filteredTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTemplate(t.id)}
                    disabled={applyingTemplate}
                    className="w-full text-left rounded-lg border p-3 hover:border-primary/40 hover:bg-accent/50 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{t.name}</p>
                        {t.category && (
                          <Badge variant="secondary" className="text-[10px] mt-1">{t.category}</Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {t.sessionCount} sessão{t.sessionCount > 1 ? "es" : ""}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)} disabled={applyingTemplate}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overwrite confirmation */}
      <AlertDialog open={!!pendingTemplateId} onOpenChange={(o) => !o && !applyingTemplate && setPendingTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir protocolo atual?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os exercícios e sessões atuais do aluno serão removidos e substituídos pelo conteúdo do template.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applyingTemplate}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={applyingTemplate}
              onClick={(e) => { e.preventDefault(); if (pendingTemplateId) doApplyTemplate(pendingTemplateId); }}
            >
              {applyingTemplate ? "Aplicando..." : "Substituir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CoachLayout>
  );
};

export default StudentMobility;
