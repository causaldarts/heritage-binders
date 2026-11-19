// One saved record per binder: { owned: {n: true}, photos: {n: id}, rot: {n: bool}, price: {n: dollars} }.
// Anyone can read it; only the signed-in owner can change it.
import { getStore } from "@netlify/blobs";
import { isOwner, json } from "../lib/auth.mjs";

const KEY = /^binder\/collection(-\d{4})?$/;
const FIELDS = ["owned", "photos", "rot", "price"];

function clean(d) {
  const out = {};
  for (const f of FIELDS) {
    const src = d && typeof d[f] === "object" && d[f] ? d[f] : null;
    if (!src) continue;
    out[f] = {};
    for (const k of Object.keys(src)) {
      if (!/^\d{1,4}$/.test(k)) continue;
      const v = src[k];
      if (f === "price") { if (v === null || (typeof v === "number" && isFinite(v) && v >= 0 && v <= 100000)) out[f][k] = v; continue; }
      if (v === null || typeof v === "boolean" || (typeof v === "string" && /^[\w-]{1,80}$/.test(v))) out[f][k] = v;
    }
  }
  return out;
}

export default async (req) => {
  const url = new URL(req.url), key = url.searchParams.get("key") || "";
  if (!KEY.test(key)) return json({ error: "unknown binder" }, 400);
  const store = getStore({ name: "binders", consistency: "strong" });

  if (req.method === "GET") {
    const data = await store.get(key, { type: "json" });
    return json({ exists: !!data, data: data || null });
  }
  if (req.method !== "PUT") return json({ error: "method" }, 405);
  if (!isOwner(req)) return json({ error: "sign in first" }, 401);

  let body;
  try { body = clean(await req.json()); } catch { return json({ error: "bad data" }, 400); }
  let doc = body;
  if (url.searchParams.get("merge")) {
    doc = (await store.get(key, { type: "json" })) || {};
    for (const f of FIELDS) if (body[f]) doc[f] = Object.assign(doc[f] || {}, body[f]);
  }
  for (const f of FIELDS) {                       // drop cleared entries so the record stays small
    if (!doc[f]) { doc[f] = {}; continue; }
    for (const k of Object.keys(doc[f])) if (doc[f][k] === null || (f === "owned" && doc[f][k] !== true)) delete doc[f][k];
  }
  await store.setJSON(key, doc);
  return json({ ok: true });
};
export const config = { path: "/api/collection" };
