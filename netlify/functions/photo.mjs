// Photos the owner uploads of their own cards. Served at /_blob/<id>, which is the address the page uses.
import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";
import { isOwner, json } from "../lib/auth.mjs";

const MAX = 4 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export default async (req, context) => {
  const store = getStore({ name: "photos", consistency: "strong" });
  const url = new URL(req.url);

  if (req.method === "GET") {
    const id = context.params.id || url.searchParams.get("id") || "";
    if (!/^[\w-]{1,80}$/.test(id)) return new Response("not found", { status: 404 });
    const r = await store.getWithMetadata(id, { type: "arrayBuffer" });
    if (!r) return new Response("not found", { status: 404 });
    return new Response(r.data, { headers: { "content-type": r.metadata.type || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
  }
  if (!isOwner(req)) return json({ error: "sign in first" }, 401);

  if (req.method === "POST") {
    const type = (req.headers.get("content-type") || "").split(";")[0];
    if (!TYPES.includes(type)) return json({ error: "photos only" }, 415);
    const buf = await req.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > MAX) return json({ error: "photo too large" }, 413);
    const id = randomBytes(16).toString("hex");
    await store.set(id, buf, { metadata: { type } });
    return json({ id });
  }
  if (req.method === "DELETE") {
    const id = url.searchParams.get("id") || "";
    if (/^[\w-]{1,80}$/.test(id)) await store.delete(id);
    return json({ ok: true });
  }
  return json({ error: "method" }, 405);
};
export const config = { path: ["/api/photo", "/_blob/:id"] };
