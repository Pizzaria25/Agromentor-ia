export type PlanKey = "trial" | "free" | "estudante" | "produtor" | "profissional" | "escritorio" | "usina" | "owner";

export type PlanConfig = {
  id: PlanKey;
  name: string;
  price?: string;
  messages_limit: number;
  laudos_limit: number;
  can_use_images: boolean;
  is_trial?: boolean;
  is_owner?: boolean;
};

export const PLAN_CONFIG: Record<PlanKey, PlanConfig> = {
  trial: { id: "trial", name: "Trial", messages_limit: 20, laudos_limit: 1, can_use_images: false, is_trial: true },
  free: { id: "free", name: "Free", messages_limit: 20, laudos_limit: 0, can_use_images: false },
  estudante: { id: "estudante", name: "Estudante", price: "R$ 29/mês", messages_limit: 100, laudos_limit: 3, can_use_images: false },
  produtor: { id: "produtor", name: "Produtor", price: "R$ 59/mês", messages_limit: 200, laudos_limit: 5, can_use_images: true },
  profissional: { id: "profissional", name: "Profissional", price: "R$ 99/mês", messages_limit: 9999, laudos_limit: 15, can_use_images: true },
  escritorio: { id: "escritorio", name: "Escritório", price: "R$ 149/mês", messages_limit: 9999, laudos_limit: 50, can_use_images: true },
  usina: { id: "usina", name: "Usina / Corporativo", price: "R$ 499/mês", messages_limit: 9999, laudos_limit: 9999, can_use_images: true },
  owner: { id: "owner", name: "Owner", messages_limit: 999999, laudos_limit: 999999, can_use_images: true, is_owner: true },
};

export const STRIPE_PRICE_MAP: Partial<Record<PlanKey, string | undefined>> = {
  estudante: process.env.STRIPE_PRICE_ESTUDANTE,
  produtor: process.env.STRIPE_PRICE_PRODUTOR,
  profissional: process.env.STRIPE_PRICE_PROFISSIONAL,
  escritorio: process.env.STRIPE_PRICE_ESCRITORIO,
  usina: process.env.STRIPE_PRICE_USINA,
};

export function normalizePlan(input?: string | null): PlanKey | null {
  if (!input) return null;
  const value = input.toLowerCase() as PlanKey;
  return value in PLAN_CONFIG ? value : null;
}
