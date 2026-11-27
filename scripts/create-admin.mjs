// Creates (or resets the password of) an admin user.
// Usage: node scripts/create-admin.mjs "Full Name" email@example.com 'StrongPassword123'
import "./load-env.mjs";
import pg from "pg";
import bcrypt from "bcryptjs";

const [name, email, password] = process.argv.slice(2);
if (!name || !email || !password) {
  console.error('Usage: node scripts/create-admin.mjs "Full Name" email@example.com \'StrongPassword123\'');
  process.exit(1);
}
if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});
await client.connect();
const hash = await bcrypt.hash(password, 12);
await client.query(
  `insert into users (name, email, password_hash, role, active)
   values ($1, lower($2), $3, 'admin', true)
   on conflict (email) do update set password_hash = excluded.password_hash, role = 'admin', active = true, name = excluded.name`,
  [name, email, hash],
);
console.log(`Admin ready: ${email.toLowerCase()}`);
await client.end();
