/**
 * PlanMode.tsx — Plan Mode tab panel.
 *
 * Target GPA input (0.0–4.0 step 0.1) + "Plan" control that invokes
 * `planForTarget`. Results fill the plan table. Practicals default to A+
 * (locked). Live preview banner appears directly below the solver message.
 * (Requirements 12.1–12.11, 13.1–13.10, 14.1–14.4).
 */

import React, { useContext, useState } from "react";
import { CalculatorContext } from "./CalculatorContext";
import GradeSelect from "./GradeSelect";
import PlanBanner from "./PlanBanner";
import { planForTarget, gradeToMinMarks } from "../../lib/plan";
import { subjectGradePoint } from "../../lib/calc";
import { GRADING_SCALE, GRADE_ORDER_ASC } from "../../config/gradingScale";
import type { PlanSubject, PlanSubjectGrade } from "../../lib/plan";
import type { LetterGrade } from "../../config/gradingScale";
import type { SubjectRow } from "./CalculatorContext";

// ---------------------------------------------------------------------------
// Per-row plan state (kept local — not in global reducer)
// ---------------------------------------------------------------------------

interface PlanRowState {
  subjectId: string;
  theoryGrade: LetterGrade;
  practicalGrade: LetterGrade; // always "A+"
}

function buildPlanRows(
  subjects: SubjectRow[],
  suggestion: PlanSubjectGrade[]
): PlanRowState[] {
  return subjects.map((s) => {
    const sug = suggestion.find((sg) => sg.subjectId === s.id);
    const theoryGrade = sug?.theoryGrade ?? "D";
    return {
      subjectId: s.id,
      theoryGrade,
      practicalGrade: "A+",
    };
  });
}

// ---------------------------------------------------------------------------
// Min marks range helper
// ---------------------------------------------------------------------------

/**
 * Returns the theory marks range [min, max] needed to achieve `grade`.
 * - min = gradeToMinMarks(grade, theoryMax)
 * - max = gradeToMinMarks(nextGrade, theoryMax) - 1, or theoryMax for A+
 */
function theoryMarksRange(
  grade: LetterGrade,
  theoryMax: number
): { min: number; max: number } | null {
  if (grade === "NG") return null;
  const min = gradeToMinMarks(grade, theoryMax);
  const gradeIdx = GRADE_ORDER_ASC.indexOf(grade as Exclude<LetterGrade, "NG">);
  if (grade === "A+") {
    return { min, max: theoryMax };
  }
  const nextGrade = gradeIdx !== -1 && gradeIdx < GRADE_ORDER_ASC.length - 1
    ? GRADE_ORDER_ASC[gradeIdx + 1]
    : null;
  const max = nextGrade ? gradeToMinMarks(nextGrade, theoryMax) - 1 : theoryMax;
  return { min, max };
}

// ---------------------------------------------------------------------------
// PlanRowCmp
// ---------------------------------------------------------------------------

interface PlanRowCmpProps {
  row: PlanRowState;
  subject: SubjectRow;
  subjectGp: number;
  onChange: (updated: PlanRowState) => void;
}

function PlanRowCmp({ row, subject, subjectGp, onChange }: PlanRowCmpProps) {
  function handleTheoryGradeChange(grade: LetterGrade | "") {
    if (!grade) return;
    onChange({ ...row, theoryGrade: grade });
  }

  const range = theoryMarksRange(row.theoryGrade, subject.theoryMax);

  return (
    <tr className="border-b border-hairline last:border-b-0 hover:bg-canvas-soft transition-colors">
      {/* Subject */}
      <td className="px-4 py-3 text-sm font-medium text-ink">{subject.name}</td>
      {/* Target Theory Grade */}
      <td className="px-4 py-3">
        <GradeSelect
          value={row.theoryGrade}
          onChange={handleTheoryGradeChange}
          label={`Target theory grade for ${subject.name}`}
          id={`plan-theory-grade-${subject.id}`}
        />
      </td>
      {/* Min Marks (theory range needed) */}
      <td className="px-4 py-3 text-sm font-mono text-center">
        {range ? (
          <span className="inline-flex items-center gap-1">
            <span className="text-ink font-semibold">{range.min}</span>
            <span className="text-mute">–</span>
            <span className="text-ink font-semibold">{range.max}</span>
            <span className="text-mute text-xs">/{subject.theoryMax}</span>
          </span>
        ) : (
          <span className="text-mute">—</span>
        )}
      </td>
      {/* Practical */}
      <td className="px-4 py-3">
        <span className="text-sm font-semibold text-ink">A+</span>
      </td>
      {/* Subject GP */}
      <td className="px-4 py-3 text-sm font-mono text-center text-body">
        {subjectGp.toFixed(2)}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// PlanMode
// ---------------------------------------------------------------------------

export default function PlanMode() {
  const { state, dispatch } = useContext(CalculatorContext);
  const { subjects, plan } = state;

  const [targetInput, setTargetInput] = useState<string>(
    plan.targetGpa !== null ? String(plan.targetGpa) : ""
  );
  const [targetError, setTargetError] = useState<string | null>(null);
  const [planRows, setPlanRows] = useState<PlanRowState[] | null>(null);
  const [planMessage, setPlanMessage] = useState<string | null>(null);

  function toPlanSubjects(): PlanSubject[] {
    return subjects.map((s) => ({
      id: s.id,
      creditHours: s.creditHours,
      splitType: s.splitType,
      theoryMax: s.theoryMax,
      practicalMax: s.practicalMax,
    }));
  }

  function handlePlan() {
    const trimmed = targetInput.trim();
    if (trimmed === "") {
      setTargetError("Enter a numeric target GPA between 0.00 and 4.00.");
      return;
    }
    const parsed = parseFloat(trimmed);
    if (isNaN(parsed)) {
      setTargetError("Enter a numeric target GPA between 0.00 and 4.00.");
      return;
    }
    if (parsed < 0 || parsed > 4.0) {
      const clamped = Math.min(4.0, Math.max(0, parsed));
      setTargetInput(clamped.toFixed(2));
      setTargetError("Value clamped to valid range (0.00–4.00).");
      dispatch({ type: "SET_PLAN_TARGET", targetGpa: clamped });
      return;
    }
    setTargetError(null);
    dispatch({ type: "SET_PLAN_TARGET", targetGpa: parsed });

    const result = planForTarget(toPlanSubjects(), parsed);
    const rows = buildPlanRows(subjects, result.suggestion);
    setPlanRows(rows);
    setPlanMessage(result.message);

    // Sync grades into shared state so PlanBanner can compute live GPA
    for (const sug of result.suggestion) {
      dispatch({ type: "SET_THEORY_GRADE", id: sug.subjectId, grade: sug.theoryGrade });
      dispatch({ type: "SET_PRACTICAL_GRADE", id: sug.subjectId, grade: "A+" });
    }
  }

  function handleRowChange(idx: number, updated: PlanRowState) {
    if (!planRows) return;
    const next = [...planRows];
    next[idx] = updated;
    setPlanRows(next);
    // Sync into shared state so PlanBanner stays live
    dispatch({ type: "SET_THEORY_GRADE", id: updated.subjectId, grade: updated.theoryGrade });
    dispatch({ type: "SET_PRACTICAL_GRADE", id: updated.subjectId, grade: "A+" });
  }

  // Compute per-row subject GPs for display
  function computeSubjectGp(rowState: PlanRowState, subject: SubjectRow): number {
    const tBand = GRADING_SCALE.find((b) => b.grade === rowState.theoryGrade);
    const pBand = GRADING_SCALE.find((b) => b.grade === "A+");
    const tGp = tBand?.gradePoint ?? 0;
    const pGp = pBand?.gradePoint ?? 4.0;
    return subjectGradePoint(tGp, pGp, subject.splitType);
  }

  return (
    <div className="space-y-4">
      {/* Target GPA input + Plan button */}
      <div className="rounded-md border-2 border-brand bg-canvas-soft px-4 py-4">
        <label
          htmlFor="plan-target-gpa"
          className="block text-base font-bold text-ink mb-2"
        >
          Target GPA
          <span className="ml-1 text-error" aria-label="required">*</span>
        </label>
        <div className="flex items-center gap-3">
          <input
            id="plan-target-gpa"
            type="text"
            inputMode="decimal"
            value={targetInput}
            onChange={(e) => {
              setTargetInput(e.target.value);
              setTargetError(null);
            }}
            placeholder="e.g. 3.20"
            required
            aria-required="true"
            aria-invalid={targetError ? "true" : "false"}
            aria-describedby={targetError ? "plan-target-error" : "plan-target-hint"}
            className={[
              "w-36 rounded-sm border-2 px-3 py-2 text-lg font-semibold text-ink bg-canvas",
              "focus:outline-none focus:ring-2 focus:ring-brand",
              targetError ? "border-error" : "border-hairline",
            ].join(" ")}
          />
          <button
            onClick={handlePlan}
            className="rounded-sm bg-brand px-5 py-2 text-sm font-semibold text-on-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand hover:opacity-90 transition-opacity"
          >
            Plan
          </button>
        </div>
        <p id="plan-target-hint" className="mt-1.5 text-xs text-body">
          Enter your target GPA (0.00–4.00)
        </p>
        {targetError && (
          <p id="plan-target-error" role="alert" className="mt-1 text-xs text-error font-medium">
            {targetError}
          </p>
        )}
        <p className="mt-2 text-xs text-mute">
          This shows one suggested path — other grade combinations may also reach the target.
          Estimated: nearest achievable GPA at or above target.
        </p>
      </div>

      {/* Solver message */}
      {planMessage && (
        <div className="rounded-md border border-warning bg-warning-soft px-4 py-2 text-sm text-warning-deep">
          {planMessage}
        </div>
      )}

      {/* Live plan result banner — shown as soon as a plan is generated */}
      {planRows && <PlanBanner />}

      {/* Plan table */}
      {planRows && (
        <div className="overflow-x-auto rounded-md border border-hairline">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Plan mode subject grade suggestions</caption>
            <thead>
              <tr className="border-b border-hairline bg-canvas-soft">
                <th scope="col" className="px-4 py-3 font-semibold text-ink">Subject</th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">Target Theory Grade</th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink text-center">
                  Min Marks
                  <span className="block text-xs font-normal text-mute">(theory range)</span>
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">Practical</th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink text-center">Subject GP</th>
              </tr>
            </thead>
            <tbody>
              {planRows.map((row, idx) => {
                const subject = subjects.find((s) => s.id === row.subjectId);
                if (!subject) return null;
                const subjectGp = computeSubjectGp(row, subject);
                return (
                  <PlanRowCmp
                    key={row.subjectId}
                    row={row}
                    subject={subject}
                    subjectGp={subjectGp}
                    onChange={(updated) => handleRowChange(idx, updated)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
