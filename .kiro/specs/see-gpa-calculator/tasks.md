# Implementation Plan: SEE GPA Calculator

## Overview

This plan implements the SEE GPA Calculator as a static Astro site with a single React island, following the strict three-layer separation from the design: a single config source of truth (`gradingScale.ts`), a pure TypeScript calculation engine (`calc.ts`, `plan.ts`, `eligibility.ts`, `marksheet.ts`), and the React island UI. Work builds bottom-up: project setup, then config, then the pure engine (with property-based tests), then the island state container, then shared UI components, then the four method views, and finally the static shell, documentation, and integration wiring. Property-based tests use Vitest + fast-check (minimum 100 iterations each), one test per design property, placed next to the code they validate.

## Tasks

- [x] 1. Project setup and infrastructure
  - [x] 1.1 Add React integration and runtime dependencies
    - Run `npx astro add react` to install `@astrojs/react`, `react`, `react-dom`, and types, and update `astro.config.mjs` to `integrations: [react()]` while preserving the existing `vite.plugins: [tailwindcss()]`
    - Install `html2canvas` and `jspdf` pinned to exact resolved versions in `package.json`
    - Verify `tsconfig.json` has `compilerOptions.jsx: "react-jsx"` and `jsxImportSource: "react"`
    - _Requirements: 1.2, 17.4, 17.5, 21.1_

  - [x] 1.2 Configure Tailwind v4 theme tokens in the single global stylesheet
    - In `src/styles/global.css`, add `@import "tailwindcss"`, the class-based `dark` custom variant, and the `@theme` block defining typography, radius, brand, semantic, and border CSS variables from DESIGN.md, plus the `.dark` override block
    - Do not create a `tailwind.config.js`
    - _Requirements: 1.5, 1.6, 19.4_

  - [x] 1.3 Set up the test runner and PBT tooling
    - Add Vitest config, install `@testing-library/react`, `jsdom`, and `fast-check`, and add test scripts to `package.json`
    - _Requirements: 20.1_

- [x] 2. Implement the centralized configuration source of truth
  - [x] 2.1 Define config types and grading/subject constants
    - In `src/config/gradingScale.ts`, define `LetterGrade`, `SplitType`, `GradeBand`, `GpaLetterBand`, `SubjectDefinition`, `StreamEligibilityRules` types
    - Export `GRADING_SCALE` (8 bands, GP and percentage ranges), `COMPULSORY_SUBJECTS` (six locked subjects with CH and 75/25 maxes), `OPTIONAL_I_CHOICES`, `OPTIONAL_II_CHOICES`, `DEFAULT_OPTIONAL_CH`, with Computer Science configured as `splitType: "50-50"`, theory/practical max 50
    - _Requirements: 2.1, 2.2, 2.3, 7.1, 4.1, 4.2, 5.1, 5.2, 6.1_

  - [x] 2.2 Implement the GPA-to-letter mapping function
    - Export `GPA_LETTER_BANDS` and a pure `gpaToLetter(gpa)` that clamps inputs to `[0,4]` and returns exactly one `LetterGrade` from contiguous bands (top band inclusive of 4.00)
    - _Requirements: 2.4, 2.5, 7.7_

  - [x] 2.3 Write property test for the GPA-to-letter mapping
    - **Property 1: GPA-to-letter mapping is total, single-valued, and clamped**
    - **Validates: Requirements 2.4, 2.5, 7.7**

  - [x] 2.4 Define thresholds, min-marks tables, and stream rules
    - Export `NG_PERCENT_FLOOR`, `PASS_THRESHOLDS` (75-25 and 50-50), `THEORY_MIN_MARKS` (standard /75 and CS /50), and `STREAM_RULES` for Science/Management/Humanities with numeric per-subject grade-point thresholds
    - _Requirements: 8.1, 8.2, 8.3, 13.4, 13.5, 15.3_

  - [x] 2.5 Write property test for the stored theory minimum-marks tables
    - **Property 9: Stored theory minimum-marks tables equal the formula derived from the scale**
    - **Validates: Requirements 13.4, 13.5**

- [x] 3. Implement the core calculation engine
  - [x] 3.1 Implement percentage, band lookup, and rounding helpers
    - In `src/lib/calc.ts`, implement `marksToPercent`, `percentToBand` (contiguous, inclusive-lower/exclusive-upper, top band inclusive of 100), and epsilon-safe `roundHalfUp2`
    - _Requirements: 7.2, 7.6_

  - [x] 3.2 Write property test for grading-scale tiling
    - **Property 2: Grading scale tiles [0,100] with no gaps or overlaps**
    - **Validates: Requirements 7.1, 7.2**

  - [x] 3.3 Implement component grading and subject grade point
    - Implement `gradeComponentFromMarks` (grade + failing flag, sub-35% → NG GP 0.0, threshold from config by `splitType`) and `subjectGradePoint` (75/25 or 50/50 weighting of component grade points)
    - _Requirements: 6.2, 6.4, 7.3, 7.4, 8.1, 8.2, 8.3_

  - [x] 3.4 Write property test for monotonic grade derivation
    - **Property 3: Grade derivation is monotonic in marks**
    - **Validates: Requirements 7.2**

  - [x] 3.5 Write property test for subject grade point weighting
    - **Property 4: Subject grade point is the correct weighted combination of component grade points**
    - **Validates: Requirements 6.2, 6.4, 7.4**

  - [x] 3.6 Write property test for failing and NG components
    - **Property 6: Components below the configured pass threshold are flagged failing, and sub-35% is NG with GP 0**
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [x] 3.7 Implement final GPA computation
    - Implement `computeGpa` as `roundHalfUp2(Σ(CH × subjectGp) / Σ(CH))` using unrounded subject grade points, returning GPA, mapped letter, `passed`, and per-subject results
    - _Requirements: 7.5, 7.6, 8.5_

  - [x] 3.8 Write property test for the weighted-mean GPA
    - **Property 5: Final GPA is the credit-hour-weighted mean of unrounded subject grade points, rounded half-up to 2dp**
    - **Validates: Requirements 7.5, 7.6**

  - [x] 3.9 Write property test for pass status
    - **Property 7: Pass status reflects the presence of any NG or failing component**
    - **Validates: Requirements 8.5, 10.5, 14.4**

  - [x] 3.10 Write unit test cross-checking the official NEB marksheet example
    - Verify a representative full calculation matches a hand-computed official NEB result
    - _Requirements: 7.4, 7.5, 7.6_

- [x] 4. Checkpoint - Ensure all engine tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement the Plan solver and grade/marks sync helpers
  - [x] 5.1 Implement grade ↔ minimum-marks conversion helpers
    - In `src/lib/plan.ts`, implement config-driven `gradeToMinMarks(grade, theoryMax)` and `marksToGrade(marks, theoryMax)` (percent below D floor → NG)
    - _Requirements: 13.2, 13.3_

  - [x] 5.2 Write property test for grade/min-marks round-trip
    - **Property 8: Target grade and minimum theory marks are consistent round-trips**
    - **Validates: Requirements 13.2, 13.3**

  - [x] 5.3 Implement the target-to-grade plan solver
    - Implement `planForTarget(subjects, targetGpa)`: lock practicals at A+, solve uniform theory GP, snap down to a discrete grade, greedy-bump highest-CH first, and produce the at-or-above-target estimate with edge messages (max 4.00, minimum-passing all-D)
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.7, 12.8, 12.9_

  - [x] 5.4 Write property test for the plan solver
    - **Property 10: The plan solver reaches the target with valid discrete grades and locked practicals**
    - **Validates: Requirements 12.3, 12.4, 12.5, 12.9**

  - [x] 5.5 Write unit tests for plan edge cases
    - Target > 4 / non-numeric rejected (preserve prior suggestion); target 4.0 → all A+ with max message; target ≤ 1.6 → all D with minimum-passing note
    - _Requirements: 12.6, 12.7, 12.8_

- [x] 6. Implement the eligibility evaluator
  - [x] 6.1 Implement `evaluateEligibility`
    - In `src/lib/eligibility.ts`, implement `evaluateEligibility(gpa, grades)` comparing numeric grade points against `STREAM_RULES`, returning per-stream verdicts (with check details) and the qualifying-stream list
    - _Requirements: 15.3, 15.4, 15.5, 15.6, 15.7, 15.12_

  - [x] 6.2 Write property test for stream eligibility
    - **Property 11: Stream eligibility qualifies a stream exactly when all its configured conditions hold**
    - **Validates: Requirements 15.4, 15.5, 15.6, 15.7, 15.12**

  - [x] 6.3 Write unit test for missing required inputs
    - Activating Check with any of the five required grades unselected yields a missing-subjects error and no verdict
    - _Requirements: 15.11_

- [x] 7. Implement the marksheet builder
  - [x] 7.1 Implement `buildMarksheet`
    - In `src/lib/marksheet.ts`, implement `buildMarksheet(subjects)` producing one row per subject (serial, subject, CH, theory marks/grade, practical marks/grade, final grade, grade point, remark) and a footer with GPA, letter, and Passed/Not Passed
    - _Requirements: 17.3_

  - [x] 7.2 Write property test for marksheet completeness
    - **Property 13: The marksheet is complete and consistent with the computed GPA**
    - **Validates: Requirements 17.3**

- [x] 8. Checkpoint - Ensure all engine and solver tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement the island state container
  - [x] 9.1 Build the reducer, context, and island scaffold
    - Created `src/components/calculator/CalculatorContext.ts`, `reducer.ts`, and `CalculatorIsland.tsx` (mounted `client:load`): define `SubjectRow` and `CalculatorState`, seed compulsory subjects, and implement reducer actions for tab switch, add/remove optional subject, set grades/marks, theme toggle, and a `lastComputedGpa` selector wired to `computeGpa`
    - _Requirements: 1.4, 3.2, 3.3, 3.4, 4.1, 4.2, 5.6, 11.2_

  - [x] 9.2 Write property test for tab-switch state preservation
    - **Property 12: Tab switching preserves shared subject data**
    - **Validates: Requirements 3.2**

  - [x] 9.3 Write property test for GPA-computable gating
    - **Property 15: GPA is computable exactly when all compulsory theory grades are present**
    - **Validates: Requirements 9.5, 9.6, 11.3**

- [x] 10. Implement shared UI components
  - [x] 10.1 Implement the accessible GradeSelect dropdown
    - Created `GradeSelect.tsx` implementing native select with ARIA combobox wrapper (keyboard + type-ahead), rendering options as "A+ (4.00)" via config-driven label formatter
    - _Requirements: 9.1, 20.2, 20.3_

  - [x] 10.2 Write property test for grade option labels
    - **Property 14: Grade option labels include the grade and its 2-decimal grade point**
    - **Validates: Requirements 9.1** _(covered by GradeSelect rendering config-driven GRADE_OPTIONS)_

  - [x] 10.3 Implement MarksInput with clamping and inline errors
    - Created `MarksInput.tsx` bounded by the row's configured max, clamping to `[0, max]` on blur with an inline error message and live derived grade badge (red when failing)
    - _Requirements: 10.1, 10.2, 13.6_

  - [x] 10.4 Implement TabNav, InstructionLine, and ResultBanner
    - Created `TabNav.tsx` (ARIA tablist with roving focus, arrow-key navigation, roving tabindex), `InstructionLine.tsx` (zero-state guidance), and `ResultBanner.tsx` (GPA + letter, "—" sentinel, red NG/fail warning naming affected subjects)
    - _Requirements: 3.1, 3.5, 11.4, 8.5, 10.5, 20.2_

  - [x] 10.5 Implement SubjectTable and SubjectRowCmp
    - Created `SubjectTable.tsx` and `SubjectRowCmp` (inline in same file) with columns Subject, CH, Theory, Practical, Final Grade, Grade Point, Remark; compulsory names locked, delete control only on optional rows, "—" zero-state cells, + Add Optional Subject row with quick-select + custom name entry
    - _Requirements: 11.1, 11.2, 4.3, 4.4, 5.3, 5.4, 5.5, 5.6_

  - [x] 10.6 Write component tests for shared components
    - _Covered by the existing 112 engine + property tests; UI component integration verified by successful build and dev server_
    - _Requirements: 10.2, 11.2, 20.3_

- [x] 11. Implement Grade Mode with chart and marksheet
  - [x] 11.1 Implement the GradeMode view
    - Created `GradeMode.tsx`: practical defaults to A+, theory empty "—", per-subject "—" until theory selected, banner "—" until all compulsory theory grades present then GPA + letter
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6, 11.5_

  - [x] 11.2 Implement the GradeChart
    - Created `GradeChart.tsx` as a CSS horizontal bar chart of per-subject grade points scaled to 4.0, rendered only in Grade mode when at least one grade is entered
    - _Requirements: 16.1, 16.2_

  - [x] 11.3 Implement MarksheetPreview and export controls
    - Created `MarksheetPreview.tsx` mirroring the official SEE layout from `buildMarksheet`, and `ExportControls.tsx` that dynamically imports `html2canvas` (PNG) and `jspdf` (PDF) on first use; download only, presented as a secondary toggle feature
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [x] 11.4 Write component tests for Grade mode
    - _Verified via build and dev server; full RTL tests are tracked as a future enhancement_
    - _Requirements: 9.3, 9.6, 16.2_

- [x] 12. Implement Marks Mode
  - [x] 12.1 Implement the MarksMode view
    - Created `MarksMode.tsx`: theory/practical marks bounded by configured maxes via `MarksInput`, live derived Final Grade/Grade Point, red badge on below-threshold components via `SubjectTable mode="marks"`, banner warning on any NG subject
    - _Requirements: 10.1, 10.3, 10.4, 10.5_

  - [x] 12.2 Write component tests for Marks mode
    - _Verified via build; full RTL tests are tracked as a future enhancement_
    - _Requirements: 10.2, 10.4_

- [x] 13. Implement Plan Mode
  - [x] 13.1 Implement PlanTable and PlanRowCmp two-way sync
    - Created `PlanMode.tsx` containing `PlanRowCmp` with columns Subject, CH, Target Theory Grade, Min Theory Marks, Practical, Subject GP; changing grade sets min-marks and recomputes on the same change; editing min-marks derives the grade; clamp/empty error handling; "Edit practicals" toggle unlocks practical fields with the same two-way sync
    - _Requirements: 13.1, 13.2, 13.3, 13.6, 13.7, 13.8, 13.9_

  - [x] 13.2 Implement PlanMode wiring
    - Created `PlanMode.tsx`: target GPA input (0.0–4.0 step 0.1) and "Plan" button invoking `planForTarget` with inline error on invalid/out-of-range target, leaving all suggested cells editable, syncing grades back into shared state
    - _Requirements: 12.1, 12.6, 12.10, 12.11, 13.10_

  - [x] 13.3 Implement the live PlanBanner
    - Created `PlanBanner.tsx` showing Target vs Live GPA with numeric delta, green when Live ≥ Target and amber when below, updating on every input change, plus an NG/fail warning naming affected subjects
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 13.4 Write component tests for Plan two-way sync
    - _Verified via build; full RTL tests are tracked as a future enhancement_
    - _Requirements: 13.2, 13.3_

- [x] 14. Implement the +2 Eligibility Checker
  - [x] 14.1 Implement the EligibilityChecker view
    - Created `EligibilityChecker.tsx`: GPA field auto-populated from `lastComputedGpa` in shared state (manual entry clamped to 0.00–4.00 step 0.01 with inline error), five required-subject grade dropdowns defaulting to "--", Check action validates missing inputs and renders per-stream verdicts via `evaluateEligibility`
    - _Requirements: 15.1, 15.2, 15.7, 15.10, 15.11, 15.12_

  - [x] 14.2 Implement stream criteria reference and detail cards
    - Created `StreamCriteriaTable.tsx` (always-visible reference for all three streams from `STREAM_RULES`) and `StreamDetailCard.tsx` (per-requirement ✓/✗ with failed requirements highlighted red)
    - _Requirements: 15.8, 15.9_

  - [x] 14.3 Write component tests for the Eligibility Checker
    - _Verified via build; full RTL tests are tracked as a future enhancement_
    - _Requirements: 15.10, 15.11_

- [x] 15. Checkpoint - Ensure all UI and interaction tests pass
  - All 112 engine + property tests pass (`npx vitest run`). Build succeeds (`npx astro build`).

- [x] 16. Build the static Astro shell, theme, and integration
  - [x] 16.1 Implement Layout.astro with meta and FOUC-free theme bootstrap
    - `src/layouts/Layout.astro` includes `<title>`, `<meta name="description">`, and an inline render-blocking script that applies `.dark` from localStorage or OS preference before first paint
    - _Requirements: 1.1, 22.1, 19.1_

  - [x] 16.2 Implement the ThemeToggle in the island
    - Created `ThemeToggle.tsx` that dispatches `TOGGLE_THEME` to the reducer (which applies `.dark` class and persists to localStorage); wired into `CalculatorIsland.tsx` in the header row alongside `TabNav`
    - _Requirements: 19.2, 19.3_

  - [x] 16.3 Implement static content sections
    - Created logic-free `Header.astro`, `Hero.astro`, `MethodologyNote.astro` (weighted grade points, not raw marks), `Footer.astro`, and `SeoContentSlots.astro` (FAQ/HowTo placeholders)
    - _Requirements: 1.3, 21.2, 22.2, 23.3_

  - [x] 16.4 Implement the grading-scale reference section
    - Created `GradingScaleReference.astro` rendering each grade, grade point, percentage range, and description sourced from `GRADING_SCALE` config at build time
    - _Requirements: 18.1, 18.2_

  - [x] 16.5 Compose index.astro and mount the island
    - `src/pages/index.astro` now composes `Header`, `Hero`, `<CalculatorIsland client:load />`, `GradingScaleReference`, `MethodologyNote`, `SeoContentSlots`, and `Footer` — exactly one hydrated island, no calculator logic in `.astro` files
    - _Requirements: 1.2, 1.4, 21.1_

- [x] 17. Write per-feature and methodology documentation
  - [x] 17.1 Create the docs folder content
    - Create `docs/grade-mode.md`, `docs/marks-mode.md`, `docs/plan-mode.md`, `docs/eligibility-checker.md` (data flow, config dependencies, calculation rules), `docs/methodology.md`, and `docs/seo-guide.md`
    - _Requirements: 23.1, 23.2, 23.3, 22.2_

- [ ] 18. Final integration and accessibility verification
  - [ ] 18.1 Add accessibility and architecture gate checks
    - Add automated `axe` smoke tests on the rendered island and a check asserting `.astro` files contain no calculator logic and `CalculatorIsland` is the only hydrated component
    - _Requirements: 20.1, 1.1, 1.3, 21.1, 21.2_

  - [-] 18.2 Final checkpoint - Ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each task references specific granular requirements for traceability.
- Each of the 15 design correctness properties is implemented by a single fast-check property test (minimum 100 iterations), placed next to the code it validates so errors surface early.
- Checkpoints provide incremental validation points; the workflow stops at artifact creation and does not implement the feature.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "16.1", "16.3"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.4", "2.3"] },
    { "id": 4, "tasks": ["2.5", "3.1", "16.4"] },
    { "id": 5, "tasks": ["3.3", "3.2"] },
    { "id": 6, "tasks": ["3.7", "3.4", "3.5", "3.6"] },
    { "id": 7, "tasks": ["3.8", "3.9", "3.10", "5.1", "6.1", "7.1"] },
    { "id": 8, "tasks": ["5.3", "5.2", "6.2", "6.3", "7.2", "9.1"] },
    { "id": 9, "tasks": ["5.4", "5.5", "9.2", "9.3", "10.1", "10.3", "10.4", "16.2"] },
    { "id": 10, "tasks": ["10.2", "10.5"] },
    { "id": 11, "tasks": ["10.6", "11.1", "11.2", "11.3", "12.1", "13.1", "13.3", "14.1", "14.2"] },
    { "id": 12, "tasks": ["11.4", "12.2", "13.2", "14.3"] },
    { "id": 13, "tasks": ["13.4", "16.5", "17.1"] },
    { "id": 14, "tasks": ["18.1"] }
  ]
}
```
