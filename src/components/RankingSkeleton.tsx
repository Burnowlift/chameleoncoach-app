import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  /** How many skeleton rows to render. Defaults to 5 (matches student top-5 view). */
  count?: number;
}

/**
 * Loading placeholder for ranking lists. Mirrors the layout of RankingList /
 * StrengthRankingList cards (position slot · avatar · name + progress bar)
 * to avoid layout shift when the real data arrives.
 */
export function RankingSkeleton({ count = 5 }: Props) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Carregando ranking">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-center gap-4">
            <Skeleton className="h-6 w-6 rounded-full shrink-0" />
            <Skeleton className="h-12 w-12 rounded-full shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-10" />
              </div>
              <Skeleton className="h-2 w-full" />
              <div className="flex justify-between gap-2 pt-0.5">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
