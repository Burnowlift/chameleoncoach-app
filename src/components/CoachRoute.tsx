import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export function CoachRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isCoach, setIsCoach] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    const checkCoach = async () => {
      const { data } = await supabase
        .from("coaches")
        .select("id")
        .eq("email", user.email!)
        .maybeSingle();

      setIsCoach(!!data);
    };

    checkCoach();
  }, [user, authLoading]);

  if (authLoading || (user && isCoach === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login-treinador" replace />;
  if (!isCoach) return <Navigate to="/aluno" replace />;

  return <>{children}</>;
}
