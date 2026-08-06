import { Trophy, Medal, Lock } from "lucide-react";
import type { Achievement } from "@/lib/achievements";

export function AchievementsGrid({ achievements }: { achievements: Achievement[] }) {
  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);

  return (
    <div className="space-y-3">
      {unlocked.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Conquistadas ({unlocked.length}/{achievements.length})
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {unlocked.map(a => (
              <div
                key={a.id}
                className="rounded-lg border border-amber-400/40 bg-gradient-to-b from-amber-500/15 to-transparent p-3 text-center"
                title={a.description}
              >
                <Trophy className="h-6 w-6 mx-auto text-amber-500 mb-1" />
                <p className="text-[11px] font-semibold leading-tight">{a.label}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {locked.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            A desbloquear
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {locked.map(a => (
              <div
                key={a.id}
                className="rounded-lg border border-border/60 bg-muted/20 p-3 text-center opacity-60"
                title={a.description}
              >
                <div className="relative inline-block mb-1">
                  <Medal className="h-6 w-6 text-muted-foreground/50" />
                  <Lock className="h-3 w-3 absolute -bottom-0.5 -right-0.5 text-muted-foreground" />
                </div>
                <p className="text-[11px] font-medium leading-tight">{a.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
