/**
 * Unit test cross-checking the official NEB marksheet example (task 3.10).
 *
 * Verifies that a representative full calculation — six compulsory subjects
 * with realistic marks — produces the GPA, letter grade, and per-subject grade
 * points that match hand-computed official NEB SEE results.
 *
 * Validates: Requirements 7.4, 7.5, 7.6
 */

import { describe, expect, it } from "vitest";
import { computeGpa } from "./calc";
import type { ScoredSubject } from "./calc";

// ---------------------------------------------------------------------------
// Representative NEB marksheet (typical passing student)
// ---------------------------------------------------------------------------
//
// Subject        | CH | Theory   | Practical | TheoryGP | PractGP | SubjectGP
// ---------------|----|----------|-----------|----------|---------|----------
// Nepali         |  5 | 60/75    | 22/25     | A (3.6)  | A (3.6) | 3.60
// English        |  5 | 55/75    | 20/25     | B+(3.2)  | A (3.6) | 3.30
// Mathematics    |  5 | 65/75    | 23/25     | A (3.6)  | A+(4.0) | 3.70
// Science        |  5 | 58/75    | 21/25     | B+(3.2)  | A (3.6) | 3.30
// Social Studies |  4 | 50/75    | 18/25     | B (2.8)  | B+(3.2) | 2.90
// HPE            |  4 | 45/75    | 20/25     | B (2.8)  | A (3.6) | 3.00
//
// Total CH = 28
// Weighted sum = 5×3.60 + 5×3.30 + 5×3.70 + 5×3.30 + 4×2.90 + 4×3.00
//             = 18.00 + 16.50 + 18.50 + 16.50 + 11.60 + 12.00
//             = 93.10
// Raw GPA = 93.10 / 28 = 3.325  →  roundHalfUp2 = 3.33
// Letter: A  (3.2 ≤ 3.33 < 3.6)

const SUBJECTS: ScoredSubject[] = [
  {
    id: "nepali",
    creditHours: 5,
    splitType: "75-25",
    theoryMax: 75,
    practicalMax: 25,
    theoryMarks: 60,
    practicalMarks: 22,
  },
  {
    id: "english",
    creditHours: 5,
    splitType: "75-25",
    theoryMax: 75,
    practicalMax: 25,
    theoryMarks: 55,
    practicalMarks: 20,
  },
  {
    id: "math",
    creditHours: 5,
    splitType: "75-25",
    theoryMax: 75,
    practicalMax: 25,
    theoryMarks: 65,
    practicalMarks: 23,
  },
  {
    id: "science",
    creditHours: 5,
    splitType: "75-25",
    theoryMax: 75,
    practicalMax: 25,
    theoryMarks: 58,
    practicalMarks: 21,
  },
  {
    id: "socialStudies",
    creditHours: 4,
    splitType: "75-25",
    theoryMax: 75,
    practicalMax: 25,
    theoryMarks: 50,
    practicalMarks: 18,
  },
  {
    id: "health",
    creditHours: 4,
    splitType: "75-25",
    theoryMax: 75,
    practicalMax: 25,
    theoryMarks: 45,
    practicalMarks: 20,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("NEB official marksheet cross-check — computeGpa", () => {
  const result = computeGpa(SUBJECTS);

  /**
   * Validates: Requirement 7.6
   * The raw GPA (93.10 / 28 = 3.32500) rounded to 2dp with round-half-up must
   * equal 3.33.
   */
  it("overall GPA equals 3.33 (hand-computed official NEB result)", () => {
    expect(result.gpa).toBe(3.33);
  });

  /**
   * Validates: Requirement 7.6
   * GPA 3.33 falls in the range [3.2, 3.6) → letter grade A.
   */
  it("overall letter grade is A", () => {
    expect(result.letter).toBe("A");
  });

  /**
   * Validates: Requirement 7.5
   * All subjects pass (marks well above minimum thresholds), so passed === true.
   */
  it("result.passed is true (no failing component)", () => {
    expect(result.passed).toBe(true);
  });

  // Per-subject grade point assertions
  // Tolerance of 1e-9 guards against binary floating-point representation
  // differences while still catching incorrect formula implementations.

  /**
   * Validates: Requirement 7.4
   * Nepali: theory 80% → A (3.6), practical 88% → A (3.6)
   * SubjectGP = 3.6×0.75 + 3.6×0.25 = 3.60
   */
  it("Nepali subject GP equals 3.60", () => {
    expect(result.perSubject["nepali"].subjectGp).toBeCloseTo(3.60, 9);
  });

  /**
   * Validates: Requirement 7.4
   * English: theory 73.33% → B+ (3.2), practical 80% → A (3.6)
   * SubjectGP = 3.2×0.75 + 3.6×0.25 = 3.30
   */
  it("English subject GP equals 3.30", () => {
    expect(result.perSubject["english"].subjectGp).toBeCloseTo(3.30, 9);
  });

  /**
   * Validates: Requirement 7.4
   * Mathematics: theory 86.67% → A (3.6), practical 92% → A+ (4.0)
   * SubjectGP = 3.6×0.75 + 4.0×0.25 = 3.70
   */
  it("Mathematics subject GP equals 3.70", () => {
    expect(result.perSubject["math"].subjectGp).toBeCloseTo(3.70, 9);
  });

  /**
   * Validates: Requirement 7.4
   * Science: theory 77.33% → B+ (3.2), practical 84% → A (3.6)
   * SubjectGP = 3.2×0.75 + 3.6×0.25 = 3.30
   */
  it("Science subject GP equals 3.30", () => {
    expect(result.perSubject["science"].subjectGp).toBeCloseTo(3.30, 9);
  });

  /**
   * Validates: Requirement 7.4
   * Social Studies: theory 66.67% → B (2.8), practical 72% → B+ (3.2)
   * SubjectGP = 2.8×0.75 + 3.2×0.25 = 2.90
   */
  it("Social Studies subject GP equals 2.90", () => {
    expect(result.perSubject["socialStudies"].subjectGp).toBeCloseTo(2.90, 9);
  });

  /**
   * Validates: Requirement 7.4
   * HPE: theory 60% → B (2.8), practical 80% → A (3.6)
   * SubjectGP = 2.8×0.75 + 3.6×0.25 = 3.00
   */
  it("HPE subject GP equals 3.00", () => {
    expect(result.perSubject["health"].subjectGp).toBeCloseTo(3.00, 9);
  });
});
