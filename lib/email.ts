import { Resend } from "resend";
import { VISA_STATUS_LABELS } from "@/lib/constants";

export async function sendStatusUpdateEmail(opts: {
  to: string | null | undefined;
  name: string;
  visaStatus: string;
  note?: string | null;
}) {
  if (!opts.to) return; // no email on file, nothing to send
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Visa Tracker <onboarding@resend.dev>";
  if (!apiKey) return; // notifications disabled — app still works fine without this

  const resend = new Resend(apiKey);
  const label = VISA_STATUS_LABELS[opts.visaStatus] || opts.visaStatus;

  try {
    await resend.emails.send({
      from,
      to: opts.to,
      subject: `Visa Tracker update: ${label}`,
      html: `
        <div style="font-family:sans-serif;line-height:1.5">
          <h2 style="color:#0f1b3d">Status update for ${opts.name}</h2>
          <p>Your tracked application status changed to:</p>
          <p style="font-size:18px;font-weight:bold;color:#d4af37">${label}</p>
          ${opts.note ? `<p><em>${opts.note}</em></p>` : ""}
          <p style="color:#888;font-size:12px">You're receiving this because you submitted an entry to Visa Tracker and provided this email for updates.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Email send failed:", err);
  }
}
