# Marks Mode — Implementation Reference

> **Requirements**: Requirement 10  
> **UI component**: `src/components/calculator/MarksMode.tsx`  
> **State**: `CalculatorContext` → `CalculatorState.subjects`  
> **Engine**: `src/lib/calc.ts` → `computeGpa`, `gradeComponentFromMarks`

## Overview

Marks Mode lets the user enter raw marks directly into numeric inputs. Grades and grade points are derived automatically on each keystroke — no separate "calculate" step is required. This is the most accurate entry method because it skips the grade synthesis step that Grade Mode uses.

---

## Data Flow

```
User types marks into MarksInput field
    │
    ▼
Dispatch: SET_THEORY_MARKS | SET_PRACTICAL_MARKS  (reducer.ts)
    │
    ▼
calculatorReducer updates subjects[].theoryMarks / practicalMarks
    │
    ▼
deriveLastComputedGpa(subjects) re-runs on every change
    │  (uses raw marks directly — no synthesis needed)
    ▼
state.lastComputedGpa updated
    │
    ▼
MarksMode re-renders:
    ├── SubjectTable rows → per-subject Final Grade, Grade Point, Remark
    ├── ResultBanner     → overall GPA + letter grade
    └── NG/fail warnings → red badges on failing components
```

### Why Marks Mode is more precise than Grade Mode

In Grade Mode, the reducer synthesises marks from the minimum marks of each grade band (e.g., a grade of `"B"` becomes 45/75 = 60%). Any actual marks within the band produce the same grade point, so the synthesised value correctly reproduces the grade point — but only to grade-band precision.

In Marks Mode, `theoryMarks` and `practicalMarks` are stored directly and passed to `computeGpa` without any synthesis step, preserving the full numeric fidelity of the input.

---

## Config Dependencies

| Symbol | Source | Purpose |
|--------|--------|---------|
| `COMPULSORY_SUBJECTS` | `gradingScale.ts` | Provides `theoryMax` and `practicalMax` for each row's input bounds |
| `PASS_THRESHOLDS` | `gradingScale.ts` | Raw-mark thresholds used by `gradeComponentFromMarks` to set `isFailing` |
| `NG_PERCENT_FLOOR` | `gradingScale.ts` | 35% floor below which a component is NG regardless of raw marks |
| `GRADING_SCALE` | `gradingScale.ts` | Band lookup table used inside `gradeComponentFromMarks` |
| `OPTIONAL_SUBJECT_SPLITS` | `gradingScale.ts` | `splitType`/`theoryMax`/`practicalMax` for any added optional subjects |

---

## Calculation Rules

Marks Mode uses the same engine path as Grade Mode, but with real marks instead of synthesised ones:

1. **Percent conversion**: `(marks / max) × 100` — unrounded
2. **NG floor check**: if `percent < 35`, grade is NG (GP 0.0) and `isFailing = true`
3. **Band lookup**: `percentToBand(percent)` returns the matching `GradeBand`
4. **Pass threshold check**: independent of the NG floor — if `marks < PASS_THRESHOLDS[splitType].theoryMinMarks` (or `practicalMinMarks`), `isFailing = true`
5. **Subject GP**: `subjectGradePoint(theoryGp, practicalGp, splitType)`
6. **Final GPA**: `computeGpa` accumulates credit-hour-weighted subject GPs and rounds

Pass thresholds by split type:

| Split | Theory fail below | Practical fail below |
|-------|------------------|----------------------|
| 75-25 | 27 / 75          | 9 / 25               |
| 50-50 | 18 / 50          | 18 / 50              |

---

## Component Breakdown

### `MarksMode.tsx`
Top-level tab panel for Marks Mode. Renders:
- `SubjectTable` with marks inputs
- `ResultBanner` showing GPA + letter grade
- NG/fail warnings when any component is failing

### `MarksInput.tsx`
Numeric input bounded by the row's configured `theoryMax` or `practicalMax`.

Behaviour:
- Live derivation: on each valid keystroke, the derived Final Grade and Grade Point update immediately
- On blur: if the entered value is above `max` or below `0`, it is clamped to the nearest bound and an inline error is shown
- Null state: an empty field stores `null` — not `0`; `null` means "not entered" and is treated as 0 only by the engine when computing GPA

### `ResultBanner.tsx`
Shared with Grade Mode. Shows the numeric GPA and letter once at least one compulsory subject has marks entered. Displays the "Not Passed" warning when any subject has a failing component.

---

## Zero State

On first load in Marks Mode, all `theoryMarks` and `practicalMarks` fields are `null`. The `deriveLastComputedGpa` helper checks whether `anyInput` is true before computing:

```ts
const anyInput = subjects.some(
  (s) => s.theoryGrade !== "" || s.theoryMarks !== null || s.practicalMarks !== null
);
if (!anyInput) return null;
```

As long as all marks are null and no grades are set in Grade Mode, `state.lastComputedGpa` stays `null` and the banner shows `"—"`.

---

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Marks entered: theory 26/75 (below 27 threshold) | Grade derived as `D` (≥35%), but `isFailing = true`; red badge shown on theory component |
| Marks entered: theory 20/75 (below 35% floor) | Grade is `NG` (GP 0.0), `isFailing = true`; NG warning fires in banner |
| Marks entered: 75/75 theory | Percent = 100%, band = A+ (inclusive upper), GP = 4.0 |
| Marks above max entered, then blur | Value clamped to `max`; inline error shown; grade recomputed from clamped value |
| Computer Science subject (50-50 split) | `theoryMax = 50`, `practicalMax = 50`; both inputs bounded to 50; pass threshold is 18/50 for both |
| Mixing modes (some subjects have grades, some have marks) | `deriveLastComputedGpa` prefers `theoryMarks` over `theoryGrade`; marks take priority for subjects where both are set |

---

## Interaction with Grade Mode

Both modes write to the same `SubjectRow` in shared state. When a user enters marks in Marks Mode and then switches to Grade Mode, the reducer's `deriveLastComputedGpa` uses `theoryMarks`/`practicalMarks` first (since they are non-null), so the displayed GPA is consistent between tabs. The grade-select dropdowns in Grade Mode will still show the `theoryGrade`/`practicalGrade` values (which may be `""` if the user never set them in Grade Mode), but the underlying GPA reflects the marks.
