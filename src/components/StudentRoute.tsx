import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export function StudentRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isStudent, setIsStudent] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    const checkStudent = async () => {
      const { data } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      setIsStudent(!!data);
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
  if (!isStudent) return <Navigate to="/students" replace />;

  return <>{children}</>;
}
