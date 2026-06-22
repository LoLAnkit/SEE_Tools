---
# **PROJECT: SEE GPA Calculator Website**

## **🎯 Objective**

Build a modern, fast, SEO-optimized **SEE (Secondary Education Examination) GPA Calculator** for Nepali Class 10 students that is demonstrably **better** than the competitor https://calculatorgpa.net/gpa-calculator/nepal/see in accuracy, UX, and features. inspire with competitor's UI/design — create an original, superior design.

- **Name:** SEE GPA Calculator
- **Domain:** gpa.seepapers.com

## **⚠️ Guiding Principles (read first)**

1. **Verify before you build.** Verify all grading and GPA logic against the **official SEE methodology** before implementation. Do **not** assume that weighting *grade points* is equivalent to weighting *raw marks* — these produce different results. The official method grades the theory and practical components **separately** (each by its own percentage), then combines the **grade points** by weight. Confirm the calculator matches official NEB marksheet results and **document the calculation method clearly** in code comments and a short methodology note in the UI/README.
2. **Simplicity-first UI.** The primary experience focuses on **Calculate GPA**, **Plan GPA**, and **Stream Eligibility**. Advanced features such as **marksheet export remain secondary** and must not distract from the main workflow.
3. **Configurability.** Store all grading scales, GPA thresholds, and subject-grade requirements as **constants/config values** in one place — never hardcode them throughout the codebase — so future NEB policy changes are easy to update.
4. **Don't change the architecture.** Do not remove the core calculator, planner, marksheet preview, or eligibility checker. Apply only the improvements described here.

## **🛠️ Tech Stack & Setup (MANDATORY)**

1. A fresh **Astro.js project**.
2. **Astro + React islands pattern:** Astro handles the static shell, page layout, and head/meta. All interactive calculator UI lives in a single React island mounted with `client:load`. Do not put calculator logic or state in `.astro` files. This gives you Astro's SEO and performance benefits while React handles the heavily stateful calculator experience correctly. SEO leave it for now i will do later.
3. Use the **Astro Docs MCP** to verify all Astro APIs, config, and best practices before writing code.
4. Use **Tailwind CSS v4** — consult the `tailwind-4-docs` skill (v4 differs from v3: CSS-first config via `@theme`, no `tailwind.config.js` by default). color , border radius , brand color, border color etc can be globally controlled from global css file store in variable and use so change will be eassy.
5. Apply the **web-design-guidelines** skill for layout, spacing, accessibility, and visual hierarchy.
6. Read and follow **@DESIGN.md** for the design system (available in root).
7. **Design language: Vercel-style** — clean, minimal, high-contrast, generous whitespace, geometric sans-serif (Geist/Inter), subtle borders, dark/light mode, refined micro-interactions, monochrome base with a single accent color.
8. skills are in root .agent/skills folder

## **🧩 Core Feature: The Calculator**

### **Four Calibration / Input Methods**

Provide a clear toggle/tab switch between four methods. **State is shared across Grade, Marks, and Plan tabs** — switching tabs does not reset data.  Plan and Eligibility tabs read from this shared state.

- **Method 1 — Grade Mode:** user selects letter grades from dropdowns.
- **Method 2 — Marks Mode:** user enters raw marks; the system auto-converts to grades & GP.
- **Method 3 — Plan Mode:** user enters a target GPA; the tool suggests the grades needed (full spec below).
- **Method 4 — Stream Eligibility:** check which +2 streams the student qualifies for (full spec below). This is now a **first-class method/tab**, not a separate hidden section.
- tab names Grade, Marks, Plan, +2 Eligibility

### **Zero State (first load)**

On first load, all compulsory subject rows are pre-rendered with empty grade cells showing "--" . The GPA result banner shows "—" until at least one grade is entered. Do not show a blank white void — include a brief instruction line above the table explaining what to do. This welcoming zero state applies across all tabs.

### **Default Compulsory Subjects (PRE-FILLED, names not editable)**

All compulsory subjects have both a theory component and a practical component. No compulsory subject is theory-only.

| **Subject** | **Credit Hours** | **Theory Max** | **Practical Max** |
| --- | --- | --- | --- |
| Nepali | 5 | 75 | 25 |
| English | 5 | 75 | 25 |
| Mathematics | 5 | 75 | 25 |
| Science and Technology | 5 | 75 | 25 |
| Social Studies | 4 | 75 | 25 |
| Health, Population & Environment | 4 | 75 | 25 |

> **Compulsory subjects cannot be deleted.** They must always remain in the calculator. Do not render a delete/trash control on compulsory rows (or render it disabled).

### **Optional Subjects**

- **Optional-I** (4 CH): quick-select dropdown with these popular choices — Optional Mathematics, Economics, . The user can also type a custom subject name if theirs is not listed. These options cover ~90% of real students; the free-text fallback covers the rest.
- **Optional-II** (4 CH): quick-select dropdown — Accountancy, Computer Science. Same free-text fallback applies.
- Provide an **"+ Add Optional Subject"** button.
- **Only optional subject rows are deletable** (delete/trash icon). Compulsory rows are locked.

### **Computer Science Special Case**

Computer Science has a **50/50 split** regardless of which tab it appears in — Theory max = 50, Practical max = 50. Store this as a `splitType: "50-50"` flag in the subject config and branch all logic on that flag. This affects: Marks Mode input maxes and validation, the GP weight formula (`Theory_GP × 0.50 + Practical_GP × 0.50`), Plan Mode min-marks table (theory out of 50), and the Marksheet preview. Never check for CS by matching the subject name string — always read the config flag.

### **Table Columns**

`Subject | CH | Theory | Practical | Final Grade | Grade Point | Remark  (delete icon — optionals only)`

### **Grade Mode Behavior**

- Theory & Practical are **dropdowns** showing grade + point, e.g. `A+ (4.00)`, `A (3.60)` … (improve on the competitor, which only shows `A+`).
- **Practical defaults to `A+`**; **Theory defaults to empty** (placeholder "--").
- **Final Grade** and **Grade Point** show `—` until Theory is selected.
- **Final Grade** = computed combination of Theory + Practical (weighted; see formula).
- **Grade Point** column shows the GP equivalent from the scale.
- GPA banner shows `—` until all compulsory subjects have a Theory grade selected.

### **Marks Mode Behavior**

- **Theory input:** max = theoryMax from subject config (75 standard, 50 for CS). Validate & clamp on blur; inline error if exceeded.
- **Practical input:** max = practicalMax from subject config (25 standard, 50 for CS). Same validation.
- Final Grade & GP are derived and displayed live like in grade.
- Show inline validation errors for invalid/over-limit values.
- Pass threshold in whole marks: Theory fail if marks < 27 (since ceil(26.25) = 27 out of 75). Practical fail if marks < 9 (since ceil(8.75) = 9 out of 25). For CS: Theory fail if < 18/50, Practical fail if < 18/50. Flag failing components with a red badge; show a banner warning if any subject is NG.

## **🧮 Calculation Logic (must be exact — verify against NEB)**

### **Raw Marks → Percentage (always do this first)**

Before any grade lookup, convert raw marks to percentage:
`Theory% = (theoryMarks / theoryMax) × 100`
`Practical% = (practicalMarks / practicalMax) × 100`
TheoryMax and practicalMax come from the subject config (75/25 standard, 50/50 for CS). Never compare raw marks directly to the percentage-based grading scale.

### **SEE Reference Grading Scale (4.0) — store as config constants and show as a reference chart below the main calculator**

| **Grade** | **GP** | **% Range** | **Description** |
| --- | --- | --- | --- |
| A+ | 4.0 | 90–100 | Outstanding |
| A | 3.6 | 80–89 | Excellent |
| B+ | 3.2 | 70–79 | Very Good |
| B | 2.8 | 60–69 | Good |
| C+ | 2.4 | 50–59 | Satisfactory |
| C | 2.0 | 40–49 | Acceptable |
| D | 1.6 | 35–39 | Basic |
| NG | 0.0 | 0–34 | Not Graded |

### **GPA → Letter Grade Display Mapping**

After computing the numeric GPA, map it back to a letter grade for display using the same grading scale config — whichever grade band the GPA falls into by GP value (GPA 3.60–4.00 → A+, 3.20–3.59 → A, 2.80–3.19 → B+, etc.). Show this letter grade alongside the numeric GPA in every result banner and marksheet. Implement as a single pure function in config, not inline logic scattered through components.


### **Per-Subject Grade Point (grade points are weighted — NOT raw marks)**

Grade the theory and practical components **separately** from their own percentages, then weight the resulting grade points:

Standard subjects: `Subject_GP = (Theory_GP × 0.75) + (Practical_GP × 0.25)`
Computer Science: `Subject_GP = (Theory_GP × 0.50) + (Practical_GP × 0.50)`

> **Methodology note:** This deliberately weights *grade points*, matching the official NEB marksheet, and is **not** the same as adding raw theory+practical marks and grading the total. Document this distinction in a code comment.

### **Final GPA (Credit-Hour weighted)**

`GPA = Σ(CH × Subject_GP) / Σ(CH)`

### **Rules / Edge Cases**

- Any component below 35% / NG → flag the subject; overall result warns "Not passed (NG in X)".
- Pass thresholds in whole marks: Theory ≥ 27/75, Practical ≥ 9/25. For CS: Theory ≥ 18/50, Practical ≥ 18/50.
- Round GPA to 2 decimals; map final GPA to a letter-grade band for display using the mapping function above.

## **📄 Marksheet Simulation (secondary feature)**

When user presses calculate, show the main GPA result and also render a marksheet preview below.

- Generate a realistic SEE marksheet preview mirroring the official SEE Marksheet layout. The agent will receive the reference marksheet image at execution time — build the layout to match it once received.
- Include subject-wise Theory Marks, Theory Grade, Practical Marks, Practical Grade, Final Grade, GP, credit hours, overall GPA, mapped letter grade, and a result remark (Passed / Not Passed).
- Allow **download as image** (html2canvas → PNG) and **download as PDF** (jsPDF). No shareable URL — download only.

---

## **🎯 METHOD 3: PLAN MODE (Target GPA → Suggested Path)**

### **Purpose**

A method where the student enters a **target GPA** and the tool suggests the **grades needed per subject** to reach it. Everything is fully tweakable with **live GPA recalculation**.

> **Messaging:** Present Plan Mode results as an **estimate / one suggested path** to reach the target GPA — not as the only exact solution. Because grades are discrete, multiple grade combinations can reach the same GPA; clearly state that the planner offers **one practical recommendation** and that students may distribute grades differently as their choice.

### **Layout (Table Columns)**

`Subject | CH | Target Theory Grade | Min Theory Marks | Practical | Subject GP | Action`

| **Column** | **Behavior** |
| --- | --- |
| **Subject** | Compulsory subjects pre-filled (names locked, not deletable); optionals selectable/deletable |
| **CH** | Fixed credit hours per subject |
| **Target Theory Grade** | Editable dropdown showing grade + point, e.g. `B+ (3.20)` |
| **Min Theory Marks** | Editable number input — the **minimum mark** that secures the shown grade (out of 75 standard, out of 50 for CS) |
| **Practical** | Locked to `A+` by default; advanced toggle "Edit practicals" unlocks it |
| **Subject GP** | Computed live using the correct formula per subject type |

### **Step 1 — Auto-Fill From Target GPA**

- Input: **"Enter Target GPA"** (range 0.0–4.0, step 0.1) + a **"Plan"** button.
- **Algorithm:**
  1. Lock all practicals at A+ (GP = 4.0). Compute the practical contribution to GPA: `practicalContribution = Σ(CH × practicalGP × practicalWeight)` where practicalWeight = 0.25 for standard subjects and 0.50 for CS.
  2. Solve for a uniform theory GP needed: `uniformTheoryGP = (Target_GPA × totalCH − practicalContribution) / Σ(CH × theoryWeight)`.
  3. Snap uniformTheoryGP down to the nearest discrete grade in the config scale.
  4. Assign that grade to all subjects. Compute resulting GPA.
  5. If resulting GPA < target: greedily bump subjects up one grade, highest CH first, until GPA meets or exceeds target or no further bumps are possible.
  6. **Edge case — target too high:** If target > 4.0, reject input. If all subjects at A+ still can't reach target (impossible), fill all A+ and show "Maximum achievable GPA is 4.00."
  7. **Edge case — target too low:** If target ≤ 0 or below minimum achievable (all NG = 0.0), fill all D and show a note that this is the minimum passing suggestion.
  8. **Edge case — unreachable exact value:** Because grades are discrete, the exact target GPA may not be achievable. Fill to the nearest achievable GPA at or above target and label it clearly as an estimate.
- After auto-fill, all cells remain editable — this is a starting suggestion, not locked.

### **Step 2 — Two-Way Live Sync (CRITICAL)**

The **Target Theory Grade** dropdown and **Min Theory Marks** input share one value and stay in sync **both directions**:

- **Change GRADE** → update Min Theory Marks to that grade's minimum (`ceil(percentFloor × theoryMax / 100)`) → recompute Subject GP + overall GPA live.
- **Type a MARK** → convert to percentage → derive the grade band → update grade dropdown → recompute Subject GP + GPA live.
- All updates happen instantly on input/change (no "calculate" button after the initial plan).

### **Min-Marks Conversion (standard subjects, theory out of 75)**

| **Grade** | **% Floor** | **Exact (×75)** | **Min Mark Shown** |
| --- | --- | --- | --- |
| A+ | 90 | 67.5 | 68 |
| A | 80 | 60.0 | 60 |
| B+ | 70 | 52.5 | 53 |
| B | 60 | 45.0 | 45 |
| C+ | 50 | 37.5 | 38 |
| C | 40 | 30.0 | 30 |
| D | 35 | 26.25 | 27 |

**Computer Science (theory out of 50):** A+ → 45, A → 40, B+ → 35, B → 30, C+ → 25, C → 20, D → 18. Derive from `ceil(percentFloor × 50 / 100)`.

- Validation: theory marks 0–theoryMax (clamp; inline error if exceeded).

### **Step 3 — Practical Handling**

- Default: practical locked at A+ (4.00) for all subjects.
- **"Edit practicals"** toggle unlocks practical as its own grade dropdown + min-marks input (out of practicalMax from config) with the same two-way sync.

### **Step 4 — Live Result Banner (always visible)**

- Show **🎯 Target GPA** vs **✓ Live GPA** side by side, updating on every tweak.
- Color status: **green** when Live ≥ Target, **amber** when below, with numeric delta (e.g., "Target 3.40 · Live 3.42 · +0.02").
- If any subject drops to NG / below pass threshold, show a warning ("⚠️ NG in Social Studies — not passed").

### **Edge Cases & Rules**

- Recompute: `GPA = Σ(CH × Subject_GP) / Σ(CH)`, rounded to 2 decimals.
- Adding/removing **optional** subjects re-triggers plan-fill and live GPA.
- All inputs keyboard-accessible; dropdowns ARIA-compliant.

---

## **🎓 METHOD 4: STREAM ELIGIBILITY CHECKER**

### **Purpose**

A first-class method/tab where a student inputs grades in the required subjects (plus overall GPA) and instantly sees which +2 streams — **Science, Management, Humanities** — they qualify for, with a per-requirement breakdown.

> **Note:** This is now one of the four calibration methods (a dedicated tab), **not** a separate collapsed section. Selecting it switches the main view to the eligibility checker.

### **Inputs (only the required subjects — no extras)**

- Overall GPA: auto-pulled from shared state if a calculation has been run in Grade/Marks/Plan tab; otherwise manually editable. If multiple tabs have been used, use the most recently computed GPA.
- Final-grade dropdowns (showing grade + point, e.g. `C+ (2.40)`) for ONLY:
  - English, Nepali, Social Studies
  - Compulsory Mathematics
  - Compulsory Science
- Do **not** show optional or other subjects in this method.

### **Eligibility Rules — store as configurable constants, verified against official NEB criteria**

All GP comparisons use numeric GP values from the grading scale config, never string matching. Store every threshold as a named constant.

**🔬 Science:** Overall GPA ≥ **2.0**, AND Science ≥ C+ (GP 2.4), AND Mathematics ≥ C+ (GP 2.4), AND English ≥ D (GP 1.6), AND Nepali ≥ D (GP 1.6), AND Social Studies ≥ D (GP 1.6).

**💼 Management:** Overall GPA ≥ **1.6**, AND English ≥ D, AND Nepali ≥ D, AND Mathematics ≥ D, AND Science ≥ D, AND Social Studies ≥ D.

**▪ Humanities:** Overall GPA ≥ **1.6**, AND English ≥ D, AND Nepali ≥ D, AND Social Studies ≥ D.

### **Output Display**
- user should press Check Button
- Verdict line: **"You can enroll in: Science, Management, Humanities"** (list only streams that pass ALL criteria).
- Per-stream expandable detail card showing every requirement with ✓ / ✗. Failed requirements highlighted in red. Live re-evaluation on every input change.
- Below the eligibility checker, always show a **static criteria reference table** for all three streams — visible even before the user enters any data, so students know the requirements upfront.

### **Accessibility & UX**

- ARIA-compliant dropdowns, keyboard navigable.
- Mobile-friendly stacked cards.
- Eligible streams use green accent; ineligible use muted/red — consistent with the Vercel design system.

---

## **💡 How to Beat the Competitor**

1.I also want to display chart of grades  when click calculated below grade for better visualization (only for main grade calculation skip for other).
2. Realistic marksheet preview with PDF/image export (secondary feature; competitor has none).
3. Plan Mode reverse planner (target GPA → suggested grades, presented as an estimate).
4. +2 stream eligibility checker as a built-in method.
5. Color-coded grade badges & per-subject feedback.
6. Fast, ad-free, lightweight Astro build (win on Lighthouse).
7. Full accessibility + dark mode + mobile-first.
8. Inline NG / fail warnings.

## **✓ Deliverables / Definition of Done**

- Fully working calculator across all **four methods** (Grade, Marks, Plan, Stream Eligibility), with live recalculation on every input change.
- Compulsory subjects locked and non-deletable; only optionals removable.
- GPA logic verified against official NEB methodology, with the calculation method documented.
- All grading scales, thresholds, and eligibility rules stored as configurable constants.
- Marksheet preview/export (image + PDF) present but secondary.
- Mobile-first responsive, accessible (WCAG AA, keyboard-navigable dropdowns).
- Dark/light theme toggle, system preference as default.
- Basic `<title>` and `<meta description>` only — full SEO optimization is out of scope for this build just provide guide where to do like main shell where all detail , faq, how to use like that. 
- Grading Scale refrence is already there below main section for refrence
- Clean, commented, componentized code following Astro + React islands + Tailwind v4 best practices.
-make docs of how it has implemented 4 feature seperate md inside doca folder so in future when updating or changing agent quickly get context instead of gussing.