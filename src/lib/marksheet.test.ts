/**
 * Property test for marksheet completeness (task 7.2).
 *
 * Property 13: The marksheet is complete and consistent with the computed GPA.
 * Validates: Requirements 17.3
 *
 * Four properties checked:
 * 1. The marksheet has the same number of rows as subjects.
 * 2. Each row's serial number equals its 1-based index.
 * 3. The marksheet's footer GPA equals the GPA computed by `computeGpa` for the same subjects.
 * 4. The marksheet's footer result is "Passed" iff all rows have remark "Passed".
 */

import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { buildMarksheet, type MarksheetSubject } from "./marksheet";
import { computeGpa, type ScoredSubject } from "./calc";
import type { SplitType } from "../config/gradingScale";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Builds a fast-check arbitrary for a MarksheetSubject. The marks
 * are constrained to [0, max] so inputs are always well-formed.
 */
const marksheetSubjectArb: fc.Arbitrary<MarksheetSubject> = fc
  .record({
    splitType: fc.constantFrom<SplitType>("75-25", "50-50"),
  })
  .chain(({ splitType }) => {
    const theoryMax = splitType === "50-50" ? 50 : 75;
    const practicalMax = splitType === "50-50" ? 50 : 25;

    return fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 40 }),
      creditHours: fc.integer({ min: 1, max: 6 }),
      splitType: fc.constant(splitType),
      theoryMax: fc.constant(theoryMax),
      practicalMax: fc.constant(practicalMax),
      // null represents "not entered"; allowed per Requirement 17.3
      theoryMarks: fc.oneof(
        fc.constant(null),
        fc.integer({ min: 0, max: theoryMax }),
      ),
      practicalMarks: fc.oneof(
        fc.constant(null),
        fc.integer({ min: 0, max: practicalMax }),
      ),
    });
  });

/** An array of 1–8 MarksheetSubjects, all with distinct ids. */
const subjectsArb: fc.Arbitrary<MarksheetSubject[]> = fc
  .array(marksheetSubjectArb, { minLength: 1, maxLength: 8 })
  .filter((subjects) => {
    // ids must be unique so perSubject keying in computeGpa stays consistent
    const ids = subjects.map((s) => s.id);
    return new Set(ids).size === ids.length;
  });

// ---------------------------------------------------------------------------
// Property 13
// ---------------------------------------------------------------------------

describe("buildMarksheet — Property 13: marksheet is complete and consistent with computeGpa", () => {
  it("(13a) marksheet row count equals the number of input subjects", () => {
    /**
     * Validates: Requirements 17.3
     *
     * buildMarksheet must produce exactly one row per subject — no rows dropped,
     * no phantom rows added.
     */
    fc.assert(
      fc.property(subjectsArb, (subjects) => {
        const marksheet = buildMarksheet(subjects);
        expect(marksheet.rows).toHaveLength(subjects.length);
      }),
      { numRuns: 100 },
    );
  });

  it("(13b) each row's serial number equals its 1-based position", () => {
    /**
     * Validates: Requirements 17.3
     *
     * The serial column on an official NEB marksheet numbers subjects
     * sequentially from 1. Row at index i (0-based) must have serial i + 1.
     */
    fc.assert(
      fc.property(subjectsArb, (subjects) => {
        const { rows } = buildMarksheet(subjects);
        rows.forEach((row, index) => {
          expect(row.serial).toBe(index + 1);
        });
      }),
      { numRuns: 100 },
    );
  });

  it("(13c) marksheet footer GPA equals the GPA from computeGpa for the same subjects", () => {
    /**
     * Validates: Requirements 17.3
     *
     * buildMarksheet must delegate GPA computation to computeGpa and expose its
     * result verbatim in the footer. The test re-runs computeGpa independently
     * and compares the two figures, confirming there is no separate (potentially
     * divergent) GPA calculation inside the marksheet builder.
     *
     * Null marks are treated as 0 in both paths (Requirement 17.3).
     */
    fc.assert(
      fc.property(subjectsArb, (subjects) => {
        const marksheet = buildMarksheet(subjects);

        // Replicate the null→0 substitution that buildMarksheet performs
        const scored: ScoredSubject[] = subjects.map((s) => ({
          id: s.id,
          creditHours: s.creditHours,
          splitType: s.splitType,
          theoryMax: s.theoryMax,
          practicalMax: s.practicalMax,
          theoryMarks: s.theoryMarks ?? 0,
          practicalMarks: s.practicalMarks ?? 0,
        }));

        const expected = computeGpa(scored);

        expect(marksheet.gpa).toBe(expected.gpa);
        expect(marksheet.letter).toBe(expected.letter);
      }),
      { numRuns: 100 },
    );
  });

  it('(13d) footer result is "Passed" iff every row\'s remark is "Passed"', () => {
    /**
     * Validates: Requirements 17.3
     *
     * The overall result in the footer must be "Passed" if and only if all
     * per-subject rows pass. A single "Not Passed" row must flip the footer
     * result to "Not Passed".
     */
    fc.assert(
      fc.property(subjectsArb, (subjects) => {
        const marksheet = buildMarksheet(subjects);

        const allRowsPassed = marksheet.rows.every(
          (row) => row.remark === "Passed",
        );

        if (allRowsPassed) {
          expect(marksheet.result).toBe("Passed");
        } else {
          expect(marksheet.result).toBe("Not Passed");
        }
      }),
      { numRuns: 100 },
    );
  });
});
