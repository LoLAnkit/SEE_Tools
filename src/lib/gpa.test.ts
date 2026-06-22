/**
 * Property test for pass status (task 3.9).
 *
 * Property 7: Pass status reflects the presence of any NG or failing component.
 * Validates: Requirements 8.5, 10.5, 14.4
 *
 * The property: computeGpa(subjects).passed === (no subject has isNg=true in
 * perSubject results).
 *
 * Two sub-properties:
 *   1. If any subject has a theory OR practical component that is failing
 *      (below pass threshold), then passed=false.
 *   2. If all subjects pass all thresholds, then passed=true.
 */

import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { computeGpa, type ScoredSubject } from "./calc";
import { type SplitType } from "../config/gradingScale";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * A ScoredSubject where BOTH components are passing:
 *   - Theory marks = theoryMax  → 100% → A+ (not failing, not NG)
 *   - Practical marks = practicalMax → 100% → A+ (not failing, not NG)
 */
function passingSubjectArb(idPrefix: string, index: number): fc.Arbitrary<ScoredSubject> {
  return fc
    .constantFrom<SplitType>("75-25", "50-50")
    .map((splitType): ScoredSubject => {
      const theoryMax = splitType === "50-50" ? 50 : 75;
      const practicalMax = splitType === "50-50" ? 50 : 25;
      return {
        id: `${idPrefix}-${index}`,
        creditHours: 4,
        splitType,
        theoryMax,
        practicalMax,
        theoryMarks: theoryMax,    // 100% → A+ — never failing
        practicalMarks: practicalMax, // 100% → A+ — never failing
      };
    });
}

/**
 * A ScoredSubject where the THEORY component is failing:
 *   - theoryMarks = 0 → 0% → NG (isFailing=true)
 *   - practicalMarks = practicalMax → 100% → A+
 *
 * This ensures at least one component failure that must flip passed=false.
 */
function failingTheorySubjectArb(idPrefix: string, index: number): fc.Arbitrary<ScoredSubject> {
  return fc
    .constantFrom<SplitType>("75-25", "50-50")
    .map((splitType): ScoredSubject => {
      const theoryMax = splitType === "50-50" ? 50 : 75;
      const practicalMax = splitType === "50-50" ? 50 : 25;
      return {
        id: `${idPrefix}-${index}`,
        creditHours: 4,
        splitType,
        theoryMax,
        practicalMax,
        theoryMarks: 0,               // 0% → NG → isFailing=true
        practicalMarks: practicalMax, // 100% → A+
      };
    });
}

/**
 * A ScoredSubject where the PRACTICAL component is failing:
 *   - theoryMarks = theoryMax → 100% → A+
 *   - practicalMarks = 0 → 0% → NG (isFailing=true)
 */
function failingPracticalSubjectArb(idPrefix: string, index: number): fc.Arbitrary<ScoredSubject> {
  return fc
    .constantFrom<SplitType>("75-25", "50-50")
    .map((splitType): ScoredSubject => {
      const theoryMax = splitType === "50-50" ? 50 : 75;
      const practicalMax = splitType === "50-50" ? 50 : 25;
      return {
        id: `${idPrefix}-${index}`,
        creditHours: 4,
        splitType,
        theoryMax,
        practicalMax,
        theoryMarks: theoryMax, // 100% → A+
        practicalMarks: 0,       // 0% → NG → isFailing=true
      };
    });
}

// ---------------------------------------------------------------------------
// Concrete examples
// ---------------------------------------------------------------------------

describe("computeGpa — concrete examples: pass status", () => {
  /**
   * **Validates: Requirements 8.5**
   *
   * A single subject with theoryMarks=0 yields passed=false and isNg=true.
   */
  it("single subject with theoryMarks=0 (0% → NG) → passed=false", () => {
    const subjects: ScoredSubject[] = [
      {
        id: "nepali",
        creditHours: 5,
        splitType: "75-25",
        theoryMax: 75,
        practicalMax: 25,
        theoryMarks: 0,
        practicalMarks: 25,
      },
    ];
    const result = computeGpa(subjects);
    expect(result.passed).toBe(false);
    expect(result.perSubject["nepali"].isNg).toBe(true);
    expect(result.perSubject["nepali"].theory.isFailing).toBe(true);
  });

  /**
   * **Validates: Requirements 8.5**
   *
   * A single subject with practicalMarks=0 yields passed=false and isNg=true.
   */
  it("single subject with practicalMarks=0 (0% → NG) → passed=false", () => {
    const subjects: ScoredSubject[] = [
      {
        id: "english",
        creditHours: 5,
        splitType: "75-25",
        theoryMax: 75,
        practicalMax: 25,
        theoryMarks: 75,
        practicalMarks: 0,
      },
    ];
    const result = computeGpa(subjects);
    expect(result.passed).toBe(false);
    expect(result.perSubject["english"].isNg).toBe(true);
    expect(result.perSubject["english"].practical.isFailing).toBe(true);
  });

  /**
   * **Validates: Requirements 8.5**
   *
   * All subjects at 100% marks → passed=true, no isNg flags.
   */
  it("all subjects at maximum marks (100%) → passed=true", () => {
    const subjects: ScoredSubject[] = [
      {
        id: "nepali",
        creditHours: 5,
        splitType: "75-25",
        theoryMax: 75,
        practicalMax: 25,
        theoryMarks: 75,
        practicalMarks: 25,
      },
      {
        id: "english",
        creditHours: 5,
        splitType: "75-25",
        theoryMax: 75,
        practicalMax: 25,
        theoryMarks: 75,
        practicalMarks: 25,
      },
    ];
    const result = computeGpa(subjects);
    expect(result.passed).toBe(true);
    for (const id of ["nepali", "english"]) {
      expect(result.perSubject[id].isNg).toBe(false);
    }
  });

  /**
   * **Validates: Requirements 8.5, 10.5**
   *
   * Multiple passing subjects but ONE has theoryMarks=0 → passed=false.
   */
  it("five passing subjects + one failing theory subject → passed=false", () => {
    const passing: ScoredSubject[] = [
      { id: "s1", creditHours: 4, splitType: "75-25", theoryMax: 75, practicalMax: 25, theoryMarks: 75, practicalMarks: 25 },
      { id: "s2", creditHours: 4, splitType: "75-25", theoryMax: 75, practicalMax: 25, theoryMarks: 75, practicalMarks: 25 },
      { id: "s3", creditHours: 4, splitType: "75-25", theoryMax: 75, practicalMax: 25, theoryMarks: 75, practicalMarks: 25 },
      { id: "s4", creditHours: 4, splitType: "75-25", theoryMax: 75, practicalMax: 25, theoryMarks: 75, practicalMarks: 25 },
      { id: "s5", creditHours: 4, splitType: "75-25", theoryMax: 75, practicalMax: 25, theoryMarks: 75, practicalMarks: 25 },
    ];
    const failing: ScoredSubject = {
      id: "fail",
      creditHours: 4,
      splitType: "75-25",
      theoryMax: 75,
      practicalMax: 25,
      theoryMarks: 0,    // 0% → NG
      practicalMarks: 25,
    };
    const result = computeGpa([...passing, failing]);
    expect(result.passed).toBe(false);
    expect(result.perSubject["fail"].isNg).toBe(true);
  });

  /**
   * **Validates: Requirements 8.5**
   *
   * Empty subjects list → passed=true (no failing subject exists, Req 8.5).
   */
  it("empty subjects array → passed=true (no subject can be NG)", () => {
    const result = computeGpa([]);
    expect(result.passed).toBe(true);
    expect(result.gpa).toBe(0);
  });

  /**
   * **Validates: Requirements 8.5, 10.5**
   *
   * CS subject (50-50) with theoryMarks=0 → passed=false.
   */
  it("CS subject (50-50) with theoryMarks=0 → passed=false", () => {
    const subjects: ScoredSubject[] = [
      {
        id: "cs",
        creditHours: 4,
        splitType: "50-50",
        theoryMax: 50,
        practicalMax: 50,
        theoryMarks: 0,
        practicalMarks: 50,
      },
    ];
    const result = computeGpa(subjects);
    expect(result.passed).toBe(false);
    expect(result.perSubject["cs"].isNg).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Property 7 — Sub-property 1: any failing component → passed=false
// ---------------------------------------------------------------------------

describe("computeGpa — Property 7 (sub-property 1): any failing theory component → passed=false", () => {
  /**
   * **Validates: Requirements 8.5, 10.5, 14.4**
   *
   * For any array of passing subjects combined with at least one subject whose
   * theoryMarks=0 (guaranteed NG / failing), passed must be false.
   *
   * The failing subject is inserted at a random position within an array of
   * 0–4 passing subjects, ensuring the property holds regardless of array size
   * or position of the failing subject.
   */
  it("property: when at least one subject has theoryMarks=0 → passed=false", () => {
    fc.assert(
      fc.property(
        // Generate 0–4 passing subjects
        fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 0, maxLength: 4 }).chain(
          (indices) =>
            fc.tuple(
              ...indices.map((_, i) => passingSubjectArb("pass", i)),
            ) as fc.Arbitrary<ScoredSubject[]>,
        ),
        // One failing-theory subject
        failingTheorySubjectArb("fail", 0),
        // Insertion index
        fc.integer({ min: 0, max: 4 }),
        (passingSubjects, failingSubject, insertAt) => {
          // Give all subjects unique ids
          const passers = passingSubjects.map((s, i) => ({ ...s, id: `pass-${i}` }));
          const failer = { ...failingSubject, id: "fail-0" };

          // Insert the failing subject at a bounded position
          const pos = Math.min(insertAt, passers.length);
          const subjects = [...passers.slice(0, pos), failer, ...passers.slice(pos)];

          const result = computeGpa(subjects);

          // The failing subject must be reflected in perSubject
          expect(result.perSubject["fail-0"].isNg).toBe(true);
          // And the overall pass flag must be false
          expect(result.passed).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 8.5, 10.5, 14.4**
   *
   * Same property but the failing component is the PRACTICAL (practicalMarks=0).
   */
  it("property: when at least one subject has practicalMarks=0 → passed=false", () => {
    fc.assert(
      fc.property(
        // Generate 0–4 passing subjects
        fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 0, maxLength: 4 }).chain(
          (indices) =>
            fc.tuple(
              ...indices.map((_, i) => passingSubjectArb("pass", i)),
            ) as fc.Arbitrary<ScoredSubject[]>,
        ),
        // One failing-practical subject
        failingPracticalSubjectArb("fail", 0),
        fc.integer({ min: 0, max: 4 }),
        (passingSubjects, failingSubject, insertAt) => {
          const passers = passingSubjects.map((s, i) => ({ ...s, id: `pass-${i}` }));
          const failer = { ...failingSubject, id: "fail-0" };

          const pos = Math.min(insertAt, passers.length);
          const subjects = [...passers.slice(0, pos), failer, ...passers.slice(pos)];

          const result = computeGpa(subjects);

          expect(result.perSubject["fail-0"].isNg).toBe(true);
          expect(result.passed).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7 — Sub-property 2: all subjects passing → passed=true
// ---------------------------------------------------------------------------

describe("computeGpa — Property 7 (sub-property 2): all subjects passing → passed=true", () => {
  /**
   * **Validates: Requirements 8.5, 10.5, 14.4**
   *
   * For any non-empty array of subjects where every subject has theoryMarks=
   * theoryMax and practicalMarks=practicalMax (100% → A+, never failing),
   * passed must be true and no perSubject entry may have isNg=true.
   */
  it("property: when all subjects are at 100% marks → passed=true and no isNg", () => {
    fc.assert(
      fc.property(
        // Generate 1–6 passing subjects (at least 1 to avoid the trivial empty case)
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 6 }).chain(
          (indices) =>
            fc.tuple(
              ...indices.map((_, i) => passingSubjectArb("sub", i)),
            ) as fc.Arbitrary<ScoredSubject[]>,
        ),
        (subjects) => {
          // Give every subject a unique id
          const uniqueSubjects = subjects.map((s, i) => ({ ...s, id: `sub-${i}` }));

          const result = computeGpa(uniqueSubjects);

          // Overall pass flag must be true
          expect(result.passed).toBe(true);

          // Every perSubject entry must have isNg=false
          for (const id of uniqueSubjects.map((s) => s.id)) {
            expect(result.perSubject[id].isNg).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 8.5**
   *
   * Consistency check: passed === !anyIsNg for any generated subject array
   * at 100% marks, cross-validating the pass flag against the perSubject data.
   */
  it("property: passed is consistent with perSubject.isNg — passed=true iff no subject isNg (all passing)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 1, maxLength: 5 }).chain(
          (indices) =>
            fc.tuple(
              ...indices.map((_, i) => passingSubjectArb("sub", i)),
            ) as fc.Arbitrary<ScoredSubject[]>,
        ),
        (subjects) => {
          const uniqueSubjects = subjects.map((s, i) => ({ ...s, id: `sub-${i}` }));
          const result = computeGpa(uniqueSubjects);

          const anyNg = Object.values(result.perSubject).some((r) => r.isNg);

          // The pass flag must exactly mirror the absence of any isNg
          expect(result.passed).toBe(!anyNg);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7 — Consistency invariant across mixed inputs
// ---------------------------------------------------------------------------

describe("computeGpa — Property 7 (consistency invariant): passed === !anyIsNg always holds", () => {
  /**
   * **Validates: Requirements 8.5, 10.5, 14.4**
   *
   * The strongest formulation: for ANY combination of subjects (some passing,
   * some failing), the top-level passed flag must equal the negation of the
   * OR of all perSubject[id].isNg flags. The two representations must agree.
   *
   * Uses fc.array of fc.oneof(passing, failingTheory, failingPractical) to
   * cover all combinations exhaustively within 100 runs.
   */
  it("property: passed === !anyIsNg for arbitrary mixes of passing and failing subjects", () => {
    const subjectArb = (i: number): fc.Arbitrary<ScoredSubject> =>
      fc.oneof(
        passingSubjectArb("s", i),
        failingTheorySubjectArb("s", i),
        failingPracticalSubjectArb("s", i),
      );

    fc.assert(
      fc.property(
        // 1–6 subjects of any type, each with a unique id
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 6 }).chain(
          (indices) =>
            fc.tuple(
              ...indices.map((_, i) => subjectArb(i)),
            ) as fc.Arbitrary<ScoredSubject[]>,
        ),
        (subjects) => {
          const uniqueSubjects = subjects.map((s, i) => ({ ...s, id: `sub-${i}` }));
          const result = computeGpa(uniqueSubjects);

          const anyNg = Object.values(result.perSubject).some((r) => r.isNg);

          // Consistency invariant: top-level passed must always agree with perSubject
          expect(result.passed).toBe(!anyNg);
        },
      ),
      { numRuns: 100 },
    );
  });
});
