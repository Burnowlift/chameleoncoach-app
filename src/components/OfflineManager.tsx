import { useEffect } from "react";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { WifiOff, CloudUpload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function OfflineManager() {
  const { isOnline, pendingCount, syncing } = useOfflineStatus();

  useEffect(() => {
    if (syncing) {
      toast.info("Sincronizando seus registros...");
    }
  }, [syncing]);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-amber-950/95 border border-amber-500/40 text-amber-100 text-xs sm:text-sm px-4 py-2 shadow-lg">
        {syncing ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          <WifiOff className="h-4 w-4 shrink-0" />
        )}
        <span>
          {syncing
            ? "Sincronizando registros..."
            : "Você está offline — seus registros serão salvos localmente e sincronizados quando a conexão voltar."}
        </span>
        {pendingCount > 0 && !syncing && (
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 font-semibold">
            <CloudUpload className="h-3 w-3" />
            {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
