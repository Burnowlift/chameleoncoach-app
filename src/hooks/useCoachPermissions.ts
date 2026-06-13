import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isAdminCoach, MENU_KEYS } from "@/lib/admin";

/**
 * Permissões do treinador atualmente logado.
 * Super admin retorna todas liberadas automaticamente.
 */
export function useMyPermissions() {
  const { user } = useAuth();
  const email = user?.email ?? null;
  const isAdmin = isAdminCoach(email);

  const query = useQuery({
    queryKey: ["my-permissions", email],
    enabled: !!email && !isAdmin,
    queryFn: async () => {
      // Busca o coach.id pelo email
      const { data: coach } = await supabase
        .from("coaches")
        .select("id")
        .ilike("email", email!)
        .maybeSingle();

      if (!coach) return new Set<string>();

      const { data } = await supabase
        .from("coach_permissions")
        .select("menu_key, allowed")
        .eq("coach_id", coach.id);

      const set = new Set<string>();
      (data ?? []).forEach((p) => {
        if (p.allowed) set.add(p.menu_key);
      });
      return set;
    },
  });

  const allowedSet = isAdmin
    ? new Set<string>(MENU_KEYS)
    : query.data ?? new Set<string>();

  return {
    isAdmin,
    loading: !isAdmin && (query.isLoading || !query.isFetched),
    canAccess: (menuKey: string) => isAdmin || allowedSet.has(menuKey),
    allowedSet,
  };
}

/**
 * Hook para o super admin gerenciar as permissões de um treinador alvo.
 */
export function useCoachPermissionsAdmin(coachId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["coach-permissions", coachId],
    enabled: !!coachId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_permissions")
        .select("menu_key, allowed")
        .eq("coach_id", coachId!);
      if (error) throw error;
      const map: Record<string, boolean> = {};
      (data ?? []).forEach((p) => {
        map[p.menu_key] = p.allowed;
      });
      return map;
    },
  });

  const save = useMutation({
    mutationFn: async (state: Record<string, boolean>) => {
      if (!coachId) throw new Error("Treinador não selecionado");

      // Estado anterior para diff
      const { data: previous } = await supabase
        .from("coach_permissions")
        .select("menu_key, allowed")
        .eq("coach_id", coachId);
      const prevMap: Record<string, boolean> = {};
      (previous ?? []).forEach((p) => (prevMap[p.menu_key] = p.allowed));

      const rows = MENU_KEYS.map((key) => ({
        coach_id: coachId,
        menu_key: key,
        allowed: !!state[key],
      }));
      const { error } = await supabase
        .from("coach_permissions")
        .upsert(rows, { onConflict: "coach_id,menu_key" });
      if (error) throw error;

      // Auditoria: só registra menus que mudaram
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email ?? "desconhecido";
      const auditRows = MENU_KEYS.filter(
        (k) => !!state[k] !== !!prevMap[k],
      ).map((k) => ({
        coach_id: coachId,
        menu_key: k,
        old_allowed: prevMap[k] ?? null,
        new_allowed: !!state[k],
        changed_by_email: email,
      }));
      if (auditRows.length > 0) {
        await supabase.from("coach_permission_audit").insert(auditRows);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-permissions", coachId] });
      qc.invalidateQueries({ queryKey: ["coach-permission-audit", coachId] });
      qc.invalidateQueries({ queryKey: ["my-permissions"] });
    },
  });

  return { ...query, save };
}

export interface PermissionAuditEntry {
  id: string;
  coach_id: string;
  menu_key: string;
  old_allowed: boolean | null;
  new_allowed: boolean;
  changed_by_email: string;
  changed_at: string;
}

export function useCoachPermissionAudit(coachId: string | null) {
  return useQuery({
    queryKey: ["coach-permission-audit", coachId],
    enabled: !!coachId,
    queryFn: async (): Promise<PermissionAuditEntry[]> => {
      const { data, error } = await supabase
        .from("coach_permission_audit")
        .select("*")
        .eq("coach_id", coachId!)
        .order("changed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PermissionAuditEntry[];
    },
  });
}
