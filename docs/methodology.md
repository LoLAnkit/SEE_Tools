# NEB SEE GPA Calculation Methodology

> **Source of truth**: `src/config/gradingScale.ts`  
> **Calculation engine**: `src/lib/calc.ts`

## Overview

The official NEB SEE GPA is computed by **weighting grade points, not raw marks**. Raw marks are never summed or averaged directly. Each component is converted to a percentage, mapped to a discrete grade band, and grade points are what get weighted.

This distinction matters: two students with the same raw total can have different GPAs if their marks fall across different grade band boundaries.

---

## Step 1 — Component Percentage Conversion

For each subject, theory and practical components are each converted to a percentage independently:

```
percent = (marks / max) × 100
```

The result is **unrounded** and kept at full floating-point precision for the band lookup. The valid range for a well-formed input is `[0, 100]`.

**Config reference**: `marksToPercent(marks, max)` in `src/lib/calc.ts`

---

## Step 2 — Grade Band Lookup

Each percentage is mapped to one of the eight SEE 4.0 grade bands via a contiguous lookup. Bands use **inclusive lower bound / exclusive upper bound** semantics, except the top band (A+) which is inclusive of 100.

| Grade | GP  | Range              | Description          |
|-------|-----|--------------------|----------------------|
| A+    | 4.0 | 90 ≤ p ≤ 100       | Outstanding          |
| A     | 3.6 | 80 ≤ p < 90        | Excellent            |
| B+    | 3.2 | 70 ≤ p < 80        | Very Good            |
| B     | 2.8 | 60 ≤ p < 70        | Good                 |
| C+    | 2.4 | 50 ≤ p < 60        | Satisfactory         |
| C     | 2.0 | 40 ≤ p < 50        | Acceptable           |
| D     | 1.6 | 35 ≤ p < 40        | Partially Acceptable |
| NG    | 0.0 | 0 ≤ p < 35         | Not Graded           |

**Special rule — NG floor**: Any component percentage below **35%** is immediately classified as NG (GP 0.0), regardless of raw marks.

**Config reference**: `GRADING_SCALE` constant and `percentToBand(percent)` in `src/lib/calc.ts`

---

## Step 3 — Subject Grade Point (Weighted Average of Component GPs)

The subject grade point is the **weighted average of the two component grade points**, not of the raw marks. The weighting depends on the subject's `splitType`:

### Standard subjects (`splitType: "75-25"`)
Applies to all six compulsory subjects and most optional subjects:

```
subjectGP = (theoryGP × 0.75) + (practicalGP × 0.25)
```

### Computer Science (`splitType: "50-50"`)
Computer Science uses an equal 50/50 split (theoryMax 50, practicalMax 50):

```
subjectGP = (theoryGP × 0.50) + (practicalGP × 0.50)
```

The `splitType` flag drives behavior — the code never identifies Computer Science by matching the subject name string.

The subject GP is left **unrounded** at this stage.

**Config reference**: `SplitType` type in `src/config/gradingScale.ts`  
**Engine reference**: `subjectGradePoint(theoryGp, practicalGp, splitType)` in `src/lib/calc.ts`

---

## Step 4 — Final GPA (Credit-Hour-Weighted Average)

The final GPA is the credit-hour-weighted average of the **unrounded subject grade points**:

```
GPA = Σ(CH × subjectGP) / Σ(CH)
```

Full-precision (unrounded) subject GPs are used throughout the summation to avoid compounding rounding errors.

### Credit hours by subject

| Subject                          | CH |
|----------------------------------|----|
| Nepali                           | 5  |
| English                          | 5  |
| Mathematics                      | 5  |
| Science and Technology           | 5  |
| Social Studies                   | 4  |
| Health, Population & Environment | 4  |
| Optional-I (any)                 | 4  |
| Optional-II (any)                | 4  |

**Engine reference**: `computeGpa(subjects: ScoredSubject[])` in `src/lib/calc.ts`

---

## Step 5 — Rounding

The raw GPA is rounded to **2 decimal places using round-half-away-from-zero** (round-half-up for positive values). This matches the NEB official marksheet.

The implementation uses an epsilon-safe approach to handle binary floating-point edge cases (e.g., `2.675` is stored as `2.6749999...` in IEEE 754):

```ts
roundHalfUp2(x) {
  const EPSILON = 1e-8;
  const sign = x < 0 ? -1 : 1;
  const scaled = x * 100;
  const rounded = Math.round(scaled + sign * EPSILON);
  return rounded / 100;
}
```

**Engine reference**: `roundHalfUp2(x)` in `src/lib/calc.ts`

---

## Step 6 — GPA → Letter Grade Mapping

The rounded GPA is mapped to a letter grade via `GPA_LETTER_BANDS`. Bands are contiguous and gap-free across `[0, 4]`, inclusive lower / exclusive upper, with the top band (A+) inclusive of 4.00:

| Letter | GPA Range        |
|--------|------------------|
| A+     | 3.60 ≤ GPA ≤ 4.00 |
| A      | 3.20 ≤ GPA < 3.60 |
| B+     | 2.80 ≤ GPA < 3.20 |
| B      | 2.40 ≤ GPA < 2.80 |
| C+     | 2.00 ≤ GPA < 2.40 |
| C      | 1.60 ≤ GPA < 2.00 |
| D      | 0.80 ≤ GPA < 1.60 |
| NG     | 0.00 ≤ GPA < 0.80 |

Input is clamped to `[0, 4]` before lookup.

**Config reference**: `GPA_LETTER_BANDS` and `gpaToLetter(gpa)` in `src/config/gradingScale.ts`

---

## Pass Thresholds

A component can receive a grade above NG but still be "failing" if the raw marks fall below a minimum threshold. These thresholds apply independently of the percentage band:

| Split   | Theory min marks | Practical min marks |
|---------|-----------------|---------------------|
| 75-25   | 27 / 75         | 9 / 25              |
| 50-50   | 18 / 50         | 18 / 50             |

A subject is considered "not passed" if **any** component is either NG (below 35%) or below its raw-mark threshold. This propagates to the overall result: if any subject is not passed, the overall result is "Not Passed".

**Config reference**: `PASS_THRESHOLDS` and `NG_PERCENT_FLOOR` in `src/config/gradingScale.ts`

---

## Why This Matters (vs Naive Raw-Mark Averaging)

Consider two students who both score 60/75 in theory and 20/25 in practical for a standard subject:

- Theory percent: 80% → Grade A → GP 3.6  
- Practical percent: 80% → Grade A → GP 3.6  
- Subject GP: `(3.6 × 0.75) + (3.6 × 0.25) = 3.6`

Now consider a student who scores 67/75 theory and 14/25 practical (same total = 81):

- Theory percent: 89.3% → Grade A → GP 3.6  
- Practical percent: 56% → Grade C+ → GP 2.4  
- Subject GP: `(3.6 × 0.75) + (2.4 × 0.25) = 3.3`

Despite having the same raw total (81), the second student gets a lower subject GP because the practical mark fell into a lower band. Raw-mark averaging would give both students the same result — the NEB method does not.
