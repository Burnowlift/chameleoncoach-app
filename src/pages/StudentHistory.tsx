import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTrainingBlocks } from "@/hooks/useTrainingBlocks";
import { useExerciseLogs, type ExerciseLog } from "@/hooks/useExerciseLogs";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, History, Search, Dumbbell, TrendingUp, AlertCircle, ArrowLeft, ArrowUp, ArrowDown, CalendarCheck, Weight } from "lucide-react";
import type { Student, WorkoutSession } from "@/lib/mock-data";
import { formatKg } from "@/lib/utils";
import { readCachedJson, writeCachedJson } from "@/lib/offline-cache";
import { toast } from "sonner";

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function dayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, today)) return "Hoje";
  if (isSameDay(date, yesterday)) return "Ontem";
  const label = dayFormatter.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

interface DayGroup {
  key: string;
  date: Date;
  logs: ExerciseLog[];
  blockName: string;
  week: number;
  sessionName: string;
}

const StudentHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<number | null>(null);

  const refreshStudent = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!error && data) {
      setStudent({
        id: data.id, name: data.name, email: data.email,
        phone: data.phone || undefined, state: data.state || undefined,
        plan: data.plan, planValue: Number(data.plan_value),
        status: data.status as Student["status"],
        joinedAt: data.joined_at, paymentDueDate: data.payment_due_date || "",
        squat1RM: Number(data.squat_1rm), bench1RM: Number(data.bench_1rm),
        deadlift1RM: Number(data.deadlift_1rm), renewalDay: data.renewal_day || undefined,
      });
      writeCachedJson(`student:${user.id}`, { student: data });
    } else if (error) {
      const cached = readCachedJson<{ student: any }>(`student:${user.id}`);
      if (cached?.student) {
        const d = cached.student;
        setStudent({
          id: d.id, name: d.name, email: d.email,
          phone: d.phone || undefined, state: d.state || undefined,
          plan: d.plan, planValue: Number(d.plan_value),
          status: d.status as Student["status"],
          joinedAt: d.joined_at, paymentDueDate: d.payment_due_date || "",
          squat1RM: Number(d.squat_1rm), bench1RM: Number(d.bench_1rm),
          deadlift1RM: Number(d.deadlift_1rm), renewalDay: d.renewal_day || undefined,
        });
      }
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

  // Mapeia instâncias de exercícios/sessões para nomes reais a partir dos blocos
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

  const groups = useMemo(() => {
    const byDay = new Map<string, DayGroup>();
    [...logs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .forEach(log => {
        const d = new Date(log.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        const existing = byDay.get(key);
        if (existing) {
          existing.logs.push(log);
          return;
        }
        byDay.set(key, {
          key,
          date: d,
          logs: [log],
          blockName: nameMaps.blockNameById[log.blockId] || "Treino",
          week: log.weekNumber,
          sessionName: nameMaps.sessionNameById[log.sessionId] || "Sessão",
        });
      });
    return [...byDay.values()];
  }, [logs, nameMaps]);

  const filteredGroups = useMemo(() => {
    let byPeriod = groups;
    if (period != null) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - period);
      byPeriod = groups.filter(g => g.date >= cutoff);
    }
    const q = search.trim().toLowerCase();
    if (!q) return byPeriod;
    return byPeriod
      .map(g => ({ ...g, logs: g.logs.filter(l => exerciseName(l.exerciseId).toLowerCase().includes(q)) }))
      .filter(g => g.logs.length > 0);
  }, [groups, search, period, nameMaps]);

  const stats = useMemo(() => {
    let periodLogs = logs;
    if (period != null) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - period);
      periodLogs = logs.filter(l => new Date(l.createdAt) >= cutoff);
    }
    const completed = periodLogs.filter(l => l.completed);
    const totalVolume = periodLogs.reduce((acc, l) => {
      if (l.setsData && l.setsData.length > 0) {
        return acc + l.setsData.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0);
      }
      return acc + (l.weight || 0);
    }, 0);
    return {
      sessions: new Set(periodLogs.map(l => `${l.blockId}-${l.weekNumber}-${l.sessionId}`)).size,
      completedExercises: completed.length,
      totalVolume,
    };
  }, [logs, period]);

  const groupStats = (g: DayGroup) => {
    const sets = g.logs.flatMap(l => l.setsData || []);
    const volume = g.logs.reduce((acc, l) => {
      if (l.setsData && l.setsData.length > 0) {
        return acc + l.setsData.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0);
      }
      return acc + (l.weight || 0);
    }, 0);
    const maxRpe = g.logs.reduce((m, l) => (l.actualRpe != null && l.actualRpe > (m ?? 0) ? l.actualRpe : m), null as number | null);
    return { sets: sets.length, volume, maxRpe };
  };

  const previousLogFor = (log: ExerciseLog): ExerciseLog | null => {
    const prev = logs
      .filter(l => l.exerciseId === log.exerciseId && l.createdAt < log.createdAt && l.completed)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    return prev ?? null;
  };

  if (authLoading || loading) {
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
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => navigate("/aluno")}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <History className="h-4 w-4" />
            <span>Histórico de Treinos</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4 text-center">
            <CalendarCheck className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold">{stats.sessions}</p>
            <p className="text-xs text-muted-foreground">Treinos</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Dumbbell className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold">{stats.completedExercises}</p>
            <p className="text-xs text-muted-foreground">Exercícios concluídos</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Weight className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold truncate">{formatKg(Math.round(stats.totalVolume))}</p>
            <p className="text-xs text-muted-foreground">Volume total</p>
          </CardContent></Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar exercício (ex.: supino, agachamento)..."
            className="pl-9 h-11 text-base sm:text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs text-muted-foreground shrink-0">Período:</span>
          {[
            { label: "7 dias", days: 7 },
            { label: "30 dias", days: 30 },
            { label: "90 dias", days: 90 },
            { label: "Tudo", days: null },
          ].map(opt => (
            <button
              key={opt.label}
              onClick={() => setPeriod(opt.days)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                period === opt.days
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {logsLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filteredGroups.length === 0 ? (
          <Card><CardContent className="py-14 text-center">
            <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground mt-3">
              {logs.length === 0
                ? "Nenhum treino registrado ainda. Registre suas cargas no seu treino para ver o histórico aqui."
                : "Nenhum resultado para a busca."}
            </p>
          </CardContent></Card>
        ) : (
          <div className="space-y-6">
            {filteredGroups.map(group => {
              const gs = groupStats(group);
              return (
                <div key={group.key}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold">{dayLabel(group.date)}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.blockName} · Semana {group.week} · {group.sessionName}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {gs.volume > 0 && (
                        <p><span className="font-semibold text-foreground">{formatKg(Math.round(gs.volume))}</span> volume</p>
                      )}
                      {gs.maxRpe != null && <p>RPE máx {gs.maxRpe}</p>}
                      {gs.sets > 0 && <p>{gs.sets} séries</p>}
                    </div>
                  </div>
                  <Card>
                    <CardContent className="p-3 space-y-2">
                      {group.logs.map(log => {
                        const prev = previousLogFor(log);
                        const delta = prev && log.weight > 0 ? log.weight - prev.weight : null;
                        return (
                          <div key={log.id} className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{exerciseName(log.exerciseId)}</p>
                              <p className="text-xs text-muted-foreground">
                                {log.setsData && log.setsData.length > 0
                                  ? `${log.setsData.length} série${log.setsData.length > 1 ? "s" : ""} · máx ${formatKg(Math.max(...log.setsData.map(s => s.weight || 0)))} · ${log.setsData[0].reps ? log.setsData[0].reps + " reps" : ""}`
                                  : log.weight > 0 ? `Carga ${formatKg(log.weight)}` : "Sem carga registrada"}
                                {log.actualRpe != null && ` · RPE ${log.actualRpe}`}
                              </p>
                              {prev && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Última vez: {formatKg(prev.weight)}
                                  {prev.actualRpe != null ? ` @RPE ${prev.actualRpe}` : ""}
                                  {delta != null && delta !== 0 && (
                                    <span className={delta > 0 ? "text-green-600 dark:text-green-400 font-semibold" : "text-amber-600 dark:text-amber-400 font-semibold"}>
                                      {" "}
                                      {delta > 0 ? <ArrowUp className="h-3 w-3 inline" /> : <ArrowDown className="h-3 w-3 inline" />}
                                      {formatKg(Math.abs(delta))}
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                            {log.completed && (
                              <span className="shrink-0 text-[10px] font-semibold text-green-600 dark:text-green-400">✓ concluído</span>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}

        {!logsLoading && filteredGroups.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Fim do histórico{search && ` para "${search}"`}.
          </p>
        )}
      </main>
    </div>
  );
};

export default StudentHistory;
