# Tech Bucket — corporate website & admin panel

The public website for **techbucket.com.np** plus an admin panel to manage all of its content, enquiries and job applications.

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, self-hosted Inter / Inter Tight fonts
- **Backend:** Next.js Server Actions and Route Handlers
- **Database:** PostgreSQL via Drizzle ORM (`pg` driver, no native binaries)
- **Hosting target:** cPanel "Setup Node.js App" (Passenger). See **[DEPLOY-CPANEL.md](DEPLOY-CPANEL.md)**.

## What's included

**Public site** (responsive from 360 px phones to wide desktops)

| Page | URL |
|---|---|
| Home: hero, featured cards, key figures, services, security, industries, client logos, how we work, insights, partners, careers, contact form | `/` |
| Services overview and one page per service (with its own enquiry form) | `/services`, `/services/[slug]` |
| Industries overview and one page per industry | `/industries`, `/industries/[slug]` |
| Insights (articles) and case studies | `/insights`, `/case-studies` and their `/[slug]` pages |
| About: story, mission, vision, values, why us, full client list, partners | `/about` |
| Careers: open roles, job pages, CV upload | `/careers`, `/careers/[slug]` |
| Contact | `/contact` (also `/contact?service=Cybersecurity` pre-selects a service) |
| Privacy, Terms, 404 | `/privacy`, `/terms` |

**SEO built in:** per-page titles, descriptions and canonical URLs; Open Graph and Twitter cards with a generated share image; JSON-LD for Organization, Service, BreadcrumbList, BlogPosting/Article, ItemList and JobPosting (Google for Jobs); `sitemap.xml` and `robots.txt` generated from the database; semantic headings; fast server-rendered pages with cached data.

**Admin panel** at `/admin`

| Section | What it does |
|---|---|
| Dashboard | New enquiries, applications, published articles, open jobs, quick actions |
| Enquiries | All contact-form submissions; filter by status, search, notes, status pipeline (new → contacted → qualified → won/lost/spam), CSV export, optional email alert |
| Applications | CVs from the careers forms; private download, review status and notes |
| Homepage | Featured cards under the hero and the key figures |
| Insights & case studies | Write in Markdown, draft/publish, schedule date, cover image or typographic cover, SEO fields |
| Services, Industries | Full page content, ordering, publish/hide, URL slug, SEO fields |
| Clients | Name, sector, logo upload, "show on homepage", ordering |
| Technology partners | Brand names and logos |
| Jobs | Post roles with closing dates; applications are counted per job |
| Media library | Upload images and copy their links into articles |
| Site settings (admins) | Hero text, about text, mission/vision/values, address, phones, email, VAT, social links, default SEO |
| Users (admins) | Admin and Editor accounts; editors can't change settings, users or delete core pages |
| My account | Change password |

Every change in the admin appears on the public site immediately.

**Security:** bcrypt password hashing; signed, HTTP-only session cookies; every admin page and action re-checks the user and role; login and form rate limits; honeypot spam trap on public forms; uploads type- and size-checked (SVGs with scripts rejected); CVs stored privately and served only to signed-in staff; Markdown output sanitised; CSV export protected against formula injection; security headers; audit log of admin changes.

## Local development

Requirements: Node.js 20.9+ and PostgreSQL 13+.

```bash
npm install
cp .env.example .env          # set DATABASE_URL, SESSION_SECRET, SITE_URL=http://localhost:3000, UPLOAD_DIR=./uploads
npm run db:migrate            # create tables
npm run db:seed               # load Tech Bucket content
npm run admin:create -- "Your Name" you@techbucket.com.np 'A-Strong-Password-123'
npm run dev                   # http://localhost:3000 and http://localhost:3000/admin
```

## Changing the database schema

1. Edit `src/db/schema.ts`.
2. `npm run db:generate` creates a new SQL file in `drizzle/`.
3. `npm run db:migrate` applies it (run the same command on the server after deploying).

## Build a cPanel bundle

```bash
npm run package:cpanel        # builds and creates deploy/techbucket-site.zip
```

Then follow [DEPLOY-CPANEL.md](DEPLOY-CPANEL.md). After the first setup, pushes to `main` deploy automatically through GitHub Actions (see "Automatic deploys from GitHub" in that guide). In production, pending database migrations run automatically when the app starts (set `AUTO_MIGRATE=false` to turn this off).

## Search engines & AI search

- **robots.txt** lets AI search bots (ChatGPT search, Claude, Perplexity, Copilot/Bing, Google, Apple) read and cite the site. Training bots (GPTBot, ClaudeBot, Google-Extended, …) are allowed by default; switch that off under *Admin → Site settings → Search engines & AI search*.
- **IndexNow**: every admin save tells Bing/IndexNow which pages changed (live HTTPS site only). The key is served at `/indexnow-key.txt` and derived from `SESSION_SECRET` (or set `INDEXNOW_KEY`; `INDEXNOW_DISABLED=true` turns it off).
- **Verification**: paste the Google Search Console and Bing Webmaster Tools HTML tags in Site settings, then submit `/sitemap.xml` in both.
- **Structured data**: company (Organization + ProfessionalService with address, map position, opening hours), WebSite, Service, FAQPage (service FAQs), Article/BlogPosting with the author's name and job title, JobPosting, BreadcrumbList.
- **`/llms.txt`**: plain-text map of the site for AI assistants, generated from the database.
- **Sitemap dates** come from real edit times, so search engines can trust them.

## Email (Zoho or any SMTP)

Set it up in *Admin → Site settings → Email*: SMTP server (Zoho: `smtppro.zoho.com`, or `.in`/`.eu` for those data centres, port 465), the mailbox address as username, its password, and optionally a separate *Send from* address (e.g. a `noreply@` group the mailbox may send as; the mailbox stays the envelope sender so bounces reach it) (a Zoho **app password** is recommended). The password is stored encrypted (AES-256-GCM, key derived from `SESSION_SECRET`), never in the code. Use "Send test" to check it. If nothing is set there, the `SMTP_*` lines in `.env` are used.

What it sends, all logged under *Recent emails*:
- New enquiry and job application alerts to "Send new enquiries to"
- An automatic acknowledgement to the visitor (can be switched off)
- Replies to enquiries written in the admin (*Enquiries → an enquiry → Reply by email*)
- "Forgot your password?" links on the sign-in page (valid 1 hour, once) and invites for new users (3 days); changing or resetting a password signs out every other session
- The weekly Site health report

## Site health (weekly automatic audit)

*Admin → Site health* shows scores for Content, SEO, Security and Operations, every problem found with how to fix it, and a history of past checks. The admin dashboard and menu show the score and the number of critical issues.

- **Runs by itself once a week**: the cPanel deploy cron job (`cpanel-cron.sh`) backs up the database to `~/techbucket-backups` (newest 8 kept) and calls `POST /api/cron/health`. The call's token is derived from `SESSION_SECRET`, so there is nothing to configure. "Run check now" on the page runs it on demand.
- **What it checks**:
  - Content: thin pages, summaries, FAQs, stale pages, case studies, article freshness and length, drafts, expired jobs, missing logos.
  - SEO: crawls every sitemap page for status, speed, titles, descriptions, H1, canonical, noindex, structured data, alt text, mixed content and broken links, plus robots.txt, sitemap, verification codes, local-business details and the www/https redirects.
  - Security: SSL expiry, security headers, exposed files (.env, .git…), admin login guard, known vulnerabilities in installed packages (npm advisory database), Next.js and Node.js versions, unused admin accounts, failed sign-ins, leftover password file, settings-file permissions.
  - Operations: enquiries waiting over 2 days, database backups, deploy errors, app error log, email alerts, storage.
- **Email**: with SMTP set up, each weekly result is emailed to the "Send new enquiries to" address.

## Project structure

```
src/
  app/
    (site)/            public pages (layout = header + footer)
    admin/login        sign-in page
    admin/(panel)/     admin pages (layout = sidebar, auth check)
    admin/actions.ts   all admin Server Actions
    actions/public.ts  contact and application form actions
    media/[...path]    serves uploaded images
    sitemap.ts, robots.ts, opengraph-image.tsx
  components/site      public UI (header, footer, sections, forms, posts)
  components/admin     admin UI (fields, tables, nav)
  db/                  Drizzle schema and connection
  lib/                 auth, cached data access, SEO, Markdown, uploads, mail, rate limit
  proxy.ts             redirects signed-out visitors away from /admin
drizzle/               SQL migrations
scripts/               migrate, seed, create-admin, package
```
