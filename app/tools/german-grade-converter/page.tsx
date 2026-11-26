"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import Accordion, { AccordionItem } from "@/components/ui/Accordion";
import { calculateBavarianGrade, GermanGradeResult } from "@/lib/academic-calculators";

export default function GermanGradeConverterPage() {
  const [scaleType, setScaleType] = useState<"cgpa" | "percentage">("cgpa");
  const [universityName, setUniversityName] = useState<string>("");
  const [ndInput, setNdInput] = useState<string>("3.20");
  const [nmaxInput, setNmaxInput] = useState<string>("4.00");
  const [nminInput, setNminInput] = useState<string>("2.00");
  const [copied, setCopied] = useState<boolean>(false);

  // Switch presets cleanly when toggling scale
  const handleScaleToggle = (type: "cgpa" | "percentage") => {
    setScaleType(type);
    if (type === "percentage") {
      setNdInput("78");
      setNmaxInput("100");
      setNminInput("50");
    } else {
      setNdInput("3.20");
      setNmaxInput("4.00");
      setNminInput("2.00");
    }
  };

  const nd = parseFloat(ndInput);
  const nmax = parseFloat(nmaxInput);
  const nmin = parseFloat(nminInput);

  const result: GermanGradeResult = useMemo(() => {
    return calculateBavarianGrade({ nd, nmax, nmin });
  }, [nd, nmax, nmin]);

  const handleCopy = () => {
    if (!result.valid) return;
    const uniStr = universityName.trim() ? `\nUniversity: ${universityName.trim()}` : "";
    const text = `German Grade Estimate: ${result.displayGermanGrade} (${result.germanClassification.german} / ${result.germanClassification.english})${uniStr}\nScale: ${scaleType.toUpperCase()} (Achieved: ${nd}, Max: ${nmax}, Min Passing: ${nmin})\nFormula: Modified Bavarian Formula (TUM & Uni-Assist standard)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setUniversityName("");
    if (scaleType === "percentage") {
      setNdInput("75");
      setNmaxInput("100");
      setNminInput("50");
    } else {
      setNdInput("3.20");
      setNmaxInput("4.00");
      setNminInput("2.00");
    }
  };

  // Calculate percentage along the 1.0 to 5.0 continuum for horizontal visualization bar
  // 1.0 = 0% (best), 4.0 = 75%, 5.0 = 100% (fail)
  const scalePositionPercent = useMemo(() => {
    if (!result.valid) return 0;
    const clamped = Math.max(1.0, Math.min(5.0, result.rawGermanGrade));
    return Math.round(((clamped - 1.0) / 4.0) * 100);
  }, [result]);

  // Accordion items for progressive disclosure below the calculator
  const infoAccordions: AccordionItem[] = [
    {
      id: "formula-breakdown",
      title: "Modified Bavarian Formula & Calculation Breakdown",
      subtitle: "Linear transformation between minimum graduation passing grade and maximum possible mark",
      badge: "Formula",
      badgeVariant: "default",
      content: (
        <div className="space-y-4 pt-2 text-xs text-ink-800 leading-relaxed">
          <div className="p-3.5 bg-paper rounded-xl border border-line font-mono text-xs overflow-x-auto text-ink-900">
            German Grade = 1 + 3 × (Nmax − Nd) / (Nmax − Nmin)
          </div>
          {result.valid && (
            <div className="p-3.5 bg-paper rounded-xl border border-line space-y-1.5 font-mono text-[11px] text-mute">
              <div>• Substituted: 1 + 3 × ({nmax} − {nd}) / ({nmax} − {nmin})</div>
              <div>• Grade difference: {result.stepByStep.numerator} / {result.stepByStep.denominator} = {result.stepByStep.fraction.toFixed(4)}</div>
              <div>• Multiplied by 3: {result.stepByStep.scaled.toFixed(4)}</div>
              <div>• Unrounded result: <strong className="text-ink-900">{result.stepByStep.finalValue.toFixed(4)}</strong> (Display: {result.displayGermanGrade})</div>
            </div>
          )}
          <p className="text-mute">
            Under German examination bylaws (<em>Prüfungsordnung</em>), grades span from <strong>1.0</strong> (best possible) to <strong>4.0</strong> (lowest passing). A value of <strong>5.0</strong> indicates academic failure.
          </p>
        </div>
      ),
    },
    {
      id: "uniassist-rules",
      title: "Uni-Assist Minimum Grade (Nmin) Requirements for Pakistan",
      subtitle: "Why individual course passing marks are not sufficient for German preliminary review",
      badge: "Regulatory",
      badgeVariant: "neutral",
      content: (
        <div className="space-y-3 pt-2 text-xs text-ink-800 leading-relaxed">
          <p>
            Uni-Assist explicitly mandates proof of the <strong>minimum grade required to award the bachelor’s degree</strong> (not simply the minimum pass mark for a single semester course).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl border border-line bg-paper space-y-1">
              <span className="font-semibold text-ink-900 block">Where to Find Your Degree Minimum</span>
              <p className="text-mute">
                Check the reverse side or footer legend of your official university transcript, your institute’s academic prospectus, or request a stamped grading scale certificate from your Controller of Examinations.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-line bg-paper space-y-1">
              <span className="font-semibold text-ink-900 block">Common Pakistani Benchmarks</span>
              <p className="text-mute">
                Most Pakistani public universities (e.g. Punjab University, UET) require a minimum <strong>2.00 / 4.00 CGPA</strong> or <strong>50%</strong>. Certain private or engineering institutes (e.g. NUST, FAST) enforce <strong>2.20 or 2.50</strong> for graduation.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "official-sources",
      title: "Official References & Primary Sources",
      subtitle: "Technical University of Munich (TUM) and Uni-Assist verified guidelines",
      badge: "Official",
      badgeVariant: "neutral",
      content: (
        <div className="space-y-3 pt-2 text-xs text-ink-800 leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="https://www.tum.de/en/studies/application/application-info-portal/grade-conversion-formula-for-grades-earned-outside-germany/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl border border-line bg-paper hover:bg-paper-sunk transition-colors flex items-center justify-between group"
            >
              <div className="space-y-0.5">
                <span className="font-semibold text-ink-900 group-hover:text-blue-600 transition-colors block">
                  TUM Grade Conversion Formula Portal
                </span>
                <span className="text-[11px] text-mute">Official Bavarian Formula publication</span>
              </div>
              <Icon name="external" size={14} className="text-mute group-hover:text-blue-600 transition-colors shrink-0" />
            </a>

            <a
              href="https://www.uni-assist.de/en/tools/info-country-by-country/details-country/country/pk/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl border border-line bg-paper hover:bg-paper-sunk transition-colors flex items-center justify-between group"
            >
              <div className="space-y-0.5">
                <span className="font-semibold text-ink-900 group-hover:text-blue-600 transition-colors block">
                  Uni-Assist Pakistan Country Details
                </span>
                <span className="text-[11px] text-mute">Degree certificate and grading scale criteria</span>
              </div>
              <Icon name="external" size={14} className="text-mute group-hover:text-blue-600 transition-colors shrink-0" />
            </a>
          </div>
          <p className="text-[11px] text-mute leading-relaxed pt-1">
            <strong>Non-Binding Notice:</strong> Individual German universities hold institutional autonomy under federal law. Official grade conversions are determined exclusively by Uni-Assist and institutional examination boards during formal admissions review.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-8 px-4 sm:px-6 lg:px-8 py-4 pb-20">
      {/* Breadcrumb Jump Link */}
      <div className="flex items-center gap-2 text-xs text-mute">
        <Link href="/admission-guide" className="hover:text-ink-900 transition-colors flex items-center gap-1">
          <Icon name="arrowLeft" size={13} />
          <span>Admission Guide</span>
        </Link>
        <span>•</span>
        <span className="text-ink-900 font-medium">German Grade Converter</span>
      </div>

      {/* Header (Concise, Uncluttered) */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900">
          German Grade Converter
        </h1>
        <p className="text-xs sm:text-sm text-mute">
          Modified Bavarian Formula for German university admissions and Uni-Assist VPD preliminary review.
        </p>
      </div>

      {/* ── Primary 2-Column Calculator Workspace (55% Input / 45% Hero Result) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (55%): Clean, Aligned Inputs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="card p-5 sm:p-7 space-y-6 bg-paper-raised border-line">
            {/* Segmented Control for Scale Type */}
            <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
              <span className="text-xs font-bold text-ink-900 uppercase tracking-wider">
                Grading System
              </span>

              {/* Segmented Toggle: CGPA | Percentage */}
              <div className="inline-flex p-1 rounded-xl bg-paper border border-line" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={scaleType === "cgpa"}
                  onClick={() => handleScaleToggle("cgpa")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    scaleType === "cgpa"
                      ? "bg-card text-ink-900 shadow-xs border border-line"
                      : "text-mute hover:text-ink-900"
                  }`}
                >
                  CGPA Scale (4.0)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={scaleType === "percentage"}
                  onClick={() => handleScaleToggle("percentage")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    scaleType === "percentage"
                      ? "bg-card text-ink-900 shadow-xs border border-line"
                      : "text-mute hover:text-ink-900"
                  }`}
                >
                  Percentage (100%)
                </button>
              </div>
            </div>

            {/* University Name (Optional) */}
            <div>
              <label htmlFor="uni-input" className="block text-xs font-semibold text-ink-900 mb-1.5">
                Pakistani University <span className="font-normal text-mute">(Optional)</span>
              </label>
              <input
                id="uni-input"
                type="text"
                value={universityName}
                onChange={(e) => setUniversityName(e.target.value)}
                placeholder="e.g. NUST, FAST, UET, Punjab University, COMSATS"
                className="input text-xs w-full min-h-[44px]"
              />
            </div>

            {/* 3 Aligned Numeric Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Achieved Grade (Nd) */}
              <div>
                <label htmlFor="nd-val" className="block text-xs font-semibold text-ink-900 mb-1.5">
                  Your Grade (Nd) *
                </label>
                <input
                  id="nd-val"
                  type="number"
                  inputMode="decimal"
                  step={scaleType === "percentage" ? "1" : "0.01"}
                  value={ndInput}
                  onChange={(e) => setNdInput(e.target.value)}
                  className="input text-base font-bold w-full min-h-[44px]"
                />
                <span className="text-[11px] text-mute mt-1 block">Your overall result</span>
              </div>

              {/* Maximum Possible (Nmax) */}
              <div>
                <label htmlFor="nmax-val" className="block text-xs font-semibold text-ink-900 mb-1.5">
                  Maximum (Nmax) *
                </label>
                <input
                  id="nmax-val"
                  type="number"
                  inputMode="decimal"
                  step={scaleType === "percentage" ? "1" : "0.01"}
                  value={nmaxInput}
                  onChange={(e) => setNmaxInput(e.target.value)}
                  className="input text-base font-bold w-full min-h-[44px]"
                />
                <span className="text-[11px] text-mute mt-1 block">Usually {scaleType === "percentage" ? "100" : "4.00"}</span>
              </div>

              {/* Minimum Passing (Nmin) */}
              <div>
                <label htmlFor="nmin-val" className="block text-xs font-semibold text-ink-900 mb-1.5">
                  Graduation Min (Nmin) *
                </label>
                <input
                  id="nmin-val"
                  type="number"
                  inputMode="decimal"
                  step={scaleType === "percentage" ? "1" : "0.01"}
                  value={nminInput}
                  onChange={(e) => setNminInput(e.target.value)}
                  className="input text-base font-bold w-full min-h-[44px]"
                />
                <span className="text-[11px] text-mute mt-1 block">Degree award threshold</span>
              </div>
            </div>

            {/* Quick Pakistani Presets */}
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-mute font-medium">Quick presets:</span>
              {[
                { label: "CGPA 4.0 / Min 2.0", nd: "3.20", max: "4.00", min: "2.00", type: "cgpa" as const },
                { label: "CGPA 4.0 / Min 2.5", nd: "3.20", max: "4.00", min: "2.50", type: "cgpa" as const },
                { label: "Percent / Min 50%", nd: "75", max: "100", min: "50", type: "percentage" as const },
                { label: "Percent / Min 60%", nd: "75", max: "100", min: "60", type: "percentage" as const },
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setScaleType(p.type);
                    setNdInput(p.nd);
                    setNmaxInput(p.max);
                    setNminInput(p.min);
                  }}
                  className="px-2.5 py-1 text-[11px] rounded-lg border border-line bg-paper hover:bg-paper-sunk text-ink-800 transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2 border-t border-line">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!result.valid}
                className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2 min-h-[44px] cursor-pointer"
              >
                <Icon name={copied ? "check" : "copy"} size={14} />
                <span>{copied ? "Copied!" : "Copy Result"}</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-2 min-h-[44px] cursor-pointer"
              >
                <Icon name="refresh" size={14} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (45%): Hero Result Card (Sticky on Desktop) */}
        <div className="lg:col-span-5 sticky top-20 space-y-4">
          <div className="card p-6 sm:p-7 border-line bg-card space-y-6 shadow-sm">
            <div>
              <span className="text-xs font-bold text-mute uppercase tracking-wider block">
                Estimated German Grade
              </span>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-5xl sm:text-6xl font-black text-ink-900 tracking-tight">
                  {result.valid ? result.displayGermanGrade : "—"}
                </span>
                {result.valid && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      result.germanClassification.badgeColor === "emerald"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                        : result.germanClassification.badgeColor === "blue"
                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                        : result.germanClassification.badgeColor === "amber"
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                        : result.germanClassification.badgeColor === "clay"
                        ? "bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-900 dark:text-stone-300 dark:border-stone-700"
                        : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                    }`}
                  >
                    {result.germanClassification.german} • {result.germanClassification.english}
                  </span>
                )}
              </div>
            </div>

            {/* Validation Notice or Alert */}
            {result.errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 space-y-1">
                <span className="font-semibold flex items-center gap-1.5">
                  <Icon name="alertCircle" size={14} />
                  Validation Error
                </span>
                <p>{result.errorMessage}</p>
              </div>
            )}

            {result.warningMessage && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <span className="font-semibold flex items-center gap-1.5">
                  <Icon name="info" size={14} />
                  Degree Minimum Notice
                </span>
                <p className="leading-relaxed">{result.warningMessage}</p>
              </div>
            )}

            {/* Subtle Horizontal Grading-Scale Visualization */}
            {result.valid && (
              <div className="space-y-2 pt-1 border-t border-line">
                <div className="flex justify-between items-center text-[11px] font-semibold text-mute">
                  <span>1.0 (Best)</span>
                  <span>2.5 (Good)</span>
                  <span>4.0 (Pass)</span>
                  <span>5.0 (Fail)</span>
                </div>

                {/* Progress track with gradient zones */}
                <div className="relative h-2.5 rounded-full bg-paper-sunk border border-line overflow-visible">
                  {/* Visual Marker Pin */}
                  <div
                    className="absolute -top-1 w-4 h-4 rounded-full bg-ink-900 border-2 border-paper shadow-md transition-all duration-300 -translate-x-1/2"
                    style={{ left: `${scalePositionPercent}%` }}
                    title={`Grade: ${result.displayGermanGrade}`}
                  />
                </div>
              </div>
            )}

            {/* Short Estimate Disclaimer */}
            <p className="text-[11px] text-mute leading-relaxed pt-1 border-t border-line">
              Non-binding estimate. Official evaluation is performed exclusively by Uni-Assist and individual university examination boards.
            </p>
          </div>
        </div>
      </div>

      {/* ── Progressive Disclosure Below Workspace: Accordions ── */}
      <div className="pt-6 border-t border-line space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wider">
            Methodology & Official Regulations
          </h2>
          <p className="text-xs text-mute">
            Formulas, Uni-Assist Pakistan requirements, and authoritative documentation sources.
          </p>
        </div>

        <Accordion items={infoAccordions} />
      </div>
    </div>
  );
}
