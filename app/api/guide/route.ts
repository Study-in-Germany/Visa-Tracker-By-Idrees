import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    lastVerified: "2026-11-01",
    financialRequirements: {
      annualBlockedAmount: 11904,
      monthlyBlockedAmount: 992,
      indicativeInsuranceMonthly: 125,
      currency: "EUR",
      source: "Auswärtiges Amt - Proof of Financial Resources § 16b AufenthG",
      sourceUrl: "https://www.auswaertiges-amt.de/en/visa-service/buergerservice/faq-kategorie/02a-visum-fuer-deutschland",
    },
    uniAssistFees: {
      firstApplication: 75,
      subsequentApplication: 30,
      currency: "EUR",
      source: "Uni-Assist e.V. Fee Structure",
      sourceUrl: "https://www.uni-assist.de/en/how-to-apply/pay-fees/",
    },
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

