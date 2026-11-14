import { isIP } from "node:net";

const MAX_QUESTION = 400;
const MAX_HISTORY = 6;
const MAX_BODY = 12_000;

type JsonObject = Record<string, unknown>;
export type Turn = { role: "user" | "model"; text: string };

const ALLOWED_ORIGIN = "https://codemicronx.github.io";
const ALLOWED_HEADERS = ["content-type", "authorization", "apikey"];

export class RequestError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}

export function cors(req: Request): Record<string, string> {
  if (req.headers.get("origin") !== ALLOWED_ORIGIN) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": ALLOWED_HEADERS.join(", "),
    "Access-Control-Max-Age": "3600",
    Vary: "Origin",
  };
}

export function validPreflight(req: Request) {
  if (req.headers.get("access-control-request-method") !== "POST") return false;
  return (req.headers.get("access-control-request-headers") || "").toLowerCase()
    .split(",").every((name) => !name.trim() || ALLOWED_HEADERS.includes(name.trim()));
}

function object(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validTurn(value: unknown): value is Turn {
  return object(value) && (value.role === "user" || value.role === "model") &&
    typeof value.text === "string" && value.text.length <= MAX_QUESTION && !!value.text.trim();
}

export async function readInput(req: Request, signal: AbortSignal) {
  if (Number(req.headers.get("content-length")) > MAX_BODY) throw new RequestError(413, "body_too_large");
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new RequestError(415, "json_required");
  }

  const reader = req.body?.getReader();
  if (!reader) throw new RequestError(400, "bad_json");
  const cancel = () => { void reader.cancel().catch(() => {}); };
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let text = "";
  let payload: unknown;
  signal.addEventListener("abort", cancel, { once: true });
  try {
    signal.throwIfAborted();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) throw new RequestError(413, "body_too_large");
      text += decoder.decode(value, { stream: true });
    }
    signal.throwIfAborted();
    payload = JSON.parse(text + decoder.decode());
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof RequestError) throw error;
    throw new RequestError(400, "bad_json");
  } finally {
    signal.removeEventListener("abort", cancel);
    cancel();
    reader.releaseLock();
  }

  if (!object(payload)) throw new RequestError(400, "bad_json");
  const { q, history = [], ctx = {}, turnstileToken } = payload;
  if (typeof q !== "string" || q.length > MAX_QUESTION || !q.trim()) throw new RequestError(400, "bad_question");
  if (!Array.isArray(history) || history.length > MAX_HISTORY || !history.every(validTurn)) {
    throw new RequestError(400, "bad_history");
  }
  if (!object(ctx)) throw new RequestError(400, "bad_context");
  return { q: q.trim(), turns: history as Turn[], ctx, turnstileToken };
}

export async function verifyAccess(req: Request, token: unknown, signal: AbortSignal) {
  const secret = Deno.env.get("PIP_TURNSTILE_SECRET_KEY")?.trim();
  if (secret) {
    if (typeof token !== "string" || !token.trim() || token.length > 2048) {
      throw new RequestError(403, "challenge_required");
    }
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]),
    });
    if (!response.ok) throw new Error("Turnstile unavailable");
    const result = await response.json();
    if (result.success !== true || result.hostname !== new URL(ALLOWED_ORIGIN).hostname || result.action !== "pip_chat") {
      throw new RequestError(403, "challenge_invalid");
    }
    return;
  }

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  // In legacy mode the Supabase gateway verifies the JWT signature before invoking the function.
  if (!anonKey || req.headers.get("authorization") !== `Bearer ${anonKey}`) throw new RequestError(401, "anon_jwt_required");
}

export async function hashIdentity(req: Request, salt: string) {
  const supplied = Deno.env.get("PIP_TRUST_CF_CONNECTING_IP") === "true" ? req.headers.get("cf-connecting-ip")?.trim() : undefined;
  const version = supplied && !supplied.includes("%") ? isIP(supplied) : 0;
  // Do not use browser-supplied forwarding headers. Missing IPs share a budget.
  const ip = version === 6 ? new URL(`http://[${supplied}]`).hostname : version === 4 ? supplied! : "unknown";
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(salt), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const hash = await crypto.subtle.sign("HMAC", key, encoder.encode(ip));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
