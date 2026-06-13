import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, Plus, Pencil, Trash2, Dumbbell, CalendarIcon, KeyRound, TrendingUp, Activity, CheckCircle2, AlertTriangle, ChevronDown, X, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn, sbdTotal, formatKg } from "@/lib/utils";
import { mockPlans, type Plan, type Student } from "@/lib/mock-data";
import { toast } from "sonner";
import { StudentWorkoutPage } from "@/components/StudentWorkoutDialog";
import { useStudents } from "@/hooks/useStudents";
import { useRmHistory } from "@/hooks/useRmHistory";
import { useRmBackfill } from "@/hooks/useRmBackfill";
import { RmEvolutionChart } from "@/components/RmEvolutionChart";
import { BodyWeightHistorySection } from "@/components/BodyWeightHistorySection";
import { useStudentFeedback } from "@/hooks/useStudentFeedback";
import { FeedbackCard } from "@/components/StudentFeedbackCards";
import { StudentsFeedbackMetrics } from "@/components/StudentsFeedbackMetrics";
import { useAuth } from "@/hooks/useAuth";
import { isAdminCoach } from "@/lib/admin";
import { Checkbox } from "@/components/ui/checkbox";
import { useStudentsBlockEnd } from "@/hooks/useStudentsBlockEnd";

import { supabase } from "@/integrations/supabase/client";

const statusMap = {
  active: { label: "Ativo", className: "bg-primary/10 text-primary border-primary/30 text-center" },
  inactive: { label: "Inativo", className: "bg-destructive/10 text-destructive border-destructive/30 text-center" },
  expiring: { label: "Vencendo", className: "bg-warning/10 text-warning border-warning/30 text-center" },
};

const MAX_1RM_KG = 1000;

/**
 * Validates a 1RM input value.
 * Accepts strings (form inputs) or numbers (already-parsed state).
 * Returns an error message in pt-BR if invalid, or null if valid.
 */
function validate1RM(value: string | number, label: string): string | null {
  const raw = typeof value === "string" ? value.trim() : String(value);
  if (raw === "" || raw === "undefined" || raw === "null") {
    return `Informe a carga de ${label}.`;
  }
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    return `${label}: valor inválido.`;
  }
  if (num < 0) {
    return `${label} não pode ser negativo.`;
  }
  if (num > MAX_1RM_KG) {
    return `${label}: valor acima do limite (${MAX_1RM_KG} kg).`;
  }
  return null;
}

interface RmErrors {
  squat?: string;
  bench?: string;
  deadlift?: string;
}

interface CreateStudentLoginResponse {
  success?: boolean;
  userId?: string;
  error?: string;
  code?: string;
  reused?: boolean;
}

interface FunctionErrorWithContext extends Error {
  context?: unknown;
}

/**
 * Sanitizes a 1RM input string while the user types.
 * - Strips any character that is not a digit, comma or dot.
 * - Normalizes commas to dots.
 * - Keeps only the first decimal separator.
 * - Limits to one decimal place (typical for kg).
 * - Strips leading zeros from the integer part.
 * - Caps the value so it can't exceed MAX_1RM_KG.
 * Never produces "NaN" or non-numeric text — output is always a valid
 * partial number string (or empty string).
 */
function sanitize1RMInput(raw: string): string {
  if (!raw) return "";
  let cleaned = raw.replace(/[^\d.,]/g, "").replace(/,/g, ".");
  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
  }
  const dotIdx = cleaned.indexOf(".");
  if (dotIdx !== -1) {
    const intPart = cleaned.slice(0, dotIdx);
    const decPart = cleaned.slice(dotIdx + 1).slice(0, 1);
    cleaned = decPart.length > 0 ? `${intPart}.${decPart}` : `${intPart}.`;
  }
  const m = cleaned.match(/^(\d*)(\.\d*)?$/);
  if (m) {
    let intPart = m[1] ?? "";
    const decPart = m[2] ?? "";
    if (intPart.length > 1) intPart = intPart.replace(/^0+/, "") || "0";
    cleaned = intPart + decPart;
  }
  const num = Number(cleaned);
  if (Number.isFinite(num) && num > MAX_1RM_KG) return String(MAX_1RM_KG);
  return cleaned;
}

/**
 * Sanitized parser for the edit form (which stores 1RM as `number`).
 * Returns 0 when the field is cleared so the state never holds NaN.
 * Submit-time validation still catches empty/zero values.
 */
function sanitize1RMNumber(raw: string): number {
  const cleaned = sanitize1RMInput(raw);
  if (cleaned === "" || cleaned === ".") return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Formata um CPF enquanto o usuário digita.
 * Aceita apenas números e aplica a máscara XXX.XXX.XXX-XX.
 */
function formatCPFInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Valida um CPF brasileiro: formato e dígitos verificadores.
 * Retorna mensagem de erro em pt-BR ou null se válido.
 */
function validateCPF(value: string): string | null {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length !== 11) {
    return "CPF deve conter 11 dígitos.";
  }
  // CPFs com todos os dígitos iguais são inválidos
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return "CPF inválido.";
  }

  // Cálculo do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i), 10) * (10 - i);
  }
  let firstDigit = 11 - (sum % 11);
  if (firstDigit > 9) firstDigit = 0;
  if (parseInt(cleaned.charAt(9), 10) !== firstDigit) {
    return "CPF inválido.";
  }

  // Cálculo do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i), 10) * (11 - i);
  }
  let secondDigit = 11 - (sum % 11);
  if (secondDigit > 9) secondDigit = 0;
  if (parseInt(cleaned.charAt(10), 10) !== secondDigit) {
    return "CPF inválido.";
  }

  return null;
}

const Students = () => {
  const navigate = useNavigate();
  const { students, loading, create, update, remove, refetch } = useStudents();
  const { user } = useAuth();
  const isAdmin = isAdminCoach(user?.email);
  const feedback = useStudentFeedback();
  const [rmStudentId, setRmStudentId] = useState<string | undefined>(undefined);
  const { records: rmRecords, loading: rmLoading, deleteRecord: deleteRmRecord, refetch: refetchRm } = useRmHistory(rmStudentId);
  useRmBackfill(rmStudentId, refetchRm);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<{
    status: "all" | "active" | "inactive";
    plans: string[];
    sortByLastResponse: boolean;
    trainingEndingFilter: boolean;
    trainingEndingDays: number;
  }>({
    status: "all",
    plans: [],
    sortByLastResponse: false,
    trainingEndingFilter: false,
    trainingEndingDays: 7,
  });
  const [open, setOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [workoutStudent, setWorkoutStudent] = useState<Student | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPlan, setNewPlan] = useState("");
  const [newCpf, setNewCpf] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newState, setNewState] = useState("");
  const [newSquat, setNewSquat] = useState("");
  const [newBench, setNewBench] = useState("");
  const [newDeadlift, setNewDeadlift] = useState("");
  const [newSex, setNewSex] = useState<"M" | "F" | "">("");
  const [newBodyWeight, setNewBodyWeight] = useState("");
  const [newStartDate, setNewStartDate] = useState<Date | undefined>(undefined);
  const [loginPassword, setLoginPassword] = useState("");
  const [newLoginPassword, setNewLoginPassword] = useState("");
  const [newLoginPasswordConfirm, setNewLoginPasswordConfirm] = useState("");
  const [creatingLogin, setCreatingLogin] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetPasswordConfirmOpen, setResetPasswordConfirmOpen] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createRequestIdRef = useRef<string | null>(null);

  const [newRmErrors, setNewRmErrors] = useState<RmErrors>({});
  const [editRmErrors, setEditRmErrors] = useState<RmErrors>({});
  const [newCpfError, setNewCpfError] = useState<string | null>(null);

  const studentIds = students.map((s) => s.id);
  const { blockEndMap } = useStudentsBlockEnd(studentIds);

  // Dias sem resposta por aluno: usa última marca; se nunca respondeu, conta desde joinedAt.
  const daysWithoutResponseByStudent: Record<string, number> = (() => {
    const out: Record<string, number> = {};
    const now = Date.now();
    for (const s of students) {
      const last = feedback.lastResponseByStudent[s.id];
      const base = last ?? (s.joinedAt ? new Date(s.joinedAt).getTime() : now);
      out[s.id] = Math.max(0, Math.floor((now - base) / (1000 * 60 * 60 * 24)));
    }
    return out;
  })();

  const filtered = students
    .filter((s) => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filters.status === "all" || s.status === filters.status;
      const matchPlan = filters.plans.length === 0 || filters.plans.includes(s.plan);
      if (filters.trainingEndingFilter) {
        const info = blockEndMap[s.id];
        if (!info || info.daysRemaining > filters.trainingEndingDays) return false;
      }
      return matchSearch && matchStatus && matchPlan;
    })
    .sort((a, b) => {
      if (filters.trainingEndingFilter) {
        const da = blockEndMap[a.id]?.daysRemaining ?? Number.POSITIVE_INFINITY;
        const db = blockEndMap[b.id]?.daysRemaining ?? Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
      }
      if (filters.sortByLastResponse && !filters.trainingEndingFilter) {
        const ta = feedback.lastResponseByStudent[a.id] ?? 0;
        const tb = feedback.lastResponseByStudent[b.id] ?? 0;
        return ta - tb;
      }
      return 0;
    });

  const plans = [...new Set(students.map((s) => s.plan))].filter(Boolean);
  const allPlans: Plan[] = (() => {
    try {
      const saved = localStorage.getItem("plans-data");
      return saved ? (JSON.parse(saved) as Plan[]) : mockPlans;
    } catch { return mockPlans; }
  })();

  const togglePlanFilter = (plan: string) => {
    setFilters((f) => ({
      ...f,
      plans: f.plans.includes(plan) ? f.plans.filter((p) => p !== plan) : [...f.plans, plan],
    }));
  };

  const handleCreate = async () => {
    if (isSubmitting) return;
    if (!newName.trim() || !newEmail.trim() || !newPlan || !newCpf.trim()) {
      toast.error("Preencha nome, email, CPF e plano.");
      return;
    }
    if (!newStartDate) {
      toast.error("Selecione a data de início.");
      return;
    }

    // Validate 1RM loads: required, non-negative, within reasonable bounds.
    const rmErrors: RmErrors = {
      squat: validate1RM(newSquat, "Agachamento") || undefined,
      bench: validate1RM(newBench, "Supino") || undefined,
      deadlift: validate1RM(newDeadlift, "Terra") || undefined,
    };
    setNewRmErrors(rmErrors);
    const firstError = rmErrors.squat || rmErrors.bench || rmErrors.deadlift;
    if (firstError) {
      toast.error(firstError);
      return;
    }

    const selectedPlan = allPlans.find((p) => p.name === newPlan);
    const durationMonthsMap: Record<string, number> = {
      "Mensal": 1, "monthly": 1, "Bimestral": 2, "bimonthly": 2,
      "Trimestral": 3, "quarterly": 3, "Quadrimestral": 4, "quadrimester": 4,
      "Semestral": 6, "semiannual": 6, "Anual": 12, "annual": 12,
    };
    const planDuration = selectedPlan?.duration || "Mensal";
    const months = durationMonthsMap[planDuration] || 1;
    const renewalDate = addMonths(newStartDate, months);

    const passwordToSet = newLoginPassword.trim();
    if (!passwordToSet) {
      toast.error("Defina uma senha de acesso para o aluno.");
      return;
    }
    if (passwordToSet.length < 6) {
      toast.error("A senha de login deve ter pelo menos 6 caracteres.");
      return;
    }

    const confirmPassword = newLoginPasswordConfirm.trim();
    if (passwordToSet !== confirmPassword) {
      toast.error("As senhas não conferem. Digite a mesma senha nos dois campos.");
      return;
    }

    // Validate CPF format and check digits
    const cpfError = validateCPF(newCpf);
    setNewCpfError(cpfError);
    if (cpfError) {
      toast.error(cpfError);
      return;
    }

    setIsSubmitting(true);
    // Gera (ou reutiliza) um requestId para idempotência no backend.
    if (!createRequestIdRef.current) {
      createRequestIdRef.current = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    }
    const requestId = createRequestIdRef.current;
    try {
      const newId = await create({
        name: newName.trim().slice(0, 100),
        email: newEmail.trim().slice(0, 255),
        plan: newPlan,
        planValue: 0,
        cpf: newCpf.trim().replace(/\D/g, ""),
        phone: newPhone.trim().slice(0, 20),
        state: newState.trim().slice(0, 50),
        status: "active",
        joinedAt: format(newStartDate, "yyyy-MM-dd"),
        paymentDueDate: format(renewalDate, "yyyy-MM-dd"),
        squat1RM: Number(newSquat) || 0,
        bench1RM: Number(newBench) || 0,
        deadlift1RM: Number(newDeadlift) || 0,
        renewalDay: format(renewalDate, "yyyy-MM-dd"),
        sex: newSex || null,
        bodyWeight: newBodyWeight ? Number(newBodyWeight.replace(",", ".")) || null : null,
      }, requestId);

      // Se uma senha foi informada, já cria o login do aluno.
      let loginCreated = false;
      let loginErrorMsg: string | null = null;
      if (passwordToSet && newId) {
        try {
          const { data, error } = await supabase.functions.invoke<CreateStudentLoginResponse>(
            "create-student-login",
            { body: { email: newEmail.trim(), password: passwordToSet, studentId: newId } }
          );
          const functionError = error as FunctionErrorWithContext | null;
          const contextBody = functionError?.context;
          const contextError =
            typeof contextBody === "object" && contextBody && "error" in contextBody
              ? String((contextBody as CreateStudentLoginResponse).error)
              : null;
          const serverError =
            data?.error ||
            contextError ||
            error?.message?.replace(/^Edge function returned \d+: Error,\s*/i, "");
          if (serverError) {
            loginErrorMsg = String(serverError);
          } else {
            loginCreated = true;
            await refetch();
          }
        } catch (err: unknown) {
          loginErrorMsg = err instanceof Error ? err.message : "Erro ao criar login.";
        }
      }

      setNewName(""); setNewEmail(""); setNewPlan(""); setNewCpf(""); setNewPhone(""); setNewState("");
      setNewSquat(""); setNewBench(""); setNewDeadlift(""); setNewStartDate(undefined);
      setNewSex(""); setNewBodyWeight("");
      setNewLoginPassword(""); setNewLoginPasswordConfirm(""); setNewCpfError(null);
      setNewRmErrors({});
      setOpen(false);
      createRequestIdRef.current = null;
      if (loginErrorMsg) {
        toast.success("Aluno adicionado!");
        toast.error(`Login não criado: ${loginErrorMsg}`);
      } else if (loginCreated) {
        toast.success("Aluno adicionado e login criado!");
      } else {
        toast.success("Aluno adicionado com sucesso!");
      }
    } catch {
      toast.error("Erro ao adicionar aluno.");
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleStatusToggle = async (student: Student, checked: boolean) => {
    try {
      await update({ ...student, status: checked ? "active" : "inactive" });
      toast.success(checked ? "Aluno ativado!" : "Aluno inativado!");
    } catch {
      toast.error("Erro ao atualizar status.");
    }
  };

  const handleRenewalUpdate = async (student: Student, renewalDay: string) => {
    try {
      await update({ ...student, renewalDay });
      toast.success(`Renovação definida!`);
    } catch {
      toast.error("Erro ao atualizar renovação.");
    }
  };

  const handleSaveEdit = async () => {
    if (!editStudent) return;
    const rmErrors: RmErrors = {
      squat: validate1RM(editStudent.squat1RM, "Agachamento") || undefined,
      bench: validate1RM(editStudent.bench1RM, "Supino") || undefined,
      deadlift: validate1RM(editStudent.deadlift1RM, "Terra") || undefined,
    };
    setEditRmErrors(rmErrors);
    const firstError = rmErrors.squat || rmErrors.bench || rmErrors.deadlift;
    if (firstError) {
      toast.error(firstError);
      return;
    }
    try {
      // Se o e-mail mudou e o aluno já tem login, sincroniza com a conta de autenticação.
      const original = students.find((s) => s.id === editStudent.id);
      const newEmail = (editStudent.email || "").trim().toLowerCase();
      const oldEmail = (original?.email || "").trim().toLowerCase();
      if (editStudent.userId && newEmail && newEmail !== oldEmail) {
        const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
          "update-student-email",
          { body: { studentId: editStudent.id, email: newEmail } }
        );
        const functionError = error as FunctionErrorWithContext | null;
        const contextBody = functionError?.context;
        const contextError =
          typeof contextBody === "object" && contextBody && "error" in contextBody
            ? String((contextBody as { error?: string }).error)
            : null;
        const serverError =
          data?.error ||
          contextError ||
          error?.message?.replace(/^Edge function returned \d+: Error,\s*/i, "");
        if (serverError) throw new Error(String(serverError));
      }
      await update(editStudent);
      setEditStudent(null);
      setEditRmErrors({});
      toast.success("Dados atualizados!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar alterações.");
    }
  };

  const handleCreateLogin = async () => {
    if (creatingLogin) return;
    if (!editStudent) return;
    if (editStudent.userId) {
      toast.error("Este aluno já possui login. Não é possível criar outro.");
      return;
    }
    if (!editStudent.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editStudent.email)) {
      toast.error("Cadastre um email válido no aluno antes de criar o login.");
      return;
    }
    if (!loginPassword.trim()) {
      toast.error("Defina uma senha para o aluno.");
      return;
    }
    if (loginPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setCreatingLogin(true);
    try {
      const { data, error } = await supabase.functions.invoke<CreateStudentLoginResponse>("create-student-login", {
        body: { email: editStudent.email.trim(), password: loginPassword.trim(), studentId: editStudent.id },
      });
      // Mesmo em status >= 400, o SDK coloca o body em `data` quando é JSON válido.
      const functionError = error as FunctionErrorWithContext | null;
      const contextBody = functionError?.context;
      const contextError =
        typeof contextBody === "object" && contextBody && "error" in contextBody
          ? String((contextBody as CreateStudentLoginResponse).error)
          : null;
      const serverError =
        data?.error ||
        contextError ||
        error?.message?.replace(/^Edge function returned \d+: Error,\s*/i, "");
      if (serverError) throw new Error(String(serverError));
      const newUserId = data?.userId;
      setLoginPassword("");
      if (newUserId) setEditStudent({ ...editStudent, userId: newUserId });
      await refetch();
      toast.success(
        data?.reused
          ? "Conta existente reaproveitada e senha redefinida! O aluno já pode acessar em /aluno/login"
          : "Login criado! O aluno pode acessar em /aluno/login"
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar login.");
    }
    setCreatingLogin(false);
  };

  const handleResetPassword = async () => {
    if (resettingPassword) return;
    if (!editStudent) return;
    if (!editStudent.userId) {
      toast.error("Este aluno ainda não tem login.");
      return;
    }
    if (!loginPassword.trim()) {
      toast.error("Defina uma nova senha.");
      return;
    }
    if (loginPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
        "reset-student-password",
        { body: { studentId: editStudent.id, password: loginPassword.trim() } }
      );
      const functionError = error as FunctionErrorWithContext | null;
      const contextBody = functionError?.context;
      const contextError =
        typeof contextBody === "object" && contextBody && "error" in contextBody
          ? String((contextBody as { error?: string }).error)
          : null;
      const serverError =
        data?.error ||
        contextError ||
        error?.message?.replace(/^Edge function returned \d+: Error,\s*/i, "");
      if (serverError) throw new Error(String(serverError));
      setLoginPassword("");
      setShowLoginPassword(false);
      setResetPasswordConfirmOpen(false);
      toast.success("Senha redefinida! Compartilhe a nova senha com o aluno.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao redefinir senha.");
    }
    setResettingPassword(false);
  };


  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await remove(deleteConfirmId);
      setDeleteConfirmId(null);
      setEditStudent(null);
      toast.success("Aluno removido!");
    } catch {
      toast.error("Erro ao remover aluno.");
    }
  };

  if (workoutStudent) {
    return (
      <CoachLayout>
        <StudentWorkoutPage
          student={workoutStudent}
          onBack={() => setWorkoutStudent(null)}
        />
      </CoachLayout>
    );
  }

  return (
    <CoachLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Alunos</h1>
            <p className="text-sm text-muted-foreground">{students.length} alunos cadastrados</p>
          </div>
          <Button className="gap-2 w-full sm:w-auto" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Aluno
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar aluno..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select
              value={filters.status}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v as typeof f.status }))}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>

            {/* Multi-select de planos */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-64 justify-between font-normal">
                  <span className="flex items-center gap-1.5 truncate">
                    {filters.plans.length === 0 ? (
                      <span className="text-muted-foreground">Todos os planos</span>
                    ) : (
                      <span className="flex items-center gap-1 flex-wrap">
                        {filters.plans.slice(0, 2).map((p) => (
                          <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {p}
                          </Badge>
                        ))}
                        {filters.plans.length > 2 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            +{filters.plans.length - 2}
                          </Badge>
                        )}
                      </span>
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="flex items-center justify-between px-1 pb-2 mb-1 border-b">
                  <span className="text-xs font-medium text-muted-foreground">Filtrar por planos</span>
                  {filters.plans.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-[11px] gap-1"
                      onClick={() => setFilters((f) => ({ ...f, plans: [] }))}
                    >
                      <X className="h-3 w-3" /> Limpar
                    </Button>
                  )}
                </div>
                <div className="max-h-60 overflow-auto space-y-1">
                  {plans.length === 0 && (
                    <p className="text-xs text-muted-foreground px-2 py-2">Nenhum plano disponível.</p>
                  )}
                  {plans.map((p) => {
                    const checked = filters.plans.includes(p);
                    return (
                      <label
                        key={p}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 cursor-pointer"
                      >
                        <Checkbox checked={checked} onCheckedChange={() => togglePlanFilter(p)} />
                        <span className="text-sm flex-1 truncate">{p}</span>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Toggles inteligentes */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Card className="flex-1">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Label htmlFor="toggle-no-response" className="text-xs font-medium cursor-pointer">
                    Priorizar sem resposta
                  </Label>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Ordena por quem está há mais tempo sem retorno.
                  </p>
                </div>
                <Switch
                  id="toggle-no-response"
                  checked={filters.sortByLastResponse}
                  onCheckedChange={(v) => setFilters((f) => ({ ...f, sortByLastResponse: v }))}
                />
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Label htmlFor="toggle-training-ending" className="text-xs font-medium cursor-pointer">
                    Final do treino próximo
                  </Label>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Mostra apenas alunos com até {filters.trainingEndingDays} dias restantes ou treino expirado.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={String(filters.trainingEndingDays)}
                    onValueChange={(v) => setFilters((f) => ({ ...f, trainingEndingDays: Number(v) }))}
                    disabled={!filters.trainingEndingFilter}
                  >
                    <SelectTrigger className="w-16 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="7">7</SelectItem>
                      <SelectItem value="14">14</SelectItem>
                    </SelectContent>
                  </Select>
                  <Switch
                    id="toggle-training-ending"
                    checked={filters.trainingEndingFilter}
                    onCheckedChange={(v) => setFilters((f) => ({ ...f, trainingEndingFilter: v }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <StudentsFeedbackMetrics
          students={students}
          marks={feedback.marks}
          includeOrange={isAdmin}
          selectedPlans={filters.plans}
        />


        {loading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((student) => {
              const st = statusMap[student.status];
              const total = sbdTotal(student.squat1RM, student.bench1RM, student.deadlift1RM);
              const daysNoResponse = daysWithoutResponseByStudent[student.id] ?? 0;
              const showNoResponseBadge = daysNoResponse >= 3;
              const blockInfo = blockEndMap[student.id];
              return (
                <Card key={student.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-2.5 sm:p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 lg:gap-3">
                      {/* Header: avatar + nome + ações */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Avatar className="h-9 w-9 lg:h-10 lg:w-10 border border-primary/20 shrink-0">
                          {student.avatar ? (
                            <AvatarImage src={student.avatar} alt={student.name} className="object-cover" />
                          ) : null}
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                            {student.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {showNoResponseBadge && (
                              <Badge
                                className="order-first bg-[hsl(var(--accent-orange))] text-white border-transparent text-[9px] px-1.5 py-0 leading-tight pointer-events-none"
                                title="Dias sem resposta do aluno"
                              >
                                {daysNoResponse} dias sem resposta
                              </Badge>
                            )}
                            <p className="font-medium text-sm leading-tight truncate">{student.name}</p>
                            <Badge variant="outline" className={cn(st.className, "lg:hidden text-[9px] px-1 py-0 leading-tight")}>{st.label}</Badge>
                          </div>
                          <p className="text-[11px] lg:text-xs text-muted-foreground truncate leading-tight">
                            <span className="lg:hidden">{student.email}</span>
                            <span className="hidden lg:inline">{student.email}</span>
                          </p>
                          {/* Indicador "Final do treino" */}
                          <div className="mt-1">
                            {blockInfo === null || blockInfo === undefined ? (
                              <span className="text-[10px] text-muted-foreground/70 italic">Sem bloco cadastrado</span>
                            ) : blockInfo.daysRemaining < 0 ? (
                              <Badge className="bg-destructive text-destructive-foreground border-transparent text-[9px] px-1.5 py-0 leading-tight gap-1">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Treino expirado há {Math.abs(blockInfo.daysRemaining)}d
                              </Badge>
                            ) : blockInfo.daysRemaining <= 7 ? (
                              <Badge className="bg-warning text-warning-foreground border-transparent text-[9px] px-1.5 py-0 leading-tight">
                                Faltam {blockInfo.daysRemaining} dias para novo bloco
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                Novo bloco em {blockInfo.daysRemaining}d
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditStudent({ ...student }); setRmStudentId(student.id); }}>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Switch
                            className="scale-90 lg:scale-100"
                            checked={student.status === "active" || student.status === "expiring"}
                            onCheckedChange={(checked) => handleStatusToggle(student, checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>

                      {/* Stats 1RM: linha compacta no mobile, inline em desktop */}
                      <div className="flex items-center justify-between gap-1 lg:flex lg:items-center lg:gap-4 lg:shrink-0">
                        <div className="flex-1 text-center rounded bg-muted/40 lg:bg-transparent px-1 py-1 lg:py-0">
                          <p className="text-[9px] lg:text-xs text-muted-foreground leading-none">Total</p>
                          <p className="font-bold text-xs lg:text-sm leading-tight">{formatKg(total)}</p>
                        </div>
                        <div className="flex-1 text-center rounded bg-muted/40 lg:bg-transparent px-1 py-1 lg:py-0">
                          <p className="text-[9px] lg:text-xs text-muted-foreground leading-none">SQ</p>
                          <p className="text-xs lg:text-sm font-medium leading-tight">{student.squat1RM}</p>
                        </div>
                        <div className="flex-1 text-center rounded bg-muted/40 lg:bg-transparent px-1 py-1 lg:py-0">
                          <p className="text-[9px] lg:text-xs text-muted-foreground leading-none">BP</p>
                          <p className="text-xs lg:text-sm font-medium leading-tight">{student.bench1RM}</p>
                        </div>
                        <div className="flex-1 text-center rounded bg-muted/40 lg:bg-transparent px-1 py-1 lg:py-0">
                          <p className="text-[9px] lg:text-xs text-muted-foreground leading-none">DL</p>
                          <p className="text-xs lg:text-sm font-medium leading-tight">{student.deadlift1RM}</p>
                        </div>
                      </div>

                      {/* Status (apenas desktop) */}
                      <div className="hidden lg:flex items-center gap-3 shrink-0">
                        <Badge variant="outline" className={st.className}>{st.label}</Badge>
                      </div>

                      {/* Ações Treino + Mobilidade */}
                      <div className="grid grid-cols-2 gap-1.5 lg:flex lg:gap-2 lg:shrink-0">
                        <Button variant="outline" size="sm" className="h-7 lg:h-8 gap-1 text-[11px] lg:text-xs px-2" onClick={(e) => { e.stopPropagation(); setWorkoutStudent(student); }}>
                          <Dumbbell className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                          Treino
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 lg:h-8 gap-1 text-[11px] lg:text-xs px-2" onClick={(e) => { e.stopPropagation(); navigate(`/students/${student.id}/mobility`); }}>
                          <Activity className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                          Mobilidade
                        </Button>
                      </div>
                    </div>

                    {/* Sub-cards de feedback semanal */}
                    <div className="mt-3 space-y-2">
                      {isAdmin && (
                        <FeedbackCard
                          studentId={student.id}
                          card="orange"
                          label="Privado"
                          note={feedback.notesMap[student.id]?.orange ?? ""}
                          isActive={(wd) => feedback.isActive(student.id, "orange", wd)}
                          onToggle={(wd) => feedback.toggleMark(student.id, "orange", wd)}
                          onNoteChange={(t) => feedback.setNoteLocal(student.id, "orange", t)}
                        />
                      )}
                      <FeedbackCard
                        studentId={student.id}
                        card="green"
                        label="Equipe"
                        note={feedback.notesMap[student.id]?.green ?? ""}
                        isActive={(wd) => feedback.isActive(student.id, "green", wd)}
                        onToggle={(wd) => feedback.toggleMark(student.id, "green", wd)}
                        onNoteChange={(t) => feedback.setNoteLocal(student.id, "green", t)}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhum aluno encontrado.</p>
            )}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!o) { setNewCpfError(null); setNewLoginPasswordConfirm(""); } setOpen(o); }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Aluno</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-2">
              <Label htmlFor="student-name">Nome</Label>
              <Input id="student-name" placeholder="Nome completo" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-email">Email</Label>
              <Input id="student-email" type="email" placeholder="email@exemplo.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-password">Senha de acesso do aluno <span className="text-destructive">*</span></Label>
              <Input
                id="student-password"
                type="password"
                placeholder="Senha simples (mín. 6 caracteres)"
                value={newLoginPassword}
                onChange={(e) => setNewLoginPassword(e.target.value)}
                autoComplete="new-password"
                maxLength={72}
              />
              <p className="text-xs text-muted-foreground">
                O login do aluno será criado automaticamente e ele poderá acessar em /aluno/login.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-password-confirm">Confirme a senha <span className="text-destructive">*</span></Label>
              <Input
                id="student-password-confirm"
                type="password"
                placeholder="Digite a senha novamente"
                value={newLoginPasswordConfirm}
                onChange={(e) => setNewLoginPasswordConfirm(e.target.value)}
                autoComplete="new-password"
                maxLength={72}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-cpf">CPF <span className="text-destructive">*</span></Label>
              <Input
                id="student-cpf"
                placeholder="000.000.000-00"
                value={newCpf}
                onChange={(e) => { setNewCpf(formatCPFInput(e.target.value)); if (newCpfError) setNewCpfError(null); }}
                maxLength={14}
                aria-invalid={!!newCpfError}
                className={newCpfError ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {newCpfError && <p className="text-xs text-destructive">{newCpfError}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="student-phone">Número de Telefone</Label>
                <Input id="student-phone" type="tel" placeholder="(11) 99999-9999" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} maxLength={20} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-state">Estado que compete</Label>
                <Input id="student-state" placeholder="Ex: SP" value={newState} onChange={(e) => setNewState(e.target.value)} maxLength={50} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Sexo</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={newSex === "M" ? "default" : "outline"} onClick={() => setNewSex("M")}>Masculino</Button>
                  <Button type="button" variant={newSex === "F" ? "default" : "outline"} onClick={() => setNewSex("F")}>Feminino</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-bw">Peso corporal (kg)</Label>
                <Input
                  id="student-bw" type="text" inputMode="decimal" placeholder="Ex: 82,5"
                  value={newBodyWeight}
                  onChange={(e) => setNewBodyWeight(e.target.value.replace(/[^0-9.,]/g, ""))}
                  maxLength={6}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  {allPlans.map((p) => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data que iniciou no acompanhamento</Label>
              <Popover modal>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newStartDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newStartDate ? format(newStartDate, "dd/MM/yyyy") : "Selecione a data de início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    locale={ptBR}
                    mode="single"
                    selected={newStartDate}
                    onSelect={setNewStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="student-sq">Squat 1RM</Label>
                <Input
                  id="student-sq" type="text" inputMode="decimal" placeholder="kg" value={newSquat}
                  onChange={(e) => { setNewSquat(sanitize1RMInput(e.target.value)); if (newRmErrors.squat) setNewRmErrors({ ...newRmErrors, squat: undefined }); }}
                  aria-invalid={!!newRmErrors.squat}
                  className={newRmErrors.squat ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {newRmErrors.squat && <p className="text-xs text-destructive">{newRmErrors.squat}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="student-bp">Bench 1RM</Label>
                <Input
                  id="student-bp" type="text" inputMode="decimal" placeholder="kg" value={newBench}
                  onChange={(e) => { setNewBench(sanitize1RMInput(e.target.value)); if (newRmErrors.bench) setNewRmErrors({ ...newRmErrors, bench: undefined }); }}
                  aria-invalid={!!newRmErrors.bench}
                  className={newRmErrors.bench ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {newRmErrors.bench && <p className="text-xs text-destructive">{newRmErrors.bench}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="student-dl">Deadlift 1RM</Label>
                <Input
                  id="student-dl" type="text" inputMode="decimal" placeholder="kg" value={newDeadlift}
                  onChange={(e) => { setNewDeadlift(sanitize1RMInput(e.target.value)); if (newRmErrors.deadlift) setNewRmErrors({ ...newRmErrors, deadlift: undefined }); }}
                  aria-invalid={!!newRmErrors.deadlift}
                  className={newRmErrors.deadlift ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {newRmErrors.deadlift && <p className="text-xs text-destructive">{newRmErrors.deadlift}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? "Adicionando..." : "Adicionar Aluno"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editStudent} onOpenChange={(o) => { if (!o) { setEditStudent(null); setRmStudentId(undefined); setEditRmErrors({}); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Dados</DialogTitle>
          </DialogHeader>
          {editStudent && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editStudent.name} onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editStudent.email} onChange={(e) => setEditStudent({ ...editStudent, email: e.target.value })} maxLength={255} />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={editStudent.cpf || ""}
                  onChange={(e) => setEditStudent({ ...editStudent, cpf: formatCPFInput(e.target.value) })}
                  maxLength={14}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input type="tel" value={editStudent.phone || ""} onChange={(e) => setEditStudent({ ...editStudent, phone: e.target.value })} maxLength={20} />
                </div>
                <div className="space-y-2">
                  <Label>Estado que compete</Label>
                  <Input value={editStudent.state || ""} onChange={(e) => setEditStudent({ ...editStudent, state: e.target.value })} maxLength={50} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sexo</Label>
                <div className="grid grid-cols-2 gap-2 max-w-sm">
                  <Button type="button" variant={editStudent.sex === "M" ? "default" : "outline"} onClick={() => setEditStudent({ ...editStudent, sex: "M" })}>Masculino</Button>
                  <Button type="button" variant={editStudent.sex === "F" ? "default" : "outline"} onClick={() => setEditStudent({ ...editStudent, sex: "F" })}>Feminino</Button>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <BodyWeightHistorySection studentId={editStudent.id} />
              </div>

              {/* Acesso do aluno (criar ou redefinir senha) */}
              <div className="border-t border-border pt-4 space-y-2">
                <Label className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Acesso do aluno
                </Label>
                {editStudent.userId ? (
                  <>
                    <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                      <div className="space-y-0.5">
                        <p className="font-medium text-emerald-700 dark:text-emerald-400">
                          Login ativo para {editStudent.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          O aluno acessa em /aluno/login. Você pode definir uma nova senha abaixo.
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">
                      Redefinir senha (mín. 6 caracteres). A senha atual não pode ser exibida — apenas substituída.
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="Nova senha"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showLoginPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => setResetPasswordConfirmOpen(true)}
                        disabled={resettingPassword}
                        className="gap-1"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        {resettingPassword ? "Salvando..." : "Redefinir senha"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Defina uma senha para o aluno acessar o treino em /aluno/login
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="Senha simples (mín. 6 caracteres)"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showLoginPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={handleCreateLogin}
                        disabled={creatingLogin}
                        className="gap-1"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        {creatingLogin ? "Criando..." : "Criar acesso"}
                      </Button>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Squat 1RM</Label>
                  <Input
                    type="text" inputMode="decimal" value={editStudent.squat1RM === 0 ? "" : String(editStudent.squat1RM)}
                    onChange={(e) => { setEditStudent({ ...editStudent, squat1RM: sanitize1RMNumber(e.target.value) }); if (editRmErrors.squat) setEditRmErrors({ ...editRmErrors, squat: undefined }); }}
                    aria-invalid={!!editRmErrors.squat}
                    className={editRmErrors.squat ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {editRmErrors.squat && <p className="text-xs text-destructive">{editRmErrors.squat}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Bench 1RM</Label>
                  <Input
                    type="text" inputMode="decimal" value={editStudent.bench1RM === 0 ? "" : String(editStudent.bench1RM)}
                    onChange={(e) => { setEditStudent({ ...editStudent, bench1RM: sanitize1RMNumber(e.target.value) }); if (editRmErrors.bench) setEditRmErrors({ ...editRmErrors, bench: undefined }); }}
                    aria-invalid={!!editRmErrors.bench}
                    className={editRmErrors.bench ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {editRmErrors.bench && <p className="text-xs text-destructive">{editRmErrors.bench}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Deadlift 1RM</Label>
                  <Input
                    type="text" inputMode="decimal" value={editStudent.deadlift1RM === 0 ? "" : String(editStudent.deadlift1RM)}
                    onChange={(e) => { setEditStudent({ ...editStudent, deadlift1RM: sanitize1RMNumber(e.target.value) }); if (editRmErrors.deadlift) setEditRmErrors({ ...editRmErrors, deadlift: undefined }); }}
                    aria-invalid={!!editRmErrors.deadlift}
                    className={editRmErrors.deadlift ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {editRmErrors.deadlift && <p className="text-xs text-destructive">{editRmErrors.deadlift}</p>}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 px-3 py-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total SBD (atualiza ao digitar)</span>
                <span className="font-bold text-primary tabular-nums">
                  {formatKg(sbdTotal(editStudent.squat1RM, editStudent.bench1RM, editStudent.deadlift1RM))}
                </span>
              </div>


              {/* 1RM Evolution Chart */}
              <div className="border-t border-border pt-4 mt-4">
                <RmEvolutionChart records={rmRecords} loading={rmLoading} onDeleteRecord={deleteRmRecord} />
              </div>

            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isAdmin && (
              <Button variant="destructive" className="gap-2 sm:mr-auto" onClick={() => { if (editStudent) setDeleteConfirmId(editStudent.id); }}>
                <Trash2 className="h-4 w-4" />
                Apagar Aluno
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditStudent(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não poderá ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Sim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetPasswordConfirmOpen} onOpenChange={(o) => !o && setResetPasswordConfirmOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Redefinir senha?</AlertDialogTitle>
            <AlertDialogDescription>
              A senha atual do aluno será substituída e não poderá ser recuperada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetPasswordConfirmOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CoachLayout>
  );
};

export default Students;
