#!/usr/bin/env node
/**
 * Refresh the current commit across every production service.
 *
 *   npm run refresh:all             # deploy + verify everything
 *   npm run refresh:all -- --dry-run # print the plan without changing anything
 *
 * Uses the local Wrangler and Railway CLI logins. No secrets are stored here.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = path.join(root, "backend");
const dryRun = process.argv.includes("--dry-run");
const allowDirtyDryRun = process.argv.includes("--allow-dirty");

const RAILWAY_PROJECT_ID = "c6e7ab21-cbe4-4f76-9f24-a7f4ef96defc";
const RAILWAY_SERVICE_ID = "148a2a29-5828-42ad-9ebb-1fc4905f9161";
const API_URL = "https://crewww-api-production.up.railway.app";
const FRONTEND_URL = "https://crewww-storefront.crewww-storefront.workers.dev";

const baseEnv = { ...process.env };
const frontendEnv = {
  ...baseEnv,
  VITE_DATA_MODE: "api",
  VITE_API_BASE_URL: API_URL,
  VITE_INITIAL_ROUTE: "/",
  VITE_FEATURE_RECENTLY_VIEWED: "true",
  VITE_FEATURE_COMMAND_PALETTE: "true",
  VITE_FEATURE_AMBIENT_SOUND: "true",
  VITE_FEATURE_WORLD_WALK: "true",
};
const liveEnv = {
  ...baseEnv,
  LIVE_API_URL: API_URL,
  FRONTEND_ORIGIN: FRONTEND_URL,
  LIVE_FRONTEND_URL: FRONTEND_URL,
};

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function run(label, command, args, options = {}) {
  console.log(`\n==> ${label}`);
  const printable = [command, ...args].join(" ");
  if (dryRun) {
    console.log(`    ${printable}`);
    return;
  }
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: { ...baseEnv, ...(options.env ?? {}) },
    stdio: "inherit",
    shell: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

async function waitForApi() {
  console.log("\n==> Wait for Railway API readiness");
  if (dryRun) {
    console.log(`    fetch ${API_URL}/api/ready (up to 30 attempts)`);
    return;
  }
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const response = await fetch(`${API_URL}/api/ready`);
      if (response.ok) {
        await response.arrayBuffer();
        console.log(`    ready on attempt ${attempt}`);
        return;
      }
    } catch {
      // Keep retrying while Railway finishes the deploy.
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error("API did not become ready in time");
}

async function checkCatalogHeader() {
  console.log("\n==> Check catalog cache header");
  if (dryRun) {
    console.log(`    fetch ${API_URL}/api/v1/products`);
    return;
  }
  const response = await fetch(`${API_URL}/api/v1/products`);
  await response.arrayBuffer();
  console.log(`    cache-control: ${response.headers.get("cache-control") ?? "(none)"}`);
}

const envPath = path.join(root, ".env");
const envBackupPath = path.join(root, ".env.refresh-backup");

function stashRootEnv() {
  if (!existsSync(envPath)) return false;
  if (dryRun) {
    console.log("\n    (dry-run) would temporarily set aside .env");
    return false;
  }
  if (existsSync(envBackupPath)) {
    throw new Error(
      `${path.basename(envBackupPath)} already exists; restore or remove it before running again`,
    );
  }
  renameSync(envPath, envBackupPath);
  console.log("\n    temporarily set aside .env (BOOTSTRAP_ADMIN_PASSWORD guard)");
  return true;
}

function restoreRootEnv(moved) {
  if (moved && existsSync(envBackupPath)) {
    renameSync(envBackupPath, envPath);
    console.log("    restored .env");
  }
}

async function main() {
  const status = git(["status", "--porcelain"]);
  if (status && !(dryRun && allowDirtyDryRun)) {
    throw new Error("Working tree is not clean. Commit your changes first.");
  }

  const sha = git(["rev-parse", "HEAD"]);
  const shortSha = git(["rev-parse", "--short", "HEAD"]);
  const branch = git(["branch", "--show-current"]) || "(detached HEAD)";
  console.log(`Refreshing ${branch} @ ${shortSha}`);

  try {
    const upstream = execFileSync("git", ["rev-parse", "@{u}"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    if (upstream !== sha) {
      console.warn(`  warning: upstream is ${upstream.slice(0, 7)}, not ${shortSha}`);
    }
  } catch {
    console.warn("  warning: no upstream configured; using local HEAD");
  }

  if (dryRun) console.log("DRY RUN — no deploy or verification will be executed.");

  // Frontend deploy uses the explicit VITE_* values, matching ci-deploy.yml.
  run("Build + deploy storefront to Cloudflare", "npm", ["run", "deploy"], {
    env: frontendEnv,
  });

  // Move the git-ignored root .env aside so a stale BOOTSTRAP_ADMIN_PASSWORD
  // cannot block `railway run`. Its value is never read or printed.
  const movedEnv = stashRootEnv();
  try {
    run("Migrate Neon production database", "railway", [
      "run",
      "--project", RAILWAY_PROJECT_ID,
      "--service", RAILWAY_SERVICE_ID,
      "--environment", "production",
      "--", "python", "-m", "alembic", "upgrade", "head",
    ], { cwd: backendDir });

    run("Seed Neon + clear catalog cache", "railway", [
      "run",
      "--project", RAILWAY_PROJECT_ID,
      "--service", RAILWAY_SERVICE_ID,
      "--environment", "production",
      "--", "python", "-m", "app.seed",
    ], { cwd: backendDir });

    run("Deploy API to Railway", "railway", [
      "up",
      "--project", RAILWAY_PROJECT_ID,
      "--service", RAILWAY_SERVICE_ID,
      "--environment", "production",
      "--ci",
    ], { cwd: backendDir });
  } finally {
    restoreRootEnv(movedEnv);
  }

  await waitForApi();

  run("Live communication tests", "python", [
    "-m", "pytest", "-q", "tests/test_live_communication.py",
  ], { cwd: backendDir, env: liveEnv });

  await checkCatalogHeader();

  run("Strict mobile/desktop performance audit", "npm", ["run", "perf:check"], {
    env: { ...baseEnv, PERF_BASE_URL: FRONTEND_URL },
  });

  console.log(`\nRefresh complete: ${branch} @ ${shortSha}`);
  console.log(`Storefront: ${FRONTEND_URL}`);
  console.log(`API:        ${API_URL}`);
}

main().catch((error) => {
  console.error(`\nRefresh failed: ${error.message}`);
  process.exitCode = 1;
});
