#!/usr/bin/env bash
# Tech Bucket — pull-based deploy for cPanel (CloudLinux), run from a cron job.
#
# GitHub Actions publishes a ready-to-run build to the `cpanel-build` branch.
# This script (which lives in that branch) runs every few minutes:
#   * first run: checks the server, backs up and removes the old website,
#     creates the PostgreSQL database and the Node.js app, installs packages,
#     sets up tables/content, creates an admin login, starts the site;
#   * later runs: if GitHub has a newer build, copies it in and restarts.
#     Database changes are applied automatically when the app starts.
#
# Output goes to ~/techbucket-deploy.log. Safe to run as often as you like.

set -uo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/cpanel/3rdparty/bin:$PATH"

REPO_URL="https://github.com/ashimthegreat/techbucket-web.git"
BRANCH="cpanel-build"
DOMAIN="techbucket.com.np"
APP_ROOT="techbucket-site"
OLD_APP_ROOT="techbucket"
ADMIN_EMAIL="admin@techbucket.com.np"

BUILD_DIR="$HOME/techbucket-build"
APP_DIR="$HOME/$APP_ROOT"
UPLOADS="$HOME/techbucket-uploads"
STATE="$HOME/.techbucket-deploy"
CPUSER="$(whoami)"
DB_NAME="${CPUSER}_techbucket"
DB_USER="${CPUSER}_tbweb"

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die()  { log "ERROR: $*"; exit 1; }

main() {
  mkdir -p "$STATE"
  # One run at a time (the first install takes longer than the cron interval).
  if ! mkdir "$STATE/lock" 2>/dev/null; then
    # Clear a lock left by a run that died more than 2 hours ago.
    if [ -n "$(find "$STATE/lock" -maxdepth 0 -mmin +120 2>/dev/null)" ]; then rmdir "$STATE/lock"; mkdir "$STATE/lock"; else exit 0; fi
  fi
  trap 'rmdir "$STATE/lock" 2>/dev/null' EXIT

  command -v git >/dev/null || die "git not found on this server."
  git -C "$BUILD_DIR" fetch -q --depth 1 origin "$BRANCH" || die "Couldn't fetch $BRANCH from GitHub."
  local before after
  before="$(git -C "$BUILD_DIR" rev-parse HEAD)"
  git -C "$BUILD_DIR" reset -q --hard "origin/$BRANCH"
  after="$(git -C "$BUILD_DIR" rev-parse HEAD)"
  # If this script itself was just updated, re-run the new version right away.
  if [ "$before" != "$after" ] && [ -z "${TB_REEXEC:-}" ]; then
    rmdir "$STATE/lock" 2>/dev/null; trap - EXIT
    TB_REEXEC=1 exec bash "$BUILD_DIR/cpanel-cron.sh"
  fi
  NEW_SHA="$(cat "$BUILD_DIR/BUILD_SHA" 2>/dev/null || git -C "$BUILD_DIR" rev-parse HEAD)"

  if [ ! -f "$STATE/installed" ]; then
    first_install
  elif [ "$NEW_SHA" != "$(cat "$STATE/installed")" ]; then
    update
  fi
}

check_server() {
  command -v cloudlinux-selector >/dev/null || die "cloudlinux-selector missing: ask Prabhu Host to enable 'Setup Node.js App'."
  NODE_VER="$(ls /opt/alt 2>/dev/null | sed -n 's/^alt-nodejs\([0-9]*\)$/\1/p' | sort -n | tail -1)"
  [ -n "$NODE_VER" ] && [ "$NODE_VER" -ge 20 ] || die "Need Node.js 20+; newest found: '${NODE_VER:-none}'. Ask Prabhu Host to add Node.js 22."
  uapi Postgresql list_databases 2>/dev/null | grep -q "status: 1" || die "PostgreSQL not available: ask Prabhu Host to enable 'PostgreSQL Databases'."
  echo "$NODE_VER" > "$STATE/node_version"
  log "Server OK: Node.js $NODE_VER, PostgreSQL available."
}

sync_files() {
  mkdir -p "$APP_DIR"
  # Replace the app's build folders, then copy the new files in. The server's own
  # files (.env, node_modules link to cPanel's packages, stderr.log) are left alone.
  rm -rf "$APP_DIR/.next" "$APP_DIR/public" "$APP_DIR/drizzle" "$APP_DIR/scripts"
  (cd "$BUILD_DIR" && tar cf - --exclude=./.git --exclude=./BUILD_SHA --exclude=./cpanel-cron.sh .) \
    | (cd "$APP_DIR" && tar xf -)
}

install_packages() {
  # Try cPanel's installer first; if it fails, run npm directly inside the app's
  # Node.js environment, skipping optional native packages the site doesn't need.
  local out
  out="$(cloudlinux-selector install-modules --json --interpreter nodejs --app-root "$APP_ROOT" 2>&1)"
  # cPanel test-loads the site afterwards; before the database is set up that test
  # fails even though the install worked. Judge by whether the packages are there.
  if [ -f "$APP_DIR/node_modules/next/package.json" ] && [ -f "$APP_DIR/node_modules/pg/package.json" ]; then
    log "Packages installed."
    return 0
  fi
  log "cPanel installer failed: $(echo "$out" | tr '\n' ' ' | cut -c1-600)"
  log "Retrying with npm directly..."
  ( venv
    npm install --omit=dev --omit=optional --no-audit --no-fund --no-package-lock 2>&1 | tail -25
    exit "${PIPESTATUS[0]}"
  ) && { log "Packages installed with npm."; return 0; }
  return 1
}

report_health() {
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/" || true)"
  log "$1: HTTP $code from https://$DOMAIN"
  if [ "$code" != "200" ] && [ -f "$APP_DIR/stderr.log" ]; then
    log "Last lines of $APP_DIR/stderr.log:"
    tail -n 40 "$APP_DIR/stderr.log"
  fi
}

check_links() {
  local missing=0 l
  for l in "$APP_DIR"/.next/node_modules/*; do
    [ -e "$l" ] || { log "Broken module link: $l -> $(readlink "$l")"; missing=1; }
  done
  [ -d "$APP_DIR/.next/node_modules" ] || { log "Missing $APP_DIR/.next/node_modules"; missing=1; }
  return $missing
}

venv() {
  # cPanel's activate script uses unset variables, so relax strict mode while loading it.
  set +u
  # shellcheck disable=SC1090
  source "$HOME/nodevenv/$APP_ROOT/$(cat "$STATE/node_version")/bin/activate"
  set -u
  cd "$APP_DIR"
}

first_install() {
  log "First install of $NEW_SHA"
  check_server
  NODE_VER="$(cat "$STATE/node_version")"

  # 1. Back up and remove the old website.
  if [ ! -f "$STATE/old_site_removed" ]; then
    [ "${CONFIRM_DELETE_OLD_SITE:-}" = "yes" ] || die "Old site not removed: the cron command must include CONFIRM_DELETE_OLD_SITE=yes."
    BACKUP="$HOME/old-site-backup-$(date +%Y%m%d-%H%M).tar.gz"
    tar czf "$BACKUP" -C "$HOME" $([ -d "$HOME/public_html" ] && echo public_html) $([ -d "$HOME/$OLD_APP_ROOT" ] && echo "$OLD_APP_ROOT") 2>/dev/null
    log "Backed up old site to $BACKUP"
    cloudlinux-selector destroy --json --interpreter nodejs --app-root "$OLD_APP_ROOT" >/dev/null 2>&1
    rm -rf "${HOME:?}/$OLD_APP_ROOT"
    [ -d "$HOME/public_html" ] && find "$HOME/public_html" -mindepth 1 -maxdepth 1 ! -name .well-known ! -name cgi-bin -exec rm -rf {} +
    touch "$STATE/old_site_removed"
    log "Removed old site (kept mail, SSL, .well-known, cgi-bin)."
  fi

  # 2. Database.
  if [ ! -f "$STATE/env" ]; then
    DB_PASS="$(openssl rand -hex 16)"
    uapi Postgresql create_database name="$DB_NAME" >/dev/null 2>&1
    if uapi Postgresql list_users 2>/dev/null | grep -q "$DB_USER"; then
      uapi Postgresql set_password user="$DB_USER" password="$DB_PASS" | grep -q "status: 1" || die "Couldn't set database password."
    else
      uapi Postgresql create_user name="$DB_USER" password="$DB_PASS" | grep -q "status: 1" || die "Couldn't create database user."
    fi
    uapi Postgresql grant_all_privileges user="$DB_USER" database="$DB_NAME" | grep -q "status: 1" || die "Couldn't grant database privileges."
    mkdir -p "$UPLOADS"
    cat > "$STATE/env" <<EOF
NODE_ENV=production
DATABASE_URL=postgres://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
SESSION_SECRET=$(openssl rand -hex 32)
SITE_URL=https://$DOMAIN
UPLOAD_DIR=$UPLOADS
EOF
    chmod 600 "$STATE/env"
    log "Database $DB_NAME ready."
  fi

  # 3. Files and settings.
  sync_files
  cp "$STATE/env" "$APP_DIR/.env" && chmod 600 "$APP_DIR/.env"
  log "Files installed in $APP_DIR"

  # 4. Node.js app and packages.
  cloudlinux-selector destroy --json --interpreter nodejs --app-root "$APP_ROOT" >/dev/null 2>&1
  cloudlinux-selector create --json --interpreter nodejs --version "$NODE_VER" \
    --app-root "$APP_ROOT" --domain "$DOMAIN" --app-uri / \
    --app-mode production --startup-file server.js >/dev/null || die "Couldn't create the Node.js app."
  log "Node.js app created; installing packages (several minutes)..."
  install_packages || die "Package install failed (details above)."
  cp "$APP_DIR/package.json" "$STATE/package.json"

  # 5. Tables, content, admin login.
  ( venv
    node scripts/migrate.mjs || exit 1
    node scripts/seed.mjs || exit 1
    if [ ! -f "$HOME/techbucket-admin-login.txt" ]; then
      ADMIN_PASS="$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 16)"
      node scripts/create-admin.mjs "Administrator" "$ADMIN_EMAIL" "$ADMIN_PASS" || exit 1
      printf 'Admin panel: https://%s/admin\nEmail: %s\nPassword: %s\n\nSign in, change the password under My account, then DELETE this file.\n' \
        "$DOMAIN" "$ADMIN_EMAIL" "$ADMIN_PASS" > "$HOME/techbucket-admin-login.txt"
      chmod 600 "$HOME/techbucket-admin-login.txt"
    fi
  ) || die "Database setup failed."
  log "Database tables and content ready. Admin login saved in ~/techbucket-admin-login.txt"

  # 6. Start.
  cloudlinux-selector restart --json --interpreter nodejs --app-root "$APP_ROOT" >/dev/null
  echo "$NEW_SHA" > "$STATE/installed"
  sleep 5
  report_health "Site started"
}

update() {
  log "Deploying new build $NEW_SHA"
  sync_files
  cp "$STATE/env" "$APP_DIR/.env"
  check_links || log "Warning: module links incomplete (see above)."
  if ! cmp -s "$APP_DIR/package.json" "$STATE/package.json"; then
    log "Dependencies changed; reinstalling packages..."
    install_packages || die "Package install failed (details above)."
    cp "$APP_DIR/package.json" "$STATE/package.json"
  fi
  mkdir -p "$APP_DIR/tmp" && date > "$APP_DIR/tmp/restart.txt"
  cloudlinux-selector restart --json --interpreter nodejs --app-root "$APP_ROOT" >/dev/null
  echo "$NEW_SHA" > "$STATE/installed"
  sleep 5
  report_health "Updated"
}

# Wrapped in main so bash reads the whole file before git updates it mid-run.
main "$@"
exit $?
