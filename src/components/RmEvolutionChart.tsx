import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TrendingUp, Trophy, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Loader2, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { format, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { RmRecord } from "@/hooks/useRmHistory";
import { inferRpe } from "@/lib/rpe-tables";
import { formatKg, cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  records: RmRecord[];
  loading: boolean;
  onDeleteRecord?: (id: string) => Promise<void>;
}

type Period = "30d" | "90d" | "6m" | "all";
type SortKey = "date" | "weight" | "reps" | "e1rm";
type SortDir = "asc" | "desc";
type LiftKey = "squat" | "bench" | "deadlift";

const LIFT_META = {
  squat: { label: "Agachamento", colorVar: "--lift-squat" },
  bench: { label: "Supino", colorVar: "--lift-bench" },
  deadlift: { label: "Terra", colorVar: "--lift-deadlift" },
  total: { label: "Total", colorVar: "--accent-gold" },
} as const;

const PERIOD_LABELS: Record<Period, string> = {
  "30d": "30 dias",
  "90d": "90 dias",
  "6m": "6 meses",
  all: "Tudo",
};

export function RmEvolutionChart({ records, loading, onDeleteRecord }: Props) {
  const [period, setPeriod] = useState<Period>("90d");
  const [activeLift, setActiveLift] = useState<keyof typeof LIFT_META>("squat");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [ma3, setMa3] = useState(false);


  const { fromDate, toDate } = useMemo(() => {
    const now = new Date();
    if (period === "30d") return { fromDate: subDays(now, 30), toDate: now };
    if (period === "90d") return { fromDate: subDays(now, 90), toDate: now };
    if (period === "6m") return { fromDate: subMonths(now, 6), toDate: now };
    return { fromDate: new Date(0), toDate: now };
  }, [period]);

  const inRange = (iso: string) => {
    const d = new Date(iso);
    return d >= fromDate && d <= toDate;
  };

  // PRs sempre sobre todo o histórico
  const prs = useMemo(() => {
    const result: Record<string, { value: number; date: string; weight: number; reps: number }> = {};
    (["squat", "bench", "deadlift"] as const).forEach((type) => {
      const typeRecords = records.filter((r) => r.sbdType === type);
      if (typeRecords.length > 0) {
        const best = typeRecords.reduce((a, b) => (a.estimated1rm > b.estimated1rm ? a : b));
        result[type] = { value: best.estimated1rm, date: best.recordedAt, weight: best.weight, reps: best.reps };
      }
    });
    return result;
  }, [records]);

  // Maior carga efetivamente levantada por lift (não estimada)
  const maxLifted = useMemo(() => {
    const result: Record<"squat" | "bench" | "deadlift", number> = { squat: 0, bench: 0, deadlift: 0 };
    records.forEach((r) => {
      if (r.weight > result[r.sbdType]) result[r.sbdType] = r.weight;
    });
    return result;
  }, [records]);

  const chartData = useMemo(() => {
    if (activeLift === "total") {
      const sorted = [...records].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
      const best: Record<"squat" | "bench" | "deadlift", number> = { squat: 0, bench: 0, deadlift: 0 };
      const points: { date: string; label: string; e1rm: number; weight: number; reps: number; rpe: number | null }[] = [];
      for (const r of sorted) {
        if (r.estimated1rm > best[r.sbdType]) best[r.sbdType] = r.estimated1rm;
        if (best.squat > 0 && best.bench > 0 && best.deadlift > 0 && inRange(r.recordedAt)) {
          const total = best.squat + best.bench + best.deadlift;
          points.push({
            date: r.recordedAt,
            label: format(new Date(r.recordedAt), "dd/MM", { locale: ptBR }),
            e1rm: Math.round(total * 10) / 10,
            weight: 0,
            reps: 0,
            rpe: null,
          });
        }
      }
      const dedup = new Map<string, (typeof points)[number]>();
      points.forEach((p) => dedup.set(p.label, p));
      return Array.from(dedup.values());
    }

    const filtered = records
      .filter((r) => r.sbdType === activeLift && inRange(r.recordedAt))
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

    return filtered.map((r) => ({
      date: r.recordedAt,
      label: format(new Date(r.recordedAt), "dd/MM", { locale: ptBR }),
      e1rm: r.estimated1rm,
      weight: r.weight,
      reps: r.reps,
      rpe: inferRpe(r.sbdType, r.weight, r.reps, r.estimated1rm),
    }));
  }, [records, fromDate, toDate, activeLift]);

  // Dados para o modo "comparar 3 lifts": um ponto por data com os 3 valores (forward-fill)
  const compareData = useMemo(() => {
    const points: { date: string; label: string; squat: number; bench: number; deadlift: number }[] = [];
    const last: Record<LiftKey, number> = { squat: 0, bench: 0, deadlift: 0 };
    const sorted = [...records]
      .filter(r => inRange(r.recordedAt))
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    for (const r of sorted) {
      last[r.sbdType] = r.estimated1rm;
      const prev = points[points.length - 1];
      if (prev && prev.date === r.recordedAt) {
        prev[r.sbdType] = r.estimated1rm;
      } else {
        points.push({
          date: r.recordedAt,
          label: format(new Date(r.recordedAt), "dd/MM", { locale: ptBR }),
          squat: last.squat,
          bench: last.bench,
          deadlift: last.deadlift,
        });
      }
    }
    return points;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, fromDate, toDate]);

  // Pontos que foram recordes pessoais (acumulado crescente) no lift ativo
  const prPoints = useMemo(() => {
    const set = new Set<string>();
    let best = 0;
    chartData.forEach(p => {
      if (p.e1rm > best && p.e1rm > 0) {
        best = p.e1rm;
        set.add(p.label);
      }
    });
    return set;
  }, [chartData]);

  // Série com média móvel de 3 pontos (apenas single-lift)
  const chartDataWithMa = useMemo(() => {
    if (!ma3 || chartData.length < 3) return chartData;
    return chartData.map((p, i) => {
      if (i === 0 || i === chartData.length - 1) return p;
      const avg = (chartData[i - 1].e1rm + p.e1rm + chartData[i + 1].e1rm) / 3;
      return { ...p, e1rm: Math.round(avg * 10) / 10 };
    });
  }, [chartData, ma3]);

  // Tabela: respeita filtros (lift + datas) + ordenação
  const tableRows = useMemo(() => {
    const filtered = records.filter((r) => {
      if (activeLift !== "total" && r.sbdType !== activeLift) return false;
      return inRange(r.recordedAt);
    });
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.recordedAt.localeCompare(b.recordedAt);
      else if (sortKey === "weight") cmp = a.weight - b.weight;
      else if (sortKey === "reps") cmp = a.reps - b.reps;
      else cmp = a.estimated1rm - b.estimated1rm;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [records, activeLift, fromDate, toDate, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "date" ? "desc" : "desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const progress = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].e1rm;
    const last = chartData[chartData.length - 1].e1rm;
    if (first <= 0) return null;
    return Math.round(((last - first) / first) * 100);
  }, [chartData]);

  const liftColor = `hsl(var(${LIFT_META[activeLift].colorVar}))`;
  const goldColor = "hsl(var(--accent-gold))";
  const totalMaxLifted = maxLifted.squat + maxLifted.bench + maxLifted.deadlift;
  const currentMaxLifted = activeLift === "total"
    ? (totalMaxLifted > 0 ? totalMaxLifted : undefined)
    : (maxLifted[activeLift] > 0 ? maxLifted[activeLift] : undefined);

  if (loading) return null;

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-jaguar-orange" />
          1RM estimada
        </CardTitle>

        {/* Lift selector */}
        {!compareMode && (
          <div className="flex gap-1 flex-wrap mt-2">
            {(Object.keys(LIFT_META) as Array<keyof typeof LIFT_META>).map((k) => {
              const active = activeLift === k;
              return (
                <button
                  key={k}
                  onClick={() => setActiveLift(k)}
                  className="h-7 text-xs px-3 rounded-md border transition-colors"
                  style={{
                    background: active ? `hsl(var(${LIFT_META[k].colorVar}) / 0.18)` : "transparent",
                    borderColor: active ? `hsl(var(${LIFT_META[k].colorVar}))` : "hsl(var(--border))",
                    color: active ? `hsl(var(${LIFT_META[k].colorVar}))` : "hsl(var(--muted-foreground))",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {LIFT_META[k].label}
                </button>
              );
            })}
          </div>
        )}

        {/* Period selector */}
        <div className="flex gap-1 flex-wrap mt-2 items-center">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "outline"}
              className="h-7 text-xs px-3"
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </Button>
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          <button
            onClick={() => setCompareMode(m => !m)}
            className={cn(
              "h-7 text-xs px-3 rounded-md border transition-colors font-medium",
              compareMode
                ? "bg-jaguar-orange/15 border-jaguar-orange/60 text-jaguar-orange"
                : "border-border/60 text-muted-foreground hover:border-border",
            )}
            title="Ver os 3 lifts no mesmo gráfico"
          >
            Comparar 3
          </button>
          {!compareMode && (
            <button
              onClick={() => setMa3(m => !m)}
              className={cn(
                "h-7 text-xs px-3 rounded-md border transition-colors font-medium",
                ma3
                  ? "bg-primary/10 border-primary/50 text-foreground"
                  : "border-border/60 text-muted-foreground hover:border-border",
              )}
              title="Suavizar a curva com média móvel de 3 pontos"
            >
              Média móvel
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* PRs row */}
        <div className="grid grid-cols-3 gap-2">
          {(["squat", "bench", "deadlift"] as const).map((type) => {
            const isActive = type === activeLift;
            const color = `hsl(var(${LIFT_META[type].colorVar}))`;
            return (
              <div
                key={type}
                className="text-center p-2 rounded-lg transition-colors"
                style={{
                  background: isActive
                    ? `linear-gradient(180deg, hsl(var(${LIFT_META[type].colorVar}) / 0.12), hsl(var(--accent-gold) / 0.05))`
                    : "hsl(var(--muted) / 0.4)",
                  border: isActive ? `1px solid hsl(var(--accent-gold) / 0.5)` : `1px solid transparent`,
                }}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="h-3 w-3" style={{ color: goldColor }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {LIFT_META[type].label}
                  </span>
                </div>
                <p className="text-lg font-bold" style={{ color }}>
                  {prs[type] ? formatKg(prs[type].value) : "—"}
                </p>
              </div>
            );
          })}
        </div>

        {progress !== null && (
          <div className="flex justify-end">
            <Badge
              variant="outline"
              className="text-[10px]"
              style={{
                borderColor: progress >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))",
                color: progress >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))",
              }}
            >
              {progress >= 0 ? "▲" : "▼"} {Math.abs(progress)}% no período
            </Badge>
          </div>
        )}

        {/* Chart */}
        {compareMode ? (
          compareData.length > 0 ? (
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={compareData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                  <defs>
                    {(["squat", "bench", "deadlift"] as LiftKey[]).map((k) => (
                      <linearGradient key={k} id={`grad-cmp-${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={`hsl(var(${LIFT_META[k].colorVar}))`} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={`hsl(var(${LIFT_META[k].colorVar}))`} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} unit="kg" />
                  <Tooltip
                    cursor={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.3, strokeWidth: 1 }}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      color: "hsl(var(--foreground))",
                      fontSize: 12,
                      boxShadow: "0 8px 24px hsl(0 0% 0% / 0.5)",
                    }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as (typeof compareData)[number];
                      return (
                        <div className="space-y-1">
                          <div className="font-semibold">
                            {format(new Date(p.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                          </div>
                          {(["squat", "bench", "deadlift"] as LiftKey[]).map((k) => (
                            <div key={k} className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ background: `hsl(var(${LIFT_META[k].colorVar}))` }} />
                                {LIFT_META[k].label}
                              </span>
                              <span className="font-bold font-mono">{formatKg(p[k])}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  {(["squat", "bench", "deadlift"] as LiftKey[]).map((k) => (
                    <Area
                      key={k}
                      type="monotone"
                      dataKey={k}
                      stroke={`hsl(var(${LIFT_META[k].colorVar}))`}
                      strokeWidth={2}
                      fill={`url(#grad-cmp-${k})`}
                      dot={{ r: 2, fill: `hsl(var(${LIFT_META[k].colorVar}))`, stroke: "hsl(var(--background))", strokeWidth: 1 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sem dados para o período selecionado.
            </p>
          )
        ) : (
        chartData.length > 0 ? (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartDataWithMa} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${activeLift}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={liftColor} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={liftColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} unit="kg" />
                {currentMaxLifted !== undefined && !ma3 && (
                  <ReferenceLine
                    y={currentMaxLifted}
                    stroke={goldColor}
                    strokeDasharray="6 4"
                    strokeWidth={1.5}
                    label={{ value: `Máx ${formatKg(currentMaxLifted)}`, position: "insideTopRight", fill: goldColor, fontSize: 10, fontWeight: 700 }}
                  />
                )}
                <Tooltip
                  cursor={{ stroke: liftColor, strokeOpacity: 0.4, strokeWidth: 1 }}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--foreground))",
                    fontSize: 12,
                    boxShadow: "0 8px 24px hsl(0 0% 0% / 0.5)",
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as (typeof chartData)[number];
                    const isPr = prPoints.has(p.label);
                    return (
                      <div className="space-y-1">
                        <div className="font-semibold">
                          {format(new Date(p.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                        </div>
                        {isPr && (
                          <div className="flex items-center gap-1 text-[10px] font-bold" style={{ color: goldColor }}>
                            <Trophy className="h-3 w-3" /> Novo PR!
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            {activeLift === "total" ? "Total SBD" : "1RM estimado"}
                            {ma3 ? " (média móvel)" : ""}
                          </span>
                          <span className="font-bold" style={{ color: liftColor }}>
                            {formatKg(p.e1rm)}
                          </span>
                        </div>
                        {activeLift !== "total" && (
                          <>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Carga × Reps</span>
                              <span className="font-mono">
                                {formatKg(p.weight, { withUnit: false })} × {p.reps}
                              </span>
                            </div>
                            {p.rpe != null && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">RPE sentido</span>
                                <span className="font-mono font-semibold" style={{ color: goldColor }}>
                                  @{p.rpe}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="e1rm"
                  stroke={liftColor}
                  strokeWidth={2.5}
                  fill={`url(#grad-${activeLift})`}
                  dot={(props: any) => {
                    const isPr = prPoints.has(props.payload?.label);
                    if (isPr) {
                      return (
                        <svg x={props.cx - 5} y={props.cy - 5} width={10} height={10} viewBox="0 0 24 24">
                          <path
                            d="M12 2l2.9 6.26 6.6.57-5 4.35 1.5 6.45L12 16.9 5.99 19.63l1.5-6.45-5-4.35 6.6-.57L12 2z"
                            fill={goldColor}
                            stroke="hsl(var(--background))"
                            strokeWidth={1.5}
                          />
                        </svg>
                      );
                    }
                    return (
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={3}
                        fill={liftColor}
                        stroke="hsl(var(--background))"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                  activeDot={{ r: 6, fill: goldColor, stroke: liftColor, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Sem dados para o período selecionado.
          </p>
        )
        )}

        {/* Histórico tabular com ordenação */}
        {activeLift !== "total" && (
          <Collapsible
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            className="rounded-md border border-border/60 overflow-hidden"
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 cursor-pointer select-none hover:bg-muted/50 transition-colors"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Histórico — {LIFT_META[activeLift].label}
                </p>
                <span className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {tableRows.length} registro{tableRows.length === 1 ? "" : "s"}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      historyOpen && "rotate-180",
                    )}
                  />
                </span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
            {tableRows.length > 0 ? (

              <>
                {/* Desktop / tablet: tabela tradicional */}
                <div className="hidden sm:block max-h-[280px] overflow-y-auto overflow-x-hidden">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead className="h-8">
                          <button onClick={() => toggleSort("date")} className="flex items-center gap-1 text-xs font-semibold hover:text-foreground">
                            Data <SortIcon k="date" />
                          </button>
                        </TableHead>
                        <TableHead className="h-8 text-right">
                          <button onClick={() => toggleSort("weight")} className="ml-auto flex items-center gap-1 text-xs font-semibold hover:text-foreground">
                            Carga <SortIcon k="weight" />
                          </button>
                        </TableHead>
                        <TableHead className="h-8 text-right">
                          <button onClick={() => toggleSort("reps")} className="ml-auto flex items-center gap-1 text-xs font-semibold hover:text-foreground">
                            Reps <SortIcon k="reps" />
                          </button>
                        </TableHead>
                        <TableHead className="h-8 text-right text-xs font-semibold">RPE</TableHead>
                        <TableHead className="h-8 text-right">
                          <button onClick={() => toggleSort("e1rm")} className="ml-auto flex items-center gap-1 text-xs font-semibold hover:text-foreground">
                            1RM <SortIcon k="e1rm" />
                          </button>
                        </TableHead>
                        {onDeleteRecord && <TableHead className="h-8 w-8" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableRows.map((r) => {
                        const isPR = prs[r.sbdType]?.value === r.estimated1rm;
                        const rpe = inferRpe(r.sbdType, r.weight, r.reps, r.estimated1rm);
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="py-1.5 text-xs">
                              {format(new Date(r.recordedAt), "dd/MM/yy", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="py-1.5 text-xs text-right font-mono">
                              {formatKg(r.weight)}
                            </TableCell>
                            <TableCell className="py-1.5 text-xs text-right font-mono">{r.reps}</TableCell>
                            <TableCell className="py-1.5 text-xs text-right font-mono">
                              {rpe != null ? (
                                <span style={{ color: goldColor }}>@{rpe}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-1.5 text-xs text-right">
                              <span className={cn("font-mono font-semibold", isPR && "text-jaguar-orange")}>
                                {formatKg(r.estimated1rm)}
                              </span>
                              {isPR && (
                                <Trophy className="inline h-3 w-3 ml-1" style={{ color: goldColor }} />
                              )}
                            </TableCell>
                            {onDeleteRecord && (
                              <TableCell className="py-1.5 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteId(r.id)}
                                  aria-label="Apagar registro"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile: cards empilhados, apenas scroll vertical */}
                <div className="sm:hidden">
                  <div className="flex items-center gap-1.5 px-2 py-2 border-b border-border/60 bg-muted/20 overflow-x-hidden flex-wrap">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">Ordenar:</span>
                    {([
                      { k: "date", label: "Data" },
                      { k: "weight", label: "Carga" },
                      { k: "reps", label: "Reps" },
                      { k: "e1rm", label: "1RM" },
                    ] as { k: SortKey; label: string }[]).map(({ k, label }) => (
                      <button
                        key={k}
                        onClick={() => toggleSort(k)}
                        className={cn(
                          "h-7 px-2 rounded-md border text-[11px] font-medium flex items-center gap-1",
                          sortKey === k
                            ? "bg-primary/10 border-primary/40 text-foreground"
                            : "border-border/60 text-muted-foreground",
                        )}
                      >
                        {label} <SortIcon k={k} />
                      </button>
                    ))}
                  </div>
                  <div className="max-h-[320px] overflow-y-auto overflow-x-hidden p-2 space-y-2">
                    {tableRows.map((r) => {
                      const isPR = prs[r.sbdType]?.value === r.estimated1rm;
                      const rpe = inferRpe(r.sbdType, r.weight, r.reps, r.estimated1rm);
                      return (
                        <div
                          key={r.id}
                          className={cn(
                            "rounded-md border p-2.5 bg-card/60",
                            isPR ? "border-jaguar-orange/60" : "border-border/60",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-semibold">
                              {format(new Date(r.recordedAt), "dd/MM/yy", { locale: ptBR })}
                            </span>
                            <div className="flex items-center gap-2">
                              {isPR && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-jaguar-orange">
                                  <Trophy className="h-3 w-3" style={{ color: goldColor }} /> PR
                                </span>
                              )}
                              {onDeleteRecord && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeleteId(r.id)}
                                  aria-label="Apagar registro"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div className="min-w-0">
                              <p className="text-muted-foreground uppercase tracking-wide text-[9px]">Carga × Reps</p>
                              <p className="font-mono tabular-nums">
                                {formatKg(r.weight, { withUnit: false })} × {r.reps}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-muted-foreground uppercase tracking-wide text-[9px]">RPE</p>
                              <p className="font-mono tabular-nums" style={rpe != null ? { color: goldColor } : undefined}>
                                {rpe != null ? `@${rpe}` : "—"}
                              </p>
                            </div>
                            <div className="min-w-0 text-right">
                              <p className="text-muted-foreground uppercase tracking-wide text-[9px]">1RM</p>
                              <p className={cn("font-mono font-semibold tabular-nums", isPR && "text-jaguar-orange")}>
                                {formatKg(r.estimated1rm)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Sem registros para os filtros aplicados.
              </p>
            )}
            </CollapsibleContent>
          </Collapsible>
        )}

      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && !deleting && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar este registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar este registro do histórico? Isso atualizará o gráfico de 1RM.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={async (e) => {
                e.preventDefault();
                if (!deleteId || !onDeleteRecord) return;
                setDeleting(true);
                try {
                  await onDeleteRecord(deleteId);
                  toast.success("Registro removido do histórico.");
                  setDeleteId(null);
                } catch (err: any) {
                  toast.error("Erro ao remover registro.", { description: err?.message });
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apagar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
