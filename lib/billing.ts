import { createClient } from "@/lib/supabase/server";
import { isDevAdmin } from "@/lib/auth";

export type Plan = "free" | "pro_mensal" | "pro_anual";

export function includedReportsPerMonth(plan: Plan): number {
  if (plan === "pro_anual") return 5;
  if (plan === "pro_mensal") return 3;
  return 0;
}

export function weeklyQuestionLimit(plan: Plan): number {
  if (plan === "free") return 21;
  return 10_000; // ilimitado na prática
}

export async function getUserPlan(userId: string, email?: string | null): Promise<Plan> {
  // Aba developer tem acesso total
  if (isDevAdmin(email)) return "pro_anual";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan,is_active")
    .eq("user_id", userId)
    .single();

  if (error || !data || !data.is_active) return "free";

  if (data.plan === "pro_anual") return "pro_anual";
  if (data.plan === "pro_mensal") return "pro_mensal";
  return "free";
}
