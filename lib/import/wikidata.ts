import { prisma } from "@/lib/db";
import { hostOf, SITE_UA } from "./util";
import { registerHandler, type Handler } from "./runner";

/**
 * Enriches universities with their Wikidata id and logo. Wikidata is CC0 and offers a public SPARQL endpoint.
 * Matching is by official website host only, so a wrong logo can't be attached by a fuzzy name match.
 */
const QUERY = `
SELECT ?item ?website ?logo WHERE {
  ?item wdt:P17 wd:Q183 ; wdt:P856 ?website .
  { ?item wdt:P31/wdt:P279* wd:Q3918 } UNION { ?item wdt:P31/wdt:P279* wd:Q2467461 }
  OPTIONAL { ?item wdt:P154 ?logo }
}`;

type Entity = { qid: string; host: string; logo: string | null };

async function fetchEntities(): Promise<Entity[]> {
  const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(QUERY)}`, {
    headers: { "User-Agent": SITE_UA, Accept: "application/sparql-results+json" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Wikidata responded ${res.status}`);
  const json = await res.json();
  const byQid = new Map<string, Entity>();
  for (const b of json.results.bindings) {
    const host = hostOf(b.website?.value);
    if (!host) continue;
    const qid = String(b.item.value).split("/").pop()!;
    const cur = byQid.get(qid);
    // Wikimedia Commons file URLs are returned over http; use https, and a width so the file isn't served at full size.
    const logo = b.logo?.value ? String(b.logo.value).replace(/^http:/, "https:") + "?width=256" : null;
    if (!cur) byQid.set(qid, { qid, host, logo });
    else if (!cur.logo && logo) cur.logo = logo;
  }
  return [...byQid.values()];
}

const handler: Handler = {
  async prepare(_job, log) {
    const entities = await fetchEntities();
    log(`Wikidata returned ${entities.length} German institutions with a website`);
    return { payload: { entities }, total: entities.length };
  },
  async step(job, index) {
    const e = (job.payload as { entities: Entity[] }).entities[index];
    const matches = await prisma.university.findMany({ where: { website: { contains: e.host, mode: "insensitive" } } });
    const uni = matches.find((u) => hostOf(u.website) === e.host);
    if (!uni) return "skipped";
    const taken = await prisma.university.findUnique({ where: { wikidataId: e.qid }, select: { id: true } });
    if (taken && taken.id !== uni.id) return "skipped"; // two institutions share a host: leave both alone
    const data: Record<string, unknown> = {};
    if (uni.wikidataId !== e.qid) data.wikidataId = e.qid;
    if (e.logo && !uni.lockedFields.includes("logoUrl") && uni.logoUrl !== e.logo) data.logoUrl = e.logo;
    if (!Object.keys(data).length) return "skipped";
    await prisma.university.update({ where: { id: uni.id }, data });
    return "updated";
  },
};

registerHandler("wikidata", handler);
