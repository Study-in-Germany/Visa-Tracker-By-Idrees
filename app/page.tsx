import Link from "next/link";
import Sparkline from "@/components/data-display/Sparkline";
import Icon from "@/components/ui/Icon";
import StatCard from "@/components/ui/StatCard";
import { Notice } from "@/components/ui/States";
import QueueOverview from "@/components/visa/queue/QueueOverview";
import VisaProcessingItinerary from "@/components/visa/processing/VisaProcessingItinerary";
import StatusPipeline from "@/components/overview/StatusPipeline";
import TimelineTools from "@/components/overview/TimelineTools";
import { getCanonicalOverviewData } from "@/lib/analytics/service";
import RecentEntries from "@/components/overview/RecentEntries";
import AnnouncementsPreview from "@/components/overview/AnnouncementsPreview";
import CommunityResources from "@/components/overview/CommunityResources";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const d = await getCanonicalOverviewData();

  if (!d.ok) {
    return (
      <div className="space-y-4">
        <Notice tone="error">The database isn&apos;t reachable. Check that DATABASE_URL is set and the schema has been pushed.</Notice>
      </div>
    );
  }

  const decided = d.issued + d.rejected;
  const issueRate = decided > 0 ? Math.round((d.issued / decided) * 100) : null;


  return (
    <div className="space-y-4">
      {/* 1 & 2. Existing statistics cards (outer design preserved) */}
      <section aria-label="Key statistics" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          icon="users"
          label="Applicants tracked"
          value={d.total}
          hint={`${d.active.toLocaleString("en-US")} in queue`}
          sparkline={
            d.monthlyJoinTrend.length >= 3 ? (
              <Sparkline
                points={d.monthlyJoinTrend}
                width={72}
                height={24}
                ariaLabel="Monthly waiting-list entries trend"
              />
            ) : undefined
          }
          href="/tracker"
        />
        <StatCard
          icon="checkCircle"
          label="Visas issued"
          value={d.issued}
          hint={issueRate !== null ? `${issueRate}% approval rate` : "No decisions yet"}
        />
        <StatCard
          icon="hourglass"
          label="Active cases"
          value={d.active}
          hint={`${d.rejected} rejected · ${d.withdrawn} withdrawn`}
        />
        <StatCard
          icon="building"
          label="Islamabad"
          value={d.islamabad}
          hint={`${Math.round((d.islamabad / Math.max(d.total, 1)) * 100)}% of total`}
          href="/tracker?consulate=Islamabad"
        />
        <StatCard
          icon="building"
          label="Karachi"
          value={d.karachi}
          hint={`${Math.round((d.karachi / Math.max(d.total, 1)) * 100)}% of total`}
          href="/tracker?consulate=Karachi"
        />
      </section>

      {/* 3. Exactly ONE "The queue right now" section */}
      <QueueOverview data={d.queueOverview} />

      {/* 4. Exactly ONE "How long each step takes" section */}
      <VisaProcessingItinerary data={d.stageTimeline} />

      {/* 5. Compact status distribution and timeline actions */}
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
        <StatusPipeline total={d.total} statusCounts={d.statusCounts} />
        <TimelineTools />
      </div>

      {/* Recent activity and announcements share an equal split; resources stay full width below. */}
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
        <RecentEntries applicants={d.recentApplicants} />
        <AnnouncementsPreview announcements={d.announcements} />
      </div>
      <CommunityResources />
    </div>
  );
}
