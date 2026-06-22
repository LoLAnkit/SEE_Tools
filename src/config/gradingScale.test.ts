/**
 * Property test for the GPA-to-letter mapping (task 2.3).
 *
 * Property 1: GPA-to-letter mapping is total, single-valued, and clamped.
 * Validates: Requirements 2.4, 2.5, 7.7
 */

import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import {
  GPA_LETTER_BANDS,
  gpaToLetter,
  type LetterGrade,
} from "./gradingScale";

const VALID_LETTERS: readonly LetterGrade[] = [
  "A+",
  "A",
  "B+",
  "B",
  "C+",
  "C",
  "D",
  "NG",
];

/** Independent reference lookup of the clamped GPA against the bands. */
function expectedFromBands(gpa: number): LetterGrade {
  const clamped = Math.min(4, Math.max(0, gpa));
  for (const band of GPA_LETTER_BANDS) {
    // inclusive lower / exclusive upper, with the top band inclusive of 4.00
    const isTop = band.maxGpa >= 4;
    if (clamped >= band.minGpa && (clamped < band.maxGpa || (isTop && clamped <= band.maxGpa))) {
      return band.grade;
    }
  }
  // Should never happen: bands tile [0, 4].
  throw new Error(`no band matched clamped GPA ${clamped}`);
}

describe("gpaToLetter — Property 1: total, single-valued, and clamped", () => {
  it("returns a valid LetterGrade for any finite number (totality + single-valued)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        (gpa) => {
          const result = gpaToLetter(gpa);
          // Single-valued: exactly one grade, and it is one of the eight valid letters.
          expect(VALID_LETTERS).toContain(result);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("clamps inputs below 0 to the grade for 0, and above 4 to the grade for 4 (Req 2.5, 7.7)", () => {
    const atZero = gpaToLetter(0);
    const atFour = gpaToLetter(4);
    // Req 7.7: the top band (4.00) maps to A+.
    expect(atFour).toBe("A+");

    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1e6, noNaN: true, noDefaultInfinity: true }),
        (delta) => {
          // Below 0 maps to the same grade as 0.
          expect(gpaToLetter(-delta)).toBe(atZero);
          // Above 4 maps to the same grade as 4 (A+).
          expect(gpaToLetter(4 + delta)).toBe(atFour);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("matches the GPA_LETTER_BANDS lookup for the clamped value (band consistency)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
        (gpa) => {
          expect(gpaToLetter(gpa)).toBe(expectedFromBands(gpa));
        },
      ),
      { numRuns: 300 },
    );
  });
});
