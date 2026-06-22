/**
 * plan.ts — Plan Mode solver and grade ↔ minimum-marks conversion helpers.
 *
 * All helpers are pure and config-driven: no literal percentage thresholds or
 * mark values appear here (Requirement 2.2). Grading constants are imported
 * exclusively from the single source of truth (`gradingScale.ts`).
 *
 * Scope of this module section (task 5.1): the two low-level conversion helpers
 * `gradeToMinMarks` and `marksToGrade` that underpin the Plan Mode two-way sync
 * (Requirements 13.2, 13.3). The full plan solver is added in task 5.3.
 */

import {
  THEORY_MIN_MARKS,
  GRADING_SCALE,
  GRADE_ORDER_ASC,
  NG_PERCENT_FLOOR,
  type LetterGrade,
  type SplitType,
} from "../config/gradingScale";
import { computeGpa, type ScoredSubject } from "./calc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derives the {@link SplitType} from a theory maximum marks value.
 *
 * A `theoryMax` of exactly 50 indicates the 50-50 split used by Computer
 * Science; every other value (75 in the standard case) uses the 75-25 split.
 *
 * @param theoryMax - the configured maximum marks for the theory component.
 * @returns the corresponding split type key.
 */
function splitTypeFromMax(theoryMax: number): SplitType {
  return theoryMax === 50 ? "50-50" : "75-25";
}

// ---------------------------------------------------------------------------
// grade → minimum theory marks (Requirement 13.2, 13.4, 13.5)
// ---------------------------------------------------------------------------

/**
 * Returns the minimum theory marks required to reach `grade` in a subject
 * whose theory component has a maximum of `theoryMax`.
 *
 * The lookup is entirely config-driven via {@link THEORY_MIN_MARKS}: the split
 * type is derived from `theoryMax` (50 → "50-50", otherwise "75-25") and the
 * stored table value is returned directly. This guarantees that Plan Mode
 * always agrees with the calculation engine and config — no literals here.
 *
 * `NG` has no minimum-marks entry (falling below the D floor means NG, but
 * there is no positive target of NG). If `grade` is "NG" the function returns
 * 0 (i.e. any marks below D's floor yields NG).
 *
 * @param grade     - the target {@link LetterGrade}.
 * @param theoryMax - the subject's configured theory maximum (75 or 50).
 * @returns the minimum whole-number theory marks for that grade.
 */
export function gradeToMinMarks(grade: LetterGrade, theoryMax: number): number {
  if (grade === "NG") {
    return 0;
  }
  const splitType = splitTypeFromMax(theoryMax);
  return THEORY_MIN_MARKS[splitType][grade];
}

// ---------------------------------------------------------------------------
// theory marks → grade (Requirement 13.3)
// ---------------------------------------------------------------------------

/**
 * Converts raw theory marks to a {@link LetterGrade} using the same logic as
 * the main calculation engine — but without constructing a full
 * {@link ComponentResult}.
 *
 * Steps:
 * 1. Compute `percent = (marks / theoryMax) × 100`.
 * 2. If `percent < NG_PERCENT_FLOOR` (35 %), return "NG" (Requirement 8.1).
 * 3. Otherwise walk {@link GRADING_SCALE} (high → low) and return the grade of
 *    the first band where `percent >= band.minPercent`.
 *
 * All thresholds are imported from config; no literals appear here.
 *
 * @param marks     - raw theory marks obtained (0 … theoryMax).
 * @param theoryMax - the subject's configured theory maximum (75 or 50).
 * @returns the corresponding {@link LetterGrade}.
 */
export function marksToGrade(marks: number, theoryMax: number): LetterGrade {
  const percent = (marks / theoryMax) * 100;

  if (percent < NG_PERCENT_FLOOR) {
    return "NG";
  }

  for (const band of GRADING_SCALE) {
    if (percent >= band.minPercent) {
      return band.grade;
    }
  }

  // Unreachable: GRADING_SCALE covers the entire [0,100] range and we have
  // already handled the sub-NG_PERCENT_FLOOR case above.
  return "NG";
}

// ---------------------------------------------------------------------------
// Plan Mode — types (task 5.3)
// ---------------------------------------------------------------------------

/**
 * Per-subject input descriptor used by the plan solver.
 *
 * These fields mirror {@link ScoredSubject} but carry no marks — the solver
 * synthesises grades from the target GPA rather than from observed marks.
 */
export interface PlanSubject {
  id: string;
  creditHours: number;
  splitType: SplitType;
  theoryMax: number;
  practicalMax: number;
}

/**
 * Per-subject output row from the plan solver.
 *
 * - `theoryGrade`   — the solver's suggested theory grade.
 * - `practicalGrade`— always "A+" (locked per Requirement 12.3).
 * - `minTheoryMarks`— minimum marks to achieve `theoryGrade` for the subject's
 *                     `theoryMax`, computed via {@link gradeToMinMarks}.
 */
export interface PlanSubjectGrade {
  subjectId: string;
  theoryGrade: LetterGrade;
  practicalGrade: LetterGrade; // always "A+"
  minTheoryMarks: number;
}

/**
 * The result returned by {@link planForTarget}.
 *
 * - `suggestion` — one entry per input subject.
 * - `message`    — `null` (exact target achieved), or one of the three edge-case
 *                  notices described in Requirements 12.7, 12.8, 12.9.
 */
export interface PlanResult {
  suggestion: PlanSubjectGrade[];
  message: string | null;
}

// ---------------------------------------------------------------------------
// Internal helpers — grade ordering and grade point lookup
// ---------------------------------------------------------------------------

// GRADE_ORDER_ASC is imported from gradingScale.ts

/**
 * Returns the grade point for a given {@link LetterGrade} by looking it up in
 * {@link GRADING_SCALE}. Config-driven — no literals here (Requirement 2.2).
 */
function gpForGrade(grade: LetterGrade): number {
  const band = GRADING_SCALE.find((b) => b.grade === grade);
  return band?.gradePoint ?? 0;
}

/**
 * Returns the next grade above `grade` in {@link GRADE_ORDER}, or `null` if
 * the grade is already the maximum ("A+").
 */
function nextGradeUp(grade: LetterGrade): LetterGrade | null {
  const idx = GRADE_ORDER_ASC.indexOf(grade);
  if (idx === -1 || idx === GRADE_ORDER_ASC.length - 1) return null;
  return GRADE_ORDER_ASC[idx + 1];
}

/**
 * Snaps `gp` down to the nearest grade point in `GRADING_SCALE` whose grade
 * point is ≤ `gp` and whose grade is in {@link GRADE_ORDER} (i.e. not NG).
 *
 * If `gp` falls below the minimum valid grade point (D, 1.6), "D" is returned
 * as the floor (the plan never suggests NG).
 */
function snapDownToGrade(gp: number): LetterGrade {
  // Walk GRADE_ORDER_ASC highest-first to find the first grade whose gp ≤ target gp
  for (let i = GRADE_ORDER_ASC.length - 1; i >= 0; i--) {
    const candidate = GRADE_ORDER_ASC[i];
    if (gpForGrade(candidate) <= gp + 1e-9) {
      return candidate;
    }
  }
  // Below D's grade point — use D as floor
  return "D";
}

/**
 * Builds a {@link ScoredSubject} array from a theory grade per subject and a
 * fixed practical grade, so we can feed it to {@link computeGpa}.
 *
 * We convert each grade to the minimum marks for that grade so that
 * `computeGpa` (which operates on marks → percent → grade) reproduces the
 * same grade point we intended. For "A+", which has no minimum marks entry
 * that is strictly below the ceiling, we use the subject's `theoryMax` /
 * `practicalMax` directly (full marks guarantee A+).
 */
function buildScoredSubjects(
  subjects: PlanSubject[],
  theoryGrades: LetterGrade[],
  practicalGrade: LetterGrade = "A+",
): ScoredSubject[] {
  return subjects.map((s, i) => {
    // Theory marks: use min-marks for the grade, except for "NG" use 0
    const tg = theoryGrades[i];
    const theoryMarks =
      tg === "A+"
        ? s.theoryMax
        : tg === "NG"
          ? 0
          : gradeToMinMarks(tg, s.theoryMax);

    // Practical marks: always A+ → use full max
    const practicalMarks =
      practicalGrade === "A+" ? s.practicalMax : gradeToMinMarks(practicalGrade, s.practicalMax);

    return {
      id: s.id,
      creditHours: s.creditHours,
      splitType: s.splitType,
      theoryMax: s.theoryMax,
      practicalMax: s.practicalMax,
      theoryMarks,
      practicalMarks,
    };
  });
}

// ---------------------------------------------------------------------------
// planForTarget (Requirement 12)
// ---------------------------------------------------------------------------

/**
 * Produces a suggested grade assignment per subject that is expected to reach
 * or exceed `targetGpa` using discrete letter grades.
 *
 * ## Algorithm
 *
 * 1. **Edge: target ≤ 0 or ≤ minimum passing (1.60).**
 *    Assign "D" to all subjects.  Message: minimum-passing note (Req 12.8).
 *
 * 2. **Lock practicals at A+ (GP 4.0).**
 *    `practicalContribution = Σ(CH × 4.0 × practicalWeight)` where
 *    `practicalWeight` = 0.5 for "50-50", 0.25 for "75-25" (Req 12.3).
 *
 * 3. **Solve uniform theory GP.**
 *    `uniformGp = (targetGpa × totalCH − practicalContribution) / Σ(CH × theoryWeight)`
 *    where `theoryWeight` = 0.5 for "50-50", 0.75 for "75-25" (Req 12.4).
 *
 * 4. **Snap down** to the nearest discrete grade point ≤ uniformGp; assign to
 *    all subjects (Req 12.4).
 *
 * 5. **Greedy bump.** Raise the subject with the highest credit hours by one
 *    grade (ties: first in original order) and recompute GPA.  Repeat until GPA
 *    ≥ targetGpa or no subject can be raised (Req 12.5).
 *
 * 6. **Edge: all A+.**  If the bump loop ends with every subject at A+, add
 *    "Maximum achievable GPA is 4.00." message (Req 12.7).
 *
 * 7. **Exact vs estimate.**  If the achieved GPA does not match the target
 *    exactly, label as estimate (Req 12.9).  Exact match → `message = null`.
 *
 * @param subjects  - array of subjects to plan for (must be non-empty).
 * @param targetGpa - the desired GPA in [0, 4]; values > 4 are treated as 4.
 * @returns a {@link PlanResult} with per-subject grades and an optional message.
 */
export function planForTarget(
  subjects: PlanSubject[],
  targetGpa: number,
): PlanResult {
  // -------------------------------------------------------------------------
  // Guard: non-numeric or > 4.0 — spec says caller handles 12.6 (UI error)
  // but the function itself just clamps to a valid range and continues.
  // -------------------------------------------------------------------------
  if (!Number.isFinite(targetGpa) || targetGpa > 4.0) {
    // Clamp to 4.0 so we still produce the max-achievable suggestion
    targetGpa = 4.0;
  }

  const D_GP = gpForGrade("D");
  const totalCH = subjects.reduce((acc, s) => acc + s.creditHours, 0);

  // -------------------------------------------------------------------------
  // Edge: target at or below the minimum passing GPA (all D = 1.60) — Req 12.8
  // -------------------------------------------------------------------------
  if (targetGpa <= D_GP + 1e-9) {
    return buildResult(subjects, subjects.map(() => "D" as LetterGrade), {
      message:
        "Minimum passing suggestion: all subjects at grade D (GPA 1.60).",
    });
  }

  // -------------------------------------------------------------------------
  // Step 2: practical contribution (practicals locked at A+, GP 4.0)
  // -------------------------------------------------------------------------
  let practicalContribution = 0;
  let theoryCHWeightSum = 0;
  for (const s of subjects) {
    const practicalWeight = s.splitType === "50-50" ? 0.5 : 0.25;
    const theoryWeight = s.splitType === "50-50" ? 0.5 : 0.75;
    practicalContribution += s.creditHours * 4.0 * practicalWeight;
    theoryCHWeightSum += s.creditHours * theoryWeight;
  }

  // -------------------------------------------------------------------------
  // Step 3: solve uniform theory GP
  // -------------------------------------------------------------------------
  const uniformGp =
    (targetGpa * totalCH - practicalContribution) / theoryCHWeightSum;

  // -------------------------------------------------------------------------
  // Step 4: snap down to the nearest discrete grade ≤ uniformGp
  // -------------------------------------------------------------------------
  const baseGrade = snapDownToGrade(uniformGp);
  const grades: LetterGrade[] = subjects.map(() => baseGrade);

  // -------------------------------------------------------------------------
  // Step 5: greedy bump — raise the highest-CH subject that can still go up
  // -------------------------------------------------------------------------
  let currentGpa = computeCurrentGpa(subjects, grades);

  let improved = true;
  while (currentGpa < targetGpa - 1e-9 && improved) {
    improved = false;
    // Find the candidate: highest CH subject that can still be raised
    let bestIdx = -1;
    let bestCH = -1;
    for (let i = 0; i < subjects.length; i++) {
      if (nextGradeUp(grades[i]) !== null) {
        if (subjects[i].creditHours > bestCH) {
          bestCH = subjects[i].creditHours;
          bestIdx = i;
        }
      }
    }
    if (bestIdx !== -1) {
      grades[bestIdx] = nextGradeUp(grades[bestIdx]) as LetterGrade;
      currentGpa = computeCurrentGpa(subjects, grades);
      improved = true;
    }
  }

  // -------------------------------------------------------------------------
  // Step 6 / 7: determine message
  // -------------------------------------------------------------------------
  const allAPlus = grades.every((g) => g === "A+");

  let message: string | null = null;

  if (allAPlus) {
    // Req 12.7 — can only be reached if every subject is A+
    message = "Maximum achievable GPA is 4.00.";
  } else if (Math.abs(currentGpa - targetGpa) > 1e-9) {
    // Req 12.9 — exact target not achievable with discrete grades
    message = "Estimated: nearest achievable GPA at or above target.";
  }
  // else: exact target achieved → message = null (Req 12, exact case)

  return buildResult(subjects, grades, { message });
}

// ---------------------------------------------------------------------------
// Internal utility functions
// ---------------------------------------------------------------------------

/**
 * Computes the current GPA given a theory grade per subject (practicals locked
 * at A+). Uses {@link buildScoredSubjects} + {@link computeGpa} internally.
 */
function computeCurrentGpa(
  subjects: PlanSubject[],
  theoryGrades: LetterGrade[],
): number {
  const scored = buildScoredSubjects(subjects, theoryGrades, "A+");
  return computeGpa(scored).gpa;
}

/**
 * Assembles the final {@link PlanResult} from the solved grades.
 */
function buildResult(
  subjects: PlanSubject[],
  theoryGrades: LetterGrade[],
  { message }: { message: string | null },
): PlanResult {
  const suggestion: PlanSubjectGrade[] = subjects.map((s, i) => ({
    subjectId: s.id,
    theoryGrade: theoryGrades[i],
    practicalGrade: "A+" as LetterGrade,
    minTheoryMarks: gradeToMinMarks(theoryGrades[i], s.theoryMax),
  }));

  return { suggestion, message };
}
