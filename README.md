# Raisable — Accelerator-as-a-Service landing page

Single-page static site. No build step — deploy the `site/` folder as-is
(Netlify, Vercel, Cloudflare Pages, or any static host). Suggested domain:
`accelerator.raisable.vc`.

## Structure

- `index.html` — the whole page (copy source: `../02-landing-page-copy.md`)
- `assets/css/style.css` — design system (palette, type, layout)
- `assets/js/main.js` — video handling, scroll reveals, count-ups, form logic
- `assets/video/hero.mp4` — hero background (6.9 MB, trimmed 8–68 s of the
  event video, slowed 1.5×, muted; plays at 0.85× on top of that)
- `assets/video/hero-poster.jpg` — first frame, shown while video loads and
  for reduced-motion users

## Connect the form (one-time, ~5 min)

The form posts to Formspree. Until configured, submissions show a fallback
message pointing to og@raisable.vc.

1. Create a free account at https://formspree.io → **New form**.
   Set the notification email to **og@raisable.vc**.
2. Copy the form's endpoint (looks like `https://formspree.io/f/abcdwxyz`).
3. In `index.html`, replace `REPLACE_WITH_FORM_ID` in the `<form action=…>`
   with your form ID.
4. CRM: in the Formspree dashboard → **Plugins/Integrations**, connect your
   CRM directly or via Zapier/Make (webhook fires on every submission with
   the fields `name`, `company`, `email`, `message`).
5. Optional: in Formspree settings, restrict allowed domains to your
   production domain to block spam posts.

## Editing notes

- Brand system from the Founders Hub logo book
  (`/Users/admin/Documents/Raisable vc/Logo Raisable Founders Hub/`):
  forest `#0A2621`, emerald `#00BD97`, yellow `#FFC700` (accents),
  mid-green `#1C594E` (accessible accent text), paper `#F8F9F6`.
- Logos: `assets/img/logo-classic.svg` (light backgrounds) and
  `logo-white.svg` (dark/hero) — the one-line lockup (Ver_5); the nav swaps
  them automatically. Arrow element from the logo book in the closing section.
- Fonts load from Google Fonts: Alexandria (brand display), Inter (body),
  IBM Plex Mono (labels/numbers). Alexandria has no italic — accent words
  in headlines use color instead.
- To swap the hero video: encode with
  `ffmpeg -i in.mov -filter:v "setpts=1.5*PTS,scale=1280:720" -an -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -movflags +faststart hero.mp4`
- The testimonial block from the copy doc (§6) is intentionally omitted
  until a real quote is collected.
