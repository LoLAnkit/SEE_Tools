/**
 * eligibility.ts — pure +2 stream eligibility evaluator.
 *
 * Evaluates which of the three NEB +2 streams (Science, Management, Humanities)
 * a student qualifies for, based on their overall GPA and per-subject grade
 * points (Requirements 15.3–15.7, 15.12).
 *
 * All thresholds are read from `STREAM_RULES` in the single config source of
 * truth; no literal grade-point values appear here (Requirement 2.2). Comparison
 * is always numeric GP vs numeric GP, never grade string comparison (Req 15.3).
 */

import {
  GRADING_SCALE,
  STREAM_RULES,
  type LetterGrade,
  type RequiredSubjectId,
} from "../config/gradingScale";

// ---------------------------------------------------------------------------
// Required subject IDs (used by validation)
// ---------------------------------------------------------------------------

/** The five required subject IDs that must be present for a full eligibility check. */
const REQUIRED_SUBJECT_IDS: RequiredSubjectId[] = [
  "english",
  "nepali",
  "socialStudies",
  "math",
  "science",
];

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type { RequiredSubjectId };

/** Per-stream eligibility verdict with per-check detail. */
export interface StreamVerdict {
  stream: "Science" | "Management" | "Humanities";
  passed: boolean;
  checks: {
    label: string;
    required: number;
    actual: number;
    pass: boolean;
  }[];
}

/** Full eligibility result: qualifying streams and per-stream detail. */
export interface EligibilityResult {
  qualifying: StreamVerdict["stream"][];
  details: StreamVerdict[];
}

// ---------------------------------------------------------------------------
// GP lookup helper
// ---------------------------------------------------------------------------

/**
 * Look up the numeric grade point for a given letter grade string.
 * If `grade` is `""` or `undefined`, returns 0 (no grade entered = 0 GP).
 */
function gradeToGp(grade: LetterGrade | "" | undefined): number {
  if (!grade) return 0;
  const band = GRADING_SCALE.find((b) => b.grade === grade);
  return band ? band.gradePoint : 0;
}

// ---------------------------------------------------------------------------
// Subject display name mapping
// ---------------------------------------------------------------------------

/** Human-readable label for each required-subject id, used in check labels. */
const SUBJECT_LABELS: Record<RequiredSubjectId, string> = {
  english: "English",
  nepali: "Nepali",
  socialStudies: "Social Studies",
  math: "Mathematics",
  science: "Science",
};

// ---------------------------------------------------------------------------
// evaluateEligibility
// ---------------------------------------------------------------------------

/**
 * Evaluates +2 stream eligibility for all three streams.
 *
 * For each stream rule in `STREAM_RULES`:
 * 1. Checks the overall GPA against `rule.minGpa`.
 * 2. For each subject listed in `rule.subjectMinGp`, looks up the student's
 *    letter grade's numeric GP (0 if grade is "" or missing) and checks it
 *    against the required minimum GP.
 * 3. A stream passes only when **all** checks pass (Req 15.4–15.6).
 *
 * `qualifying` contains only the streams that passed (Req 15.7). If none pass,
 * `qualifying` is empty and the UI should display a "no stream qualifies"
 * message (Req 15.12).
 *
 * @param gpa    - the student's overall numeric GPA (0.0–4.0).
 * @param grades - per-subject letter grade selections, keyed by required-subject
 *                 id. A missing key or `""` value is treated as 0 GP.
 * @returns an `EligibilityResult` with per-stream verdicts and a qualifying list.
 */
export function evaluateEligibility(
  gpa: number,
  grades: Partial<Record<RequiredSubjectId, LetterGrade | "">>
): EligibilityResult {
  const details: StreamVerdict[] = [];

  for (const rule of STREAM_RULES) {
    const checks: StreamVerdict["checks"] = [];

    // 1. Overall GPA check
    checks.push({
      label: "Overall GPA",
      required: rule.minGpa,
      actual: gpa,
      pass: gpa >= rule.minGpa,
    });

    // 2. Per-subject GP checks
    for (const [subjectId, requiredGp] of Object.entries(rule.subjectMinGp) as [
      RequiredSubjectId,
      number
    ][]) {
      const letterGrade = grades[subjectId];
      const actualGp = gradeToGp(letterGrade);
      checks.push({
        label: SUBJECT_LABELS[subjectId] ?? subjectId,
        required: requiredGp,
        actual: actualGp,
        pass: actualGp >= requiredGp,
      });
    }

    // 3. Stream passes only when all checks pass
    const passed = checks.every((c) => c.pass);

    details.push({ stream: rule.stream, passed, checks });
  }

  // 4. Collect qualifying streams (Req 15.7)
  const qualifying = details
    .filter((v) => v.passed)
    .map((v) => v.stream);

  return { qualifying, details };
}

// ---------------------------------------------------------------------------
// validateRequiredGrades (Requirement 15.11)
// ---------------------------------------------------------------------------

/**
 * Validates that all five required subjects have a non-empty grade selected.
 *
 * The UI must call this before displaying an eligibility verdict. If any of
 * the five required subjects (english, nepali, socialStudies, math, science)
 * is missing or `""`, the function returns `valid: false` and lists every
 * missing subject id so the UI can display a targeted error message
 * (Requirement 15.11).
 *
 * @param grades - per-subject grade selections, keyed by required-subject id.
 * @returns `{ valid: true, missing: [] }` when all five subjects have a grade,
 *          or `{ valid: false, missing: [...] }` with the missing ids listed.
 */
export function validateRequiredGrades(
  grades: Partial<Record<RequiredSubjectId, LetterGrade | "">>
): { valid: boolean; missing: RequiredSubjectId[] } {
  const missing = REQUIRED_SUBJECT_IDS.filter(
    (id) => !grades[id]  // catches undefined and ""
  );
  return { valid: missing.length === 0, missing };
}
