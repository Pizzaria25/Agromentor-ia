import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export function getOwnerEmails(): string[] {
  const raw =
    process.env.OWNER_EMAILS ||
    process.env.DEV_ADMIN_EMAILS ||
    process.env.NEXT_PUBLIC_OWNER_EMAILS ||
    "";

  if (!raw) return [];

  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const owners = getOwnerEmails();
  if (owners.length === 0) return false;
  return owners.includes(email.toLowerCase());
}

export function isDevAdmin(email?: string | null): boolean {
  return isOwnerEmail(email);
}

export async function requireOwner() {
  const user = await requireUser();
  if (!isOwnerEmail(user.email)) redirect("/chat");
  return user;
}
