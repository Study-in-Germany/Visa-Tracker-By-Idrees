import { prisma } from "@/lib/db";
import { normalizeUrl, SITE_UA, sleep } from "./util";
import { registerHandler, type Handler } from "./runner";

/**
 * Checks that each university's official website responds, honouring robots.txt and rate-limiting per host.
 * Only the home page is requested. The result is stored so dead links can be reviewed.
 */
const robotsCache = new Map<string, boolean>();

async function allowedByRobots(origin: string): Promise<boolean> {
  if (robotsCache.has(origin)) return robotsCache.get(origin)!;
  let allowed = true;
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { "User-Agent": SITE_UA }, signal: AbortSignal.timeout(6000), redirect: "follow" });
    if (res.ok) {
      // Only whole-site blocks matter for a home-page request: "Disallow: /" under * or our bot name.
      let applies = false;
      for (const raw of (await res.text()).split(/\r?\n/)) {
        const line = raw.replace(/#.*/, "").trim();
        const [k, ...rest] = line.split(":");
        const v = rest.join(":").trim();
        if (/^user-agent$/i.test(k)) applies = v === "*" || /visatrackerbot/i.test(v);
        else if (applies && /^disallow$/i.test(k) && v === "/") allowed = false;
      }
    }
  } catch {
    /* no robots.txt or unreachable: the page request below will tell */
  }
  robotsCache.set(origin, allowed);
  return allowed;
}

async function request(url: string, method: "HEAD" | "GET") {
  return fetch(url, { method, headers: { "User-Agent": SITE_UA, Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(10_000) });
}

/**
 * Requests a page politely and returns its HTTP status: 0 = unreachable, -1 = robots.txt asks bots to stay away (not requested).
 * Retries once on server errors and waits briefly afterwards so no host is hammered.
 */
export async function checkUrl(url: string, log?: (m: string) => void): Promise<number> {
  const origin = new URL(url).origin;
  if (!(await allowedByRobots(origin))) {
    log?.(`robots.txt disallows ${url}; not requested`);
    return -1;
  }
  let status = 0;
  for (let attempt = 0; attempt < 2 && (status === 0 || status >= 500); attempt++) {
    try {
      let res = await request(url, "HEAD");
      if (res.status === 405 || res.status === 403 || res.status === 501) res = await request(url, "GET");
      status = res.status;
    } catch {
      status = 0;
      await sleep(600);
    }
  }
  await sleep(250);
  return status;
}

const handler: Handler = {
  async prepare(job, log) {
    // Oldest-checked first, so repeated runs rotate through everything.
    const unis = await prisma.university.findMany({ select: { id: true }, orderBy: [{ websiteCheckedAt: { sort: "asc", nulls: "first" } }, { name: "asc" }], take: (job.payload as any)?.limit ?? 5000 });
    log(`Checking ${unis.length} websites`);
    return { payload: { ids: unis.map((u) => u.id) }, total: unis.length };
  },
  async step(job, index, log) {
    const id = (job.payload as { ids: string[] }).ids[index];
    const uni = await prisma.university.findUnique({ where: { id }, select: { id: true, name: true, website: true } });
    const url = normalizeUrl(uni?.website);
    if (!uni || !url) return "skipped";

    const status = await checkUrl(url, log);
    await prisma.university.update({ where: { id }, data: { websiteStatus: status, websiteCheckedAt: new Date() } });
    if (status === 0 || status >= 400) log(`${uni.name}: ${status === 0 ? "unreachable" : `HTTP ${status}`} (${url})`);
    return "updated";
  },
};

registerHandler("linkcheck", handler);

/**
 * Programme source links (official programme page, application portal, source page): checked for availability only.
 * DAAD links are reference links and are deliberately never requested automatically.
 */
const programmeLinks: Handler = {
  async prepare(job, log) {
    const rows = await prisma.programme.findMany({ select: { id: true }, orderBy: [{ lastCheckedAt: { sort: "asc", nulls: "first" } }], take: (job.payload as any)?.limit ?? 2000 });
    log(`Checking links of ${rows.length} programmes`);
    return { payload: { ids: rows.map((r) => r.id) }, total: rows.length };
  },
  async step(job, index, log) {
    const id = (job.payload as { ids: string[] }).ids[index];
    const p = await prisma.programme.findUnique({ where: { id }, select: { id: true, name: true, website: true, applicationUrl: true, sourceUrl: true } });
    if (!p) return "skipped";
    const urls = [...new Set([p.website, p.applicationUrl, p.sourceUrl].map((u) => normalizeUrl(u)).filter(Boolean) as string[])];
    let worst: number | null = null;
    for (const u of urls) {
      const st = await checkUrl(u, log);
      if (st === -1) continue;
      if (st === 0 || st >= 400) log(`${p.name}: ${st === 0 ? "unreachable" : "HTTP " + st} (${u})`);
      worst = worst === null ? st : st === 0 || worst === 0 ? 0 : Math.max(worst, st);
    }
    await prisma.programme.update({ where: { id }, data: { linkStatus: worst, lastCheckedAt: new Date() } });
    return "updated";
  },
};
registerHandler("programme-links", programmeLinks);
