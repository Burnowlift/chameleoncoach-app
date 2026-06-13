import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Trash2, ArrowDownCircle, ArrowUpCircle, Repeat, Wallet, CalendarRange } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FinanceScope,
  useFinanceCategories,
  useFinanceTransactions,
  useDeleteTransaction,
  useFinanceRecurrences,
  useDeleteRecurrence,
} from "@/hooks/useFinances";
import { NewTransactionDialog } from "./NewTransactionDialog";
import { GoalsPanel } from "./GoalsPanel";

interface Props {
  scope: FinanceScope;
  accentClass: string; // ex: "text-emerald-500"
  bgAccentClass: string; // ex: "bg-emerald-500/10"
  readOnly?: boolean;
}

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type PeriodKey = "month" | "last30" | "ytd" | "year" | "all" | "custom";

const toIso = (d: Date) => d.toISOString().split("T")[0];

export function ScopeFinancePanel({ scope, accentClass, bgAccentClass, readOnly = false }: Props) {
  const { data: txs = [] } = useFinanceTransactions();
  const { data: categories = [] } = useFinanceCategories();
  const { data: recurrences = [] } = useFinanceRecurrences();
  const deleteTx = useDeleteTransaction();
  const deleteRec = useDeleteRecurrence();

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filtered = useMemo(() => txs.filter((t) => t.scope === scope), [txs, scope]);
  const filteredRecs = useMemo(() => recurrences.filter((r) => r.scope === scope), [recurrences, scope]);

  // ===== Período selecionável =====
  const now = new Date();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [customStart, setCustomStart] = useState(toIso(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [customEnd, setCustomEnd] = useState(toIso(now));

  const { startDate, endDate, periodLabel } = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    let start: Date;
    let end: Date = today;
    let label = "";
    switch (period) {
      case "month": {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        label = "Mês atual";
        break;
      }
      case "last30": {
        start = new Date(today);
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        label = "Últimos 30 dias";
        break;
      }
      case "ytd": {
        start = new Date(today.getFullYear(), 0, 1);
        label = "Ano atual (YTD)";
        break;
      }
      case "year": {
        start = new Date(today);
        start.setFullYear(start.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        label = "Últimos 12 meses";
        break;
      }
      case "custom": {
        start = new Date(customStart + "T00:00:00");
        end = new Date(customEnd + "T23:59:59");
        label = `${start.toLocaleDateString("pt-BR")} → ${end.toLocaleDateString("pt-BR")}`;
        break;
      }
      case "all":
      default: {
        start = new Date(2000, 0, 1);
        label = "Todo o período";
      }
    }
    return { startDate: start, endDate: end, periodLabel: label };
  }, [period, customStart, customEnd]);

  // Transações dentro do período
  const periodTxs = useMemo(
    () => filtered.filter((t) => {
      const d = new Date(t.date);
      return d >= startDate && d <= endDate;
    }),
    [filtered, startDate, endDate]
  );

  const periodIncome = periodTxs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const periodExpense = periodTxs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const periodBalance = periodIncome - periodExpense;
  const incomeCount = periodTxs.filter((t) => t.type === "income").length;
  const expenseCount = periodTxs.filter((t) => t.type === "expense").length;

  // Série mensal (6 meses)
  const series = useMemo(() => {
    const months: { key: string; label: string; entradas: number; saidas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, label: d.toLocaleDateString("pt-BR", { month: "short" }), entradas: 0, saidas: 0 });
    }
    filtered.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const m = months.find((x) => x.key === key);
      if (!m) return;
      if (t.type === "income") m.entradas += Number(t.amount);
      else m.saidas += Number(t.amount);
    });
    return months;
  }, [filtered]);

  // Pizza por categoria (despesas do período)
  const pieData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();
    periodTxs.filter((t) => t.type === "expense").forEach((t) => {
      const c = catMap.get(t.category_id ?? "");
      const name = c?.name ?? "Sem categoria";
      const color = c?.color ?? "#64748b";
      const cur = map.get(name) ?? { name, value: 0, color };
      cur.value += Number(t.amount);
      map.set(name, cur);
    });
    return Array.from(map.values());
  }, [periodTxs, catMap]);

  return (
    <div className="space-y-6">
      {/* Seletor de período */}
      <Card>
        <CardContent className="pt-6 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            Período:
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="w-full md:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mês atual</SelectItem>
              <SelectItem value="last30">Últimos 30 dias</SelectItem>
              <SelectItem value="ytd">Ano atual (YTD)</SelectItem>
              <SelectItem value="year">Últimos 12 meses</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-auto" />
              <span className="text-muted-foreground text-sm">até</span>
              <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-auto" />
            </div>
          )}
          <span className="text-xs text-muted-foreground md:ml-auto">{periodLabel}</span>
        </CardContent>
      </Card>

      {/* Resumo do período */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={bgAccentClass}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpCircle className={`h-4 w-4 ${accentClass}`} /> Entradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtBRL(periodIncome)}</p>
            <p className="text-xs text-muted-foreground mt-1">{incomeCount} lançamento{incomeCount === 1 ? "" : "s"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-rose-500" /> Saídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtBRL(periodExpense)}</p>
            <p className="text-xs text-muted-foreground mt-1">{expenseCount} lançamento{expenseCount === 1 ? "" : "s"}</p>
          </CardContent>
        </Card>
        <Card className={periodBalance >= 0 ? bgAccentClass : "bg-rose-500/5 border-rose-500/20"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className={`h-4 w-4 ${periodBalance >= 0 ? accentClass : "text-rose-500"}`} /> Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${periodBalance >= 0 ? accentClass : "text-rose-500"}`}>
              {fmtBRL(periodBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Margem: {periodIncome > 0 ? `${((periodBalance / periodIncome) * 100).toFixed(1)}%` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução (6 meses)</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Legend />
                <Line type="monotone" dataKey="entradas" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="saidas" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas por categoria (mês)</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 280 }}>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center pt-12">Sem despesas no mês.</p>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label={(e) => e.name}>
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recorrências ativas */}
      {filteredRecs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Repeat className="h-4 w-4" /> Recorrências ativas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredRecs.map((r) => {
              const c = catMap.get(r.category_id ?? "");
              return (
                <div key={r.id} className="flex items-center justify-between p-2 rounded-md border">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {c?.name ?? "Sem categoria"} • dia {r.day_of_month} de cada mês
                    </p>
                  </div>
                  <span className={`font-mono text-sm mr-3 ${r.type === "income" ? accentClass : "text-rose-500"}`}>
                    {r.type === "income" ? "+" : "-"} {fmtBRL(Number(r.amount))}
                  </span>
                  {!readOnly && (
                    <Button size="icon" variant="ghost" onClick={() => deleteRec.mutate(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Lista de transações */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Lançamentos</CardTitle>
          {!readOnly && <NewTransactionDialog scope={scope} />}
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum lançamento ainda.</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filtered.slice(0, 100).map((t) => {
                const c = catMap.get(t.category_id ?? "");
                return (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-1.5 h-10 rounded-full"
                        style={{ background: c?.color ?? "#64748b" }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{t.description}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          {c && <Badge variant="outline" className="text-[10px] py-0">{c.name}</Badge>}
                          {new Date(t.date).toLocaleDateString("pt-BR")}
                          {t.recurrence_id && <Repeat className="h-3 w-3" />}
                        </p>
                      </div>
                    </div>
                    <span className={`font-mono text-sm mr-3 ${t.type === "income" ? accentClass : "text-rose-500"}`}>
                      {t.type === "income" ? "+" : "-"} {fmtBRL(Number(t.amount))}
                    </span>
                    {!readOnly && (
                      <Button size="icon" variant="ghost" onClick={() => deleteTx.mutate(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Caixinhas / Metas vinculadas a este escopo */}
      <GoalsPanel scopeFilter={scope} compact />
    </div>
  );
}
