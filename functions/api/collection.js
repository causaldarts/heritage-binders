// One saved record per binder: { owned: {n: true}, photos: {n: id}, rot: {n: bool}, price: {n: dollars},
//   qty: {n: copies 2+}, fav: {n: true}, vx: {id: {p: photo id, t: title, k: kind}} (vault showcase items) }.
// Anyone can read it; only the signed-in owner can change it.
import { isOwner, json, getDoc, putDoc, setupProblem } from "../_lib/auth.js";

const KEY = /^binder\/collection(-\d{4})?$/;
const FIELDS = ["owned", "photos", "rot", "price", "qty", "fav", "vx"];
const KINDS = ["auto", "relic", "graded", "insert", "other"];

export function clean(d) {
  const out = {};
  for (const f of FIELDS) {
    const src = d && typeof d[f] === "object" && d[f] ? d[f] : null;
    if (!src) continue;
    out[f] = {};
    for (const k of Object.keys(src)) {
      if (!/^\d{1,4}$/.test(k)) continue;
      const v = src[k];
      if (f === "price") { if (v === null || (typeof v === "number" && isFinite(v) && v >= 0 && v <= 100000)) out[f][k] = v; continue; }
      if (f === "qty") { if (v === null || (Number.isInteger(v) && v >= 2 && v <= 999)) out[f][k] = v; continue; }
      if (f === "fav") { if (v === null || v === true) out[f][k] = v; continue; }
      if (f === "vx") {
        if (v === null) { out[f][k] = null; continue; }
        if (v && typeof v === "object" && typeof v.p === "string" && /^[\w-]{1,80}$/.test(v.p))
          out[f][k] = { p: v.p, t: String(v.t || "").slice(0, 80), k: KINDS.includes(v.k) ? v.k : "other" };
        continue;
      }
      if (v === null || typeof v === "boolean" || (typeof v === "string" && /^[\w-]{1,80}$/.test(v))) out[f][k] = v;
    }
  }
  return out;
}
export function tidy(doc) {                     // drop cleared entries so the record stays small
  for (const f of FIELDS) {
    if (!doc[f]) { doc[f] = {}; continue; }
    for (const k of Object.keys(doc[f])) if (doc[f][k] === null || (f === "owned" && doc[f][k] !== true)) delete doc[f][k];
  }
  return doc;
}

export async function onRequest({ request, env }) {
  const problem = setupProblem(env);
  if (problem) return json({ error: problem }, 500);
  const url = new URL(request.url), key = url.searchParams.get("key") || "";
  if (!KEY.test(key)) return json({ error: "unknown binder" }, 400);

  if (request.method === "GET") {
    const data = await getDoc(env, key);
    return json({ exists: !!data, data: data || null });
  }
  if (request.method !== "PUT") return json({ error: "method" }, 405);
  if (!(await isOwner(request, env))) return json({ error: "sign in first" }, 401);

  let body;
  try { body = clean(await request.json()); } catch { return json({ error: "bad data" }, 400); }
  let doc = body;
  if (url.searchParams.get("merge")) {
    doc = (await getDoc(env, key)) || {};
    for (const f of FIELDS) if (body[f]) doc[f] = Object.assign(doc[f] || {}, body[f]);
  }
  await putDoc(env, key, tidy(doc));
  return json({ ok: true });
}
