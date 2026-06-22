# Eligibility Checker — Implementation Reference

> **Requirements**: Requirement 15  
> **UI component**: `src/components/calculator/EligibilityChecker.tsx`  
> **State**: `CalculatorContext` → `CalculatorState.eligibility`, `state.lastComputedGpa`  
> **Engine**: `src/lib/eligibility.ts` → `evaluateEligibility`, `validateRequiredGrades`

## Overview

The Eligibility Checker evaluates which NEB +2 streams (Science, Management, Humanities) a student qualifies for based on their overall GPA and the grade points of five key subjects. It reads the computed GPA from shared state automatically, but all values are editable before checking.

---

## Data Flow

```
Tab opened: Eligibility Checker reads state.lastComputedGpa
    │  Auto-populates the GPA field if a GPA has been computed
    ▼
User selects grades for 5 required subjects
User may edit the GPA field manually
    │
    ▼
Dispatch: SET_ELIGIBILITY_GRADE | SET_MANUAL_GPA  (reducer.ts)
    │
    ▼
state.eligibility.requiredGrades updated
state.eligibility.manualGpa updated
state.eligibility.result set to null (previous result cleared on any input change)
    │
    ▼
User presses "Check" button
    │
    ▼
validateRequiredGrades(requiredGrades) called  (eligibility.ts)
    │  If any of 5 required subjects is empty → show error, no verdict
    ▼
evaluateEligibility(gpa, requiredGrades) called  (eligibility.ts)
    │  For each stream rule: check minGpa, then each subject's GP ≥ required
    ▼
EligibilityResult { qualifying: string[], details: StreamVerdict[] }
    │
    ▼
Dispatch stores result in state.eligibility.result
    │
    ▼
EligibilityChecker renders:
    ├── Verdict line listing qualifying streams (or "no stream qualifies")
    └── Per-stream StreamDetailCard with ✓/✗ per requirement
```

---

## Config Dependencies

| Symbol | Source | Purpose |
|--------|--------|---------|
| `STREAM_RULES` | `gradingScale.ts` | Defines `minGpa` and `subjectMinGp` for each of the three streams |
| `GRADING_SCALE` | `gradingScale.ts` | Used by `gradeToGp()` helper to convert a letter grade to its numeric GP |
| `RequiredSubjectId` | `gradingScale.ts` | Type-safe keys: `english`, `nepali`, `socialStudies`, `math`, `science` |

No literal grade-point values appear in `eligibility.ts` — all thresholds are read from `STREAM_RULES` at runtime.

---

## Stream Eligibility Rules

Rules are defined in `STREAM_RULES` in `src/config/gradingScale.ts`. Comparisons are always **numeric GP vs numeric GP** — grade strings are never compared directly (Requirement 15.3).

### Science
- Overall GPA ≥ 2.0
- Science ≥ C+ (GP 2.4)
- Mathematics ≥ C+ (GP 2.4)
- English ≥ D (GP 1.6)
- Nepali ≥ D (GP 1.6)
- Social Studies ≥ D (GP 1.6)

### Management
- Overall GPA ≥ 1.6
- English ≥ D (GP 1.6)
- Nepali ≥ D (GP 1.6)
- Mathematics ≥ D (GP 1.6)
- Science ≥ D (GP 1.6)
- Social Studies ≥ D (GP 1.6)

### Humanities
- Overall GPA ≥ 1.6
- English ≥ D (GP 1.6)
- Nepali ≥ D (GP 1.6)
- Social Studies ≥ D (GP 1.6)

A stream passes only when **all** checks pass.

---

## Calculation Rules

### `evaluateEligibility(gpa, grades)`

Located in `src/lib/eligibility.ts`.

For each stream in `STREAM_RULES`:

1. Check `gpa >= rule.minGpa` — the overall GPA check
2. For each entry in `rule.subjectMinGp`:
   - Look up the letter grade from `grades[subjectId]`
   - Convert to numeric GP via `gradeToGp(letterGrade)` (looks up `GRADING_SCALE`)
   - A missing or `""` grade is treated as 0 GP
   - Check `actualGp >= requiredGp`
3. Stream passes only if **every** check passes

Returns:
```ts
EligibilityResult {
  qualifying: ("Science" | "Management" | "Humanities")[];
  details: StreamVerdict[];
}

StreamVerdict {
  stream: string;
  passed: boolean;
  checks: { label: string; required: number; actual: number; pass: boolean }[];
}
```

### `validateRequiredGrades(grades)`

Checks that all five required subject ids (`english`, `nepali`, `socialStudies`, `math`, `science`) have a non-empty grade. Returns `{ valid: boolean, missing: RequiredSubjectId[] }`. The UI calls this before `evaluateEligibility` — if `valid` is false, no verdict is displayed and an error lists the missing subjects.

---

## Component Breakdown

### `EligibilityChecker.tsx`
Main tab panel. Renders:
- Overall GPA field (auto-populated from `state.lastComputedGpa` or `state.eligibility.manualGpa`)
- Five subject grade dropdowns (English, Nepali, Social Studies, Mathematics, Science)
- "Check" button
- Validation errors (if any required grade is missing)
- Verdict line
- Per-stream `StreamDetailCard` components
- Always-visible `StreamCriteriaTable` (static reference, no input required)

### `StreamCriteriaTable.tsx`
Static reference table showing all three streams' requirements, always visible before any input. Sourced directly from `STREAM_RULES`.

### `StreamDetailCard.tsx`
Per-stream card shown after the "Check" action. Displays each requirement with a ✓ or ✗ marker. Failed requirements are highlighted in red. Rendered for all three streams regardless of pass/fail.

---

## State Shape (Eligibility-specific)

```ts
state.eligibility = {
  manualGpa: number | null,                              // user-entered override GPA
  requiredGrades: Record<RequiredSubjectId, LetterGrade | "">,  // 5 subject grades
  result: EligibilityResult | null,                     // null until Check is pressed
}
```

The effective GPA used for the check is:
1. `state.eligibility.manualGpa` if set
2. Otherwise `state.lastComputedGpa`
3. Otherwise 0 (treated as unset — the GPA field will show empty)

Any change to `requiredGrades` or `manualGpa` immediately sets `result` back to `null`, clearing the previous verdict until Check is pressed again.

---

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| GPA computed in Grade/Marks Mode, then Eligibility tab opened | GPA field auto-populates from `state.lastComputedGpa` |
| User enters manual GPA above 4.00 | Value clamped to 4.00; inline error shown |
| User enters manual GPA below 0.00 | Value clamped to 0.00; inline error shown |
| One or more of the 5 required grades left as `"--"` | `validateRequiredGrades` returns `valid: false`; error names missing subjects; no verdict rendered |
| No stream qualifies | Verdict displays: "No +2 stream qualifies based on the entered grades" |
| All three streams qualify (e.g., strong GPA + all grades above Science threshold) | All three listed in the qualifying verdict |
| Grade of `"NG"` selected for a required subject | `gradeToGp("NG") = 0`; all streams that require that subject ≥ D (1.6) will fail that check |
| Optional subjects not shown in Eligibility | By design — only the 5 fixed required subjects are evaluated per Requirement 15.2 |
