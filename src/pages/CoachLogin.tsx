import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dumbbell, Loader2, Eye, EyeOff, Mail, Lock, AlertCircle, ArrowLeft } from "lucide-react";
import AnimatedPage from "@/components/AnimatedPage";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

const CoachLogin = () => {
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
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

    const { data: user } = await supabase.auth.getUser();
    const { data: coach } = await supabase
      .from("coaches")
      .select("id")
      .eq("email", user.user?.email ?? "")
      .maybeSingle();

    setLoading(false);

    if (!coach) {
      await supabase.auth.signOut();
      setError("Esta conta não é de treinador. Use o login de aluno.");
      return;
    }

    navigate("/students");
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
      <title>Login do Treinador — Chameleon Coach</title>
      <meta name="description" content="Acesse sua área de treinador no Chameleon Coach para gerenciar alunos, blocos de treino e acompanhar evolução em tempo real." />
      <link rel="canonical" href="https://chameleoncoach.com.br/login-treinador" />
    </Helmet>
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background relative">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/8 blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/8 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center space-y-3 pb-2">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Dumbbell className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {mode === "login" ? "Área do Treinador" : "Recuperar Senha"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {mode === "login"
                ? "Acesse sua conta para gerenciar seus alunos"
                : "Enviaremos um link para redefinir sua senha"}
            </CardDescription>
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
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      autoComplete="email"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      autoComplete="current-password"
                      disabled={loading}
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

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember-coach"
                      checked={remember}
                      onCheckedChange={(checked) => setRemember(checked === true)}
                      aria-label="Lembrar-me"
                    />
                    <Label htmlFor="remember-coach" className="text-sm text-muted-foreground cursor-pointer">
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

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 text-base bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
          </CardContent>
        </Card>
      </div>
    </div>
    </AnimatedPage>
  );
};

export default CoachLogin;
