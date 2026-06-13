import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isAdminCoach } from "@/lib/admin";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Gate exclusivo do super admin (brunorodriguesconsul@gmail.com).
 * Deve ser usado dentro de <CoachRoute>.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading } = useAuth();
  const notifiedRef = useRef(false);

  const allowed = isAdminCoach(user?.email);

  useEffect(() => {
    if (!loading && user && !allowed && !notifiedRef.current) {
      notifiedRef.current = true;
      toast.error("Acesso restrito", {
        description: "Esta área é exclusiva do administrador.",
      });
    }
  }, [loading, user, allowed]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login-treinador" replace />;
  if (!allowed) return <Navigate to="/students" replace />;

  return <>{children}</>;
}
