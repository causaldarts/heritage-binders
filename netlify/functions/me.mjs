import { isOwner, json } from "../lib/auth.mjs";
export default async (req) => (isOwner(req) ? json({ owner: true }) : json({ owner: false }, 401));
export const config = { path: "/api/me" };
