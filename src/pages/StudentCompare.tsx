import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTrainingBlocks } from "@/hooks/useTrainingBlocks";
import { useExerciseLogs, type ExerciseLog } from "@/hooks/useExerciseLogs";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Loader2, History, AlertCircle, ArrowLeft, ArrowRightLeft, ChevronDown, TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Student, WorkoutSession } from "@/lib/mock-data";
import { formatKg, cn } from "@/lib/utils";
import { readCachedJson, writeCachedJson } from "@/lib/offline-cache";
import { StudentBottomNav } from "@/components/StudentBottomNav";

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

function dayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, today)) return "Hoje";
  if (isSameDay(date, yesterday)) return "Ontem";
  const label = dayFormatter.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const epley = (weight: number, reps: number) => weight * (1 + reps / 30);

interface SessionInstance {
  id: string;
  dayKey: string;
  date: Date;
  blockId: string;
  sessionId: string;
  blockName: string;
  week: number;
  sessionName: string;
  logs: ExerciseLog[];
}

interface RowStats {
  weight: number;
  reps: number;
  rpe: number | null;
  e1rm: number;
  sets: number;
  repsTotal: number;
  volume: number;
}

function exerciseStats(logs: ExerciseLog[]): RowStats | null {
  if (logs.length === 0) return null;
  let best: { weight: number; reps: number; rpe: number | null } | null = null;
  let sets = 0;
  let repsTotal = 0;
  let volume = 0;
  logs.forEach(l => {
    const list = l.setsData && l.setsData.length > 0
      ? l.setsData
      : [{ weight: l.weight, reps: l.reps, rpe: l.actualRpe }];
    list.forEach(s => {
      const w = s.weight || 0;
      const r = s.reps || 0;
      sets++;
      repsTotal += r;
      volume += w * r;
      const e = epley(w, r);
      if (!best || e > epley(best.weight, best.reps)) {
        best = { weight: w, reps: r, rpe: s.rpe ?? l.actualRpe };
      }
    });
  });
  return best
    ? { ...best, e1rm: epley(best.weight, best.reps), sets, repsTotal, volume }
    : null;
}

const goldColor = "hsl(var(--accent-gold))";
const primaryColor = "hsl(var(--primary))";

const Delta = ({ value, suffix = "", decimals = 0, betterHigher = true }: {
  value: number; suffix?: string; decimals?: number; betterHigher?: boolean;
}) => {
  if (value === 0) {
    return <span className="text-muted-foreground">— 0{suffix}</span>;
  }
  const up = value > 0;
  const good = betterHigher ? up : !up;
  return (
    <span className={cn("font-mono font-semibold", good ? "text-green-600 dark:text-green-400" : "text-destructive")}>
      {up ? "▲" : "▼"} {formatKg(Math.abs(value), { withUnit: false, decimals })}{suffix}
    </span>
  );
};

const StudentCompare = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");

  const refreshStudent = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!error && data) {
      const s = {
        id: data.id, name: data.name, email: data.email,
        phone: data.phone || undefined, state: data.state || undefined,
        plan: data.plan, planValue: Number(data.plan_value),
        status: data.status as Student["status"],
        joinedAt: data.joined_at, paymentDueDate: data.payment_due_date || "",
        squat1RM: Number(data.squat_1rm), bench1RM: Number(data.bench_1rm),
        deadlift1RM: Number(data.deadlift_1rm), renewalDay: data.renewal_day || undefined,
      };
      setStudent(s);
      writeCachedJson(`student:${user.id}`, { student: data });
    } else if (error) {
      const cached = readCachedJson<{ student: any }>(`student:${user.id}`);
      if (cached?.student) setStudent(cached.student);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/aluno/login"); return; }
    if (!user) return;
    refreshStudent();
  }, [user, authLoading, navigate, refreshStudent]);

  const { blocks } = useTrainingBlocks(student?.id);
  const { logs, loading: logsLoading } = useExerciseLogs(student?.id);

  const nameMaps = useMemo(() => {
    const exerciseNameById: Record<string, string> = {};
    const sessionNameById: Record<string, string> = {};
    const blockNameById: Record<string, string> = {};
    blocks.forEach(b => {
      blockNameById[b.id] = b.name;
      const allSessions: WorkoutSession[] = [...(b.sessions || []), ...Object.values(b.weekSessions || {}).flat()];
      allSessions.forEach(s => {
        sessionNameById[s.id] = s.name;
        (s.exercises || []).forEach(ex => { exerciseNameById[ex.id] = ex.name; });
      });
    });
    return { exerciseNameById, sessionNameById, blockNameById };
  }, [blocks]);

  const exerciseName = (id: string) => nameMaps.exerciseNameById[id] || "Exercício";

  const instances = useMemo(() => {
    const byInst = new Map<string, SessionInstance>();
    [...logs]
      .filter(l => l.completed)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .forEach(log => {
        const d = new Date(log.createdAt);
        const dayKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        const id = `${dayKey}|${log.sessionId}`;
        const existing = byInst.get(id);
        if (existing) {
          existing.logs.push(log);
          return;
        }
        byInst.set(id, {
          id,
          dayKey,
          date: d,
          blockId: log.blockId,
          sessionId: log.sessionId,
          blockName: nameMaps.blockNameById[log.blockId] || "Treino",
          week: log.weekNumber,
          sessionName: nameMaps.sessionNameById[log.sessionId] || "Sessão",
          logs: [log],
        });
      });
    return [...byInst.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [logs, nameMaps]);

  const instA = instances.find(i => i.id === aId) || null;
  const instB = instances.find(i => i.id === bId) || null;

  const optionLabel = (inst: SessionInstance, markSame: boolean) =>
    `${dayLabel(inst.date)} · ${inst.sessionName} · ${inst.logs.length} ex${markSame ? " · mesmo treino" : ""}`;

  const bOptions = useMemo(() => {
    if (!instA) return instances;
    return [...instances]
      .filter(i => i.id !== instA.id)
      .sort((a, b) => {
        const sameA = a.sessionId === instA.sessionId ? 1 : 0;
        const sameB = b.sessionId === instA.sessionId ? 1 : 0;
        if (sameA !== sameB) return sameB - sameA;
        return b.date.getTime() - a.date.getTime();
      });
  }, [instances, instA]);

  const summary = useMemo(() => {
    if (!instA || !instB) return null;
    const vol = (inst: SessionInstance) => inst.logs.reduce((acc, l) => {
      if (l.setsData && l.setsData.length > 0) {
        return acc + l.setsData.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0);
      }
      return acc + (l.weight || 0) * (l.reps || 0);
    }, 0);
    const setsCount = (inst: SessionInstance) => inst.logs.reduce((acc, l) => acc + (l.setsData?.length || 1), 0);
    const repsCount = (inst: SessionInstance) => inst.logs.reduce((acc, l) => {
      if (l.setsData && l.setsData.length > 0) {
        return acc + l.setsData.reduce((s, set) => s + (set.reps || 0), 0);
      }
      return acc + (l.reps || 0);
    }, 0);
    return {
      volumeA: vol(instA), volumeB: vol(instB),
      setsA: setsCount(instA), setsB: setsCount(instB),
      repsA: repsCount(instA), repsB: repsCount(instB),
    };
  }, [instA, instB]);

  const rows = useMemo(() => {
    if (!instA || !instB) return [];
    const exIds = new Set<string>([
      ...instA.logs.map(l => l.exerciseId),
      ...instB.logs.map(l => l.exerciseId),
    ]);
    return [...exIds].map(id => {
      const statsA = exerciseStats(instA!.logs.filter(l => l.exerciseId === id));
      const statsB = exerciseStats(instB!.logs.filter(l => l.exerciseId === id));
      return {
        id,
        name: exerciseName(id),
        statsA,
        statsB,
        onlyA: !!statsA && !statsB,
        onlyB: !statsA && !!statsB,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [instA, instB, exerciseName]);

  const seriesFor = (exerciseId: string) => {
    return [...logs]
      .filter(l => l.completed && l.exerciseId === exerciseId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(l => {
        const s = exerciseStats([l])!;
        return {
          date: l.createdAt,
          label: format(new Date(l.createdAt), "dd/MM/yy", { locale: ptBR }),
          e1rm: Math.round(s.e1rm * 10) / 10,
          weight: s.weight,
          reps: s.reps,
          rpe: s.rpe,
        };
      });
  };

  if (authLoading || loading || logsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">Conta não vinculada</h2>
            <p className="text-sm text-muted-foreground">Seu e-mail ainda não está vinculado a nenhum aluno.</p>
            <Button variant="outline" onClick={() => navigate("/aluno")}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => navigate("/aluno/historico")}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <History className="h-4 w-4" />
            <span>Comparar Treinos</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5">
        {logs.length === 0 ? (
          <Card><CardContent className="py-14 text-center">
            <p className="text-muted-foreground">
              Nenhum treino registrado ainda. Registre suas cargas no seu treino para poder comparar a evolução aqui.
            </p>
          </CardContent></Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Escolha dois treinos para comparar lado a lado cargas, repetições, RPE e ver a evolução em gráfico.
                </p>
                <div className="flex items-end gap-2">
                  <label className="flex-1 text-xs text-muted-foreground">
                    Treino A
                    <select
                      value={aId}
                      onChange={e => setAId(e.target.value)}
                      className="mt-1 w-full h-11 text-sm px-2 rounded-md border border-border bg-background cursor-pointer"
                    >
                      <option value="">Selecionar...</option>
                      {instances.map(i => (
                        <option key={i.id} value={i.id}>{optionLabel(i, false)}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setAId(bId); setBId(aId); }}
                    disabled={!aId && !bId}
                    aria-label="Inverter treinos"
                    className="shrink-0 h-11 px-2 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                  </button>
                  <label className="flex-1 text-xs text-muted-foreground">
                    Treino B
                    <select
                      value={bId}
                      onChange={e => setBId(e.target.value)}
                      className="mt-1 w-full h-11 text-sm px-2 rounded-md border border-border bg-background cursor-pointer"
                    >
                      <option value="">Selecionar...</option>
                      {bOptions.map(i => (
                        <option key={i.id} value={i.id}>
                          {optionLabel(i, !!instA && i.sessionId === instA.sessionId)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {instA && instB && (
                  <p className="text-xs text-muted-foreground">
                    {dayLabel(instA.date)} · {instA.blockName} — Semana {instA.week} × {dayLabel(instB.date)} · {instB.blockName} — Semana {instB.week}
                    {instA.sessionId === instB.sessionId && (
                      <span className="text-primary font-medium"> · mesmo treino</span>
                    )}
                  </p>
                )}
              </CardContent>
            </Card>

            {instances.length < 2 ? (
              <Card><CardContent className="py-14 text-center">
                <p className="text-muted-foreground">
                  Registre pelo menos 2 treinos para poder comparar a evolução.
                </p>
              </CardContent></Card>
            ) : null}

            {instA && instB && summary && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Card><CardContent className="p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Volume</p>
                    <p className="text-sm font-bold truncate">{formatKg(Math.round(summary.volumeA))}</p>
                    <Delta value={Math.round(summary.volumeB - summary.volumeA)} suffix=" kg" />
                  </CardContent></Card>
                  <Card><CardContent className="p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Séries</p>
                    <p className="text-sm font-bold">{summary.setsA} → {summary.setsB}</p>
                    <Delta value={summary.setsB - summary.setsA} suffix="" />
                  </CardContent></Card>
                  <Card><CardContent className="p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Reps totais</p>
                    <p className="text-sm font-bold">{summary.repsA} → {summary.repsB}</p>
                    <Delta value={summary.repsB - summary.repsA} suffix="" />
                  </CardContent></Card>
                </div>
                <p className="text-xs text-muted-foreground text-center -mt-2">
                  Comparando {dayLabel(instA.date)} ({instA.sessionName}) com {dayLabel(instB.date)} ({instB.sessionName})
                </p>

                <div className="grid gap-3 lg:grid-cols-2">
                  {rows.map(row => (
                    <EvolutionRow key={row.id} row={row} seriesFor={seriesFor} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
      <StudentBottomNav />
    </div>
  );
};

interface RowData {
  id: string;
  name: string;
  statsA: RowStats | null;
  statsB: RowStats | null;
  onlyA: boolean;
  onlyB: boolean;
}

function EvolutionRow({ row, seriesFor }: {
  row: RowData;
  seriesFor: (id: string) => { date: string; label: string; e1rm: number; weight: number; reps: number; rpe: number | null }[];
}) {
  const [open, setOpen] = useState(false);
  const series = useMemo(() => seriesFor(row.id), [row.id, seriesFor]);
  const d1rm = (row.statsA && row.statsB) ? row.statsB.e1rm - row.statsA.e1rm : 0;
  const dVol = (row.statsA && row.statsB) ? row.statsB.volume - row.statsA.volume : 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border border-border/60 overflow-hidden bg-card">
      <CollapsibleTrigger asChild>
        <button type="button" className="w-full text-left cursor-pointer select-none hover:bg-muted/30 transition-colors">
          <div className="p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="font-medium text-sm flex items-center gap-2">
                {row.name}
                {(row.onlyA || row.onlyB) && (
                  <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    Somente {row.onlyA ? "A" : "B"}
                  </span>
                )}
              </p>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Treino A</p>
                {row.statsA ? (
                  <>
                    <p className="font-mono text-sm font-semibold">{formatKg(row.statsA.weight, { withUnit: false })} × {row.statsA.reps}</p>
                    <p className="text-[10px] text-muted-foreground">
                      1RM {formatKg(row.statsA.e1rm)}{row.statsA.rpe != null ? ` · @${row.statsA.rpe}` : ""}
                    </p>
                  </>
                ) : <p className="text-sm text-muted-foreground">—</p>}
              </div>
              <div className="pt-4 px-1">
                {row.statsA && row.statsB ? <Delta value={Math.round(d1rm * 10) / 10} suffix=" kg" /> : <span className="text-muted-foreground">—</span>}
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Treino B</p>
                {row.statsB ? (
                  <>
                    <p className="font-mono text-sm font-semibold">{formatKg(row.statsB.weight, { withUnit: false })} × {row.statsB.reps}</p>
                    <p className="text-[10px] text-muted-foreground">
                      1RM {formatKg(row.statsB.e1rm)}{row.statsB.rpe != null ? ` · @${row.statsB.rpe}` : ""}
                    </p>
                  </>
                ) : <p className="text-sm text-muted-foreground">—</p>}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-1 flex-wrap text-[10px] text-muted-foreground">
              <span className="text-right">
                Vol {formatKg(Math.round(row.statsA?.volume ?? 0))} → {formatKg(Math.round(row.statsB?.volume ?? 0))}
              </span>
              {row.statsA && row.statsB && <Delta value={Math.round(dVol)} suffix=" kg" />}
            </div>
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-border/60 p-3">
          {series.length >= 2 ? (
            <>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                <TrendingUp className="h-3 w-3" /> Evolução da carga (1RM estimada)
              </p>
              <div className="h-[190px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${row.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={primaryColor} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={primaryColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={44} unit="kg" domain={["auto", "auto"]} />
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
                        const p = payload[0].payload as typeof series[number];
                        return (
                          <div className="space-y-0.5">
                            <div className="font-semibold">{format(new Date(p.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}</div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Carga × Reps</span>
                              <span className="font-mono">{formatKg(p.weight, { withUnit: false })} × {p.reps}</span>
                            </div>
                            {p.rpe != null && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">RPE</span>
                                <span className="font-mono font-semibold" style={{ color: goldColor }}>@{p.rpe}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">1RM estimado</span>
                              <span className="font-mono font-bold" style={{ color: primaryColor }}>{formatKg(p.e1rm)}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="e1rm"
                      stroke={primaryColor}
                      strokeWidth={2}
                      fill={`url(#grad-${row.id})`}
                      dot={{ r: 2.5, fill: primaryColor, stroke: "hsl(var(--background))", strokeWidth: 1 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              {series.length === 1 ? "Registre este exercício em mais treinos para ver a curva de evolução." : "Sem registros deste exercício."}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default StudentCompare;
