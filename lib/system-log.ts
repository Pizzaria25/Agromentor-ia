import { createAdminClient } from "@/lib/supabase/admin";

export type SystemLogLevel = "info" | "warn" | "error";

type RecordSystemLogArgs = {
  level: SystemLogLevel;
  source: string;
  message: string;
  details?: Record<string, unknown> | null;
  userId?: string | null;
  userEmail?: string | null;
};

export async function recordSystemLog(args: RecordSystemLogArgs) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("system_logs").insert({
      level: args.level,
      source: args.source,
      message: args.message,
      details: args.details ?? null,
      user_id: args.userId ?? null,
      user_email: args.userEmail?.toLowerCase() ?? null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("SYSTEM_LOG_INSERT_ERROR:", error.message);
    }
  } catch (error) {
    console.error("SYSTEM_LOG_FAILURE:", error instanceof Error ? error.message : error);
  }
}

export function summarizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 4).join("\n") ?? null,
    };
  }

  return {
    message: typeof error === "string" ? error : JSON.stringify(error),
  };
}
