/**
 * plan.test.ts — Property-based tests for grade ↔ minimum-marks conversion helpers.
 *
 * **Property 8: Target grade and minimum theory marks are consistent round-trips**
 * **Validates: Requirements 13.2, 13.3**
 *
 * Two round-trip properties are verified:
 *
 * 1. grade → minMarks → grade: `marksToGrade(gradeToMinMarks(grade, max), max) === grade`
 *    For every grade A+ through D (excluding NG, which has no min-marks entry)
 *    and both theoryMax values (75 and 50).
 *
 * 2. marks → grade → minMarks: `gradeToMinMarks(marksToGrade(marks, max), max) <= marks`
 *    The minimum marks for the derived grade is ≤ the input marks.
 *    For marks in [27..75] (theoryMax=75) and [18..50] (theoryMax=50).
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { gradeToMinMarks, marksToGrade, planForTarget } from "./plan";
import type { PlanSubject } from "./plan";
import {
  GRADING_SCALE,
  type LetterGrade,
  THEORY_MIN_MARKS,
} from "../config/gradingScale";

// ---------------------------------------------------------------------------
// Derived constants from config — no literals here
// ---------------------------------------------------------------------------

/** All grades that have a THEORY_MIN_MARKS entry (i.e. A+ through D, not NG). */
const GRADED_LETTERS = Object.keys(THEORY_MIN_MARKS["75-25"]) as Array<
  Exclude<LetterGrade, "NG">
>;

/** The two supported theory maximums. */
const THEORY_MAX_VALUES = [75, 50] as const;

/** Pass-floor for each theoryMax, sourced from config (35% of max). */
const PASS_FLOOR: Record<number, number> = {
  75: THEORY_MIN_MARKS["75-25"]["D"], // 27
  50: THEORY_MIN_MARKS["50-50"]["D"], // 18
};

// ---------------------------------------------------------------------------
// Property 8
// ---------------------------------------------------------------------------

describe("Property 8: Target grade and minimum theory marks are consistent round-trips", () => {
  /**
   * Round-trip A: grade → minMarks → grade
   *
   * For every A+…D grade and both supported theoryMax values, converting a
   * grade to its minimum marks and back should return the original grade.
   */
  it("round-trip A: marksToGrade(gradeToMinMarks(grade, max), max) === grade", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...GRADED_LETTERS),
        fc.constantFrom(...THEORY_MAX_VALUES),
        (grade, theoryMax) => {
          const minMarks = gradeToMinMarks(grade, theoryMax);
          const derivedGrade = marksToGrade(minMarks, theoryMax);
          return derivedGrade === grade;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Round-trip B: marks → grade → minMarks
   *
   * For any marks at or above the pass floor (so no NG grade), the minimum
   * marks for the derived grade must be ≤ the input marks. This is the
   * "idempotent floor" property: snapping to the band floor never exceeds
   * the original marks.
   */
  it("round-trip B: gradeToMinMarks(marksToGrade(marks, 75), 75) <= marks for marks in [27..75]", () => {
    const floor75 = PASS_FLOOR[75];
    fc.assert(
      fc.property(
        fc.integer({ min: floor75, max: 75 }),
        (marks) => {
          const grade = marksToGrade(marks, 75);
          const minMarks = gradeToMinMarks(grade, 75);
          return minMarks <= marks;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("round-trip B: gradeToMinMarks(marksToGrade(marks, 50), 50) <= marks for marks in [18..50]", () => {
    const floor50 = PASS_FLOOR[50];
    fc.assert(
      fc.property(
        fc.integer({ min: floor50, max: 50 }),
        (marks) => {
          const grade = marksToGrade(marks, 50);
          const minMarks = gradeToMinMarks(grade, 50);
          return minMarks <= marks;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests for planForTarget edge cases (Requirements 12.6, 12.7, 12.8)
// ---------------------------------------------------------------------------

/**
 * 6 standard compulsory subjects (CH 5,5,5,5,4,4; splitType "75-25";
 * theoryMax 75, practicalMax 25). Used as the canonical test fixture for all
 * planForTarget edge-case tests.
 */
const STANDARD_SUBJECTS: PlanSubject[] = [
  { id: "s1", creditHours: 5, splitType: "75-25", theoryMax: 75, practicalMax: 25 },
  { id: "s2", creditHours: 5, splitType: "75-25", theoryMax: 75, practicalMax: 25 },
  { id: "s3", creditHours: 5, splitType: "75-25", theoryMax: 75, practicalMax: 25 },
  { id: "s4", creditHours: 5, splitType: "75-25", theoryMax: 75, practicalMax: 25 },
  { id: "s5", creditHours: 4, splitType: "75-25", theoryMax: 75, practicalMax: 25 },
  { id: "s6", creditHours: 4, splitType: "75-25", theoryMax: 75, practicalMax: 25 },
];

describe("planForTarget — edge cases", () => {
  // -------------------------------------------------------------------------
  // Requirement 12.7 — target = 4.0 → all A+ with "Maximum achievable" message
  // -------------------------------------------------------------------------
  describe("Req 12.7: target = 4.0 (maximum GPA)", () => {
    it("assigns A+ to every subject when target is 4.0", () => {
      const result = planForTarget(STANDARD_SUBJECTS, 4.0);

      for (const row of result.suggestion) {
        expect(row.theoryGrade).toBe("A+");
      }
    });

    it("includes 'Maximum achievable' in the message when target is 4.0", () => {
      const result = planForTarget(STANDARD_SUBJECTS, 4.0);

      expect(result.message).not.toBeNull();
      expect(result.message).toContain("Maximum achievable");
    });

    it("returns a suggestion entry for each subject when target is 4.0", () => {
      const result = planForTarget(STANDARD_SUBJECTS, 4.0);

      expect(result.suggestion).toHaveLength(STANDARD_SUBJECTS.length);
    });
  });

  // -------------------------------------------------------------------------
  // Requirement 12.8 — target ≤ 1.6 (D floor) → all D with "Minimum passing"
  // -------------------------------------------------------------------------
  describe("Req 12.8: target ≤ 1.6 (minimum passing GPA)", () => {
    it("assigns D to every subject when target is exactly 1.6", () => {
      const result = planForTarget(STANDARD_SUBJECTS, 1.6);

      for (const row of result.suggestion) {
        expect(row.theoryGrade).toBe("D");
      }
    });

    it("includes 'Minimum passing' in the message when target is 1.6", () => {
      const result = planForTarget(STANDARD_SUBJECTS, 1.6);

      expect(result.message).not.toBeNull();
      expect(result.message).toContain("Minimum passing");
    });

    it("assigns D to every subject when target is 0.0", () => {
      const result = planForTarget(STANDARD_SUBJECTS, 0.0);

      for (const row of result.suggestion) {
        expect(row.theoryGrade).toBe("D");
      }
    });

    it("includes 'Minimum passing' in the message when target is 0.0", () => {
      const result = planForTarget(STANDARD_SUBJECTS, 0.0);

      expect(result.message).not.toBeNull();
      expect(result.message).toContain("Minimum passing");
    });
  });

  // -------------------------------------------------------------------------
  // Requirement 12.6 — target > 4.0 → clamped to 4.0 (all A+, max message)
  // -------------------------------------------------------------------------
  describe("Req 12.6: target > 4.0 (clamped to 4.0)", () => {
    it("clamps target 4.5 to 4.0 — assigns A+ to every subject", () => {
      const result = planForTarget(STANDARD_SUBJECTS, 4.5);

      for (const row of result.suggestion) {
        expect(row.theoryGrade).toBe("A+");
      }
    });

    it("clamps target 4.5 to 4.0 — includes 'Maximum achievable' in message", () => {
      const result = planForTarget(STANDARD_SUBJECTS, 4.5);

      expect(result.message).not.toBeNull();
      expect(result.message).toContain("Maximum achievable");
    });

    it("clamps Infinity to 4.0 — assigns A+ to every subject", () => {
      const result = planForTarget(STANDARD_SUBJECTS, Infinity);

      for (const row of result.suggestion) {
        expect(row.theoryGrade).toBe("A+");
      }
    });

    it("clamps Infinity to 4.0 — includes 'Maximum achievable' in message", () => {
      const result = planForTarget(STANDARD_SUBJECTS, Infinity);

      expect(result.message).not.toBeNull();
      expect(result.message).toContain("Maximum achievable");
    });
  });
});

// ---------------------------------------------------------------------------
// Property 10
// ---------------------------------------------------------------------------

/**
 * **Property 10: The plan solver reaches the target with valid discrete grades and locked practicals**
 * **Validates: Requirements 12.3, 12.4, 12.5, 12.9**
 *
 * For any target GPA in [1.6, 4.0] and a representative set of subjects:
 *
 * 1. All `practicalGrade` fields in the suggestion are "A+" (locked practicals, Req 12.3).
 * 2. The actual GPA computed from the `minTheoryMarks` of the suggestion is ≥ targetGpa − 0.01
 *    (achieves or slightly exceeds target due to discrete rounding, Req 12.4, 12.5, 12.9).
 * 3. All `theoryGrade` values are valid LetterGrades from D through A+ (never "NG") when
 *    target > 1.6 (Req 12.4).
 * 4. For target = 4.0, all theory grades must be "A+" (Req 12.4, 12.5).
 */

import { computeGpa, type ScoredSubject } from "./calc";
import {
  COMPULSORY_SUBJECTS,
  type SplitType,
} from "../config/gradingScale";
import type { PlanSubjectGrade } from "./plan";

/** Valid non-NG theory grades (D through A+). */
const VALID_THEORY_GRADES = GRADING_SCALE.filter((b) => b.grade !== "NG").map(
  (b) => b.grade
);

/**
 * A representative set of PlanSubjects mirroring the six compulsory subjects.
 * Uses config constants to avoid any literals.
 */
const REPRESENTATIVE_SUBJECTS: PlanSubject[] = COMPULSORY_SUBJECTS.map((s) => ({
  id: s.id,
  creditHours: s.creditHours,
  splitType: s.splitType as SplitType,
  theoryMax: s.theoryMax,
  practicalMax: s.practicalMax,
}));

/**
 * Rebuilds `ScoredSubject[]` from a plan suggestion so we can verify the GPA
 * via `computeGpa`. Theory marks come from `minTheoryMarks`; practical is
 * always A+ so we use the subject's `practicalMax`.
 */
function suggestionToScoredSubjects(
  subjects: PlanSubject[],
  suggestion: PlanSubjectGrade[]
): ScoredSubject[] {
  return subjects.map((s, i) => {
    const row = suggestion[i];
    return {
      id: s.id,
      creditHours: s.creditHours,
      splitType: s.splitType,
      theoryMax: s.theoryMax,
      practicalMax: s.practicalMax,
      theoryMarks: row.minTheoryMarks,
      practicalMarks: s.practicalMax, // A+ practical = full marks
    };
  });
}

describe("Property 10: The plan solver reaches the target with valid discrete grades and locked practicals", () => {
  /**
   * Sub-property 10a: practicals are always locked at A+
   */
  it("10a: all practicalGrade values in the suggestion are 'A+'", () => {
    fc.assert(
      fc.property(
        // Target GPA in [1.6, 4.0] as a float with 1 decimal precision
        fc.integer({ min: 16, max: 40 }).map((n) => n / 10),
        (targetGpa) => {
          const result = planForTarget(REPRESENTATIVE_SUBJECTS, targetGpa);
          return result.suggestion.every((row) => row.practicalGrade === "A+");
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Sub-property 10b: the GPA computed from the suggestion is ≥ targetGpa − 0.01
   * (achieves or closely exceeds target due to discrete grade rounding).
   */
  it("10b: computed GPA from suggestion is >= targetGpa - 0.01", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 16, max: 40 }).map((n) => n / 10),
        (targetGpa) => {
          const result = planForTarget(REPRESENTATIVE_SUBJECTS, targetGpa);
          const scored = suggestionToScoredSubjects(
            REPRESENTATIVE_SUBJECTS,
            result.suggestion
          );
          const { gpa } = computeGpa(scored);
          return gpa >= targetGpa - 0.01;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Sub-property 10c: all theory grades are valid (D through A+, never NG)
   * for target GPA strictly above the minimum passing threshold (1.6).
   */
  it("10c: all theoryGrade values are valid (D..A+, never NG) for target > 1.6", () => {
    fc.assert(
      fc.property(
        // Exclude 1.6 itself (17..40 gives 1.7..4.0)
        fc.integer({ min: 17, max: 40 }).map((n) => n / 10),
        (targetGpa) => {
          const result = planForTarget(REPRESENTATIVE_SUBJECTS, targetGpa);
          return result.suggestion.every((row) =>
            VALID_THEORY_GRADES.includes(row.theoryGrade)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Sub-property 10d: for target = 4.0, all theory grades must be "A+".
   */
  it("10d: for target = 4.0, all theory grades are 'A+'", () => {
    const result = planForTarget(REPRESENTATIVE_SUBJECTS, 4.0);
    result.suggestion.forEach((row) => {
      expect(row.theoryGrade).toBe("A+");
    });
  });
});
