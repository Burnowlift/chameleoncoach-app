interface Props {
  /** Treinos (sessões) realizados na semana corrente. */
  done: number;
  /** Meta semanal (frequência do bloco). */
  target: number;
}

export function WeeklyGoalRing({ done, target }: Props) {
  const progress = target > 0 ? Math.min(done / target, 1) : 0;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * progress;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-16 w-16 shrink-0">
        <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
          <circle cx="32" cy="32" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={progress >= 1 ? "hsl(var(--success))" : "hsl(var(--primary))"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {progress >= 1 ? (
            <span className="text-sm font-bold text-green-600 dark:text-green-400">✓</span>
          ) : (
            <span className="text-xs font-bold tabular-nums">
              {done}/{target}
            </span>
          )}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold">Meta da semana</p>
        <p className="text-xs text-muted-foreground">
          {progress >= 1
            ? "Meta atingida! Parabéns!"
            : target - done > 0
              ? `Faltam ${target - done} treino${target - done > 1 ? "s" : ""} para bater a meta`
              : "Registre treinos para começar"}
        </p>
      </div>
    </div>
  );
}
