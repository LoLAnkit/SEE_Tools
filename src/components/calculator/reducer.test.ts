/**
 * reducer.test.ts — Property-based tests for the calculator reducer.
 *
 * Uses fast-check + Vitest to verify universal properties of the pure reducer.
 * No React needed — the reducer is a plain function.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculatorReducer, initialState } from "./reducer";
import type { CalculatorAction } from "./CalculatorContext";
import { GRADING_SCALE } from "../../config/gradingScale";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Arbitrary valid letter grade (including empty string for "unselected"). */
const arbLetterGrade = fc.constantFrom(
  ...GRADING_SCALE.map((b) => b.grade),
  "" as const
);

/** Arbitrary tab value. */
const arbTab = fc.constantFrom(
  "grade" as const,
  "marks" as const,
  "plan" as const,
  "eligibility" as const
);

// ---------------------------------------------------------------------------
// Property 12: Tab switching preserves shared subject data
// Validates: Requirements 3.2
// ---------------------------------------------------------------------------

describe("Property 12: Tab switching preserves shared subject data", () => {
  it("SET_TAB never resets subjects, theoryGrade, practicalGrade, theoryMarks, or practicalMarks", () => {
    fc.assert(
      fc.property(
        // Pick a subject id from the initial state to set a grade on
        fc.constantFrom(...initialState.subjects.map((s) => s.id)),
        arbLetterGrade,
        // Target tab to switch to
        arbTab,
        (subjectId, grade, targetTab) => {
          // Step 1: Start from initialState
          // Step 2: Apply a SET_THEORY_GRADE to mutate subject data
          const setGradeAction: CalculatorAction = {
            type: "SET_THEORY_GRADE",
            id: subjectId,
            grade,
          };
          const stateAfterGrade = calculatorReducer(initialState, setGradeAction);

          // Step 3: Apply SET_TAB to switch tabs
          const setTabAction: CalculatorAction = {
            type: "SET_TAB",
            tab: targetTab,
          };
          const stateAfterTab = calculatorReducer(stateAfterGrade, setTabAction);

          // Step 4: Verify subjects array is unchanged after tab switch
          expect(stateAfterTab.subjects).toHaveLength(stateAfterGrade.subjects.length);

          stateAfterGrade.subjects.forEach((subjectBefore, i) => {
            const subjectAfter = stateAfterTab.subjects[i];

            // Identity and structure preserved
            expect(subjectAfter.id).toBe(subjectBefore.id);
            expect(subjectAfter.name).toBe(subjectBefore.name);
            expect(subjectAfter.creditHours).toBe(subjectBefore.creditHours);
            expect(subjectAfter.splitType).toBe(subjectBefore.splitType);

            // Grade-mode inputs preserved
            expect(subjectAfter.theoryGrade).toBe(subjectBefore.theoryGrade);
            expect(subjectAfter.practicalGrade).toBe(subjectBefore.practicalGrade);

            // Marks-mode inputs preserved
            expect(subjectAfter.theoryMarks).toBe(subjectBefore.theoryMarks);
            expect(subjectAfter.practicalMarks).toBe(subjectBefore.practicalMarks);
          });

          // The active tab itself should have changed (or stayed the same if already on that tab)
          expect(stateAfterTab.activeTab).toBe(targetTab);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("SET_TAB from any tab to any other tab preserves all subjects regardless of prior actions", () => {
    fc.assert(
      fc.property(
        // Array of SET_THEORY_GRADE actions to build up some state
        fc.array(
          fc.record({
            id: fc.constantFrom(...initialState.subjects.map((s) => s.id)),
            grade: arbLetterGrade,
          }),
          { minLength: 0, maxLength: 10 }
        ),
        arbTab,
        (gradeChanges, targetTab) => {
          // Apply multiple grade changes to build up state
          const stateWithGrades = gradeChanges.reduce((state, { id, grade }) => {
            const action: CalculatorAction = {
              type: "SET_THEORY_GRADE",
              id,
              grade,
            };
            return calculatorReducer(state, action);
          }, initialState);

          // Snapshot the subjects before tab switch
          const subjectsBefore = stateWithGrades.subjects.map((s) => ({ ...s }));

          // Switch tab
          const stateAfterTab = calculatorReducer(stateWithGrades, {
            type: "SET_TAB",
            tab: targetTab,
          });

          // Subjects must be identical (same length, same data)
          expect(stateAfterTab.subjects).toHaveLength(subjectsBefore.length);

          subjectsBefore.forEach((expected, i) => {
            const actual = stateAfterTab.subjects[i];
            expect(actual.id).toBe(expected.id);
            expect(actual.theoryGrade).toBe(expected.theoryGrade);
            expect(actual.practicalGrade).toBe(expected.practicalGrade);
            expect(actual.theoryMarks).toBe(expected.theoryMarks);
            expect(actual.practicalMarks).toBe(expected.practicalMarks);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 15: GPA is computable exactly when all compulsory theory grades are present
// Validates: Requirements 9.5, 9.6, 11.3
// ---------------------------------------------------------------------------

describe("Property 15: GPA is computable exactly when all compulsory theory grades are present", () => {
  // All valid non-empty letter grades
  const arbNonEmptyGrade = fc.constantFrom(
    ...GRADING_SCALE.map((b) => b.grade)
  );

  // Compulsory subject IDs derived from initial state
  const compulsoryIds = initialState.subjects
    .filter((s) => s.isCompulsory)
    .map((s) => s.id);

  // Arbitrary non-empty strict subset of compulsory IDs (at least 1, not all)
  const arbPartialCompulsoryIds = fc
    .array(fc.constantFrom(...compulsoryIds), {
      minLength: 1,
      maxLength: compulsoryIds.length - 1,
    })
    .map((ids) => [...new Set(ids)]);

  // ---------------------------------------------------------------------------
  // P15a — Initial zero state (Req 11.3)
  // ---------------------------------------------------------------------------

  it("initial state has lastComputedGpa === null (zero state, Req 11.3)", () => {
    expect(initialState.lastComputedGpa).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // P15b — No grade/marks input → lastComputedGpa stays null
  // Only actions that do NOT touch grades or marks (SET_TAB, SET_PLAN_TARGET)
  // are applied; lastComputedGpa must remain null throughout.
  // ---------------------------------------------------------------------------

  it("lastComputedGpa is null exactly when no subject has any theory grade or marks input", () => {
    fc.assert(
      fc.property(
        // Generate a sequence of non-grade/non-marks actions
        fc.array(
          fc.oneof(
            fc.record({ type: fc.constant("SET_TAB" as const), tab: arbTab }),
            fc.record({
              type: fc.constant("SET_PLAN_TARGET" as const),
              targetGpa: fc.option(fc.float({ min: 0, max: 4, noNaN: true }), {
                nil: null,
              }),
            })
          ),
          { minLength: 0, maxLength: 20 }
        ),
        (actions) => {
          // Apply only non-grade/non-marks actions from initial state
          const finalState = actions.reduce(
            (state, action) =>
              calculatorReducer(state, action as CalculatorAction),
            initialState
          );

          // No grades or marks have been set, so GPA must remain null
          expect(finalState.lastComputedGpa).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // ---------------------------------------------------------------------------
  // P15c — Setting ANY theory grade makes lastComputedGpa non-null
  // Validates Req 9.6 direction: once any input exists, a number is computed.
  // ---------------------------------------------------------------------------

  it("setting a theory grade on any subject makes lastComputedGpa non-null", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...initialState.subjects.map((s) => s.id)),
        arbNonEmptyGrade,
        (subjectId, grade) => {
          const action: CalculatorAction = {
            type: "SET_THEORY_GRADE",
            id: subjectId,
            grade,
          };
          const state = calculatorReducer(initialState, action);

          // Any theory grade input means anyInput is true → GPA must be a number
          expect(state.lastComputedGpa).not.toBeNull();
          expect(typeof state.lastComputedGpa).toBe("number");
        }
      ),
      { numRuns: 100 }
    );
  });

  // ---------------------------------------------------------------------------
  // P15d — All compulsory theory grades set → GPA is a number in [0, 4]
  // Validates Req 9.6: when all compulsory theory grades are present,
  // lastComputedGpa is a number; also validates GPA is within valid range.
  // ---------------------------------------------------------------------------

  it("all compulsory theory grades present in state when all have been set", () => {
    fc.assert(
      fc.property(
        // Generate one non-empty grade per compulsory subject
        fc.array(arbNonEmptyGrade, {
          minLength: compulsoryIds.length,
          maxLength: compulsoryIds.length,
        }),
        (grades) => {
          // Apply SET_THEORY_GRADE for every compulsory subject
          const finalState = compulsoryIds.reduce((state, id, i) => {
            const action: CalculatorAction = {
              type: "SET_THEORY_GRADE",
              id,
              grade: grades[i],
            };
            return calculatorReducer(state, action);
          }, initialState);

          // All compulsory subjects must now have non-empty theoryGrade
          const compulsorySubjects = finalState.subjects.filter(
            (s) => s.isCompulsory
          );
          expect(
            compulsorySubjects.every((s) => s.theoryGrade !== "")
          ).toBe(true);

          // GPA must be a number (non-null) since all compulsory grades are set
          expect(finalState.lastComputedGpa).not.toBeNull();
          expect(typeof finalState.lastComputedGpa).toBe("number");

          // GPA must be within valid [0, 4] range
          expect(finalState.lastComputedGpa!).toBeGreaterThanOrEqual(0);
          expect(finalState.lastComputedGpa!).toBeLessThanOrEqual(4);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ---------------------------------------------------------------------------
  // P15e — Partial compulsory grades: lastComputedGpa is non-null but
  //         at least one compulsory subject still has theoryGrade === ""
  // Validates Req 9.5: the UI must inspect subjects state (not lastComputedGpa
  // alone) to decide whether to show "—" in the banner.
  // ---------------------------------------------------------------------------

  it("partial compulsory grades: lastComputedGpa is non-null but not all compulsory theory grades present in state", () => {
    fc.assert(
      fc.property(
        arbPartialCompulsoryIds,
        arbNonEmptyGrade,
        (partialIds, grade) => {
          // Apply SET_THEORY_GRADE only to the chosen strict subset
          const finalState = partialIds.reduce((state, id) => {
            const action: CalculatorAction = {
              type: "SET_THEORY_GRADE",
              id,
              grade,
            };
            return calculatorReducer(state, action);
          }, initialState);

          const compulsorySubjects = finalState.subjects.filter(
            (s) => s.isCompulsory
          );

          // At least one compulsory subject must still have an empty theoryGrade
          expect(
            compulsorySubjects.some((s) => s.theoryGrade === "")
          ).toBe(true);

          // But lastComputedGpa must be non-null because anyInput is true
          // (the partial subjects have theoryGrade !== "")
          expect(finalState.lastComputedGpa).not.toBeNull();
          expect(typeof finalState.lastComputedGpa).toBe("number");
        }
      ),
      { numRuns: 100 }
    );
  });
});
