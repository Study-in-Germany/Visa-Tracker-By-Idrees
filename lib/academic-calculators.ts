/**
 * Academic Calculator Logic & Official German Higher Education Conversion Formulas
 *
 * Sources:
 * 1. TUM Modified Bavarian Formula (Grade conversion for foreign qualifications):
 *    https://www.tum.de/en/studies/application/application-info-portal/grade-conversion-formula-for-grades-earned-outside-germany/
 * 2. Uni-Assist Country-by-Country Info for Pakistan:
 *    https://www.uni-assist.de/en/tools/info-country-by-country/details-country/country/pk/
 * 3. European Credit Transfer and Accumulation System (ECTS) Users' Guide:
 *    https://education.ec.europa.eu/sites/default/files/document-library-docs/ects-users-guide_en.pdf
 * 4. HEC Undergraduate Education Policy V1.1:
 *    https://www.hec.gov.pk/english/services/students/UEP/Documents/UGE-Policy.pdf
 */

export interface BavarianFormulaInput {
  nd: number; // Student's achieved overall grade (CGPA or percentage)
  nmax: number; // Maximum possible grade (e.g. 4.0 or 100)
  nmin: number; // Minimum passing grade required to award the degree
}

export interface GermanGradeResult {
  valid: boolean;
  errorMessage?: string;
  warningMessage?: string;
  rawGermanGrade: number;
  displayGermanGrade: string; // Typically 1 decimal (e.g. 2.2) or 2 decimals (2.20)
  germanClassification: {
    german: string;
    english: string;
    status: "SEHR_GUT" | "GUT" | "BEFRIEDIGEND" | "AUSREICHEND" | "NICHT_AUSREICHEND";
    badgeColor: "emerald" | "blue" | "amber" | "clay" | "red";
  };
  stepByStep: {
    formula: string;
    substituted: string;
    numerator: number;
    denominator: number;
    fraction: number;
    scaled: number;
    finalValue: number;
  };
}

/**
 * Calculates German grade using the Modified Bavarian Formula:
 * German Grade = 1 + 3 * (Nmax - Nd) / (Nmax - Nmin)
 */
export function calculateBavarianGrade(input: BavarianFormulaInput): GermanGradeResult {
  const { nd, nmax, nmin } = input;

  // Validation
  if (isNaN(nd) || isNaN(nmax) || isNaN(nmin)) {
    return createInvalidResult("All grade values must be valid numbers.");
  }

  if (nmax <= nmin) {
    return createInvalidResult("Maximum grade must be strictly greater than minimum passing grade.");
  }

  if (nd > nmax) {
    return createInvalidResult(`Achieved grade (${nd}) cannot exceed the maximum possible grade (${nmax}).`);
  }

  // If achieved grade is below the documented degree-award minimum passing grade
  if (nd < nmin) {
    const raw = 1 + (3 * (nmax - nd)) / (nmax - nmin);
    return {
      valid: true,
      warningMessage: `Your achieved grade (${nd}) is below your institution's documented degree-award minimum (${nmin}). In the German system, this represents an unawarded or failed qualification (Nicht ausreichend / 5.0).`,
      rawGermanGrade: raw,
      displayGermanGrade: "5.0 (Fail)",
      germanClassification: {
        german: "Nicht ausreichend",
        english: "Fail / Insufficient",
        status: "NICHT_AUSREICHEND",
        badgeColor: "red",
      },
      stepByStep: {
        formula: "1 + 3 × (Nmax − Nd) / (Nmax − Nmin)",
        substituted: `1 + 3 × (${nmax} − ${nd}) / (${nmax} − ${nmin})`,
        numerator: Math.round((nmax - nd) * 10000) / 10000,
        denominator: Math.round((nmax - nmin) * 10000) / 10000,
        fraction: Math.round(((nmax - nd) / (nmax - nmin)) * 10000) / 10000,
        scaled: Math.round((3 * ((nmax - nd) / (nmax - nmin))) * 10000) / 10000,
        finalValue: raw,
      },
    };
  }

  const numerator = nmax - nd;
  const denominator = nmax - nmin;
  const fraction = numerator / denominator;
  const scaled = 3 * fraction;
  const rawGermanGrade = 1 + scaled;

  // Standard German rounding to 1 or 2 decimals
  // Truncation vs standard mathematical rounding: German universities commonly round mathematically to one decimal place (e.g. 1.75 -> 1.7 or 1.8 depending on Examination Regulations)
  const displayGermanGrade = (Math.round(rawGermanGrade * 100) / 100).toFixed(2);

  // Interpretation classification
  let classification: GermanGradeResult["germanClassification"];
  if (rawGermanGrade <= 1.5) {
    classification = {
      german: "Sehr gut",
      english: "Very Good / Outstanding",
      status: "SEHR_GUT",
      badgeColor: "emerald",
    };
  } else if (rawGermanGrade <= 2.5) {
    classification = {
      german: "Gut",
      english: "Good",
      status: "GUT",
      badgeColor: "blue",
    };
  } else if (rawGermanGrade <= 3.5) {
    classification = {
      german: "Befriedigend",
      english: "Satisfactory",
      status: "BEFRIEDIGEND",
      badgeColor: "amber",
    };
  } else if (rawGermanGrade <= 4.0) {
    classification = {
      german: "Ausreichend",
      english: "Sufficient / Pass",
      status: "AUSREICHEND",
      badgeColor: "clay",
    };
  } else {
    classification = {
      german: "Nicht ausreichend",
      english: "Insufficient / Fail",
      status: "NICHT_AUSREICHEND",
      badgeColor: "red",
    };
  }

  return {
    valid: true,
    rawGermanGrade,
    displayGermanGrade,
    germanClassification: classification,
    stepByStep: {
      formula: "1 + 3 × (Nmax − Nd) / (Nmax − Nmin)",
      substituted: `1 + 3 × (${nmax} − ${nd}) / (${nmax} − ${nmin})`,
      numerator: Math.round(numerator * 10000) / 10000,
      denominator: Math.round(denominator * 10000) / 10000,
      fraction: Math.round(fraction * 10000) / 10000,
      scaled: Math.round(scaled * 10000) / 10000,
      finalValue: rawGermanGrade,
    },
  };
}

function createInvalidResult(errorMessage: string): GermanGradeResult {
  return {
    valid: false,
    errorMessage,
    rawGermanGrade: 0,
    displayGermanGrade: "-",
    germanClassification: {
      german: "Invalid",
      english: "Invalid",
      status: "NICHT_AUSREICHEND",
      badgeColor: "red",
    },
    stepByStep: {
      formula: "1 + 3 × (Nmax − Nd) / (Nmax − Nmin)",
      substituted: "-",
      numerator: 0,
      denominator: 0,
      fraction: 0,
      scaled: 0,
      finalValue: 0,
    },
  };
}

/**
 * ECTS Estimation Method 1: Annual Credit Load Normalization
 *
 * Formula: Estimated ECTS = Local Credits * (60 / Local Annual Credits)
 */
export interface AnnualCreditLoadInput {
  totalLocalCredits: number;
  academicYears: number; // e.g. 4 for bachelor's
  documentedAnnualCredits?: number; // Optional; if omitted, estimated as total / years
}

export interface AnnualCreditLoadResult {
  valid: boolean;
  errorMessage?: string;
  annualCreditsUsed: number;
  conversionFactor: number;
  estimatedEcts: number;
  explanation: string;
}

export function calculateEctsByAnnualLoad(input: AnnualCreditLoadInput): AnnualCreditLoadResult {
  const { totalLocalCredits, academicYears, documentedAnnualCredits } = input;

  if (isNaN(totalLocalCredits) || totalLocalCredits <= 0) {
    return {
      valid: false,
      errorMessage: "Total credit hours must be a positive number.",
      annualCreditsUsed: 0,
      conversionFactor: 0,
      estimatedEcts: 0,
      explanation: "",
    };
  }

  if (isNaN(academicYears) || academicYears <= 0) {
    return {
      valid: false,
      errorMessage: "Academic duration in years must be greater than zero.",
      annualCreditsUsed: 0,
      conversionFactor: 0,
      estimatedEcts: 0,
      explanation: "",
    };
  }

  const annualCredits = documentedAnnualCredits && documentedAnnualCredits > 0
    ? documentedAnnualCredits
    : totalLocalCredits / academicYears;

  if (annualCredits <= 0) {
    return {
      valid: false,
      errorMessage: "Annual credit load cannot be zero.",
      annualCreditsUsed: 0,
      conversionFactor: 0,
      estimatedEcts: 0,
      explanation: "",
    };
  }

  const conversionFactor = 60 / annualCredits;
  const estimatedEcts = Math.round(totalLocalCredits * conversionFactor * 10) / 10;

  return {
    valid: true,
    annualCreditsUsed: Math.round(annualCredits * 100) / 100,
    conversionFactor: Math.round(conversionFactor * 10000) / 10000,
    estimatedEcts,
    explanation: `Based on a ${academicYears}-year degree (${Math.round(annualCredits * 10) / 10} Pakistani credits/year), 60 ECTS per European academic year yields a normalization factor of ~${(Math.round(conversionFactor * 1000) / 1000)}. This indicates ~${Math.round(estimatedEcts)} total ECTS workload over ${academicYears} years. Note that this is a duration-based mathematical benchmark, not an admission guarantee.`,
  };
}

/**
 * ECTS Estimation Method 2: Documented Workload Hours
 *
 * 1 ECTS = 25 to 30 hours of total student workload (contact hours + self-study).
 * Range: Lower = Total Hours / 30, Upper = Total Hours / 25
 */
export interface WorkloadHoursInput {
  totalWorkloadHours: number;
}

export interface WorkloadHoursResult {
  valid: boolean;
  errorMessage?: string;
  lowerEcts: number; // totalWorkloadHours / 30
  upperEcts: number; // totalWorkloadHours / 25
  medianEcts: number;
  explanation: string;
}

export function calculateEctsByWorkload(input: WorkloadHoursInput): WorkloadHoursResult {
  const { totalWorkloadHours } = input;

  if (isNaN(totalWorkloadHours) || totalWorkloadHours <= 0) {
    return {
      valid: false,
      errorMessage: "Total workload hours must be a positive number.",
      lowerEcts: 0,
      upperEcts: 0,
      medianEcts: 0,
      explanation: "",
    };
  }

  const lowerEcts = Math.round((totalWorkloadHours / 30) * 10) / 10;
  const upperEcts = Math.round((totalWorkloadHours / 25) * 10) / 10;
  const medianEcts = Math.round(((lowerEcts + upperEcts) / 2) * 10) / 10;

  return {
    valid: true,
    lowerEcts,
    upperEcts,
    medianEcts,
    explanation: `European higher education defines 1 ECTS as 25 to 30 hours of comprehensive workload. At ${totalWorkloadHours} documented hours, your curriculum equates to approximately ${lowerEcts} to ${upperEcts} ECTS (midpoint: ~${medianEcts} ECTS).`,
  };
}

/**
 * ECTS Estimation Method 3: University-Specific Documented Factor
 *
 * Estimated ECTS = Pakistani Credits * Documented Factor
 */
export interface InstitutionFactorInput {
  localCredits: number;
  factor: number;
  institutionName: string;
  departmentName?: string;
  sourceUrl?: string;
}

export interface InstitutionFactorResult {
  valid: boolean;
  errorMessage?: string;
  estimatedEcts: number;
  explanation: string;
}

export function calculateEctsByInstitutionFactor(input: InstitutionFactorInput): InstitutionFactorResult {
  const { localCredits, factor, institutionName, departmentName, sourceUrl } = input;

  if (isNaN(localCredits) || localCredits <= 0) {
    return {
      valid: false,
      errorMessage: "Local credits must be a positive number.",
      estimatedEcts: 0,
      explanation: "",
    };
  }

  if (isNaN(factor) || factor <= 0) {
    return {
      valid: false,
      errorMessage: "Conversion factor must be greater than zero.",
      estimatedEcts: 0,
      explanation: "",
    };
  }

  const estimatedEcts = Math.round(localCredits * factor * 10) / 10;

  return {
    valid: true,
    estimatedEcts,
    explanation: `Applied factor ${factor} specified by ${institutionName}${departmentName ? ` (${departmentName})` : ""}. Produces ~${estimatedEcts} ECTS from ${localCredits} Pakistani credits. ${sourceUrl ? `Source verified: ${sourceUrl}` : ""}`,
  };
}

/**
 * Subject-Wise Course Breakdown & ECTS Comparison
 */
export type CourseCategory =
  | "Computer Science"
  | "Mathematics"
  | "Software Engineering"
  | "Databases"
  | "Theoretical Computer Science"
  | "Information Security"
  | "Electrical / Hardware"
  | "Business & Management"
  | "General / Other";

export const SUBJECT_CATEGORIES: CourseCategory[] = [
  "Computer Science",
  "Mathematics",
  "Software Engineering",
  "Databases",
  "Theoretical Computer Science",
  "Information Security",
  "Electrical / Hardware",
  "Business & Management",
  "General / Other",
];

export interface CourseEntry {
  id: string;
  name: string;
  creditHours: number;
  semester: number;
  category: CourseCategory;
}

export interface TargetRequirement {
  category: CourseCategory;
  requiredEcts: number;
}

export interface CategoryBreakdown {
  category: CourseCategory;
  courses: CourseEntry[];
  totalLocalCredits: number;
  estimatedEcts: number;
  requiredEcts: number;
  gapOrSurplus: number; // positive = surplus, negative = gap
  satisfied: boolean;
}

export function analyzeSubjectBreakdown(
  courses: CourseEntry[],
  conversionFactor: number,
  requirements: TargetRequirement[]
): {
  totalLocalCredits: number;
  totalEstimatedEcts: number;
  categories: CategoryBreakdown[];
  overallDeficitCount: number;
} {
  const reqMap = new Map<CourseCategory, number>();
  for (const r of requirements) {
    reqMap.set(r.category, r.requiredEcts);
  }

  const courseMap = new Map<CourseCategory, CourseEntry[]>();
  for (const c of courses) {
    const list = courseMap.get(c.category) || [];
    list.push(c);
    courseMap.set(c.category, list);
  }

  let totalLocalCredits = 0;
  let totalEstimatedEcts = 0;
  let overallDeficitCount = 0;

  // Build breakdown for all categories that either have courses or have requirements
  const activeCategories = Array.from(
    new Set([...Array.from(courseMap.keys()), ...Array.from(reqMap.keys())])
  );

  const categories: CategoryBreakdown[] = activeCategories.map((cat) => {
    const catCourses = courseMap.get(cat) || [];
    const catLocalCredits = catCourses.reduce((sum, c) => sum + (c.creditHours || 0), 0);
    const catEcts = Math.round(catLocalCredits * conversionFactor * 10) / 10;
    const required = reqMap.get(cat) || 0;
    const gapOrSurplus = Math.round((catEcts - required) * 10) / 10;
    const satisfied = required === 0 || catEcts >= required;

    if (!satisfied) {
      overallDeficitCount++;
    }

    totalLocalCredits += catLocalCredits;
    totalEstimatedEcts += catEcts;

    return {
      category: cat,
      courses: catCourses,
      totalLocalCredits: catLocalCredits,
      estimatedEcts: catEcts,
      requiredEcts: required,
      gapOrSurplus,
      satisfied,
    };
  });

  // Sort: deficits first, then largest ECTS
  categories.sort((a, b) => {
    if (!a.satisfied && b.satisfied) return -1;
    if (a.satisfied && !b.satisfied) return 1;
    return b.estimatedEcts - a.estimatedEcts;
  });

  return {
    totalLocalCredits,
    totalEstimatedEcts: Math.round(totalEstimatedEcts * 10) / 10,
    categories,
    overallDeficitCount,
  };
}

