import { requireAdmin } from "@/lib/auth/authorization";
import { runRollingOriginBacktest } from "@/lib/forecasting/backtesting";
import { loadForecastDataset } from "@/lib/forecasting/forecast-service";
import { privateJson } from "@/lib/security/cache-policy";

export const dynamic = "force-dynamic";

const DEFAULT_CUTOFFS = [
  new Date("2026-08-15T00:00:00Z"),
  new Date("2026-09-15T00:00:00Z"),
  new Date("2026-10-16T00:00:00Z"),
  new Date("2026-11-01T00:00:00Z"),
  new Date("2026-11-16T00:00:00Z"),
];

// GET /api/admin/forecasting/backtest — run rolling-origin chronological accuracy audit
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const startMs = Date.now();
  const ds = await loadForecastDataset();
  const islamabad = runRollingOriginBacktest("Islamabad", ds.journeys, ds.queuePoints, DEFAULT_CUTOFFS);
  const karachi = runRollingOriginBacktest("Karachi", ds.journeys, ds.queuePoints, DEFAULT_CUTOFFS);

  return privateJson({
    durationMs: Date.now() - startMs,
    cutoffs: DEFAULT_CUTOFFS.map((d) => d.toISOString().slice(0, 10)),
    results: { Islamabad: islamabad, Karachi: karachi },
  });
}
