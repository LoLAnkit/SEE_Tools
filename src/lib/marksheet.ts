/**
 * marksheet.ts — pure marksheet builder for the SEE GPA Calculator.
 *
 * Produces a structured `Marksheet` from a list of `MarksheetSubject` inputs,
 * with one `MarksheetRow` per subject and a footer summarising the overall GPA,
 * letter grade, and pass/fail result (Requirement 17.3).
 *
 * All computation is delegated to the pure engine in `calc.ts`; all grading
 * constants come from the single config source of truth in `gradingScale.ts`.
 * No literal grade-point, percentage, or threshold values appear here
 * (Requirement 2.2).
 */

import {
  computeGpa,
  gradeComponentFromMarks,
  subjectGradePoint,
  type ScoredSubject,
} from "./calc";

import {
  gpaToLetter,
  type LetterGrade,
  type SplitType,
} from "../config/gradingScale";

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

/** Input shape for a single subject passed to `buildMarksheet`. */
export interface MarksheetSubject {
  id: string;
  name: string;
  creditHours: number;
  splitType: SplitType;
  theoryMax: number;
  practicalMax: number;
  /** null = not entered; treated as 0 for computation (Requirement 17.3) */
  theoryMarks: number | null;
  /** null = not entered; treated as 0 for computation (Requirement 17.3) */
  practicalMarks: number | null;
}

/** One row in the marksheet — mirrors the official SEE marksheet columns. */
export interface MarksheetRow {
  serial: number;
  subject: string;
  creditHours: number;
  theoryMarks: number | null;
  theoryGrade: LetterGrade;
  practicalMarks: number | null;
  practicalGrade: LetterGrade;
  finalGrade: LetterGrade;
  gradePoint: number;
  remark: "Passed" | "Not Passed";
}

/** Full marksheet: per-subject rows + overall footer. */
export interface Marksheet {
  rows: MarksheetRow[];
  gpa: number;
  letter: LetterGrade;
  result: "Passed" | "Not Passed";
}

// ---------------------------------------------------------------------------
// buildMarksheet
// ---------------------------------------------------------------------------

/**
 * Builds a complete `Marksheet` from an array of `MarksheetSubject` inputs.
 *
 * For each subject:
 * 1. Null marks are treated as 0 for computation purposes.
 * 2. Theory and practical components are each graded via
 *    {@link gradeComponentFromMarks}, extracting the letter grade for each.
 * 3. The unrounded subject grade point is computed via
 *    {@link subjectGradePoint}, then mapped to a letter via
 *    {@link gpaToLetter} to produce the `finalGrade` column (the letter that
 *    corresponds to the subject's own GP, as shown on the official NEB marksheet).
 * 4. `remark` is "Passed" unless either component is failing (`isNg` true).
 *
 * The footer GPA, letter, and pass/fail result come from a single call to
 * {@link computeGpa} over all subjects (Requirement 17.3).
 *
 * @param subjects - ordered list of subjects with marks and configuration.
 * @returns a `Marksheet` with one row per subject and a populated footer.
 */
export function buildMarksheet(subjects: MarksheetSubject[]): Marksheet {
  // Build ScoredSubject array, replacing null marks with 0
  const scored: ScoredSubject[] = subjects.map((s) => ({
    id: s.id,
    creditHours: s.creditHours,
    splitType: s.splitType,
    theoryMax: s.theoryMax,
    practicalMax: s.practicalMax,
    theoryMarks: s.theoryMarks ?? 0,
    practicalMarks: s.practicalMarks ?? 0,
  }));

  // Compute overall GPA (footer values + per-subject isNg flag)
  const gpaResult = computeGpa(scored);

  // Build one row per subject
  const rows: MarksheetRow[] = subjects.map((subject, index) => {
    const effectiveTheory = subject.theoryMarks ?? 0;
    const effectivePractical = subject.practicalMarks ?? 0;

    // Grade each component individually for the grade columns
    const theoryResult = gradeComponentFromMarks(
      effectiveTheory,
      subject.theoryMax,
      subject.splitType,
      true
    );
    const practicalResult = gradeComponentFromMarks(
      effectivePractical,
      subject.practicalMax,
      subject.splitType,
      false
    );

    // Subject grade point (unrounded) → map to letter for the Final Grade column
    const subjectGp = subjectGradePoint(
      theoryResult.gradePoint,
      practicalResult.gradePoint,
      subject.splitType
    );
    const finalGrade = gpaToLetter(subjectGp);

    // Per-subject pass/fail: use the isNg flag from the full GPA computation
    const subjectResult = gpaResult.perSubject[subject.id];
    const isNg = subjectResult?.isNg ?? (theoryResult.isFailing || practicalResult.isFailing);

    return {
      serial: index + 1,
      subject: subject.name,
      creditHours: subject.creditHours,
      theoryMarks: subject.theoryMarks,
      theoryGrade: theoryResult.grade,
      practicalMarks: subject.practicalMarks,
      practicalGrade: practicalResult.grade,
      finalGrade,
      gradePoint: subjectGp,
      remark: isNg ? "Not Passed" : "Passed",
    };
  });

  return {
    rows,
    gpa: gpaResult.gpa,
    letter: gpaResult.letter,
    result: gpaResult.passed ? "Passed" : "Not Passed",
  };
}
