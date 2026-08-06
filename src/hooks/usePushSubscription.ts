import { useCallback, useEffect, useState } from "react";
import { VAPID_PUBLIC_KEY, PUSH_ENABLED_KEY } from "@/config/push";
import { supabase } from "@/integrations/supabase/client";

function isSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function subscribeToPush() {
  const reg = await navigator.serviceWorker.ready;
  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY,
    });
  }
  const json = subscription.toJSON();
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-push-subscription`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ""}`,
      },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      }),
    },
  );
  if (!res.ok) throw new Error("Falha ao registrar inscrição");
}

export function usePushSubscription() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(PUSH_ENABLED_KEY) === "1");

  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(async () => {
      try {
        await subscribeToPush();
      } catch (e) {
        console.warn("Push indisponível (função não publicada?)", e);
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [enabled]);

  const enable = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!isSupported()) return { ok: false, error: "Este navegador não suporta notificações." };
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, error: "Permissão negada nas configurações do navegador." };
    try {
      await subscribeToPush();
      localStorage.setItem(PUSH_ENABLED_KEY, "1");
      setEnabled(true);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? "Falha ao ativar notificações." };
    }
  }, []);

  return { enabled, enable };
}
