import { passwordMatches, makeToken, json } from "../_lib/auth.js";
export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) return json({ error: "ADMIN_PASSWORD is not set on this site" }, 500);
  let password = "";
  try { password = (await request.json()).password || ""; } catch {}
  if (!(await passwordMatches(env, password))) {
    await new Promise((r) => setTimeout(r, 800));   // slows down guessing
    return json({ error: "wrong password" }, 401);
  }
  return json({ token: await makeToken(env) });
}
