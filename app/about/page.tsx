import { SITE_NAME } from "@/lib/constants";

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-navy-950">About {SITE_NAME}</h1>
      <div className="card p-6 space-y-4 text-sm text-gray-700 leading-relaxed">
        <p>
          {SITE_NAME} is a community-driven tracker built for Pakistani students navigating the
          German national student visa process. It brings together applicant-reported journeys —
          from joining the waiting list to visa issuance — into one place, so the community can see
          real processing patterns instead of relying on rumours.
        </p>
        <p>
          Applicants can submit their own visa journey, which stays private until reviewed and
          approved. Once approved, it appears on the public tracker in a partially-anonymous form:
          your Tracking ID, university, and dates are visible, but your name and contact details
          are never shown publicly.
        </p>
        <p>
          The Analytics and Queue Progress pages are built entirely from this community data, and
          the estimated-timeline figures shown on each applicant's page are calculated from
          observed patterns among similar cases — not from any official embassy source.
        </p>
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 text-xs">
          <strong>Disclaimer:</strong> This project is independent and community-run. It is not
          affiliated with, endorsed by, or connected to the German Federal Foreign Office, any
          German consulate, or any embassy. All estimates are unofficial and provided for general
          guidance only.
        </div>
      </div>
    </div>
  );
}
