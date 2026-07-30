import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface StudentRouteProps {
  children: React.ReactNode;
  /** Pular verificação de anamnese (usado na própria rota /aluno/anamnese) */
  skipAnamneseCheck?: boolean;
}

export function StudentRoute({ children, skipAnamneseCheck = false }: StudentRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const [isStudent, setIsStudent] = useState<boolean | null>(null);
  const [anamneseCompleted, setAnamneseCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    const checkStudent = async () => {
      const { data } = await supabase
        .from("students")
        .select("id, anamnese_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      setIsStudent(!!data);
      setAnamneseCompleted(data?.anamnese_completed ?? null);
    };

    checkStudent();
  }, [user, authLoading]);

  if (authLoading || (user && isStudent === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/aluno/login" replace />;
  if (!isStudent) return <Navigate to="/" replace />;

  // Redireciona para anamnese se não completou (e não está já na rota de anamnese)
  if (!skipAnamneseCheck && anamneseCompleted === false) {
    return <Navigate to="/aluno/anamnese" replace />;
  }

  return <>{children}</>;
}
