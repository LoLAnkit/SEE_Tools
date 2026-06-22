/**
 * eligibility.test.ts — unit tests for evaluateEligibility (task 6.1).
 *
 * Verifies the core behaviour: qualifying list, per-stream verdicts, check
 * labels, and the missing/zero-grade handling (Requirements 15.3–15.7, 15.12).
 */

import { describe, it, expect } from "vitest";
import { evaluateEligibility } from "./eligibility";

describe("evaluateEligibility", () => {
  // ----- Science -----
  describe("Science eligibility", () => {
    it("qualifies Science when GPA ≥ 2.0 and all required subjects meet minimums", () => {
      const result = evaluateEligibility(2.5, {
        science: "C+",    // GP 2.4 ✓
        math: "C+",       // GP 2.4 ✓
        english: "D",     // GP 1.6 ✓
        nepali: "D",      // GP 1.6 ✓
        socialStudies: "D", // GP 1.6 ✓
      });
      expect(result.qualifying).toContain("Science");
    });

    it("disqualifies Science when GPA < 2.0", () => {
      const result = evaluateEligibility(1.9, {
        science: "C+",
        math: "C+",
        english: "D",
        nepali: "D",
        socialStudies: "D",
      });
      const scienceVerdict = result.details.find((d) => d.stream === "Science")!;
      expect(scienceVerdict.passed).toBe(false);
      const gpaCheck = scienceVerdict.checks.find((c) => c.label === "Overall GPA")!;
      expect(gpaCheck.pass).toBe(false);
    });

    it("disqualifies Science when Science GP < 2.4 (grade C, GP 2.0)", () => {
      const result = evaluateEligibility(2.5, {
        science: "C",     // GP 2.0 < 2.4 ✗
        math: "C+",
        english: "D",
        nepali: "D",
        socialStudies: "D",
      });
      const scienceVerdict = result.details.find((d) => d.stream === "Science")!;
      expect(scienceVerdict.passed).toBe(false);
    });

    it("disqualifies Science when Math GP < 2.4", () => {
      const result = evaluateEligibility(2.5, {
        science: "C+",
        math: "C",        // GP 2.0 < 2.4 ✗
        english: "D",
        nepali: "D",
        socialStudies: "D",
      });
      const scienceVerdict = result.details.find((d) => d.stream === "Science")!;
      expect(scienceVerdict.passed).toBe(false);
    });
  });

  // ----- Management -----
  describe("Management eligibility", () => {
    it("qualifies Management when GPA ≥ 1.6 and all five subjects ≥ D (GP 1.6)", () => {
      const result = evaluateEligibility(1.8, {
        english: "D",
        nepali: "D",
        math: "D",
        science: "D",
        socialStudies: "D",
      });
      expect(result.qualifying).toContain("Management");
    });

    it("disqualifies Management when one subject is NG (GP 0.0 < 1.6)", () => {
      const result = evaluateEligibility(1.8, {
        english: "D",
        nepali: "NG",     // GP 0.0 < 1.6 ✗
        math: "D",
        science: "D",
        socialStudies: "D",
      });
      const mgmtVerdict = result.details.find((d) => d.stream === "Management")!;
      expect(mgmtVerdict.passed).toBe(false);
    });
  });

  // ----- Humanities -----
  describe("Humanities eligibility", () => {
    it("qualifies Humanities when GPA ≥ 1.6 and English, Nepali, SocialStudies ≥ D", () => {
      const result = evaluateEligibility(1.7, {
        english: "D",
        nepali: "D",
        socialStudies: "D",
      });
      expect(result.qualifying).toContain("Humanities");
    });

    it("does NOT require Math or Science for Humanities", () => {
      const result = evaluateEligibility(1.7, {
        english: "D",
        nepali: "D",
        socialStudies: "D",
        // math and science intentionally omitted
      });
      const humVerdict = result.details.find((d) => d.stream === "Humanities")!;
      expect(humVerdict.passed).toBe(true);
    });

    it("disqualifies Humanities when SocialStudies grade is missing (treated as GP 0)", () => {
      const result = evaluateEligibility(1.7, {
        english: "D",
        nepali: "D",
        // socialStudies omitted → GP 0 < 1.6
      });
      const humVerdict = result.details.find((d) => d.stream === "Humanities")!;
      expect(humVerdict.passed).toBe(false);
    });

    it("disqualifies Humanities when a grade is empty string (treated as GP 0)", () => {
      const result = evaluateEligibility(1.7, {
        english: "D",
        nepali: "D",
        socialStudies: "",   // empty → GP 0 < 1.6
      });
      const humVerdict = result.details.find((d) => d.stream === "Humanities")!;
      expect(humVerdict.passed).toBe(false);
    });
  });

  // ----- Qualifying list and details shape -----
  describe("qualifying list and result structure", () => {
    it("returns an empty qualifying list when no stream passes (Req 15.12)", () => {
      const result = evaluateEligibility(1.0, {
        english: "NG",
        nepali: "NG",
        socialStudies: "NG",
        math: "NG",
        science: "NG",
      });
      expect(result.qualifying).toHaveLength(0);
    });

    it("returns all three streams when a student meets all criteria", () => {
      const result = evaluateEligibility(3.5, {
        science: "A",   // GP 3.6 ≥ 2.4 ✓
        math: "A",      // GP 3.6 ≥ 2.4 ✓
        english: "A",
        nepali: "A",
        socialStudies: "A",
      });
      expect(result.qualifying).toContain("Science");
      expect(result.qualifying).toContain("Management");
      expect(result.qualifying).toContain("Humanities");
    });

    it("always returns exactly three StreamVerdicts in details", () => {
      const result = evaluateEligibility(2.0, {});
      expect(result.details).toHaveLength(3);
      expect(result.details.map((d) => d.stream)).toEqual(
        expect.arrayContaining(["Science", "Management", "Humanities"])
      );
    });

    it("each StreamVerdict includes an Overall GPA check", () => {
      const result = evaluateEligibility(2.0, { english: "D", nepali: "D", socialStudies: "D", math: "D", science: "D" });
      for (const verdict of result.details) {
        const gpaCheck = verdict.checks.find((c) => c.label === "Overall GPA");
        expect(gpaCheck).toBeDefined();
        expect(gpaCheck!.actual).toBe(2.0);
      }
    });

    it("check.actual reflects the looked-up GP for a given letter grade", () => {
      const result = evaluateEligibility(2.5, {
        science: "C+",   // GP 2.4
        math: "B",       // GP 2.8
        english: "D",    // GP 1.6
        nepali: "D",     // GP 1.6
        socialStudies: "D", // GP 1.6
      });
      const scienceVerdict = result.details.find((d) => d.stream === "Science")!;
      const sciCheck = scienceVerdict.checks.find((c) => c.label === "Science")!;
      expect(sciCheck.actual).toBe(2.4);
      const mathCheck = scienceVerdict.checks.find((c) => c.label === "Mathematics")!;
      expect(mathCheck.actual).toBe(2.8);
    });
  });
});

// ---------------------------------------------------------------------------
// Task 6.2 — Property 11: Stream eligibility qualifies a stream exactly when
//             all its configured conditions hold
// ---------------------------------------------------------------------------

/**
 * Property 11: Stream eligibility qualifies a stream exactly when all its
 * configured conditions hold.
 *
 * **Validates: Requirements 15.4, 15.5, 15.6, 15.7, 15.12**
 *
 * For any (gpa, grades), `evaluateEligibility(gpa, grades).qualifying` contains
 * stream S if and only if:
 *   - gpa >= STREAM_RULES[S].minGpa, AND
 *   - for every (subjectId, requiredGp) in STREAM_RULES[S].subjectMinGp,
 *     gradeToGp(grades[subjectId]) >= requiredGp
 *
 * The expected qualifying status is independently computed from STREAM_RULES and
 * GRADING_SCALE, then compared with the actual evaluateEligibility output.
 */

import * as fc from "fast-check";
import { GRADING_SCALE, STREAM_RULES, type LetterGrade, type RequiredSubjectId } from "../config/gradingScale";

// ---------------------------------------------------------------------------
// GP lookup helper (mirrors the one in eligibility.ts, kept local to the test
// so the test is independent of unexported implementation details)
// ---------------------------------------------------------------------------
function gpForGrade(grade: LetterGrade | "" | undefined): number {
  if (!grade) return 0;
  const band = GRADING_SCALE.find((b) => b.grade === grade);
  return band ? band.gradePoint : 0;
}

/** All valid letter grade strings, matching GRADING_SCALE. */
const ALL_GRADES = ["A+", "A", "B+", "B", "C+", "C", "D", "NG"] as const;

/** The five required-subject ids referenced by the stream rules. */
const REQUIRED_SUBJECT_IDS: RequiredSubjectId[] = [
  "english",
  "nepali",
  "socialStudies",
  "math",
  "science",
];

describe("evaluateEligibility — Property 11: qualifying iff all stream conditions hold", () => {
  it(
    "for any (gpa, grades), qualifying contains a stream S iff gpa >= S.minGpa and every required subject GP meets S.subjectMinGp",
    () => {
      /**
       * Validates: Requirements 15.4, 15.5, 15.6, 15.7, 15.12
       *
       * Strategy:
       * - Generate a GPA from [0, 4] (full valid range).
       * - Generate a letter grade for each of the five required subjects.
       * - For each stream rule, independently compute the expected qualifying
       *   status using STREAM_RULES directly.
       * - Assert that evaluateEligibility's qualifying list matches the
       *   independently derived expectation for every stream.
       */
      fc.assert(
        fc.property(
          // GPA in the full valid range
          fc.double({ min: 0, max: 4, noNaN: true }),
          // One grade per required subject
          fc.record({
            english:      fc.constantFrom(...ALL_GRADES),
            nepali:       fc.constantFrom(...ALL_GRADES),
            socialStudies: fc.constantFrom(...ALL_GRADES),
            math:         fc.constantFrom(...ALL_GRADES),
            science:      fc.constantFrom(...ALL_GRADES),
          }),
          (gpa, grades) => {
            const result = evaluateEligibility(gpa, grades as Partial<Record<RequiredSubjectId, LetterGrade | "">>);

            for (const rule of STREAM_RULES) {
              // Independently compute whether this stream should qualify
              const gpaOk = gpa >= rule.minGpa;
              const subjectsOk = (
                Object.entries(rule.subjectMinGp) as [RequiredSubjectId, number][]
              ).every(([subjectId, requiredGp]) => {
                const actualGp = gpForGrade(grades[subjectId as keyof typeof grades]);
                return actualGp >= requiredGp;
              });

              const expectedQualifies = gpaOk && subjectsOk;
              const actualQualifies   = result.qualifying.includes(rule.stream);

              expect(actualQualifies).toBe(expectedQualifies);
            }
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});

// ---------------------------------------------------------------------------
// Task 6.3 — validateRequiredGrades unit tests (Requirement 15.11)
// ---------------------------------------------------------------------------

import { validateRequiredGrades } from "./eligibility";

describe("validateRequiredGrades — missing required inputs (Req 15.11)", () => {
  it("returns valid:false with all 5 subjects missing when grades is empty {}", () => {
    /**
     * Validates: Requirement 15.11
     *
     * When no grades are provided at all, every required subject is missing.
     * The UI should display a missing-subjects error and not produce a verdict.
     */
    const result = validateRequiredGrades({});
    expect(result.valid).toBe(false);
    expect(result.missing).toHaveLength(5);
    expect(result.missing).toEqual(
      expect.arrayContaining(["english", "nepali", "socialStudies", "math", "science"])
    );
  });

  it("returns valid:false listing the one missing subject when only 4 of 5 are provided", () => {
    /**
     * Validates: Requirement 15.11
     *
     * With 4 subjects filled and 1 missing, valid is false and missing contains
     * exactly the absent subject id. Tested for each of the five required subjects
     * in turn so that no subject is silently exempt from validation.
     */
    const allFive = {
      english: "D",
      nepali: "D",
      socialStudies: "D",
      math: "D",
      science: "D",
    } as const;

    const requiredIds = ["english", "nepali", "socialStudies", "math", "science"] as const;

    for (const omitted of requiredIds) {
      const partial = Object.fromEntries(
        Object.entries(allFive).filter(([k]) => k !== omitted)
      ) as Partial<Record<typeof omitted, "D">>;

      const result = validateRequiredGrades(partial);
      expect(result.valid).toBe(false);
      expect(result.missing).toHaveLength(1);
      expect(result.missing).toContain(omitted);
    }
  });

  it("returns valid:false when a grade is an empty string instead of a letter grade", () => {
    /**
     * Validates: Requirement 15.11
     *
     * An empty string "" counts as unselected — the UI dropdown default value.
     */
    const result = validateRequiredGrades({
      english: "",       // unselected
      nepali: "D",
      socialStudies: "D",
      math: "D",
      science: "D",
    });
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["english"]);
  });

  it("returns valid:true with empty missing array when all 5 required subjects have a grade", () => {
    /**
     * Validates: Requirement 15.11
     *
     * When every required subject has a non-empty letter grade, the input is
     * considered valid and the UI may proceed to call evaluateEligibility.
     */
    const result = validateRequiredGrades({
      english: "B+",
      nepali: "C",
      socialStudies: "A",
      math: "C+",
      science: "B",
    });
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
    expect(result.missing).toEqual([]);
  });

  it("identifies multiple missing subjects correctly when several are empty or absent", () => {
    /**
     * Validates: Requirement 15.11
     *
     * With a mix of missing and empty-string entries, all such subjects must
     * be reported so the UI can display a complete error list.
     */
    const result = validateRequiredGrades({
      english: "A",
      nepali: "",        // empty string
      // socialStudies omitted
      math: "C",
      // science omitted
    });
    expect(result.valid).toBe(false);
    expect(result.missing).toHaveLength(3);
    expect(result.missing).toEqual(
      expect.arrayContaining(["nepali", "socialStudies", "science"])
    );
  });
});
