// Runs once when the server starts.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // In production, apply pending database migrations automatically.
  // Set AUTO_MIGRATE=false to turn this off (then run `node scripts/migrate.mjs`).
  const enabled =
    process.env.AUTO_MIGRATE === "true" ||
    (process.env.NODE_ENV === "production" && process.env.AUTO_MIGRATE !== "false");
  if (!enabled) return;
  const { autoMigrate } = await import("./lib/auto-migrate");
  await autoMigrate();
}
