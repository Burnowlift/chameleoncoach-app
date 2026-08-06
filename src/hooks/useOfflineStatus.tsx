import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import {
  listActions,
  removeAction,
  countActions,
  QUEUE_CHANGED_EVENT,
  type OfflineAction,
} from "@/lib/offline-queue";
import {
  syncUpsertExerciseLog,
  syncToggleCompletedWeek,
  syncAddRmRecord,
} from "@/lib/supabase-sync";

interface OfflineStatus {
  isOnline: boolean;
  pendingCount: number;
  syncing: boolean;
  syncNow: () => Promise<void>;
}

const OfflineStatusContext = createContext<OfflineStatus>({
  isOnline: true,
  pendingCount: 0,
  syncing: false,
  syncNow: async () => {},
});

export function useOfflineStatus() {
  return useContext(OfflineStatusContext);
}

async function replayAction(action: OfflineAction): Promise<void> {
  switch (action.type) {
    case "upsert-log": {
      const { error } = await syncUpsertExerciseLog(action.payload);
      if (error) throw error;
      return;
    }
    case "toggle-week": {
      const { error } = await syncToggleCompletedWeek(action.payload);
      if (error) throw error;
      return;
    }
    case "add-rm-record": {
      const { error } = await syncAddRmRecord(action.payload);
      if (error) throw error;
      return;
    }
  }
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const drainingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    setPendingCount(await countActions());
  }, []);

  const drainQueue = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    setSyncing(true);
    try {
      const actions = await listActions();
      for (const action of actions) {
        try {
          await replayAction(action);
          await removeAction(action.id);
        } catch {
          break;
        }
      }
    } finally {
      drainingRef.current = false;
      setSyncing(false);
      await refreshCount();
    }
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();

    const handleOnline = () => {
      setIsOnline(true);
      drainQueue();
    };
    const handleOffline = () => setIsOnline(false);
    const handleQueueChanged = () => refreshCount();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(QUEUE_CHANGED_EVENT, handleQueueChanged);

    // Mensagem do service worker (Background Sync / volta de conexão)
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "chameleon:sync") {
        setIsOnline(true);
        drainQueue();
      }
    };
    navigator.serviceWorker?.addEventListener?.("message", handleSwMessage);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(QUEUE_CHANGED_EVENT, handleQueueChanged);
      navigator.serviceWorker?.removeEventListener?.("message", handleSwMessage);
    };
  }, [refreshCount, drainQueue]);

  // Ao abrir o app online com registros pendentes (ex.: abriu offline e fechou), tenta sincronizar.
  useEffect(() => {
    if (navigator.onLine) drainQueue();
  }, [drainQueue]);

  const syncNow = useCallback(async () => {
    if (navigator.onLine) await drainQueue();
  }, [drainQueue]);

  return (
    <OfflineStatusContext.Provider value={{ isOnline, pendingCount, syncing, syncNow }}>
      {children}
    </OfflineStatusContext.Provider>
  );
}
