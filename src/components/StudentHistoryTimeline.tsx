import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useExerciseLogs, type ExerciseLog } from "@/hooks/useExerciseLogs";
import { useTrainingBlocks } from "@/hooks/useTrainingBlocks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarClock, Dumbbell, ExternalLink, Weight } from "lucide-react";
import { format, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatKg } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";

interface WeekSummary {
  blockId: string;
  blockName: string;
  week: number;
  executed: number;
  prescribed: number;
  volume: number;
  firstLog: string;
  lastLog: string;
}

function weekLogs(block: { id: string; weekSessions?: Record<number, { exercises: { id: string }[] }[]>; sessions?: { exercises: { id: string }[] }[] }, week: number, logs: ExerciseLog[]) {
  const prescribed = (block.weekSessions?.[week] || block.sessions || [])
    .reduce((acc, s) => acc + s.exercises.length, 0);
  const weekLogsList = logs.filter(l => l.blockId === block.id && l.weekNumber === week);
  const executed = new Set(
    weekLogsList.filter(l => l.completed).map(l => `${l.sessionId}-${l.exerciseId}`),
  ).size;
  const volume = Math.round(weekLogsList.reduce((acc, l) => {
    if (l.setsData && l.setsData.length > 0) {
      return acc + l.setsData.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0);
    }
    return acc + (l.weight || 0);
  }, 0));
  return { prescribed, executed, volume };
}

export function StudentHistoryTimeline({ studentId }: { studentId: string }) {
  const navigate = useNavigate();
  const { blocks } = useTrainingBlocks(studentId);
  const { logs, loading: logsLoading } = useExerciseLogs(studentId);
  const [studentName, setStudentName] = useState<string>("");

  useEffect(() => {
    supabase.from("students").select("name").eq("id", studentId).maybeSingle().then(({ data }) => {
      if (data) setStudentName(data.name);
    });
  }, [studentId]);

  const weeks = useMemo<WeekSummary[]>(() => {
    const summaries: WeekSummary[] = [];
    blocks.forEach(b => {
      for (let w = 1; w <= (b.duration || 1); w++) {
        const { prescribed, executed, volume } = weekLogs(b, w, logs);
        if (prescribed === 0) continue;
        const weekLogsList = logs.filter(l => l.blockId === b.id && l.weekNumber === w);
        if (weekLogsList.length === 0) continue;
        summaries.push({
          blockId: b.id,
          blockName: b.name,
          week: w,
          executed,
          prescribed,
          volume,
          firstLog: weekLogsList.map(l => l.createdAt).sort()[0],
          lastLog: weekLogsList.map(l => l.createdAt).sort().at(-1)!,
        });
      }
    });
    return summaries.sort((a, b) => new Date(b.lastLog).getTime() - new Date(a.lastLog).getTime());
  }, [blocks, logs]);

  const chartData = useMemo(() => {
    const now = new Date();
    const cutoff = subWeeks(now, 12);
    return weeks
      .filter(w => new Date(w.lastLog) >= cutoff)
      .slice()
      .reverse()
      .map(w => ({
        label: format(new Date(w.lastLog), "dd/MM", { locale: ptBR }),
        adherence: w.prescribed > 0 ? Math.round((w.executed / w.prescribed) * 100) : 0,
      }));
  }, [weeks]);

  const avgAdherence = weeks.length > 0
    ? Math.round((weeks.reduce((acc, w) => acc + w.executed, 0) / weeks.reduce((acc, w) => acc + w.prescribed, 0)) * 100)
    : 0;
  const totalVolume = weeks.reduce((acc, w) => acc + w.volume, 0);

  if (logsLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (weeks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        {studentName || "Este aluno"} ainda não registrou cargas em nenhuma semana. O histórico aparece aqui conforme os treinos forem executados.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <CalendarClock className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-xl font-bold">{weeks.length}</p>
          <p className="text-xs text-muted-foreground">Semanas registradas</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Dumbbell className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-xl font-bold">{avgAdherence}%</p>
          <p className="text-xs text-muted-foreground">Aderência média</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Weight className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-xl font-bold truncate">{formatKg(totalVolume)}</p>
          <p className="text-xs text-muted-foreground">Volume total</p>
        </CardContent></Card>
      </div>

      {/* Aderência por semana */}
      {chartData.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Aderência por semana (últimas 12)
            </p>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 12, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--primary) / 0.06)" }}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      color: "hsl(var(--foreground))",
                      fontSize: 12,
                      boxShadow: "0 8px 24px hsl(0 0% 0% / 0.5)",
                    }}
                    formatter={(value: number) => [`${value}%`, "Aderência"]}
                  />
                  <Bar dataKey="adherence" radius={[6, 6, 0, 0]} maxBarSize={36}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={chartData[i].adherence >= 80 ? "hsl(var(--success))" : chartData[i].adherence >= 50 ? "hsl(var(--primary))" : "hsl(var(--destructive))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline de semanas */}
      <div className="space-y-3">
        {weeks.map(w => {
          const adherence = w.prescribed > 0 ? Math.round((w.executed / w.prescribed) * 100) : 0;
          return (
            <Card key={`${w.blockId}-${w.week}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">
                      {w.blockName} — Semana {w.week}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(w.firstLog), "dd/MM/yy", { locale: ptBR })}
                      {w.lastLog !== w.firstLog && <> a {format(new Date(w.lastLog), "dd/MM/yy", { locale: ptBR })}</>}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${adherence >= 80 ? "text-green-600 dark:text-green-400 border-green-500/40" : adherence >= 50 ? "text-amber-600 dark:text-amber-400 border-amber-500/40" : "text-red-600 dark:text-red-400 border-red-500/40"}`}
                      >
                        {w.executed}/{w.prescribed} exercícios ({adherence}%)
                      </Badge>
                      {w.volume > 0 && (
                        <span className="text-xs text-muted-foreground">{formatKg(w.volume)} volume</span>
                      )}
                    </div>
                    <div className="mt-2 h-1.5 w-full max-w-[260px] rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${adherence >= 80 ? "bg-green-500" : adherence >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(adherence, 100)}%` }}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => navigate(`/students/${studentId}/workout/${w.blockId}/week/${w.week}`)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver semana
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
