import { PrismaClient, type VisaStatus } from "@prisma/client";
import { deriveVisaStatus } from "../lib/status";

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes("--apply");
  const applicants = await prisma.applicant.findMany({
    select: {
      id: true,
      publicId: true,
      visaStatus: true,
      approval: true,
      waitingListDate: true,
      submissionInviteDate: true,
      documentSubmissionDate: true,
      correctionRequestDate: true,
      correctionSubmittedDate: true,
      appointmentDate: true,
      interviewDate: true,
      decisionDate: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const changes: Array<{
    id: string;
    publicId: string;
    approval: string;
    from: VisaStatus;
    to: VisaStatus;
  }> = [];

  for (const a of applicants) {
    const next = deriveVisaStatus(a, a.visaStatus);
    if (next !== a.visaStatus) {
      changes.push({
        id: a.id,
        publicId: a.publicId,
        approval: a.approval,
        from: a.visaStatus,
        to: next,
      });
    }
  }

  console.log(`Scanned ${applicants.length} applicants. Found ${changes.length} status discrepancies.`);
  for (const c of changes) {
    console.log(`  [${c.approval}] ${c.publicId}: ${c.from} -> ${c.to}`);
  }

  if (!apply) {
    console.log("\nDry run complete. Pass --apply to persist these status reconciliations.");
    return;
  }

  if (changes.length === 0) {
    console.log("Nothing to update.");
    return;
  }

  for (const c of changes) {
    await prisma.$transaction([
      prisma.applicant.update({
        where: { id: c.id },
        data: { visaStatus: c.to },
      }),
      prisma.statusEvent.create({
        data: {
          applicantId: c.id,
          visaStatus: c.to,
          note: "Status reconciled from recorded milestones",
        },
      }),
    ]);
  }

  console.log(`\nApplied ${changes.length} status reconciliations.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
