import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Dumbbell, Activity, TrendingUp, Zap, MessageSquare } from "lucide-react";
import { useRanking } from "@/hooks/useRanking";

interface Props { studentId: string; }

export function WeeklySummary({ studentId }: Props) {
  const { entries, loading } = useRanking();
  const me = entries.find(e => e.studentId === studentId);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!me) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Ainda não há dados suficientes para gerar seu progresso.
        </CardContent>
      </Card>
    );
  }

  const xpLoads = me.actualLoadLogs * 10;
  const xpMobility = me.actualMobility * 5;
  const xpMessages = me.actualMessages * 7;
  const totalXp = me.score; // Or xpLoads + xpMobility + xpMessages

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Progresso do Semestre
          </CardTitle>
          <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">
            <Zap className="h-3 w-3 mr-1 fill-current" /> Nível Ativo
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Seu acumulado de XP no semestre atual</p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Overall */}
        <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-4 border border-primary/20">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Total de XP</p>
            <p className="text-3xl font-bold text-primary tabular-nums tracking-tight">
              {totalXp.toFixed(0)} <span className="text-lg font-semibold text-primary/70">XP</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Continue registrando seus treinos, fazendo mobilidade e enviando feedbacks para subir no ranking!
          </p>
        </div>

        {/* Cargas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Dumbbell className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-medium">Cargas registradas</p>
            </div>
            <p className="text-sm font-bold text-foreground">+{xpLoads} XP</p>
          </div>
          <p className="text-xs text-muted-foreground pl-9">
            {me.actualLoadLogs} exercícios com peso preenchido no aplicativo
          </p>
        </div>

        {/* Mobilidade */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-medium">Mobilidade concluída</p>
            </div>
            <p className="text-sm font-bold text-foreground">+{xpMobility} XP</p>
          </div>
          <p className="text-xs text-muted-foreground pl-9">
            {me.actualMobility} marcações de mobilidade feitas
          </p>
        </div>

        {/* Mensagens */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-medium">Comunicação</p>
            </div>
            <p className="text-sm font-bold text-foreground">+{xpMessages} XP</p>
          </div>
          <p className="text-xs text-muted-foreground pl-9">
            {me.actualMessages} dias enviando mensagens ao treinador
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
