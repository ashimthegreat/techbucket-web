#!/usr/bin/env bash
# One-time setup of techbucket.com.np on a CloudLinux cPanel account, over SSH.
#
#   1. Upload this script and techbucket-cpanel-bundle.zip to your home folder:
#        scp server-setup.sh techbucket-cpanel-bundle.zip techbuck@dns1.prabhuhost.com:~/
#   2. SSH in and run:  bash ~/server-setup.sh
#
# It checks the server first, backs up the old site, asks before deleting
# anything, then creates the database, installs the app and starts it.
set -euo pipefail

DOMAIN="techbucket.com.np"
APP_ROOT="techbucket-site"
OLD_APP_ROOT="techbucket"
BUNDLE="$HOME/techbucket-cpanel-bundle.zip"
UPLOADS="$HOME/techbucket-uploads"
CPUSER="$(whoami)"
DB_NAME="${CPUSER}_techbucket"
DB_USER="${CPUSER}_tbweb"

say()  { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m    ✓ %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m    ✗ %s\033[0m\n' "$*"; exit 1; }

# ---------------------------------------------------------------- checks
say "Checking the server"
command -v cloudlinux-selector >/dev/null || fail "cloudlinux-selector not found: this host has no 'Setup Node.js App'. Ask Prabhu Host to enable it."
NODE_VER="$(ls /opt/alt 2>/dev/null | sed -n 's/^alt-nodejs\([0-9]*\)$/\1/p' | sort -n | tail -1)"
[ -n "$NODE_VER" ] || fail "No Node.js versions found in /opt/alt."
[ "$NODE_VER" -ge 20 ] || fail "Newest Node.js here is $NODE_VER; the site needs 20 or newer. Ask Prabhu Host to add Node.js 22."
ok "Node.js $NODE_VER available"
uapi Postgresql list_databases >/dev/null 2>&1 && uapi Postgresql list_databases | grep -q "status: 1" \
  || fail "PostgreSQL isn't available on this account. Ask Prabhu Host to enable 'PostgreSQL Databases'."
ok "PostgreSQL available"
[ -f "$BUNDLE" ] || fail "Upload techbucket-cpanel-bundle.zip to $HOME first (see the top of this script)."
ok "Bundle found"

# ---------------------------------------------------------------- backup
say "Backing up the current site"
BACKUP="$HOME/old-site-backup-$(date +%Y%m%d-%H%M).tar.gz"
tar czf "$BACKUP" -C "$HOME" $( [ -d "$HOME/public_html" ] && echo public_html ) $( [ -d "$HOME/$OLD_APP_ROOT" ] && echo "$OLD_APP_ROOT" ) 2>/dev/null || true
ok "Backup saved: $BACKUP ($(du -h "$BACKUP" | cut -f1))"
echo "    Copy it to your Mac later with:"
echo "    scp $CPUSER@dns1.prabhuhost.com:$BACKUP ~/Downloads/"

# ---------------------------------------------------------------- remove old site
say "About to REMOVE the old website"
echo "    - Node.js app '$OLD_APP_ROOT' (if any) and the folder ~/$OLD_APP_ROOT"
echo "    - everything in ~/public_html except .well-known and cgi-bin"
echo "    Mail, SSL, databases and other folders are NOT touched."
read -r -p "    Type DELETE to continue: " answer
[ "$answer" = "DELETE" ] || fail "Stopped. Nothing was deleted."
cloudlinux-selector destroy --json --interpreter nodejs --app-root "$OLD_APP_ROOT" >/dev/null 2>&1 || true
cloudlinux-selector destroy --json --interpreter nodejs --app-root "$APP_ROOT" >/dev/null 2>&1 || true
rm -rf "${HOME:?}/$OLD_APP_ROOT"
if [ -d "$HOME/public_html" ]; then
  find "$HOME/public_html" -mindepth 1 -maxdepth 1 ! -name .well-known ! -name cgi-bin -exec rm -rf {} +
fi
ok "Old site removed"

# ---------------------------------------------------------------- database
say "Creating the PostgreSQL database"
DB_PASS="$(openssl rand -hex 16)"
uapi Postgresql create_database name="$DB_NAME" >/dev/null 2>&1 || true
if uapi Postgresql list_users 2>/dev/null | grep -q "$DB_USER"; then
  uapi Postgresql set_password user="$DB_USER" password="$DB_PASS" | grep -q "status: 1" || fail "Couldn't reset the database user's password."
else
  uapi Postgresql create_user name="$DB_USER" password="$DB_PASS" | grep -q "status: 1" || fail "Couldn't create the database user."
fi
uapi Postgresql grant_all_privileges user="$DB_USER" database="$DB_NAME" | grep -q "status: 1" || fail "Couldn't grant database privileges."
ok "Database $DB_NAME ready (user $DB_USER)"

# ---------------------------------------------------------------- files
say "Installing the website files"
mkdir -p "$UPLOADS" "$HOME/$APP_ROOT"
rm -rf "$HOME/$APP_ROOT/.next" "$HOME/$APP_ROOT/public"
unzip -qo "$BUNDLE" -d "$HOME/$APP_ROOT"
cat > "$HOME/$APP_ROOT/.env" <<EOF
NODE_ENV=production
DATABASE_URL=postgres://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
SESSION_SECRET=$(openssl rand -hex 32)
SITE_URL=https://$DOMAIN
UPLOAD_DIR=$UPLOADS
EOF
chmod 600 "$HOME/$APP_ROOT/.env"
ok "Files installed in ~/$APP_ROOT"

# ---------------------------------------------------------------- app
say "Creating the Node.js app (Node $NODE_VER) and installing packages (a few minutes)"
cloudlinux-selector create --json --interpreter nodejs --version "$NODE_VER" \
  --app-root "$APP_ROOT" --domain "$DOMAIN" --app-uri / \
  --app-mode production --startup-file server.js >/dev/null
cloudlinux-selector install-modules --json --interpreter nodejs --app-root "$APP_ROOT" >/dev/null
ok "App created"

# shellcheck disable=SC1090
source "$HOME/nodevenv/$APP_ROOT/$NODE_VER/bin/activate"
cd "$HOME/$APP_ROOT"
say "Setting up database tables and content"
node scripts/migrate.mjs
node scripts/seed.mjs

say "Create your admin login"
read -r -p "    Your name: " ADMIN_NAME
read -r -p "    Admin email: " ADMIN_EMAIL
read -r -s -p "    Admin password (10+ characters, hidden): " ADMIN_PASS; echo
node scripts/create-admin.mjs "$ADMIN_NAME" "$ADMIN_EMAIL" "$ADMIN_PASS"

say "Starting the site"
cloudlinux-selector restart --json --interpreter nodejs --app-root "$APP_ROOT" >/dev/null
sleep 5
CODE="$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/" || true)"
if [ "$CODE" = "200" ]; then ok "https://$DOMAIN is live"; else
  echo "    Homepage returned HTTP $CODE. Check ~/$APP_ROOT/stderr.log, or send it to Claude."
fi
rm -f "$BUNDLE"
say "Done. Admin panel: https://$DOMAIN/admin"
