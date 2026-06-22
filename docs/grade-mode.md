# Grade Mode — Implementation Reference

> **Requirements**: Requirement 9  
> **UI component**: `src/components/calculator/GradeMode.tsx`  
> **State**: `CalculatorContext` → `CalculatorState.subjects`  
> **Engine**: `src/lib/calc.ts` → `computeGpa`

## Overview

Grade Mode is the primary interaction method. The user selects letter grades from dropdowns for each subject's theory and practical components. Per-subject results (Final Grade, Grade Point, Remark) and the overall GPA are derived live as selections are made.

---

## Data Flow

```
User selects grade (GradeSelect dropdown)
    │
    ▼
Dispatch: SET_THEORY_GRADE | SET_PRACTICAL_GRADE  (reducer.ts)
    │
    ▼
calculatorReducer updates subjects[].theoryGrade / practicalGrade
    │
    ▼
deriveLastComputedGpa(subjects) re-runs on every change
    │  (synthesises marks from grade min-percent, passes to computeGpa)
    ▼
state.lastComputedGpa updated
    │
    ▼
GradeMode re-renders:
    ├── SubjectTable rows → per-subject Final Grade, Grade Point, Remark
    ├── ResultBanner     → overall GPA + letter grade
    ├── GradeChart       → bar chart of per-subject GPs (Grade mode only)
    └── MarksheetPreview → full simulated marksheet
```

### How `deriveLastComputedGpa` converts grades to marks

Because `computeGpa` operates on raw marks, the reducer synthesises marks from grade selections using the minimum marks for each band:

- `"A+"` → full `theoryMax` (guarantees A+ on lookup)
- `"NG"` → 0
- Any other grade → `ceil(band.minPercent × theoryMax / 100)`

This round-trip is guaranteed to reproduce the same grade point, so the GPA display always reflects the selected grades accurately.

---

## Config Dependencies

| Symbol | Source | Purpose |
|--------|--------|---------|
| `COMPULSORY_SUBJECTS` | `gradingScale.ts` | Pre-fills the six locked rows on mount |
| `GRADING_SCALE` | `gradingScale.ts` | Powers `GradeSelect` dropdown options and band min-percent lookup |
| `OPTIONAL_I_CHOICES`, `OPTIONAL_II_CHOICES` | `gradingScale.ts` | Quick-select lists for optional subject dropdowns |
| `OPTIONAL_SUBJECT_SPLITS`, `DEFAULT_OPTIONAL_SPLIT` | `gradingScale.ts` | Sets `splitType`, `theoryMax`, `practicalMax` when an optional subject is added |
| `DEFAULT_OPTIONAL_CH` | `gradingScale.ts` | Credit hours assigned to added optional subjects |

---

## Calculation Rules

Grade Mode itself performs no calculation — it only manages the `theoryGrade` and `practicalGrade` fields on each `SubjectRow`. Computation is entirely delegated to the engine:

1. `gradeComponentFromMarks` converts synthesised marks → percentage → band → `ComponentResult`
2. `subjectGradePoint` computes the weighted subject GP from the two component GPs
3. `computeGpa` accumulates `Σ(CH × subjectGP) / Σ(CH)` and rounds with `roundHalfUp2`

See [`methodology.md`](./methodology.md) for the full calculation algorithm.

---

## Component Breakdown

### `GradeMode.tsx`
Top-level tab panel for Grade Mode. Renders:
- `SubjectTable` with grade-select inputs
- `ResultBanner` showing GPA + letter
- `GradeChart` (visible only when GPA is computed)
- `MarksheetPreview` (visible only when GPA is computed)

### `SubjectTable.tsx`
Renders the subjects grid. Columns: Subject, CH, Theory, Practical, Final Grade, Grade Point, Remark, (delete for optional rows).

### `GradeSelect.tsx`
Accessible dropdown (ARIA `combobox`/`listbox` pattern) showing each option as `"A+ (4.00)"`. Used for both theory and practical grade selections.

### `ResultBanner.tsx`
Shows the numeric GPA and mapped letter grade once all compulsory subjects have a theory grade selected. Displays `"—"` while any compulsory theory grade is empty.

### `GradeChart.tsx`
CSS/SVG bar chart showing per-subject grade points scaled against the 4.0 maximum. Rendered only in Grade Mode after a GPA is computed.

### `MarksheetPreview.tsx`
Simulated official SEE marksheet with per-row theory/practical grades and marks, plus the GPA footer. Shown only after a GPA is computed.

---

## Zero State

On first load:
- All six compulsory rows render with theory cells showing `"--"` (empty string)
- Practical cells default to `"A+"` per Requirement 9.2
- Per-subject Final Grade and Grade Point show `"—"`
- GPA banner shows `"—"`
- `state.lastComputedGpa` is `null`

The zero state is driven by `initialState` in `reducer.ts`, which maps `COMPULSORY_SUBJECTS` to `SubjectRow` objects with `theoryGrade: ""` and `practicalGrade: "A+"`.

---

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Theory grade empty, practical set | Subject row shows `"—"` for Final Grade and GP; subject is excluded from GPA |
| Optional subject added | `ADD_OPTIONAL_SUBJECT` action fires; GPA recomputes immediately |
| Optional subject deleted | `REMOVE_SUBJECT` action fires; all errors keyed to that subject id are also cleared |
| Grade selected → NG | Subject GP is 0.0; if it causes `isNg`, ResultBanner shows a red "Not Passed" warning naming the subject |
| All compulsory grades filled, 1+ optional has empty theory | Optional subjects with empty theory contribute 0 marks (NG) and are included in the GPA; the NG warning fires |

> **Note on optional subjects with empty grades**: If an optional subject row has been added but its theory grade is left as `""`, `deriveLastComputedGpa` synthesises 0 theory marks, which is below the NG floor (35%), producing NG (GP 0.0) for that subject. To avoid a spurious NG, users should either fill in the optional subject or remove it.
