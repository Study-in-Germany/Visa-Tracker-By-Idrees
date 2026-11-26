"use client";

import { useState, useMemo } from "react";
import Icon from "@/components/ui/Icon";
import { useSetPageTitle } from "@/components/PageTitle";
import Select, { Option } from "@/components/ui/Select";
import Accordion, { AccordionItem } from "@/components/ui/Accordion";
import {
  calculateEctsByAnnualLoad,
  calculateEctsByWorkload,
  calculateEctsByInstitutionFactor,
  analyzeSubjectBreakdown,
  CourseCategory,
  CourseEntry,
  TargetRequirement,
  SUBJECT_CATEGORIES,
} from "@/lib/academic-calculators";

const CATEGORY_OPTIONS: Option[] = SUBJECT_CATEGORIES.map((c) => ({
  value: c,
  label: c,
}));

export default function EctsCalculatorPage() {
  useSetPageTitle("ECTS calculator");
  const [activeTab, setActiveTab] = useState<"total" | "subjects">("total");
  const [method, setMethod] = useState<"annual" | "workload" | "factor">("annual");

  // Method 1: Academic Years
  const [totalCredits, setTotalCredits] = useState<string>("130");
  const [degreeYears, setDegreeYears] = useState<string>("4");
  const [customAnnualLoad, setCustomAnnualLoad] = useState<string>("");

  // Method 2: Total Workload Hours
  const [workloadHours, setWorkloadHours] = useState<string>("750");

  // Method 3: University Factor
  const [factorCredits, setFactorCredits] = useState<string>("120");
  const [customFactor, setCustomFactor] = useState<string>("1.5");
  const [uniName, setUniName] = useState<string>("TUM CIT");
  const [uniDept, setUniDept] = useState<string>("Informatics");
  const [sourceUrl, setSourceUrl] = useState<string>("");

  // Subject-Wise Analysis: starts with 1 clean sample course row
  const [courses, setCourses] = useState<CourseEntry[]>([
    {
      id: "c_init_1",
      name: "Calculus & Analytical Geometry",
      creditHours: 3,
      semester: 1,
      category: "Mathematics",
    },
  ]);

  // Form inputs for adding course
  const [newCourseName, setNewCourseName] = useState<string>("");
  const [newCourseCredits, setNewCourseCredits] = useState<string>("3");
  const [newCourseCategory, setNewCourseCategory] = useState<CourseCategory>("Computer Science");

  // Target program requirements
  const [requirements, setRequirements] = useState<TargetRequirement[]>([
    { category: "Mathematics", requiredEcts: 18 },
    { category: "Theoretical Computer Science", requiredEcts: 12 },
  ]);

  // Active conversion factor
  const activeConversionFactor = useMemo(() => {
    if (method === "annual") {
      const tot = parseFloat(totalCredits) || 130;
      const yrs = parseFloat(degreeYears) || 4;
      const annual = customAnnualLoad ? parseFloat(customAnnualLoad) || (tot / yrs) : (tot / yrs);
      return annual > 0 ? 60 / annual : 1.8462;
    } else if (method === "factor") {
      return parseFloat(customFactor) || 1.5;
    } else {
      return 1.8462;
    }
  }, [method, totalCredits, degreeYears, customAnnualLoad, customFactor]);

  // Calculations
  const annualResult = useMemo(() => {
    return calculateEctsByAnnualLoad({
      totalLocalCredits: parseFloat(totalCredits) || 0,
      academicYears: parseFloat(degreeYears) || 0,
      documentedAnnualCredits: customAnnualLoad ? parseFloat(customAnnualLoad) : undefined,
    });
  }, [totalCredits, degreeYears, customAnnualLoad]);

  const workloadResult = useMemo(() => {
    return calculateEctsByWorkload({
      totalWorkloadHours: parseFloat(workloadHours) || 0,
    });
  }, [workloadHours]);

  const institutionResult = useMemo(() => {
    return calculateEctsByInstitutionFactor({
      localCredits: parseFloat(factorCredits) || 0,
      factor: parseFloat(customFactor) || 0,
      institutionName: uniName || "German University",
      departmentName: uniDept,
      sourceUrl,
    });
  }, [factorCredits, customFactor, uniName, uniDept, sourceUrl]);

  // Subject-wise breakdown analysis
  const subjectAnalysis = useMemo(() => {
    return analyzeSubjectBreakdown(courses, activeConversionFactor, requirements);
  }, [courses, activeConversionFactor, requirements]);

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    const cr = parseFloat(newCourseCredits) || 3;
    const entry: CourseEntry = {
      id: "c_" + Date.now(),
      name: newCourseName.trim(),
      creditHours: cr,
      semester: 1,
      category: newCourseCategory,
    };
    setCourses((prev) => [...prev, entry]);
    setNewCourseName("");
    setNewCourseCredits("3");
  };

  const handleRemoveCourse = (id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateRequirement = (cat: CourseCategory, requiredEcts: number) => {
    setRequirements((prev) => {
      const existing = prev.find((r) => r.category === cat);
      if (existing) {
        if (requiredEcts <= 0) {
          return prev.filter((r) => r.category !== cat);
        }
        return prev.map((r) => (r.category === cat ? { ...r, requiredEcts } : r));
      } else {
        if (requiredEcts <= 0) return prev;
        return [...prev, { category: cat, requiredEcts }];
      }
    });
  };

  // Accordions for progressive disclosure below workspace
  const ectsAccordions: AccordionItem[] = [
    {
      id: "ects-principles",
      title: "European ECTS Definition & Standards (60 ECTS / Year)",
      subtitle: "Official guidelines from the European Commission’s ECTS Users’ Guide",
      badge: "European Norm",
      badgeVariant: "default",
      content: (
        <div className="space-y-3 pt-2 text-xs text-ink-800 leading-relaxed">
          <p>
            The European Credit Transfer and Accumulation System (ECTS) measures <strong>overall student workload</strong> rather than simple lecture contact hours.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 bg-paper rounded-xl border border-line space-y-1">
              <span className="font-semibold text-ink-900 block">60 ECTS / Academic Year</span>
              <p className="text-mute">Reflects 1,500 to 1,800 hours of total study across two semesters.</p>
            </div>
            <div className="p-3.5 bg-paper rounded-xl border border-line space-y-1">
              <span className="font-semibold text-ink-900 block">30 ECTS / Semester</span>
              <p className="text-mute">Standard full-time semester curriculum across European universities.</p>
            </div>
            <div className="p-3.5 bg-paper rounded-xl border border-line space-y-1">
              <span className="font-semibold text-ink-900 block">25–30 Hours = 1 ECTS</span>
              <p className="text-mute">Includes lectures, practical laboratories, homework, and exam preparation.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "hec-comparison",
      title: "Pakistani Credit Hours (HEC) vs European ECTS Differences",
      subtitle: "Why German universities do not automatically apply an arbitrary 1:2 conversion",
      badge: "HEC Policy",
      badgeVariant: "neutral",
      content: (
        <div className="space-y-3 pt-2 text-xs text-ink-800 leading-relaxed">
          <p>
            Under HEC’s Undergraduate Education Policy V1.1, Pakistani undergraduate degrees require 120 to 144 credit hours over 4 academic years. Because Pakistani credit hours denote contact hours (1 credit = 1 lecture hr/week), conversion to ECTS is an indicative duration-based normalization, not an automatic guarantee.
          </p>
        </div>
      ),
    },
    {
      id: "modulhandbuch-notice",
      title: "German Master’s Prerequisite Evaluation (Modulhandbuch)",
      subtitle: "How admission committees evaluate consecutive bachelor’s eligibility",
      badge: "Admissions",
      badgeVariant: "neutral",
      content: (
        <div className="space-y-3 pt-2 text-xs text-ink-800 leading-relaxed">
          <p>
            Consecutive German master’s degrees (e.g. M.Sc. Informatics, Data Engineering) mandate subject prerequisites (such as 18 ECTS Mathematics or 24 ECTS Theoretical CS). German selection committees evaluate module handbooks (*Modulhandbuch*) syllabus topics rather than matching course titles alone.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full max-w-[1440px] space-y-6 py-2 pb-12">
      {/* Top Mode Segmented Tabs: Total ECTS | Subject Analysis */}
      <div className="inline-flex max-w-full p-1 rounded-xl bg-paper-raised border border-line" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "total"}
          onClick={() => setActiveTab("total")}
          className={`min-h-10 px-4 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "total"
              ? "bg-card text-ink-900 shadow-xs border border-line"
              : "text-mute hover:text-ink-900"
          }`}
        >
          Total ECTS Normalization
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "subjects"}
          onClick={() => setActiveTab("subjects")}
          className={`min-h-10 px-4 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "subjects"
              ? "bg-card text-ink-900 shadow-xs border border-line"
              : "text-mute hover:text-ink-900"
          }`}
        >
          <span>Subject Analysis</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-500 font-bold">
            {courses.length}
          </span>
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: TOTAL ECTS NORMALIZATION WORKSPACE                            */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "total" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">
          {/* Left Column (55%): Method Selector & Active Inputs */}
          <div className="lg:col-span-7 space-y-5">
            <div className="card p-4 sm:p-6 space-y-5 bg-paper-raised border-line">
              {/* Method Cards */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-ink-900 uppercase tracking-wider block">
                  Select Conversion Method
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: "annual" as const, title: "Academic Years", subtitle: "60 ECTS / Year load" },
                    { id: "workload" as const, title: "Total Workload", subtitle: "25–30 hours / ECTS" },
                    { id: "factor" as const, title: "University Factor", subtitle: "Documented multiplier" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={`min-h-[68px] p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        method === m.id
                          ? "bg-card border-ink-900 dark:border-ink-100 shadow-xs text-ink-900"
                          : "bg-paper border-line hover:border-line-strong text-mute"
                      }`}
                    >
                      <span className="font-bold text-xs block text-ink-900">{m.title}</span>
                      <span className="text-[11px] block mt-0.5">{m.subtitle}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ONLY inputs relevant to the selected method */}
              {method === "annual" && (
                <div className="space-y-4 pt-2 border-t border-line">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="tot-cr-input" className="block text-xs font-semibold text-ink-900 mb-1.5">
                        Total Pakistani Credit Hours *
                      </label>
                      <input
                        id="tot-cr-input"
                        type="number"
                        inputMode="decimal"
                        value={totalCredits}
                        onChange={(e) => setTotalCredits(e.target.value)}
                        placeholder="e.g. 130"
                        className="input text-base font-bold w-full min-h-[44px]"
                      />
                      <span className="text-[11px] text-mute mt-1 block">HEC range: 120–144 credits</span>
                    </div>

                    <div>
                      <label htmlFor="deg-yrs-input" className="block text-xs font-semibold text-ink-900 mb-1.5">
                        Degree Duration (Years) *
                      </label>
                      <input
                        id="deg-yrs-input"
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        value={degreeYears}
                        onChange={(e) => setDegreeYears(e.target.value)}
                        placeholder="e.g. 4"
                        className="input text-base font-bold w-full min-h-[44px]"
                      />
                      <span className="text-[11px] text-mute mt-1 block">BS/BE: 4 years • MS: 2 years</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="ann-load-input" className="block text-xs font-semibold text-ink-900 mb-1.5">
                      Documented Annual Credit Load <span className="font-normal text-mute">(Optional)</span>
                    </label>
                    <input
                      id="ann-load-input"
                      type="number"
                      inputMode="decimal"
                      value={customAnnualLoad}
                      onChange={(e) => setCustomAnnualLoad(e.target.value)}
                      placeholder={`Calculated: ${(parseFloat(totalCredits) / (parseFloat(degreeYears) || 1)).toFixed(1)} credits/year`}
                      className="input text-xs w-full min-h-[44px]"
                    />
                    <span className="text-[11px] text-mute mt-1 block">
                      Leave empty to auto-divide total credits by years.
                    </span>
                  </div>
                </div>
              )}

              {method === "workload" && (
                <div className="space-y-4 pt-2 border-t border-line">
                  <div>
                    <label htmlFor="work-hrs-input" className="block text-xs font-semibold text-ink-900 mb-1.5">
                      Documented Total Learning Hours *
                    </label>
                    <input
                      id="work-hrs-input"
                      type="number"
                      inputMode="numeric"
                      value={workloadHours}
                      onChange={(e) => setWorkloadHours(e.target.value)}
                      placeholder="e.g. 750"
                      className="input text-base font-bold w-full min-h-[44px]"
                    />
                    <span className="text-[11px] text-mute mt-1 block">
                      Total comprehensive workload (lectures, labs, coursework, and self-study).
                    </span>
                  </div>
                </div>
              )}

              {method === "factor" && (
                <div className="space-y-4 pt-2 border-t border-line">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="fact-cr-input" className="block text-xs font-semibold text-ink-900 mb-1.5">
                        Pakistani Credit Hours *
                      </label>
                      <input
                        id="fact-cr-input"
                        type="number"
                        inputMode="decimal"
                        value={factorCredits}
                        onChange={(e) => setFactorCredits(e.target.value)}
                        className="input text-base font-bold w-full min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label htmlFor="fact-mult-input" className="block text-xs font-semibold text-ink-900 mb-1.5">
                        Documented Multiplier Factor *
                      </label>
                      <input
                        id="fact-mult-input"
                        type="number"
                        inputMode="decimal"
                        step="0.05"
                        value={customFactor}
                        onChange={(e) => setCustomFactor(e.target.value)}
                        placeholder="e.g. 1.5"
                        className="input text-base font-bold w-full min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="target-uni-input" className="block text-xs font-semibold text-ink-900 mb-1">
                        German University
                      </label>
                      <input
                        id="target-uni-input"
                        type="text"
                        value={uniName}
                        onChange={(e) => setUniName(e.target.value)}
                        className="input text-xs w-full min-h-[40px]"
                      />
                    </div>
                    <div>
                      <label htmlFor="target-dept-input" className="block text-xs font-semibold text-ink-900 mb-1">
                        School / Department
                      </label>
                      <input
                        id="target-dept-input"
                        type="text"
                        value={uniDept}
                        onChange={(e) => setUniDept(e.target.value)}
                        className="input text-xs w-full min-h-[40px]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (45%): Hero Result Presentation */}
          <div className="lg:col-span-5 space-y-4">
            <div className="card p-5 sm:p-6 border-line bg-card space-y-5 shadow-sm">
              <div>
                <span className="text-xs font-bold text-mute uppercase tracking-wider block">
                  Estimated ECTS Credits
                </span>
                <div className="flex items-baseline gap-3 mt-2">
                  <span className="text-5xl sm:text-6xl font-black text-ink-900 tracking-tight">
                    {method === "annual"
                      ? `${Math.round(annualResult.estimatedEcts)}`
                      : method === "workload"
                      ? `${workloadResult.lowerEcts}–${workloadResult.upperEcts}`
                      : `${Math.round(institutionResult.estimatedEcts)}`}
                  </span>
                  <span className="text-base font-bold text-mute">ECTS</span>
                </div>
                <p className="text-xs text-mute mt-1.5 font-medium">
                  Duration-based estimate, not officially recognized credits.
                </p>
              </div>

              {/* Compact Reference Indicators */}
              <div className="space-y-2 pt-2 border-t border-line text-xs">
                <span className="font-bold text-ink-900 block">
                  European Reference Benchmarks:
                </span>
                <div className="grid grid-cols-2 gap-2 text-mute">
                  <div className="p-2.5 rounded-lg bg-paper-raised border border-line">
                    <span className="font-bold text-ink-900 block text-xs">60 ECTS</span>
                    <span className="text-[11px]">Full academic year</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-paper-raised border border-line">
                    <span className="font-bold text-ink-900 block text-xs">30 ECTS</span>
                    <span className="text-[11px]">Full academic semester</span>
                  </div>
                </div>
              </div>

              {/* CTA to Subject-Wise Check */}
              <div className="pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setActiveTab("subjects")}
                  className="btn-primary w-full text-xs flex items-center justify-center gap-1.5 py-3 min-h-[44px] cursor-pointer"
                >
                  <Icon name="check" size={14} />
                  <span>Analyze Subject Prerequisite Fit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: SUBJECT-WISE PREREQUISITE ANALYSIS                            */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "subjects" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">
            {/* Left: Add Course & Table */}
            <div className="lg:col-span-7 space-y-4">
              {/* Add Course Form */}
              <form onSubmit={handleAddCourse} className="card p-4 sm:p-5 bg-paper-raised border-line space-y-4">
                <div>
                  <span className="text-xs font-bold text-ink-900 uppercase tracking-wider block">Add course or module</span>
                  <p className="mt-1 text-xs text-mute">Enter a course, choose its subject area, and add its Pakistani credit hours.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label htmlFor="course-title-in" className="block text-xs font-semibold text-ink-900 mb-1">
                      Course Name *
                    </label>
                    <input
                      id="course-title-in"
                      type="text"
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      placeholder="e.g. Operating Systems, Linear Algebra"
                      className="input text-xs w-full min-h-[40px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Discipline *
                    </label>
                    <Select
                      value={newCourseCategory}
                      onChange={(v) => setNewCourseCategory(v as CourseCategory)}
                      options={CATEGORY_OPTIONS}
                      label="Category"
                    />
                  </div>

                  <div>
                    <label htmlFor="course-cr-in" className="block text-xs font-semibold text-ink-900 mb-1">
                      Credits *
                    </label>
                    <input
                      id="course-cr-in"
                      type="number"
                      step="0.5"
                      value={newCourseCredits}
                      onChange={(e) => setNewCourseCredits(e.target.value)}
                      className="input text-xs w-full min-h-[40px] font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button type="submit" className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2 min-h-[40px] cursor-pointer">
                    <Icon name="plus" size={13} />
                    <span>+ Add Course</span>
                  </button>
                </div>
              </form>

              {/* Course Table */}
              <div className="card overflow-hidden bg-card border-line">
                <div className="p-4 border-b border-line flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-900 uppercase tracking-wider">
                    Courses Entered ({courses.length})
                  </span>
                  <span className="text-xs text-mute font-medium">
                    Total: <strong className="text-ink-900">{subjectAnalysis.totalLocalCredits} Cr</strong> (≈ {subjectAnalysis.totalEstimatedEcts} ECTS)
                  </span>
                </div>

                <div className="divide-y divide-line max-h-96 overflow-y-auto">
                  {courses.map((c) => (
                    <div key={c.id} className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-paper-sunk transition-colors">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <span className="font-semibold text-ink-900 block truncate">{c.name}</span>
                        <div className="flex items-center gap-2 text-[11px] text-mute">
                          <span className="px-2 py-0.5 rounded bg-paper border border-line">
                            {c.category}
                          </span>
                          <span>{c.creditHours} Pakistani Cr</span>
                          <span>•</span>
                          <span>≈ {(c.creditHours * activeConversionFactor).toFixed(1)} ECTS</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCourse(c.id)}
                        className="text-mute hover:text-red-600 p-2 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Delete course"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  ))}
                  {courses.length === 0 && (
                    <div className="p-8 text-center text-xs text-mute">
                      No courses added yet. Add a course above to evaluate prerequisites.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Prerequisite Gaps & Benchmarks */}
            <div className="lg:col-span-5">
              <div className="card p-4 sm:p-5 border-line bg-card space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-3">
                  <span className="text-xs font-bold text-ink-900 uppercase tracking-wider">
                    Target Program Fit
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      subjectAnalysis.overallDeficitCount === 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                    }`}
                  >
                    {subjectAnalysis.overallDeficitCount === 0
                      ? "Requirements Satisfied"
                      : `${subjectAnalysis.overallDeficitCount} Potential Deficit(s)`}
                  </span>
                </div>

                <div className="space-y-3">
                  {subjectAnalysis.categories.map((cat) => (
                    <div
                      key={cat.category}
                      className={`p-3 rounded-xl border text-xs space-y-2 transition-colors ${
                        cat.satisfied
                          ? "bg-paper-raised border-line"
                          : "bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/60"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 min-h-8">
                        <span className="font-bold text-ink-900 leading-snug">{cat.category}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-mute">Target:</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={cat.requiredEcts || ""}
                            onChange={(e) =>
                              handleUpdateRequirement(cat.category, parseFloat(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="w-14 px-1.5 py-0.5 text-xs text-right border border-line rounded bg-paper"
                          />
                          <span className="text-[11px] text-mute font-semibold">ECTS</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-line/60">
                        <span className="text-mute">
                          Completed: <strong>{cat.estimatedEcts} ECTS</strong> ({cat.totalLocalCredits} Cr)
                        </span>
                        <span
                          className={`font-bold ${
                            cat.satisfied ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {cat.requiredEcts > 0
                            ? cat.satisfied
                              ? `+${cat.gapOrSurplus} ECTS (Met)`
                              : `${cat.gapOrSurplus} ECTS (Deficit)`
                            : "No requirement set"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-mute leading-relaxed pt-1 border-t border-line">
                  Admission committees examine detailed course descriptions (Modulhandbuch), not course titles alone.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Progressive Disclosure Below Workspace: Accordions ── */}
      <div className="pt-6 border-t border-line space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wider">
            Methodology & ECTS Principles
          </h2>
          <p className="text-xs text-mute">
            European Credit System definitions, HEC policy context, and admissions guidelines.
          </p>
        </div>

        <Accordion items={ectsAccordions} />
      </div>
    </div>
  );
}
