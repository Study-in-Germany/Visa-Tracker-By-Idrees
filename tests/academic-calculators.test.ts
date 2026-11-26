import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateBavarianGrade,
  calculateEctsByAnnualLoad,
  calculateEctsByWorkload,
  calculateEctsByInstitutionFactor,
  analyzeSubjectBreakdown,
  CourseEntry,
  TargetRequirement,
} from "../lib/academic-calculators";

describe("German Grade Converter — Modified Bavarian Formula", () => {
  it("computes exact German grades for verified TUM test cases", () => {
    // 1. CGPA 4.00, Max 4.00, Min 2.00 => 1.00
    const res1 = calculateBavarianGrade({ nd: 4.0, nmax: 4.0, nmin: 2.0 });
    assert.equal(res1.valid, true);
    assert.equal(res1.displayGermanGrade, "1.00");
    assert.equal(res1.germanClassification.status, "SEHR_GUT");

    // 2. CGPA 3.60, Max 4.00, Min 2.00 => 1.60
    const res2 = calculateBavarianGrade({ nd: 3.6, nmax: 4.0, nmin: 2.0 });
    assert.equal(res2.valid, true);
    assert.equal(res2.displayGermanGrade, "1.60");
    assert.equal(res2.germanClassification.status, "GUT");

    // 3. CGPA 3.50, Max 4.00, Min 2.00 => 1.75
    const res3 = calculateBavarianGrade({ nd: 3.5, nmax: 4.0, nmin: 2.0 });
    assert.equal(res3.valid, true);
    assert.equal(res3.displayGermanGrade, "1.75");
    assert.equal(res3.germanClassification.status, "GUT");

    // 4. CGPA 3.20, Max 4.00, Min 2.00 => 2.20
    const res4 = calculateBavarianGrade({ nd: 3.2, nmax: 4.0, nmin: 2.0 });
    assert.equal(res4.valid, true);
    assert.equal(res4.displayGermanGrade, "2.20");
    assert.equal(res4.germanClassification.status, "GUT");

    // 5. CGPA 3.20, Max 4.00, Min 2.50 => 2.60 (Higher minimum required to graduate)
    const res5 = calculateBavarianGrade({ nd: 3.2, nmax: 4.0, nmin: 2.5 });
    assert.equal(res5.valid, true);
    assert.equal(res5.displayGermanGrade, "2.60");
    assert.equal(res5.germanClassification.status, "BEFRIEDIGEND");

    // 6. CGPA 3.00, Max 4.00, Min 2.00 => 2.50
    const res6 = calculateBavarianGrade({ nd: 3.0, nmax: 4.0, nmin: 2.0 });
    assert.equal(res6.valid, true);
    assert.equal(res6.displayGermanGrade, "2.50");
    assert.equal(res6.germanClassification.status, "GUT");

    // 7. CGPA 2.00, Max 4.00, Min 2.00 => 4.00
    const res7 = calculateBavarianGrade({ nd: 2.0, nmax: 4.0, nmin: 2.0 });
    assert.equal(res7.valid, true);
    assert.equal(res7.displayGermanGrade, "4.00");
    assert.equal(res7.germanClassification.status, "AUSREICHEND");
  });

  it("handles percentage grading systems correctly", () => {
    // 80% out of 100% with 50% passing threshold
    // 1 + 3 * (100 - 80) / (100 - 50) = 1 + 3 * 20 / 50 = 1 + 1.2 = 2.20
    const res = calculateBavarianGrade({ nd: 80, nmax: 100, nmin: 50 });
    assert.equal(res.valid, true);
    assert.equal(res.displayGermanGrade, "2.20");
  });

  it("shows validation warning when CGPA is below the minimum graduation threshold", () => {
    // Achieved 1.90 with minimum 2.00 required to graduate
    const res = calculateBavarianGrade({ nd: 1.9, nmax: 4.0, nmin: 2.0 });
    assert.equal(res.valid, true);
    assert.ok(res.warningMessage);
    assert.equal(res.germanClassification.status, "NICHT_AUSREICHEND");
  });

  it("rejects impossible inputs and division by zero", () => {
    // Nd > Nmax
    const res1 = calculateBavarianGrade({ nd: 4.5, nmax: 4.0, nmin: 2.0 });
    assert.equal(res1.valid, false);

    // Nmin >= Nmax
    const res2 = calculateBavarianGrade({ nd: 3.0, nmax: 2.0, nmin: 2.0 });
    assert.equal(res2.valid, false);

    // NaN
    const res3 = calculateBavarianGrade({ nd: NaN, nmax: 4.0, nmin: 2.0 });
    assert.equal(res3.valid, false);
  });
});

describe("ECTS Calculator — European Credit System", () => {
  it("Method 1: normalizes Pakistani credits by 60 ECTS annual reference load", () => {
    // 130 Pakistani credits over 4 years = 32.5 credits/year
    // Factor = 60 / 32.5 = 1.84615...
    // 130 * 1.84615... = 240 ECTS
    const res = calculateEctsByAnnualLoad({
      totalLocalCredits: 130,
      academicYears: 4,
    });
    assert.equal(res.valid, true);
    assert.equal(Math.round(res.estimatedEcts), 240);
    assert.equal(res.annualCreditsUsed, 32.5);
  });

  it("Method 2: calculates 25-30 hours per ECTS range for documented workload", () => {
    // 750 total hours = 750/30 (25 ECTS) to 750/25 (30 ECTS)
    const res = calculateEctsByWorkload({ totalWorkloadHours: 750 });
    assert.equal(res.valid, true);
    assert.equal(res.lowerEcts, 25);
    assert.equal(res.upperEcts, 30);
    assert.equal(res.medianEcts, 27.5);
  });

  it("Method 3: applies verified departmental conversion factor", () => {
    const res = calculateEctsByInstitutionFactor({
      localCredits: 120,
      factor: 1.5,
      institutionName: "TUM School of CIT",
      sourceUrl: "https://www.cit.tum.de",
    });
    assert.equal(res.valid, true);
    assert.equal(res.estimatedEcts, 180);
  });
});

describe("Subject-Wise ECTS Course Breakdown", () => {
  it("accurately breaks down course credits and checks program requirements", () => {
    const courses: CourseEntry[] = [
      { id: "1", name: "Calculus I", creditHours: 3, semester: 1, category: "Mathematics" },
      { id: "2", name: "Linear Algebra", creditHours: 3, semester: 2, category: "Mathematics" },
      { id: "3", name: "Discrete Math", creditHours: 3, semester: 3, category: "Mathematics" },
      { id: "4", name: "Data Structures", creditHours: 4, semester: 2, category: "Computer Science" },
      { id: "5", name: "Algorithms", creditHours: 4, semester: 3, category: "Computer Science" },
    ];

    const requirements: TargetRequirement[] = [
      { category: "Mathematics", requiredEcts: 18 }, // Needs 18 ECTS Math
      { category: "Theoretical Computer Science", requiredEcts: 10 }, // Needs 10 ECTS Theoretical CS
    ];

    // Factor 1.8462 (e.g. 130 / 4-year degree)
    const factor = 1.8462;
    const analysis = analyzeSubjectBreakdown(courses, factor, requirements);

    // Total local credits: 3 + 3 + 3 + 4 + 4 = 17 credits
    assert.equal(analysis.totalLocalCredits, 17);

    // Math: 9 local credits * 1.8462 = 16.6 ECTS vs 18 required => deficit
    const math = analysis.categories.find((c) => c.category === "Mathematics");
    assert.ok(math);
    assert.equal(math.satisfied, false);
    assert.ok(math.gapOrSurplus < 0);

    // Theoretical CS: 0 credits vs 10 required => deficit
    const theo = analysis.categories.find((c) => c.category === "Theoretical Computer Science");
    assert.ok(theo);
    assert.equal(theo.satisfied, false);

    assert.equal(analysis.overallDeficitCount, 2);
  });
});

