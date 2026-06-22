/**
 * Property test for grading-scale tiling (task 3.2).
 *
 * Property 2: Grading scale tiles [0,100] with no gaps or overlaps.
 * Validates: Requirements 7.1, 7.2
 */

import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { GRADING_SCALE } from "../config/gradingScale";
import { percentToBand } from "./calc";

describe("percentToBand — Property 2: grading scale tiles [0,100] with no gaps or overlaps", () => {
  it("no gaps: every percentage in [0,100] maps to exactly one band (totality)", () => {
    /**
     * Validates: Requirements 7.1, 7.2
     *
     * For any percentage drawn from [0, 100], percentToBand must return a band
     * whose [minPercent, maxPercent) range (top band inclusive of 100) contains
     * that percentage. This confirms the scale is gap-free.
     */
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        (percent) => {
          const band = percentToBand(percent);

          // The returned band must actually contain the input percentage.
          const bandIndex = GRADING_SCALE.indexOf(band);
          const isTopBand = bandIndex === 0;

          const inBand =
            percent >= band.minPercent &&
            (percent < band.maxPercent || (isTopBand && percent <= 100));

          expect(inBand).toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("no overlaps: for any two distinct bands, their ranges do not overlap", () => {
    /**
     * Validates: Requirements 7.1
     *
     * Checks every pair of distinct bands from GRADING_SCALE. Two bands overlap
     * when a percentage can belong to both simultaneously. Using inclusive-lower /
     * exclusive-upper semantics (top band inclusive of 100), the overlap condition
     * for bands i and j is:
     *   max(i.minPercent, j.minPercent) < min(i.maxPercent_effective, j.maxPercent_effective)
     * where maxPercent_effective for the top band is 100 (inclusive).
     */
    for (let i = 0; i < GRADING_SCALE.length; i++) {
      for (let j = i + 1; j < GRADING_SCALE.length; j++) {
        const a = GRADING_SCALE[i];
        const b = GRADING_SCALE[j];

        const isTopA = i === 0;
        const isTopB = j === 0; // j > i so j===0 never fires, but kept for clarity

        // Effective upper bound: top band uses 100 (inclusive treated as 100+ε
        // for the open-interval overlap check; we use 100.0001 to represent
        // inclusive-100 as exclusive-100.0001 without changing real behavior).
        const upperA = isTopA ? 100.0001 : a.maxPercent;
        const upperB = isTopB ? 100.0001 : b.maxPercent;

        const overlapStart = Math.max(a.minPercent, b.minPercent);
        const overlapEnd = Math.min(upperA, upperB);

        expect(overlapStart).toBeGreaterThanOrEqual(overlapEnd);
      }
    }
  });

  it("completeness: 8 bands collectively cover [0,100] — lowest band starts at 0, top band ends at 100", () => {
    /**
     * Validates: Requirements 7.1
     *
     * The scale must have exactly 8 bands, the bottom band's minPercent must be 0,
     * and the top band's maxPercent must be 100.
     */
    expect(GRADING_SCALE).toHaveLength(8);

    const topBand = GRADING_SCALE[0]; // ordered high -> low
    const bottomBand = GRADING_SCALE[GRADING_SCALE.length - 1];

    expect(topBand.maxPercent).toBe(100);
    expect(bottomBand.minPercent).toBe(0);
  });

  it("ordering: bands are ordered high to low (each band's minPercent is greater than the next band's minPercent)", () => {
    /**
     * Validates: Requirements 7.1
     *
     * GRADING_SCALE is specified as ordered high -> low. Each band's minPercent
     * must be strictly greater than the next band's minPercent.
     */
    for (let i = 0; i < GRADING_SCALE.length - 1; i++) {
      const current = GRADING_SCALE[i];
      const next = GRADING_SCALE[i + 1];
      expect(current.minPercent).toBeGreaterThan(next.minPercent);
    }
  });
});

// ---------------------------------------------------------------------------
// Task 3.4 — Property 3: Grade derivation is monotonic in marks
// ---------------------------------------------------------------------------

import { gradeComponentFromMarks } from "./calc";
import type { SplitType } from "../config/gradingScale";

/**
 * Property 3: Grade derivation is monotonic in marks.
 * Validates: Requirements 7.2
 *
 * For any two raw-mark values m1 ≤ m2 within [0, max], the grade point
 * produced by gradeComponentFromMarks(m1, ...) must be ≤ the grade point
 * produced by gradeComponentFromMarks(m2, ...).
 *
 * Higher marks must never yield a lower grade point.
 *
 * Tested across:
 *   - splitTypes "75-25" and "50-50"
 *   - isTheory = true and isTheory = false
 *   - max values representative of each configuration:
 *       75  (75-25, theory)
 *       25  (75-25, practical)
 *       50  (50-50, theory and practical)
 */
describe("gradeComponentFromMarks — Property 3: grade derivation is monotonic in marks", () => {
  /**
   * Helper: asserts the monotonicity property for a given (splitType, isTheory, max) triple.
   */
  function assertMonotonic(
    splitType: SplitType,
    isTheory: boolean,
    max: number,
  ) {
    fc.assert(
      fc.property(
        // Draw two marks within [0, max] and order them so m1 ≤ m2.
        fc
          .tuple(
            fc.integer({ min: 0, max }),
            fc.integer({ min: 0, max }),
          )
          .map(([a, b]) => (a <= b ? [a, b] : [b, a]) as [number, number]),
        ([m1, m2]) => {
          const gp1 = gradeComponentFromMarks(m1, max, splitType, isTheory)
            .gradePoint;
          const gp2 = gradeComponentFromMarks(m2, max, splitType, isTheory)
            .gradePoint;

          // Higher marks must never yield a lower grade point.
          expect(gp1).toBeLessThanOrEqual(gp2);
        },
      ),
      { numRuns: 200 },
    );
  }

  it("75-25 split, theory component (max 75): higher marks → grade point ≥ lower-mark grade point", () => {
    assertMonotonic("75-25", true, 75);
  });

  it("75-25 split, practical component (max 25): higher marks → grade point ≥ lower-mark grade point", () => {
    assertMonotonic("75-25", false, 25);
  });

  it("50-50 split, theory component (max 50): higher marks → grade point ≥ lower-mark grade point", () => {
    assertMonotonic("50-50", true, 50);
  });

  it("50-50 split, practical component (max 50): higher marks → grade point ≥ lower-mark grade point", () => {
    assertMonotonic("50-50", false, 50);
  });
});
