/**
 * Property test for failing and NG components (task 3.6).
 *
 * Property 6: Components below the configured pass threshold are flagged
 * failing, and sub-35% is NG with GP 0.
 *
 * Validates: Requirements 8.1, 8.2, 8.3
 */

import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { gradeComponentFromMarks } from "./calc";
import {
  PASS_THRESHOLDS,
  NG_PERCENT_FLOOR,
  type SplitType,
} from "../config/gradingScale";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Both supported split types. */
const SPLIT_TYPES: readonly SplitType[] = ["75-25", "50-50"];

/**
 * Returns the component maximum for a given splitType and isTheory flag.
 * Derived directly from the same config-driven relationship used by the engine.
 */
function componentMax(splitType: SplitType, isTheory: boolean): number {
  // theoryMax: 75 for 75-25, 50 for 50-50
  // practicalMax: 25 for 75-25, 50 for 50-50
  if (splitType === "75-25") {
    return isTheory ? 75 : 25;
  }
  return 50; // 50-50: both theory and practical max = 50
}

/**
 * Computes the percentage as the engine does: (marks / max) * 100, unrounded.
 */
function toPercent(marks: number, max: number): number {
  return (marks / max) * 100;
}

// ---------------------------------------------------------------------------
// Property 1 — Sub-35% always yields NG with GP 0.0 (Req 8.1)
// ---------------------------------------------------------------------------

describe("gradeComponentFromMarks — Property 6 part 1: sub-35% is always NG with GP 0.0", () => {
  it("returns grade=NG and gradePoint=0.0 for any marks below the NG floor (75-25 theory)", () => {
    // For the 75-25 standard split, theory max = 75.
    // We need (marks / 75) * 100 < 35  →  marks < 26.25  →  marks ≤ 26 for integers.
    fc.assert(
      fc.property(
        // marks in [0, 26] are strictly below the 35% floor on a /75 scale
        fc.integer({ min: 0, max: 26 }),
        (marks) => {
          const result = gradeComponentFromMarks(marks, 75, "75-25", true);
          expect(result.grade).toBe("NG");
          expect(result.gradePoint).toBe(0.0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("returns grade=NG and gradePoint=0.0 for any marks below the NG floor (75-25 practical)", () => {
    // practical max = 25. (marks / 25) * 100 < 35  →  marks < 8.75  →  marks ≤ 8 for integers.
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 8 }),
        (marks) => {
          const result = gradeComponentFromMarks(marks, 25, "75-25", false);
          expect(result.grade).toBe("NG");
          expect(result.gradePoint).toBe(0.0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("returns grade=NG and gradePoint=0.0 for any marks below the NG floor (50-50 theory)", () => {
    // theory/practical max = 50. (marks / 50) * 100 < 35  →  marks < 17.5  →  marks ≤ 17.
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 17 }),
        (marks) => {
          const result = gradeComponentFromMarks(marks, 50, "50-50", true);
          expect(result.grade).toBe("NG");
          expect(result.gradePoint).toBe(0.0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("returns grade=NG and gradePoint=0.0 for any marks below the NG floor (50-50 practical)", () => {
    // practical max = 50. Same floor: marks ≤ 17.
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 17 }),
        (marks) => {
          const result = gradeComponentFromMarks(marks, 50, "50-50", false);
          expect(result.grade).toBe("NG");
          expect(result.gradePoint).toBe(0.0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("property holds for arbitrary max values and both splitTypes, testing the NG floor condition generally", () => {
    // Generic form: for any (marks, max, splitType, isTheory) where
    // (marks / max) * 100 < NG_PERCENT_FLOOR, grade must be NG with GP 0.0.
    fc.assert(
      fc.property(
        fc.constantFrom<SplitType>(...SPLIT_TYPES),
        fc.boolean(), // isTheory
        fc.integer({ min: 1, max: 100 }), // max (positive)
        (splitType, isTheory, max) => {
          // Compute the highest integer marks that still falls below the NG floor.
          // floor((NG_PERCENT_FLOOR / 100) * max) gives the last integer that may
          // be at or below the boundary. We subtract 1 to ensure strict < 35%.
          const ngFloorMarks = Math.ceil((NG_PERCENT_FLOOR / 100) * max) - 1;
          if (ngFloorMarks < 0) {
            // max is so small there are no sub-floor integer marks — skip.
            return;
          }
          // Pick a random marks value in [0, ngFloorMarks].
          // We test the boundary case directly here for a concrete check.
          for (const marks of [0, ngFloorMarks]) {
            if (marks < 0) continue;
            const pct = toPercent(marks, max);
            // Guard: only run the expectation when the percent is genuinely < 35.
            if (pct < NG_PERCENT_FLOOR) {
              const result = gradeComponentFromMarks(marks, max, splitType, isTheory);
              expect(result.grade).toBe("NG");
              expect(result.gradePoint).toBe(0.0);
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2 — Non-NG marks (≥ 35%) yield isFailing=false (Req 8.1, 8.2, 8.3)
// ---------------------------------------------------------------------------

describe("gradeComponentFromMarks — Property 6 part 1 (converse): marks at or above NG floor are not NG", () => {
  it("marks at exactly the NG floor (35%) never produce grade=NG (75-25 theory)", () => {
    // (27 / 75) * 100 = 36.0%, the pass threshold is also 27, so grade is D.
    const result = gradeComponentFromMarks(27, 75, "75-25", true);
    expect(result.grade).not.toBe("NG");
    expect(result.gradePoint).toBeGreaterThan(0);
    expect(result.isFailing).toBe(false);
  });

  it("marks at exactly the NG floor (35%) for 50-50 never produce grade=NG (50-50 theory)", () => {
    // (18 / 50) * 100 = 36.0%
    const result = gradeComponentFromMarks(18, 50, "50-50", true);
    expect(result.grade).not.toBe("NG");
    expect(result.gradePoint).toBeGreaterThan(0);
    expect(result.isFailing).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Property 3 — Below theory threshold → isFailing=true (Req 8.2)
// ---------------------------------------------------------------------------

describe("gradeComponentFromMarks — Property 6 part 2: below theory pass threshold is failing", () => {
  it("theory marks below 27 (75-25) are isFailing=true", () => {
    // theoryMinMarks for "75-25" is 27. Marks in [0, 26] are below threshold.
    // Note: [0, 26] is also below the NG floor (marks < 26.25), so they are NG.
    // The isFailing flag is still true in that case (Req 8.1 sets isFailing=true for NG).
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: PASS_THRESHOLDS["75-25"].theoryMinMarks - 1 }),
        (marks) => {
          const result = gradeComponentFromMarks(marks, 75, "75-25", true);
          expect(result.isFailing).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("theory marks at or above 27, where percent >= 35% (75-25), are isFailing=false", () => {
    // The NG floor is at < 26.25 marks, so 27/75 = 36% ≥ 35%, not NG.
    // At marks = 27, percent = 36%, which maps to D (GP 1.6), not NG, not failing.
    fc.assert(
      fc.property(
        fc.integer({
          min: PASS_THRESHOLDS["75-25"].theoryMinMarks,
          max: 75,
        }),
        (marks) => {
          const result = gradeComponentFromMarks(marks, 75, "75-25", true);
          // Percent is >= 36%, so grade is at least D (not NG).
          expect(result.grade).not.toBe("NG");
          expect(result.isFailing).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("theory marks below 18 (50-50) are isFailing=true", () => {
    // theoryMinMarks for "50-50" is 18. Marks in [0, 17] are below threshold.
    // These are also below the NG floor: 17/50 = 34% < 35%.
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: PASS_THRESHOLDS["50-50"].theoryMinMarks - 1 }),
        (marks) => {
          const result = gradeComponentFromMarks(marks, 50, "50-50", true);
          expect(result.isFailing).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("theory marks at or above 18 (50-50), where percent >= 35%, are isFailing=false", () => {
    // 18/50 = 36% ≥ 35%, so grade is D (GP 1.6), not NG, not failing.
    fc.assert(
      fc.property(
        fc.integer({
          min: PASS_THRESHOLDS["50-50"].theoryMinMarks,
          max: 50,
        }),
        (marks) => {
          const result = gradeComponentFromMarks(marks, 50, "50-50", true);
          expect(result.grade).not.toBe("NG");
          expect(result.isFailing).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4 — Below practical threshold → isFailing=true (Req 8.3)
// ---------------------------------------------------------------------------

describe("gradeComponentFromMarks — Property 6 part 3: below practical pass threshold is failing", () => {
  it("practical marks below 9 (75-25) are isFailing=true", () => {
    // practicalMinMarks for "75-25" is 9. Marks in [0, 8] are below threshold.
    // 8/25 = 32% < 35%, so these are also NG.
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: PASS_THRESHOLDS["75-25"].practicalMinMarks - 1 }),
        (marks) => {
          const result = gradeComponentFromMarks(marks, 25, "75-25", false);
          expect(result.isFailing).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("practical marks at or above 9 (75-25), where percent >= 35%, are isFailing=false", () => {
    // 9/25 = 36% ≥ 35%, so grade is D, not NG, not failing.
    fc.assert(
      fc.property(
        fc.integer({
          min: PASS_THRESHOLDS["75-25"].practicalMinMarks,
          max: 25,
        }),
        (marks) => {
          const result = gradeComponentFromMarks(marks, 25, "75-25", false);
          expect(result.grade).not.toBe("NG");
          expect(result.isFailing).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("practical marks below 18 (50-50) are isFailing=true", () => {
    // practicalMinMarks for "50-50" is 18. Marks in [0, 17] are below threshold.
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: PASS_THRESHOLDS["50-50"].practicalMinMarks - 1 }),
        (marks) => {
          const result = gradeComponentFromMarks(marks, 50, "50-50", false);
          expect(result.isFailing).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("practical marks at or above 18 (50-50), where percent >= 35%, are isFailing=false", () => {
    // 18/50 = 36% ≥ 35%, so grade is D, not NG, not failing.
    fc.assert(
      fc.property(
        fc.integer({
          min: PASS_THRESHOLDS["50-50"].practicalMinMarks,
          max: 50,
        }),
        (marks) => {
          const result = gradeComponentFromMarks(marks, 50, "50-50", false);
          expect(result.grade).not.toBe("NG");
          expect(result.isFailing).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Concrete boundary assertions (pinning the exact thresholds from config)
// ---------------------------------------------------------------------------

describe("gradeComponentFromMarks — concrete boundary assertions", () => {
  // 75-25 theory: boundary at 27/75
  it("theory 26/75 (34.67%) is NG and failing (just below NG floor)", () => {
    const r = gradeComponentFromMarks(26, 75, "75-25", true);
    expect(r.grade).toBe("NG");
    expect(r.gradePoint).toBe(0.0);
    expect(r.isFailing).toBe(true);
  });

  it("theory 27/75 (36.0%) is grade D, not failing, GP 1.6 (at pass threshold)", () => {
    const r = gradeComponentFromMarks(27, 75, "75-25", true);
    expect(r.grade).toBe("D");
    expect(r.gradePoint).toBe(1.6);
    expect(r.isFailing).toBe(false);
  });

  // 75-25 practical: boundary at 9/25
  it("practical 8/25 (32%) is NG and failing (just below NG floor)", () => {
    const r = gradeComponentFromMarks(8, 25, "75-25", false);
    expect(r.grade).toBe("NG");
    expect(r.gradePoint).toBe(0.0);
    expect(r.isFailing).toBe(true);
  });

  it("practical 9/25 (36%) is grade D, not failing, GP 1.6 (at pass threshold)", () => {
    const r = gradeComponentFromMarks(9, 25, "75-25", false);
    expect(r.grade).toBe("D");
    expect(r.gradePoint).toBe(1.6);
    expect(r.isFailing).toBe(false);
  });

  // 50-50 theory: boundary at 18/50
  it("theory 17/50 (34%) is NG and failing (just below NG floor)", () => {
    const r = gradeComponentFromMarks(17, 50, "50-50", true);
    expect(r.grade).toBe("NG");
    expect(r.gradePoint).toBe(0.0);
    expect(r.isFailing).toBe(true);
  });

  it("theory 18/50 (36%) is grade D, not failing, GP 1.6 (at pass threshold)", () => {
    const r = gradeComponentFromMarks(18, 50, "50-50", true);
    expect(r.grade).toBe("D");
    expect(r.gradePoint).toBe(1.6);
    expect(r.isFailing).toBe(false);
  });

  // 50-50 practical: boundary at 18/50 (same as theory)
  it("practical 17/50 (34%) is NG and failing", () => {
    const r = gradeComponentFromMarks(17, 50, "50-50", false);
    expect(r.grade).toBe("NG");
    expect(r.gradePoint).toBe(0.0);
    expect(r.isFailing).toBe(true);
  });

  it("practical 18/50 (36%) is grade D, not failing, GP 1.6", () => {
    const r = gradeComponentFromMarks(18, 50, "50-50", false);
    expect(r.grade).toBe("D");
    expect(r.gradePoint).toBe(1.6);
    expect(r.isFailing).toBe(false);
  });
});
