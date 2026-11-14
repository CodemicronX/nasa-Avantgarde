const PRIMARY = "nvidia/nemotron-3-ultra-550b-a55b:free";
const DEFAULT_BACKUP = "google/gemma-4-31b-it:free";

type Stats = { model: string; samples: number; latency_ms: number; failure_rate: number };
export type Message = { role: "system" | "user" | "assistant"; content: string };

export function modelIds(): [string, string] {
  const qwen = Deno.env.get("PIP_OPENROUTER_QWEN_MODEL")?.trim();
  if (qwen && !/^qwen\/[a-z\d][a-z\d.-]*:free$/.test(qwen)) throw new Error("Invalid free Qwen model ID");
  return [PRIMARY, qwen || DEFAULT_BACKUP];
}

const DATABASE_TIMEOUT = 3000;
export function database(signal: AbortSignal) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Pip database configuration missing");

  async function call(path: string, body?: unknown) {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { apikey: key!, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.any([signal, AbortSignal.timeout(DATABASE_TIMEOUT)]),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("Pip database request failed");
    }
    if (response.status !== 204) return await response.json();
  }

  return {
    checkLimit: (identity: string) => call("rpc/pip_check_limit", {
      p_identity: identity, p_minute_limit: 4, p_day_limit: 20,
      p_global_limit: 10, p_global_day_limit: 25,
    }),
    loadStats: async (models: readonly string[]): Promise<Stats[]> => {
      const params = new URLSearchParams({
        select: "model,samples,latency_ms,failure_rate", model: `in.(${models.join(",")})`,
      });
      return await call(`pip_model_stats?${params}`);
    },
    record: (model: string, latency: number, success: boolean) => call("rpc/pip_record_model", {
      p_model: model, p_latency: latency, p_success: success,
    }),
  };
}
export type Database = ReturnType<typeof database>;

function rank(models: [string, string], stats: Stats[], explore: boolean) {
  const byModel = new Map(stats.map((row) => [row.model, row]));
  const score = (id: string) => {
    const stat = byModel.get(id);
    return stat && stat.samples >= 3 ? stat.latency_ms * (1 + 3 * stat.failure_rate) : 1500;
  };
  const [first, second] = [...models].sort((a, b) => score(a) - score(b));
  const [primary, backup] = explore ? [second, first] : [first, second];
  const expected = byModel.get(primary)?.latency_ms ?? 1500;
  return { primary, backup, hedgeDelay: Math.round(Math.max(700, Math.min(3000, expected * 0.75))) };
}

type EdgeGlobal = typeof globalThis & { EdgeRuntime?: { waitUntil(task: Promise<unknown>): void } };

export async function askOpenRouter<T>(options: {
  key: string;
  db: Database;
  messages: Message[];
  parse: (raw: string) => T | null;
  signal: AbortSignal;
}) {
  const { key, db, messages, parse, signal } = options;
  const models = modelIds();
  const stats = await db.loadStats(models).catch(() => []);
  signal.throwIfAborted();
  const { primary, backup, hedgeDelay } = rank(models, stats, Math.random() < 0.1);
  const stop = new AbortController();
  const raceSignal = AbortSignal.any([signal, stop.signal]);

  function record(model: string, started: number, success: boolean) {
    const task = db.record(model, performance.now() - started, success).catch(() => {
      console.warn("Pip could not persist model stats");
    });
    (globalThis as EdgeGlobal).EdgeRuntime?.waitUntil(task);
  }

  async function ask(model: string) {
    raceSignal.throwIfAborted();
    const started = performance.now();
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.any([raceSignal, AbortSignal.timeout(10_000)]),
        headers: {
          "Content-Type": "application/json", Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://codemicronx.github.io/nasa-Avantgarde/", "X-Title": "Pip",
        },
        body: JSON.stringify({ model, messages, max_tokens: 900, temperature: 0.4, stream: false, reasoning: { effort: "low", exclude: true } }),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`OpenRouter HTTP ${response.status}`);
      }
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      const answer = typeof text === "string" ? parse(text) : null;
      if (!answer) throw new Error("Empty OpenRouter answer");
      const latency_ms = Math.round(performance.now() - started);
      record(model, started, true);
      return { answer, model, via: `openrouter:${model}`, latency_ms };
    } catch (error) {
      if (!raceSignal.aborted) record(model, started, false);
      throw error;
    }
  }

  let timer: ReturnType<typeof setTimeout>;
  let launch: () => void = () => {};
  const backupTask = new Promise<Awaited<ReturnType<typeof ask>>>((resolve, reject) => {
    launch = () => {
      clearTimeout(timer);
      launch = () => {};
      ask(backup).then(resolve, reject);
    };
    timer = setTimeout(() => launch(), hedgeDelay);
  });
  const primaryTask = ask(primary);
  void primaryTask.catch(() => launch());
  try {
    return await Promise.any([primaryTask, backupTask]);
  } finally {
    clearTimeout(timer!);
    stop.abort();
  }
}
