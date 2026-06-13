import { useState, useMemo } from "react";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, UserPlus, UserMinus, DollarSign, TrendingUp, CalendarDays, ArrowRightLeft } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { mockPlans, type Student } from "@/lib/mock-data";
import { useStudents } from "@/hooks/useStudents";
import { toast } from "sonner";

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function buildEvolutionData(students: Student[]) {
  if (students.length === 0) return [];

  // Find earliest joinedAt
  const dates = students.map((s) => new Date(s.joinedAt));
  const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
  const now = new Date();

  const startMonth = earliest.getMonth();
  const startYear = earliest.getFullYear();
  const endMonth = now.getMonth();
  const endYear = now.getFullYear();

  const data: { month: string; ativos: number; entradas: number; saidas: number; receita: number }[] = [];

  let cumulativeActive = 0;

  for (let y = startYear; y <= endYear; y++) {
    const mStart = y === startYear ? startMonth : 0;
    const mEnd = y === endYear ? endMonth : 11;
    for (let m = mStart; m <= mEnd; m++) {
      const entradas = students.filter((s) => {
        const d = new Date(s.joinedAt);
        return d.getFullYear() === y && d.getMonth() === m;
      }).length;

      // Saídas: inactive students whose paymentDueDate falls in this month
      const saidas = students.filter((s) => {
        if (s.status !== "inactive") return false;
        const d = new Date(s.paymentDueDate);
        return d.getFullYear() === y && d.getMonth() === m;
      }).length;

      cumulativeActive += entradas - saidas;

      const activeThisMonth = Math.max(0, cumulativeActive);
      const receita = students
        .filter((s) => {
          const joined = new Date(s.joinedAt);
          const joinedYM = joined.getFullYear() * 12 + joined.getMonth();
          const thisYM = y * 12 + m;
          if (joinedYM > thisYM) return false;
          if (s.status === "inactive") {
            const left = new Date(s.paymentDueDate);
            const leftYM = left.getFullYear() * 12 + left.getMonth();
            if (leftYM < thisYM) return false;
          }
          return true;
        })
        .reduce((sum, s) => sum + s.planValue, 0);

      data.push({
        month: `${monthNames[m]}/${String(y).slice(2)}`,
        ativos: activeThisMonth,
        entradas,
        saidas,
        receita,
      });
    }
  }

  return data;
}

const periodLabels: Record<string, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
};

const periodMultiplier: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

const Dashboard = () => {
  const [period, setPeriod] = useState("monthly");
  const [chartFilter, setChartFilter] = useState<"monthly" | "semiannual" | "annual">("monthly");
  const [statusStudentId, setStatusStudentId] = useState<string | null>(null);
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [durationFilter, setDurationFilter] = useState<string>("all");
  const [changingPlan, setChangingPlan] = useState(false);
  const [selectedNewPlan, setSelectedNewPlan] = useState<string>("");

  const plans = useMemo(() => {
    try {
      const saved = localStorage.getItem("plans-data");
      return saved ? JSON.parse(saved) : mockPlans;
    } catch { return mockPlans; }
  }, []);

  const { students, update: updateStudent } = useStudents();

  const uniquePlanNames = useMemo(() => {
    const names = new Set(students.map((s) => s.plan));
    return Array.from(names).sort();
  }, [students]);

  const durationLabelsMap: Record<string, string> = {
    mensal: "Mensal",
    bimestral: "Bimestral",
    trimestral: "Trimestral",
    quadrimestral: "Quadrimestral",
    semestral: "Semestral",
    anual: "Anual",
  };

  const getStudentDurationType = (student: Student): string => {
    const plan = plans.find((p: any) => p.name === student.plan);
    if (plan?.duration) return plan.duration.toLowerCase();
    const nameLower = student.plan?.toLowerCase() || "";
    if (nameLower.includes("anual")) return "anual";
    if (nameLower.includes("semestral")) return "semestral";
    if (nameLower.includes("quadrimestral")) return "quadrimestral";
    if (nameLower.includes("trimestral")) return "trimestral";
    if (nameLower.includes("bimestral")) return "bimestral";
    return "mensal";
  };

  const uniqueDurationTypes = useMemo(() => {
    const types = new Set(students.map((s) => getStudentDurationType(s)));
    return Array.from(types).sort((a, b) => {
      const order = ["mensal", "bimestral", "trimestral", "quadrimestral", "semestral", "anual"];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [students, plans]);

  const chartStudents = useMemo(() => {
    let filtered = students;
    if (planFilter !== "all") {
      filtered = filtered.filter((s) => s.plan === planFilter);
    }
    if (durationFilter !== "all") {
      filtered = filtered.filter((s) => getStudentDurationType(s) === durationFilter);
    }
    return filtered;
  }, [students, planFilter, durationFilter, plans]);

  const evolutionData = useMemo(() => buildEvolutionData(chartStudents), [chartStudents]);

  const filteredEvolutionData = useMemo(() => {
    const isActiveOnDate = (s: Student, date: Date) => {
      const joined = new Date(s.joinedAt);
      if (joined > date) return false;
      if (s.status === "inactive") {
        const left = new Date(s.paymentDueDate);
        if (left < date) return false;
      }
      return true;
    };

    if (chartFilter === "monthly") {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const dailyData = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const dayName = dayNames[date.getDay()];
        const ativos = chartStudents.filter((s) => isActiveOnDate(s, date)).length;
        const saidas = chartStudents.filter((s) => {
          if (s.status !== "inactive") return false;
          const left = new Date(s.paymentDueDate);
          return left.getFullYear() === year && left.getMonth() === month && left.getDate() === d;
        }).length;
        const receita = chartStudents.filter((s) => isActiveOnDate(s, date)).reduce((sum, s) => sum + s.planValue, 0);
        dailyData.push({ month: `${dayName} ${d}`, ativos, saidas, receita });
      }
      return dailyData;
    }

    const buildMonthly = (months: number) => {
      const now = new Date();
      const mnNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const data = [];
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = date.getFullYear();
        const m = date.getMonth();
        const endOfMonth = new Date(y, m + 1, 0);
        const ativos = chartStudents.filter((s) => isActiveOnDate(s, endOfMonth)).length;
        const saidas = chartStudents.filter((s) => {
          if (s.status !== "inactive") return false;
          const left = new Date(s.paymentDueDate);
          return left.getFullYear() === y && left.getMonth() === m;
        }).length;
        const receita = chartStudents.filter((s) => isActiveOnDate(s, endOfMonth)).reduce((sum, s) => sum + s.planValue, 0);
        data.push({ month: `${mnNames[m]}/${String(y).slice(2)}`, ativos, saidas, receita });
      }
      return data;
    };

    if (chartFilter === "semiannual") return buildMonthly(6);
    return buildMonthly(12);
  }, [evolutionData, chartFilter, chartStudents]);
  const today = new Date();
  const currentDay = today.getDate();

  const durationMonthsMap: Record<string, number> = {
    monthly: 1, mensal: 1,
    bimonthly: 2, bimestral: 2,
    quarterly: 3, trimestral: 3,
    quadrimester: 4, quadrimestral: 4,
    semiannual: 6, semestral: 6,
    annual: 12, anual: 12,
  };

  const detectDuration = (student: Student) => {
    const plan = plans.find((p: any) => p.name === student.plan);
    if (plan?.duration) return plan.duration.toLowerCase();
    const nameLower = student.plan?.toLowerCase() || "";
    if (nameLower.includes("semestral")) return "semestral";
    if (nameLower.includes("anual")) return "anual";
    if (nameLower.includes("trimestral")) return "trimestral";
    if (nameLower.includes("bimestral")) return "bimestral";
    if (nameLower.includes("quadrimestral")) return "quadrimestral";
    return "";
  };

  const getNextRenewalDate = (student: Student) => {
    const duration = detectDuration(student);
    const durationMonths = duration ? durationMonthsMap[duration] : null;

    if (durationMonths && durationMonths > 1) {
      // Non-monthly: first renewal = joinedAt + N months, then repeating cycles
      const joined = new Date(student.joinedAt);
      let nextRenewal = new Date(joined.getFullYear(), joined.getMonth() + durationMonths, joined.getDate());
      while (nextRenewal <= today) {
        nextRenewal = new Date(nextRenewal.getFullYear(), nextRenewal.getMonth() + durationMonths, nextRenewal.getDate());
      }
      return nextRenewal;
    }

    // Monthly: always use the fixed renewalDay
    const renewalDay = student.renewalDay ? Number(student.renewalDay) : null;
    if (!renewalDay || isNaN(renewalDay)) return null;
    const year = today.getFullYear();
    const month = today.getMonth();
    let renewalDate = new Date(year, month, renewalDay);
    // If renewal day already passed this month, next month
    if (renewalDate < today) {
      renewalDate = new Date(year, month + 1, renewalDay);
    }
    // Check if already renewed for this cycle via paymentDueDate
    if (student.paymentDueDate) {
      const [py, pm, pd] = student.paymentDueDate.split("-").map(Number);
      const pdd = new Date(py, pm - 1, pd);
      // If paymentDueDate is on or after this renewal date, it means this cycle is already renewed
      if (pdd >= renewalDate) {
        // Advance to next month's renewal
        renewalDate = new Date(renewalDate.getFullYear(), renewalDate.getMonth() + 1, renewalDay);
      }
    }
    return renewalDate;
  };

  const daysUntilRenewal = (student: Student) => {
    const renewalDate = getNextRenewalDate(student);
    if (!renewalDate) return null;
    const diff = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const expiringStudents = students.filter((s: Student) => {
    if (s.status === "inactive") return false;
    const days = daysUntilRenewal(s);
    return days !== null && days >= 0 && days <= 30;
  }).sort((a, b) => (daysUntilRenewal(a) ?? 999) - (daysUntilRenewal(b) ?? 999));

  const activeStudents = students.filter((s: Student) => s.status === "active" || s.status === "expiring").length;
  const inactiveStudents = students.filter((s: Student) => s.status === "inactive").length;
  const multiplier = periodMultiplier[period];
  const totalRevenue = students
    .filter((s: Student) => s.status !== "inactive")
    .reduce((sum: number, s: Student) => sum + s.planValue * multiplier, 0);

  const stats = [
    { label: "Ativos", value: activeStudents, icon: Users, color: "text-primary" },
    { label: "Entradas", value: 3, icon: UserPlus, color: "text-primary" },
    { label: "Saídas", value: inactiveStudents, icon: UserMinus, color: "text-destructive" },
    { label: "Receita", value: `R$ ${totalRevenue.toLocaleString("pt-BR")}`, icon: DollarSign, color: "text-primary" },
  ];

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Área do Treinador</h1>
            <p className="text-muted-foreground">Visão geral da sua consultoria</p>
          </div>
          <ToggleGroup type="single" value={period} onValueChange={(v) => v && setPeriod(v)} className="bg-muted rounded-lg p-1">
            {Object.entries(periodLabels).map(([key, label]) => (
              <ToggleGroupItem key={key} value={key} className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md">
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-lg bg-primary/10 ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Evolução
                </CardTitle>
                <ToggleGroup type="single" value={chartFilter} onValueChange={(v) => v && setChartFilter(v as any)} className="bg-muted rounded-lg p-1">
                  <ToggleGroupItem value="monthly" className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md">Mensal</ToggleGroupItem>
                  <ToggleGroupItem value="semiannual" className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md">Semestral</ToggleGroupItem>
                  <ToggleGroupItem value="annual" className="text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md">Anual</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <Badge
                  variant={planFilter === "all" ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => setPlanFilter("all")}
                >
                  Todos os planos
                </Badge>
                {uniquePlanNames.map((name) => (
                  <Badge
                    key={name}
                    variant={planFilter === name ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => setPlanFilter(name)}
                  >
                    {name}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <Badge
                  variant={durationFilter === "all" ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => setDurationFilter("all")}
                >
                  Todas as durações
                </Badge>
                {uniqueDurationTypes.map((type) => (
                  <Badge
                    key={type}
                    variant={durationFilter === type ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => setDurationFilter(type)}
                  >
                    {durationLabelsMap[type] || type}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredEvolutionData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} formatter={(value: number, name: string) => [`R$ ${value.toLocaleString("pt-BR")}`, name]} />
                <Legend />
                <Line type="monotone" dataKey="receita" name="Caixa Gerado" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="ativos" name="Alunos Ativos" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="saidas" name="Alunos Desativados" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Renovações overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              Renovações Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const activeStudents = students.filter((s: Student) => s.status !== "inactive");
              
              if (activeStudents.length === 0) {
                return <p className="text-sm text-muted-foreground">Nenhum aluno ativo.</p>;
              }

              // Sort by days until renewal
              const sorted = activeStudents
                .map((s) => ({ student: s, days: daysUntilRenewal(s) }))
                .filter((item) => item.days !== null)
                .sort((a, b) => (a.days ?? 999) - (b.days ?? 999));

              const withoutDate = activeStudents.filter((s) => daysUntilRenewal(s) === null);

              return (
                <div className="space-y-2">
                  {sorted.map(({ student, days }) => {
                    const renewalDate = getNextRenewalDate(student);
                    const plan = plans.find((p: any) => p.name === student.plan);
                    const isUrgent = days !== null && days >= 0 && days <= 7;
                    const isExpired = days !== null && days < 0;
                    return (
                      <div key={student.id} className={`flex items-center justify-between p-2 rounded-md ${isExpired ? "bg-destructive/10 border border-destructive/30" : "bg-muted/50"}`}>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {student.name.split(" ").map((n: string) => n[0]).join("")}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{student.name}</p>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{student.plan}</Badge>
                              {isExpired && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-destructive text-destructive-foreground">Vencido</Badge>
                              )}
                              {plan?.duration && !isExpired && (
                                <span className="text-[10px] text-muted-foreground capitalize">
                                  {{"monthly":"Mensal","mensal":"Mensal","bimonthly":"Bimestral","bimestral":"Bimestral","quarterly":"Trimestral","trimestral":"Trimestral","quadrimester":"Quadrimestral","quadrimestral":"Quadrimestral","semiannual":"Semestral","semestral":"Semestral","annual":"Anual","anual":"Anual"}[plan.duration.toLowerCase()] || plan.duration}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => setStatusStudentId(student.id)}>
                            Status
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary">R$ {student.planValue}</p>
                          {renewalDate && (
                            <p className={`text-[10px] ${isExpired ? "text-destructive font-bold" : isUrgent ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                              {isExpired
                                ? `Vencido há ${Math.abs(days!)} dia${Math.abs(days!) !== 1 ? "s" : ""}`
                                : days === 0 ? "Vence hoje!" : days === 1 ? "Vence amanhã!" : `Vence em ${days} dias`}
                              {" · "}
                              {renewalDate.toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {withoutDate.length > 0 && (
                    <div className="mt-3">
                      <Badge variant="outline" className="text-xs mb-2">Sem data definida</Badge>
                      <div className="space-y-2">
                        {withoutDate.map((student) => (
                          <div key={student.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                {student.name.split(" ").map((n) => n[0]).join("")}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{student.name}</p>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{student.plan}</Badge>
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-primary">R$ {student.planValue}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Status Dialog */}
      <Dialog open={!!statusStudentId} onOpenChange={(o) => { if (!o) { setStatusStudentId(null); setChangingPlan(false); setSelectedNewPlan(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Status de Renovação</DialogTitle>
          </DialogHeader>

          {!changingPlan ? (
            <>
              <p className="text-sm text-muted-foreground py-2">
                O aluno renovou o plano?
              </p>
              <div className="grid grid-cols-1 gap-3 pt-2">
                <Button
                  variant="destructive"
                  className="w-full h-10"
                  onClick={async () => {
                    const student = students.find((s) => s.id === statusStudentId);
                    if (student) {
                      await updateStudent({ ...student, status: "inactive" });
                    }
                    setStatusStudentId(null);
                    toast.success("Aluno removido da consultoria.");
                  }}
                >
                  Aluno não renovou
                </Button>
                <Button
                  className="w-full h-10"
                  onClick={async () => {
                    const student = students.find((s) => s.id === statusStudentId);
                    if (student) {
                      const currentRenewal = getNextRenewalDate(student);
                      // Protection: for monthly plans, check if paymentDueDate already covers the nearest upcoming cycle
                      // For non-monthly, check if renewal is > plan duration away (meaning already renewed)
                      const duration = detectDuration(student);
                      const months = duration ? (durationMonthsMap[duration] || 1) : 1;
                      if (currentRenewal && student.paymentDueDate) {
                        const [py, pm, pd] = student.paymentDueDate.split("-").map(Number);
                        const pdd = new Date(py, pm - 1, pd);
                        if (months === 1) {
                          // Monthly: the previous cycle date is currentRenewal - 1 month
                          const prevCycle = new Date(currentRenewal.getFullYear(), currentRenewal.getMonth() - 1, currentRenewal.getDate());
                          // If paymentDueDate >= previous cycle date, it means this cycle was already renewed
                          if (pdd >= prevCycle && pdd >= today) {
                            toast.warning("Este ciclo já foi renovado!");
                            setStatusStudentId(null);
                            return;
                          }
                        } else {
                          const daysLeft = Math.ceil((currentRenewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          if (daysLeft > 30) {
                            toast.warning("Este aluno já foi renovado! A próxima renovação está a mais de 30 dias.");
                            setStatusStudentId(null);
                            return;
                          }
                        }
                      }
                      const renewal = currentRenewal || new Date();
                      const nextRenewal = new Date(renewal.getFullYear(), renewal.getMonth() + months, renewal.getDate());
                      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                      if (months === 1) {
                        // Monthly: set paymentDueDate to current renewal date to mark this cycle as renewed
                        await updateStudent({ ...student, paymentDueDate: fmt(renewal) });
                      } else {
                        await updateStudent({ ...student, joinedAt: fmt(renewal), paymentDueDate: fmt(nextRenewal), renewalDay: fmt(nextRenewal) });
                      }
                    }
                    setStatusStudentId(null);
                    toast.success("Renovação confirmada! Data avançada para o próximo ciclo.");
                  }}
                >
                  Aluno renovou
                </Button>
                <Button
                  className="w-full h-10 gap-2 bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
                  onClick={() => { setChangingPlan(true); setSelectedNewPlan(""); }}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Aluno mudou de plano
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground py-2">
                Selecione o novo plano do aluno:
              </p>
              <Select value={selectedNewPlan} onValueChange={setSelectedNewPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p: any) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name} — R$ {p.price} ({p.duration === "monthly" ? "Mensal" : p.duration === "semiannual" ? "Semestral" : p.duration === "quarterly" ? "Trimestral" : p.duration === "annual" ? "Anual" : p.duration === "bimonthly" ? "Bimestral" : p.duration === "quadrimester" ? "Quadrimestral" : p.duration})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DialogFooter className="flex-col gap-2 mt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setChangingPlan(false)}
                >
                  Voltar
                </Button>
                <Button
                  className="w-full"
                  disabled={!selectedNewPlan}
                  onClick={async () => {
                    const student = students.find((s) => s.id === statusStudentId);
                    const newPlan = plans.find((p: any) => p.name === selectedNewPlan);
                    if (student && newPlan) {
                      const durationMap: Record<string, number> = {
                        monthly: 1, mensal: 1, bimonthly: 2, bimestral: 2,
                        quarterly: 3, trimestral: 3, quadrimester: 4, quadrimestral: 4,
                        semiannual: 6, semestral: 6, annual: 12, anual: 12,
                      };
                      const months = durationMap[newPlan.duration?.toLowerCase()] || 1;
                      const now = new Date();
                      const nextRenewal = new Date(now.getFullYear(), now.getMonth() + months, now.getDate());
                      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                      await updateStudent({
                        ...student,
                        plan: selectedNewPlan,
                        planValue: newPlan.price || 0,
                        paymentDueDate: fmt(nextRenewal),
                        renewalDay: months === 1 ? (student.renewalDay || "") : fmt(nextRenewal),
                        joinedAt: fmt(now),
                      });
                      toast.success(`Plano alterado para ${selectedNewPlan}!`);
                    }
                    setStatusStudentId(null);
                    setChangingPlan(false);
                    setSelectedNewPlan("");
                  }}
                >
                  Confirmar mudança
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </CoachLayout>
  );
};

export default Dashboard;
