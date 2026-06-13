import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import AnimatedPage from "@/components/AnimatedPage";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Check hash for recovery token
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password.trim()) {
      setError("Informe a nova senha.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("Erro ao redefinir a senha. Tente novamente.");
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate("/login-treinador"), 3000);
  };

  if (!isRecovery) {
    return (
      <AnimatedPage>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md border-border/50 shadow-xl">
            <CardContent className="pt-6 text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-muted-foreground">
                Link de recuperação inválido ou expirado. Solicite um novo link na tela de login.
              </p>
              <Button onClick={() => navigate("/login-treinador")} className="w-full">
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
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/8 blur-[100px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/8 blur-[100px]" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          <Card className="border-border/50 shadow-xl">
            <CardHeader className="text-center space-y-3 pb-2">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Nova Senha</CardTitle>
              <CardDescription className="text-muted-foreground">
                Defina sua nova senha de acesso
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              {success ? (
                <div className="text-center space-y-4 py-4 animate-in fade-in duration-500">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Senha redefinida com sucesso!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Redirecionando para o login...
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        autoComplete="new-password"
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

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        autoComplete="new-password"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 text-base bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Salvando...
                      </>
                    ) : (
                      "Redefinir senha"
                    )}
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

export default ResetPassword;
