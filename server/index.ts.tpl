import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";
import { execute, runAfter, handleWebhook } from "https://cdn.jsdelivr.net/gh/coscoskr/shop@{{SHA}}/server/core.js";
import { makePgDb } from "https://cdn.jsdelivr.net/gh/coscoskr/shop@{{SHA}}/server/pg.js";

// 只允許網站本身呼叫(瀏覽器端 CORS)。換網域時,在 Edge Function 的 Secrets 加 ALLOWED_ORIGINS(逗號分隔)。
const ALLOWED = new Set(["https://coscoskr.github.io", ...(Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean)]);
const SEC = { "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const corsFor = (req: Request) => {
  const o = req.headers.get("origin") || "";
  const h: Record<string, string> = { "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization, apikey", "Access-Control-Max-Age": "600", "Vary": "Origin" };
  if (ALLOWED.has(o)) h["Access-Control-Allow-Origin"] = o;
  return h;
};
const jsonR = (req: Request, o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...SEC, ...corsFor(req), "Content-Type": "application/json; charset=utf-8" } });

// 簡易限流(以來源 IP 計,每個執行個體各自計算,擋一般的灌單與暴力嘗試)
const hits = new Map<string, { n: number; t: number }>();
const SENSITIVE = new Set(["adminLogin", "memberLogin", "placeOrder", "lineLiff", "lineStart", "lineCallback", "trackLink"]);
function limited(ip: string, fn: string): boolean {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v.t > 60000) hits.delete(k);
  const key = (SENSITIVE.has(fn) ? "s:" : "g:") + ip;
  const cap = SENSITIVE.has(fn) ? 20 : 240;
  const e = hits.get(key);
  if (!e || now - e.t > 60000) { hits.set(key, { n: 1, t: now }); return false; }
  e.n++;
  return e.n > cap;
}

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false, idle_timeout: 20, connect_timeout: 15 });
const db = makePgDb(sql);
const env = {
  SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  RESEND_API_KEY: Deno.env.get("RESEND_API_KEY"),
  MAIL_FROM: Deno.env.get("MAIL_FROM"),
  props: {
    LINE_LOGIN_ID: Deno.env.get("LINE_LOGIN_ID"),
    LINE_LOGIN_SECRET: Deno.env.get("LINE_LOGIN_SECRET"),
    LINE_MSG_TOKEN: Deno.env.get("LINE_MSG_TOKEN"),
    APP_URL: Deno.env.get("APP_URL"),
  } as Record<string, string | undefined>,
};
for (const k of Object.keys(env.props)) if (env.props[k] === undefined) delete env.props[k];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...SEC, ...corsFor(req) } });
  if (req.method === "GET") return jsonR(req, { ok: true, service: "coscos-api" });
  const sig = req.headers.get("x-line-signature");
  if (sig) {
    // LINE 官方帳號的 Webhook(由簽章驗證身分)
    try {
      const ok = await handleWebhook({ rawBody: await req.text(), signature: sig, db, env });
      return ok ? jsonR(req, { ok: true }) : jsonR(req, { ok: false }, 401);
    } catch (e) {
      console.error("webhook error", e);
      return jsonR(req, { ok: false }, 500);
    }
  }
  const len = Number(req.headers.get("content-length") || 0);
  if (len > 6_000_000) return jsonR(req, { ok: false, error: "資料太大" }, 413);
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  let text = "";
  try { text = await req.text(); } catch (_e) { return jsonR(req, { ok: false, error: "格式不正確" }, 400); }
  if (text.length > 6_000_000) return jsonR(req, { ok: false, error: "資料太大" }, 413);
  let msg: { fn?: string; args?: unknown[] };
  try { msg = JSON.parse(text); } catch (_e) { return jsonR(req, { ok: false, error: "格式不正確" }, 400); }
  const fn = String(msg.fn || "");
  if (limited(ip, fn)) return jsonR(req, { ok: false, error: "操作太頻繁,請稍後再試" }, 429);
  try {
    const { body, after } = await execute({ fn, args: msg.args || [], db, env });
    // @ts-ignore EdgeRuntime 由 Supabase 提供
    if (after.length) EdgeRuntime.waitUntil(runAfter(after, env));
    return jsonR(req, body);
  } catch (e) {
    console.error("api error", e);
    return jsonR(req, { ok: false, error: "伺服器忙碌,請稍後再試" }, 500);
  }
});
