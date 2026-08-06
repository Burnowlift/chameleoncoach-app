import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCheckins } from "@/hooks/useCheckins";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Calendar, MessageSquare, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AnimatedPage from "@/components/AnimatedPage";
import { StudentBottomNav } from "@/components/StudentBottomNav";
import { Helmet } from "react-helmet-async";

const StudentCheckinHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setStudentId(data.id);
      });
  }, [user]);

  const { history, loading } = useCheckins(studentId);

  if (authLoading || (user && !studentId) || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AnimatedPage>
      <Helmet>
        <title>Histórico de Check-ins — Chameleon Coach</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate("/aluno")} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <h1 className="text-lg font-semibold">Histórico de Check-ins</h1>
            <div className="w-16" />
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-6">
          {history.length === 0 ? (
            <Card className="text-center py-10">
              <CardContent>
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Nenhum check-in ainda</h3>
                <p className="text-muted-foreground mt-1">
                  Seus check-ins passados aparecerão aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {history.map((checkin) => {
                const date = new Date(checkin.week_start + "T00:00:00");
                const weekStr = format(date, "dd 'de' MMM", { locale: ptBR });
                
                return (
                  <Card key={checkin.id} className="overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CardHeader className="bg-muted/30 pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            Semana de {weekStr}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {checkin.status === "completed" && checkin.responded_at
                              ? `Respondido em ${format(new Date(checkin.responded_at), "dd/MM/yyyy")}`
                              : "Não respondido (expirado)"}
                          </CardDescription>
                        </div>
                        {checkin.status === "completed" ? (
                          <div className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
                            Enviado
                          </div>
                        ) : (
                          <div className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                            Expirado
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    
                    {checkin.status === "completed" && (
                      <CardContent className="pt-4 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium uppercase">Treinos</p>
                            <p className="font-semibold">{checkin.treinos_perdidos ? "Faltou" : "100%"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium uppercase">Peso</p>
                            <p className="font-semibold">{checkin.peso_corporal ? `${checkin.peso_corporal}kg` : "-"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium uppercase">Sono (1-5)</p>
                            <p className="font-semibold">{checkin.qualidade_sono || "-"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium uppercase">Aderência (1-5)</p>
                            <p className="font-semibold">{checkin.aderencia_alimentacao || "-"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium uppercase">Estresse (1-5)</p>
                            <p className="font-semibold">{checkin.nivel_estresse || "-"}</p>
                          </div>
                        </div>

                        {(checkin.dor_desconforto || checkin.motivo_falta || checkin.pr_progressao || checkin.duvidas_sugestoes) && (
                          <div className="pt-4 border-t border-border/50 grid gap-3">
                            {checkin.motivo_falta && (
                              <div className="flex gap-2 text-sm">
                                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-medium">Motivo da Falta (Treino):</span>{" "}
                                  <span className="text-muted-foreground">{checkin.motivo_falta}</span>
                                </div>
                              </div>
                            )}
                            {checkin.pr_progressao && (
                              <div className="flex gap-2 text-sm">
                                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-medium">Exercícios Faltantes:</span>{" "}
                                  <span className="text-muted-foreground">{checkin.pr_progressao}</span>
                                </div>
                              </div>
                            )}
                            {checkin.dor_desconforto && (
                              <div className="flex gap-2 text-sm">
                                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-medium">Dor/Desconforto:</span>{" "}
                                  <span className="text-muted-foreground">{checkin.dor_desconforto}</span>
                                </div>
                              </div>
                            )}
                            {checkin.duvidas_sugestoes && (
                              <div className="flex gap-2 text-sm">
                                <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-medium">Dúvidas/Sugestões:</span>{" "}
                                  <span className="text-muted-foreground">{checkin.duvidas_sugestoes}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Comentário do Coach */}
                        {checkin.coach_comment && (
                          <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="h-4 w-4 text-primary" />
                              <span className="text-sm font-semibold text-primary">Comentário do Treinador</span>
                            </div>
                            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                              {checkin.coach_comment}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </main>
        <StudentBottomNav />
      </div>
    </AnimatedPage>
  );
};

export default StudentCheckinHistory;
