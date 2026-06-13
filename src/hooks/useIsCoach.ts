import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns whether the currently authenticated user is a coach.
 * - `null` while still resolving (loading / not authenticated yet).
 * - `true` if the user's email exists in `coaches`.
 * - `false` otherwise.
 *
 * Use this for in-component render guards (defense in depth).
 * Route-level protection is still handled by <CoachRoute />.
 */
export function useIsCoach(): boolean | null {
  const { user, loading } = useAuth();
  const [isCoach, setIsCoach] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user?.email) {
      setIsCoach(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("coaches")
      .select("id")
      .eq("email", user.email)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsCoach(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.email, loading]);

  return isCoach;
}
