import Anthropic from "@anthropic-ai/sdk";

export function getAnthropic(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  // Em serverless (Vercel) cada invocação é isolada — não usar singleton global
  return new Anthropic({ apiKey: key });
}

export const CLAUDE_MODEL = "claude-sonnet-4-20250514";
