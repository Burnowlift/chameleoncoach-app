import { useEffect } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import chameleonLogo from "@/assets/chameleon-logo.png";
import {
  dismissInstallPrompt,
  isInstallDismissed,
  isIos,
  usePWAInstall,
} from "@/hooks/usePWAInstall";

interface InstallAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstallAppDialog({ open, onOpenChange }: InstallAppDialogProps) {
  const { canInstall, isInstalled, isMobileDevice, install } = usePWAInstall();
  const isIosDevice = isIos();
  const isForced = new URLSearchParams(window.location.search).has("install");

  // Sugere automaticamente a instalação em todo carregamento de página:
  // - iOS (qualquer caso): sempre
  // - Android/celular: sempre que não estiver instalado
  // - Desktop: apenas quando o navegador disponibiliza o prompt nativo
  // Força com ?install=1 na URL (útil para testar).
  useEffect(() => {
    if (isInstalled) return;
    if (!isForced && isInstallDismissed()) return;

    const shouldSuggest = isForced || isIosDevice || isMobileDevice || canInstall;
    if (!shouldSuggest) return;

    const timer = setTimeout(() => {
      onOpenChange(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [canInstall, isForced, isIosDevice, isInstalled, isMobileDevice, onOpenChange]);

  // Botões manuais (ex.: sidebar) podem abrir o diálogo via evento.
  useEffect(() => {
    const openFromElsewhere = () => {
      if (!isInstalled) onOpenChange(true);
    };
    window.addEventListener("chameleon:open-install-dialog", openFromElsewhere);
    return () => window.removeEventListener("chameleon:open-install-dialog", openFromElsewhere);
  }, [isInstalled, onOpenChange]);

  const handleClose = (next: boolean) => {
    if (!next) dismissInstallPrompt();
    onOpenChange(next);
  };

  const handleInstall = async () => {
    onOpenChange(false);
    await install();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 p-3">
            <img src={chameleonLogo} alt="Chameleon Coach" width={48} height={48} className="rounded-lg" />
          </div>
          <DialogTitle className="text-center">Instale o app do Chameleon</DialogTitle>
          <DialogDescription className="text-center">
            {canInstall
              ? "Acesse seus treinos mais rápido, como um app de verdade — funciona até com pouca internet."
              : "Acesse seus treinos mais rápido, direto da tela inicial do seu celular."}
          </DialogDescription>
        </DialogHeader>

        {canInstall ? (
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            <Download className="h-5 w-5 shrink-0 text-primary" />
            Gratuito e sem ocupar espaço: só um atalho na sua tela inicial.
          </div>
        ) : isIosDevice ? (
          <ol className="mx-auto flex flex-col gap-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Share className="h-4 w-4 shrink-0" />
              Toque em <strong className="text-foreground">Compartilhar</strong> na barra do Safari
            </li>
            <li className="flex items-center gap-2">
              <Download className="h-4 w-4 shrink-0" />
              Toque em <strong className="text-foreground">Adicionar à Tela de Início</strong>
            </li>
          </ol>
        ) : isMobileDevice ? (
          <ol className="mx-auto flex flex-col gap-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 shrink-0" />
              Toque nos <strong className="text-foreground">⋮ (três pontos)</strong> do Chrome
            </li>
            <li className="flex items-center gap-2">
              <Download className="h-4 w-4 shrink-0" />
              Toque em <strong className="text-foreground">Instalar app</strong>
            </li>
          </ol>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            <Download className="h-5 w-5 shrink-0 text-primary" />
            Use o ícone de instalar na barra de endereço do seu navegador.
          </div>
        )}

        <DialogFooter className="sm:justify-center">
          {canInstall ? (
            <>
              <Button variant="ghost" onClick={() => handleClose(false)}>
                <X className="mr-2 h-4 w-4" />
                Agora não
              </Button>
              <Button onClick={handleInstall}>
                <Download className="mr-2 h-4 w-4" />
                Instalar app
              </Button>
            </>
          ) : (
            <Button className="w-full" onClick={() => handleClose(false)}>Entendi</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
