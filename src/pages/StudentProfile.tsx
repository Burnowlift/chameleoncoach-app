import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CoachLayout } from "@/components/CoachLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Calendar, Activity, ClipboardList, TrendingUp, AlertCircle, FileText, Download, CheckCircle2, MessageSquare, Camera, Trophy, RefreshCw } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useAnamnese } from "@/hooks/useAnamnese";
import { SignedAnamneseImg, SignedAnamneseLink, SignedAnamnesePhoto } from "@/components/SignedAnamneseFile";
import { useStudentCheckins } from "@/hooks/useCheckins";
import { StudentWorkoutPage } from "@/components/StudentWorkoutDialog";
import { StudentHistoryTimeline } from "@/components/StudentHistoryTimeline";
import { StudentMobilityContent } from "@/pages/StudentMobility";
import { StudentNotesTab } from "@/components/StudentNotesTab";
import { BodyWeightHistorySection } from "@/components/BodyWeightHistorySection";
import { RmEvolutionChart } from "@/components/RmEvolutionChart";
import { useRmHistory } from "@/hooks/useRmHistory";
import { MeetAttemptsTab } from "@/components/MeetAttemptsTab";
import { useStudents } from "@/hooks/useStudents";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function StudentProfile() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { students, loading: studentsLoading } = useStudents();
  
  const student = students.find((s) => s.id === studentId);
  const { anamnese, loading: anamneseLoading } = useAnamnese(studentId);
  const { checkins, loading: checkinsLoading, completedCount, totalCount, adherenceRate, alerts, addCoachComment, forceCheckin } = useStudentCheckins(studentId);
  const { records: rmRecords, loading: rmLoading } = useRmHistory(studentId);
  
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [savingComment, setSavingComment] = useState<string | null>(null);
  const [requestingNewAnamnese, setRequestingNewAnamnese] = useState(false);
  const [newAnamneseDialogOpen, setNewAnamneseDialogOpen] = useState(false);

  if (studentsLoading || !student) {
    return (
      <CoachLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CoachLayout>
    );
  }

  const handleSaveComment = async (checkinId: string) => {
    const comment = commentInputs[checkinId];
    if (!comment?.trim()) return;
    setSavingComment(checkinId);
    try {
      await addCoachComment(checkinId, comment.trim());
      toast.success("Comentário salvo com sucesso.");
    } catch {
      toast.error("Erro ao salvar comentário.");
    }
    setSavingComment(null);
  };

  const handleRequestNewAnamnese = async () => {
    if (!studentId) return;
    setRequestingNewAnamnese(true);
    try {
      // 1. Deletar a anamnese atual
      const { error: deleteError } = await supabase
        .from("anamneses")
        .delete()
        .eq("student_id", studentId);
      if (deleteError) throw deleteError;

      // 2. Resetar flag no students
      const { error: updateError } = await supabase
        .from("students")
        .update({ anamnese_completed: false } as any)
        .eq("id", studentId);
      if (updateError) throw updateError;

      toast.success("Nova anamnese solicitada! O aluno será redirecionado ao acessar o app.");
      setNewAnamneseDialogOpen(false);
      // Recarregar a página para refletir as mudanças
      window.location.reload();
    } catch (err: any) {
      console.error("Erro ao solicitar nova anamnese:", err);
      toast.error("Erro ao solicitar nova anamnese.");
    }
    setRequestingNewAnamnese(false);
  };

  return (
    <CoachLayout>
      <div className="space-y-6 w-full max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center gap-4 print:hidden">
          <Button variant="ghost" size="icon" onClick={() => navigate("/students")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-12 w-12 border border-primary/20">
            {student.avatar ? (
              <AvatarImage src={student.avatar} alt={student.name} className="object-cover" />
            ) : null}
            <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
              {student.name.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              {student.name}
              {student.selfRegistered && <Badge className="bg-blue-600">Novo</Badge>}
            </h1>
            <p className="text-sm text-muted-foreground">{student.email}</p>
          </div>
        </div>

        <Tabs defaultValue="anamnese" className="w-full">
          <TabsList className="grid grid-cols-7 w-full h-auto rounded-lg bg-muted/50 p-1 print:hidden">
            <TabsTrigger value="anamnese" className="py-2 text-xs sm:text-sm gap-2">
              <ClipboardList className="h-4 w-4" /> <span className="hidden sm:inline">Anamnese</span>
            </TabsTrigger>
            <TabsTrigger value="checkins" className="py-2 text-xs sm:text-sm gap-2 relative">
              <Calendar className="h-4 w-4" /> <span className="hidden sm:inline">Check-ins</span>
              {alerts.length > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-destructive" />
              )}
            </TabsTrigger>
            <TabsTrigger value="treinos" className="py-2 text-xs sm:text-sm gap-2">
              <Activity className="h-4 w-4" /> <span className="hidden sm:inline">Treinos</span>
            </TabsTrigger>
            <TabsTrigger value="mobilidade" className="py-2 text-xs sm:text-sm gap-2">
              <Activity className="h-4 w-4" /> <span className="hidden sm:inline">Mobilidade</span>
            </TabsTrigger>
            <TabsTrigger value="evolucao" className="py-2 text-xs sm:text-sm gap-2">
              <TrendingUp className="h-4 w-4" /> <span className="hidden sm:inline">Evolução</span>
            </TabsTrigger>
            <TabsTrigger value="anotacoes" className="py-2 text-xs sm:text-sm gap-2">
              <FileText className="h-4 w-4" /> <span className="hidden sm:inline">Anotações</span>
            </TabsTrigger>
            <TabsTrigger value="campeonato" className="py-2 text-xs sm:text-sm gap-2">
              <Trophy className="h-4 w-4" /> <span className="hidden sm:inline">Campeonato</span>
            </TabsTrigger>
          </TabsList>

          {/* ABA ANAMNESE */}
          <TabsContent value="anamnese" className="mt-6 space-y-6">
            {anamneseLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : anamnese?.status === "completed" ? (
              <>
                <div className="flex justify-end">
                  <AlertDialog open={newAnamneseDialogOpen} onOpenChange={setNewAnamneseDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 text-amber-600 border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-700">
                        <RefreshCw className="h-4 w-4" />
                        Solicitar Nova Anamnese
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Solicitar Nova Anamnese?</AlertDialogTitle>
                        <AlertDialogDescription>
                          A anamnese atual será apagada e o aluno precisará preencher uma nova ao acessar o app. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={requestingNewAnamnese}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleRequestNewAnamnese}
                          disabled={requestingNewAnamnese}
                          className="bg-amber-600 hover:bg-amber-700 gap-2"
                        >
                          {requestingNewAnamnese ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</>
                          ) : (
                            "Confirmar"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" /> Dados Pessoais
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2"><span className="text-muted-foreground block text-xs">E-mail</span><span className="font-medium break-all">{student.email}</span></div>
                        <div><span className="text-muted-foreground block text-xs">Telefone</span><span className="font-medium">{student.phone || "-"}</span></div>
                        <div><span className="text-muted-foreground block text-xs">CPF</span><span className="font-medium">{student.cpf || "-"}</span></div>
                        <div><span className="text-muted-foreground block text-xs">Sexo</span><span className="font-medium">{anamnese.sexo === 'M' ? 'Masculino' : 'Feminino'}</span></div>
                        <div><span className="text-muted-foreground block text-xs">Nascimento</span><span className="font-medium">{anamnese.data_nascimento ? format(new Date(anamnese.data_nascimento), "dd/MM/yyyy") : "-"}</span></div>
                        <div><span className="text-muted-foreground block text-xs">RG</span><span className="font-medium">{anamnese.rg || "-"}</span></div>
                        <div><span className="text-muted-foreground block text-xs">Profissão</span><span className="font-medium">{anamnese.profissao || "-"}</span></div>
                      </div>
                      <div><span className="text-muted-foreground block text-xs">Endereço</span><span className="font-medium">{anamnese.endereco} (CEP: {anamnese.cep})</span></div>
                    </CardContent>
                  </Card>

                  <Card className={anamnese.comorbidades || anamnese.limitacao_cirurgia ? "border-amber-500/50 bg-amber-500/5" : ""}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" /> Saúde e Limitações
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block text-xs font-medium">Comorbidades</span>
                        <p className="font-medium mt-1">{anamnese.comorbidades || "Nenhuma relatada."}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs font-medium">Limitações / Cirurgias</span>
                        <p className="font-medium mt-1">{anamnese.limitacao_cirurgia || "Nenhuma relatada."}</p>
                      </div>
                      {anamnese.limitacao_arquivo_url && (
                        <SignedAnamneseLink href={anamnese.limitacao_arquivo_url} className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md transition-colors">
                          <Download className="h-3 w-3" /> Ver exame anexado
                        </SignedAnamneseLink>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" /> Rotina e Treino
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div><span className="text-muted-foreground block text-xs">Trabalho</span><span className="font-medium">{anamnese.horas_trabalho}</span></div>
                      <div><span className="text-muted-foreground block text-xs">Sono</span><span className="font-medium">{anamnese.horas_sono}</span></div>
                      <div className="pt-2 border-t border-border/50">
                        <span className="text-muted-foreground block text-xs">Dias na semana</span><span className="font-medium">{anamnese.dias_treino_semana}</span>
                      </div>
                      <div><span className="text-muted-foreground block text-xs">Tempo por dia</span><span className="font-medium">{anamnese.tempo_treino_dia}</span></div>
                      <div><span className="text-muted-foreground block text-xs">Disponibilidade p/ Cardio</span><span className="font-medium">{anamnese.disponibilidade_cardio}</span></div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" /> Objetivos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block text-xs font-medium">Objetivo</span>
                        <p className="font-medium mt-1">{anamnese.objetivo}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs font-medium">Exercícios preferidos (ou que não gosta)</span>
                        <p className="font-medium mt-1">{anamnese.exercicios_preferidos}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {anamnese.fotos && anamnese.fotos.length > 0 && (
                    <Card className="md:col-span-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Camera className="h-4 w-4 text-primary" /> Fotos de Avaliação
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {anamnese.fotos.map((foto, index) => (
                            <SignedAnamnesePhoto key={index} path={foto} alt={`Foto ${index + 1}`} />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12 border border-dashed rounded-lg">
                <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">O aluno ainda não completou a anamnese.</p>
              </div>
            )}
          </TabsContent>

          {/* ABA CHECK-INS */}
          <TabsContent value="checkins" className="mt-6 space-y-6">
            {checkinsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <p className="text-sm font-medium text-muted-foreground">Adesão aos Check-ins</p>
                      <p className="text-3xl font-bold text-primary mt-1">{adherenceRate.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground mt-1">{completedCount} respondidos de {totalCount}</p>
                    </CardContent>
                  </Card>
                  
                  {alerts.length > 0 && (
                    <Card className="sm:col-span-2 bg-destructive/10 border-destructive/20 flex items-center p-4">
                      <AlertCircle className="h-8 w-8 text-destructive mr-4 shrink-0" />
                      <div>
                        <h4 className="font-semibold text-destructive">Atenção Necessária</h4>
                        <p className="text-sm text-destructive/80 mt-0.5">
                          Há {alerts.length} check-in(s) recente(s) relatando dores ou nota baixa na consultoria.
                        </p>
                      </div>
                    </Card>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Histórico de Check-ins</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        try {
                          await forceCheckin();
                          toast.success("Check-in pendente gerado para esta semana!");
                        } catch (error: any) {
                          toast.error(error.message || "Erro ao gerar check-in");
                        }
                      }}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Gerar Check-in Manual
                    </Button>
                  </div>
                  {checkins.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum check-in gerado ainda.</p>
                  ) : (
                    checkins.map(checkin => (
                      <Card key={checkin.id} className="overflow-hidden">
                        <CardHeader className="bg-muted/30 pb-3 py-3 px-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-primary" /> Semana de {format(new Date(checkin.week_start + "T00:00:00"), "dd/MM/yyyy")}
                            </CardTitle>
                            {checkin.status === "completed" ? (
                              <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Respondido</Badge>
                            ) : checkin.status === "expired" ? (
                              <Badge variant="outline" className="text-destructive border-destructive/50">Expirado</Badge>
                            ) : (
                              <Badge variant="secondary">Pendente</Badge>
                            )}
                          </div>
                        </CardHeader>
                        {checkin.status === "completed" && (
                          <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                              <div><span className="text-muted-foreground block text-xs">Treinos Perdidos</span><span className="font-medium">{checkin.treinos_perdidos ? "Sim" : "Não"}</span></div>
                              <div><span className="text-muted-foreground block text-xs">Peso (kg)</span><span className="font-medium">{checkin.peso_corporal || "-"}</span></div>
                              <div><span className="text-muted-foreground block text-xs">Aval. Consultoria</span><span className="font-medium">{checkin.avaliacao_consultoria || "-"}/5</span></div>
                              <div><span className="text-muted-foreground block text-xs">Sono (1-5)</span><span className="font-medium">{checkin.qualidade_sono || "-"}</span></div>
                              <div><span className="text-muted-foreground block text-xs">Aderência (1-5)</span><span className="font-medium">{checkin.aderencia_alimentacao || "-"}</span></div>
                              <div><span className="text-muted-foreground block text-xs">Estresse (1-5)</span><span className="font-medium">{checkin.nivel_estresse || "-"}</span></div>
                            </div>

                            {/* Alertas */}
                            {(checkin.dor_desconforto || checkin.motivo_falta || checkin.pr_progressao) && (
                              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-md text-sm space-y-2 mt-4">
                                {checkin.motivo_falta && (
                                  <div><span className="font-semibold text-amber-600">Motivo da Falta (Treino):</span> <span className="text-amber-700/80">{checkin.motivo_falta}</span></div>
                                )}
                                {checkin.pr_progressao && (
                                  <div><span className="font-semibold text-amber-600">Exercícios Faltantes:</span> <span className="text-amber-700/80">{checkin.pr_progressao}</span></div>
                                )}
                                {checkin.dor_desconforto && (
                                  <div><span className="font-semibold text-amber-600">Dor/Desconforto:</span> <span className="text-amber-700/80">{checkin.dor_desconforto}</span></div>
                                )}
                              </div>
                            )}

                            {checkin.duvidas_sugestoes && (
                              <div className="bg-secondary/20 p-3 rounded-md text-sm">
                                <span className="font-semibold block mb-1">Feedback/Dúvidas:</span>
                                {checkin.duvidas_sugestoes}
                              </div>
                            )}

                            <div className="pt-2 border-t border-border">
                              <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                                <MessageSquare className="h-3.5 w-3.5" /> Seu Comentário (visível para o aluno)
                              </Label>
                              <div className="flex gap-2">
                                <Textarea 
                                  value={commentInputs[checkin.id] !== undefined ? commentInputs[checkin.id] : (checkin.coach_comment || "")}
                                  onChange={(e) => setCommentInputs({ ...commentInputs, [checkin.id]: e.target.value })}
                                  placeholder="Digite um comentário para este check-in..."
                                  className="min-h-[60px] text-sm resize-none"
                                />
                                <Button 
                                  onClick={() => handleSaveComment(checkin.id)} 
                                  disabled={savingComment === checkin.id}
                                  className="shrink-0 h-auto"
                                >
                                  {savingComment === checkin.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                                </Button>
                              </div>
                              {checkin.coach_commented_at && (
                                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                                  Última alteração: {format(new Date(checkin.coach_commented_at), "dd/MM/yyyy HH:mm")}
                                </p>
                              )}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* ABA TREINOS */}
          <TabsContent value="treinos" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Histórico de Treinos
                </CardTitle>
                <CardDescription>
                  Linha do tempo consolidada das semanas com execução registrada — aderência, volume e atalho para a semana.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StudentHistoryTimeline studentId={studentId!} />
              </CardContent>
            </Card>

            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <StudentWorkoutPage student={student} onBack={() => navigate("/students")} />
            </div>
          </TabsContent>

          {/* ABA MOBILIDADE */}
          <TabsContent value="mobilidade" className="mt-6">
            <div className="border border-border rounded-lg bg-card overflow-hidden p-4">
              <StudentMobilityContent studentId={studentId!} onBack={() => navigate("/students")} />
            </div>
          </TabsContent>

          {/* ABA EVOLUÇÃO */}
          <TabsContent value="evolucao" className="mt-6 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Peso Corporal</CardTitle>
                <CardDescription>Variação de peso ao longo do tempo (alimentado pelos check-ins e atualizações manuais).</CardDescription>
              </CardHeader>
              <CardContent>
                <BodyWeightHistorySection studentId={studentId!} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Progresso de 1RM</CardTitle>
                <CardDescription>Evolução das cargas máximas estimadas (SBD).</CardDescription>
              </CardHeader>
              <CardContent>
                {rmLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : (
                  <RmEvolutionChart records={rmRecords} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA ANOTAÇÕES */}
          <TabsContent value="anotacoes" className="mt-6">
            <StudentNotesTab student={student} />
          </TabsContent>

          {/* ABA CAMPEONATO */}
          <TabsContent value="campeonato" className="mt-6">
            <MeetAttemptsTab student={student} />
          </TabsContent>
        </Tabs>
      </div>
    </CoachLayout>
  );
}
