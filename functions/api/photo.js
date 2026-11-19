// Photos the owner uploads of their own cards, kept in the PHOTOS KV namespace. Served at /_blob/<id>.
import { isOwner, json, setupProblem } from "../_lib/auth.js";

const MAX = 4 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const newId = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function onRequest({ request, env }) {
  const problem = setupProblem(env);
  if (problem) return json({ error: problem }, 500);
  if (!(await isOwner(request, env))) return json({ error: "sign in first" }, 401);
  const url = new URL(request.url);

  if (request.method === "POST") {
    const type = (request.headers.get("content-type") || "").split(";")[0];
    if (!TYPES.includes(type)) return json({ error: "photos only" }, 415);
    const buf = await request.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > MAX) return json({ error: "photo too large" }, 413);
    const id = newId();
    await env.PHOTOS.put(id, buf, { metadata: { type } });
    return json({ id });
  }
  if (request.method === "DELETE") {
    const id = url.searchParams.get("id") || "";
    if (/^[\w-]{1,80}$/.test(id)) await env.PHOTOS.delete(id);
    return json({ ok: true });
  }
  return json({ error: "method" }, 405);
}
