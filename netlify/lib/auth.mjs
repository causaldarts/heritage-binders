// Owner sign-in: one password, kept in the site's ADMIN_PASSWORD environment variable.
// A sign-in returns a token signed with that password; changing the password signs everyone out.
import { createHmac, timingSafeEqual } from "node:crypto";

const DAYS = 60;
const secret = () => process.env.ADMIN_PASSWORD || "";
const sign = (payload) => createHmac("sha256", "heritage:" + secret()).update(payload).digest("base64url");
const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

export function passwordMatches(given) {
  return secret().length > 0 && same(createHmac("sha256", "pw").update(String(given)).digest(),
                                      createHmac("sha256", "pw").update(secret()).digest());
}
export function makeToken() {
  const exp = String(Date.now() + DAYS * 864e5);
  return exp + "." + sign(exp);
}
export function isOwner(req) {
  if (!secret()) return false;
  const m = /^Bearer (\d+)\.([\w-]+)$/.exec(req.headers.get("authorization") || "");
  return !!m && +m[1] > Date.now() && same(m[2], sign(m[1]));
}
export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
