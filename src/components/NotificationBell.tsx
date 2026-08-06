import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, BellRing, CheckCheck, Loader2, MessageSquare, ClipboardCheck, Dumbbell, Trophy, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  checkin_response: ClipboardCheck,
  anamnese_completed: Dumbbell,
  podium: Trophy,
  message: MessageSquare,
  training_expiry: CalendarClock,
};

export function NotificationBell() {
  const { notifications, loading, unread, markAsRead, markAllAsRead } = useNotifications();
  const push = usePushSubscription();
  const [open, setOpen] = useState(false);

  const handleTogglePush = async () => {
    if (push.enabled) {
      localStorage.removeItem("cc:push-enabled");
      toast.info("Notificações push desativadas neste dispositivo.");
      return;
    }
    const result = await push.enable();
    if (result.ok) {
      toast.success("Notificações push ativadas! Você será avisado sobre novos check-ins.");
    } else {
      toast.error(result.error ?? "Não foi possível ativar.");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative gap-2 text-muted-foreground"
          title="Notificações"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
          <span className="hidden sm:inline">Notificações</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(340px,calc(100vw-2rem))] p-0">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold">Notificações</p>
          <div className="flex items-center gap-1 flex-wrap">
            {"PushManager" in window && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-muted-foreground"
                onClick={handleTogglePush}
                title={push.enabled ? "Desativar notificações push" : "Ativar notificações push"}
              >
                {push.enabled ? <BellRing className="h-3.5 w-3.5 text-primary" /> : <BellOff className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{push.enabled ? "Push ativo" : "Ativar push"}</span>
              </Button>
            )}
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-muted-foreground"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="sm:hidden">Ler todas</span>
                <span className="hidden sm:inline">Marcar todas como lidas</span>
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-[340px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center">
              <BellOff className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação por enquanto.</p>
            </div>
          ) : (
            notifications.map(n => {
              const Icon = TYPE_ICON[n.type] ?? Bell;
              return (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left border-b border-border/50 transition-colors hover:bg-muted/40",
                    !n.read && "bg-primary/[0.04]",
                  )}
                >
                  <span className={cn(
                    "mt-0.5 shrink-0 p-1.5 rounded-lg",
                    n.read ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary",
                  )}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-snug break-words">{n.title}</span>
                    {n.body && <span className="block text-xs text-muted-foreground mt-0.5 leading-snug break-words">{n.body}</span>}
                    <span className="block text-[10px] text-muted-foreground/70 mt-1">
                      {format(new Date(n.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </span>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
