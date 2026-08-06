import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Dispara a geração das notificações de fichas de treino próximas do
 * vencimento (complementa o job do pg_cron quando ele não está ativo).
 * A função do banco é idempotente: não cria duplicatas para o mesmo
 * vencimento, então chamadas repetidas são seguras.
 */
export function useTrainingExpiryNotifier() {
  useEffect(() => {
    supabase
      .rpc("fn_notify_training_expiry")
      .then(({ error }) => {
        if (error) {
          console.warn("fn_notify_training_expiry:", error.message);
        }
      });
  }, []);
}
