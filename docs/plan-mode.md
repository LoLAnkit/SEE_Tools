# Plan Mode — Implementation Reference

> **Requirements**: Requirements 12, 13, 14  
> **UI component**: `src/components/calculator/PlanMode.tsx`  
> **State**: `CalculatorContext` → `CalculatorState.subjects`, `state.plan`  
> **Engine**: `src/lib/plan.ts` → `planForTarget`, `gradeToMinMarks`, `marksToGrade`

## Overview

Plan Mode takes a target GPA and works backwards to suggest a per-subject theory grade assignment that is expected to reach or exceed that target. Practicals are locked at A+ by default. The suggestion is one possible path — other grade distributions may also work.

The mode also provides a two-way live sync between the "Target Theory Grade" dropdown and the "Min Theory Marks" input: changing either one updates the other instantly and recomputes the GPA without any separate "calculate" step.

---

## Data Flow

### Auto-fill (on "Plan" button activation)

```
User enters target GPA and presses "Plan"
    │
    ▼
PlanMode.tsx reads state.subjects (shared with Grade/Marks)
    │
    ▼
planForTarget(subjects, targetGpa) called  (plan.ts)
    │  1. Compute practical contribution (all practicals at A+, GP 4.0)
    │  2. Solve uniform theory GP via formula
    │  3. Snap down to nearest discrete grade
    │  4. Greedy bump: raise highest-CH subject until GPA ≥ target
    ▼
Returns PlanResult { suggestion: PlanSubjectGrade[], message: string | null }
    │
    ▼
PlanMode.tsx updates local display state with suggestions
    │
    ▼
PlanBanner updates: Target GPA vs Live GPA, delta, colour
```

### Two-way sync (on grade dropdown or min-marks input change)

```
User changes grade dropdown
    │
    ▼
gradeToMinMarks(grade, theoryMax) → min marks for that grade
    │
    ▼
marksToGrade(marks, theoryMax) is the reverse direction (not needed here)
    │
    ▼
Local plan state updates: theoryGrade, minTheoryMarks, subjectGP
    │
    ▼
computeGpa re-runs over all current suggestions → Live GPA updates
    │
    ▼
PlanBanner re-renders with new delta
```

---

## Config Dependencies

| Symbol | Source | Purpose |
|--------|--------|---------|
| `THEORY_MIN_MARKS` | `gradingScale.ts` | Lookup table for minimum theory marks per grade per split type |
| `GRADING_SCALE` | `gradingScale.ts` | Band lookup for `marksToGrade`; grade point lookup for solver internals |
| `NG_PERCENT_FLOOR` | `gradingScale.ts` | 35% floor used in `marksToGrade` to return NG |
| `PASS_THRESHOLDS` | `gradingScale.ts` | Used by `computeGpa` when verifying if a suggested plan produces any failing components |
| `COMPULSORY_SUBJECTS` | `gradingScale.ts` | Source of subjects read from shared state |

---

## Calculation Rules

### Plan solver algorithm (`planForTarget`)

Located in `src/lib/plan.ts`. Input: `subjects: PlanSubject[]`, `targetGpa: number`.

1. **Edge — target ≤ 1.60 (minimum passing GPA)**  
   Assign grade `"D"` to all subjects. Return with message: `"Minimum passing suggestion: all subjects at grade D (GPA 1.60)."` (Requirement 12.8)

2. **Lock practicals at A+ (GP 4.0)**  
   Compute the practical contribution:
   ```
   practicalContribution = Σ(CH × 4.0 × practicalWeight)
   ```
   where `practicalWeight = 0.25` for `"75-25"` and `0.50` for `"50-50"`.

3. **Solve uniform theory GP**
   ```
   uniformGP = (targetGpa × totalCH − practicalContribution) / Σ(CH × theoryWeight)
   ```
   where `theoryWeight = 0.75` for `"75-25"` and `0.50` for `"50-50"`.

4. **Snap down** `uniformGP` to the nearest discrete grade point in `GRADE_ORDER` (D, C, C+, B, B+, A, A+). NG is never suggested — D is the floor.

5. **Greedy bump** — while the computed GPA is still below the target:
   - Find the subject with the highest credit hours that can still be raised (i.e., not already A+)
   - Ties broken by first occurrence in the subject list
   - Raise it by one grade
   - Recompute GPA
   - Repeat until GPA ≥ target or no subject can be raised

6. **Edge — all A+**: If every subject is at A+ after bumping, message: `"Maximum achievable GPA is 4.00."` (Requirement 12.7)

7. **Edge — estimate**: If exact target is not achievable on discrete grades, the result is labelled with message: `"Estimated: nearest achievable GPA at or above target."` (Requirement 12.9)

8. **Exact match**: If the achieved GPA equals the target exactly, `message = null`.

### Grade → min marks conversion (`gradeToMinMarks`)

```
gradeToMinMarks(grade, theoryMax) → THEORY_MIN_MARKS[splitType][grade]
```

`NG` maps to 0 (no positive target). Split type is derived from `theoryMax`: `50 → "50-50"`, anything else → `"75-25"`.

Standard subject min theory marks (75 max):

| Grade | Min marks |
|-------|-----------|
| A+    | 68        |
| A     | 60        |
| B+    | 53        |
| B     | 45        |
| C+    | 38        |
| C     | 30        |
| D     | 27        |

Computer Science min theory marks (50 max):

| Grade | Min marks |
|-------|-----------|
| A+    | 45        |
| A     | 40        |
| B+    | 35        |
| B     | 30        |
| C+    | 25        |
| C     | 20        |
| D     | 18        |

These values equal `ceil(minPercent × theoryMax / 100)` for each band. A unit test in `src/config/gradingScale.minmarks.test.ts` asserts this equivalence to prevent silent drift.

### Marks → grade conversion (`marksToGrade`)

```
percent = (marks / theoryMax) × 100
if percent < NG_PERCENT_FLOOR: return "NG"
walk GRADING_SCALE high→low: return first band where percent >= band.minPercent
```

---

## Component Breakdown

### `PlanMode.tsx`
Top-level panel. Renders:
- Target GPA input + "Plan" button
- Inline error if target is > 4.0 or non-numeric
- `PlanBanner` with live Target vs Live GPA comparison
- Plan table with per-subject rows (grade dropdown + min-marks input + practical column)
- "Edit practicals" toggle
- Add/remove optional subject controls

### `PlanBanner.tsx`
Displays Target GPA and Live GPA side by side:
- Green when Live GPA ≥ Target GPA
- Amber when Live GPA < Target GPA
- Always shows the numeric delta (±)
- Shows a NG/fail warning if any subject would not pass

### Two-way sync rules

- **Grade changed** → `minTheoryMarks = gradeToMinMarks(newGrade, theoryMax)`; subject GP and GPA recompute
- **Marks changed** (valid whole number) → `percent = (value / theoryMax) × 100`; `newGrade = marksToGrade(marks, theoryMax)`; subject GP and GPA recompute
- **Marks out of range** → clamp to `[0, theoryMax]`; show inline error; recompute from clamped value
- **Marks empty/non-numeric** → retain last valid value; show "whole number required" error; leave GP/GPA unchanged

---

## State Shape (Plan-specific)

```ts
state.plan = {
  targetGpa: number | null,   // the user's entered target
  editPracticals: boolean,    // whether practical inputs are unlocked
  message: string | null,     // solver message (estimate / max / min)
}
```

The actual per-subject theory grades for Plan Mode are managed as local component state in `PlanMode.tsx`, not stored in the global reducer. The global `state.subjects` array is read as the base subject configuration (credit hours, splitType, maxes) but Grade/Marks inputs from other tabs are not used by the plan solver.

---

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Target GPA = 0 | All subjects assigned "D"; minimum-passing message shown |
| Target GPA = 1.60 | All subjects assigned "D" (1.60 is the all-D result); minimum-passing message |
| Target GPA = 4.00 | Solver bumps until all A+; "Maximum achievable GPA is 4.00." message |
| Target GPA > 4.00 or non-numeric | Validation error shown; previous plan state preserved |
| CS subject (50-50 split) | Solver uses `theoryWeight = 0.5`, `practicalWeight = 0.5`; min-marks table uses 50-max values |
| Optional subject added mid-plan | Plan auto-re-runs with the new subject; GPA recomputes immediately |
| Optional subject removed mid-plan | Plan auto-re-runs without the removed subject; GPA recomputes immediately |
| Greedy bump stalls (no subject can go higher) | Loop exits; if GPA < target, "Estimated" message is shown |
| Edit practicals toggle on | Each practical gets its own grade dropdown + min-marks input with the same two-way sync |
