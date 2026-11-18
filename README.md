# Topps Heritage Binders

A virtual binder for every Topps Heritage set. Anyone with the link can flip
through it; only the owner can sign in and add cards.

## How it runs
- `site/` is the website: `index.html`, one checklist file per year in `sets/`,
  and card photos packed into sheets in `cards/` (2026) and `cards2025/` (2025).
- `netlify/functions/` is the small server:
  - `/api/login` checks the owner password and hands back a 60-day sign-in.
  - `/api/collection` reads (anyone) and saves (owner only) each binder.
  - `/api/photo` and `/_blob/<id>` store and serve photos the owner uploads.
- Collections and uploaded photos are kept in Netlify Blobs (built into Netlify,
  nothing to set up).

## One setting
In Netlify: Site configuration → Environment variables → add `ADMIN_PASSWORD`.
Changing it signs every device out.

## Starting point
The checklist files carry the collection as of November 2026 (2026: 352 of 400,
2025: 143 of 725). The first change saved after signing in creates the stored
copy, and from then on the stored copy is what everyone sees.

## Adding a year
Add `site/sets/<year>.js` and its photo sheets, then add the year to `READY` in
`site/index.html`.
