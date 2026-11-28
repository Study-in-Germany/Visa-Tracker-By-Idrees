import test from "node:test";
import assert from "node:assert/strict";
import { isTransientConnectionError, normalizeDatabaseUrl } from "../lib/db";

test("normalizeDatabaseUrl adds connect_timeout, socket_timeout, pool_timeout, and Neon pooler params", () => {
  const poolerUrl = normalizeDatabaseUrl(
    "postgresql://user:pass@ep-cool-forest-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
  );
  assert.ok(poolerUrl);
  const parsed = new URL(poolerUrl);
  assert.equal(parsed.username, "user");
  assert.equal(parsed.password, "pass");
  assert.equal(parsed.pathname, "/neondb");
  assert.equal(parsed.searchParams.get("sslmode"), "require");
  assert.equal(parsed.searchParams.get("connect_timeout"), "15");
  assert.equal(parsed.searchParams.get("socket_timeout"), "15");
  assert.equal(parsed.searchParams.get("pool_timeout"), "20");
  assert.equal(parsed.searchParams.get("pgbouncer"), "true");
  assert.equal(parsed.searchParams.get("connection_limit"), "5");
  assert.equal(parsed.searchParams.get("statement_cache_size"), "0");

  const directUrl = normalizeDatabaseUrl(
    "postgresql://user:pass@ep-cool-forest.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=30"
  );
  assert.ok(directUrl);
  const parsedDirect = new URL(directUrl);
  assert.equal(parsedDirect.searchParams.get("connect_timeout"), "30");
  assert.equal(parsedDirect.searchParams.get("socket_timeout"), "15");
  assert.equal(parsedDirect.searchParams.get("pool_timeout"), "20");
  assert.equal(parsedDirect.searchParams.get("pgbouncer"), null);
});

test("isTransientConnectionError detects Windows 10054 ConnectionReset and Prisma transient codes", () => {
  const win10054 = {
    message:
      'Error in PostgreSQL connection: Error { kind: Io, cause: Some(Os { code: 10054, kind: ConnectionReset, message: "An existing connection was forcibly closed by the remote host." }) }',
  };
  assert.equal(isTransientConnectionError(win10054), true);

  for (const code of ["P1001", "P1002", "P1008", "P1017", "P2024"]) {
    assert.equal(isTransientConnectionError({ code, message: "error" }), true, `Expected ${code} to be transient`);
  }

  for (const msg of ["BrokenPipe", "UnexpectedEof", "ECONNRESET", "ETIMEDOUT", "socket hang up"]) {
    assert.equal(isTransientConnectionError({ message: msg }), true, `Expected ${msg} to be transient`);
  }

  assert.equal(isTransientConnectionError({ code: "P2002", message: "Unique constraint failed" }), false);
  assert.equal(isTransientConnectionError(null), false);
});
