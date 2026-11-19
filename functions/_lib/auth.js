// Owner sign-in for the Cloudflare version: same rules as before.
// One password in the ADMIN_PASSWORD setting; a sign-in token lasts 60 days.
const DAYS = 60;
const enc = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(key, msg) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(msg));
}
function same(a, b) {               // constant-time compare of two strings
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const secret = (env) => env.ADMIN_PASSWORD || "";
const sign = async (env, payload) => b64url(await hmac("heritage:" + secret(env), payload));

export async function passwordMatches(env, given) {
  if (!secret(env)) return false;
  return same(b64url(await hmac("pw", String(given))), b64url(await hmac("pw", secret(env))));
}
export async function makeToken(env) {
  const exp = String(Date.now() + DAYS * 864e5);
  return exp + "." + (await sign(env, exp));
}
export async function isOwner(request, env) {
  if (!secret(env)) return false;
  const m = /^Bearer (\d+)\.([\w-]+)$/.exec(request.headers.get("authorization") || "");
  return !!m && +m[1] > Date.now() && same(m[2], await sign(env, m[1]));
}
export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

// Collection records live in a small D1 (SQLite) table: one row per binder.
export async function db(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS docs (k TEXT PRIMARY KEY, v TEXT NOT NULL, updated INTEGER)").run();
  return env.DB;
}
export async function getDoc(env, key) {
  const row = await (await db(env)).prepare("SELECT v FROM docs WHERE k = ?").bind(key).first();
  return row ? JSON.parse(row.v) : null;
}
export async function putDoc(env, key, doc) {
  await (await db(env)).prepare("INSERT INTO docs (k, v, updated) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated = excluded.updated")
    .bind(key, JSON.stringify(doc), Date.now()).run();
}
export function setupProblem(env) {
  const missing = [];
  if (!env.ADMIN_PASSWORD) missing.push("ADMIN_PASSWORD");
  if (!env.DB) missing.push("DB (D1 database binding)");
  if (!env.PHOTOS) missing.push("PHOTOS (KV namespace binding)");
  return missing.length ? "Site setup is missing: " + missing.join(", ") : "";
}
