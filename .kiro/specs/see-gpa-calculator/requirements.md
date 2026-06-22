# Requirements Document

## Introduction

The SEE GPA Calculator is a fast, accessible, ad-free web application for Nepali Class 10 (Secondary Education Examination) students. It computes Grade Point Average using the official National Examinations Board (NEB) methodology and provides four interaction methods: calculating GPA from letter grades, calculating GPA from raw marks, planning the grades needed to reach a target GPA, and checking +2 stream eligibility.

The product goal is to be demonstrably better than the competitor at `calculatorgpa.net/gpa-calculator/nepal/see` in accuracy, user experience, and feature set. The application is built as a fresh Astro.js project using the Astro + React islands pattern (a single React island carries all interactive calculator logic), styled with Tailwind CSS v4 in a Vercel-inspired visual language, with all grading scales, thresholds, and eligibility rules stored as configurable constants in one place.

This document defines the functional and non-functional requirements. Calculation methodology must be verified against the official NEB marksheet before implementation and documented in code and in a methodology note.

## Glossary

- **SEE**: Secondary Education Examination, the Nepali national exam taken at the end of Class 10.
- **NEB**: National Examinations Board, the authority that defines SEE grading and stream eligibility criteria.
- **GPA**: Grade Point Average, a credit-hour-weighted average of subject grade points, ranging 0.0 to 4.0.
- **GP / Grade_Point**: The numeric point value (0.0 to 4.0) associated with a letter grade per the grading scale.
- **CH / Credit_Hours**: The credit-hour weight assigned to a subject.
- **Letter_Grade**: One of A+, A, B+, B, C+, C, D, NG per the SEE 4.0 grading scale.
- **NG**: "Not Graded", the failing grade (GP 0.0) assigned when a component scores below 35%.
- **Theory_Component**: The theory portion of a subject, with a configurable maximum mark (75 standard, 50 for Computer Science).
- **Practical_Component**: The practical portion of a subject, with a configurable maximum mark (25 standard, 50 for Computer Science).
- **Subject_GP**: The weighted combination of a subject's theory and practical grade points.
- **Compulsory_Subject**: One of the six mandatory SEE subjects, pre-filled, name-locked, and non-deletable.
- **Optional_Subject**: A user-added subject (Optional-I or Optional-II) that is selectable and deletable.
- **splitType**: A subject configuration flag; value "50-50" denotes the Computer Science theory/practical 50/50 split, otherwise standard 75/25.
- **Grading_Scale_Config**: The single configurable source defining grades, grade points, percentage ranges, and descriptions.
- **Calculator_System**: The React island that hosts all interactive calculator behavior across the four methods.
- **Grade_Mode**: The method where the user selects letter grades from dropdowns.
- **Marks_Mode**: The method where the user enters raw marks that are auto-converted to grades and grade points.
- **Plan_Mode**: The method where the user enters a target GPA and receives a suggested path of grades.
- **Eligibility_Checker**: The method that evaluates +2 stream eligibility (Science, Management, Humanities).
- **Shared_State**: The subject and grade data shared across Grade, Marks, and Plan methods, and read by Eligibility.
- **Marksheet_Preview**: The simulated official SEE marksheet rendered after calculation.
- **Theme_Controller**: The component managing dark/light appearance, defaulting to system preference.
- **Astro_Shell**: The static Astro layer providing page layout, head, and meta.

## Requirements

### Requirement 1: Project Architecture and Tech Stack

**User Story:** As a developer maintaining the project, I want a fresh Astro project using the Astro + React islands pattern with Tailwind v4, so that the site is performant, SEO-ready, and the stateful calculator behaves correctly.

#### Acceptance Criteria

1. THE Astro_Shell SHALL provide the static page layout, head, and meta for the application.
2. THE Calculator_System SHALL be implemented as a single React island mounted with the `client:load` directive.
3. THE Astro_Shell SHALL contain no calculator logic and no calculator state within `.astro` files.
4. THE Calculator_System SHALL host all interactive calculator state and logic for all four methods.
5. THE application SHALL use Tailwind CSS v4 with CSS-first configuration via the `@theme` directive and SHALL NOT include a `tailwind.config.js` file.
6. THE application SHALL define color, border-radius, brand color, and border color as global CSS variables in a single global stylesheet so that visual changes are made in one place.

### Requirement 2: Centralized Configurable Constants

**User Story:** As a developer responding to NEB policy changes, I want all grading scales, thresholds, and eligibility rules stored as constants in one place, so that updates are made once without hunting through the codebase.

#### Acceptance Criteria

1. THE Calculator_System SHALL store the grading scale, GPA-to-letter mapping bands, pass thresholds, subject definitions, and stream eligibility rules as named constants within a single Grading_Scale_Config source, such that no instance of these values is duplicated in any other component file.
2. THE Calculator_System SHALL read all grade points, percentage ranges, and thresholds at runtime from the Grading_Scale_Config, and SHALL NOT contain literal grade-point, percentage-range, or threshold values inside any component outside the Grading_Scale_Config.
3. WHERE a subject is Computer Science, THE Calculator_System SHALL determine its behavior from the `splitType` configuration flag value "50-50" and SHALL NOT identify the subject by matching its name string.
4. THE Calculator_System SHALL expose the GPA-to-letter-grade mapping as a single pure function, defined in the Grading_Scale_Config, that accepts a numeric GPA value from 0.0 to 4.0 and returns exactly one Letter_Grade determined by the configured mapping bands.
5. IF the GPA-to-letter-grade mapping function receives a value below 0.0 or above 4.0, THEN THE Calculator_System SHALL clamp the value to the nearest bound within 0.0 to 4.0 before returning the mapped Letter_Grade.

### Requirement 3: Four-Method Navigation with Shared State

**User Story:** As a student, I want to switch between Grade, Marks, Plan, and +2 Eligibility methods without losing my data, so that I can explore my results from different angles seamlessly.

#### Acceptance Criteria

1. THE Calculator_System SHALL present four selectable tabs labeled "Grade", "Marks", "Plan", and "+2 Eligibility".
2. WHEN the user switches between the Grade, Marks, and Plan tabs, THE Calculator_System SHALL preserve the subject and grade data in Shared_State without resetting it.
3. WHEN the Plan_Mode tab is opened, THE Calculator_System SHALL read subject data from Shared_State.
4. WHEN the Eligibility_Checker tab is opened, THE Calculator_System SHALL read the most recently computed GPA and relevant grades from Shared_State.
5. WHEN the user selects a tab, THE Calculator_System SHALL switch the main view to that method.

### Requirement 4: Compulsory Subjects

**User Story:** As a student, I want the six compulsory SEE subjects pre-filled and protected, so that I cannot accidentally remove or rename a required subject.

#### Acceptance Criteria

1. THE Calculator_System SHALL pre-fill six Compulsory_Subjects: Nepali (CH 5), English (CH 5), Mathematics (CH 5), Science and Technology (CH 5), Social Studies (CH 4), and Health, Population & Environment (CH 4).
2. THE Calculator_System SHALL configure each Compulsory_Subject with a Theory_Component maximum of 75 and a Practical_Component maximum of 25.
3. THE Calculator_System SHALL render Compulsory_Subject names as non-editable.
4. THE Calculator_System SHALL prevent deletion of Compulsory_Subjects by not rendering a delete control on compulsory rows or by rendering it disabled.

### Requirement 5: Optional Subjects

**User Story:** As a student, I want to add my optional subjects from a list or by typing a custom name, so that the calculator reflects my actual subject combination.

#### Acceptance Criteria

1. THE Calculator_System SHALL provide an Optional-I subject (CH 4) with a quick-select dropdown including Optional Mathematics and Economics.
2. THE Calculator_System SHALL provide an Optional-II subject (CH 4) with a quick-select dropdown including Accountancy and Computer Science.
3. WHERE a student's optional subject is not in the quick-select list, THE Calculator_System SHALL allow the student to enter a custom subject name via free-text input.
4. THE Calculator_System SHALL provide an "+ Add Optional Subject" control for adding additional optional subjects.
5. THE Calculator_System SHALL render a delete control only on Optional_Subject rows.
6. WHEN the user deletes an Optional_Subject, THE Calculator_System SHALL remove that subject and recompute the GPA.

### Requirement 6: Computer Science 50/50 Split Handling

**User Story:** As a Computer Science student, I want the calculator to apply the 50/50 theory-practical split, so that my GPA reflects the correct subject weighting.

#### Acceptance Criteria

1. WHERE a subject has `splitType` "50-50", THE Calculator_System SHALL set the Theory_Component maximum to 50 and the Practical_Component maximum to 50.
2. WHERE a subject has `splitType` "50-50", THE Calculator_System SHALL compute the Subject_GP as (Theory_GP × 0.50) + (Practical_GP × 0.50).
3. WHERE a subject has `splitType` "50-50", THE Calculator_System SHALL apply the 50/50 maxes in Marks_Mode input validation, in the Plan_Mode minimum-marks table, and in the Marksheet_Preview.
4. WHERE a subject does not have `splitType` "50-50", THE Calculator_System SHALL compute the Subject_GP as (Theory_GP × 0.75) + (Practical_GP × 0.25).

### Requirement 7: SEE Grading Scale and GPA Calculation

**User Story:** As a student, I want my GPA computed exactly as the official NEB marksheet does, so that I can trust the result.

#### Acceptance Criteria

1. THE Calculator_System SHALL define the SEE 4.0 grading scale as contiguous percentage bands matched by inclusive lower bound and exclusive upper bound, with no gaps or overlaps: A+ (GP 4.0, 90 ≤ percentage ≤ 100), A (GP 3.6, 80 ≤ percentage < 90), B+ (GP 3.2, 70 ≤ percentage < 80), B (GP 2.8, 60 ≤ percentage < 70), C+ (GP 2.4, 50 ≤ percentage < 60), C (GP 2.0, 40 ≤ percentage < 50), D (GP 1.6, 35 ≤ percentage < 40), NG (GP 0.0, 0 ≤ percentage < 35).
2. WHEN deriving a grade from marks, THE Calculator_System SHALL first convert raw marks to a percentage as (componentMarks / componentMax) × 100, retain the unrounded percentage value within 0 to 100, and apply the band lookup before grading.
3. THE Calculator_System SHALL grade the Theory_Component and Practical_Component separately, each from its own percentage.
4. THE Calculator_System SHALL compute the Subject_GP by weighting grade points, not raw marks, using the per-subject weights defined in Requirement 6.
5. THE Calculator_System SHALL compute the final GPA as Σ(CH × Subject_GP) / Σ(CH), using unrounded Subject_GP values in the summation.
6. THE Calculator_System SHALL round the final GPA to 2 decimal places using round-half-up (round half away from zero).
7. THE Calculator_System SHALL map the numeric GPA to a Letter_Grade for display using the GPA-to-letter mapping function, where the mapping bands are contiguous and matched by inclusive lower bound and exclusive upper bound with no gaps or overlaps and the top band inclusive of 4.00 (for example GPA 3.60–4.00 maps to A+).
8. THE Calculator_System SHALL display the mapped Letter_Grade alongside the numeric GPA in every result banner and in the Marksheet_Preview.

### Requirement 8: Pass Thresholds and NG Handling

**User Story:** As a student, I want clear warnings when a component fails the pass threshold, so that I know whether I have passed.

#### Acceptance Criteria

1. THE Calculator_System SHALL treat a component scoring below 35% as NG with GP 0.0.
2. FOR a standard subject, THE Calculator_System SHALL treat a Theory_Component as failing when its marks are below 27 out of 75 and a Practical_Component as failing when its marks are below 9 out of 25.
3. FOR a subject with `splitType` "50-50", THE Calculator_System SHALL treat a Theory_Component as failing when its marks are below 18 out of 50 and a Practical_Component as failing when its marks are below 18 out of 50.
4. IF a component is failing, THEN THE Calculator_System SHALL flag the failing component with a red badge.
5. IF any subject contains an NG or failing component, THEN THE Calculator_System SHALL display a banner warning that names the affected subject and indicates the result is not passed.

### Requirement 9: Grade Mode

**User Story:** As a student who knows my letter grades, I want to select them from dropdowns and see my GPA, so that I can compute results quickly.

#### Acceptance Criteria

1. THE Calculator_System SHALL render Theory_Component and Practical_Component grade selections as dropdowns that display the grade and its grade point together, for example "A+ (4.00)".
2. WHEN a subject row is first rendered in Grade_Mode, THE Calculator_System SHALL default the Practical_Component to A+ and leave the Theory_Component empty with a "--" placeholder.
3. WHILE a subject's Theory_Component is empty, THE Calculator_System SHALL display "—" for that subject's Final Grade and Grade Point.
4. WHEN a subject's Theory_Component is selected, THE Calculator_System SHALL compute and display the subject's Final Grade and Grade Point.
5. WHILE any Compulsory_Subject lacks a selected Theory_Component grade, THE Calculator_System SHALL display "—" in the GPA banner.
6. WHEN all Compulsory_Subjects have a selected Theory_Component grade, THE Calculator_System SHALL compute and display the GPA in the banner.

### Requirement 10: Marks Mode

**User Story:** As a student who knows my raw marks, I want to enter them and have grades and GPA derived automatically, so that I do not need to look up grades myself.

#### Acceptance Criteria

1. THE Calculator_System SHALL provide a Theory_Component marks input with a maximum equal to the subject's configured theory maximum and a Practical_Component marks input with a maximum equal to the subject's configured practical maximum.
2. WHEN a marks input loses focus with a value above the configured maximum or below 0, THE Calculator_System SHALL clamp the value to the valid range and display an inline error message.
3. WHEN valid marks are entered, THE Calculator_System SHALL derive and display the Final Grade and Grade Point live.
4. IF a component's marks are below its pass threshold defined in Requirement 8, THEN THE Calculator_System SHALL flag that component with a red badge.
5. IF any subject is NG, THEN THE Calculator_System SHALL display a banner warning.

### Requirement 11: Subject Table Layout and Zero State

**User Story:** As a first-time visitor, I want a clear, populated starting view with guidance, so that I know what to do without facing a blank screen.

#### Acceptance Criteria

1. THE Calculator_System SHALL render the subject table with columns: Subject, CH, Theory, Practical, Final Grade, Grade Point, Remark, and a delete control for optional rows.
2. WHEN the application first loads, THE Calculator_System SHALL pre-render all Compulsory_Subject rows with empty grade cells displaying "--".
3. WHILE no grade has been entered, THE Calculator_System SHALL display "—" in the GPA result banner.
4. THE Calculator_System SHALL display a brief instruction line above the subject table describing how to begin.
5. THE Calculator_System SHALL apply the zero-state presentation across all four method tabs.

### Requirement 12: Plan Mode Target-to-Grade Suggestion

**User Story:** As a student aiming for a target GPA, I want the tool to suggest the grades I need per subject, so that I have a practical plan to reach my goal.

#### Acceptance Criteria

1. THE Calculator_System SHALL provide a target GPA input accepting values from 0.0 to 4.0 in steps of 0.1 and a "Plan" control.
2. THE Calculator_System SHALL present Plan_Mode results as an estimate representing one suggested path, and SHALL state that other grade distributions may also reach the target.
3. WHEN the user activates "Plan", THE Calculator_System SHALL lock all Practical_Components at A+ (GP 4.0) and compute the practical contribution as Σ(CH × practicalGP × practicalWeight), where practicalWeight is 0.25 for standard subjects and 0.50 for subjects with `splitType` "50-50".
4. WHEN computing the suggested grades, THE Calculator_System SHALL solve for a uniform theory grade point as (targetGPA × totalCH − practicalContribution) / Σ(CH × theoryWeight), snap that value down to the nearest discrete grade in the Grading_Scale_Config, and assign it to all subjects.
5. IF the resulting GPA is below the target, THEN THE Calculator_System SHALL greedily raise subjects by one grade, highest credit hours first, until the GPA meets or exceeds the target or no subject can be raised further.
6. IF the target GPA exceeds 4.0 or is non-numeric, THEN THE Calculator_System SHALL not apply the value, preserve the previous suggestion or empty state, and display an inline error indicating the maximum allowed target is 4.00 and that a numeric value within 0.00 to 4.00 is required.
7. IF the target can be reached only when every subject is assigned A+ (GP 4.0), THEN THE Calculator_System SHALL assign A+ to all subjects and display "Maximum achievable GPA is 4.00."
8. IF the target GPA is 0 or below the minimum passing achievable value of 1.60 (all subjects at grade D), THEN THE Calculator_System SHALL assign D to all subjects and display a note that this is the minimum passing suggestion.
9. IF the exact target GPA is not achievable with discrete grades, THEN THE Calculator_System SHALL fill to the nearest achievable GPA at or above the target and label the result as an estimate.
10. WHEN the auto-fill completes, THE Calculator_System SHALL leave all suggested cells editable.
11. WHEN the user activates "Plan", THE Calculator_System SHALL produce the suggested grades within 1 second.

### Requirement 13: Plan Mode Two-Way Live Sync

**User Story:** As a student adjusting my plan, I want the target grade dropdown and minimum marks input to stay in sync as I edit either one, so that I can plan in whichever unit I prefer.

#### Acceptance Criteria

1. THE Calculator_System SHALL render Plan_Mode with columns: Subject, CH, Target Theory Grade, Min Theory Marks, Practical, Subject GP, and Action.
2. WHEN the user changes the Target Theory Grade, THE Calculator_System SHALL set the Min Theory Marks to that grade's minimum mark computed as ceil(percentFloor × theoryMax / 100) and SHALL recompute the Subject GP and overall GPA on the same change without requiring a separate calculate action.
3. WHEN the user enters a whole-number value within 0 to theoryMax into Min Theory Marks, THE Calculator_System SHALL convert it to a percentage as (value / theoryMax) × 100, derive the corresponding grade band from the Grading_Scale_Config (mapping a percentage below the D floor to NG), update the Target Theory Grade dropdown to the derived grade, and recompute the Subject GP and overall GPA on the same change without requiring a separate calculate action.
4. THE Calculator_System SHALL compute standard-subject theory minimum marks as A+ 68, A 60, B+ 53, B 45, C+ 38, C 30, D 27 (out of 75).
5. THE Calculator_System SHALL compute Computer Science theory minimum marks as A+ 45, A 40, B+ 35, B 30, C+ 25, C 20, D 18 (out of 50).
6. WHEN the user enters a Min Theory Marks value below 0 or above theoryMax, THE Calculator_System SHALL clamp the value to the nearest bound (0 or theoryMax), display an inline error message indicating the valid range, and recompute the derived grade, Subject GP, and overall GPA from the clamped value.
7. IF a Min Theory Marks value is empty or non-numeric, THEN THE Calculator_System SHALL retain the previously valid value, display an inline error message indicating that a whole number is required, and leave the Subject GP and overall GPA unchanged.
8. THE Calculator_System SHALL default each Practical_Component in Plan_Mode to A+ (GP 4.00).
9. WHEN the user activates the "Edit practicals" toggle, THE Calculator_System SHALL unlock each Practical_Component as its own grade dropdown and minimum-marks input that apply the same two-way synchronization defined in criteria 2, 3, 6, and 7 for theory.
10. WHEN an Optional_Subject is added or removed in Plan_Mode, THE Calculator_System SHALL re-run the plan fill and recompute the overall GPA on the same change without requiring a separate calculate action.

### Requirement 14: Plan Mode Live Result Banner

**User Story:** As a student tweaking my plan, I want to see my target and projected GPA update instantly, so that I know whether my plan reaches the goal.

#### Acceptance Criteria

1. THE Calculator_System SHALL display the Target GPA and the Live GPA side by side in a result banner that updates on every input change.
2. WHILE the Live GPA is greater than or equal to the Target GPA, THE Calculator_System SHALL present the banner status in green and show the numeric delta.
3. WHILE the Live GPA is below the Target GPA, THE Calculator_System SHALL present the banner status in amber and show the numeric delta.
4. IF any subject drops to NG or below the pass threshold, THEN THE Calculator_System SHALL display a warning that names the affected subject and indicates the result is not passed.

### Requirement 15: +2 Stream Eligibility Checker

**User Story:** As a student planning my +2 enrollment, I want to check which streams I qualify for, so that I can choose my path with confidence.

#### Acceptance Criteria

1. THE Eligibility_Checker SHALL display an overall GPA field that is auto-populated from the most recently computed GPA in Shared_State, and SHALL allow manual editing accepting values from 0.00 to 4.00 in steps of 0.01 when no GPA has been computed.
2. THE Eligibility_Checker SHALL display final-grade dropdowns showing grade and grade point only for English, Nepali, Social Studies, Compulsory Mathematics, and Compulsory Science, defaulting each unselected dropdown to a "--" placeholder, and SHALL NOT display optional or other subjects.
3. THE Eligibility_Checker SHALL store all stream eligibility thresholds as named constants verified against official NEB criteria and SHALL compare numeric grade point values rather than grade strings.
4. WHEN the user activates the "Check" control, THE Eligibility_Checker SHALL evaluate Science eligibility as overall GPA ≥ 2.0 AND Science ≥ C+ (GP 2.4) AND Mathematics ≥ C+ (GP 2.4) AND English ≥ D (GP 1.6) AND Nepali ≥ D (GP 1.6) AND Social Studies ≥ D (GP 1.6).
5. WHEN the user activates the "Check" control, THE Eligibility_Checker SHALL evaluate Management eligibility as overall GPA ≥ 1.6 AND English ≥ D (GP 1.6) AND Nepali ≥ D (GP 1.6) AND Mathematics ≥ D (GP 1.6) AND Science ≥ D (GP 1.6) AND Social Studies ≥ D (GP 1.6).
6. WHEN the user activates the "Check" control, THE Eligibility_Checker SHALL evaluate Humanities eligibility as overall GPA ≥ 1.6 AND English ≥ D (GP 1.6) AND Nepali ≥ D (GP 1.6) AND Social Studies ≥ D (GP 1.6).
7. WHEN the user activates the "Check" control, THE Eligibility_Checker SHALL display a verdict line listing only the streams that pass all criteria.
8. THE Eligibility_Checker SHALL display a per-stream detail card showing each requirement with a ✓ or ✗ marker and highlighting failed requirements in red.
9. THE Eligibility_Checker SHALL always display a static criteria reference table for all three streams, visible before any data is entered.
10. WHEN the user enters a manual overall GPA value below 0.00 or above 4.00, THE Eligibility_Checker SHALL clamp the value to the nearest bound and display an inline error indicating the valid range is 0.00 to 4.00.
11. WHEN the user activates the "Check" control with any of the five required final-grade dropdowns unselected, THE Eligibility_Checker SHALL display an error identifying the missing subjects and SHALL NOT display a verdict.
12. IF no stream passes all criteria, THEN THE Eligibility_Checker SHALL display a verdict message indicating that no +2 stream qualifies.

### Requirement 16: Grade Visualization Chart

**User Story:** As a student reviewing my main GPA calculation, I want a visual chart of my grades, so that I can understand my performance at a glance.

#### Acceptance Criteria

1. WHEN the user calculates in the main Grade calculation, THE Calculator_System SHALL display a grade chart below the results.
2. THE Calculator_System SHALL display the grade chart only for the main Grade calculation and SHALL NOT display it for the other methods.

### Requirement 17: Marksheet Simulation and Export

**User Story:** As a student, I want a realistic SEE marksheet preview I can download, so that I can save and share my projected results.

#### Acceptance Criteria

1. WHEN the user activates calculate, THE Calculator_System SHALL display the main GPA result and render a Marksheet_Preview below it.
2. THE Marksheet_Preview SHALL mirror the official SEE marksheet layout supplied as a reference image.
3. THE Marksheet_Preview SHALL display, per subject, the Theory Marks, Theory Grade, Practical Marks, Practical Grade, Final Grade, Grade Point, and Credit Hours, plus the overall GPA, mapped Letter_Grade, and a result remark of "Passed" or "Not Passed".
4. THE Calculator_System SHALL provide a control to download the Marksheet_Preview as a PNG image using html2canvas.
5. THE Calculator_System SHALL provide a control to download the Marksheet_Preview as a PDF using jsPDF.
6. THE Calculator_System SHALL provide download only and SHALL NOT provide a shareable URL.
7. THE Calculator_System SHALL present the Marksheet_Preview as a secondary feature that does not interrupt the primary calculate, plan, and eligibility workflows.

### Requirement 18: Reference Grading Scale Display

**User Story:** As a student, I want a grading scale reference visible on the page, so that I can interpret grades and points without leaving the calculator.

#### Acceptance Criteria

1. THE Calculator_System SHALL display the SEE grading scale reference chart below the main calculator section, showing each grade, its grade point, its percentage range, and its description.
2. THE Calculator_System SHALL source the reference chart values from the Grading_Scale_Config.

### Requirement 19: Theme and Appearance

**User Story:** As a user, I want a dark/light theme that defaults to my system preference, so that the site is comfortable to read in any environment.

#### Acceptance Criteria

1. WHEN the application first loads, THE Theme_Controller SHALL apply the appearance matching the operating system preference.
2. THE Theme_Controller SHALL provide a control to switch between dark and light themes.
3. WHEN the user switches the theme, THE Theme_Controller SHALL apply the selected appearance to the entire application.
4. THE application SHALL present a clean, minimal, high-contrast Vercel-inspired visual language consistent with the design system in DESIGN.md.

### Requirement 20: Accessibility

**User Story:** As a user relying on assistive technology or keyboard navigation, I want the calculator to be fully accessible, so that I can use every feature.

#### Acceptance Criteria

1. THE Calculator_System SHALL meet WCAG 2.1 Level AA conformance for the interactive calculator interface.
2. THE Calculator_System SHALL make all inputs and controls operable by keyboard.
3. THE Calculator_System SHALL implement dropdowns with ARIA roles and properties consistent with accessible listbox or combobox patterns.
4. THE Calculator_System SHALL present a mobile-first responsive layout that adapts across mobile, tablet, and desktop breakpoints.

### Requirement 21: Performance and Build

**User Story:** As a user on a typical device, I want a fast, ad-free, lightweight page, so that the calculator loads and responds quickly.

#### Acceptance Criteria

1. THE application SHALL be built as a static, ad-free Astro site that ships only the React island required for interactivity.
2. THE Astro_Shell SHALL render the static page content without requiring client-side JavaScript for non-interactive sections.

### Requirement 22: Basic SEO and Future SEO Guide

**User Story:** As the site owner, I want basic metadata now and a documented place to expand SEO later, so that the launch is reasonable and future SEO work is straightforward.

#### Acceptance Criteria

1. THE Astro_Shell SHALL include a page `<title>` and a `<meta name="description">` tag.
2. THE project SHALL include a guide documenting where to add FAQ content, how-to content, and full SEO optimization in the future.
3. THE project SHALL treat full SEO optimization as out of scope for the current build.

### Requirement 23: Per-Feature Implementation Documentation

**User Story:** As a developer returning to the project later, I want a separate implementation document for each major feature, so that future changes start from accurate context instead of guesswork.

#### Acceptance Criteria

1. THE project SHALL include a `docs` folder containing a separate markdown document for each of the four methods: Grade_Mode, Marks_Mode, Plan_Mode, and Eligibility_Checker.
2. Each feature document SHALL describe how that feature is implemented, including its data flow, configuration dependencies, and calculation rules.
3. THE project SHALL document the GPA calculation methodology, including the distinction that grade points are weighted rather than raw marks, in code comments and in a methodology note.
