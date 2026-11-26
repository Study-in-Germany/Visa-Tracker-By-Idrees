"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
import Accordion, { AccordionItem } from "@/components/ui/Accordion";
import Select, { Option } from "@/components/ui/Select";

interface DocumentItem {
  id: string;
  category: "academic" | "application" | "visa";
  title: string;
  type: "Mandatory" | "Recommended" | "Conditional";
  level?: "all" | "bachelor" | "master";
  description: string;
  attestationNote: string;
  preparationTip: string;
  sourceUrl?: string;
  sourceLabel?: string;
}

const DOCUMENTS_LIST: DocumentItem[] = [
  {
    id: "matric",
    category: "academic",
    title: "Matriculation (SSC) Certificate & Detailed Marksheet",
    type: "Mandatory",
    level: "all",
    description: "Original Secondary School Certificate (SSC) and marksheet issued by your Board of Intermediate and Secondary Education (BISE).",
    attestationNote: "Must be verified by your issuing BISE board first, then attested by IBCC (Inter Board Coordination Commission). Both front and back are verified.",
    preparationTip: "Obtain seal verification from your BISE board before booking an IBCC slot. Keep 3 verified photocopy sets.",
    sourceUrl: "https://www.ibcc.edu.pk",
    sourceLabel: "IBCC Verification Guidelines",
  },
  {
    id: "inter",
    category: "academic",
    title: "Intermediate (HSSC) Certificate & Marksheet",
    type: "Mandatory",
    level: "all",
    description: "Higher Secondary School Certificate (Pre-Engineering, Pre-Medical, ICS, or General) and marksheet.",
    attestationNote: "Requires BISE verification followed by IBCC attestation. Essential for verifying your university entrance qualification (HZB).",
    preparationTip: "Provisional certificates are accepted temporarily by some universities if the final diploma is pending, but IBCC attestation is mandatory for visa screening.",
    sourceUrl: "https://www.ibcc.edu.pk",
    sourceLabel: "IBCC Attestation Portal",
  },
  {
    id: "bachelor_degree",
    category: "academic",
    title: "Bachelor's Degree Certificate (4-Year / 16-Year Education)",
    type: "Mandatory",
    level: "master",
    description: "Official undergraduate degree issued by an HEC-recognized Pakistani university (verified as H+ on anabin).",
    attestationNote: "Must be attested by the Higher Education Commission (HEC) with an official QR verification ticket on both front and back.",
    preparationTip: "Check your university's listing on anabin.kmk.org. If your degree is a 2-year BA/BSc, a 2-year MA/MSc is required to meet the 16-year German master's prerequisite.",
    sourceUrl: "https://eservices.hec.gov.pk",
    sourceLabel: "HEC e-Services Portal",
  },
  {
    id: "bachelor_transcript",
    category: "academic",
    title: "Official University Transcripts (Semester-Wise Grade Sheets)",
    type: "Mandatory",
    level: "master",
    description: "Complete official academic transcript reflecting all semesters, credits earned, and institutional grading scale.",
    attestationNote: "Must be HEC attested alongside your degree certificate. Some German universities require transcripts sent directly in a sealed university envelope.",
    preparationTip: "Ensure the transcript clearly states total credit hours, maximum GPA, and the minimum passing grade (e.g. 50% or 60%).",
    sourceUrl: "https://eservices.hec.gov.pk",
    sourceLabel: "HEC Guidelines",
  },
  {
    id: "grading_scale",
    category: "academic",
    title: "University Grading Scale & Formula Sheet",
    type: "Conditional",
    level: "master",
    description: "Official documentation from your university detailing the grading formula, minimum passing threshold, and GPA conversion rules.",
    attestationNote: "Required when your transcript does not explicitly state the passing marks. Uni-Assist uses this to compute your German Bavarian formula grade.",
    preparationTip: "Request an official grading system explanation letter stamped by the Controller of Examinations.",
  },
  {
    id: "translations",
    category: "academic",
    title: "Certified English/German Translations",
    type: "Conditional",
    level: "all",
    description: "Official translations for any certificate or marksheet issued exclusively in Urdu or regional languages.",
    attestationNote: "Pakistani degrees and transcripts issued in English do not require translation. Urdu affidavits, birth certificates, or CNICs must be certified by an approved translator.",
    preparationTip: "Always retain notarized copies of both the original document and the certified translation.",
  },
  {
    id: "cv",
    category: "application",
    title: "Tabular Curriculum Vitae (Europass / Modern Clean Format)",
    type: "Mandatory",
    level: "all",
    description: "A chronological, gapless tabular resume highlighting academic history, projects, technical skills, and work experience.",
    attestationNote: "No attestation required. Must be signed and dated by the applicant.",
    preparationTip: "Account for every month and year since high school. German universities value concise tabular CVs without decorative graphics.",
    sourceUrl: "https://europa.eu/europass/en",
    sourceLabel: "Europass CV Builder",
  },
  {
    id: "sop",
    category: "application",
    title: "Letter of Motivation / Statement of Purpose (SOP)",
    type: "Mandatory",
    level: "all",
    description: "A 1- to 2-page essay detailing your academic background, research interests, reasons for choosing this specific program, and career goals.",
    attestationNote: "Must be entirely your original work. Generic AI templates lead to immediate rejection by German academic selection committees.",
    preparationTip: "Reference specific modules and laboratories from the university's Modulhandbuch (module catalogue). Avoid general praise of Germany.",
  },
  {
    id: "language_cert",
    category: "application",
    title: "Language Proficiency Certificate (IELTS / TOEFL / German CEFR)",
    type: "Mandatory",
    level: "all",
    description: "Standardized test score satisfying course specifications (typically IELTS 6.5+ for English-taught, or TestDaF/Goethe B2-C1 for German-taught).",
    attestationNote: "Official electronic score or verified certificate. Medium of Instruction (MOI) letters are rarely accepted for student visa screening.",
    preparationTip: "An official standardized certificate (such as IELTS Academic) avoids consular screening delays.",
    sourceUrl: "https://www.daad.de",
    sourceLabel: "DAAD Requirements",
  },
  {
    id: "lor",
    category: "application",
    title: "Academic Letters of Recommendation",
    type: "Recommended",
    level: "master",
    description: "One or two academic reference letters from university professors who evaluated your thesis or major project work.",
    attestationNote: "Must be printed on official university letterhead with the referee's official institutional email and signature.",
    preparationTip: "Ensure your referees use verified institutional email addresses (@university.edu.pk).",
  },
  {
    id: "passport",
    category: "visa",
    title: "Pakistani Passport (Minimum 12-18 Months Validity)",
    type: "Mandatory",
    level: "all",
    description: "Machine-readable international passport with at least two blank pages and adequate validity for the planned study period.",
    attestationNote: "Clear color copies of the biodata page and previous visa/stamp pages.",
    preparationTip: "Renew your passport if it expires within 18 months to avoid mismatched passport numbers during consular portal processing.",
    sourceUrl: "https://onlinemrp.dgip.gov.pk",
    sourceLabel: "Pakistani Passport Office",
  },
  {
    id: "admission_letter",
    category: "visa",
    title: "Admission Letter (Zulassungsbescheid) or Conditional Letter",
    type: "Mandatory",
    level: "all",
    description: "Official direct admission letter (Zulassungsbescheid) from a state-recognized German university or Studienkolleg invitation.",
    attestationNote: "Official PDF with digital verification code or university seal. Check the matriculation deadline and semester start date.",
    preparationTip: "If classes begin before your expected consular appointment, request an official Late Arrival Letter from the university.",
  },
  {
    id: "blocked_account_doc",
    category: "visa",
    title: "Blocked Account Confirmation (Sperrkonto-Bestätigung)",
    type: "Mandatory",
    level: "all",
    description: "Official confirmation proving deposit of the mandatory subsistence fund (€11,904/year or €992/month).",
    attestationNote: "Issued by an accredited German blocked account provider (such as Expatrio, Fintiba, Coracle, or Deutsche Bank).",
    preparationTip: "Ensure funds are fully credited and download the official 06-Bestätigung document prior to consular submission.",
    sourceUrl: "https://www.auswaertiges-amt.de",
    sourceLabel: "Auswärtiges Amt Financial Guide",
  },
  {
    id: "health_insurance",
    category: "visa",
    title: "Travel Health Insurance & German Statutory Pre-Enrollment",
    type: "Mandatory",
    level: "all",
    description: "Incoming travel health insurance (minimum €30,000 coverage) for the first 30-90 days, plus pre-enrollment notification from German statutory insurance (TK, Barmer, DAK).",
    attestationNote: "Must comply with Schengen visa requirements with COVID-19 and medical repatriation coverage.",
    preparationTip: "Many student blocked account packages bundle statutory insurance registration and incoming travel insurance together.",
  },
];

interface GuideStep {
  id: number;
  slug: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  icon: "file" | "school" | "building" | "shield" | "queue" | "external";
  readMins: number;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 1,
    slug: "documents",
    title: "Required Documents & Attestation",
    shortTitle: "Documents",
    subtitle: "Checklist, BISE, IBCC, HEC, and MOFA attestation hierarchy",
    icon: "file",
    readMins: 4,
  },
  {
    id: 2,
    slug: "uni-assist",
    title: "Uni-Assist & German Grade Conversion",
    shortTitle: "Uni-Assist",
    subtitle: "VPD evaluations, procedure steps, and fee calculator",
    icon: "school",
    readMins: 3,
  },
  {
    id: 3,
    slug: "university-applications",
    title: "University Applications & ECTS Checks",
    shortTitle: "Applications",
    subtitle: "Direct portals, intake deadlines, and credit requirements",
    icon: "building",
    readMins: 3,
  },
  {
    id: 4,
    slug: "financial-preparation",
    title: "Financial Preparation & Blocked Account",
    shortTitle: "Finance",
    subtitle: "§ 16b AufenthG, Sperrkonto deposit, and student budget",
    icon: "shield",
    readMins: 3,
  },
  {
    id: 5,
    slug: "visa-process",
    title: "Visa Process & CSP Screening",
    shortTitle: "Visa Process",
    subtitle: "Consular Services Portal, appointment waitlist, and interview",
    icon: "queue",
    readMins: 4,
  },
  {
    id: 6,
    slug: "official-resources",
    title: "Official Resources & Verified Portals",
    shortTitle: "Resources",
    subtitle: "Direct links to German embassies, DAAD, anabin, and ministries",
    icon: "external",
    readMins: 2,
  },
];

export default function AdmissionGuidePage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  // Uni-Assist fee calculator state
  const [appCount, setAppCount] = useState<number>(2);

  // Financial planning calculator state
  const [stayMonths, setStayMonths] = useState<number>(12);
  const [monthlyBlockedRate, setMonthlyBlockedRate] = useState<number>(992);
  const [monthlyInsuranceRate, setMonthlyInsuranceRate] = useState<number>(125);
  const [oneTimeOpeningFee] = useState<number>(89);
  const eurPkrRate = 305;

  // Load saved checklist from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vt.guide.checklist");
      if (saved) setCheckedIds(JSON.parse(saved));
    } catch {}
  }, []);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem("vt.guide.checklist", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const filteredDocs = useMemo(() => {
    return DOCUMENTS_LIST.filter((item) => {
      const catMatch = activeCategory === "all" || item.category === activeCategory;
      const levelMatch = levelFilter === "all" || item.level === "all" || item.level === levelFilter;
      return catMatch && levelMatch;
    });
  }, [activeCategory, levelFilter]);

  const completedCount = useMemo(() => {
    return Object.values(checkedIds).filter(Boolean).length;
  }, [checkedIds]);

  const checklistPercent = Math.round((completedCount / DOCUMENTS_LIST.length) * 100);

  // Fee calculation
  const uniAssistFee = useMemo(() => {
    if (appCount <= 0) return 0;
    return 75 + Math.max(0, appCount - 1) * 30;
  }, [appCount]);

  // Budget calculation
  const totalBlocked = useMemo(() => stayMonths * monthlyBlockedRate, [stayMonths, monthlyBlockedRate]);
  const totalInsurance = useMemo(() => stayMonths * monthlyInsuranceRate, [stayMonths, monthlyInsuranceRate]);
  const totalFinancialBudget = useMemo(
    () => totalBlocked + totalInsurance + oneTimeOpeningFee,
    [totalBlocked, totalInsurance, oneTimeOpeningFee]
  );

  const levelOptions: Option[] = [
    { value: "all", label: "All Degree Levels" },
    { value: "bachelor", label: "Bachelor's Only" },
    { value: "master", label: "Master's Only" },
  ];

  const currentStepObj = GUIDE_STEPS.find((s) => s.id === currentStep) || GUIDE_STEPS[0];

  const handleNextStep = () => {
    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSelectStep = (stepId: number) => {
    setCurrentStep(stepId);
    setMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="max-w-7xl mx-auto pb-32 lg:pb-12">
      {/* Top Header */}
      <div className="mb-4">
        <PageHeader
          title="Study in Germany Admission & Visa Guide"
          description="Authoritative, step-by-step documentation for Pakistani students: academic credentials, board attestations, Uni-Assist VPD, blocked accounts, and Consular Services Portal screening."
          actions={
            <div className="flex items-center gap-2 text-xs text-mute bg-paper-raised border border-line px-3 py-1.5 rounded-full">
              <Icon name="checkCircle" size={14} className="text-emerald-600" />
              <span>Verified: November 2026 • DAAD & Auswärtiges Amt</span>
            </div>
          }
        />
      </div>

      {/* ── Mobile Step Selector Bar (Visible only on < lg) ── */}
      <div className="lg:hidden sticky top-14 z-20 bg-paper/95 backdrop-blur border-y border-line py-2.5 px-4 -mx-4 mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="flex items-center gap-2.5 min-h-[44px] px-3 rounded-xl bg-paper-raised border border-line text-xs font-semibold text-ink-900 shadow-sm active:bg-paper-sunk cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-[11px]">
            {currentStep}
          </div>
          <span className="truncate max-w-[200px]">
            Step {currentStep} of 6 · {currentStepObj.shortTitle}
          </span>
          <Icon name="chevronDown" size={14} className="text-mute" />
        </button>

        <div className="text-right">
          <span className="text-[11px] text-mute font-medium block">Checklist</span>
          <span className="text-xs font-bold text-ink-900">{completedCount}/14 done</span>
        </div>
      </div>

      {/* ── Mobile Bottom Sheet Drawer for Steps ── */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Sheet */}
          <div className="relative bg-paper-raised border-t border-line rounded-t-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="w-12 h-1.5 bg-line-strong rounded-full mx-auto" />
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-sm font-bold text-ink-900">Guide Roadmap</h3>
                <p className="text-xs text-mute">Jump to any stage of your preparation</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-2 text-mute hover:text-ink-900 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Close step navigation"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {GUIDE_STEPS.map((s) => {
                const isActive = s.id === currentStep;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectStep(s.id)}
                    className={`w-full min-h-[52px] p-3 rounded-xl border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                      isActive
                        ? "bg-blue-50/70 dark:bg-clay-950/30 border-clay-300 dark:border-clay-800"
                        : "bg-card border-line hover:bg-paper-sunk"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        isActive
                          ? "bg-blue-500 text-white"
                          : "bg-paper-sunk text-ink-700"
                      }`}
                    >
                      {s.id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-semibold block truncate ${isActive ? "text-blue-600 dark:text-blue-500" : "text-ink-900"}`}>
                        {s.title}
                      </span>
                      <span className="text-[11px] text-mute truncate block">
                        {s.subtitle}
                      </span>
                    </div>
                    <Icon name="chevronRight" size={14} className="text-mute flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop Layout: Spacious Center Content + Full-Height Sticky Right Navigation ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* CENTER CONTENT COLUMN (Spacious, Clean, Focused) */}
        <main className="lg:col-span-8 space-y-6 min-w-0">
          {/* Step Progress Header */}
          <div className="card p-5 bg-paper-raised border-line space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-500 uppercase tracking-wider">
                Step {currentStep} of 6
              </span>
              <div className="flex items-center gap-3 text-xs text-mute">
                <span className="flex items-center gap-1">
                  <Icon name="clock" size={13} />
                  <span>~{currentStepObj.readMins} min read</span>
                </span>
                <span>•</span>
                <span className="text-ink-900 font-medium">
                  {checklistPercent}% checklist completed
                </span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-ink-900 tracking-tight">
              {currentStepObj.title}
            </h1>
            <p className="text-xs sm:text-sm text-mute leading-relaxed">
              {currentStepObj.subtitle}
            </p>

            {/* Step indicators progress bar */}
            <div className="w-full bg-paper-sunk h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${(currentStep / 6) * 100}%` }}
              />
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* STEP 1: REQUIRED DOCUMENTS */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Document Checklist Accordion Box */}
              <div className="card p-5 bg-card border-line space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-ink-900">
                      Interactive Document Preparation Checklist
                    </h2>
                    <p className="text-xs text-mute mt-0.5">
                      {completedCount} of {DOCUMENTS_LIST.length} completed • Saves automatically
                    </p>
                  </div>

                  <div className="w-48">
                    <Select
                      value={levelFilter}
                      onChange={setLevelFilter}
                      options={levelOptions}
                      label="Degree Level"
                      variant="pill"
                    />
                  </div>
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-paper-raised rounded-lg border border-line">
                  {[
                    { id: "all", label: "All Items" },
                    { id: "academic", label: "Academic" },
                    { id: "application", label: "Application" },
                    { id: "visa", label: "Visa Requirements" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveCategory(c.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        activeCategory === c.id
                          ? "bg-ink-800 text-paper-raised dark:bg-ink-100 dark:text-ink-900 font-semibold shadow-xs"
                          : "text-mute hover:text-ink-900 hover:bg-paper-sunk"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Document Rows */}
                <div className="space-y-3 pt-1">
                  {filteredDocs.map((doc) => {
                    const isChecked = !!checkedIds[doc.id];
                    return (
                      <div
                        key={doc.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isChecked
                            ? "bg-paper-raised/80 border-emerald-300 dark:border-emerald-800/60"
                            : "bg-paper-raised border-line hover:border-line-strong"
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <button
                            type="button"
                            onClick={() => toggleCheck(doc.id)}
                            className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center border transition-colors flex-shrink-0 cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[24px] sm:min-w-[24px] ${
                              isChecked
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "border-line-strong bg-paper hover:border-ink-600"
                            }`}
                            aria-label={`Toggle ${doc.title}`}
                          >
                            {isChecked && <Icon name="check" size={14} strokeWidth={3} />}
                          </button>

                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3
                                onClick={() => toggleCheck(doc.id)}
                                className={`text-xs sm:text-sm font-semibold cursor-pointer ${
                                  isChecked ? "line-through text-mute" : "text-ink-900"
                                }`}
                              >
                                {doc.title}
                              </h3>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                  doc.type === "Mandatory"
                                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800"
                                    : doc.type === "Recommended"
                                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800"
                                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800"
                                }`}
                              >
                                {doc.type}
                              </span>
                            </div>

                            <p className="text-xs text-mute leading-relaxed">
                              {doc.description}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-1">
                              <div className="p-2.5 bg-paper rounded-lg border border-line space-y-1">
                                <span className="font-semibold text-ink-900 flex items-center gap-1.5 text-[11px]">
                                  <Icon name="shield" size={13} className="text-blue-500" />
                                  Attestation Requirement
                                </span>
                                <p className="text-mute text-[11px] leading-relaxed">
                                  {doc.attestationNote}
                                </p>
                              </div>
                              <div className="p-2.5 bg-paper rounded-lg border border-line space-y-1">
                                <span className="font-semibold text-ink-900 flex items-center gap-1.5 text-[11px]">
                                  <Icon name="info" size={13} className="text-emerald-600" />
                                  Preparation Tip
                                </span>
                                <p className="text-mute text-[11px] leading-relaxed">
                                  {doc.preparationTip}
                                </p>
                              </div>
                            </div>

                            {doc.sourceUrl && (
                              <div className="pt-1">
                                <a
                                  href={doc.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-500 hover:underline"
                                >
                                  <span>{doc.sourceLabel || "Official Portal"}</span>
                                  <Icon name="external" size={12} />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Attestation Hierarchy Flow */}
              <div className="card p-5 bg-paper-raised border-line space-y-3">
                <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                  <Icon name="shield" size={16} className="text-blue-500" />
                  <span>Sequential Attestation Hierarchy (BISE → IBCC → HEC → MOFA)</span>
                </h3>
                <p className="text-xs text-mute leading-relaxed">
                  Pakistani educational qualifications must follow this strict sequence. German institutions and the Consular Services Portal will reject documents if an intermediate authority was bypassed.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="p-4 rounded-xl border border-line bg-paper space-y-2">
                    <span className="font-semibold text-xs text-ink-900 block">
                      1. School Level (Matric & Intermediate)
                    </span>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-mute leading-relaxed">
                      <li>Submit original certificates to your issuing BISE board for verification.</li>
                      <li>Take the BISE sealed envelope or verified stamp to IBCC for QR code attestation.</li>
                      <li>Ensure both certificate diploma and marksheet carry the IBCC ticket.</li>
                    </ol>
                  </div>
                  <div className="p-4 rounded-xl border border-line bg-paper space-y-2">
                    <span className="font-semibold text-xs text-ink-900 block">
                      2. Higher Education (Degrees & Transcripts)
                    </span>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-mute leading-relaxed">
                      <li>Register on the HEC e-Services portal and upload degree and complete transcripts.</li>
                      <li>Complete initial scrutiny and schedule an in-person or courier slot.</li>
                      <li>HEC affixes official QR ticket stamps verifying institutional recognition.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* STEP 2: UNI-ASSIST & GRADE CONVERSION */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Highlight Banner to German Grade Converter */}
              <div className="card p-5 bg-blue-50/70 dark:bg-clay-950/20 border-clay-200 dark:border-clay-800 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <span className="font-semibold text-ink-900 text-sm block">
                    Need Your Official German Grade (Bavarian Formula)?
                  </span>
                  <p className="text-xs text-mute leading-relaxed">
                    Uni-Assist converts Pakistani CGPA and percentages into German grades using the Modified Bavarian Formula. Use our verified tool to test your GPA before paying application fees.
                  </p>
                </div>
                <Link
                  href="/tools/german-grade-converter"
                  className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2.5 min-h-[44px]"
                >
                  <Icon name="calculator" size={14} />
                  <span>Open German Grade Converter</span>
                </Link>
              </div>

              {/* What is Uni-Assist & VPD */}
              <div className="card p-5 bg-card border-line space-y-4">
                <h3 className="text-sm font-bold text-ink-900">
                  Uni-Assist Procedure & Preliminary Evaluation (VPD)
                </h3>
                <p className="text-xs text-mute leading-relaxed">
                  <strong>Uni-Assist e.V.</strong> is the central evaluation service for over 180 German universities. It assesses whether your Pakistani educational certificates satisfy German higher education entrance requirements.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-line bg-paper-raised space-y-1.5">
                    <span className="font-semibold text-xs text-ink-900 block">
                      Vorprüfungsdokumentation (VPD)
                    </span>
                    <p className="text-xs text-mute leading-relaxed">
                      Uni-Assist evaluates your credentials and issues a digital VPD certificate containing your converted German GPA. You then upload this VPD PDF directly into your university portal (e.g. TUMonline, RWTH).
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-line bg-paper-raised space-y-1.5">
                    <span className="font-semibold text-xs text-ink-900 block">
                      Direct Application Forwarding
                    </span>
                    <p className="text-xs text-mute leading-relaxed">
                      Certain universities have Uni-Assist forward your complete application file directly to their academic admissions committee without requiring a secondary portal submission.
                    </p>
                  </div>
                </div>
              </div>

              {/* Uni-Assist Fee Calculator */}
              <div className="card p-5 bg-paper-raised border-line space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                    <Icon name="calculator" size={16} className="text-blue-500" />
                    <span>Uni-Assist Application Fee Calculator</span>
                  </h3>
                  <span className="text-xs text-mute">Published rates: €75 first, €30 additional</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3 text-xs text-ink-800">
                    <p className="text-mute leading-relaxed">
                      Uni-Assist fees apply per semester. Processing takes <strong>4 to 6 weeks</strong> after full payment. Select your planned number of course submissions:
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between font-semibold text-ink-900">
                        <span>Number of course applications:</span>
                        <span className="w-8 text-center bg-paper border border-line rounded py-0.5">
                          {appCount}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={8}
                        value={appCount}
                        onChange={(e) => setAppCount(parseInt(e.target.value) || 1)}
                        className="w-full accent-ink-800 cursor-pointer h-2"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-line bg-card space-y-2.5 text-xs">
                    <div className="flex justify-between text-mute">
                      <span>First selected program:</span>
                      <strong className="text-ink-900">€75</strong>
                    </div>
                    {appCount > 1 && (
                      <div className="flex justify-between text-mute">
                        <span>Additional {appCount - 1} course(s) × €30:</span>
                        <strong className="text-ink-900">€{(appCount - 1) * 30}</strong>
                      </div>
                    )}
                    <div className="pt-2 border-t border-line flex justify-between items-baseline">
                      <span className="font-semibold text-ink-900 text-sm">Estimated Total:</span>
                      <div className="text-right">
                        <span className="text-xl font-bold text-ink-900">€{uniAssistFee}</span>
                        <span className="block text-[11px] text-mute">
                          ≈ PKR {(uniAssistFee * eurPkrRate).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <a
                      href="https://www.uni-assist.de/en/how-to-apply/pay-fees/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary w-full text-xs flex items-center justify-center gap-1.5 py-2 mt-1 min-h-[44px]"
                    >
                      <span>Pay Fees on Official Uni-Assist Portal</span>
                      <Icon name="external" size={13} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* STEP 3: UNIVERSITY APPLICATIONS & ECTS */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Highlight Banner to ECTS Calculator */}
              <div className="card p-5 bg-blue-50/70 dark:bg-clay-950/20 border-clay-200 dark:border-clay-800 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <span className="font-semibold text-ink-900 text-sm block">
                    Will Your Pakistani Credits Satisfy ECTS Requirements?
                  </span>
                  <p className="text-xs text-mute leading-relaxed">
                    German master’s programs require consecutive prerequisite credits (e.g. 18 ECTS Mathematics, 24 ECTS CS). Use our ECTS calculator to compare your transcript against target program bylaws.
                  </p>
                </div>
                <Link
                  href="/tools/ects-calculator"
                  className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2.5 min-h-[44px]"
                >
                  <Icon name="chart" size={14} />
                  <span>Open ECTS Credit Calculator</span>
                </Link>
              </div>

              {/* Direct University Portals & Deadlines */}
              <div className="card p-5 bg-card border-line space-y-4">
                <h3 className="text-sm font-bold text-ink-900">
                  Direct Institutional Portals & Application Cycles
                </h3>
                <p className="text-xs text-mute leading-relaxed">
                  Leading technical universities (TU9 consortium such as TUM, RWTH Aachen, TU Berlin, TU Dresden) often utilize bespoke application portals (e.g., TUMonline). Always review the program&apos;s specific <em>Fachprüfungsordnung</em>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                  <div className="p-4 rounded-xl border border-line bg-paper-raised space-y-1.5">
                    <span className="font-semibold text-xs text-ink-900 block">
                      1. Winter Semester (October)
                    </span>
                    <p className="text-xs text-mute leading-relaxed">
                      Main intake for most master’s programs. Application portal opens typically <strong>May 1 to July 15</strong> (certain courses close earlier on May 31).
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-line bg-paper-raised space-y-1.5">
                    <span className="font-semibold text-xs text-ink-900 block">
                      2. Summer Semester (April)
                    </span>
                    <p className="text-xs text-mute leading-relaxed">
                      Secondary intake. Application window runs <strong>December 1 to January 15</strong>. Fewer English-taught degrees commence in summer.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-line bg-paper-raised space-y-1.5">
                    <span className="font-semibold text-xs text-ink-900 block">
                      3. Aptitude Assessments
                    </span>
                    <p className="text-xs text-mute leading-relaxed">
                      Programs with <em>Eignungsverfahren</em> score candidate bachelor grades, syllabus matches, and motivation. Shortlisted applicants may receive online interview invitations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* STEP 4: FINANCIAL PREPARATION & BLOCKED ACCOUNT */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Blocked Account Explanation */}
              <div className="card p-5 bg-card border-line space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <h3 className="text-sm font-bold text-ink-900">
                    Mandatory Blocked Bank Account (Sperrkonto § 16b AufenthG)
                  </h3>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                    €11,904 / Year (€992 / Month)
                  </span>
                </div>
                <p className="text-xs text-mute leading-relaxed">
                  German immigration law requires proof of adequate living funds prior to visa issuance. The standard mechanism is a German blocked account with a licensed provider (e.g. Expatrio, Coracle, Fintiba).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="p-4 rounded-xl border border-line bg-paper-raised space-y-1.5">
                    <span className="font-semibold text-xs text-ink-900 block">
                      How Sperrkonto Operates
                    </span>
                    <p className="text-xs text-mute leading-relaxed">
                      The full sum is deposited in advance. Upon arriving in Germany and registering your city residence (Anmeldung), the account unlocks to disburse a maximum of €992 per month to your local checking account.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-line bg-paper-raised space-y-1.5">
                    <span className="font-semibold text-xs text-ink-900 block">
                      Official Exemptions
                    </span>
                    <p className="text-xs text-mute leading-relaxed">
                      A Formal Obligation Letter (<em>Verpflichtungserklärung</em> under §§ 66-68) signed by a German resident sponsor at their local Ausländerbehörde, or an official DAAD/HEC scholarship of equivalent value.
                    </p>
                  </div>
                </div>
              </div>

              {/* Student Budget Calculator */}
              <div className="card p-5 bg-paper-raised border-line space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                    <Icon name="calculator" size={16} className="text-blue-500" />
                    <span>Student Budget & Financial Planning Workspace</span>
                  </h3>
                  <span className="text-xs text-mute">1 EUR ≈ {eurPkrRate} PKR</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  <div className="space-y-4 text-xs text-ink-800">
                    <div>
                      <div className="flex justify-between font-semibold text-ink-900 mb-1">
                        <span>Intended stay duration:</span>
                        <span className="w-20 text-center bg-paper border border-line rounded py-0.5">
                          {stayMonths} months
                        </span>
                      </div>
                      <input
                        type="range"
                        min={6}
                        max={24}
                        value={stayMonths}
                        onChange={(e) => setStayMonths(parseInt(e.target.value) || 12)}
                        className="w-full accent-ink-800 cursor-pointer h-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-mute mb-1 font-medium">Monthly Blocked (€):</label>
                        <input
                          type="number"
                          value={monthlyBlockedRate}
                          onChange={(e) => setMonthlyBlockedRate(Math.max(100, parseInt(e.target.value) || 992))}
                          className="input text-xs w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-mute mb-1 font-medium">Monthly Health Ins (€):</label>
                        <input
                          type="number"
                          value={monthlyInsuranceRate}
                          onChange={(e) => setMonthlyInsuranceRate(Math.max(0, parseInt(e.target.value) || 125))}
                          className="input text-xs w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-line bg-card space-y-2 text-xs">
                    <div className="flex justify-between text-mute">
                      <span>Blocked Deposit ({stayMonths} mo):</span>
                      <strong className="text-ink-900">€{totalBlocked.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between text-mute">
                      <span>Statutory Health Ins ({stayMonths} mo):</span>
                      <strong className="text-ink-900">€{totalInsurance.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between text-mute">
                      <span>Account Setup Buffer:</span>
                      <strong className="text-ink-900">€{oneTimeOpeningFee}</strong>
                    </div>
                    <div className="pt-2 border-t border-line flex justify-between items-baseline">
                      <span className="font-semibold text-ink-900 text-sm">Estimated Total Funds:</span>
                      <div className="text-right">
                        <span className="text-xl font-bold text-ink-900">€{totalFinancialBudget.toLocaleString()}</span>
                        <span className="block text-[11px] text-mute">
                          ≈ PKR {(totalFinancialBudget * eurPkrRate).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* STEP 5: VISA PROCESS & CSP SCREENING */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {currentStep === 5 && (
            <div className="space-y-6">
              {/* CSP Roadmap */}
              <div className="card p-5 bg-card border-line space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <h3 className="text-sm font-bold text-ink-900">
                    Consular Services Portal (CSP) Digital Workflow
                  </h3>
                  <span className="text-xs text-mute">Official process for Islamabad & Karachi</span>
                </div>
                <p className="text-xs text-mute leading-relaxed">
                  Pakistani student visa applicants must register and submit preliminary credentials through the official <strong>Consular Services Portal</strong> (<em>consular-services-portal.diplo.de</em>).
                </p>

                {/* 6 Stage Vertical Progression */}
                <div className="space-y-3 pt-1">
                  {[
                    {
                      step: "1",
                      title: "Digital Registration & Upload",
                      desc: "Fill in the online VIDEX application and upload clean color scans of your university admission letter, HEC/IBCC attested certificates, IELTS certificate, and passport biodata page.",
                    },
                    {
                      step: "2",
                      title: "Consular Pre-Screening",
                      desc: "Consular officers review document completeness and university recognition on anabin. This takes several weeks depending on seasonal volume.",
                    },
                    {
                      step: "3",
                      title: "Correction Requests (Rückmeldung)",
                      desc: "If any upload is unclear, you will receive a formal notification with a strict 7- to 14-day re-upload deadline. Monitor your inbox regularly.",
                    },
                    {
                      step: "4",
                      title: "Biometric Appointment Invitation",
                      desc: "Once pre-screening completes successfully, you will receive an official invitation email to select your in-person embassy slot.",
                    },
                    {
                      step: "5",
                      title: "In-Person Consular Interview",
                      desc: "Attend your interview with original documents, attestations, two hard copies of application dossier, biometric photos, and visa fee in PKR.",
                    },
                    {
                      step: "6",
                      title: "Decision & Visa Stamping",
                      desc: "Following clearance from the German immigration authorities (Ausländerbehörde), submit your passport alongside travel insurance for visa stamping.",
                    },
                  ].map((s) => (
                    <div key={s.step} className="p-3.5 rounded-xl border border-line bg-paper-raised flex gap-3.5 items-start">
                      <div className="w-7 h-7 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                        {s.step}
                      </div>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <span className="font-semibold text-xs sm:text-sm text-ink-900 block">
                          {s.title}
                        </span>
                        <p className="text-xs text-mute leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Embassy Jurisdictions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="card p-4 bg-paper-raised border-line space-y-1">
                  <span className="font-semibold text-xs text-ink-900 block">
                    Islamabad Embassy Jurisdiction
                  </span>
                  <p className="text-xs text-mute leading-relaxed">
                    Islamabad Capital Territory, Punjab, Khyber Pakhtunkhwa, Azad Jammu & Kashmir, and Gilgit-Baltistan.
                  </p>
                </div>
                <div className="card p-4 bg-paper-raised border-line space-y-1">
                  <span className="font-semibold text-xs text-ink-900 block">
                    Karachi Consulate Jurisdiction
                  </span>
                  <p className="text-xs text-mute leading-relaxed">
                    Sindh and Balochistan. Domicile records determine your jurisdiction.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* STEP 6: OFFICIAL RESOURCES & VERIFIED PORTALS */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="card p-5 bg-card border-line space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <h3 className="text-sm font-bold text-ink-900">
                    Official Portals & Verification Directory
                  </h3>
                  <span className="text-xs text-mute">Primary regulatory sources</span>
                </div>
                <p className="text-xs text-mute leading-relaxed">
                  Always confirm guidelines directly with official federal bodies. The links below lead to primary authorized portals:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {[
                    {
                      name: "German Missions in Pakistan",
                      url: "https://pakistan.diplo.de/pk-en/service/05-VisaEinreise/-/2173168",
                      desc: "Official visa criteria, jurisdiction notices, and consular updates from Islamabad and Karachi.",
                    },
                    {
                      name: "Consular Services Portal (CSP)",
                      url: "https://consular-services-portal.diplo.de",
                      desc: "Official German Federal Foreign Office digital portal for national visa applications.",
                    },
                    {
                      name: "DAAD International Programmes",
                      url: "https://www.daad.de/en/study-and-research-in-germany/courses-of-study-in-germany/all-study-programmes-in-germany/",
                      desc: "Search database of over 2,000 accredited degree programs taught in English and German.",
                    },
                    {
                      name: "Uni-Assist e.V. Portal",
                      url: "https://www.uni-assist.de",
                      desc: "Central admissions service and preliminary evaluation certificate (VPD) application portal.",
                    },
                    {
                      name: "anabin Database (KMK)",
                      url: "https://anabin.kmk.org",
                      desc: "Central Office for Foreign Education database verifying foreign university H+ institutional status.",
                    },
                    {
                      name: "HEC e-Services Attestation",
                      url: "https://eservices.hec.gov.pk",
                      desc: "Higher Education Commission online portal for Pakistani bachelor's and master's degree attestation.",
                    },
                    {
                      name: "IBCC Attestation Portal",
                      url: "https://www.ibcc.edu.pk",
                      desc: "Inter Board Coordination Commission portal for Matric and Intermediate marksheets attestation.",
                    },
                    {
                      name: "Make it in Germany",
                      url: "https://www.make-it-in-germany.com",
                      desc: "Federal government portal for international students, graduates, and qualified professionals.",
                    },
                  ].map((res) => (
                    <a
                      key={res.name}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 rounded-xl border border-line bg-paper-raised hover:border-line-strong transition-all flex flex-col justify-between group min-h-[90px]"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-ink-900 group-hover:text-blue-500 transition-colors">
                            {res.name}
                          </span>
                          <Icon name="external" size={13} className="text-mute group-hover:text-blue-500 transition-colors" />
                        </div>
                        <p className="text-[11px] text-mute leading-relaxed">{res.desc}</p>
                      </div>
                      <span className="text-[10px] text-mute/80 mt-2 block truncate">
                        {res.url}
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Platform Notice */}
              <div className="card p-4 bg-paper-raised border-line text-xs text-mute leading-relaxed space-y-1">
                <strong className="text-ink-900 block font-semibold">Independent Platform Notice:</strong>
                <p>
                  Visa Tracker is an independent community project. Regulations, fees, and requirements are subject to official revision by the German Federal Foreign Office, DAAD, and Pakistani authorities. Always verify current details on official portals.
                </p>
              </div>
            </div>
          )}

          {/* ── Desktop In-Content Pagination Controls ── */}
          <div className="hidden lg:flex items-center justify-between border-t border-line pt-6">
            <button
              type="button"
              onClick={handlePrevStep}
              disabled={currentStep === 1}
              className={`btn-secondary text-xs flex items-center gap-1.5 px-4 py-2 min-h-[44px] ${
                currentStep === 1 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <Icon name="arrowLeft" size={14} />
              <span>Previous Step</span>
            </button>

            <span className="text-xs text-mute font-medium">
              Step {currentStep} of 6 · {currentStepObj.shortTitle}
            </span>

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="btn-primary text-xs flex items-center gap-1.5 px-5 py-2 min-h-[44px] cursor-pointer"
              >
                <span>Continue to Step {currentStep + 1}</span>
                <Icon name="arrowRight" size={14} />
              </button>
            ) : (
              <Link
                href="/tools/german-grade-converter"
                className="btn-primary text-xs flex items-center gap-1.5 px-5 py-2 min-h-[44px]"
              >
                <span>Calculate Your German GPA</span>
                <Icon name="arrowRight" size={14} />
              </Link>
            )}
          </div>
        </main>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* DESKTOP FULL-HEIGHT STICKY RIGHT NAVIGATION PANEL                     */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <aside className="hidden lg:flex lg:col-span-4 sticky top-20 flex-col h-[calc(100vh-5.5rem)] overflow-y-auto space-y-4 pl-2">
          {/* Navigation Card */}
          <div className="card p-4 bg-paper-raised border-line space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <span className="text-xs font-bold text-ink-900 uppercase tracking-wider">
                Guide Navigation
              </span>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-500">
                Step {currentStep} / 6
              </span>
            </div>

            <nav className="space-y-1.5" aria-label="Admission guide steps">
              {GUIDE_STEPS.map((s) => {
                const isActive = s.id === currentStep;
                const isPast = s.id < currentStep;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectStep(s.id)}
                    className={`w-full p-2.5 rounded-xl text-left flex items-start gap-3 transition-all cursor-pointer ${
                      isActive
                        ? "bg-card border border-clay-300 dark:border-clay-800 shadow-xs"
                        : "hover:bg-paper-sunk border border-transparent"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5 ${
                        isActive
                          ? "bg-blue-500 text-white"
                          : isPast
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-paper-sunk text-mute"
                      }`}
                    >
                      {isPast ? <Icon name="check" size={12} strokeWidth={2.5} /> : s.id}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-xs font-semibold block leading-tight ${
                          isActive ? "text-blue-600 dark:text-blue-500" : "text-ink-900"
                        }`}
                      >
                        {s.title}
                      </span>
                      <span className="text-[11px] text-mute truncate block mt-0.5">
                        ~{s.readMins} min read
                      </span>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Checklist Completion Widget */}
            <div className="pt-3 border-t border-line space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-mute font-medium">Document checklist:</span>
                <strong className="text-ink-900">{completedCount} / {DOCUMENTS_LIST.length} ({checklistPercent}%)</strong>
              </div>
              <div className="w-full bg-paper-sunk h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all duration-300"
                  style={{ width: `${checklistPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Academic Tools Direct Links */}
          <div className="card p-4 bg-paper-raised border-line space-y-2.5">
            <span className="text-[11px] font-bold text-ink-900 uppercase tracking-wider block">
              Official Academic Calculators
            </span>
            <div className="space-y-1.5">
              <Link
                href="/tools/german-grade-converter"
                className="p-2.5 rounded-lg border border-line bg-card hover:bg-paper-sunk transition-colors flex items-center justify-between text-xs group"
              >
                <div className="flex items-center gap-2">
                  <Icon name="calculator" size={14} className="text-blue-500" />
                  <span className="font-semibold text-ink-900 group-hover:text-blue-600 transition-colors">
                    German Grade Converter
                  </span>
                </div>
                <Icon name="chevronRight" size={13} className="text-mute" />
              </Link>
              <Link
                href="/tools/ects-calculator"
                className="p-2.5 rounded-lg border border-line bg-card hover:bg-paper-sunk transition-colors flex items-center justify-between text-xs group"
              >
                <div className="flex items-center gap-2">
                  <Icon name="chart" size={14} className="text-blue-500" />
                  <span className="font-semibold text-ink-900 group-hover:text-blue-600 transition-colors">
                    ECTS Credit Calculator
                  </span>
                </div>
                <Icon name="chevronRight" size={13} className="text-mute" />
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Fixed Mobile Bottom Action Bar (Highest Mobile Priority) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-paper/95 backdrop-blur-md border-t border-line px-4 py-3 pb-safe shadow-lg flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handlePrevStep}
          disabled={currentStep === 1}
          className={`min-h-[48px] px-4 rounded-xl border border-line text-xs font-semibold flex items-center gap-1.5 bg-paper-raised ${
            currentStep === 1 ? "opacity-40 cursor-not-allowed text-mute" : "text-ink-900 active:bg-paper-sunk cursor-pointer"
          }`}
        >
          <Icon name="arrowLeft" size={14} />
          <span>Previous</span>
        </button>

        <span className="text-xs font-semibold text-mute">
          {currentStep} / 6
        </span>

        {currentStep < 6 ? (
          <button
            type="button"
            onClick={handleNextStep}
            className="min-h-[48px] px-5 rounded-xl bg-ink-900 text-paper-raised dark:bg-ink-100 dark:text-ink-900 text-xs font-bold flex items-center gap-1.5 shadow-sm active:opacity-90 cursor-pointer"
          >
            <span>Next: {GUIDE_STEPS[currentStep]?.shortTitle}</span>
            <Icon name="arrowRight" size={14} />
          </button>
        ) : (
          <Link
            href="/tools/german-grade-converter"
            className="min-h-[48px] px-5 rounded-xl bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:opacity-90"
          >
            <span>Grade Converter</span>
            <Icon name="arrowRight" size={14} />
          </Link>
        )}
      </div>
    </div>
  );
}
