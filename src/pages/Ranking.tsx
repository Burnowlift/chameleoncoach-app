import { useState } from "react";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trophy, History, Info, Dumbbell, AlertTriangle, Plus, Minus } from "lucide-react";
import { useRanking, useRankingArchive, getCurrentSemester } from "@/hooks/useRanking";
import { RankingList } from "@/components/RankingList";
import { StrengthRankingSection } from "@/components/StrengthRankingSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { usePodiumWatcher } from "@/hooks/usePodiumWatcher";
import { PodiumNotifications } from "@/components/PodiumNotifications";

export default function Ranking() {
  const { entries, loading } = useRanking();
  const { archive, loading: archiveLoading } = useRankingArchive();
  const { events, unreadCount, acknowledgeAll } = usePodiumWatcher(entries, !loading);
  const cur = getCurrentSemester();
  const [tab, setTab] = useState("current");

  // Group archive by semester
  const grouped = archive.reduce((acc, r) => {
    const key = `${r.year}-S${r.semester}`;
    (acc[key] ||= []).push(r);
    return acc;
  }, {} as Record<string, typeof archive>);

  return (
    <CoachLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Ranking dos Alunos</h1>
            <p className="text-sm text-muted-foreground">
              Semestre {cur.semester} de {cur.year} • janela de avaliação: últimos 7 dias
            </p>
          </div>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" /> Critérios de pontuação
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4 text-sm">
            <div>
              <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-primary" /> Como se ganha pontos
              </p>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>Pontuação de <strong>1.0 a 5.0</strong>, calculada na <strong>janela móvel dos últimos 7 dias</strong>.</li>
                <li><strong>42,5%</strong> — cargas registradas nos treinos prescritos.</li>
                <li><strong>42,5%</strong> — mobilidade marcada como concluída.</li>
                <li><strong>15%</strong> — comunicação com o treinador (meta: mensagens em 3 dias diferentes na semana).</li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
                <Minus className="h-3.5 w-3.5 text-destructive" /> Como se perde pontos
              </p>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>
                  <strong>Mobilidade não feita no dia:</strong> cada dia da janela em que o aluno tem mobilidade prescrita
                  e não registra nenhum item desconta <strong>−0,3 pt</strong> (até o teto de <strong>−1,5 pt</strong>).
                </li>
                <li>
                  <strong>Inatividade total:</strong> dias consecutivos no fim da janela <em>sem nenhum</em> registro
                  (treino, mobilidade ou mensagem). Os <strong>2 primeiros dias são tolerados</strong> como descanso;
                  a partir do 3º dia desconta <strong>−0,3 pt por dia</strong> (até o teto de <strong>−1,5 pt</strong>).
                </li>
                <li>O score final nunca cai abaixo de <strong>1.0</strong>, mesmo com penalidades acumuladas.</li>
              </ul>
              <div className="mt-2 flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-foreground/80">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Voltar a treinar e fazer mobilidade dentro da janela de 7 dias <strong>recupera os pontos automaticamente</strong>
                  — penalidades são recalculadas a cada atualização.
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              O ranking é arquivado automaticamente em <strong>1º de janeiro</strong> e <strong>1º de julho</strong>.
            </p>
          </CardContent>
        </Card>

        <PodiumNotifications events={events} unreadCount={unreadCount} onAcknowledgeAll={acknowledgeAll} />

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="current"><Trophy className="h-4 w-4 mr-1.5" /> Adesão</TabsTrigger>
            <TabsTrigger value="strength"><Dumbbell className="h-4 w-4 mr-1.5" /> Força</TabsTrigger>
            <TabsTrigger value="history"><History className="h-4 w-4 mr-1.5" /> Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="strength" className="mt-4">
            <StrengthRankingSection />
          </TabsContent>

          <TabsContent value="current" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <RankingList entries={entries} />
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-6">
            {archiveLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : Object.keys(grouped).length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
                Nenhum semestre arquivado ainda. O primeiro arquivamento ocorrerá no próximo dia 1º de janeiro ou 1º de julho.
              </CardContent></Card>
            ) : (
              Object.entries(grouped).map(([key, rows]) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Semestre {rows[0].semester} de {rows[0].year}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {rows.map(r => (
                      <div key={r.id} className="flex items-center gap-3 py-1">
                        <span className="w-8 text-sm font-bold text-muted-foreground tabular-nums">{r.position}º</span>
                        <Avatar className="h-9 w-9">
                          {r.studentAvatar ? <AvatarImage src={r.studentAvatar} alt={r.studentName} className="object-cover" /> : null}
                          <AvatarFallback className="text-xs">{r.studentName.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">{r.studentName}</p>
                            <p className="text-sm font-bold text-primary tabular-nums">{r.score.toFixed(1)}</p>
                          </div>
                          <Progress value={(r.score / 5) * 100} className="h-1.5 mt-1" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </CoachLayout>
  );
}
