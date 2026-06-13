import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import {
  FinanceScope,
  FinanceType,
  useFinanceCategories,
  useCreateTransaction,
  useCreateRecurrence,
} from "@/hooks/useFinances";

interface Props {
  scope: FinanceScope;
}

export function NewTransactionDialog({ scope }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FinanceType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dayOfMonth, setDayOfMonth] = useState("5");

  const { data: categories = [] } = useFinanceCategories();
  const createTx = useCreateTransaction();
  const createRec = useCreateRecurrence();

  const filteredCats = categories.filter((c) => c.scope === scope && c.type === type);

  const reset = () => {
    setAmount("");
    setDescription("");
    setCategoryId("");
    setDate(new Date().toISOString().split("T")[0]);
    setDayOfMonth("5");
  };

  const handleSingle = async () => {
    if (!amount || !description) return;
    await createTx.mutateAsync({
      scope,
      type,
      category_id: categoryId || null,
      amount: parseFloat(amount),
      description,
      date,
    });
    reset();
    setOpen(false);
  };

  const handleRecurring = async () => {
    if (!amount || !description) return;
    await createRec.mutateAsync({
      scope,
      type,
      category_id: categoryId || null,
      amount: parseFloat(amount),
      description,
      day_of_month: parseInt(dayOfMonth),
      start_date: new Date().toISOString().split("T")[0],
      end_date: null,
      active: true,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo lançamento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo lançamento — {scope === "empresa" ? "Empresa" : "Pessoal"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="single">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Único</TabsTrigger>
            <TabsTrigger value="recurring">Recorrente mensal</TabsTrigger>
          </TabsList>

          <div className="grid gap-3 mt-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => { setType(v as FinanceType); setCategoryId(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Saída</SelectItem>
                    <SelectItem value="income">Entrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Editor de vídeo João" />
            </div>

            <div>
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {filteredCats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="single" className="mt-0 space-y-3">
              <div>
                <Label>Data</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <Button onClick={handleSingle} className="w-full" disabled={createTx.isPending}>
                Adicionar lançamento
              </Button>
            </TabsContent>

            <TabsContent value="recurring" className="mt-0 space-y-3">
              <div>
                <Label>Dia do mês (1–31)</Label>
                <Input type="number" min="1" max="31" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">
                  Será criado automaticamente todo mês neste dia.
                </p>
              </div>
              <Button onClick={handleRecurring} className="w-full" disabled={createRec.isPending}>
                Criar recorrência
              </Button>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
