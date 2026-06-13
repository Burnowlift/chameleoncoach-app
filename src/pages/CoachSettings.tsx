import { useState, useEffect, useMemo } from "react";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  UserCog,
  Users,
  Trash2,
  ShieldCheck,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { ALL_MENUS, MENU_KEYS, isAdminCoach, ADMIN_COACH_EMAIL } from "@/lib/admin";
import { useCoachPermissionsAdmin, useCoachPermissionAudit } from "@/hooks/useCoachPermissions";

interface Coach {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

const CoachSettings = () => {
  const { user, signUp } = useAuth();
  const isSuperAdmin = isAdminCoach(user?.email);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coaches, setCoaches] = useState<Coach[]>([]);

  // Permissões
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [permState, setPermState] = useState<Record<string, boolean>>({});
  const [originalState, setOriginalState] = useState<Record<string, boolean>>({});
  const { data: permData, isLoading: permLoading, save } = useCoachPermissionsAdmin(selectedCoachId);
  const { data: auditEntries, isLoading: auditLoading } = useCoachPermissionAudit(selectedCoachId);
  const menuTitleByKey = useMemo(
    () => Object.fromEntries(ALL_MENUS.map((m) => [m.key, m.title])),
    [],
  );

  const fetchCoaches = async () => {
    const { data } = await supabase
      .from("coaches")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCoaches(data);
  };

  useEffect(() => {
    fetchCoaches();
  }, []);

  // Sincroniza estado ao carregar permissões do treinador selecionado
  useEffect(() => {
    if (!selectedCoachId) {
      setPermState({});
      setOriginalState({});
      return;
    }
    const base: Record<string, boolean> = {};
    MENU_KEYS.forEach((k) => {
      base[k] = !!permData?.[k];
    });
    setPermState(base);
    setOriginalState(base);
  }, [selectedCoachId, permData]);

  const isDirty = useMemo(
    () => MENU_KEYS.some((k) => !!permState[k] !== !!originalState[k]),
    [permState, originalState],
  );

  const selectableCoaches = coaches.filter(
    (c) => c.email.toLowerCase() !== ADMIN_COACH_EMAIL,
  );
  const selectedCoach = coaches.find((c) => c.id === selectedCoachId) ?? null;

  const handleSavePerms = async () => {
    try {
      await save.mutateAsync(permState);
      setOriginalState(permState);
      toast.success("Permissões atualizadas.");
    } catch (e) {
      toast.error("Erro ao salvar permissões.");
    }
  };

  const handleCreateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Informe o e-mail.");
      return;
    }
    if (!password.trim()) {
      setError("Informe a senha.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error: authError } = await signUp(email.trim(), password);

    if (authError) {
      setLoading(false);
      if (authError.message.includes("already registered")) {
        setError("Este e-mail já está cadastrado.");
      } else {
        setError("Erro ao criar conta. Tente novamente.");
      }
      return;
    }

    await supabase.from("coaches").insert({ email: email.trim() });
    setLoading(false);

    toast.success("Conta de treinador criada! Verifique o e-mail para confirmar.");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    fetchCoaches();
  };

  return (
    <CoachLayout>
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Conta do Treinador</h1>
          <p className="text-muted-foreground">Crie ou gerencie as credenciais e permissões de acesso.</p>
        </div>

        {user && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-3 py-4">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-medium text-sm">Treinador logado</p>
                <p className="text-muted-foreground text-sm">{user.email}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de treinadores */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">Treinadores cadastrados</CardTitle>
                <CardDescription>
                  {coaches.length} treinador{coaches.length !== 1 ? "es" : ""} registrado
                  {coaches.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {coaches.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Nenhum treinador cadastrado ainda.</p>
            ) : (
              <div className="space-y-3">
                {coaches.map((coach) => (
                  <div
                    key={coach.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                        {coach.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{coach.name || coach.email}</p>
                        {coach.name && <p className="text-muted-foreground text-xs">{coach.email}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {new Date(coach.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      {isSuperAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={async () => {
                            const { error } = await supabase.from("coaches").delete().eq("id", coach.id);
                            if (!error) {
                              toast.success("Treinador removido.");
                              fetchCoaches();
                            } else {
                              toast.error("Erro ao remover treinador.");
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permissões de acesso - somente super admin */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Permissões de acesso</CardTitle>
                  <CardDescription>
                    Selecione um treinador e libere os menus que ele poderá visualizar.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Treinador</Label>
                <Select
                  value={selectedCoachId ?? ""}
                  onValueChange={(v) => setSelectedCoachId(v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um treinador" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableCoaches.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">Nenhum treinador disponível.</div>
                    ) : (
                      selectableCoaches.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name ? `${c.name} — ${c.email}` : c.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedCoach && (
                <>
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">
                      Permissões de <span className="font-medium text-foreground">{selectedCoach.email}</span>
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const all: Record<string, boolean> = {};
                          MENU_KEYS.forEach((k) => (all[k] = true));
                          setPermState(all);
                        }}
                      >
                        Marcar todos
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const none: Record<string, boolean> = {};
                          MENU_KEYS.forEach((k) => (none[k] = false));
                          setPermState(none);
                        }}
                      >
                        Desmarcar todos
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border divide-y divide-border">
                    {permLoading ? (
                      <div className="p-4 text-sm text-muted-foreground">Carregando permissões...</div>
                    ) : (
                      ALL_MENUS.map((menu) => {
                        const Icon = menu.icon;
                        const checked = !!permState[menu.key];
                        return (
                          <div
                            key={menu.key}
                            className="flex items-center justify-between px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{menu.title}</span>
                            </div>
                            <Switch
                              checked={checked}
                              onCheckedChange={(v) =>
                                setPermState((s) => ({ ...s, [menu.key]: v }))
                              }
                            />
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSavePerms}
                      disabled={!isDirty || save.isPending}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {save.isPending ? "Salvando..." : "Salvar permissões"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Histórico de alterações de permissões - somente super admin */}
        {isSuperAdmin && selectedCoach && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <History className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-lg">Histórico de alterações</CardTitle>
                  <CardDescription>
                    Últimas mudanças nas permissões de {selectedCoach.email}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <p className="text-sm text-muted-foreground">Carregando histórico...</p>
              ) : !auditEntries || auditEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma alteração registrada ainda.
                </p>
              ) : (
                <div className="rounded-lg border border-border divide-y divide-border max-h-96 overflow-y-auto">
                  {auditEntries.map((entry) => {
                    const title = menuTitleByKey[entry.menu_key] ?? entry.menu_key;
                    const action = entry.new_allowed ? "Liberado" : "Bloqueado";
                    return (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            <span
                              className={
                                entry.new_allowed ? "text-primary" : "text-destructive"
                              }
                            >
                              {action}
                            </span>{" "}
                            — {title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            por {entry.changed_by_email}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(entry.changed_at).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Criar novo treinador - somente super admin */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <UserCog className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Criar login do treinador</CardTitle>
                  <CardDescription>Defina o e-mail e senha para acessar a área do treinador</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateLogin} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="coach-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="coach-email"
                      type="email"
                      placeholder="treinador@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coach-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="coach-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      autoComplete="new-password"
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
                  <Label htmlFor="coach-confirm">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="coach-confirm"
                      type={showPassword ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {loading ? "Criando..." : "Criar conta de treinador"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </CoachLayout>
  );
};

export default CoachSettings;
