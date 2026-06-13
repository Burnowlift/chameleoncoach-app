import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, Sparkles, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useRanking, useRankingArchive, getCurrentSemester, type ArchivedRanking } from "@/hooks/useRanking";
import { RankingList } from "@/components/RankingList";
import { RankingSkeleton } from "@/components/RankingSkeleton";
import { toast } from "sonner";

const podiumLabel = (pos: number) =>
  pos === 1 ? "🥇 1º lugar" : pos === 2 ? "🥈 2º lugar" : "🥉 3º lugar";

const podiumIcon = (pos: number) =>
  pos === 1 ? Trophy : pos === 2 ? Medal : Award;

const podiumColor = (pos: number) =>
  pos === 1 ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/30"
  : pos === 2 ? "text-slate-400 bg-slate-400/10 border-slate-400/30"
  : "text-amber-700 bg-amber-700/10 border-amber-700/30";

const CURRENT_KEY = "current";

export function StudentRankingSection({ studentId }: { studentId: string }) {
  const { entries, loading } = useRanking();
  const { archive, loading: archiveLoading } = useRankingArchive();
  const cur = getCurrentSemester();
  const [selected, setSelected] = useState<string>(CURRENT_KEY);

  // Build list of available semesters from archive (most recent first).
  const semesterOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { key: string; label: string }[] = [
      { key: CURRENT_KEY, label: `Atual — Semestre ${cur.semester}/${cur.year}` },
    ];
    archive.forEach(r => {
      const key = `${r.year}-S${r.semester}`;
      if (!seen.has(key)) {
        seen.add(key);
        opts.push({ key, label: `Semestre ${r.semester}/${r.year}` });
      }
    });
    return opts;
  }, [archive, cur.semester, cur.year]);

  const isCurrent = selected === CURRENT_KEY;
  const archivedRows = useMemo<ArchivedRanking[]>(
    () => isCurrent ? [] : archive.filter(r => `${r.year}-S${r.semester}` === selected),
    [archive, selected, isCurrent]
  );

  const myEntry = isCurrent ? entries.find(e => e.studentId === studentId) : undefined;
  const myPos = isCurrent
    ? (myEntry?.position ?? 0)
    : (archivedRows.find(r => r.studentId === studentId)?.position ?? 0);
  const myScore = isCurrent
    ? myEntry?.score
    : archivedRows.find(r => r.studentId === studentId)?.score;
  const showSummary = myPos > 0 && myScore !== undefined;
  const onPodium = myPos >= 1 && myPos <= 3 && isCurrent;

  // Notify once per (semester + position) when student reaches the podium of the CURRENT semester.
  useEffect(() => {
    if (loading || !onPodium || myScore === undefined) return;
    const key = `podium-notified:${studentId}:${cur.year}-S${cur.semester}:${myPos}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    toast.success(`Você está no pódio! ${podiumLabel(myPos)} do semestre ${cur.semester}/${cur.year}`, {
      description: `Pontuação ${myScore.toFixed(1)} — continue assim para manter a posição!`,
      duration: 8000,
    });
  }, [loading, onPodium, myPos, studentId, cur.year, cur.semester, myScore]);

  const Icon = onPodium ? podiumIcon(myPos) : Trophy;
  const isLoading = isCurrent ? loading : archiveLoading;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Ranking
            </CardTitle>
            {showSummary && (
              <p className="text-sm text-muted-foreground mt-1">
                Sua posição: <strong className="text-foreground">{myPos}º</strong> • Pontuação: <strong className="text-primary">{myScore!.toFixed(1)}</strong>
              </p>
            )}
          </div>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-[230px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {semesterOptions.map(o => (
                <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex gap-3">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/90 leading-relaxed">
            <strong>Este ranking não visa mostrar sua evolução, e sim seu comprometimento com a consultoria.</strong>{" "}
            Alunos com mais pontos tendem a ter melhores resultados. Caso sua pontuação esteja baixa, busque melhorar —{" "}
            <strong>os top 3 do ranking ganham prêmios semestralmente</strong>. 🏆
          </p>
        </div>
        {isCurrent && myEntry && myEntry.penalty > 0 && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 animate-fade-in">
            <p className="text-sm font-semibold text-destructive">
              −{myEntry.penalty.toFixed(1)} pts esta semana
            </p>
            <ul className="mt-1 text-xs text-destructive/90 list-disc list-inside space-y-0.5">
              {myEntry.penalties.map((p, i) => (
                <li key={i}>{p.reason} <span className="opacity-70">(−{p.points.toFixed(1)})</span></li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Volte a treinar e fazer mobilidade para recuperar pontos.
            </p>
          </div>
        )}
        {onPodium && myScore !== undefined && (
          <div className={`rounded-xl border p-4 flex items-center gap-3 animate-fade-in ${podiumColor(myPos)}`}>
            <Icon className="h-8 w-8 shrink-0" />
            <div className="flex-1">
              <p className="font-bold flex items-center gap-1.5">
                Parabéns! Você está no pódio <Sparkles className="h-4 w-4" />
              </p>
              <p className="text-sm opacity-90">
                {podiumLabel(myPos)} com pontuação <strong>{myScore.toFixed(1)}</strong>. Mantenha a consistência nos próximos 7 dias para garantir a vaga.
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <RankingSkeleton count={5} />
        ) : isCurrent ? (
          <RankingList entries={entries} highlightStudentId={studentId} limit={4} showSelfRow />
        ) : archivedRows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum dado arquivado para este semestre.
          </p>
        ) : (
          <ArchivedRankingList rows={archivedRows} highlightStudentId={studentId} limit={4} showSelfRow />
        )}
      </CardContent>
    </Card>
  );
}

function ArchivedRow({ r, isMe }: { r: ArchivedRanking; isMe: boolean }) {
  return (
    <Card className={isMe ? "ring-2 ring-primary" : ""}>
      <CardContent className="p-3 flex items-center gap-3">
        <span className="w-8 text-sm font-bold text-muted-foreground tabular-nums">{r.position}º</span>
        <Avatar className="h-10 w-10">
          {r.studentAvatar ? <AvatarImage src={r.studentAvatar} alt={r.studentName} className="object-cover" /> : null}
          <AvatarFallback className="text-xs">
            {r.studentName.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium truncate">
              {r.studentName} {isMe && <Badge variant="secondary" className="ml-1">Você</Badge>}
            </p>
            <p className="text-sm font-bold text-primary tabular-nums">{r.score.toFixed(1)}</p>
          </div>
          <Progress value={(r.score / 5) * 100} className="h-1.5 mt-1.5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ArchivedRankingList({
  rows, highlightStudentId, limit, showSelfRow,
}: { rows: ArchivedRanking[]; highlightStudentId: string; limit?: number; showSelfRow?: boolean }) {
  const visible = limit ? rows.slice(0, limit) : rows;
  const myIdx = rows.findIndex(r => r.studentId === highlightStudentId);
  // Only append the self-row when the student exists in the archive AND is outside the top N.
  const showExtra = !!(showSelfRow && limit && myIdx >= 0 && myIdx >= limit);
  return (
    <div className="space-y-2">
      {visible.map(r => (
        <ArchivedRow key={r.id} r={r} isMe={r.studentId === highlightStudentId} />
      ))}
      {showExtra && (
        <>
          <div className="text-center text-muted-foreground text-lg leading-none py-1 select-none">···</div>
          <ArchivedRow r={rows[myIdx]} isMe />
        </>
      )}
    </div>
  );
}
