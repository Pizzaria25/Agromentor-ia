import { createClient } from "@/lib/supabase/server";
import { Plan, weeklyQuestionLimit, getUserPlan } from "@/lib/billing";
import { startOfISOWeek, isoDate } from "@/lib/time";

export async function getWeeklyUsage(userId: string) {
  const supabase = await createClient();
  const weekStart = isoDate(startOfISOWeek(new Date()));
  const { data, error } = await supabase
    .from("usage_weekly")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .single();

  if (!data || error) {
    const { data: created } = await supabase
      .from("usage_weekly")
      .insert({ user_id: userId, week_start: weekStart, used: 0 })
      .select("*")
      .single();
    return created ?? { user_id: userId, week_start: weekStart, used: 0 };
  }

  return data;
}

export async function consumeQuestion(userId: string, plan: Plan, amount = 1) {
  if (plan !== "free") return { allowed: true, remaining: 9999 };

  const supabase = await createClient();
  const row = await getWeeklyUsage(userId);
  const limit = weeklyQuestionLimit(plan);
  const nextUsed = (row.used ?? 0) + amount;

  if (nextUsed > limit) {
    return { allowed: false, remaining: Math.max(0, limit - (row.used ?? 0)), limit };
  }

  await supabase
    .from("usage_weekly")
    .update({ used: nextUsed })
    .eq("user_id", userId)
    .eq("week_start", row.week_start);

  return { allowed: true, remaining: Math.max(0, limit - nextUsed), limit };
}

export async function getUsageStatus(userId: string, email?: string | null) {
  const plan = await getUserPlan(userId, email);
  const limit = weeklyQuestionLimit(plan);
  if (plan !== "free") return { plan, remaining: 9999, limit: 9999, used: 0 };

  const row = await getWeeklyUsage(userId);
  const used = row.used ?? 0;
  return { plan, used, limit, remaining: Math.max(0, limit - used), week_start: row.week_start };
}
