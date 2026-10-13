// Local development only. Creates one demo applicant so the applicant sign-in can be tried at any time.
//   Tracking ID: DEMO-0001   Access code: DEMO-1234
// Run with: npm run seed:demo
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

if (process.env.NODE_ENV === "production") {
  console.error("seed:demo is for local development only. Refusing to run in production.");
  process.exit(1);
}

const prisma = new PrismaClient();
const day = (s: string) => new Date(`${s}T00:00:00Z`);

async function main() {
  const publicId = "DEMO-0001";
  const accessCodeHash = await bcrypt.hash("DEMO-1234", 10);
  const data = {
    accessCodeHash,
    name: "Demo Applicant",
    email: "demo@example.com",
    gender: "PREFER_NOT_TO_SAY" as const,
    city: "Lahore",
    province: "Punjab",
    university: "TU Munich",
    program: "MSc Computer Science",
    intake: "Winter 2026",
    visaType: "Study",
    consulate: "Islamabad",
    waitingListDate: day("2026-03-02"),
    submissionInviteDate: day("2026-05-12"),
    documentSubmissionDate: day("2026-05-26"),
    appointmentDate: day("2026-06-30"),
    visaStatus: "APPOINTMENT_SCHEDULED" as const,
    approval: "APPROVED" as const,
    isAnonymous: true,
  };
  const existing = await prisma.applicant.findUnique({ where: { publicId } });
  if (existing) {
    await prisma.applicant.update({ where: { publicId }, data });
    console.log("Demo applicant updated.");
  } else {
    await prisma.applicant.create({
      data: {
        publicId,
        ...data,
        history: {
          create: [
            { visaStatus: "WAITING_LIST", note: "Entry submitted by applicant" },
            { visaStatus: "SUBMISSION_RECEIVED", note: "Documents received" },
            { visaStatus: "APPOINTMENT_SCHEDULED", note: "Appointment booked" },
          ],
        },
      },
    });
    console.log("Demo applicant created.");
  }
  console.log("  Tracking ID: DEMO-0001");
  console.log("  Access code: DEMO-1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
