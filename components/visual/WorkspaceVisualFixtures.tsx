"use client";

import { useEffect, useRef, useState } from "react";
import StatCard from "@/components/ui/StatCard";
import Icon from "@/components/ui/Icon";
import {
  TrackerDesktopFilterTrigger,
  TrackerMobileFilterTrigger,
} from "@/components/tracker/TrackerFilterTrigger";
import TrackerFilterDrawer from "@/components/tracker/TrackerFilterDrawer";
import TrackerFilterSheet, { type TrackerFilterValues } from "@/components/tracker/TrackerFilterSheet";
import TrackerTable from "@/components/tracker/TrackerTable";
import MobileList from "@/components/tracker/MobileList";
import EditableVisaJourney from "@/components/visa/journey/EditableVisaJourney";
import VisaJourneyReview from "@/components/visa/journey/VisaJourneyReview";
import SidebarAccountTrigger from "@/components/sidebar/SidebarAccountTrigger";
import { LogoMark } from "@/components/Logo";
import { validateSubmissionJourneyDates, type SubmissionMilestoneValues } from "@/lib/journey-validation";
import type { SessionInfo } from "@/hooks/useSession";
import type { ApplicantRow } from "@/lib/types";

const TODAY = "2026-11-27";

const SAMPLE_ROWS: ApplicantRow[] = Array.from({ length: 14 }, (_, idx) => {
  const statuses = [
    "WAITING_LIST",
    "WAITING_FOR_SUBMISSION",
    "SUBMISSION_RECEIVED",
    "UNDER_CORRECTION",
    "APPOINTMENT_SCHEDULED",
    "PROCESSING",
    "VISA_ISSUED",
    "VISA_REJECTED",
    "WITHDRAWN",
  ];
  const st = statuses[idx % statuses.length];
  return {
    id: `app-${idx + 1}`,
    publicId: `VT-2026-${String(101 + idx)}`,
    name: idx % 3 === 0 ? "" : `Applicant ${idx + 1}`,
    university: idx % 2 === 0 ? "TU Munich" : "RWTH Aachen",
    program: idx % 2 === 0 ? "MSc Informatics" : "MSc Mechanical Engineering",
    intake: idx % 2 === 0 ? "Winter 2026" : "Summer 2027",
    consulate: idx % 3 === 0 ? "Karachi" : "Islamabad",
    visaType: "Study",
    waitingListDate: "2026-03-04",
    submissionInviteDate: idx > 1 ? "2026-06-12" : null,
    documentSubmissionDate: idx > 2 ? "2026-06-18" : null,
    correctionRequestDate: st === "UNDER_CORRECTION" ? "2026-07-02" : null,
    correctionSubmittedDate: null,
    appointmentDate: idx > 4 ? "2026-09-10" : null,
    interviewDate: idx > 5 ? "2026-09-10" : null,
    decisionDate: st === "VISA_ISSUED" || st === "VISA_REJECTED" ? "2026-10-15" : null,
    visaStatus: st,
    approval: "APPROVED",
    isAnonymous: idx % 3 === 0,
    updatedAt: "2026-11-20T12:00:00.000Z",
    createdAt: "2026-03-04T12:00:00.000Z",
  };
});

const STATUS_COUNTS: Record<string, number> = {
  WAITING_LIST: 320,
  WAITING_FOR_SUBMISSION: 142,
  SUBMISSION_RECEIVED: 118,
  UNDER_CORRECTION: 29,
  APPOINTMENT_SCHEDULED: 64,
  PROCESSING: 81,
  VISA_ISSUED: 412,
  VISA_REJECTED: 18,
  WITHDRAWN: 24,
};

const INTAKE_OPTIONS = [
  { value: "", label: "All intakes" },
  { value: "Winter 2026", label: "Winter 2026" },
  { value: "Summer 2027", label: "Summer 2027" },
];

const UNIVERSITY_OPTIONS = [
  { value: "", label: "All universities" },
  { value: "TU Munich", label: "TU Munich" },
  { value: "RWTH Aachen", label: "RWTH Aachen" },
];

const EMPTY_MILESTONES: SubmissionMilestoneValues = {
  waitingListDate: "",
  submissionInviteDate: "",
  documentSubmissionDate: "",
  correctionRequestDate: "",
  correctionSubmittedDate: "",
  appointmentDate: "",
  interviewDate: "",
  decisionDate: "",
};

const APPLICANT_SESSION: SessionInfo & { loading?: boolean } = {
  role: "applicant",
  publicId: "PK-ISB-2048",
  name: "Muhammad Abdullah Khan",
  university: "Technical University of Munich (TUM)",
  consulate: "Islamabad",
  visaStatus: "APPOINTMENT_SCHEDULED",
};

const LONG_NAME_SESSION: SessionInfo & { loading?: boolean } = {
  role: "applicant",
  publicId: "PK-KHI-9914",
  name: "Syeda Ayesha Siddiqua Al-Mansoor Bukhari",
  university: "Rheinisch-Westfälische Technische Hochschule Aachen University",
  consulate: "Karachi",
  visaStatus: "UNDER_CORRECTION",
};

const GUEST_SESSION: SessionInfo & { loading?: boolean } = {
  role: "guest",
};

const LOADING_APPLICANT_SESSION: SessionInfo & { loading?: boolean } = {
  role: "applicant",
  loading: true,
};

export default function WorkspaceVisualFixtures({ dark }: { dark: boolean }) {
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    return () => {
      root.classList.remove("dark");
    };
  }, [dark]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filters, setFilters] = useState<TrackerFilterValues>({
    consulate: "Islamabad",
    visaStatus: "WAITING_LIST",
    intake: "Winter 2026",
    university: "TU Munich",
    period: { from: "", to: "" },
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const desktopBtnRef = useRef<HTMLButtonElement>(null);
  const mobileBtnRef = useRef<HTMLButtonElement>(null);

  const [editableValues, setEditableValues] = useState<SubmissionMilestoneValues>({
    ...EMPTY_MILESTONES,
    waitingListDate: "2026-03-05",
    submissionInviteDate: "2026-07-18",
    documentSubmissionDate: "2026-07-24",
    appointmentDate: "2027-01-12",
  });

  const activeCount = [
    filters.visaStatus,
    filters.consulate,
    filters.university,
    filters.intake,
    filters.period.from || filters.period.to ? "1" : "",
  ].filter(Boolean).length;

  const invalidJourney: SubmissionMilestoneValues = {
    ...EMPTY_MILESTONES,
    waitingListDate: "2026-04-10",
    submissionInviteDate: "2026-06-12",
    documentSubmissionDate: "2026-06-01",
  };
  const invalidErrors = validateSubmissionJourneyDates(invalidJourney, TODAY);

  const reviewValues: SubmissionMilestoneValues = {
    ...EMPTY_MILESTONES,
    waitingListDate: "2026-02-14",
    submissionInviteDate: "2026-06-10",
    documentSubmissionDate: "2026-06-14",
    correctionRequestDate: "2026-06-22",
    correctionSubmittedDate: "2026-06-25",
    appointmentDate: "2027-01-18",
  };

  return (
    <div className={dark ? "dark min-h-[100dvh] bg-paper p-4 text-ink-900" : "min-h-[100dvh] bg-paper p-4 text-ink-900"}>
      <div className="mx-auto max-w-7xl space-y-10">
        {/* 1. Interactive Valley-Tickets Tracker Workspace */}
        <section
          data-testid="fixture-tracker-interactive"
          className="flex flex-col overflow-hidden rounded-2xl border border-line bg-paper md:h-[700px]"
        >
          {/* Simulated Header matching DynamicPageHeader */}
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line bg-[rgb(var(--chrome))] px-4">
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold tracking-tight text-ink-900">My Journey</h1>
              <span className="rounded-full border border-line bg-paper-sunk px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink-700">
                1,208
              </span>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <TrackerDesktopFilterTrigger
                ref={desktopBtnRef}
                activeCount={activeCount}
                open={drawerOpen}
                onClick={() => setDrawerOpen((o) => !o)}
              />
              <div className="flex h-9 w-56 items-center gap-2 rounded-lg border border-line-strong bg-paper-raised px-3 text-xs text-mute">
                <Icon name="search" size={14} />
                <span>Search ID, university…</span>
              </div>
            </div>
            <div className="flex items-center gap-1 md:hidden">
              <TrackerMobileFilterTrigger
                ref={mobileBtnRef}
                activeCount={activeCount}
                open={sheetOpen}
                onClick={() => setSheetOpen(true)}
              />
              <span className="grid h-11 w-11 place-items-center rounded-lg text-ink-800">
                <Icon name="search" size={18} />
              </span>
            </div>
          </header>

          {/* 4 KPI Cards (no toolbar below them) */}
          <section
            aria-label="Summary"
            className="shrink-0 grid grid-cols-2 gap-2.5 p-3 md:border-b md:border-line md:px-4 md:py-3 lg:grid-cols-4"
          >
            <StatCard icon="users" label="Applicants" value={1208} />
            <StatCard icon="hourglass" label="In queue" value={754} />
            <StatCard icon="checkCircle" label="Visas issued" value={412} />
            <StatCard icon="xcircle" label="Rejected" value={18} />
          </section>

          {/* Edge-to-edge desktop table + pinned bottom pagination */}
          <TrackerTable
            rows={SAMPLE_ROWS.slice(0, pageSize)}
            loading={false}
            emptyTitle="No entries match these filters"
            emptyHint="Try removing a filter."
            sort={null}
            onSort={() => {}}
            page={page}
            pageCount={3}
            pageSize={pageSize}
            total={34}
            onPage={setPage}
            onPageSize={setPageSize}
          />

          <div className="px-3 pb-3 md:hidden">
            <MobileList
              rows={SAMPLE_ROWS.slice(0, 4)}
              loading={false}
              onRetry={() => {}}
              emptyTitle="No entries match"
              emptyHint="Adjust filters."
              page={1}
              pageCount={3}
              total={34}
              onPage={() => {}}
            />
          </div>

          <TrackerFilterDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            triggerRef={desktopBtnRef}
            values={filters}
            intakeOptions={INTAKE_OPTIONS}
            universityOptions={UNIVERSITY_OPTIONS}
            statusCounts={STATUS_COUNTS}
            totalCount={1208}
            onApply={(next) => setFilters(next)}
          />

          <TrackerFilterSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            triggerRef={mobileBtnRef}
            values={filters}
            intakeOptions={INTAKE_OPTIONS}
            universityOptions={UNIVERSITY_OPTIONS}
            statusCounts={STATUS_COUNTS}
            totalCount={1208}
            onApply={(next) => setFilters(next)}
          />
        </section>

        {/* 2. Filtered (2 rows) & Empty (0 rows) Table Workspace verifying pinned bottom pagination */}
        <section
          data-testid="fixture-tracker-sparse"
          className="hidden md:flex md:h-[460px] md:flex-col md:overflow-hidden rounded-2xl border border-line bg-paper"
        >
          <TrackerTable
            rows={SAMPLE_ROWS.slice(0, 2)}
            loading={false}
            emptyTitle="No entries"
            emptyHint="Try adjusting filters."
            sort={null}
            onSort={() => {}}
            page={1}
            pageCount={1}
            pageSize={25}
            total={2}
            onPage={() => {}}
            onPageSize={() => {}}
          />
        </section>

        <section
          data-testid="fixture-tracker-empty"
          className="hidden md:flex md:h-[420px] md:flex-col md:overflow-hidden rounded-2xl border border-line bg-paper"
        >
          <TrackerTable
            rows={[]}
            loading={false}
            emptyTitle="No entries match these filters"
            emptyHint="Try removing a filter or widening the date range."
            sort={null}
            onSort={() => {}}
            page={1}
            pageCount={1}
            pageSize={25}
            total={0}
            onPage={() => {}}
            onPageSize={() => {}}
          />
        </section>

        {/* 3. Submission Step 3 States */}
        <section data-testid="fixture-submit-step3-empty" className="max-w-4xl">
          <EditableVisaJourney
            consulate="Islamabad"
            onConsulateChange={() => {}}
            values={EMPTY_MILESTONES}
            onDateChange={() => {}}
            todayIso={TODAY}
          />
        </section>

        <section data-testid="fixture-submit-step3-one-date" className="max-w-4xl">
          <EditableVisaJourney
            consulate="Islamabad"
            onConsulateChange={() => {}}
            values={{ ...EMPTY_MILESTONES, waitingListDate: "2026-04-02" }}
            onDateChange={() => {}}
            todayIso={TODAY}
          />
        </section>

        <section data-testid="fixture-submit-step3-multi-scheduled" className="max-w-4xl">
          <EditableVisaJourney
            consulate="Islamabad"
            onConsulateChange={() => {}}
            values={editableValues}
            onDateChange={(k, v) => setEditableValues((prev) => ({ ...prev, [k]: v }))}
            todayIso={TODAY}
          />
        </section>

        <section data-testid="fixture-submit-step3-correction" className="max-w-4xl">
          <EditableVisaJourney
            consulate="Karachi"
            onConsulateChange={() => {}}
            values={reviewValues}
            onDateChange={() => {}}
            todayIso={TODAY}
          />
        </section>

        <section data-testid="fixture-submit-step3-invalid" className="max-w-4xl">
          <EditableVisaJourney
            consulate="Islamabad"
            onConsulateChange={() => {}}
            values={invalidJourney}
            onDateChange={() => {}}
            errors={invalidErrors}
            todayIso={TODAY}
          />
        </section>

        {/* 4. Submission Step 4 Review */}
        <section data-testid="fixture-submit-step4-review" className="max-w-4xl">
          <VisaJourneyReview
            consulate="Islamabad"
            values={reviewValues}
            onEdit={() => {}}
            todayIso={TODAY}
          />
        </section>

        {/* 5. Compact Sidebar Account Dropdown States */}
        <section data-testid="fixture-sidebar-account" className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Expanded sidebar with applicant account trigger */}
          <aside
            data-testid="sidebar-account-expanded"
            className="flex h-[340px] w-[264px] flex-col overflow-hidden rounded-xl border border-line bg-[rgb(var(--chrome))]"
          >
            <div className="flex h-14 shrink-0 items-center px-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-paper-raised">
                  <LogoMark size={24} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[13px] font-bold leading-tight text-ink-900">Visa Tracker</span>
                  <span className="text-[10px] font-medium uppercase leading-tight text-mute">by Idrees</span>
                </div>
              </div>
            </div>
            <div className="shrink-0 border-b border-line px-3 pb-2.5 pt-0.5">
              <SidebarAccountTrigger session={APPLICANT_SESSION} />
            </div>
            <div className="flex-1 space-y-1 p-3 text-[13px] text-ink-600">
              <div className="flex h-9 items-center gap-2.5 rounded-lg bg-neutral-100 px-2 font-medium text-ink-900 dark:bg-[#303030] dark:text-[#F5F5F5]">
                <Icon name="dashboard" size={16} /> Overview
              </div>
              <div className="flex h-9 items-center gap-2.5 rounded-lg px-2">
                <Icon name="route" size={16} className="text-mute" /> My Journey
              </div>
            </div>
            <div className="shrink-0 border-t border-line p-3">
              <div className="flex h-9 items-center gap-2.5 px-2 text-[13px] font-medium text-ink-600">
                <Icon name="logout" size={16} className="text-mute" /> Log out
              </div>
            </div>
          </aside>

          {/* Collapsed sidebar rail (68px) with avatar-only trigger */}
          <aside
            data-testid="sidebar-account-collapsed"
            className="flex h-[340px] w-[68px] flex-col overflow-hidden rounded-xl border border-line bg-[rgb(var(--chrome))]"
          >
            <div className="flex h-14 shrink-0 items-center justify-center">
              <div className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-paper-raised">
                <LogoMark size={24} />
              </div>
            </div>
            <div className="shrink-0 border-b border-line px-2 py-2">
              <SidebarAccountTrigger session={APPLICANT_SESSION} compact />
            </div>
            <div className="flex flex-1 flex-col items-center gap-1.5 py-2">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-neutral-100 text-ink-900 dark:bg-[#303030] dark:text-[#F5F5F5]">
                <Icon name="dashboard" size={18} />
              </span>
              <span className="grid h-10 w-10 place-items-center rounded-lg text-mute">
                <Icon name="route" size={18} />
              </span>
            </div>
            <div className="shrink-0 border-t border-line px-2 py-2.5">
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-lg text-mute">
                <Icon name="logout" size={18} />
              </span>
            </div>
          </aside>

          {/* Long applicant name & long university truncation */}
          <aside
            data-testid="sidebar-account-long"
            className="flex h-[340px] w-[264px] flex-col overflow-hidden rounded-xl border border-line bg-[rgb(var(--chrome))]"
          >
            <div className="flex h-14 shrink-0 items-center px-3">
              <span className="text-[13px] font-bold text-ink-900">Long applicant details</span>
            </div>
            <div className="shrink-0 border-b border-line px-3 pb-2.5 pt-0.5">
              <SidebarAccountTrigger session={LONG_NAME_SESSION} />
            </div>
            <div className="flex-1 p-3 text-xs text-mute">Tests long name &amp; university overflow</div>
          </aside>

          {/* Unauthenticated visitor + loading skeleton */}
          <div className="space-y-4">
            <aside
              data-testid="sidebar-account-guest"
              className="rounded-xl border border-line bg-[rgb(var(--chrome))] p-3"
            >
              <p className="mb-2 text-xs font-medium text-mute">Guest (no account trigger)</p>
              <SidebarAccountTrigger session={GUEST_SESSION} />
              <div className="mt-2 flex h-9 items-center gap-2 text-[13px] text-ink-700">
                <Icon name="logIn" size={16} className="text-mute" /> Applicant login
              </div>
            </aside>
            <aside
              data-testid="sidebar-account-loading"
              className="rounded-xl border border-line bg-[rgb(var(--chrome))] p-3"
            >
              <p className="mb-2 text-xs font-medium text-mute">Loading skeleton</p>
              <SidebarAccountTrigger session={LOADING_APPLICANT_SESSION} />
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
