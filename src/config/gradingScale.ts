/**
 * gradingScale.ts — the single source of truth (`Grading_Scale_Config`).
 *
 * Every grade band, grade point, percentage threshold, credit hour, subject
 * definition, and (in later tasks) pass threshold / min-marks table / stream
 * eligibility rule lives here as a named constant. No literal grading value
 * appears anywhere else in the codebase (Requirement 2.1, 2.2).
 *
 * NEB SEE GPA methodology note: the official GPA weights *grade points*, not
 * raw marks. Each component (theory, practical) is converted to a percentage,
 * mapped to a discrete grade band, and the subject grade point is the weighted
 * average of the component grade points. Raw marks are never summed directly.
 *
 * Scope of this module section (task 2.1): config types and the grading +
 * subject constants. The GPA→letter mapping, pass thresholds, min-marks tables,
 * and stream rules are added by later tasks (2.2, 2.4).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The eight SEE 4.0 letter grades, highest to lowest. */
export type LetterGrade = "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "NG";

/**
 * Theory/practical split configuration flag. "50-50" drives Computer Science
 * behavior (Requirement 2.3, 6); behavior is always determined from this flag,
 * never by matching the subject name.
 */
export type SplitType = "75-25" | "50-50";

/**
 * Identifiers for the five subjects referenced by +2 stream eligibility rules
 * (Requirement 15.2). Compulsory subject ids reuse these values where they
 * overlap so eligibility lookups stay type-safe.
 */
export type RequiredSubjectId =
  | "english"
  | "nepali"
  | "socialStudies"
  | "math"
  | "science";

/**
 * One contiguous percentage band: lower inclusive, upper exclusive, except the
 * top band where upper is inclusive of 100 (handled by lookup).
 */
export interface GradeBand {
  grade: LetterGrade;
  gradePoint: number; // 0.0 .. 4.0
  minPercent: number; // inclusive lower bound
  maxPercent: number; // exclusive upper bound (top band inclusive of 100)
  description: string; // e.g. "Outstanding"
}

/** The full grading scale: ordered high -> low, contiguous and gap-free. */
export type GradingScale = GradeBand[];

/**
 * GPA -> letter band: contiguous, inclusive lower / exclusive upper, with the
 * top band inclusive of 4.00. Populated by task 2.2.
 */
export interface GpaLetterBand {
  grade: LetterGrade;
  minGpa: number; // inclusive
  maxGpa: number; // exclusive, top band inclusive of 4.00
}

/** A subject's static configuration. */
export interface SubjectDefinition {
  id: string;
  name: string;
  creditHours: number;
  splitType: SplitType; // "50-50" drives CS behavior (Req 2.3, 6) — never name matching
  theoryMax: number; // 75 standard, 50 for CS
  practicalMax: number; // 25 standard, 50 for CS
  isCompulsory: boolean;
  nameLocked: boolean; // compulsory => true
}

/** Per-stream +2 eligibility rules (constant `STREAM_RULES` added in task 2.4). */
export interface StreamEligibilityRules {
  stream: "Science" | "Management" | "Humanities";
  minGpa: number;
  /** per-subject minimum grade points, keyed by required-subject id */
  subjectMinGp: Partial<Record<RequiredSubjectId, number>>;
}

// ---------------------------------------------------------------------------
// Grading scale (Requirement 7.1)
// ---------------------------------------------------------------------------

/**
 * The SEE 4.0 grading scale, ordered high -> low. Bands are contiguous and
 * gap-free across [0, 100]: inclusive lower bound, exclusive upper bound,
 * except A+ whose upper bound is inclusive of 100.
 */
export const GRADING_SCALE: GradingScale = [
  { grade: "A+", gradePoint: 4.0, minPercent: 90, maxPercent: 100, description: "Outstanding" },
  { grade: "A", gradePoint: 3.6, minPercent: 80, maxPercent: 90, description: "Excellent" },
  { grade: "B+", gradePoint: 3.2, minPercent: 70, maxPercent: 80, description: "Very Good" },
  { grade: "B", gradePoint: 2.8, minPercent: 60, maxPercent: 70, description: "Good" },
  { grade: "C+", gradePoint: 2.4, minPercent: 50, maxPercent: 60, description: "Satisfactory" },
  { grade: "C", gradePoint: 2.0, minPercent: 40, maxPercent: 50, description: "Acceptable" },
  { grade: "D", gradePoint: 1.6, minPercent: 35, maxPercent: 40, description: "Partially Acceptable" },
  { grade: "NG", gradePoint: 0.0, minPercent: 0, maxPercent: 35, description: "Not Graded" },
];

// ---------------------------------------------------------------------------
// Subject maximums (Requirement 4.2, 6.1)
// ---------------------------------------------------------------------------

/** Standard subject component maximums (75/25 split). */
export const STANDARD_THEORY_MAX = 75;
export const STANDARD_PRACTICAL_MAX = 25;

/** Computer Science component maximums (50/50 split). */
export const CS_THEORY_MAX = 50;
export const CS_PRACTICAL_MAX = 50;

// ---------------------------------------------------------------------------
// Compulsory subjects (Requirement 4.1, 4.2)
// ---------------------------------------------------------------------------

/**
 * The six mandatory SEE subjects. All are compulsory, name-locked, and use the
 * standard 75/25 split. Ids reuse `RequiredSubjectId` values where they map to
 * an eligibility-required subject so downstream lookups stay type-safe.
 */
export const COMPULSORY_SUBJECTS: SubjectDefinition[] = [
  {
    id: "nepali",
    name: "Nepali",
    creditHours: 5,
    splitType: "75-25",
    theoryMax: STANDARD_THEORY_MAX,
    practicalMax: STANDARD_PRACTICAL_MAX,
    isCompulsory: true,
    nameLocked: true,
  },
  {
    id: "english",
    name: "English",
    creditHours: 5,
    splitType: "75-25",
    theoryMax: STANDARD_THEORY_MAX,
    practicalMax: STANDARD_PRACTICAL_MAX,
    isCompulsory: true,
    nameLocked: true,
  },
  {
    id: "math",
    name: "Mathematics",
    creditHours: 5,
    splitType: "75-25",
    theoryMax: STANDARD_THEORY_MAX,
    practicalMax: STANDARD_PRACTICAL_MAX,
    isCompulsory: true,
    nameLocked: true,
  },
  {
    id: "science",
    name: "Science and Technology",
    creditHours: 5,
    splitType: "75-25",
    theoryMax: STANDARD_THEORY_MAX,
    practicalMax: STANDARD_PRACTICAL_MAX,
    isCompulsory: true,
    nameLocked: true,
  },
  {
    id: "socialStudies",
    name: "Social Studies",
    creditHours: 4,
    splitType: "75-25",
    theoryMax: STANDARD_THEORY_MAX,
    practicalMax: STANDARD_PRACTICAL_MAX,
    isCompulsory: true,
    nameLocked: true,
  },
  {
    id: "health",
    name: "Health, Population & Environment",
    creditHours: 4,
    splitType: "75-25",
    theoryMax: STANDARD_THEORY_MAX,
    practicalMax: STANDARD_PRACTICAL_MAX,
    isCompulsory: true,
    nameLocked: true,
  },
];

// ---------------------------------------------------------------------------
// Optional subject quick-select (Requirement 5.1, 5.2)
// ---------------------------------------------------------------------------

/** Optional-I quick-select choices (CH 4). */
export const OPTIONAL_I_CHOICES = ["Optional Mathematics", "Economics"] as const;

/** Optional-II quick-select choices (CH 4). */
export const OPTIONAL_II_CHOICES = ["Accountancy", "Computer Science"] as const;

/** Default credit hours assigned to any added optional subject. */
export const DEFAULT_OPTIONAL_CH = 4;

/**
 * Per-choice split configuration for quick-select optional subjects. Computer
 * Science is the only optional subject that uses the 50/50 split (theory/
 * practical max 50); everything else uses the standard 75/25 split. Keeping
 * this in config means the island assigns `splitType` from here at creation
 * time and all later behavior reads the flag, never the name (Requirement 2.3,
 * 6.1).
 */
export const OPTIONAL_SUBJECT_SPLITS: Record<
  string,
  { splitType: SplitType; theoryMax: number; practicalMax: number }
> = {
  "Computer Science": {
    splitType: "50-50",
    theoryMax: CS_THEORY_MAX,
    practicalMax: CS_PRACTICAL_MAX,
  },
};

/** Split configuration used by any optional subject not listed above. */
export const DEFAULT_OPTIONAL_SPLIT: {
  splitType: SplitType;
  theoryMax: number;
  practicalMax: number;
} = {
  splitType: "75-25",
  theoryMax: STANDARD_THEORY_MAX,
  practicalMax: STANDARD_PRACTICAL_MAX,
};

// ---------------------------------------------------------------------------
// GPA -> letter mapping (Requirement 2.4, 2.5, 7.7)
// ---------------------------------------------------------------------------

/**
 * GPA-to-letter mapping bands, ordered high -> low. Bands are contiguous and
 * gap-free across [0, 4]: inclusive lower bound, exclusive upper bound, except
 * the top band (A+) whose upper bound is inclusive of 4.00 (Requirement 7.7,
 * e.g. GPA 3.60–4.00 maps to A+).
 *
 * Each band's lower bound is the grade point of the grade immediately below it
 * (A+ ≥ A's 3.6, A ≥ B+'s 3.2, ... C ≥ D's 1.6), matching the official NEB GPA
 * grade conversion. The lowest two bands split [0, 1.6): D covers 0.8–1.6 and
 * NG covers 0–0.8.
 */
export const GPA_LETTER_BANDS: GpaLetterBand[] = [
  { grade: "A+", minGpa: 3.6, maxGpa: 4.0 },
  { grade: "A", minGpa: 3.2, maxGpa: 3.6 },
  { grade: "B+", minGpa: 2.8, maxGpa: 3.2 },
  { grade: "B", minGpa: 2.4, maxGpa: 2.8 },
  { grade: "C+", minGpa: 2.0, maxGpa: 2.4 },
  { grade: "C", minGpa: 1.6, maxGpa: 2.0 },
  { grade: "D", minGpa: 0.8, maxGpa: 1.6 },
  { grade: "NG", minGpa: 0.0, maxGpa: 0.8 },
];

/**
 * Maps a numeric GPA to exactly one {@link LetterGrade} using
 * {@link GPA_LETTER_BANDS}. Pure and total: every real number resolves to a
 * single grade.
 *
 * The input is first clamped to [0, 4] (Requirement 2.5), then matched against
 * the bands from highest to lowest. Because bands are ordered high -> low and
 * each match requires `gpa >= minGpa`, the first matching band is returned,
 * giving inclusive-lower / exclusive-upper semantics with the top band (A+)
 * inclusive of 4.00 (Requirement 2.4, 7.7).
 *
 * @param gpa - numeric GPA; values outside [0, 4] are clamped to the nearest bound.
 * @returns the single mapped letter grade.
 */
export function gpaToLetter(gpa: number): LetterGrade {
  const clamped = Math.min(4, Math.max(0, gpa)); // clamp to [0, 4] (Req 2.5)
  for (const band of GPA_LETTER_BANDS) {
    if (clamped >= band.minGpa) {
      return band.grade;
    }
  }
  // Unreachable: the lowest band has minGpa 0 and the input is clamped to >= 0.
  return "NG";
}

// ---------------------------------------------------------------------------
// Pass-threshold constants (Requirement 8.1, 8.2, 8.3)
// ---------------------------------------------------------------------------

/**
 * A component percentage below this floor is "Not Graded" (NG) with grade
 * point 0.0 (Requirement 8.1). Mirrors the bottom of {@link GRADING_SCALE}.
 */
export const NG_PERCENT_FLOOR = 35;

/** Theory/practical minimum raw marks required to pass a single component. */
export interface PassThreshold {
  theoryMinMarks: number;
  practicalMinMarks: number;
}

/**
 * Per-split pass thresholds in raw marks (Requirement 8.2, 8.3). Keyed by
 * {@link SplitType}: "75-25" applies to standard subjects (theory /75,
 * practical /25); "50-50" applies to Computer Science (theory /50,
 * practical /50). A component below its threshold is flagged failing.
 */
export const PASS_THRESHOLDS: Record<SplitType, PassThreshold> = {
  "75-25": { theoryMinMarks: 27, practicalMinMarks: 9 }, // /75, /25 (Req 8.2)
  "50-50": { theoryMinMarks: 18, practicalMinMarks: 18 }, // /50, /50 (Req 8.3)
};

// ---------------------------------------------------------------------------
// Theory minimum-marks tables (Requirement 13.4, 13.5)
// ---------------------------------------------------------------------------

/** Letter grades that have a theory minimum-marks entry (NG has no floor). */
export type GradedLetter = Exclude<LetterGrade, "NG">;

/**
 * Minimum theory marks required to reach each grade, keyed by {@link SplitType}.
 * Stored explicitly for verification and display, but each value equals
 * `ceil(minPercent × theoryMax / 100)` for the matching band — "75-25" uses
 * theoryMax 75 (Requirement 13.4) and "50-50" uses theoryMax 50 for Computer
 * Science (Requirement 13.5). A unit test (task 2.5) asserts these literals
 * match the formula so the table can never silently drift from the scale.
 */
export const THEORY_MIN_MARKS: Record<SplitType, Record<GradedLetter, number>> = {
  "75-25": { "A+": 68, "A": 60, "B+": 53, "B": 45, "C+": 38, "C": 30, "D": 27 }, // /75
  "50-50": { "A+": 45, "A": 40, "B+": 35, "B": 30, "C+": 25, "C": 20, "D": 18 }, // /50 (CS)
};

/**
 * Non-NG letter grades ordered from lowest to highest grade point.
 * Used for grade navigation (next/prev grade lookups) in Plan Mode and solvers.
 */
export const GRADE_ORDER_ASC: readonly LetterGrade[] = [
  "D", "C", "C+", "B", "B+", "A", "A+",
] as const;

// ---------------------------------------------------------------------------
// Stream eligibility rules (Requirement 15.3)
// ---------------------------------------------------------------------------

/**
 * +2 stream eligibility rules. Each rule carries a minimum overall GPA and a
 * set of per-subject minimum grade points (numeric, compared numerically and
 * never as grade strings — Requirement 15.3). A stream qualifies only when the
 * overall GPA meets `minGpa` and every listed subject meets its minimum.
 */
export const STREAM_RULES: StreamEligibilityRules[] = [
  {
    stream: "Science",
    minGpa: 2.0,
    subjectMinGp: {
      science: 2.4,
      math: 2.4,
      english: 1.6,
      nepali: 1.6,
      socialStudies: 1.6,
    },
  },
  {
    stream: "Management",
    minGpa: 1.6,
    subjectMinGp: {
      english: 1.6,
      nepali: 1.6,
      math: 1.6,
      science: 1.6,
      socialStudies: 1.6,
    },
  },
  {
    stream: "Humanities",
    minGpa: 1.6,
    subjectMinGp: {
      english: 1.6,
      nepali: 1.6,
      socialStudies: 1.6,
    },
  },
];
