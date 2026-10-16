import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./auth";
import { prisma } from "./db";

export async function getSession() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload || payload.kind !== "admin" || typeof payload.email !== "string") return null;

  const user = await prisma.adminUser.findUnique({
    where: { email: payload.email },
    select: { id: true },
  });
  return user ? payload : null;
}
