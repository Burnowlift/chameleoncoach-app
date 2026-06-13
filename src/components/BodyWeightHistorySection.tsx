import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useBodyWeightHistory } from "@/hooks/useBodyWeightHistory";

interface Props {
  studentId: string;
}

export function BodyWeightHistorySection({ studentId }: Props) {
  const { records, latest, loading, add, remove } = useBodyWeightHistory(studentId);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const raw = weight.replace(",", ".").trim();
    const n = Number(raw);
    if (!raw || !Number.isFinite(n) || n <= 0 || n >= 500) {
      toast.error("Informe um peso válido em kg (ex: 82,5).");
      return;
    }
    if (!date) {
      toast.error("Informe a data da pesagem.");
      return;
    }
    setSaving(true);
    try {
      await add(Math.round(n * 100) / 100, date);
      setWeight("");
      toast.success("Pesagem registrada.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao registrar pesagem.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast.success("Pesagem removida.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao remover.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Scale className="h-4 w-4" />
          Peso corporal (kg)
        </Label>
        {latest && (
          <span className="text-xs text-muted-foreground">
            Atual:{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {String(latest.weightKg).replace(".", ",")} kg
            </span>{" "}
            · {format(new Date(latest.measuredAt + "T00:00:00"), "dd/MM/yyyy")}
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        O Ranking de Força (GL Points) usa sempre a pesagem mais recente.
      </p>

      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <Input
          type="text" inputMode="decimal" placeholder="Peso (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value.replace(/[^0-9.,]/g, ""))}
          maxLength={6}
        />
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={format(new Date(), "yyyy-MM-dd")}
        />
        <Button type="button" onClick={handleAdd} disabled={saving} className="gap-1">
          <Plus className="h-4 w-4" />
          {saving ? "..." : "Adicionar"}
        </Button>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground py-2">Carregando histórico...</div>
      ) : records.length > 0 ? (
        <div className="rounded-lg border bg-muted/30 max-h-44 overflow-y-auto divide-y divide-border">
          {records.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
              <div className="flex items-center gap-3">
                <span className="font-semibold tabular-nums">{String(r.weightKg).replace(".", ",")} kg</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(r.measuredAt + "T00:00:00"), "dd/MM/yyyy")}
                </span>
              </div>
              <Button
                size="icon" variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(r.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground py-1">
          Nenhuma pesagem registrada ainda.
        </div>
      )}
    </div>
  );
}
