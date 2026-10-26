# Merge Consulting Corp. — Website

The marketing site for Merge Consulting Corp. It is a static site (HTML, CSS and vanilla JS) with a single Vercel serverless function for the contact form. There is no build step and no framework.

```
index.html        Page markup, SEO meta tags, JSON-LD business data
styles.css        All styles (design tokens are at the top in :root)
main.js           Mobile nav, service filters, office-hours status, form handling
api/contact.js    POST /api/contact sends the inquiry by email via Resend
404.html          Not-found page
vercel.json       Clean URLs, security headers, caching
```

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run preview      # static preview at http://localhost:3000 (the form falls back to mailto)
npm run dev          # full Vercel emulation, including /api/contact (asks you to log in to Vercel once)
```

## Deploy (GitHub + Vercel)

1. Push this folder to a new GitHub repository.
2. In Vercel, choose **Add New → Project**, import the repo, and leave every build setting at its default (Framework: *Other*, no build command, output: root).
3. Under **Settings → Environment Variables**, add:
   - `RESEND_API_KEY`: from https://resend.com (the free tier is enough)
   - `CONTACT_TO_EMAIL`: e.g. `mergeconsulting.mla@gmail.com`
   - `CONTACT_FROM_EMAIL` (optional): a sender on a domain you have verified in Resend, e.g. `Website <hello@mergeconsulting.asia>`
4. Redeploy. Every push to `main` deploys automatically.
5. To use the domain, open **Settings → Domains**, add `mergeconsulting.asia`, and update DNS at your registrar as Vercel instructs.

If the email variables are missing, the form still works: it opens the visitor's email app with the message filled in.

## Editing content

- **Services**: each one is an `<li class="service" data-cat="…">` in `index.html`. `data-cat` must be `start`, `operate` or `grow` so the filter chips work.
- **Office hours**: the table is in `index.html`. The open/closed logic is in `main.js` (Mon–Fri, 9:00–17:00, Asia/Manila).
- **Colors and fonts**: change the CSS variables at the top of `styles.css`.
- **Photos**: the design does not need stock photos. To add your own team or office photos, put them in an `images/` folder and reference them with `<img src="/images/…" alt="…" width="…" height="…" loading="lazy">`.
