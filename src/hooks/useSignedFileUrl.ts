import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SIGNED_URL_TTL = 60 * 60 * 24; // 24h — suficiente para exibição on-demand

/**
 * Resolve um caminho do bucket privado anamnese-files em uma signed URL.
 * Renova automaticamente se o caminho mudar; retorna null enquanto carrega
 * ou quando o usuário não tem permissão.
 */
export function useSignedFileUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!path) {
      setUrl(null);
      return;
    }

    setUrl(null);
    supabase.storage
      .from("anamnese-files")
      .createSignedUrl(path, SIGNED_URL_TTL)
      .then(({ data, error }) => {
        if (active && data && !error) setUrl(data.signedUrl);
      })
      .catch(() => {
        if (active) setUrl(null);
      });

    return () => {
      active = false;
    };
  }, [path]);

  return url;
}
