import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Student } from "@/lib/mock-data";

const mapRow = (row: any): Student => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone || undefined,
  state: row.state || undefined,
  avatar: row.avatar || undefined,
  plan: row.plan,
  planValue: Number(row.plan_value),
  status: row.status as Student["status"],
  joinedAt: row.joined_at,
  paymentDueDate: row.payment_due_date || "",
  squat1RM: Number(row.squat_1rm),
  bench1RM: Number(row.bench_1rm),
  deadlift1RM: Number(row.deadlift_1rm),
  renewalDay: row.renewal_day || undefined,
  cpf: row.cpf || undefined,
  hasNutritionist: !!row.has_nutritionist,
  userId: row.user_id ?? null,
  sex: (row.sex as "M" | "F" | null) ?? null,
  bodyWeight: row.body_weight_kg != null ? Number(row.body_weight_kg) : null,
});

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase.from("students").select("*").order("name");
    if (!error && data) setStudents(data.map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (student: Omit<Student, "id">, requestId?: string): Promise<string | null> => {
    const cleanCpf = (student.cpf || "").replace(/\D/g, "");
    const { data, error } = await supabase.from("students").insert({
      name: student.name,
      email: student.email,
      phone: student.phone || null,
      state: student.state || null,
      plan: student.plan,
      plan_value: student.planValue,
      status: student.status,
      joined_at: student.joinedAt,
      payment_due_date: student.paymentDueDate || null,
      squat_1rm: student.squat1RM,
      bench_1rm: student.bench1RM,
      deadlift_1rm: student.deadlift1RM,
      renewal_day: student.renewalDay || null,
      cpf: cleanCpf || null,
      has_nutritionist: student.hasNutritionist ?? false,
      sex: student.sex ?? null,
      body_weight_kg: student.bodyWeight ?? null,
      request_id: requestId ?? null,
    }).select("id").maybeSingle();
    if (error) {
      // Idempotência: se o mesmo requestId já criou um aluno, retorna o existente.
      if (requestId && (error.code === "23505" || /duplicate key|unique/i.test(error.message))) {
        const { data: existing } = await supabase
          .from("students")
          .select("id")
          .eq("request_id", requestId)
          .maybeSingle();
        if (existing?.id) {
          await fetch();
          return existing.id;
        }
      }
      throw error;
    }
    await fetch();
    return data?.id ?? null;
  };


  const update = async (student: Student) => {
    const cleanCpf = (student.cpf || "").replace(/\D/g, "");
    const { error } = await supabase.from("students").update({
      name: student.name,
      email: student.email,
      phone: student.phone || null,
      state: student.state || null,
      plan: student.plan,
      plan_value: student.planValue,
      status: student.status,
      joined_at: student.joinedAt,
      payment_due_date: student.paymentDueDate || null,
      squat_1rm: student.squat1RM,
      bench_1rm: student.bench1RM,
      deadlift_1rm: student.deadlift1RM,
      renewal_day: student.renewalDay || null,
      cpf: cleanCpf || null,
      has_nutritionist: student.hasNutritionist ?? false,
      sex: student.sex ?? null,
      body_weight_kg: student.bodyWeight ?? null,
    }).eq("id", student.id);
    if (error) throw error;
    await fetch();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) throw error;
    await fetch();
  };

  return { students, loading, create, update, remove, refetch: fetch };
}
