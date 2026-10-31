# Deploying techbucket.com.np on cPanel

This guide takes the website from the bundle (`techbucket-site.zip`) to a live site on cPanel shared hosting. Allow about 30–45 minutes the first time.

## What your hosting needs

| Requirement | Where to check in cPanel |
|---|---|
| **Setup Node.js App** (CloudLinux / Passenger) with **Node.js 20.9 or newer** (22 recommended) | Software → Setup Node.js App |
| **PostgreSQL Databases** | Databases → PostgreSQL Databases |
| SSH / Terminal access (strongly recommended) | Advanced → Terminal |

If the host has no PostgreSQL, you can use a free hosted Postgres (Neon or Supabase) instead: put its connection string in `DATABASE_URL` and set `DATABASE_SSL=true`.

If the host has no Node.js App feature, the site cannot run there; ask the host to enable it or move to a plan that has it.

---

## 1. Create the database

1. cPanel → **PostgreSQL Databases**.
2. Create a database, e.g. `techbucket` (cPanel makes it `cpaneluser_techbucket`).
3. Create a user, e.g. `tbweb`, with a strong password (cPanel makes it `cpaneluser_tbweb`).
4. **Add the user to the database** with all privileges.
5. Your connection string is:
   ```
   postgres://cpaneluser_tbweb:PASSWORD@localhost:5432/cpaneluser_techbucket
   ```
   If the password contains symbols like `@ : / #`, URL-encode them (e.g. `@` → `%40`).

## 2. Create a folder for uploads

In **File Manager**, create a folder in your home directory, outside `public_html` and outside the app folder:
```
/home/cpaneluser/techbucket-uploads
```
Uploaded logos, images and CVs live here, so redeploying never deletes them.

## 3. Upload the app

1. In File Manager, create `/home/cpaneluser/techbucket-site`.
2. Upload `techbucket-site.zip` into it and **Extract**.
3. You should now see `server.js`, `package.json`, `.next/`, `node_modules/`, `public/`, `drizzle/` and `scripts/` in that folder. (Turn on "Show hidden files" in File Manager settings to see `.next`.)

> The bundle already contains everything the server needs; you do **not** need to run `npm install`.

## 4. Create the Node.js application

cPanel → **Setup Node.js App** → **Create Application**:

| Field | Value |
|---|---|
| Node.js version | 22.x (or the newest 20.9+ offered) |
| Application mode | Production |
| Application root | `techbucket-site` |
| Application URL | `techbucket.com.np` |
| Application startup file | `server.js` |

Then add these **Environment variables** (the "Add Variable" button):

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | your connection string from step 1 |
| `SESSION_SECRET` | a long random string, 32+ characters |
| `SITE_URL` | `https://techbucket.com.np` |
| `UPLOAD_DIR` | `/home/cpaneluser/techbucket-uploads` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | optional: for email alerts on new enquiries |

Click **Create**, then **Save**. Don't press "Run NPM Install"; it isn't needed.

## 5. Set up the database tables and content

Open **Terminal** in cPanel. At the top of the Node.js App page, cPanel shows a command like:
```
source /home/cpaneluser/nodevenv/techbucket-site/22/bin/activate && cd /home/cpaneluser/techbucket-site
```
Run that command first, then:

```bash
# Put the same variables in a .env file so the scripts can read them
cp .env.example .env
nano .env            # fill in DATABASE_URL (and the others), save with Ctrl+O, exit with Ctrl+X

node scripts/migrate.mjs                 # creates the tables (the app also does this itself on start)
node scripts/seed.mjs                    # loads Tech Bucket's starting content
node scripts/create-admin.mjs "Ashim" you@techbucket.com.np 'A-Strong-Password-123'
```

Each script is safe to re-run.

**No Terminal?** In Setup Node.js App, use **Run JS script** with `scripts/migrate.mjs`, then `scripts/seed.mjs`. Create the admin user from a computer that can reach the database, or ask your host to run the `create-admin` command.

## 6. Start and check

1. Back in **Setup Node.js App**, click **Restart**.
2. Visit `https://techbucket.com.np`; the homepage should load.
3. Visit `https://techbucket.com.np/admin`, sign in, and change anything (e.g. a service summary). The change should appear on the site immediately.
4. Make sure SSL is active: cPanel → **SSL/TLS Status** → run AutoSSL for the domain.

## 7. After going live

- **Google Search Console**: add the domain and submit `https://techbucket.com.np/sitemap.xml`.
- **Google Business Profile**: create or claim it with the same address and phone as the site.
- In the admin, under **Site settings**, add your LinkedIn and Facebook profile links.
- Replace typed client names with logos as each client gives permission (Admin → Clients).
- Publish one or two articles a month (Admin → Insights & case studies).

---

## Updating the site later

**Automatically (recommended):** set up the GitHub deploy below once; after that, every push to `main` goes live in a few minutes.

**By hand:**
1. Build a new bundle on your computer: `npm run package:cpanel` → `deploy/techbucket-site.zip`.
2. Upload and extract it over `/home/cpaneluser/techbucket-site` (your `.env` and the uploads folder are not touched).
3. The app restarts itself (the bundle includes `tmp/restart.txt`) and applies any database changes on start. If it doesn't restart, click **Restart** in Setup Node.js App.

## Automatic deploys from GitHub

The repository includes `.github/workflows/deploy.yml`. On every push to `main` it lints, type-checks and builds the site; then it uploads the result to cPanel over FTPS. Passenger restarts the app, and the app applies any new database migrations as it starts.

One-time setup:

1. **cPanel → FTP Accounts → Add FTP Account.** Set its **Directory** to your home folder (e.g. `/home/cpaneluser`) and give it a strong password. Note the full username (e.g. `deploy@techbucket.com.np`).
2. **GitHub → your repository → Settings → Secrets and variables → Actions → New repository secret.** Add:

   | Secret | Example |
   |---|---|
   | `FTP_SERVER` | `ftp.techbucket.com.np` (or the server hostname from cPanel's sidebar) |
   | `FTP_USERNAME` | `deploy@techbucket.com.np` |
   | `FTP_PASSWORD` | the FTP account password |
   | `FTP_APP_DIR` | `techbucket-site/` (the app folder relative to the FTP account's directory, ending in `/`) |

3. **GitHub → Actions → "Build and deploy to cPanel" → Run workflow.** The first run uploads everything (a few minutes); later runs upload only changed files.

Your `.env`, `node_modules` and uploads are never touched by the deploy. Until the secrets exist, the workflow still builds and keeps the zip as a downloadable artifact on each run, so you can also deploy by hand.

> If your host blocks FTPS, change `protocol: ftps` to `protocol: ftp` in the workflow file.

## Backups

- **Database:** cPanel → Backup → download the PostgreSQL database backup (or use `pg_dump`). Do this weekly.
- **Uploads:** download `/home/cpaneluser/techbucket-uploads` as a zip from File Manager.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Incomplete response received from application" / 503 | Check the Node.js version is 20.9+; check `stderr.log` in the app folder; confirm `DATABASE_URL` is set; click Restart. |
| Site loads but every page errors | Database not reachable or not migrated: run `node scripts/migrate.mjs` and `node scripts/seed.mjs`. |
| `SESSION_SECRET must be set` | Add a 32+ character `SESSION_SECRET` variable, then Restart. |
| Can't sign in after it worked | Too many attempts lock sign-in for 15 minutes; wait, or Restart the app. |
| GitHub deploy fails with a login or timeout error | Check the four FTP secrets; try `protocol: ftp`; make sure `FTP_APP_DIR` ends with `/`. |
| Uploads disappear after redeploy | `UPLOAD_DIR` points inside the app folder; move it to the home directory as in step 2. |
| Styles missing (plain HTML) | The `.next/static` folder didn't upload; re-extract the zip with hidden files included. |
| Emails not arriving | Check the SMTP variables; use the full mailbox address as `SMTP_USER`; port 465. |
