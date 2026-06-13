import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FinanceScope = "empresa" | "pessoal";
export type FinanceType = "income" | "expense";

export interface FinanceCategory {
  id: string;
  scope: FinanceScope;
  type: FinanceType;
  name: string;
  color: string;
  icon: string;
  is_default: boolean;
}

export interface FinanceTransaction {
  id: string;
  scope: FinanceScope;
  type: FinanceType;
  category_id: string | null;
  amount: number;
  description: string;
  date: string;
  recurrence_id: string | null;
  created_at: string;
}

export interface FinanceRecurrence {
  id: string;
  scope: FinanceScope;
  type: FinanceType;
  category_id: string | null;
  amount: number;
  description: string;
  day_of_month: number;
  start_date: string;
  end_date: string | null;
  active: boolean;
  last_generated_date: string | null;
}

export interface FinanceGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  color: string;
  icon: string;
  deadline: string | null;
  auto_percentage: number | null;
  auto_scope: "empresa" | "pessoal" | "both" | null;
}

export interface FinanceGoalContribution {
  id: string;
  goal_id: string;
  amount: number;
  date: string;
  source: "manual" | "auto";
  transaction_id: string | null;
  notes: string | null;
}

// ===== Categories =====
export const useFinanceCategories = () =>
  useQuery({
    queryKey: ["finance_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("finance_categories").select("*").order("name");
      if (error) throw error;
      return data as FinanceCategory[];
    },
  });

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<FinanceCategory, "id" | "is_default">) => {
      const { data, error } = await supabase.from("finance_categories").insert({ ...input, is_default: false }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance_categories"] });
      toast.success("Categoria criada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance_categories"] });
      toast.success("Categoria removida!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ===== Transactions =====
export const useFinanceTransactions = () =>
  useQuery({
    queryKey: ["finance_transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("finance_transactions").select("*").order("date", { ascending: false });
      if (error) throw error;
      return data as FinanceTransaction[];
    },
  });

export const useCreateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<FinanceTransaction, "id" | "created_at" | "recurrence_id">) => {
      const { data, error } = await supabase.from("finance_transactions").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance_transactions"] });
      qc.invalidateQueries({ queryKey: ["finance_goals"] });
      qc.invalidateQueries({ queryKey: ["finance_goal_contributions"] });
      toast.success("Lançamento adicionado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<FinanceTransaction> & { id: string }) => {
      const { error } = await supabase.from("finance_transactions").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance_transactions"] });
      toast.success("Lançamento atualizado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance_transactions"] });
      toast.success("Lançamento removido!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ===== Recurrences =====
export const useFinanceRecurrences = () =>
  useQuery({
    queryKey: ["finance_recurrences"],
    queryFn: async () => {
      const { data, error } = await supabase.from("finance_recurrences").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as FinanceRecurrence[];
    },
  });

export const useCreateRecurrence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<FinanceRecurrence, "id" | "last_generated_date">) => {
      const { data, error } = await supabase.from("finance_recurrences").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance_recurrences"] });
      toast.success("Recorrência criada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteRecurrence = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_recurrences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance_recurrences"] });
      toast.success("Recorrência removida!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

// ===== Goals =====
export const useFinanceGoals = () =>
  useQuery({
    queryKey: ["finance_goals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("finance_goals").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as FinanceGoal[];
    },
  });

export const useCreateGoal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<FinanceGoal, "id" | "current_amount">) => {
      const { data, error } = await supabase.from("finance_goals").insert({ ...input, current_amount: 0 }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance_goals"] });
      toast.success("Caixinha criada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateGoal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<FinanceGoal> & { id: string }) => {
      const { error } = await supabase.from("finance_goals").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance_goals"] });
      toast.success("Caixinha atualizada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteGoal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance_goals"] });
      toast.success("Caixinha removida!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useGoalContributions = (goalId?: string) =>
  useQuery({
    queryKey: ["finance_goal_contributions", goalId],
    queryFn: async () => {
      let q = supabase.from("finance_goal_contributions").select("*").order("date", { ascending: false });
      if (goalId) q = q.eq("goal_id", goalId);
      const { data, error } = await q;
      if (error) throw error;
      return data as FinanceGoalContribution[];
    },
  });

export const useAddContribution = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { goal_id: string; amount: number; date: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("finance_goal_contributions")
        .insert({ ...input, source: "manual" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance_goals"] });
      qc.invalidateQueries({ queryKey: ["finance_goal_contributions"] });
      toast.success("Aporte registrado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
