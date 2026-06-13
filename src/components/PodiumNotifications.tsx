import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Trophy, Medal, Award, Check } from "lucide-react";
import type { PodiumEvent } from "@/hooks/usePodiumWatcher";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const posIcon = (p: number) => p === 1 ? Trophy : p === 2 ? Medal : Award;
const posColor = (p: number) =>
  p === 1 ? "text-yellow-500" : p === 2 ? "text-slate-400" : "text-amber-700";
const posLabel = (p: number) => p === 1 ? "1º lugar" : p === 2 ? "2º lugar" : "3º lugar";

interface Props {
  events: PodiumEvent[];
  unreadCount: number;
  onAcknowledgeAll: () => void;
}

export function PodiumNotifications({ events, unreadCount, onAcknowledgeAll }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Avisos de Pódio
          {unreadCount > 0 && (
            <Badge className="ml-1 h-5 min-w-5 px-1.5">{unreadCount} novo{unreadCount > 1 ? "s" : ""}</Badge>
          )}
        </CardTitle>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onAcknowledgeAll} className="gap-1 h-8">
            <Check className="h-3.5 w-3.5" /> Marcar como lido
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum aluno entrou no pódio ainda. Quando isso acontecer, você verá aqui.
          </p>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 4).map(ev => {
              const Icon = posIcon(ev.position);
              return (
                <div
                  key={ev.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    ev.acknowledged ? "bg-muted/30" : "bg-primary/5 border-primary/20"
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${posColor(ev.position)}`} />
                  <Avatar className="h-9 w-9 shrink-0">
                    {ev.studentAvatar ? <AvatarImage src={ev.studentAvatar} alt={ev.studentName} className="object-cover" /> : null}
                    <AvatarFallback className="text-xs">
                      {ev.studentName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      <strong>{ev.studentName}</strong> alcançou o {posLabel(ev.position)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Semestre {ev.semester}/{ev.year} • Pontuação {ev.score.toFixed(1)} •{" "}
                      {format(new Date(ev.detectedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {!ev.acknowledged && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
