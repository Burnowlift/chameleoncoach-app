import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dumbbell, Loader2, Eye, EyeOff, Mail, Lock, AlertCircle, ArrowLeft } from "lucide-react";
import AnimatedPage from "@/components/AnimatedPage";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { setRememberMe, clearRememberMe } from "@/lib/rememberMeStorage";

const StudentLogin = () => {
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Informe seu e-mail.");
      return;
    }
    if (!password.trim()) {
      setError("Informe sua senha.");
      return;
    }

    setLoading(true);
    // Set the remember-me preference BEFORE signing in so that
    // Supabase stores the session tokens in the correct storage.
    setRememberMe(remember);
    const { error: authError } = await signIn(email.trim(), password);

    if (authError) {
      setLoading(false);
      if (authError.message.includes("Invalid login")) {
        setError("E-mail ou senha incorretos.");
      } else {
        setError("Erro ao fazer login. Tente novamente.");
      }
      return;
    }

    // Verify user is a student
    const { data: user } = await supabase.auth.getUser();
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.user?.id ?? "")
      .maybeSingle();

    setLoading(false);

    if (!student) {
      await supabase.auth.signOut();
      clearRememberMe();
      setError("Esta conta não é de aluno. Use o login de treinador.");
      return;
    }

    navigate("/aluno");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Informe seu e-mail para recuperação.");
      return;
    }

    setLoading(true);
    const { error: resetError } = await resetPassword(email.trim());
    setLoading(false);

    if (resetError) {
      setError("Erro ao enviar e-mail de recuperação.");
      return;
    }

    setResetSent(true);
  };

  return (
    <AnimatedPage>
    <Helmet>
      <title>Login do Aluno — Chameleon Coach</title>
      <meta name="description" content="Acesse sua área de aluno no Chameleon Coach para executar seus treinos, acompanhar PRs e evolução de força." />
      <link rel="canonical" href="https://chameleoncoach.com.br/aluno/login" />
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
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

      <Card className="w-full border-border/50 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Dumbbell className="h-7 w-7 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">
              {mode === "login" ? "Área do Aluno" : "Recuperar Senha"}
            </CardTitle>
            <CardDescription className="mt-1">
              {mode === "login" 
                ? "Acesse seu treino personalizado" 
                : "Enviaremos um link para redefinir sua senha"}
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

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    autoComplete="email"
                    aria-label="Endereço de e-mail"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    autoComplete="current-password"
                    aria-label="Senha"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={remember}
                    onCheckedChange={(checked) => setRemember(checked === true)}
                    aria-label="Lembrar-me"
                  />
                  <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                    Lembrar-me
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setError(""); }}
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Esqueci minha senha
                </button>
              </div>

              <Button type="submit" className="w-full h-11 text-base font-semibold gap-2" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          ) : resetSent ? (
            <div className="text-center space-y-4 py-4 animate-in fade-in duration-500">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">E-mail enviado!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Verifique sua caixa de entrada em <strong>{email}</strong>
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setMode("login"); setResetSent(false); setError(""); }}
              >
                Voltar ao login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">E-mail cadastrado</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    autoComplete="email"
                    aria-label="E-mail para recuperação"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11 gap-2" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar link de recuperação"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setMode("login"); setError(""); }}
              >
                Voltar ao login
              </Button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground">
              Acesso exclusivo para alunos cadastrados pelo treinador.
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
    </AnimatedPage>
  );
};

export default StudentLogin;
