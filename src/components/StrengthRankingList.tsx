import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { getLiftValue, isGlLift, LIFT_LABELS, type LiftKey, type StrengthEntry } from "@/hooks/useStrengthRanking";
import { formatKg } from "@/lib/utils";

const formatGl = (v: number) => v.toFixed(2).replace(".", ",");

interface Props {
  entries: StrengthEntry[];
  lift: LiftKey;
  highlightStudentId?: string;
  /** If set, only render the top N entries. */
  limit?: number;
  /** When true and the highlighted student is outside the top N, append a separator + their own row. */
  showSelfRow?: boolean;
}

const positionStyle = (pos: number) => {
  if (pos === 1) return { icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30" };
  if (pos === 2) return { icon: Medal, color: "text-slate-400", bg: "bg-slate-400/10 border-slate-400/30" };
  if (pos === 3) return { icon: Award, color: "text-amber-700", bg: "bg-amber-700/10 border-amber-700/30" };
  return null;
};

function StrengthCard({
  entry, pos, isMe, lift, max,
}: { entry: StrengthEntry; pos: number; isMe: boolean; lift: LiftKey; max: number }) {
  const top = positionStyle(pos);
  const Icon = top?.icon;
  const value = getLiftValue(entry, lift);
  const pct = max > 0 ? (value / max) * 100 : 0;
  const gl = isGlLift(lift);
  return (
    <Card className={`transition-all ${top ? top.bg : ""} ${isMe ? "ring-2 ring-primary" : ""}`}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="flex items-center justify-center w-10 shrink-0">
          {Icon ? (
            <Icon className={`h-6 w-6 ${top!.color}`} />
          ) : (
            <span className="text-lg font-bold text-muted-foreground">{pos}º</span>
          )}
        </div>
        <Avatar className="h-12 w-12 border-2 border-background shrink-0">
          {entry.avatar ? <AvatarImage src={entry.avatar} alt={entry.name} className="object-cover" /> : null}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {entry.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="font-semibold truncate">
              {entry.name} {isMe && <Badge variant="outline" className="ml-1">Você</Badge>}
            </p>
            <p className="text-lg font-bold text-primary tabular-nums">
              {gl ? formatGl(value) : formatKg(value, { withUnit: false })}{" "}
              <span className="text-xs font-medium text-muted-foreground">{gl ? "pts" : "kg"}</span>
            </p>
          </div>
          <Progress value={pct} className="h-2" />
          <div className="flex justify-between flex-wrap gap-x-3 text-[11px] text-muted-foreground mt-1.5">
            <span>Agachamento: {formatKg(entry.squat)}</span>
            <span>Supino: {formatKg(entry.bench)}</span>
            <span>Terra: {formatKg(entry.deadlift)}</span>
            <span className="font-semibold text-foreground">Total: {formatKg(entry.total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StrengthRankingList({ entries, lift, highlightStudentId, limit, showSelfRow }: Props) {
  const sorted = useMemo(() => {
    return [...entries]
      .filter(e => getLiftValue(e, lift) > 0)
      .sort((a, b) => getLiftValue(b, lift) - getLiftValue(a, lift) || a.name.localeCompare(b.name));
  }, [entries, lift]);

  const max = sorted.length > 0 ? getLiftValue(sorted[0], lift) : 0;

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground text-sm">
          Nenhum aluno com carga cadastrada para {LIFT_LABELS[lift]}.
        </CardContent>
      </Card>
    );
  }

  const visible = limit ? sorted.slice(0, limit) : sorted;
  const myIdx = highlightStudentId ? sorted.findIndex(e => e.studentId === highlightStudentId) : -1;
  // Only append the self-row when the student exists in the list AND is outside the top N.
  const showExtra = !!(showSelfRow && limit && myIdx >= 0 && myIdx >= limit);

  return (
    <div className="space-y-2">
      {visible.map((e, idx) => (
        <StrengthCard
          key={e.studentId}
          entry={e}
          pos={idx + 1}
          isMe={!!(highlightStudentId && e.studentId === highlightStudentId)}
          lift={lift}
          max={max}
        />
      ))}
      {showExtra && (
        <>
          <div className="text-center text-muted-foreground text-lg leading-none py-1 select-none">···</div>
          <StrengthCard entry={sorted[myIdx]} pos={myIdx + 1} isMe lift={lift} max={max} />
        </>
      )}
    </div>
  );
}
