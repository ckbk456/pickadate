#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const DEFAULT_NAMES = [
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "SITE_URL",
  "OWNER_EMAIL",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "OWNER_NOTIFICATION_EMAIL",
];

function parseArguments(argv) {
  let envFile = ".env.local";
  const requestedNames = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--target-env") {
      const value = argv[index + 1];
      if (!value) throw new Error("--target-env requires a path");
      envFile = value;
      index += 1;
      continue;
    }
    if (argument === "--name") {
      const value = argv[index + 1];
      if (!value || !DEFAULT_NAMES.includes(value)) {
        throw new Error(`--name must be one of: ${DEFAULT_NAMES.join(", ")}`);
      }
      requestedNames.push(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  return {
    envFile: path.resolve(envFile),
    names: requestedNames.length > 0 ? requestedNames : DEFAULT_NAMES,
  };
}

function parseEnv(source) {
  const values = new Map();
  for (const line of source.split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/u);
    if (!match) continue;
    const [, name, rawValue] = match;
    const raw = rawValue.trim();
    const value =
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
        ? raw.slice(1, -1)
        : raw.replace(/\s+#.*$/u, "").trimEnd();
    values.set(name, value);
  }
  return values;
}

function serialize(value) {
  return JSON.stringify(value);
}

async function run(args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn("npx", args, { cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) return resolve();
      reject(
        new Error(
          signal ? `npx terminated by ${signal}` : `npx exited with code ${code}`,
        ),
      );
    });
  });
}

async function main() {
  const { envFile, names } = parseArguments(process.argv.slice(2));
  const values = parseEnv(await readFile(envFile, "utf8"));
  const present = names.filter((name) => values.get(name));
  const missing = names.filter((name) => !values.get(name));

  if (present.length === 0) {
    throw new Error(`None of the supported Convex variables are set in ${envFile}.`);
  }

  const directory = await mkdtemp(path.join(tmpdir(), "pick-a-date-convex-env-"));
  const temporaryEnv = path.join(directory, "convex.env");
  try {
    const contents = present
      .map((name) => `${name}=${serialize(values.get(name))}`)
      .join("\n");
    await writeFile(temporaryEnv, `${contents}\n`, { mode: 0o600 });
    await run(["convex", "env", "set", "--from-file", temporaryEnv], process.cwd());
  } finally {
    await rm(directory, { recursive: true, force: true });
  }

  console.log(`Synced ${present.join(", ")} to the selected Convex deployment.`);
  if (missing.length > 0) {
    console.log(`Skipped unset optional variables: ${missing.join(", ")}.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
