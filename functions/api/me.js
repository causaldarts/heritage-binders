import { isOwner, json } from "../_lib/auth.js";
export async function onRequestGet({ request, env }) {
  return (await isOwner(request, env)) ? json({ owner: true }) : json({ owner: false }, 401);
}
