import { useState, useEffect, useCallback } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAnamnese, type AnamneseData } from "@/hooks/useAnamnese";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Upload, AlertCircle } from "lucide-react";
import AnimatedPage from "@/components/AnimatedPage";
import { SignedAnamneseImg } from "@/components/SignedAnamneseFile";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { X } from "lucide-react";

const TOTAL_STEPS = 7;

const StudentAnamnese = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState<string | undefined>(undefined);
  const [studentLoading, setStudentLoading] = useState(true);

  // Fetch student by user
  useEffect(() => {
    if (!user) {
      setStudentLoading(false);
      return;
    }
    const fetchStudent = async () => {
      const { data } = await supabase
        .from("students")
        .select("id, anamnese_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        if (data.anamnese_completed) {
          navigate("/aluno");
          return;
        }
        setStudentId(data.id);
      }
      setStudentLoading(false);
    };
    fetchStudent();
  }, [user, navigate]);

  const { anamnese, loading: anamneseLoading, saveStep, completeAnamnese, uploadFile } = useAnamnese(studentId);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<AnamneseData>>({});
  const [uploadingFile, setUploadingFile] = useState(false);

  // Initialize from saved anamnese
  useEffect(() => {
    if (anamnese) {
      setFormData(anamnese);
      // Only restore step if there's a real saved anamnese with progress
      if (anamnese.id && anamnese.current_step && anamnese.current_step > 1) {
        setStep(anamnese.current_step);
      } else {
        setStep(1);
      }
    }
  }, [anamnese]);

  const updateField = (field: keyof AnamneseData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveAndNext = async () => {
    setSaving(true);
    try {
      await saveStep(formData, Math.min(step + 1, TOTAL_STEPS));
      if (step < TOTAL_STEPS) {
        setStep(step + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      toast.success("Progresso salvo!");
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    }
    setSaving(false);
  };

  const handleBack = async () => {
    if (step > 1) {
      setSaving(true);
      try {
        await saveStep(formData, step - 1);
      } catch { /* silent */ }
      setSaving(false);
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const saved = await saveStep(formData, TOTAL_STEPS);
      await completeAnamnese(saved?.id);

      toast.success("Anamnese concluída! 🎉");
      window.location.href = "/aluno";
    } catch (err) {
      console.error("Erro ao finalizar anamnese:", err);
      toast.error("Erro ao finalizar anamnese.");
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !studentId) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }
    setUploadingFile(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${studentId}/exame_${Date.now()}.${ext}`;
      const url = await uploadFile(file, path);
      updateField("limitacao_arquivo_url", url);
      toast.success("Arquivo enviado!");
    } catch {
      toast.error("Erro ao enviar arquivo.");
    }
    setUploadingFile(false);
  };

  if (authLoading || studentLoading || anamneseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/aluno/login" replace />;
  }

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <AnimatedPage>
      <Helmet>
        <title>Anamnese — Chameleon Coach</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        {/* Header com progresso */}
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">Anamnese</h1>
              <span className="text-sm text-muted-foreground">
                Etapa {step} de {TOTAL_STEPS}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Step 1: Compromisso + Sexo */}
          {step === 1 && (
            <Card className="animate-in fade-in slide-in-from-right-4 duration-300">
              <CardHeader>
                <CardTitle>Compromisso e Identificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm leading-relaxed">
                  <p className="font-medium mb-2">Antes de começar, leia com atenção:</p>
                  <p>As informações que você vai preencher aqui são essenciais para que a gente consiga montar seu treino de forma individualizada, com base no seu ponto de partida, objetivos e rotina.</p>
                  <p className="mt-2">Por isso, siga todas as orientações com atenção e responda com o máximo de precisão.</p>
                </div>

                <div className="space-y-3">
                  <Label className="font-medium">Está ciente do compromisso com o acompanhamento? *</Label>
                  <RadioGroup
                    value={formData.aceite_compromisso ? "sim" : ""}
                    onValueChange={(v) => updateField("aceite_compromisso", v === "sim")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sim" id="aceite-sim" />
                      <Label htmlFor="aceite-sim" className="cursor-pointer">Estou ciente e quero continuar</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="font-medium">Vai responder de forma sincera? *</Label>
                  <RadioGroup
                    value={formData.aceite_sinceridade ? "sim" : ""}
                    onValueChange={(v) => updateField("aceite_sinceridade", v === "sim")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sim" id="sinceridade-sim" />
                      <Label htmlFor="sinceridade-sim" className="cursor-pointer">Sim, responderei de forma sincera</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="font-medium">Sexo biológico *</Label>
                  <p className="text-xs text-muted-foreground">Usado para personalizar seu protocolo de treino e modelos de referência.</p>
                  <RadioGroup
                    value={formData.sexo || ""}
                    onValueChange={(v) => updateField("sexo", v as "M" | "F")}
                  >
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="M" id="sexo-m" />
                        <Label htmlFor="sexo-m" className="cursor-pointer">Masculino</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="F" id="sexo-f" />
                        <Label htmlFor="sexo-f" className="cursor-pointer">Feminino</Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Dados Pessoais */}
          {step === 2 && (
            <Card className="animate-in fade-in slide-in-from-right-4 duration-300">
              <CardHeader>
                <CardTitle>Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rg">RG *</Label>
                  <Input id="rg" value={formData.rg || ""} onChange={(e) => updateField("rg", e.target.value)} placeholder="Seu RG" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_nascimento">Data de nascimento *</Label>
                  <Input id="data_nascimento" type="date" value={formData.data_nascimento || ""} onChange={(e) => updateField("data_nascimento", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP *</Label>
                  <Input id="cep" value={formData.cep || ""} onChange={(e) => updateField("cep", e.target.value)} placeholder="00000-000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço (Estado/Cidade/Rua e número) *</Label>
                  <Input id="endereco" value={formData.endereco || ""} onChange={(e) => updateField("endereco", e.target.value)} placeholder="SP, São Paulo, Rua X, 123" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profissao">Profissão *</Label>
                  <Input id="profissao" value={formData.profissao || ""} onChange={(e) => updateField("profissao", e.target.value)} placeholder="Sua profissão" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Saúde */}
          {step === 3 && (
            <Card className="animate-in fade-in slide-in-from-right-4 duration-300">
              <CardHeader>
                <CardTitle>Saúde e Limitações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="comorbidades">Você tem alguma comorbidade? Alguma doença ou limitação? *</Label>
                  <p className="text-xs text-muted-foreground">Ex: Diabetes, Pressão alta... Se sim, explique abaixo.</p>
                  <Textarea
                    id="comorbidades"
                    value={formData.comorbidades || ""}
                    onChange={(e) => updateField("comorbidades", e.target.value)}
                    placeholder="Descreva aqui..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limitacao">Tem alguma limitação? Fez alguma cirurgia? Especifique.</Label>
                  <Textarea
                    id="limitacao"
                    value={formData.limitacao_cirurgia || ""}
                    onChange={(e) => updateField("limitacao_cirurgia", e.target.value)}
                    placeholder="Descreva limitações ou cirurgias..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tem algum exame? Envie aqui (opcional)</Label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {uploadingFile ? "Enviando..." : "Adicionar arquivo"}
                      </span>
                      <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png" disabled={uploadingFile} />
                    </label>
                    {formData.limitacao_arquivo_url && (
                      <span className="text-xs text-primary flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Arquivo enviado
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Rotina */}
          {step === 4 && (
            <Card className="animate-in fade-in slide-in-from-right-4 duration-300">
              <CardHeader>
                <CardTitle>Rotina</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="horas_trabalho">Trabalha quantas horas por dia? *</Label>
                  <Input id="horas_trabalho" value={formData.horas_trabalho || ""} onChange={(e) => updateField("horas_trabalho", e.target.value)} placeholder="Ex: 8h" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horas_sono">Dorme quantas horas por dia? A que horas vai dormir? *</Label>
                  <p className="text-xs text-muted-foreground">Diferencia seg-sex e sáb-dom</p>
                  <Textarea
                    id="horas_sono"
                    value={formData.horas_sono || ""}
                    onChange={(e) => updateField("horas_sono", e.target.value)}
                    placeholder="Ex: 7h, durmo às 23h seg-sex, 01h no fim de semana"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Disponibilidade de Treino */}
          {step === 5 && (
            <Card className="animate-in fade-in slide-in-from-right-4 duration-300">
              <CardHeader>
                <CardTitle>Disponibilidade de Treino</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dias_treino">Quantos dias na semana pode treinar? *</Label>
                  <p className="text-xs text-muted-foreground">Inclua se treina ou quer treinar aos sábados.</p>
                  <Textarea
                    id="dias_treino"
                    value={formData.dias_treino_semana || ""}
                    onChange={(e) => updateField("dias_treino_semana", e.target.value)}
                    placeholder="Ex: 5 dias, seg a sex, não treino sábado"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tempo_treino">Quanto tempo disponível para treinar por dia? *</Label>
                  <Input id="tempo_treino" value={formData.tempo_treino_dia || ""} onChange={(e) => updateField("tempo_treino_dia", e.target.value)} placeholder="Ex: 1h30" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardio">Tem disponibilidade para cardio fora do horário de treino? *</Label>
                  <Input id="cardio" value={formData.disponibilidade_cardio || ""} onChange={(e) => updateField("disponibilidade_cardio", e.target.value)} placeholder="Ex: Sim, de manhã, 30 min" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 6: Objetivos */}
          {step === 6 && (
            <Card className="animate-in fade-in slide-in-from-right-4 duration-300">
              <CardHeader>
                <CardTitle>Objetivos e Preferências</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="objetivo">Qual seu objetivo com o acompanhamento? *</Label>
                  <p className="text-xs text-muted-foreground">Ficar mais forte? Ser atleta de Powerlifting? Se preparar para campeonato? Seu treino será montado com base nisso.</p>
                  <Textarea
                    id="objetivo"
                    value={formData.objetivo || ""}
                    onChange={(e) => updateField("objetivo", e.target.value)}
                    placeholder="Descreva seus objetivos..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exercicios">Quais exercícios mais gosta de fazer? Quais não gosta? *</Label>
                  <p className="text-xs text-muted-foreground">Não significa que não iremos te passar rs.</p>
                  <Textarea
                    id="exercicios"
                    value={formData.exercicios_preferidos || ""}
                    onChange={(e) => updateField("exercicios_preferidos", e.target.value)}
                    placeholder="Ex: Gosto de agachamento, não curto leg press..."
                    rows={3}
                  />
                </div>

              </CardContent>
            </Card>
          )}

          {/* Step 7: Fotos de Avaliação */}
          {step === 7 && (
            <Card className="animate-in fade-in slide-in-from-right-4 duration-300">
              <CardHeader>
                <CardTitle>Fotos de Avaliação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium text-sm mb-2">Como tirar as fotos?</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Veja os exemplos abaixo de como se posicionar. {formData.sexo === "M" ? "Os homens devem tirar as fotos de sunga, cueca ou shorts curto." : "As mulheres devem tirar as fotos de top e shorts curto ou biquíni."}
                  </p>
                  
                  {/* Reference Photos Carousel */}
                  <ScrollArea className="w-full whitespace-nowrap rounded-md border bg-muted/20 pb-4">
                    <div className="flex w-max space-x-4 p-4">
                      {Array.from({ length: 18 }).map((_, i) => (
                        <div key={i} className="shrink-0">
                          <img
                            src={`/modelos/${formData.sexo === "M" ? "masculino" : "feminino"}/${i + 1}.png`}
                            alt={`Referência ${i + 1}`}
                            className="h-64 w-auto rounded-md object-contain shadow-sm border bg-white"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>

                <div className="space-y-4">
                  <Label>Envie suas fotos</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:bg-muted/10 transition-colors">
                    <input
                      type="file"
                      id="foto-upload"
                      className="hidden"
                      multiple
                      accept="image/*"
                      disabled={uploadingFile}
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        
                        // Check file sizes (10MB limit)
                        const maxSize = 10 * 1024 * 1024; // 10MB em bytes
                        const validFiles = [];
                        
                        for (let i = 0; i < files.length; i++) {
                          if (files[i].size > maxSize) {
                            toast.error(`A foto "${files[i].name}" é maior que 10MB e foi ignorada.`);
                          } else {
                            validFiles.push(files[i]);
                          }
                        }
                        
                        if (validFiles.length === 0) {
                          e.target.value = "";
                          return;
                        }

                        setUploadingFile(true);
                        
                        try {
                          const newFotos = [...(formData.fotos || [])];
                          for (let i = 0; i < validFiles.length; i++) {
                            const file = validFiles[i];
                            const path = `fotos/${studentId}/${Date.now()}_${file.name}`;
                            const url = await uploadFile(file, path);
                            newFotos.push(url);
                          }
                          updateField("fotos", newFotos);
                          toast.success("Fotos enviadas com sucesso!");
                        } catch (err: any) {
                          toast.error(err.message || "Erro ao enviar fotos.");
                        } finally {
                          setUploadingFile(false);
                          e.target.value = ""; // reset input
                        }
                      }}
                    />
                    <Label
                      htmlFor="foto-upload"
                      className="flex flex-col items-center justify-center cursor-pointer gap-2"
                    >
                      {uploadingFile ? (
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      ) : (
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      )}
                      <span className="font-medium text-primary">
                        {uploadingFile ? "Enviando..." : "Clique para selecionar ou tire uma foto"}
                      </span>
                      <span className="text-xs text-muted-foreground">JPG, PNG, WebP</span>
                    </Label>
                  </div>

                  {/* Uploaded Photos Grid */}
                  {formData.fotos && formData.fotos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                      {formData.fotos.map((foto, index) => (
                        <div key={index} className="relative group rounded-md overflow-hidden border">
                          <SignedAnamneseImg src={foto} alt={`Sua foto ${index + 1}`} className="w-full h-32 object-cover" />
                          <button
                            className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.preventDefault();
                              const newFotos = formData.fotos?.filter((_, i) => i !== index);
                              updateField("fotos", newFotos);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resumo antes de finalizar */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span className="font-medium">Tudo pronto!</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ao finalizar, todos os seus dados e fotos serão enviados para o seu treinador. Ele já poderá começar a montar seu protocolo!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1 || saving}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>

            {step < TOTAL_STEPS ? (
              <Button
                onClick={handleSaveAndNext}
                disabled={saving || (step === 1 && (!formData.aceite_compromisso || !formData.aceite_sinceridade || !formData.sexo))}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Próxima
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={saving}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Finalizar Anamnese
                  </>
                )}
              </Button>
            )}
          </div>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default StudentAnamnese;
