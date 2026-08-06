import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dumbbell, Loader2, Eye, EyeOff, Mail, Lock, User, Phone, CreditCard, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import AnimatedPage from "@/components/AnimatedPage";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

// ── CPF Helpers ────────────────────────────────────────────────────
function formatCPFInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function validateCPF(value: string): string | null {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length !== 11) return "CPF deve conter 11 dígitos.";
  if (/^(\d)\1{10}$/.test(cleaned)) return "CPF inválido.";
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned.charAt(i), 10) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 > 9) d1 = 0;
  if (parseInt(cleaned.charAt(9), 10) !== d1) return "CPF inválido.";
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned.charAt(i), 10) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 > 9) d2 = 0;
  if (parseInt(cleaned.charAt(10), 10) !== d2) return "CPF inválido.";
  return null;
}

function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const StudentRegister = () => {
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const coachId = searchParams.get("coach");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sex, setSex] = useState<"M" | "F" | "">("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [coachName, setCoachName] = useState<string | null>(null);
  const [coachNotFound, setCoachNotFound] = useState(false);

  // Redirect se já logado
  useEffect(() => {
    if (!authLoading && user) navigate("/aluno");
  }, [user, authLoading, navigate]);

  // Verifica se o coach existe
  useEffect(() => {
    if (!coachId) {
      setCoachNotFound(true);
      return;
    }
    const checkCoach = async () => {
      const { data, error } = await supabase
        .from("coaches")
        .select("name")
        .eq("id", coachId)
        .maybeSingle();
      
      if (data?.name) {
        setCoachName(data.name);
      } else if (error && error.code === '42501') {
        // Permission denied (RLS). We proceed without showing the name.
        // The edge function will validate the coach ID later.
        setCoachName("seu treinador");
      } else {
        // If it's another error or genuinely not found, we block it.
        // Actually, maybe we should just allow it and let the edge function decide?
        // Let's just allow it for now if we can't be sure, to prevent blocking valid links.
        if (error) {
           setCoachName("seu treinador");
        } else {
           setCoachNotFound(true);
        }
      }
    };
    checkCoach();
  }, [coachId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validações client-side
    if (!name.trim()) { setError("Informe seu nome completo."); return; }
    if (!email.trim()) { setError("Informe seu e-mail."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("E-mail inválido."); return; }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) { setError("Informe um telefone válido com DDD."); return; }

    const cpfError = validateCPF(cpf);
    if (cpfError) { setError(cpfError); return; }
    if (!sex) { setError("Informe o seu sexo biológico."); return; }

    if (password.length < 8) { setError("A senha precisa ter pelo menos 8 caracteres."); return; }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) { setError("A senha precisa ter letras e números."); return; }
    if (password !== confirmPassword) { setError("As senhas não conferem."); return; }
    if (!acceptedTerms) { setError("Você precisa aceitar os termos para continuar."); return; }

    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("register-student", {
        body: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.replace(/\D/g, ""),
          cpf: cpf.replace(/\D/g, ""),
          sex,
          coachId,
          acceptedTerms,
        },
      });

      // Trata erros do edge function
      const serverError = data?.error || fnError?.message;
      if (serverError) {
        setLoading(false);
        setError(String(serverError).replace(/^Edge function returned \d+: Error,\s*/i, ""));
        return;
      }

      // Sucesso → faz login automático
      const { error: loginError } = await signIn(email.trim().toLowerCase(), password);
      if (loginError) {
        // Conta criada mas login falhou — manda para tela de login
        setSuccess(true);
        setLoading(false);
        return;
      }

      setLoading(false);
      navigate("/aluno/anamnese");
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Erro inesperado. Tente novamente.");
    }
  };

  // Tela de coach não encontrado
  if (coachNotFound) {
    return (
      <AnimatedPage>
        <Helmet>
          <title>Cadastro — Chameleon Coach</title>
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md text-center border-border/50 shadow-xl">
            <CardContent className="pt-8 pb-6 space-y-4">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-7 w-7 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Link inválido</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Este link de cadastro não é válido. Peça ao seu treinador o link correto para criar sua conta.
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate("/aluno/login")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Ir para o login
              </Button>
            </CardContent>
          </Card>
        </div>
      </AnimatedPage>
    );
  }

  // Tela de sucesso (fallback se login automático falhar)
  if (success) {
    return (
      <AnimatedPage>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md text-center border-border/50 shadow-xl animate-in fade-in duration-500">
            <CardContent className="pt-8 pb-6 space-y-4">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Conta criada com sucesso!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Agora faça login para preencher sua anamnese e começar.
                </p>
              </div>
              <Button onClick={() => navigate("/aluno/login")} className="w-full gap-2">
                Ir para o login
              </Button>
            </CardContent>
          </Card>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <Helmet>
        <title>Criar Conta — Chameleon Coach</title>
        <meta name="description" content="Crie sua conta de aluno no Chameleon Coach para acessar seus treinos personalizados." />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
        {/* Background pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md space-y-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/aluno/login")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Já tenho conta
          </Button>

          <Card className="w-full border-border/50 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="text-center space-y-4 pb-2">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Dumbbell className="h-7 w-7 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Criar Conta</CardTitle>
                <CardDescription className="mt-1">
                  {coachName
                    ? <>Cadastre-se para treinar com <strong>{coachName}</strong></>
                    : "Preencha seus dados para começar"}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nome */}
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-name"
                      placeholder="Seu nome completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                      autoCapitalize="words"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="reg-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                  </div>
                </div>

                {/* Telefone */}
                <div className="space-y-2">
                  <Label htmlFor="reg-phone">Telefone / WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* CPF */}
                <div className="space-y-2">
                  <Label htmlFor="reg-cpf">CPF</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-cpf"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPFInput(e.target.value))}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Sexo */}
                <div className="space-y-2">
                  <Label htmlFor="reg-sex">Sexo</Label>
                  <Select value={sex} onValueChange={(v) => setSex(v as "M" | "F")} disabled={loading}>
                    <SelectTrigger id="reg-sex" className="w-full">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Usado para cálculos precisos e referência de imagens do corpo na avaliação.
                  </p>
                </div>

                {/* Senha */}
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres, com letras e números"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      disabled={loading}
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar senha */}
                <div className="space-y-2">
                  <Label htmlFor="reg-confirm-password">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                  </div>
                </div>

                {/* Aceite dos termos */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <Checkbox
                    id="reg-terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                    className="mt-0.5"
                    disabled={loading}
                  />
                  <Label htmlFor="reg-terms" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                    Declaro que li e aceito os <strong className="text-foreground">termos de uso</strong> e a{" "}
                    <strong className="text-foreground">política de privacidade</strong>. Estou ciente de que meus dados
                    serão usados para a criação do meu protocolo de treino.
                  </Label>
                </div>

                <Button type="submit" className="w-full h-11 text-base font-semibold gap-2" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    "Criar minha conta"
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-border/50 text-center">
                <p className="text-xs text-muted-foreground">
                  Já tem conta?{" "}
                  <button
                    onClick={() => navigate("/aluno/login")}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Faça login
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AnimatedPage>
  );
};

export default StudentRegister;
