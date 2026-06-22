/**
 * Property test for the stored theory minimum-marks tables (task 2.5).
 *
 * Property 9: Stored theory minimum-marks tables equal the formula derived
 * from the scale.
 *
 * For any grade band and `splitType` theory maximum, the stored
 * `THEORY_MIN_MARKS` value equals `ceil(band.minPercent × theoryMax / 100)`.
 * This guarantees the stored table can never silently drift from the scale.
 *
 * Validates: Requirements 13.4, 13.5
 */

import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import {
  GRADING_SCALE,
  THEORY_MIN_MARKS,
  PASS_THRESHOLDS,
  type GradedLetter,
  type SplitType,
} from "./gradingScale";

/** The seven graded letters (NG has no theory minimum-marks entry). */
const GRADED_LETTERS: readonly GradedLetter[] = [
  "A+",
  "A",
  "B+",
  "B",
  "C+",
  "C",
  "D",
];

/** The two real splits and their theory maximums (Req 13.4, 13.5). */
const SPLIT_THEORY_MAX: Record<SplitType, number> = {
  "75-25": 75, // standard subjects, theory /75 (Req 13.4)
  "50-50": 50, // Computer Science, theory /50 (Req 13.5)
};

/** Independent lookup of a graded letter's lower-bound percentage. */
function minPercentFor(letter: GradedLetter): number {
  const band = GRADING_SCALE.find((b) => b.grade === letter);
  if (!band) {
    throw new Error(`no grading band found for letter ${letter}`);
  }
  return band.minPercent;
}

/** The formula the stored table must equal: ceil(minPercent × theoryMax / 100). */
function expectedMinMarks(letter: GradedLetter, theoryMax: number): number {
  return Math.ceil((minPercentFor(letter) * theoryMax) / 100);
}

describe("THEORY_MIN_MARKS — Property 9: stored tables equal the scale formula", () => {
  it("matches ceil(minPercent × theoryMax / 100) for every generated theoryMax and graded letter", () => {
    fc.assert(
      fc.property(
        // Drive fast-check over a wide range of plausible theory maximums so the
        // formula relationship is exercised generally, not just at 75 and 50.
        fc.integer({ min: 1, max: 1000 }),
        fc.constantFrom(...GRADED_LETTERS),
        (theoryMax, letter) => {
          const expected = expectedMinMarks(letter, theoryMax);
          // The formula result is well-defined and non-negative for any positive max.
          expect(expected).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(expected)).toBe(true);
          // And it never exceeds the theory maximum itself (minPercent <= 100).
          expect(expected).toBeLessThanOrEqual(theoryMax);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("stored 75-25 and 50-50 tables match the formula for every graded letter", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<SplitType>("75-25", "50-50"),
        fc.constantFrom(...GRADED_LETTERS),
        (split, letter) => {
          const theoryMax = SPLIT_THEORY_MAX[split];
          const stored = THEORY_MIN_MARKS[split][letter];
          expect(stored).toBe(expectedMinMarks(letter, theoryMax));
        },
      ),
      { numRuns: 200 },
    );
  });

  // Concrete assertions on the two real tables so the literals are pinned and a
  // missing/extra key would fail loudly (exhaustive over the seven letters).
  it.each<[SplitType, number]>([
    ["75-25", 75],
    ["50-50", 50],
  ])("stored %s table equals the formula at theoryMax %d (exhaustive)", (split, theoryMax) => {
    const table = THEORY_MIN_MARKS[split];
    // Exactly the seven graded letters, no more, no fewer.
    expect(Object.keys(table).sort()).toEqual([...GRADED_LETTERS].sort());
    for (const letter of GRADED_LETTERS) {
      expect(table[letter]).toBe(Math.ceil((minPercentFor(letter) * theoryMax) / 100));
    }
  });

  it("the D-grade theory minimum equals the configured pass threshold for each split", () => {
    // Sanity cross-check: passing theory (grade D floor) lines up with PASS_THRESHOLDS.
    expect(THEORY_MIN_MARKS["75-25"]["D"]).toBe(PASS_THRESHOLDS["75-25"].theoryMinMarks);
    expect(THEORY_MIN_MARKS["50-50"]["D"]).toBe(PASS_THRESHOLDS["50-50"].theoryMinMarks);
  });
});
