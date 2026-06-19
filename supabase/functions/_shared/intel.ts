// supabase/functions/_shared/intel.ts
// Shared intelligence-layer plumbing for FounderRadar edge workers.

import { createClient } from "npm:@supabase/supabase-js@2";

export const serviceClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

/** Resolve the calling user from the request JWT, against RLS. */
export const userClient = (req: Request) =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      auth: { persistSession: false },
    },
  );

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// Anthropic call wrapper
// ---------------------------------------------------------------------------

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export async function callModel(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  webSearch?: boolean;
}): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: Deno.env.get("INTEL_MODEL") ?? "claude-sonnet-4-5",
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.4,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
      ...(opts.webSearch
        ? { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }] }
        : {}),
    }),
  });
  if (!res.ok) throw new Error(`model_call_failed:${res.status}:${await res.text()}`);
  const data = await res.json();
  return (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n");
}

/** Best-effort repair for truncated model JSON: close open strings/brackets. */
function repairJson(s: string): string {
  let inStr = false, esc = false;
  const stack: string[] = [];
  for (const ch of s) {
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  let out = s.trimEnd();
  if (inStr) out += '"';
  out = out.replace(/,\s*$/, "");
  while (stack.length) out += stack.pop();
  return out;
}

/** Parse a model reply that must be a single JSON value. Strips fences, repairs truncation. */
export function parseStrictJson<T>(raw: string): T {
  const clean = raw.replace(/^```(?:json)?/m, "").replace(/```\s*$/m, "").trim();
  const start = clean.search(/[[{]/);
  if (start === -1) throw new Error("no_json_in_reply");
  const body = clean.slice(start);
  try {
    return JSON.parse(body) as T;
  } catch {
    return JSON.parse(repairJson(body)) as T;
  }
}

// ---------------------------------------------------------------------------
// Stage 3 hard gate: structural corporate-filler scrubber.
// The Editor prompt forbids these; this is the deterministic backstop.
// ---------------------------------------------------------------------------

const FILLER: Array<[RegExp, string]> = [
  [/\bdelve(s|d)? into\b/gi, "dig into"],
  [/\bdelve(s|d)?\b/gi, "dig"],
  [/\b(a |stands as a |is a )?testament to\b/gi, "proof of"],
  [/\bleverag(e|es|ing)\b/gi, "use"],
  [/\bcomprehensive(ly)?\b/gi, "complete"],
  [/\bseamless(ly)?\b/gi, "smooth"],
  [/\bin today'?s (fast-paced|digital|ever-changing) (world|landscape|environment)\b/gi, ""],
  [/\bgame.?chang(er|ing)\b/gi, "shift"],
  [/\bunlock(ing)? (the )?(power|potential|value) of\b/gi, "get more from"],
  [/\brobust\b/gi, "solid"],
  [/\bsynerg(y|ies|istic)\b/gi, "fit"],
  [/\bcutting.?edge\b/gi, "new"],
  [/\bholistic(ally)?\b/gi, "whole-picture"],
  [/\bparadigm shift\b/gi, "reset"],
  [/\bit'?s (important|worth) (to note|noting) that\b/gi, ""],
  [/\bfurthermore,?\b/gi, ""],
  [/\bmoreover,?\b/gi, ""],
  [/\belevate(s|d)?\b/gi, "raise"],
  [/\bempower(s|ed|ing)?\b/gi, "let"],
];

export function scrubFiller(text: string): string {
  let out = text;
  for (const [re, sub] of FILLER) out = out.replace(re, sub);
  return out.replace(/[ \t]{2,}/g, " ").replace(/ ([,.;])/g, "$1").trim();
}

export function scrubDeep<T>(value: T): T {
  if (typeof value === "string") return scrubFiller(value) as T;
  if (Array.isArray(value)) return value.map(scrubDeep) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, scrubDeep(v)]),
    ) as T;
  }
  return value;
}
