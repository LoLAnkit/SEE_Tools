/**
 * EligibilityChecker.tsx — +2 Stream Eligibility Checker tab panel.
 *
 * GPA field auto-populated from shared `lastComputedGpa`; allows manual entry
 * clamped to [0.00–4.00]. Five required subject grade dropdowns (English,
 * Nepali, Social Studies, Mathematics, Science). "Check" action validates
 * required inputs and renders per-stream verdicts via `evaluateEligibility`
 * (Requirements 15.1–15.12).
 */

import React, { useContext, useState, useMemo } from "react";
import { CalculatorContext } from "./CalculatorContext";
import GradeSelect from "./GradeSelect";
import StreamCriteriaTable from "./StreamCriteriaTable";
import StreamDetailCard from "./StreamDetailCard";
import {
  evaluateEligibility,
  validateRequiredGrades,
} from "../../lib/eligibility";
import type { RequiredSubjectId } from "../../config/gradingScale";
import type { LetterGrade } from "../../config/gradingScale";
import type { EligibilityResult } from "../../lib/eligibility";

// ---------------------------------------------------------------------------
// Required subject labels in display order
// ---------------------------------------------------------------------------

const REQUIRED_SUBJECTS: { id: RequiredSubjectId; label: string }[] = [
  { id: "english", label: "English" },
  { id: "nepali", label: "Nepali" },
  { id: "socialStudies", label: "Social Studies" },
  { id: "math", label: "Mathematics" },
  { id: "science", label: "Science" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EligibilityChecker() {
  const { state, dispatch } = useContext(CalculatorContext);
  const { eligibility } = state;

  // Local GPA input — must be entered manually
  const [gpaInput, setGpaInput] = useState<string>("");
  const [gpaError, setGpaError] = useState<string | null>(null);
  const [missingError, setMissingError] = useState<string | null>(null);
  const [result, setResult] = useState<EligibilityResult | null>(null);

  function handleGpaChange(e: React.ChangeEvent<HTMLInputElement>) {
    setGpaInput(e.target.value);
    setGpaError(null);
    setResult(null);
  }

  function handleGpaBlur() {
    const trimmed = gpaInput.trim();
    if (trimmed === "") return;
    const parsed = parseFloat(trimmed);
    if (isNaN(parsed)) {
      setGpaError("Enter a numeric GPA between 0.00 and 4.00.");
      return;
    }
    if (parsed < 0 || parsed > 4.0) {
      const clamped = Math.min(4.0, Math.max(0, parsed));
      setGpaInput(clamped.toFixed(2));
      setGpaError("Value clamped to valid range (0.00–4.00).");
      dispatch({ type: "SET_MANUAL_GPA", gpa: clamped });
    } else {
      setGpaError(null);
      dispatch({ type: "SET_MANUAL_GPA", gpa: parsed });
    }
  }

  function handleGradeChange(subjectId: RequiredSubjectId, grade: LetterGrade | "") {
    dispatch({ type: "SET_ELIGIBILITY_GRADE", subjectId, grade });
    setResult(null);
    setMissingError(null);
  }

  function handleCheck() {
    // Validate required grades
    const validation = validateRequiredGrades(eligibility.requiredGrades);
    if (!validation.valid) {
      const labels = validation.missing.map(
        (id) => REQUIRED_SUBJECTS.find((s) => s.id === id)?.label ?? id
      );
      setMissingError(
        `Please select grades for: ${labels.join(", ")}.`
      );
      return;
    }
    setMissingError(null);

    // Determine GPA to use
    const gpaStr = gpaInput.trim();
    const gpa = parseFloat(gpaStr);
    if (isNaN(gpa)) {
      setGpaError("Enter a valid GPA to check eligibility.");
      return;
    }

    const evalResult = evaluateEligibility(
      Math.min(4, Math.max(0, gpa)),
      eligibility.requiredGrades
    );
    setResult(evalResult);
  }

  return (
    <div className="space-y-6">
      {/* Input section */}
      <div className="space-y-5">
        <h3 className="text-sm font-semibold text-ink">Check Your Eligibility</h3>

        {/* Overall GPA — prominent required field */}
        <div className="rounded-md border-2 border-brand bg-canvas-soft px-4 py-4">
          <label
            htmlFor="eligibility-gpa"
            className="block text-base font-bold text-ink mb-2"
          >
            Overall GPA
            <span className="ml-1 text-error" aria-label="required">*</span>
          </label>
          <input
            id="eligibility-gpa"
            type="text"
            inputMode="decimal"
            value={gpaInput}
            onChange={handleGpaChange}
            onBlur={handleGpaBlur}
            placeholder="e.g. 3.20"
            required
            aria-required="true"
            aria-invalid={gpaError ? "true" : "false"}
            aria-describedby={gpaError ? "eligibility-gpa-error" : "eligibility-gpa-hint"}
            className={[
              "w-36 rounded-sm border-2 px-3 py-2 text-lg font-semibold text-ink bg-canvas",
              "focus:outline-none focus:ring-2 focus:ring-brand",
              gpaError ? "border-error" : "border-hairline hover:border-brand",
            ].join(" ")}
          />
          <p id="eligibility-gpa-hint" className="mt-1.5 text-xs text-body">
            Enter your overall GPA (0.00–4.00)
          </p>
          {gpaError && (
            <p id="eligibility-gpa-error" role="alert" className="mt-1 text-xs text-error font-medium">
              {gpaError}
            </p>
          )}
        </div>

        {/* Required subject grade dropdowns */}
        <div>
          <p className="text-sm font-medium text-ink mb-3">
            Required Subject Grades
            <span className="ml-1 text-error" aria-label="required">*</span>
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REQUIRED_SUBJECTS.map(({ id, label }) => (
              <div key={id} className="flex flex-col gap-1">
                <label
                  htmlFor={`eligibility-grade-${id}`}
                  className="text-xs font-medium text-body"
                >
                  {label}
                </label>
                <GradeSelect
                  id={`eligibility-grade-${id}`}
                  value={eligibility.requiredGrades[id]}
                  onChange={(grade) => handleGradeChange(id, grade)}
                  label={`Final grade for ${label}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Check button */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleCheck}
            className="inline-flex w-fit items-center rounded-sm bg-brand px-5 py-2 text-sm font-semibold text-on-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand hover:opacity-90 transition-opacity"
          >
            Check Eligibility
          </button>
          {missingError && (
            <p role="alert" className="text-xs text-error">
              {missingError}
            </p>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Verdict summary */}
          <div className="rounded-md border border-hairline px-4 py-3">
            <p className="text-sm font-semibold text-ink mb-2">
              Eligible streams:
            </p>
            {result.qualifying.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.qualifying.map((stream) => (
                  <span
                    key={stream}
                    className="rounded-full bg-success px-3 py-1 text-xs font-semibold text-white"
                  >
                    {stream} ✓
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-error font-medium">
                No +2 stream qualifies with the provided grades and GPA.
              </p>
            )}
          </div>

          {/* Per-stream detail cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.details.map((verdict) => (
              <StreamDetailCard key={verdict.stream} verdict={verdict} />
            ))}
          </div>
        </div>
      )}

      {/* Static criteria reference — below check section (Requirement 15.9) */}
      <div className="pt-2 border-t border-hairline">
        <h3 className="text-sm font-semibold text-ink mb-2">
          Eligibility Criteria Reference
        </h3>
        <StreamCriteriaTable />
      </div>
    </div>
  );
}
