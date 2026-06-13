import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useMyPermissions } from "@/hooks/useCoachPermissions";
import { ALL_MENUS } from "@/lib/admin";

interface MenuRouteProps {
  menuKey: string;
  children: React.ReactNode;
}

/**
 * Gate de navegação por menu. Deve ser usado dentro de <CoachRoute>.
 * Super admin sempre passa.
 */
export function MenuRoute({ menuKey, children }: MenuRouteProps) {
  const { loading, canAccess, allowedSet, isAdmin } = useMyPermissions();
  const notified = useRef(false);

  const allowed = canAccess(menuKey);

  useEffect(() => {
    if (!loading && !allowed && !notified.current) {
      notified.current = true;
      toast.error("Acesso restrito", {
        description: "Você não tem permissão para acessar esta área.",
      });
    }
  }, [loading, allowed]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowed) {
    const firstAllowed = ALL_MENUS.find((m) => isAdmin || allowedSet.has(m.key));
    if (firstAllowed && firstAllowed.key !== menuKey) {
      return <Navigate to={firstAllowed.url} replace />;
    }
    // Sem nenhum menu liberado: mostra mensagem em vez de redirecionar (evita loop).
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold">Sem acesso liberado</h1>
          <p className="text-sm text-muted-foreground">
            Seu usuário ainda não possui permissões. Solicite ao administrador a liberação dos menus.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
