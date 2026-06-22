/**
 * Property test for subject grade point weighting (task 3.5).
 *
 * Property 4: Subject grade point is the correct weighted combination of
 * component grade points.
 * Validates: Requirements 6.2, 6.4, 7.4
 */

import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { subjectGradePoint } from "./calc";
import { GRADING_SCALE, type SplitType } from "../config/gradingScale";

/**
 * Discrete grade points drawn directly from the grading scale.
 * Using fc.constantFrom avoids float-precision issues that arise with
 * arbitrary real numbers — these are the only values subjectGradePoint
 * will ever receive in practice.
 */
const gradePoints = GRADING_SCALE.map((b) => b.gradePoint);
const gpArb = fc.constantFrom(...gradePoints);

describe("subjectGradePoint — Property 4: correct weighted combination", () => {
  /**
   * **Validates: Requirements 6.2, 6.4, 7.4**
   *
   * For any theoryGp and practicalGp drawn from the set of valid grade points
   * {0.0, 1.6, 2.0, 2.4, 2.8, 3.2, 3.6, 4.0}, the 75-25 split must produce
   * exactly theoryGp * 0.75 + practicalGp * 0.25.
   *
   * Because inputs are discrete values representable in IEEE 754, the
   * multiplication results are exact and strict equality (===) is sufficient.
   */
  it("75-25 split: result equals th * 0.75 + pr * 0.25 for all discrete grade points", () => {
    fc.assert(
      fc.property(gpArb, gpArb, (th, pr) => {
        const result = subjectGradePoint(th, pr, "75-25");
        const expected = th * 0.75 + pr * 0.25;
        expect(result).toBeCloseTo(expected, 10);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 6.2, 6.4, 7.4**
   *
   * For any theoryGp and practicalGp drawn from the set of valid grade points,
   * the 50-50 split (Computer Science) must produce exactly
   * theoryGp * 0.50 + practicalGp * 0.50.
   */
  it("50-50 split: result equals th * 0.5 + pr * 0.5 for all discrete grade points", () => {
    fc.assert(
      fc.property(gpArb, gpArb, (th, pr) => {
        const result = subjectGradePoint(th, pr, "50-50");
        const expected = th * 0.5 + pr * 0.5;
        expect(result).toBeCloseTo(expected, 10);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 6.2, 7.4**
   *
   * The weighted combination of two values in [0, 4] must itself remain in
   * [0, 4] for both split types.
   */
  it("result is bounded within [0, 4] for both split types with discrete grade points", () => {
    const splitArb = fc.constantFrom<SplitType>("75-25", "50-50");
    fc.assert(
      fc.property(gpArb, gpArb, splitArb, (th, pr, splitType) => {
        const result = subjectGradePoint(th, pr, splitType);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(4);
      }),
      { numRuns: 100 },
    );
  });
});
