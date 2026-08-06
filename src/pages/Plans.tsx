import { useState } from "react";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Check, Plus, Trash2, CreditCard } from "lucide-react";
import { mockPlans, type Plan } from "@/lib/mock-data";
import { useStudents } from "@/hooks/useStudents";
import { toast } from "sonner";

const durationOptions = [
  { value: "monthly", label: "Mensal" },
  { value: "bimonthly", label: "Bimestral" },
  { value: "quarterly", label: "Trimestral" },
  { value: "quadrimester", label: "Quadrimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
];

const Plans = () => {
  const [plans, setPlansState] = useState<Plan[]>(() => {
    try {
      const saved = localStorage.getItem("plans-data");
      return saved ? JSON.parse(saved) : mockPlans;
    } catch { return mockPlans; }
  });
  const { students } = useStudents();

  // Contagem real de alunos por plano (nome + duração), mesmo quando o número
  // gravado no plano está desatualizado.
  const liveCount = (plan: Plan) =>
    students.filter(
      (s) => s.plan === plan.name && (plan.duration ? s.planDuration === plan.duration : true),
    ).length;

  const setPlans = (updater: Plan[] | ((prev: Plan[]) => Plan[])) => {
    setPlansState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      localStorage.setItem("plans-data", JSON.stringify(next));
      return next;
    });
  };
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      setPlans((prev) => prev.filter((p) => p.id !== deleteId));
      toast.success("Plano excluído com sucesso!");
      setDeleteId(null);
    }
  };

  const handleCreate = () => {
    if (!name.trim() || !duration) {
      toast.error("Preencha todos os campos.");
      return;
    }

    const newPlan: Plan = {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 100),
      price: 0,
      features: [],
      studentCount: 0,
      duration: durationOptions.find((d) => d.value === duration)?.label || duration,
      description: description.trim().slice(0, 500),
    };

    setPlans((prev) => [...prev, newPlan]);
    setName("");
    setDuration("");
    setDescription("");
    setOpen(false);
    toast.success("Plano criado com sucesso!");
  };

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Planos</h1>
            <p className="text-muted-foreground">Gerencie seus planos de consultoria</p>
          </div>
          <Button className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Plano
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.length === 0 && (
            <Card className="border-dashed md:col-span-2 lg:col-span-3">
              <CardContent className="py-12 text-center space-y-3">
                <CreditCard className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                <div>
                  <p className="font-medium">Nenhum plano cadastrado</p>
                  <p className="text-sm text-muted-foreground">
                    Crie planos como "Jaguar · Semestral" para vincular alunos e acompanhar vencimentos.
                  </p>
                </div>
                <Button className="gap-2" onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4" /> Novo Plano
                </Button>
              </CardContent>
            </Card>
          )}
          {plans.map((plan) => (
            <Card key={plan.id} className="hover:border-primary/30 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg truncate">
                      {plan.name}
                      {plan.duration && (
                        <span className="text-sm font-normal text-muted-foreground"> · {plan.duration}</span>
                      )}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{liveCount(plan)} aluno{liveCount(plan) !== 1 ? "s" : ""}</Badge>
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Duração: <span className="text-foreground">{plan.duration || "Mensal"}</span>
                </p>
              </CardHeader>
              <CardContent>
                {plan.description && (
                  <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                )}
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-3 w-full" onClick={() => setDeleteId(plan.id)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Qual o nome do Plano?</Label>
              <Input id="plan-name" placeholder="Ex: Jaguar" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Qual a duração do plano?</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a duração" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-desc">Descrição do Plano</Label>
              <Textarea id="plan-desc" placeholder="Descreva o que está incluso neste plano..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Criar Plano</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que quer excluir este plano?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não poderá ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CoachLayout>
  );
};

export default Plans;
