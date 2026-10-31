// Assembles a ready-to-upload cPanel bundle in ./deploy/techbucket-site
// (and techbucket-site.zip if the `zip` command exists).
// Run after `next build`:  npm run package:cpanel
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, lstatSync, readlinkSync, symlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
if (!existsSync(path.join(standalone, "server.js"))) {
  console.error("Build first: npm run build (needs output: 'standalone').");
  process.exit(1);
}

const outRoot = path.join(root, "deploy");
const out = path.join(outRoot, "techbucket-site");
rmSync(outRoot, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// node_modules is left out on purpose: CloudLinux (cPanel "Setup Node.js App") keeps
// modules in its own virtual environment and refuses an app folder that has one.
// cPanel's "Run NPM Install" installs the runtime dependencies listed below.
const skip = new Set([
  "node_modules", "uploads", "src", "scripts", "deploy", ".env", ".env.local", "README.md", "AGENTS.md",
  "package-lock.json", "tsconfig.json", "tsconfig.tsbuildinfo", "eslint.config.mjs", "next.config.ts", "drizzle.config.ts",
]);
cpSync(standalone, out, {
  recursive: true,
  filter: (src) => {
    const rel = path.relative(standalone, src).split(path.sep)[0];
    return !skip.has(rel);
  },
});
// Turbopack loads server-only packages (pg, bcryptjs, ...) through hashed aliases in
// .next/node_modules, e.g. "pg-587764f78a6c7a9c" -> ../../node_modules/pg. Recreate them
// as RELATIVE symlinks so they resolve on the server (cpSync would bake in this machine's
// absolute paths). They point at the app's node_modules, which cPanel provides.
const aliasDir = path.join(standalone, ".next", "node_modules");
const outAliasDir = path.join(out, ".next", "node_modules");
rmSync(outAliasDir, { recursive: true, force: true });
if (existsSync(aliasDir)) {
  mkdirSync(outAliasDir, { recursive: true });
  for (const alias of readdirSync(aliasDir)) {
    const src = path.join(aliasDir, alias);
    if (!lstatSync(src).isSymbolicLink()) continue;
    const target = path.basename(readlinkSync(src)); // e.g. "pg"
    symlinkSync(`../../node_modules/${target}`, path.join(outAliasDir, alias));
  }
}
cpSync(path.join(root, ".next", "static"), path.join(out, ".next", "static"), { recursive: true });
cpSync(path.join(root, "public"), path.join(out, "public"), { recursive: true });
cpSync(path.join(root, "drizzle"), path.join(out, "drizzle"), { recursive: true });
mkdirSync(path.join(out, "scripts"), { recursive: true });
for (const f of ["load-env.mjs", "migrate.mjs", "seed.mjs", "create-admin.mjs"]) {
  cpSync(path.join(root, "scripts", f), path.join(out, "scripts", f));
}
cpSync(path.join(root, ".env.example"), path.join(out, ".env.example"));
cpSync(path.join(root, "DEPLOY-CPANEL.md"), path.join(out, "DEPLOY-CPANEL.md"));
// Passenger (cPanel) restarts the app when tmp/restart.txt changes, so every
// deploy that uploads this file restarts the site automatically.
mkdirSync(path.join(out, "tmp"), { recursive: true });
writeFileSync(path.join(out, "tmp", "restart.txt"), new Date().toISOString() + "\n");

// The bundled package.json only needs to tell cPanel what to start.
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
writeFileSync(
  path.join(out, "package.json"),
  JSON.stringify(
    {
      name: pkg.name,
      version: pkg.version,
      private: true,
      type: "commonjs",
      engines: pkg.engines,
      // Only what the compiled server loads at runtime (everything else is bundled).
      dependencies: Object.fromEntries(
        ["next", "react", "react-dom", "pg", "bcryptjs", "nodemailer", "sanitize-html"].map((name) => [
          name,
          JSON.parse(readFileSync(path.join(root, "node_modules", name, "package.json"), "utf8")).version,
        ]),
      ),
      scripts: {
        start: "node server.js",
        "db:migrate": "node scripts/migrate.mjs",
        "db:seed": "node scripts/seed.mjs",
      },
    },
    null,
    2,
  ),
);

try {
  execSync("zip -qry ../techbucket-site.zip .", { cwd: out, stdio: "inherit" });
  console.log("Bundle: deploy/techbucket-site.zip");
} catch {
  console.log("Bundle folder ready: deploy/techbucket-site (zip it before uploading)");
}
