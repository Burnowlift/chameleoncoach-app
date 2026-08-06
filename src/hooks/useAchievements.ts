import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeAchievements, type Achievement } from "@/lib/achievements";
import type { ExerciseLog } from "@/hooks/useExerciseLogs";
import type { RmRecord } from "@/hooks/useRmHistory";

/**
 * Conquistas derivadas + desbloqueios persistidos (tabela user_achievements).
 * Persiste automaticamente desbloqueios novos para sincronizar entre dispositivos.
 */
export function useAchievements(logs: ExerciseLog[], rmRecords: RmRecord[]) {
  const [unlockTimes, setUnlockTimes] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_achievements")
        .select("achievement_key, unlocked_at");
      if (cancelled) return;
      const map: Record<string, string> = {};
      (data ?? []).forEach(row => {
        map[row.achievement_key] = row.unlocked_at;
      });
      setUnlockTimes(map);
    })();
    return () => { cancelled = true; };
  }, []);

  const derived = computeAchievements(logs, rmRecords);

  useEffect(() => {
    if (Object.keys(unlockTimes).length === 0) return;
    const pending = derived
      .filter(a => a.unlocked && !unlockTimes[a.id])
      .map(a => a.id);
    if (pending.length === 0 || syncing) return;
    setSyncing(true);
    (async () => {
      const userId = (await supabase.auth.getSession()).data.session?.user.id;
      if (!userId) { setSyncing(false); return; }
      const { error } = await supabase
        .from("user_achievements")
        .upsert(
          pending.map(key => ({ user_id: userId, achievement_key: key })),
          { onConflict: "user_id,achievement_key" },
        );
      if (!error) {
        setUnlockTimes(prev => {
          const next = { ...prev };
          pending.forEach(key => {
            next[key] = new Date().toISOString();
          });
          return next;
        });
      }
      setSyncing(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(unlockTimes), JSON.stringify(derived.map(a => `${a.id}:${a.unlocked}`))]);

  const achievements: Achievement[] = derived.map(a => ({
    ...a,
    unlockedAt: a.unlocked ? unlockTimes[a.id] ?? undefined : undefined,
  }));

  return { achievements };
}
