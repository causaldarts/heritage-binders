// How many cards are owned in each year's binder, in one request: { counts: { "2025": 164, ... } }.
// A year with no saved record is left out, so the page falls back to the built-in checklist for it.
import { getStore } from "@netlify/blobs";
import { json } from "../lib/auth.mjs";

export default async () => {
  const store = getStore({ name: "binders", consistency: "strong" });
  const counts = {};
  await Promise.all(Array.from({ length: 26 }, (_, i) => 2026 - i).map(async (y) => {
    const d = await store.get("binder/collection-" + y, { type: "json" });
    if (d) counts[y] = Object.values(d.owned || {}).filter((v) => v === true).length;
  }));
  return json({ counts });
};
export const config = { path: "/api/summary" };
