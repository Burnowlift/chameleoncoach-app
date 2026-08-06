import { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";
import { format, startOfWeek, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ExerciseLog } from "@/hooks/useExerciseLogs";

export function RpeTrendChart({ logs }: { logs: ExerciseLog[] }) {
  const data = useMemo(() => {
    const now = new Date();
    const cutoff = subWeeks(now, 12);
    const byWeek = new Map<string, { label: string; total: number; count: number; date: Date }>();
    logs.forEach(log => {
      if (log.actualRpe == null) return;
      const d = new Date(log.createdAt);
      if (d < cutoff) return;
      const start = startOfWeek(d, { weekStartsOn: 1 });
      const key = start.toISOString();
      const entry = byWeek.get(key) ?? { label: format(start, "dd/MM", { locale: ptBR }), total: 0, count: 0, date: d };
      entry.total += log.actualRpe;
      entry.count += 1;
      byWeek.set(key, entry);
    });
    return [...byWeek.values()]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(e => ({ label: e.label, rpe: Math.round((e.total / e.count) * 10) / 10 }));
  }, [logs]);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">Sem RPE registrado nas últimas 12 semanas.</p>;
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis domain={[4, 10]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} />
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
            formatter={(value: number) => [`RPE ${value}`, "Médio"]}
            labelFormatter={(label) => `Semana de ${label}`}
          />
          <ReferenceLine y={7} stroke="hsl(var(--accent-gold))" strokeDasharray="4 4" strokeOpacity={0.5} />
          <Line
            type="monotone"
            dataKey="rpe"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 1.5 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
