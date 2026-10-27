// Importing this module registers every job handler.
import "./hrk";
import "./wikidata";
import "./linkcheck";
import "./programmes";
import "./maintenance";

export { createJob, runSlice, runToEnd, staleThreshold } from "./runner";
export { parseHrkTsv } from "./hrk";
export { parseProgrammeFile, PROGRAMME_TEMPLATE_HEADER } from "./programmes";

export const JOB_KINDS = ["hrk", "wikidata", "linkcheck", "programme-links", "programmes", "maintenance"] as const;
export type JobKind = (typeof JOB_KINDS)[number];
