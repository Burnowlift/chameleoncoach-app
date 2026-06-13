import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Student } from "@/lib/mock-data";

interface Mark {
  student_id: string;
  card_type: "orange" | "green";
  weekday: number;
  marked_at: string;
}

interface Props {
  students: Student[];
  marks: Mark[];
  includeOrange: boolean;
  /** Quando definido e não-vazio, filtra reativamente as barras e a lista por estes planos. */
  selectedPlans?: string[];
}

const WEEK_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const PLAN_COLORS = [
  "hsl(var(--primary))",
  "#f97316",
  "#3b82f6",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
];

export function StudentsFeedbackMetrics({ students, marks, includeOrange, selectedPlans }: Props) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const planFilterActive = !!selectedPlans && selectedPlans.length > 0;
  const planFilterSet = useMemo(
    () => new Set(selectedPlans ?? []),
    [selectedPlans],
  );

  const visibleStudents = useMemo(
    () => (planFilterActive ? students.filter((s) => planFilterSet.has(s.plan)) : students),
    [students, planFilterActive, planFilterSet],
  );

  const recentMarks = useMemo(
    () =>
      marks.filter(
        (m) =>
          new Date(m.marked_at).getTime() >= cutoff &&
          (includeOrange || m.card_type === "green"),
      ),
    [marks, includeOrange, cutoff],
  );

  const studentById = useMemo(
    () => Object.fromEntries(visibleStudents.map((s) => [s.id, s])),
    [visibleStudents],
  );

  const plans = useMemo(
    () => Array.from(new Set(visibleStudents.map((s) => s.plan))).filter(Boolean),
    [visibleStudents],
  );

  const chartData = useMemo(() => {
    return WEEK_ORDER.map((wd, idx) => {
      const row: Record<string, string | number> = { day: WEEK_LABELS[idx] };
      for (const plan of plans) row[plan] = 0;
      const seen: Record<string, Set<string>> = {};
      for (const m of recentMarks) {
        if (m.weekday !== wd) continue;
        const s = studentById[m.student_id];
        if (!s) continue;
        if (!seen[s.plan]) seen[s.plan] = new Set();
        seen[s.plan].add(s.id);
      }
      for (const plan of plans) row[plan] = seen[plan]?.size ?? 0;
      return row;
    });
  }, [recentMarks, plans, studentById]);

  const leastResponded = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of visibleStudents) counts[s.id] = 0;
    for (const m of recentMarks) {
      if (counts[m.student_id] !== undefined) counts[m.student_id]++;
    }
    return visibleStudents
      .map((s) => ({ student: s, count: counts[s.id] ?? 0 }))
      .sort((a, b) => a.count - b.count)
      .slice(0, 5);
  }, [visibleStudents, recentMarks]);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Métricas de resposta (últimos 30 dias)</h2>
            <p className="text-[11px] text-muted-foreground">
              Alunos respondidos por dia da semana, segmentados por plano
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {plans.map((plan, i) => (
                  <Bar
                    key={plan}
                    dataKey={plan}
                    fill={PLAN_COLORS[i % PLAN_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Menos respondidos
            </h3>
            <div className="space-y-1.5">
              {leastResponded.map(({ student, count }) => (
                <div
                  key={student.id}
                  className="flex items-center gap-2 p-1.5 rounded-md border bg-muted/30"
                >
                  <Avatar className="h-7 w-7">
                    {student.avatar ? <AvatarImage src={student.avatar} /> : null}
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{student.name}</p>
                    <p className="text-[10px] text-muted-foreground">{student.plan}</p>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </div>
              ))}
              {leastResponded.length === 0 && (
                <p className="text-[11px] text-muted-foreground">Sem dados ainda.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
