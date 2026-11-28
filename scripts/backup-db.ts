import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), ".data", "backups");
  fs.mkdirSync(backupDir, { recursive: true });

  const [
    applicants,
    statusEvents,
    announcements,
    adminUsers,
    universities,
    programmes,
    listings,
    listingImages,
    listingReports,
    importJobs,
  ] = await Promise.all([
    prisma.applicant.findMany(),
    prisma.statusEvent.findMany(),
    prisma.announcement.findMany(),
    prisma.adminUser.findMany({ select: { id: true, email: true, passwordHash: true, createdAt: true } }),
    prisma.university.findMany(),
    prisma.programme.findMany(),
    prisma.listing.findMany(),
    prisma.listingImage.findMany(),
    prisma.listingReport.findMany(),
    prisma.importJob.findMany(),
  ]);

  const counts = {
    applicants: applicants.length,
    approvedApplicants: applicants.filter((a) => a.approval === "APPROVED").length,
    statusEvents: statusEvents.length,
    announcements: announcements.length,
    adminUsers: adminUsers.length,
    universities: universities.length,
    programmes: programmes.length,
    listings: listings.length,
    listingImages: listingImages.length,
    listingReports: listingReports.length,
    importJobs: importJobs.length,
  };

  const payload = {
    createdAt: new Date().toISOString(),
    counts,
    data: {
      applicants,
      statusEvents,
      announcements,
      adminUsers,
      universities,
      programmes,
      listings,
      listingImages,
      listingReports,
      importJobs,
    },
  };

  const outPath = path.join(backupDir, `backup-${timestamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log("Backup written to:", outPath);
  console.log("Counts:", JSON.stringify(counts, null, 2));
}

main()
  .catch((err) => {
    console.error("Backup failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
