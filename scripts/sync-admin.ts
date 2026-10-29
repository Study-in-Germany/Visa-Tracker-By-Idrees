import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { passwordProblem } from "../lib/password";

/**
 * Keeps the admin account in step with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
 * Runs during the build: creates the admin if missing, or resets its password when it differs.
 * Does nothing when either variable is unset. Never fails the build.
 */
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("sync-admin: SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set, skipping.");
    return;
  }
  const problem = passwordProblem(password, email);
  if (problem) console.warn(`sync-admin: warning, password ${problem}.`);

  const prisma = new PrismaClient();
  try {
    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      console.log(`sync-admin: ${email} already up to date.`);
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    if (user) await prisma.adminUser.update({ where: { email }, data: { passwordHash } });
    else await prisma.adminUser.create({ data: { email, passwordHash } });
    console.log(`sync-admin: ${user ? "password reset for" : "created"} ${email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => console.error("sync-admin failed:", e.message || e));
