export interface DirectoryUniversityRef {
  name: string;
  shortName: string | null;
}

export interface NormalizedUniversityVariant {
  label: string;
  count: number;
}

export interface NormalizedUniversityEntry {
  key: string;
  displayName: string;
  count: number;
  rawVariants: NormalizedUniversityVariant[];
}

export interface NormalizedProgrammeEntry {
  key: string;
  displayName: string;
  count: number;
  rawVariants: NormalizedUniversityVariant[];
}

function foldKey(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[.,/\\()[\]'’"`-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Curated, unambiguous German higher-education alias table for presentation aggregation.
 * Ambiguous names or institutions without clear equivalence are intentionally omitted
 * so unrelated universities are never merged together.
 */
const UNIVERSITY_ALIAS_MAP: Record<string, { key: string; displayName: string }> = {
  "arden": { key: "arden-university", displayName: "Arden University" },
  "arden university": { key: "arden-university", displayName: "Arden University" },
  "arden university berlin": { key: "arden-university", displayName: "Arden University" },
  "tu chemnitz": { key: "tu-chemnitz", displayName: "TU Chemnitz" },
  "chemnitz": { key: "tu-chemnitz", displayName: "TU Chemnitz" },
  "technische universitat chemnitz": { key: "tu-chemnitz", displayName: "TU Chemnitz" },
  "tu ilmenau": { key: "tu-ilmenau", displayName: "TU Ilmenau" },
  "technische universitat ilmenau": { key: "tu-ilmenau", displayName: "TU Ilmenau" },
  "ruhr bochum": { key: "ruhr-university-bochum", displayName: "Ruhr University Bochum" },
  "ruhr universitat bochum": { key: "ruhr-university-bochum", displayName: "Ruhr University Bochum" },
  "ruhr university bochum": { key: "ruhr-university-bochum", displayName: "Ruhr University Bochum" },
  "rub": { key: "ruhr-university-bochum", displayName: "Ruhr University Bochum" },
  "university of rostock": { key: "university-of-rostock", displayName: "University of Rostock" },
  "rostock universitat": { key: "university-of-rostock", displayName: "University of Rostock" },
  "universitat rostock": { key: "university-of-rostock", displayName: "University of Rostock" },
  "oth amberg weiden": { key: "oth-amberg-weiden", displayName: "OTH Amberg-Weiden" },
  "gisma": { key: "gisma-university", displayName: "GISMA University of Applied Sciences" },
  "gisma university of applied sciences": { key: "gisma-university", displayName: "GISMA University of Applied Sciences" },
  "university of bremen": { key: "university-of-bremen", displayName: "University of Bremen" },
  "universitat bremen": { key: "university-of-bremen", displayName: "University of Rostock" },
  "mittweida university of applied sciences": { key: "hs-mittweida", displayName: "Hochschule Mittweida" },
  "hochschule mittweida": { key: "hs-mittweida", displayName: "Hochschule Mittweida" },
  "university of siegen": { key: "university-of-siegen", displayName: "University of Siegen" },
  "universitat siegen": { key: "university-of-siegen", displayName: "University of Siegen" },
  "university of kassel": { key: "university-of-kassel", displayName: "University of Kassel" },
  "universitat kassel": { key: "university-of-kassel", displayName: "University of Kassel" },
  "hocshule munchen university of applied sciences": { key: "hm-munich", displayName: "HM Hochschule München" },
  "hochschule munchen": { key: "hm-munich", displayName: "HM Hochschule München" },
  "hochschule munchen university of applied sciences": { key: "hm-munich", displayName: "HM Hochschule München" },
  "tu berlin": { key: "tu-berlin", displayName: "TU Berlin" },
  "technische universitat berlin": { key: "tu-berlin", displayName: "TU Berlin" },
  "media design hoshchule": { key: "mdh-mediadesign", displayName: "Mediadesign Hochschule (MD.H)" },
  "mediadesign hochschule": { key: "mdh-mediadesign", displayName: "Mediadesign Hochschule (MD.H)" },
  "oto von guricek university of magdeburg": { key: "ovgu-magdeburg", displayName: "Otto von Guericke University Magdeburg" },
  "otto von guericke university magdeburg": { key: "ovgu-magdeburg", displayName: "Otto von Guericke University Magdeburg" },
  "ovgu magdeburg": { key: "ovgu-magdeburg", displayName: "Otto von Guericke University Magdeburg" },
  "deggendorf institute of technology": { key: "th-deggendorf", displayName: "Deggendorf Institute of Technology (THD)" },
  "th deggendorf": { key: "th-deggendorf", displayName: "Deggendorf Institute of Technology (THD)" },
  "university of bonn": { key: "university-of-bonn", displayName: "University of Bonn" },
  "universitat bonn": { key: "university-of-bonn", displayName: "University of Bonn" },
  "thws": { key: "thws", displayName: "THWS Würzburg-Schweinfurt" },
  "tu clausthal": { key: "tu-clausthal", displayName: "TU Clausthal" },
  "technische universitat clausthal": { key: "tu-clausthal", displayName: "TU Clausthal" },
  "steinbeis university": { key: "steinbeis-university", displayName: "Steinbeis University" },
  "marburg": { key: "philipps-marburg", displayName: "Philipps-Universität Marburg" },
  "philipps universitat marburg": { key: "philipps-marburg", displayName: "Philipps-Universität Marburg" },
  "cologne": { key: "university-of-cologne", displayName: "University of Cologne" },
  "university of cologne": { key: "university-of-cologne", displayName: "University of Cologne" },
  "tubaf": { key: "tu-freiberg", displayName: "TU Bergakademie Freiberg" },
  "tu bergakademie freiberg": { key: "tu-freiberg", displayName: "TU Bergakademie Freiberg" },
  "haw keil": { key: "haw-kiel", displayName: "HAW Kiel" },
  "haw kiel": { key: "haw-kiel", displayName: "HAW Kiel" },
};

// Fix typo in Bremen alias above cleanly without touching anything else:
UNIVERSITY_ALIAS_MAP["universitat bremen"] = { key: "university-of-bremen", displayName: "University of Bremen" };

function buildDirectoryIndex(directory?: DirectoryUniversityRef[]) {
  const map = new Map<string, { key: string; displayName: string }>();
  if (!directory) return map;
  for (const u of directory) {
    const cleanName = u.name.replace(/\s+/g, " ").trim();
    if (!cleanName) continue;
    const canonicalKey = `dir:${foldKey(cleanName)}`;
    map.set(foldKey(cleanName), { key: canonicalKey, displayName: cleanName });
    if (u.shortName) {
      const sn = foldKey(u.shortName);
      if (sn && sn.length >= 3 && !map.has(sn)) {
        map.set(sn, { key: canonicalKey, displayName: cleanName });
      }
    }
  }
  return map;
}

/**
 * Normalizes a raw applicant-entered university label for analytics aggregation
 * without mutating the underlying database value.
 */
export function normalizeUniversityName(
  raw: string,
  directoryIndex?: Map<string, { key: string; displayName: string }>
): { key: string; displayName: string } {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const folded = foldKey(cleaned);
  if (!folded) {
    return { key: "unknown", displayName: "Unspecified" };
  }

  const aliasHit = UNIVERSITY_ALIAS_MAP[folded];
  if (aliasHit) return aliasHit;

  if (directoryIndex) {
    const dirHit = directoryIndex.get(folded);
    if (dirHit) return dirHit;
  }

  return { key: `raw:${folded}`, displayName: cleaned };
}

export function aggregateUniversities(
  rawValues: (string | null | undefined)[],
  directory?: DirectoryUniversityRef[]
): NormalizedUniversityEntry[] {
  const dirIndex = buildDirectoryIndex(directory);
  const buckets = new Map<
    string,
    { key: string; displayName: string; count: number; variants: Map<string, number> }
  >();

  for (const raw of rawValues) {
    if (!raw) continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const norm = normalizeUniversityName(trimmed, dirIndex);
    const existing = buckets.get(norm.key) ?? {
      key: norm.key,
      displayName: norm.displayName,
      count: 0,
      variants: new Map<string, number>(),
    };
    existing.count += 1;
    existing.variants.set(raw, (existing.variants.get(raw) ?? 0) + 1);
    buckets.set(norm.key, existing);
  }

  return Array.from(buckets.values())
    .map((b) => ({
      key: b.key,
      displayName: b.displayName,
      count: b.count,
      rawVariants: Array.from(b.variants.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([label, count]) => ({ label, count })),
    }))
    .sort((a, b) => b.count - a.count || a.displayName.localeCompare(b.displayName));
}

const PROGRAMME_ALIAS_MAP: Record<string, { key: string; displayName: string }> = {
  "master": { key: "masters-unspecified", displayName: "Master's (unspecified)" },
  "masters": { key: "masters-unspecified", displayName: "Master's (unspecified)" },
  "msc": { key: "masters-unspecified", displayName: "Master's (unspecified)" },
  "ms": { key: "masters-unspecified", displayName: "Master's (unspecified)" },
  "bachelor": { key: "bachelors-unspecified", displayName: "Bachelor's (unspecified)" },
  "bachelors": { key: "bachelors-unspecified", displayName: "Bachelor's (unspecified)" },
  "bechlor": { key: "bachelors-unspecified", displayName: "Bachelor's (unspecified)" },
  "phd": { key: "phd", displayName: "PhD / Doctorate" },
  "mba": { key: "mba", displayName: "MBA" },
  "data science": { key: "data-science", displayName: "Data Science" },
  "computer science": { key: "computer-science", displayName: "Computer Science" },
  "rcse": { key: "rcse", displayName: "RCSE" },
};

export function aggregateProgrammes(
  rawValues: (string | null | undefined)[]
): NormalizedProgrammeEntry[] {
  const buckets = new Map<
    string,
    { key: string; displayName: string; count: number; variants: Map<string, number> }
  >();

  for (const raw of rawValues) {
    if (!raw) continue;
    const cleaned = raw.replace(/\s+/g, " ").trim();
    if (!cleaned) continue;
    const folded = foldKey(cleaned);
    if (!folded) continue;
    const hit = PROGRAMME_ALIAS_MAP[folded];
    const key = hit?.key ?? `prog:${folded}`;
    const displayName = hit?.displayName ?? cleaned;

    const existing = buckets.get(key) ?? {
      key,
      displayName,
      count: 0,
      variants: new Map<string, number>(),
    };
    existing.count += 1;
    existing.variants.set(raw, (existing.variants.get(raw) ?? 0) + 1);
    buckets.set(key, existing);
  }

  return Array.from(buckets.values())
    .map((b) => ({
      key: b.key,
      displayName: b.displayName,
      count: b.count,
      rawVariants: Array.from(b.variants.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([label, count]) => ({ label, count })),
    }))
    .sort((a, b) => b.count - a.count || a.displayName.localeCompare(b.displayName));
}
