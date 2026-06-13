import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Dumbbell, Activity, TrendingUp, Flame, MessageSquare } from "lucide-react";
import { useRanking } from "@/hooks/useRanking";

interface Props { studentId: string; }

const consistencyLabel = (rate: number) => {
  if (rate >= 0.9) return { label: "Excelente", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-center" };
  if (rate >= 0.7) return { label: "Muito bom", color: "bg-primary/15 text-primary border-primary/30 text-center" };
  if (rate >= 0.4) return { label: "Regular", color: "bg-amber-500/15 text-amber-600 border-amber-500/30 text-center" };
  return { label: "Precisa melhorar", color: "bg-rose-500/15 text-rose-600 border-rose-500/30 text-center" };
};

const motivationalTip = (loadRate: number, mobRate: number, msgRate: number) => {
  if (loadRate >= 0.8 && mobRate >= 0.8 && msgRate >= 0.8) return "Você está mandando muito bem! Mantenha esse ritmo.";
  if (msgRate < 0.4) return "Que tal mandar uma mensagem para o treinador comentando como foi seu treino?";
  if (loadRate < 0.5 && mobRate < 0.5) return "Comece pequeno: registre as cargas do próximo treino e marque um dia de mobilidade hoje.";
  if (loadRate < mobRate) return "Sua mobilidade está em dia! Foque em registrar as cargas dos próximos treinos.";
  return "Ótimo trabalho com as cargas! Reserve alguns minutos para a mobilidade nos próximos dias.";
};

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
          Ainda não há dados suficientes para gerar seu resumo semanal.
        </CardContent>
      </Card>
    );
  }

  const loadPct = Math.round(me.loadFillRate * 100);
  const mobPct = Math.round(me.mobilityRate * 100);
  const msgPct = Math.round(me.messageRate * 100);
  const overall = (me.loadFillRate + me.mobilityRate + me.messageRate) / 3;
  const overallPct = Math.round(overall * 100);
  const status = consistencyLabel(overall);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Resumo da Semana
          </CardTitle>
          <Badge variant="outline" className={status.color}>
            <Flame className="h-3 w-3 mr-1" /> {status.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Sua consistência nos últimos 7 dias</p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Overall */}
        <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-4 border border-primary/20">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Consistência geral</p>
            <p className="text-3xl font-bold text-primary tabular-nums">{overallPct}%</p>
          </div>
          <Progress value={overallPct} className="h-2.5" />
          <p className="text-xs text-muted-foreground mt-2">{motivationalTip(me.loadFillRate, me.mobilityRate, me.messageRate)}</p>
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
            <p className="text-sm font-semibold tabular-nums">{loadPct}%</p>
          </div>
          <Progress value={loadPct} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {me.actualLoadLogs} de {me.expectedLoadLogs || "—"} exercícios com peso preenchido
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
            <p className="text-sm font-semibold tabular-nums">{mobPct}%</p>
          </div>
          <Progress value={mobPct} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {me.actualMobility} de {me.expectedMobility || "—"} marcações nos últimos 7 dias
          </p>
        </div>

        {/* Mensagens */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-medium">Comunicação com o treinador</p>
            </div>
            <p className="text-sm font-semibold tabular-nums">{msgPct}%</p>
          </div>
          <Progress value={msgPct} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {me.actualMessages} de {me.expectedMessages} dias com mensagem ao treinador (meta semanal — só conta 1 por dia)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
