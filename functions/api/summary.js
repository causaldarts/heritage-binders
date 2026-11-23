// How many cards are owned in each year's binder, in one request: { counts: { "2025": 164, ... } }.
import { json, getDoc } from "../_lib/auth.js";

export async function onRequestGet({ env }) {
  const counts = {};
  await Promise.all(Array.from({ length: 26 }, (_, i) => 2026 - i).map(async (y) => {
    const d = await getDoc(env, y === 2026 ? "binder/collection" : "binder/collection-" + y);
    if (d) counts[y] = Object.values(d.owned || {}).filter((v) => v === true).length;
  }));
  return json({ counts });
}
