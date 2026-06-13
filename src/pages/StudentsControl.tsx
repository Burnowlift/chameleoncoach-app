import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Check, Loader2, Plus, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CoachLayout } from "@/components/CoachLayout";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/hooks/useStudents";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const STATUSES: Array<{ v: string; label: string; cls: string }> = [
  { v: "active", label: "Ativo", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  { v: "expiring", label: "Pagamento pendente", cls: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  { v: "inactive", label: "Inativo", cls: "bg-rose-500/15 text-rose-700 border-rose-500/30" },
];

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

type Row = {
  id: string;
  name: string;
  email: string;
  status: string;
  plan: string | null;
  plan_value: number;
  coach_name: string | null;
  payment_due_date: string | null;
  payment_note: string | null;
  has_nutritionist: boolean;
};

const mapRow = (r: any): Row => ({
  id: r.id,
  name: r.name,
  email: r.email,
  status: r.status,
  plan: r.plan ?? null,
  plan_value: Number(r.plan_value) || 0,
  coach_name: r.coach_name ?? null,
  payment_due_date: r.payment_due_date ?? null,
  payment_note: r.payment_note ?? null,
  has_nutritionist: !!r.has_nutritionist,
});

const SELECT_COLS =
  "id,name,email,status,plan,plan_value,coach_name,payment_due_date,payment_note,has_nutritionist";

export default function StudentsControl() {
  const { students } = useStudents();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [coachFilter, setCoachFilter] = useState<string>("all");

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  const fetchRows = async () => {
    const { data, error } = await supabase
      .from("students")
      .select(SELECT_COLS)
      .order("name");
    if (!error && data) setRows(data.map(mapRow));
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students.length]);

  const coaches = useMemo(
    () => Array.from(new Set(rows.map((r) => r.coach_name).filter(Boolean))) as string[],
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (coachFilter !== "all" && r.coach_name !== coachFilter) return false;
        return true;
      }),
    [rows, search, statusFilter, coachFilter],
  );

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === "active");
    return {
      active: active.length,
      pending: rows.filter((r) => r.status === "expiring").length,
      inactive: rows.filter((r) => r.status === "inactive").length,
      total: active.reduce((s, r) => s + r.plan_value, 0),
    };
  }, [rows]);

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const createNew = async () => {
    if (!newName.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSavingNew(true);
    const payload = {
      name: newName.trim(),
      email:
        newEmail.trim() ||
        `${newName.toLowerCase().replace(/\s+/g, ".")}@import.local`,
      plan: "Jaguar",
      status: "active",
    };
    const { error } = await supabase.from("students").insert(payload);
    setSavingNew(false);
    if (error) {
      toast.error("Erro ao criar aluno", { description: error.message });
      return;
    }
    toast.success("Aluno criado");
    setCreating(false);
    setNewName("");
    setNewEmail("");
    await fetchRows();
  };






  return (
    <CoachLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Controle de Alunos</h1>
            <p className="text-muted-foreground">
              Gestão administrativa e financeira — sincronizado com a aba Alunos.
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-2" /> Novo aluno
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Ativos" value={String(stats.active)} accent="text-emerald-600" />
          <StatCard label="Pendentes" value={String(stats.pending)} accent="text-amber-600" />
          <StatCard label="Inativos" value={String(stats.inactive)} accent="text-rose-600" />
          <StatCard label="Total mensalidades" value={fmtBRL(stats.total)} accent="text-primary" />
        </div>

        <Card>
          <CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="relative md:col-span-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Buscar aluno..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={coachFilter} onValueChange={setCoachFilter}>
                <SelectTrigger><SelectValue placeholder="Treinador" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos treinadores</SelectItem>
                  {coaches.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                Nenhum aluno encontrado
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((row) => (
                  <StudentControlCard
                    key={row.id}
                    row={row}
                    onChange={(patch) => updateRow(row.id, patch)}
                  />

                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo aluno</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="opcional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button onClick={createNew} disabled={savingNew}>
              {savingNew && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CoachLayout>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent><div className={cn("text-2xl font-bold", accent)}>{value}</div></CardContent>
    </Card>
  );
}

type SaveState = "idle" | "saving" | "saved";

function StudentControlCard({
  row,
  onChange,
}: {
  row: Row;
  onChange: (patch: Partial<Row>) => void;
}) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [confirmDeleteNote, setConfirmDeleteNote] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [planValueText, setPlanValueText] = useState<string>(
    row.plan_value ? String(row.plan_value) : "",
  );

  useEffect(() => {
    setPlanValueText(row.plan_value ? String(row.plan_value) : "");
  }, [row.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleSave = (patch: Partial<Row>) => {
    onChange(patch);
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveState("saving");
    timerRef.current = setTimeout(async () => {
      const dbPatch: Record<string, any> = {};
      if ("plan" in patch) dbPatch.plan = patch.plan;
      if ("coach_name" in patch) dbPatch.coach_name = patch.coach_name;
      if ("plan_value" in patch) dbPatch.plan_value = patch.plan_value;
      if ("payment_due_date" in patch) dbPatch.payment_due_date = patch.payment_due_date;
      if ("payment_note" in patch) dbPatch.payment_note = patch.payment_note;
      if ("has_nutritionist" in patch) dbPatch.has_nutritionist = patch.has_nutritionist;
      if ("status" in patch) dbPatch.status = patch.status;

      const { error } = await supabase.from("students").update(dbPatch as any).eq("id", row.id);
      if (error) {
        setSaveState("idle");
        toast.error("Erro ao salvar", { description: error.message });
        return;
      }
      setSaveState("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveState("idle"), 1500);
    }, 600);
  };

  const saveNow = async (patch: Partial<Row>, successMsg?: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onChange(patch);
    setSaveState("saving");
    const dbPatch: Record<string, any> = {};
    if ("payment_note" in patch) dbPatch.payment_note = patch.payment_note;
    const { error } = await supabase.from("students").update(dbPatch as any).eq("id", row.id);
    if (error) {
      setSaveState("idle");
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    setSaveState("saved");
    if (successMsg) toast.success(successMsg);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaveState("idle"), 1500);
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  const st = STATUSES.find((s) => s.v === row.status);
  const dueDate = row.payment_due_date ? new Date(row.payment_due_date + "T00:00:00") : undefined;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{row.name}</CardTitle>
            <p className="text-xs text-muted-foreground truncate">{row.email}</p>
          </div>
          <div className="flex items-center gap-2">
            {saveState === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {saveState === "saved" && (
              <span className="flex items-center text-xs text-emerald-600">
                <Check className="h-3.5 w-3.5 mr-0.5" /> Salvo
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs">Plano contratado</Label>
            <Input
              value={row.plan ?? ""}
              onChange={(e) => scheduleSave({ plan: e.target.value })}
              placeholder="Ex: Mensal Premium"
            />
          </div>

          <div className="col-span-2">
            <Label className="text-xs">Treinador</Label>
            <Input
              value={row.coach_name ?? ""}
              onChange={(e) => scheduleSave({ coach_name: e.target.value || null })}
              placeholder="Nome do treinador"
            />
          </div>

          <div className="col-span-2 flex items-center justify-between rounded-md border p-2.5">
            <div>
              <Label className="text-xs">Acompanhamento de nutricionista</Label>
              <p className="text-[11px] text-muted-foreground">
                {row.has_nutritionist ? "Tem nutricionista" : "Não tem nutricionista"}
              </p>
            </div>
            <Switch
              checked={row.has_nutritionist}
              onCheckedChange={(v) => scheduleSave({ has_nutritionist: v })}
            />
          </div>

          <div>
            <Label className="text-xs">Mensalidade (R$)</Label>
            <Input
              inputMode="decimal"
              value={planValueText}
              onChange={(e) => {
                const raw = e.target.value.replace(",", ".");
                setPlanValueText(e.target.value);
                const n = Number(raw);
                if (!Number.isNaN(n)) scheduleSave({ plan_value: n });
              }}
              placeholder="0,00"
            />
          </div>

          <div>
            <Label className="text-xs">Próximo vencimento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-10",
                    !dueDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(d) =>
                    scheduleSave({
                      payment_due_date: d ? format(d, "yyyy-MM-dd") : null,
                    })
                  }
                  locale={ptBR}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="col-span-2">
            <Label className="text-xs">Status</Label>
            <div className="flex items-center gap-2">
              <Select value={row.status} onValueChange={(v) => scheduleSave({ status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {st && <Badge variant="outline" className={st.cls}>{st.label}</Badge>}
            </div>
          </div>
        </div>

        <div className="rounded-md border border-orange-500/40 bg-orange-500/10 p-3">
          <Label className="text-xs font-semibold text-orange-700 dark:text-orange-300">
            Anotações
          </Label>
          <Textarea
            value={row.payment_note ?? ""}
            onChange={(e) => scheduleSave({ payment_note: e.target.value })}
            placeholder="Escreva anotações sobre este aluno..."
            className="mt-1 min-h-[80px] bg-background/60 border-orange-500/30 focus-visible:ring-orange-500/40"
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setConfirmDeleteNote(true)}
              disabled={!row.payment_note}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Apagar
            </Button>
            <Button
              size="sm"
              onClick={() => saveNow({ payment_note: row.payment_note ?? "" }, "Anotação salva")}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Save className="h-3.5 w-3.5 mr-1" /> Salvar
            </Button>
          </div>
        </div>

        <AlertDialog open={confirmDeleteNote} onOpenChange={setConfirmDeleteNote}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar anotação?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O texto da anotação deste aluno será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  await saveNow({ payment_note: "" }, "Anotação apagada");
                  setConfirmDeleteNote(false);
                }}
              >
                Sim, apagar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>

    </Card>
  );
}
