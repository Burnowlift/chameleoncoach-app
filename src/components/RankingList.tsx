import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import type { RankingEntry } from "@/hooks/useRanking";

interface Props {
  entries: RankingEntry[];
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

function EntryCard({ entry, pos, isMe }: { entry: RankingEntry; pos: number; isMe: boolean }) {
  const top = positionStyle(pos);
  const Icon = top?.icon;
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
              {entry.penalty > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 text-[10px] px-1.5 py-0 align-middle"
                  title={entry.penalties.map(p => p.reason).join(" • ")}
                >
                  −{entry.penalty.toFixed(1)}
                </Badge>
              )}
            </p>
            <p className="text-lg font-bold text-primary tabular-nums">{entry.score.toFixed(1)}</p>
          </div>
          <Progress value={(entry.score / 5) * 100} className="h-2" />
          <div className="flex justify-between flex-wrap gap-x-3 text-[11px] text-muted-foreground mt-1.5">
            <span>Cargas: {entry.actualLoadLogs}/{entry.expectedLoadLogs || "—"}</span>
            <span>Mobilidade: {entry.actualMobility}/{entry.expectedMobility || "—"}</span>
            <span>Dias c/ msg: {entry.actualMessages}/{entry.expectedMessages}</span>
          </div>
          {entry.penalty > 0 && (
            <p className="text-[11px] text-destructive mt-1 truncate" title={entry.penalties.map(p => p.reason).join(" • ")}>
              {entry.penalties.map(p => p.reason).join(" • ")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function RankingList({ entries, highlightStudentId, limit, showSelfRow }: Props) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground text-sm">
          Ainda não há dados suficientes para gerar o ranking. Registre cargas e cumpra a mobilidade nos próximos dias.
        </CardContent>
      </Card>
    );
  }

  const visible = limit ? entries.slice(0, limit) : entries;
  const myIdx = highlightStudentId ? entries.findIndex(e => e.studentId === highlightStudentId) : -1;
  // Only append the self-row when the student exists in the list AND is outside the top N.
  const showExtra = !!(showSelfRow && limit && myIdx >= 0 && myIdx >= limit);

  return (
    <div className="space-y-2">
      {visible.map((e) => (
        <EntryCard
          key={e.studentId}
          entry={e}
          pos={e.position}
          isMe={!!(highlightStudentId && e.studentId === highlightStudentId)}
        />
      ))}
      {showExtra && (
        <>
          <div className="text-center text-muted-foreground text-lg leading-none py-1 select-none">···</div>
          <EntryCard entry={entries[myIdx]} pos={entries[myIdx].position} isMe />
        </>
      )}
    </div>
  );
}
