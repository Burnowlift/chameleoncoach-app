import { useCallback, useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "chameleon_pwa_install_dismissed_at";

/** Se o usuário dispensou o convite recentemente (7 dias; ignorado em localhost para facilitar testes). */
export function isInstallDismissed(): boolean {
  try {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return false;
    }
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function dismissInstallPrompt(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // storage pode estar indisponível (modo privado etc.)
  }
}

/** Se o app já está rodando em modo standalone (instalado). */
export function isStandalone(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;
}

/** Detecta Safari/iOS (onde o install é feito via "Adicionar à Tela de Início"). */
export function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function usePWAInstall() {
  const isMobileDevice = useIsMobile();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
    } catch {
      // prompt indisponível neste momento
    }
    setDeferredPrompt(null);
    return true;
  }, [deferredPrompt]);

  return {
    /** O navegador disponibilizou o prompt nativo de instalação (Chrome/Edge/Android). */
    canInstall: !!deferredPrompt && !installed,
    /** Já rodando como app instalado. */
    isInstalled: installed,
    isMobileDevice,
    install,
  };
}
