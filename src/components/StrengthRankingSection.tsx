import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dumbbell } from "lucide-react";
import { useStrengthRanking, LIFT_LABELS, type LiftKey } from "@/hooks/useStrengthRanking";
import { StrengthRankingList } from "@/components/StrengthRankingList";
import { RankingSkeleton } from "@/components/RankingSkeleton";

interface Props {
  highlightStudentId?: string;
  /** Compact header for embedding in dashboards. */
  compact?: boolean;
  /** If set, only render the top N entries. */
  limit?: number;
  /** When true and the highlighted student is outside the top N, append a separator + their own row. */
  showSelfRow?: boolean;
}

export function StrengthRankingSection({ highlightStudentId, compact = false, limit, showSelfRow }: Props) {
  const { entries, loading } = useStrengthRanking();
  const [lift, setLift] = useState<LiftKey>("total");

  return (
    <Card>
      <CardHeader className={compact ? "pb-3" : undefined}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className={`${compact ? "text-lg" : "text-xl"} flex items-center gap-2`}>
              <Dumbbell className="h-5 w-5 text-primary" />
              Ranking de Força
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Baseado nas cargas (1RM) cadastradas no perfil de cada aluno.
            </p>
          </div>
          <Select value={lift} onValueChange={(v) => setLift(v as LiftKey)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="total">{LIFT_LABELS.total}</SelectItem>
                <SelectItem value="squat">{LIFT_LABELS.squat}</SelectItem>
                <SelectItem value="bench">{LIFT_LABELS.bench}</SelectItem>
                <SelectItem value="deadlift">{LIFT_LABELS.deadlift}</SelectItem>
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  GL Points (IPF)
                </SelectLabel>
                <SelectItem value="gl_total">{LIFT_LABELS.gl_total}</SelectItem>
                <SelectItem value="gl_squat">{LIFT_LABELS.gl_squat}</SelectItem>
                <SelectItem value="gl_bench">{LIFT_LABELS.gl_bench}</SelectItem>
                <SelectItem value="gl_deadlift">{LIFT_LABELS.gl_deadlift}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <RankingSkeleton count={limit ?? 5} />
        ) : (
          <StrengthRankingList entries={entries} lift={lift} highlightStudentId={highlightStudentId} limit={limit} showSelfRow={showSelfRow} />
        )}
      </CardContent>
    </Card>
  );
}
