// Serves an uploaded photo: /_blob/<id>
export async function onRequestGet({ params, env }) {
  const id = String(params.id || "");
  if (!env.PHOTOS || !/^[\w-]{1,80}$/.test(id)) return new Response("not found", { status: 404 });
  const r = await env.PHOTOS.getWithMetadata(id, { type: "arrayBuffer" });
  if (!r || !r.value) return new Response("not found", { status: 404 });
  return new Response(r.value, { headers: { "content-type": (r.metadata && r.metadata.type) || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
}
