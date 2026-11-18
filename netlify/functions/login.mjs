import { passwordMatches, makeToken, json } from "../lib/auth.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!process.env.ADMIN_PASSWORD) return json({ error: "ADMIN_PASSWORD is not set on this site" }, 500);
  let password = "";
  try { password = (await req.json()).password || ""; } catch {}
  if (!passwordMatches(password)) {
    await new Promise((r) => setTimeout(r, 800));   // slows down guessing
    return json({ error: "wrong password" }, 401);
  }
  return json({ token: makeToken() });
};
export const config = { path: "/api/login" };
