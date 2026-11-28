import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const schemaPath = path.join(root, "prisma", "schema.prisma");
const clientDir = path.join(root, "node_modules", ".prisma", "client");
const clientEntry = path.join(clientDir, "index.js");
const hashFile = path.join(clientDir, ".schema-hash");

const schemaBytes = fs.readFileSync(schemaPath);
const schemaHash = createHash("sha256").update(schemaBytes).digest("hex");

const existingHash = fs.existsSync(hashFile) ? fs.readFileSync(hashFile, "utf8").trim() : "";
if (existingHash === schemaHash && fs.existsSync(clientEntry)) {
  console.log("prisma-generate: client already up to date for current schema, skipping.");
  process.exit(0);
}

const isWin = process.platform === "win32";
const res = spawnSync(isWin ? "npx.cmd" : "npx", ["prisma", "generate"], {
  cwd: root,
  stdio: ["inherit", "pipe", "pipe"],
  encoding: "utf8",
  shell: isWin,
});

if (res.stdout) process.stdout.write(res.stdout);
if (res.stderr) process.stderr.write(res.stderr);

if (res.status === 0) {
  try {
    fs.mkdirSync(clientDir, { recursive: true });
    fs.writeFileSync(hashFile, schemaHash, "utf8");
  } catch {}
  process.exit(0);
}

const combined = `${res.stdout || ""}\n${res.stderr || ""}`;
if (/EPERM.*query_engine-windows\.dll\.node/i.test(combined)) {
  console.error(
    "\nprisma-generate: Windows locked query_engine-windows.dll.node because another Node process " +
      "(e.g. `npm run dev`, `npm run start`, or `prisma studio`) is currently running in this workspace. " +
      "Stop that process and re-run `npm run build` so Prisma can update the generated client.\n"
  );
}

process.exit(res.status ?? 1);
