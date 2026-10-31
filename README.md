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
