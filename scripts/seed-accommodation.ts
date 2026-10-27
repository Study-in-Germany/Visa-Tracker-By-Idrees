// Usage: npm run seed:accommodation            adds demo listings (safe to repeat)
//        npm run seed:accommodation -- --remove  deletes them again
// Demo listings belong to the DEMO-0001 applicant (npm run seed:demo) and are marked "Demo host" so they are easy to
// recognise and remove. Photos are real interior photos from Unsplash (free licence, no attribution required), downloaded
// once into data/demo-photos and then sent through the normal image pipeline (validate, rotate, strip metadata, 3 WebP sizes).
import { nanoid } from "nanoid";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/db";
import { processImage } from "../lib/images";
import { getStorage } from "../lib/storage";
import { deleteImageFiles } from "../lib/listings";

const DEMO_CONTACT = "Demo host";
const day = (n: number) => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + n));

/** Unsplash photo ids per demo listing (first one is the cover). */
const PHOTOS: Record<string, string[]> = {
  "Bright furnished room near TU Berlin": ["D2jmthaa8I0", "1VRT31C3PbE", "JSPhvmVUcOw"],
  "Sunny studio in Schwabing": ["-7hLXaYm96k", "41o2UJWlx6U"],
  "Room in student flat, 5 min to TU Dresden": ["VGgmG8Se47M", "wDFwfdH6aEA", "Mb-lGau6K5U"],
  "Shared room, women only": ["OZhn6zYiVVE", "K8JBKN3T6b4"],
  "Modern studio near campus": ["ghN8sI7MDpM", "-jk2BBoQxSk", "idXQEOxhmvU"],
  "Two-room apartment, good transport links": ["Hnec2oEbbxk", "Qe8eMrwTW5g", "t0uOEEuAy1M"],
  "Cosy room with balcony in Ehrenfeld": ["DEfgoEX4ya8", "HtolmWUCFN8"],
  "Room in a big Leipzig WG": ["W3s4E7qM2uQ", "kE6Luqa4bBQ"],
  "Furnished room, Heidelberg old town": ["ohLMHYT25Y0", "FI2mdH4ZrwQ"],
};

const PHOTO_DIR = path.join(process.cwd(), "data", "demo-photos");
async function photoFile(id: string): Promise<Buffer> {
  const file = path.join(PHOTO_DIR, `${id}.jpg`);
  if (!existsSync(file)) {
    await mkdir(PHOTO_DIR, { recursive: true });
    const res = await fetch(`https://unsplash.com/photos/${id}/download?force=true&w=1600`, { redirect: "follow" });
    if (!res.ok) throw new Error(`Could not download demo photo ${id} (HTTP ${res.status})`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  return readFile(file);
}

type Seed = {
  kind: "OFFERING" | "SEEKING"; title: string; type: "ROOM" | "SHARED_ROOM" | "STUDIO" | "APARTMENT"; city: string; district?: string;
  rent: number | null; deposit?: number; bills?: boolean; furnished?: boolean; anmeldung: boolean; size?: number; stay?: number;
  gender?: "ANY" | "FEMALE" | "MALE"; availableIn: number; photos: number; description: string; // photos is unused now: see PHOTOS
};

const SEEDS: Seed[] = [
  { kind: "OFFERING", title: "Bright furnished room near TU Berlin", type: "ROOM", city: "Berlin", district: "Charlottenburg", rent: 520, deposit: 1040, bills: true, furnished: true, anmeldung: true, size: 16, stay: 6, availableIn: 14, photos: 3,
    description: "## The room\nA **bright, fully furnished** room in a calm 3-person WG, 10 minutes from TU Berlin by bike.\n\n## Included\n• Bed, desk and wardrobe\n• Wi-Fi, heating and electricity\n• Shared kitchen and balcony\n\n## Good to know\n1. Anmeldung is possible\n2. Minimum stay _6 months_\n3. No smoking inside" },
  { kind: "OFFERING", title: "Sunny studio in Schwabing", type: "STUDIO", city: "Munich", district: "Schwabing", rent: 890, deposit: 1780, bills: false, furnished: true, anmeldung: true, size: 24, stay: 12, availableIn: 30, photos: 2,
    description: "A **quiet studio** with its own bathroom and kitchenette, close to the U-Bahn and LMU.\n\n• Fully furnished\n• Washing machine in the building\n• Rent excludes electricity\n\n_Viewing possible on weekends._" },
  { kind: "OFFERING", title: "Room in student flat, 5 min to TU Dresden", type: "ROOM", city: "Dresden", district: "Südvorstadt", rent: 340, deposit: 680, bills: true, furnished: true, anmeldung: true, size: 14, stay: 6, gender: "ANY", availableIn: 45, photos: 3,
    description: "## Student-friendly\nFriendly 4-person flat, everyone studies at TU Dresden. **Anmeldung available.**\n\n• All bills included\n• Fast internet\n• Quiet after 22:00\n\nMessage me with a few lines about yourself." },
  { kind: "OFFERING", title: "Shared room, women only", type: "SHARED_ROOM", city: "Aachen", district: "Frankenberg", rent: 260, deposit: 520, bills: true, furnished: true, anmeldung: true, size: 18, stay: 3, gender: "FEMALE", availableIn: 7, photos: 2,
    description: "Shared room for **two female students** in a clean flat near RWTH.\n\n1. Bills and internet included\n2. Anmeldung possible\n3. Cleaning rota shared with the flat" },
  { kind: "OFFERING", title: "Modern studio near campus", type: "STUDIO", city: "Hamburg", district: "Eimsbüttel", rent: 780, deposit: 1560, bills: false, furnished: false, anmeldung: true, size: 28, stay: 12, availableIn: 60, photos: 3,
    description: "Unfurnished **28 m² studio**, new kitchen, bike room in the basement.\n\n• Quiet street, 10 minutes to the university\n• Anmeldung possible\n\n_Available from the start of the next semester._" },
  { kind: "OFFERING", title: "Two-room apartment, good transport links", type: "APARTMENT", city: "Stuttgart", district: "Vaihingen", rent: 1150, deposit: 2300, bills: false, furnished: false, anmeldung: true, size: 52, stay: 12, availableIn: 25, photos: 4,
    description: "## Apartment\nTwo rooms, kitchen and bathroom in Vaihingen, a short walk from the **University of Stuttgart** campus and S-Bahn.\n\n• Balcony\n• Cellar storage\n• Suitable for a couple or two flatmates" },
  { kind: "OFFERING", title: "Cosy room with balcony in Ehrenfeld", type: "ROOM", city: "Cologne", district: "Ehrenfeld", rent: 480, deposit: 960, bills: true, furnished: true, anmeldung: true, size: 15, stay: 4, availableIn: 20, photos: 2,
    description: "Cosy room with a **private balcony** in a lively neighbourhood. Quiet flatmates, shared kitchen.\n\n• Bills included\n• Anmeldung possible" },
  { kind: "OFFERING", title: "Room in a big Leipzig WG", type: "ROOM", city: "Leipzig", district: "Connewitz", rent: 310, deposit: 600, bills: true, furnished: false, anmeldung: true, size: 17, stay: 6, availableIn: 35, photos: 2,
    description: "Large room in a **5-person WG**. Unfurnished, but a bed and desk can be taken over cheaply.\n\n• Garden\n• Bike storage\n• Anmeldung possible" },
  { kind: "OFFERING", title: "Furnished room, Heidelberg old town", type: "ROOM", city: "Heidelberg", district: "Altstadt", rent: 560, deposit: 1120, bills: true, furnished: true, anmeldung: true, size: 13, stay: 6, gender: "MALE", availableIn: 18, photos: 3,
    description: "Small furnished room in the old town, a few minutes from the university library.\n\n• Male flatmates only\n• Bills included" },
  { kind: "SEEKING", title: "Looking for a room in Dresden from September", type: "ROOM", city: "Dresden", rent: 400, anmeldung: true, stay: 24, availableIn: 60, photos: 0,
    description: "## 🏠 Accommodation seeking\n**Move-in:** 27 Sep 2026\n**Location:** Dresden\n**Anmeldung:** MUST be available ✅\n\n## Looking for\n• Private room in a shared apartment / student accommodation\n• Safe and convenient location\n• Anmeldung available\n\n## Contact\nIf you have a room available or know of suitable accommodation, please message me." },
  { kind: "SEEKING", title: "Master's student looking for a room in Aachen", type: "ROOM", city: "Aachen", rent: 350, anmeldung: true, stay: 24, availableIn: 40, photos: 0,
    description: "Starting my **M.Sc. at RWTH** in the winter semester.\n\n• Budget up to €350 including bills\n• Prefer a quiet, tidy flat\n• Anmeldung needed for my visa registration" },
  { kind: "SEEKING", title: "Looking for a studio in Munich, couple", type: "STUDIO", city: "Munich", rent: 1000, anmeldung: true, stay: 12, availableIn: 75, photos: 0,
    description: "We are a **couple** (both students) looking for a studio or small apartment.\n\n1. Budget up to €1000\n2. Anmeldung for both of us\n3. Move-in flexible" },
];

async function main() {
  const owner = await prisma.applicant.findUnique({ where: { publicId: "DEMO-0001" }, select: { id: true } });
  if (!owner) throw new Error("Demo applicant DEMO-0001 not found. Run `npm run seed:demo` first.");

  if (process.argv.includes("--remove")) {
    const rows = await prisma.listing.findMany({ where: { ownerId: owner.id, contactName: DEMO_CONTACT }, select: { id: true, images: { select: { storageKey: true } } } });
    for (const r of rows) await deleteImageFiles(r.images);
    const res = await prisma.listing.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
    console.log(`Removed ${res.count} demo listings`);
    return;
  }

  const storage = getStorage();
  let created = 0, skipped = 0;
  for (const s of SEEDS) {
    if (await prisma.listing.findFirst({ where: { ownerId: owner.id, title: s.title, contactName: DEMO_CONTACT }, select: { id: true } })) { skipped++; continue; }

    const imageIds: string[] = [];
    for (const [k, photoId] of (PHOTOS[s.title] ?? []).entries()) {
      const processed = await processImage(await photoFile(photoId));
      const storageKey = `listings/${owner.id}/${nanoid(16)}`;
      await Promise.all(processed.variants.map((v) => storage.put(`${storageKey}/${v.width}.webp`, v.buffer, "image/webp")));
      const img = await prisma.listingImage.create({
        data: { ownerId: owner.id, storageKey, thumbUrl: storage.url(`${storageKey}/320.webp`), cardUrl: storage.url(`${storageKey}/800.webp`), fullUrl: storage.url(`${storageKey}/1600.webp`), width: processed.width, height: processed.height, bytes: processed.bytes, position: k },
      });
      imageIds.push(img.id);
    }

    await prisma.listing.create({
      data: {
        ownerId: owner.id, kind: s.kind, title: s.title, description: `${s.description}\n\n_Demo listing for testing._`, type: s.type, city: s.city, district: s.district ?? null,
        rentEur: s.rent, depositEur: s.deposit ?? null, billsIncluded: s.bills ?? false, furnished: s.furnished ?? false, anmeldung: s.anmeldung,
        sizeSqm: s.size ?? null, minStayMonths: s.stay ?? null, genderPreference: s.gender ?? "ANY", availableFrom: day(s.availableIn),
        contactName: DEMO_CONTACT, contactPhone: "+49 151 0000000", contactEmail: "demo@example.com", status: "APPROVED", approvedAt: new Date(),
        images: { connect: imageIds.map((id) => ({ id })) },
      },
    });
    created++;
  }
  console.log(`Demo listings: ${created} created, ${skipped} already present`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
