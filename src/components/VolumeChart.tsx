import { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { format, startOfWeek, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ExerciseLog } from "@/hooks/useExerciseLogs";
import { formatKg } from "@/lib/utils";

const WEEK_LABEL = (d: Date) => format(d, "dd/MM", { locale: ptBR });

function weekKey(d: Date): string {
  const start = startOfWeek(d, { weekStartsOn: 1 });
  return start.toISOString();
}

function volumeOf(log: ExerciseLog): number {
  if (log.setsData && log.setsData.length > 0) {
    return log.setsData.reduce((acc, s) => acc + (s.weight || 0) * (s.reps || 0), 0);
  }
  return log.weight || 0;
}

export function VolumeChart({ logs }: { logs: ExerciseLog[] }) {
  const data = useMemo(() => {
    const now = new Date();
    const cutoff = subWeeks(now, 12);
    const byWeek = new Map<string, { label: string; volume: number; date: Date }>();
    logs.forEach(log => {
      const d = new Date(log.createdAt);
      if (d < cutoff) return;
      const key = weekKey(d);
      const entry = byWeek.get(key) ?? { label: WEEK_LABEL(startOfWeek(d, { weekStartsOn: 1 })), volume: 0, date: d };
      entry.volume += volumeOf(log);
      byWeek.set(key, entry);
    });
    return [...byWeek.values()]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(e => ({ label: e.label, volume: Math.round(e.volume) }));
  }, [logs]);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">Sem volume registrado nas últimas 12 semanas.</p>;
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 12, left: -14, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} unit="kg" />
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
            formatter={(value: number) => [formatKg(value), "Volume"]}
            labelFormatter={(label) => `Semana de ${label}`}
          />
          <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
