/**
 * calc.ts — the pure SEE grading + GPA calculation engine.
 *
 * Every function here is pure and framework-agnostic: no React, no DOM, no I/O.
 * All grading thresholds are imported from the single source of truth
 * (`gradingScale.ts`); this module contains no literal grade-point,
 * percentage-range, or threshold values (Requirement 2.2).
 *
 * NEB SEE GPA methodology note: the official GPA weights *grade points*, not
 * raw marks. Each component (theory, practical) is converted to a percentage,
 * mapped to a discrete grade band, and the subject grade point is the weighted
 * average of the component grade points. The final GPA is the credit-hour-
 * weighted average of subject grade points. Raw marks are never summed or
 * averaged directly.
 *
 * Scope of this module section (task 3.1): the percentage conversion, the band
 * lookup, and the rounding helper. Component grading, subject grade point, and
 * the final GPA computation are added by later tasks (3.3, 3.7).
 */

import { GRADING_SCALE, type GradeBand } from "../config/gradingScale";

// ---------------------------------------------------------------------------
// Percentage conversion (Requirement 7.2)
// ---------------------------------------------------------------------------

/**
 * Converts raw component marks to a percentage as `(marks / max) × 100`.
 *
 * The result is intentionally left unrounded so the band lookup operates on the
 * full-precision value (Requirement 7.2). For well-formed inputs the value lies
 * within [0, 100]; this function does not clamp, but callers pass marks bounded
 * by the configured component maximum, so the natural range is [0, 100].
 *
 * @param marks - the raw marks obtained in the component.
 * @param max - the component's configured maximum (e.g. 75, 25, or 50).
 * @returns the unrounded percentage `(marks / max) × 100`.
 */
export function marksToPercent(marks: number, max: number): number {
  return (marks / max) * 100;
}

// ---------------------------------------------------------------------------
// Band lookup (Requirement 7.1, 7.2)
// ---------------------------------------------------------------------------

/**
 * Maps a percentage to its {@link GradeBand} via a contiguous lookup over
 * {@link GRADING_SCALE}.
 *
 * Bands use inclusive lower bound / exclusive upper bound semantics, except the
 * top band (A+) whose upper bound is inclusive of 100. Because the scale is
 * contiguous and gap-free across [0, 100] by construction, every percentage in
 * that range resolves to exactly one band. The scale is ordered high -> low, so
 * the first band satisfying the match condition is returned.
 *
 * Match condition for each band:
 *   `percent >= minPercent && (percent < maxPercent || (isTopBand && percent <= 100))`
 *
 * @param percent - the (typically unrounded) percentage to classify.
 * @returns the matching grade band.
 */
export function percentToBand(percent: number): GradeBand {
  for (let i = 0; i < GRADING_SCALE.length; i++) {
    const band = GRADING_SCALE[i];
    const isTopBand = i === 0;
    if (
      percent >= band.minPercent &&
      (percent < band.maxPercent || (isTopBand && percent <= 100))
    ) {
      return band;
    }
  }
  // Fallback: percentages below the lowest band's floor (e.g. negative inputs)
  // resolve to the lowest band (NG). The scale's last band has minPercent 0,
  // so well-formed inputs in [0, 100] never reach here.
  return GRADING_SCALE[GRADING_SCALE.length - 1];
}

// ---------------------------------------------------------------------------
// Rounding (Requirement 7.6)
// ---------------------------------------------------------------------------

/**
 * Rounds a number to 2 decimal places using round-half-away-from-zero
 * (round-half-up for positive values), as required for the final GPA
 * (Requirement 7.6).
 *
 * The implementation is epsilon-safe: scaling by 100 and rounding directly is
 * unreliable for values such as 2.675, which is stored as 2.67499999999... in
 * binary floating point and would otherwise round down. We scale by 100, nudge
 * by a tiny epsilon in the direction of the sign so genuine halves land on the
 * correct side, then `Math.round` and divide back by 100.
 *
 * @param x - the value to round.
 * @returns `x` rounded to 2 decimal places, half away from zero.
 */
export function roundHalfUp2(x: number): number {
  const EPSILON = 1e-8;
  const sign = x < 0 ? -1 : 1;
  const scaled = x * 100;
  const rounded = Math.round(scaled + sign * EPSILON);
  return rounded / 100;
}

// ---------------------------------------------------------------------------
// Component grading (Requirements 6.2, 6.4, 7.3, 7.4, 8.1, 8.2, 8.3)
// ---------------------------------------------------------------------------

import {
  PASS_THRESHOLDS,
  NG_PERCENT_FLOOR,
  type SplitType,
  type LetterGrade,
} from "../config/gradingScale";

/**
 * The result of grading a single exam component (theory or practical).
 */
export interface ComponentResult {
  grade: LetterGrade;
  gradePoint: number;
  isFailing: boolean;
}

/**
 * Grades a single component (theory or practical) from raw marks.
 *
 * 1. Converts `marks` to a percentage via {@link marksToPercent}.
 * 2. If the percentage is below {@link NG_PERCENT_FLOOR} (35 %), the component
 *    is "Not Graded" (NG, 0.0 GP, failing) regardless of raw marks (Req 8.1).
 * 3. Otherwise the band is looked up via {@link percentToBand} and the grade /
 *    grade-point are taken from it.
 * 4. The failing flag is set independently of the NG floor: a component where
 *    raw marks fall below the configured minimum marks threshold
 *    ({@link PASS_THRESHOLDS}[splitType].theoryMinMarks or practicalMinMarks)
 *    is also flagged failing (Req 8.2, 8.3).
 *
 * @param marks     - raw marks obtained (0 … max).
 * @param max       - maximum marks for this component.
 * @param splitType - "75-25" (standard) or "50-50" (Computer Science).
 * @param isTheory  - true for the theory component, false for practical.
 * @returns a {@link ComponentResult} with grade, grade point, and failing flag.
 */
export function gradeComponentFromMarks(
  marks: number,
  max: number,
  splitType: SplitType,
  isTheory: boolean
): ComponentResult {
  const percent = marksToPercent(marks, max);

  // NG floor: below 35 % → NG regardless of raw-mark threshold (Req 8.1)
  if (percent < NG_PERCENT_FLOOR) {
    return { grade: "NG", gradePoint: 0.0, isFailing: true };
  }

  const band = percentToBand(percent);

  // Raw-mark threshold check (Req 8.2, 8.3)
  const thresholds = PASS_THRESHOLDS[splitType];
  const minMarks = isTheory
    ? thresholds.theoryMinMarks
    : thresholds.practicalMinMarks;
  const isFailing = marks < minMarks;

  return { grade: band.grade, gradePoint: band.gradePoint, isFailing };
}

// ---------------------------------------------------------------------------
// Subject grade point (Requirements 6.2, 7.3, 7.4)
// ---------------------------------------------------------------------------

/**
 * Computes the weighted subject grade point from the theory and practical
 * component grade points.
 *
 * - "75-25" (standard):  `theoryGp × 0.75 + practicalGp × 0.25`
 * - "50-50" (CS):        `theoryGp × 0.50 + practicalGp × 0.50`
 *
 * The result is intentionally left unrounded; callers apply rounding when
 * computing the final GPA (Requirement 7.6).
 *
 * @param theoryGp    - grade point for the theory component.
 * @param practicalGp - grade point for the practical component.
 * @param splitType   - weighting scheme derived from the subject's configuration.
 * @returns the unrounded weighted subject grade point.
 */
export function subjectGradePoint(
  theoryGp: number,
  practicalGp: number,
  splitType: SplitType
): number {
  if (splitType === "50-50") {
    return theoryGp * 0.5 + practicalGp * 0.5;
  }
  // "75-25"
  return theoryGp * 0.75 + practicalGp * 0.25;
}

// ---------------------------------------------------------------------------
// Final GPA computation (Requirements 7.5, 7.6, 8.5)
// ---------------------------------------------------------------------------

import { gpaToLetter } from "../config/gradingScale";

/** The input shape for computeGpa — one scored subject row. */
export interface ScoredSubject {
  id: string;
  creditHours: number;
  splitType: SplitType;
  theoryMax: number;
  practicalMax: number;
  theoryMarks: number;
  practicalMarks: number;
}

/** The result of grading a single subject (both components + weighted GP). */
export interface SubjectResult {
  subjectGp: number;         // unrounded weighted subject grade point
  theory: ComponentResult;
  practical: ComponentResult;
  isNg: boolean;             // true if any component is NG or failing
}

/** The overall GPA result returned by computeGpa. */
export interface GpaResult {
  gpa: number;               // rounded to 2dp, round-half-up
  letter: LetterGrade;
  passed: boolean;           // false if any subject has isNg (Req 8.5)
  perSubject: Record<string, SubjectResult>;
}

/**
 * Computes the final GPA for a collection of scored subjects.
 *
 * Algorithm (Requirements 7.5, 7.6, 8.5):
 * 1. For each subject, grade both components via {@link gradeComponentFromMarks}.
 * 2. Compute the unrounded subject grade point via {@link subjectGradePoint}.
 * 3. Accumulate the credit-hour-weighted sum of subject grade points and total
 *    credit hours using full-precision (unrounded) subject grade points (Req 7.5).
 * 4. Divide the weighted sum by the total credit hours and round the result to
 *    2 decimal places with {@link roundHalfUp2} (Req 7.6).
 * 5. Map the rounded GPA to a letter grade via {@link gpaToLetter}.
 * 6. `passed` is false if *any* subject's `isNg` flag is true (Req 8.5).
 *
 * If `subjects` is empty the GPA is 0.00, the letter is "NG", and passed is true
 * (no failing subject exists).
 *
 * @param subjects - array of subjects with marks and configuration.
 * @returns a {@link GpaResult} with the rounded GPA, mapped letter, pass flag,
 *          and per-subject detail records.
 */
export function computeGpa(subjects: ScoredSubject[]): GpaResult {
  const perSubject: Record<string, SubjectResult> = {};

  let weightedSum = 0;
  let totalCreditHours = 0;
  let anyNg = false;

  for (const subject of subjects) {
    const theory = gradeComponentFromMarks(
      subject.theoryMarks,
      subject.theoryMax,
      subject.splitType,
      true
    );
    const practical = gradeComponentFromMarks(
      subject.practicalMarks,
      subject.practicalMax,
      subject.splitType,
      false
    );

    // Unrounded weighted subject grade point (Req 7.5)
    const subjectGp = subjectGradePoint(
      theory.gradePoint,
      practical.gradePoint,
      subject.splitType
    );

    const isNg = theory.isFailing || practical.isFailing;

    perSubject[subject.id] = { subjectGp, theory, practical, isNg };

    // Accumulate weighted sum with full-precision intermediates (Req 7.5)
    weightedSum += subject.creditHours * subjectGp;
    totalCreditHours += subject.creditHours;

    if (isNg) {
      anyNg = true;
    }
  }

  // Avoid division by zero for an empty subject list
  const rawGpa = totalCreditHours > 0 ? weightedSum / totalCreditHours : 0;

  // Round final GPA to 2dp with round-half-up (Req 7.6)
  const gpa = roundHalfUp2(rawGpa);

  const letter = gpaToLetter(gpa);

  // passed is false if any subject is NG / failing (Req 8.5)
  const passed = !anyNg;

  return { gpa, letter, passed, perSubject };
}
