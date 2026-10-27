import { NextResponse } from "next/server";
import { PROGRAMME_TEMPLATE_HEADER } from "@/lib/import";

// GET /api/admin/imports/template — blank CSV with the programme import columns and one example row.
export async function GET() {
  const example = "Technische Universität München,,M.Sc. Informatics,Master,English,Winter,2027-05-31,,https://www.tum.de/en/studies,https://www.tum.de/en/application,TUMonline,No tuition for EU; see site,https://www.tum.de/en/studies/application-deadlines,yes";
  return new NextResponse(`${PROGRAMME_TEMPLATE_HEADER}\n${example}\n`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="programmes-template.csv"' } });
}
