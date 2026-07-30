import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCheckins } from "@/hooks/useCheckins";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CheckCircle2, ArrowLeft, Send, Dumbbell, Moon, Brain, Utensils, AlertTriangle, Trophy, Star, MessageSquare } from "lucide-react";
import AnimatedPage from "@/components/AnimatedPage";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";

const StudentCheckin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState<string | undefined>(undefined);
  const [studentLoading, setStudentLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setStudentId(data.id);
        setStudentLoading(false);
      });
  }, [user]);

  const { pending, loading: checkinLoading, submitCheckin } = useCheckins(studentId);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [treinosPerdidos, setTreinosPerdidos] = useState<number>(0);
  const [motivoFalta, setMotivoFalta] = useState("");
  const [faltouExercicio, setFaltouExercicio] = useState<number>(0);
  const [prProgressao, setPrProgressao] = useState("");
  const [pesoCorporal, setPesoCorporal] = useState("");
  const [qualidadeSono, setQualidadeSono] = useState<number>(3);
  const [nivelEstresse, setNivelEstresse] = useState<number>(3);
  const [aderenciaAlimentacao, setAderenciaAlimentacao] = useState<number>(3);
  const [sentiuDor, setSentiuDor] = useState<number>(0);
  const [dorDesconforto, setDorDesconforto] = useState("");
  const [avaliacaoConsultoria, setAvaliacaoConsultoria] = useState<number>(5);
  const [duvidasSugestoes, setDuvidasSugestoes] = useState("");

  const handleSubmit = async () => {
    if (!pending) return;
    setSubmitting(true);
    try {
      await submitCheckin(pending.id, {
        treinos_perdidos: treinosPerdidos,
        motivo_falta: treinosPerdidos === 1 ? (motivoFalta.trim() || null) : null,
        peso_corporal: pesoCorporal ? Number(pesoCorporal.replace(",", ".")) : null,
        qualidade_sono: qualidadeSono,
        nivel_estresse: nivelEstresse,
        aderencia_alimentacao: aderenciaAlimentacao,
        dor_desconforto: sentiuDor === 1 ? (dorDesconforto.trim() || null) : null,
        avaliacao_consultoria: avaliacaoConsultoria,
        duvidas_sugestoes: duvidasSugestoes.trim() || null,
        
        // Using pr_progressao to store missed exercises to avoid DB schema changes
        pr_progressao: faltouExercicio === 1 ? (prProgressao.trim() || null) : null,

        // Nulling out removed fields
        avaliacao_execucao: null,
        rpe_medio: null,
        horas_sono_media: null,
      });
      setSubmitted(true);
      toast.success("Check-in enviado! 🎉");
    } catch {
      toast.error("Erro ao enviar check-in.");
    }
    setSubmitting(false);
  };

  if (authLoading || studentLoading || checkinLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Sucesso
  if (submitted) {
    return (
      <AnimatedPage>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md text-center animate-in fade-in zoom-in-95 duration-500">
            <CardContent className="pt-8 pb-6 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Check-in enviado!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Seu treinador receberá suas respostas e poderá ajustar seu protocolo.
                </p>
              </div>
              <Button onClick={() => navigate("/aluno")} className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar ao painel
              </Button>
            </CardContent>
          </Card>
        </div>
      </AnimatedPage>
    );
  }

  // Sem check-in pendente
  if (!pending) {
    return (
      <AnimatedPage>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-8 pb-6 space-y-4">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Nenhum check-in pendente</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Seu próximo check-in estará disponível no sábado às 08:00.
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate("/aluno")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      </AnimatedPage>
    );
  }

  const scaleLabels5 = ["Péssimo", "Ruim", "Regular", "Bom", "Ótimo"];

  return (
    <AnimatedPage>
      <Helmet>
        <title>Check-in Semanal — Chameleon Coach</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate("/aluno")} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <h1 className="text-lg font-semibold">Check-in Semanal</h1>
            <div className="w-16" />
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {/* 1. Treinos perdidos */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" /> Treinos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Perdeu algum treino esta semana?</Label>
                <RadioGroup
                  value={String(treinosPerdidos)}
                  onValueChange={(v) => setTreinosPerdidos(Number(v))}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="0" id="tp-0" />
                    <Label htmlFor="tp-0" className="cursor-pointer">Não</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="1" id="tp-1" />
                    <Label htmlFor="tp-1" className="cursor-pointer">Sim</Label>
                  </div>
                </RadioGroup>
              </div>
              {treinosPerdidos === 1 && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <Label htmlFor="motivo-falta">Qual foi o motivo?</Label>
                  <Textarea id="motivo-falta" value={motivoFalta} onChange={(e) => setMotivoFalta(e.target.value)} rows={2} placeholder="Explique brevemente o motivo da falta..." />
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label>Ficou faltando algum exercício para fazer?</Label>
                <RadioGroup
                  value={String(faltouExercicio)}
                  onValueChange={(v) => setFaltouExercicio(Number(v))}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="0" id="fe-0" />
                    <Label htmlFor="fe-0" className="cursor-pointer">Não</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="1" id="fe-1" />
                    <Label htmlFor="fe-1" className="cursor-pointer">Sim</Label>
                  </div>
                </RadioGroup>
              </div>
              {faltouExercicio === 1 && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <Label htmlFor="exercicios-faltantes">Quais exercícios faltaram?</Label>
                  <Textarea id="exercicios-faltantes" value={prProgressao} onChange={(e) => setPrProgressao(e.target.value)} rows={2} placeholder="Descreva os exercícios faltantes..." />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Corpo */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: "100ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" /> Peso Corporal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="peso">Peso corporal atual (kg)</Label>
                <Input
                  id="peso"
                  type="number"
                  inputMode="decimal"
                  value={pesoCorporal}
                  onChange={(e) => setPesoCorporal(e.target.value)}
                  placeholder="Ex: 85.5"
                  step="0.1"
                />
              </div>
            </CardContent>
          </Card>

          {/* 3. Sono */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: "200ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Moon className="h-4 w-4 text-primary" /> Sono
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Qualidade do sono (1-5)</Label>
                <div className="flex items-center gap-3">
                  <Slider value={[qualidadeSono]} onValueChange={([v]) => setQualidadeSono(v)} min={1} max={5} step={1} className="flex-1" />
                  <span className="text-sm font-medium text-primary w-16 text-right">{qualidadeSono} — {scaleLabels5[qualidadeSono - 1]}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Estresse + Alimentação */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: "300ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" /> Estresse e Alimentação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Nível de estresse (1-5)</Label>
                <div className="flex items-center gap-3">
                  <Slider value={[nivelEstresse]} onValueChange={([v]) => setNivelEstresse(v)} min={1} max={5} step={1} className="flex-1" />
                  <span className="text-sm font-medium text-primary w-16 text-right">{nivelEstresse} — {scaleLabels5[nivelEstresse - 1]}</span>
                </div>
              </div>
              <div className="space-y-3">
                <Label>Aderência à alimentação (1-5)</Label>
                <div className="flex items-center gap-3">
                  <Slider value={[aderenciaAlimentacao]} onValueChange={([v]) => setAderenciaAlimentacao(v)} min={1} max={5} step={1} className="flex-1" />
                  <span className="text-sm font-medium text-primary w-16 text-right">{aderenciaAlimentacao} — {scaleLabels5[aderenciaAlimentacao - 1]}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. Dor e Desconforto */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: "400ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Dores ou Desconforto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sentiu alguma dor ou desconforto esta semana?</Label>
                <RadioGroup
                  value={String(sentiuDor)}
                  onValueChange={(v) => setSentiuDor(Number(v))}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="0" id="sd-0" />
                    <Label htmlFor="sd-0" className="cursor-pointer">Não</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="1" id="sd-1" />
                    <Label htmlFor="sd-1" className="cursor-pointer">Sim</Label>
                  </div>
                </RadioGroup>
              </div>
              {sentiuDor === 1 && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <Label htmlFor="dor">Descreva onde sentiu dor ou desconforto:</Label>
                  <Textarea id="dor" value={dorDesconforto} onChange={(e) => setDorDesconforto(e.target.value)} rows={2} placeholder="Descreva aqui..." />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 6. Avaliação da consultoria */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: "500ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" /> Avaliação e Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Avaliação da consultoria esta semana (1-5)</Label>
                <div className="flex items-center gap-3">
                  <Slider value={[avaliacaoConsultoria]} onValueChange={([v]) => setAvaliacaoConsultoria(v)} min={1} max={5} step={1} className="flex-1" />
                  <span className="text-sm font-medium text-primary w-16 text-right">{avaliacaoConsultoria} — {scaleLabels5[avaliacaoConsultoria - 1]}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duvidas" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" /> Dúvidas ou sugestões
                </Label>
                <Textarea id="duvidas" value={duvidasSugestoes} onChange={(e) => setDuvidasSugestoes(e.target.value)} rows={2} placeholder="Fique à vontade para escrever..." />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="pb-8">
            <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 text-base font-semibold gap-2">
              {submitting ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="h-5 w-5" /> Enviar Check-in</>
              )}
            </Button>
          </div>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default StudentCheckin;
