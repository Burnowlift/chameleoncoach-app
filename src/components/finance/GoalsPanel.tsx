import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, PiggyBank, Sparkles, Pencil, ChevronDown, TrendingUp, Loader2 } from "lucide-react";
import {
  useFinanceGoals,
  useCreateGoal,
  useDeleteGoal,
  useUpdateGoal,
  useAddContribution,
  useGoalContributions,
  FinanceGoal,
} from "@/hooks/useFinances";

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function GoalCard({ goal }: { goal: FinanceGoal }) {
  const [aporteOpen, setAporteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const addContrib = useAddContribution();
  const deleteGoal = useDeleteGoal();
  const updateGoal = useUpdateGoal();

  // estado de edição
  const [eName, setEName] = useState(goal.name);
  const [eTarget, setETarget] = useState(String(goal.target_amount));
  const [eAutoEnabled, setEAutoEnabled] = useState(!!goal.auto_percentage);
  const [eAutoPct, setEAutoPct] = useState(String(goal.auto_percentage ?? 10));
  const [eAutoScope, setEAutoScope] = useState<"empresa" | "pessoal" | "both">(
    (goal.auto_scope as "empresa" | "pessoal" | "both" | null) ?? "both"
  );
  const [eDeadline, setEDeadline] = useState(goal.deadline ?? "");

  const resetEditState = () => {
    setEName(goal.name);
    setETarget(String(goal.target_amount));
    setEAutoEnabled(!!goal.auto_percentage);
    setEAutoPct(String(goal.auto_percentage ?? 10));
    setEAutoScope((goal.auto_scope as "empresa" | "pessoal" | "both" | null) ?? "both");
    setEDeadline(goal.deadline ?? "");
  };

  const openEdit = () => {
    resetEditState();
    setEditOpen(true);
  };

  const handleEditOpenChange = (open: boolean) => {
    setEditOpen(open);
    if (!open) resetEditState(); // ao fechar (cancelar/ESC/clique fora), volta aos valores atuais
  };

  const handleSaveEdit = async () => {
    if (!eName || !eTarget) return;
    try {
      await updateGoal.mutateAsync({
        id: goal.id,
        name: eName,
        target_amount: parseFloat(eTarget),
        deadline: eDeadline || null,
        auto_percentage: eAutoEnabled ? parseFloat(eAutoPct) : null,
        auto_scope: eAutoEnabled ? eAutoScope : null,
      });
      setEditOpen(false); // fecha apenas se o save deu certo
    } catch {
      /* erro já tratado pelo toast no hook; mantém diálogo aberto */
    }
  };

  const pct = goal.target_amount > 0 ? Math.min(100, (Number(goal.current_amount) / Number(goal.target_amount)) * 100) : 0;

  // Resumo dos aportes automáticos por mês
  const { data: contributions = [] } = useGoalContributions(goal.id);
  const autoSummary = useMemo(() => {
    const autos = contributions.filter((c) => c.source === "auto");
    const total = autos.reduce((s, c) => s + Number(c.amount), 0);
    const byMonth = new Map<string, { label: string; total: number; count: number; sortKey: string }>();
    autos.forEach((c) => {
      const d = new Date(c.date + "T00:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const cur = byMonth.get(key) ?? { label, total: 0, count: 0, sortKey: key };
      cur.total += Number(c.amount);
      cur.count += 1;
      byMonth.set(key, cur);
    });
    const months = Array.from(byMonth.values()).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    return { total, count: autos.length, months };
  }, [contributions]);

  const handleAporte = async () => {
    if (!amount) return;
    await addContrib.mutateAsync({
      goal_id: goal.id,
      amount: parseFloat(amount),
      date: new Date().toISOString().split("T")[0],
      notes,
    });
    setAmount("");
    setNotes("");
    setAporteOpen(false);
  };

  return (
    <Card className="overflow-hidden">
      <div className="h-2" style={{ background: goal.color }} />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" style={{ color: goal.color }} />
            <CardTitle className="text-base">{goal.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={openEdit} aria-label="Editar caixinha">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => deleteGoal.mutate(goal.id)} aria-label="Remover caixinha">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {goal.auto_percentage && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {goal.auto_percentage}% automático de cada entrada
            {goal.auto_scope && goal.auto_scope !== "both" ? ` (${goal.auto_scope})` : ""}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-mono">{fmtBRL(Number(goal.current_amount))}</span>
            <span className="text-muted-foreground">{fmtBRL(Number(goal.target_amount))}</span>
          </div>
          <Progress value={pct} />
          <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(1)}% atingido</p>
        </div>
        {goal.deadline && (
          <p className="text-xs text-muted-foreground">
            Prazo: {new Date(goal.deadline).toLocaleDateString("pt-BR")}
          </p>
        )}

        {/* Resumo de aportes automáticos */}
        {autoSummary.count > 0 && (
          <Collapsible className="rounded-md border bg-muted/30">
            <CollapsibleTrigger className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left">
              <div className="flex items-center gap-2 min-w-0">
                <TrendingUp className="h-3.5 w-3.5 shrink-0" style={{ color: goal.color }} />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">
                    Aporte automático: <span className="font-mono">{fmtBRL(autoSummary.total)}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {autoSummary.count} aporte{autoSummary.count === 1 ? "" : "s"} • {autoSummary.months.length} {autoSummary.months.length === 1 ? "mês" : "meses"}
                  </p>
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-3 pb-3 pt-1 space-y-1 max-h-40 overflow-y-auto">
                {autoSummary.months.map((m) => (
                  <div key={m.sortKey} className="flex items-center justify-between text-xs">
                    <span className="capitalize text-muted-foreground">
                      {m.label} <span className="text-[10px]">({m.count}×)</span>
                    </span>
                    <span className="font-mono" style={{ color: goal.color }}>
                      + {fmtBRL(m.total)}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        <Dialog open={aporteOpen} onOpenChange={setAporteOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Aporte manual
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aportar em {goal.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <Label>Observação</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Button onClick={handleAporte} className="w-full">Confirmar aporte</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de edição */}
        <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar caixinha</DialogTitle>
            </DialogHeader>
            <fieldset disabled={updateGoal.isPending} className="space-y-3 disabled:opacity-70">
              <div>
                <Label>Nome</Label>
                <Input value={eName} onChange={(e) => setEName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Meta (R$)</Label>
                  <Input type="number" step="0.01" value={eTarget} onChange={(e) => setETarget(e.target.value)} />
                </div>
                <div>
                  <Label>Prazo</Label>
                  <Input type="date" value={eDeadline} onChange={(e) => setEDeadline(e.target.value)} />
                </div>
              </div>
              <div className="border rounded-md p-3 space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={eAutoEnabled} onChange={(e) => setEAutoEnabled(e.target.checked)} disabled={updateGoal.isPending} />
                  Aporte automático de cada entrada
                </label>
                {eAutoEnabled && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">% da entrada</Label>
                      <Input type="number" min="1" max="100" value={eAutoPct} onChange={(e) => setEAutoPct(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Escopo</Label>
                      <Select value={eAutoScope} onValueChange={(v) => setEAutoScope(v as "empresa" | "pessoal" | "both")} disabled={updateGoal.isPending}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="both">Ambos</SelectItem>
                          <SelectItem value="empresa">Empresa</SelectItem>
                          <SelectItem value="pessoal">Pessoal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              <Button onClick={handleSaveEdit} className="w-full" disabled={updateGoal.isPending}>
                {updateGoal.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                  "Salvar alterações"
                )}
              </Button>
            </fieldset>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

interface GoalsPanelProps {
  /** Quando definido, mostra apenas caixinhas vinculadas a esse escopo (auto_scope === scope OU 'both') e cria novas já com esse escopo. */
  scopeFilter?: "empresa" | "pessoal";
  compact?: boolean;
}

export function GoalsPanel({ scopeFilter, compact }: GoalsPanelProps = {}) {
  const { data: allGoals = [] } = useFinanceGoals();
  const createGoal = useCreateGoal();
  const [open, setOpen] = useState(false);

  const goals = scopeFilter
    ? allGoals.filter((g) => !g.auto_scope || g.auto_scope === "both" || g.auto_scope === scopeFilter)
    : allGoals;

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState("#10b981");
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoPct, setAutoPct] = useState("10");
  const [autoScope, setAutoScope] = useState<"empresa" | "pessoal" | "both">(scopeFilter ?? "both");

  const handleCreate = async () => {
    if (!name || !target) return;
    await createGoal.mutateAsync({
      name,
      target_amount: parseFloat(target),
      color,
      icon: "PiggyBank",
      deadline: deadline || null,
      auto_percentage: autoEnabled ? parseFloat(autoPct) : null,
      auto_scope: autoEnabled ? autoScope : null,
    });
    setName(""); setTarget(""); setDeadline(""); setAutoEnabled(false);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Caixinhas / Metas</h2>
          <p className="text-sm text-muted-foreground">Defina objetivos de economia e acompanhe a evolução.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nova caixinha</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova caixinha</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Reserva de Emergência" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Meta (R$)</Label>
                  <Input type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} />
                </div>
                <div>
                  <Label>Prazo (opcional)</Label>
                  <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Cor</Label>
                <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10" />
              </div>
              <div className="border rounded-md p-3 space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={autoEnabled} onChange={(e) => setAutoEnabled(e.target.checked)} />
                  Aporte automático de cada entrada
                </label>
                {autoEnabled && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">% da entrada</Label>
                      <Input type="number" min="1" max="100" value={autoPct} onChange={(e) => setAutoPct(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">De qual escopo?</Label>
                      <Select value={autoScope} onValueChange={(v) => setAutoScope(v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="both">Ambos</SelectItem>
                          <SelectItem value="empresa">Empresa</SelectItem>
                          <SelectItem value="pessoal">Pessoal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={createGoal.isPending}>
                Criar caixinha
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <PiggyBank className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Você ainda não criou caixinhas. Comece definindo sua reserva de emergência!</p>
          </CardContent>
        </Card>
      ) : (
        <div className={compact ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"}>
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}
    </div>
  );
}
