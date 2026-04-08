import { createAdminClient } from "@/lib/supabase/admin";

type UsageConsumeResult = {
  consumed: boolean;
  used: number;
  limit_value: number;
  is_owner: boolean;
};

function normalizeRpcResult(data: UsageConsumeResult[] | null) {
  return data?.[0] ?? null;
}

export async function consumeChatUsage(args: {
  userId: string;
  requestId: string;
  eventType: "chat_message" | "image_analysis";
  meta?: Record<string, unknown> | null;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_chat_usage", {
    p_user_id: args.userId,
    p_request_id: args.requestId,
    p_event_type: args.eventType,
    p_meta: args.meta ?? null,
  });

  if (error) {
    throw new Error(`Falha ao consumir contador de mensagens. Migration/RPC pendente: ${error.message}`);
  }

  const result = normalizeRpcResult(data);
  if (!result) throw new Error("RPC consume_chat_usage retornou vazio.");
  return result;
}

export async function consumeLaudoUsage(args: {
  userId: string;
  requestId: string;
  meta?: Record<string, unknown> | null;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_laudo_usage", {
    p_user_id: args.userId,
    p_request_id: args.requestId,
    p_meta: args.meta ?? null,
  });

  if (error) {
    throw new Error(`Falha ao consumir contador de laudos. Migration/RPC pendente: ${error.message}`);
  }

  const result = normalizeRpcResult(data);
  if (!result) throw new Error("RPC consume_laudo_usage retornou vazio.");
  return result;
}
