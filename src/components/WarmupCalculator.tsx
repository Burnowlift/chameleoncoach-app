import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";


type Lift = "squat" | "bench" | "deadlift";

// Percentages extracted from the source spreadsheet.
// Squat & Deadlift share the same scheme.
const SCHEMES: Record<Lift, { reps: string; pct: number | null; bar?: boolean }[]> = {
  squat: [
    { reps: "7x", pct: null, bar: true },
    { reps: "4x", pct: 0.425 },
    { reps: "3x", pct: 0.625 },
    { reps: "1x", pct: 0.75 },
    { reps: "1x", pct: 0.86 },
    { reps: "1x", pct: 0.95 },
  ],
  deadlift: [
    { reps: "7x", pct: null, bar: true },
    { reps: "4x", pct: 0.425 },
    { reps: "3x", pct: 0.625 },
    { reps: "1x", pct: 0.75 },
    { reps: "1x", pct: 0.86 },
    { reps: "1x", pct: 0.95 },
  ],
  bench: [
    { reps: "8x", pct: null, bar: true },
    { reps: "6x", pct: 0.5 },
    { reps: "3x", pct: 0.7 },
    { reps: "1x", pct: 0.8 },
    { reps: "1x", pct: 0.875 },
    { reps: "1x", pct: 0.95 },
  ],
};

const LIFT_LABEL: Record<Lift, string> = {
  squat: "Agachamento",
  bench: "Supino",
  deadlift: "Levantamento Terra",
};

function mround(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

export function WarmupCalculator() {
  const [lift, setLift] = useState<Lift>("squat");
  const [workloadStr, setWorkloadStr] = useState<string>("");
  const [increment, setIncrement] = useState<string>("5");
  const [open, setOpen] = useState(false);


  const scheme = SCHEMES[lift];
  const workload = parseFloat(workloadStr.replace(",", "."));
  const inc = parseFloat(increment);
  const hasWorkload = Number.isFinite(workload) && workload > 0;

  const rows = useMemo(() => {
    return scheme.map((row) => {
      if (!hasWorkload) return { reps: row.reps, weight: null as number | null };
      if (row.bar) return { reps: row.reps, weight: 20 };
      const w = mround(workload * (row.pct as number), inc);
      return { reps: row.reps, weight: w };
    });
  }, [scheme, hasWorkload, workload, inc]);

  const rowsWithJump = rows.map((r, i) => {
    if (r.weight == null) return { ...r, jump: null as number | null };
    const next = i < rows.length - 1 ? rows[i + 1].weight : workload;
    const jump = next != null ? Math.round((next - r.weight) * 10) / 10 : null;
    return { ...r, jump };
  });

  return (
    <Card className="border-primary/30">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer select-none">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <CardTitle className="text-lg">Calculadora de Aquecimento</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Insira a carga de trabalho para receber uma sugestão de progressão de aquecimento. A coluna "Próx. salto" mostra
                  o quanto você adicionará na próxima série — se o salto parecer alto demais, ajuste o aquecimento manualmente.
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-muted-foreground shrink-0 transition-transform",
                  open && "rotate-180",
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Levantamento</Label>
                <Select value={lift} onValueChange={(v) => setLift(v as Lift)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="squat">{LIFT_LABEL.squat}</SelectItem>
                    <SelectItem value="bench">{LIFT_LABEL.bench}</SelectItem>
                    <SelectItem value="deadlift">{LIFT_LABEL.deadlift}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Carga de trabalho (kg)</Label>
                <Input
                  inputMode="decimal"
                  placeholder="Ex.: 120"
                  value={workloadStr}
                  onChange={(e) => setWorkloadStr(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Acréscimo mínimo (kg)</Label>
                <Select value={increment} onValueChange={setIncrement}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2.5">2,5 kg</SelectItem>
                    <SelectItem value="5">5 kg</SelectItem>
                    <SelectItem value="10">10 kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Reps</TableHead>
                  <TableHead>Peso de aquecimento</TableHead>
                  <TableHead className="text-right">Próx. salto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsWithJump.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-bold text-primary">{row.reps}</TableCell>
                    <TableCell className="font-medium">
                      {row.weight != null ? `${row.weight} kg` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {row.jump != null ? `+${row.jump} kg` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Nota: a fórmula é otimizada para uma série de trabalho de 1 repetição. Quanto mais repetições a série de
              trabalho tiver, menos precisa pode ser a sugestão — use a calculadora como base, não como regra fixa.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

