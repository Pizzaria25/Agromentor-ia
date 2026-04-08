import { createAdminClient } from "@/lib/supabase/admin";

type AuthUserLite = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
};

export async function listAllAuthUsers(): Promise<AuthUserLite[]> {
  const admin = createAdminClient();
  const users: AuthUserLite[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const batch = (data?.users ?? []).map((user) => ({
      id: user.id,
      email: (user.email ?? "").toLowerCase(),
      full_name:
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
        (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
        null,
      created_at: user.created_at ?? null,
      last_sign_in_at: user.last_sign_in_at ?? null,
    }));

    users.push(...batch);

    if ((data?.users ?? []).length < perPage) break;
    page += 1;
  }

  return users;
}

export async function findAuthUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;
  const users = await listAllAuthUsers();
  return users.find((user) => user.email === normalizedEmail) ?? null;
}
