#!/usr/bin/env node

import { spawn } from "node:child_process";
import {
  chmod,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const KEY_NAMES = ["JWT_PRIVATE_KEY", "JWKS"];

function parseArguments(argv) {
  const parsed = {
    envFile: ".env.local",
    force: false,
    setConvex: false,
    syncExisting: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--force") {
      parsed.force = true;
      continue;
    }

    if (argument === "--set-convex") {
      parsed.setConvex = true;
      continue;
    }

    if (argument === "--sync-existing") {
      parsed.syncExisting = true;
      continue;
    }

    if (argument === "--target-env") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--target-env requires a path");
      }
      parsed.envFile = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (parsed.setConvex && parsed.syncExisting) {
    throw new Error("Use either --set-convex or --sync-existing, not both.");
  }

  return parsed;
}

function parseEnvValue(source, name) {
  const line = source
    .split(/\r?\n/u)
    .find((candidate) => candidate.match(new RegExp(`^\\s*${name}\\s*=`, "u")));

  if (!line) {
    return "";
  }

  const raw = line.slice(line.indexOf("=") + 1).trim();
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }
  // Convex writes deployment metadata as an inline comment, for example:
  // CONVEX_DEPLOYMENT=dev:example # team: ..., project: ...
  // Keep hashes inside quoted values, but strip dotenv comments from plain ones.
  return raw.replace(/\s+#.*$/u, "").trimEnd();
}

function hasNonEmptyValue(source, name) {
  return parseEnvValue(source, name).length > 0;
}

function serializeEnvValue(value) {
  return JSON.stringify(value);
}

function upsertValues(source, values, force) {
  const existing = KEY_NAMES.filter((name) => hasNonEmptyValue(source, name));
  if (existing.length > 0 && !force) {
    throw new Error(
      `${existing.join(", ")} already contain data. Re-run with --force to rotate them.`,
    );
  }

  const pending = new Set(KEY_NAMES);
  const nextLines = [];

  for (const line of source.split(/\r?\n/u)) {
    const keyName = KEY_NAMES.find((name) =>
      line.match(new RegExp(`^\\s*${name}\\s*=`, "u")),
    );

    if (!keyName) {
      nextLines.push(line);
      continue;
    }

    if (pending.has(keyName)) {
      nextLines.push(`${keyName}=${serializeEnvValue(values[keyName])}`);
      pending.delete(keyName);
    }
  }

  while (nextLines.at(-1) === "") {
    nextLines.pop();
  }

  if (pending.size > 0 && nextLines.length > 0) {
    nextLines.push("");
  }

  for (const keyName of pending) {
    nextLines.push(`${keyName}=${serializeEnvValue(values[keyName])}`);
  }

  return `${nextLines.join("\n")}\n`;
}

async function generateKeys() {
  const pair = await generateKeyPair("RS256", { extractable: true });
  const privateKey = await exportPKCS8(pair.privateKey);
  const publicKey = await exportJWK(pair.publicKey);

  return {
    JWT_PRIVATE_KEY: privateKey.trimEnd().replace(/\n/gu, " "),
    JWKS: JSON.stringify({ keys: [{ use: "sig", ...publicKey }] }),
  };
}

async function writeAtomically(envPath, source) {
  const directory = path.dirname(envPath);
  const temporaryPath = path.join(directory, `.env.local.${process.pid}.tmp`);
  await writeFile(temporaryPath, source, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, envPath);
  await chmod(envPath, 0o600);
}

async function run(command, args, options) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          signal
            ? `${command} terminated by ${signal}`
            : `${command} exited with code ${code ?? "unknown"}`,
        ),
      );
    });
  });
}

async function syncToConvex(envPath, source, values) {
  const deployment = parseEnvValue(source, "CONVEX_DEPLOYMENT");
  if (!deployment) {
    throw new Error(
      `CONVEX_DEPLOYMENT is missing from ${envPath}; keys were written locally but cannot be synced.`,
    );
  }

  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "pick-a-date-convex-auth-"),
  );
  const temporaryEnv = path.join(temporaryDirectory, "auth-keys.env");

  try {
    const contents = KEY_NAMES.map(
      (name) => `${name}=${serializeEnvValue(values[name])}`,
    ).join("\n");
    await writeFile(temporaryEnv, `${contents}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });

    await run("npx", ["convex", "env", "set", "--from-file", temporaryEnv], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CONVEX_DEPLOYMENT: deployment,
      },
    });
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  const envPath = path.resolve(arguments_.envFile);
  const source = await readFile(envPath, "utf8").catch((error) => {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return "";
    }
    throw error;
  });

  if (arguments_.syncExisting) {
    const values = Object.fromEntries(
      KEY_NAMES.map((name) => [name, parseEnvValue(source, name)]),
    );
    const missing = KEY_NAMES.filter((name) => !values[name]);
    if (missing.length > 0) {
      throw new Error(`${missing.join(", ")} are missing from ${envPath}.`);
    }
    await syncToConvex(envPath, source, values);
    console.log("Synced existing JWT_PRIVATE_KEY and JWKS to Convex.");
    return;
  }

  const values = await generateKeys();
  const nextSource = upsertValues(source, values, arguments_.force);

  await writeAtomically(envPath, nextSource);
  console.log(`Generated JWT_PRIVATE_KEY and JWKS in ${envPath}.`);

  if (arguments_.setConvex) {
    await syncToConvex(envPath, nextSource, values);
    console.log("Synced JWT_PRIVATE_KEY and JWKS to the selected Convex deployment.");
  }
}

main().catch((error) => {
  console.error(
    process.env.DEBUG_AUTH_KEYS === "1" && error instanceof Error
      ? error.stack
      : error instanceof Error
        ? error.message
        : error,
  );
  process.exitCode = 1;
});
