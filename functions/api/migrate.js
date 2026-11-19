// One-time copy from the old Netlify site. Owner only.
//   POST /api/migrate?step=docs            -> copies every binder record, returns the photo ids they use
//   POST /api/migrate?step=photos  {ids}   -> copies up to 40 of those photos (call repeatedly)
import { isOwner, json, getDoc, putDoc, setupProblem } from "../_lib/auth.js";
import { clean, tidy } from "./collection.js";

const OLD = "https://toppsheritage.netlify.app";
const KEYS = ["binder/collection", ...Array.from({ length: 25 }, (_, i) => "binder/collection-" + (2001 + i))];

export async function onRequestPost({ request, env }) {
  const problem = setupProblem(env);
  if (problem) return json({ error: problem }, 500);
  if (!(await isOwner(request, env))) return json({ error: "sign in first" }, 401);
  const step = new URL(request.url).searchParams.get("step");

  if (step === "docs") {
    const report = [], ids = new Set();
    for (const key of KEYS) {
      let r;
      try { r = await fetch(OLD + "/api/collection?key=" + encodeURIComponent(key)); }
      catch (e) { report.push({ key, error: "couldn't reach the old site" }); continue; }
      if (!r.ok) { report.push({ key, error: "old site said " + r.status }); continue; }
      const { data } = await r.json();
      if (!data) continue;
      const doc = tidy(clean(data));
      const here = await getDoc(env, key);
      if (here && Object.keys(here.owned || {}).length > Object.keys(doc.owned || {}).length) {
        report.push({ key, skipped: "this site already has more cards marked owned" });
      } else {
        await putDoc(env, key, doc);
        report.push({ key, owned: Object.keys(doc.owned).length, prices: Object.keys(doc.price).length, photos: Object.keys(doc.photos).length });
      }
      for (const id of Object.values(doc.photos || {})) if (typeof id === "string") ids.add(id);
    }
    return json({ report, photoIds: [...ids] });
  }

  if (step === "photos") {
    let ids = [];
    try { ids = ((await request.json()).ids || []).filter((id) => /^[\w-]{1,80}$/.test(id)).slice(0, 40); } catch {}
    const done = [], failed = [];
    for (const id of ids) {
      if (await env.PHOTOS.get(id, { type: "stream" }).then((s) => { if (s) s.cancel(); return !!s; })) { done.push(id); continue; }
      let r;
      try { r = await fetch(OLD + "/_blob/" + encodeURIComponent(id)); } catch (e) { failed.push(id); continue; }
      if (!r.ok) { failed.push(id); continue; }
      await env.PHOTOS.put(id, await r.arrayBuffer(), { metadata: { type: (r.headers.get("content-type") || "image/jpeg").split(";")[0] } });
      done.push(id);
    }
    return json({ done, failed });
  }
  return json({ error: "unknown step" }, 400);
}
