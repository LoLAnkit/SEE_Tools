/**
 * PlanBanner.tsx — Live Target vs Live GPA banner for Plan Mode.
 *
 * Shows Target GPA and Live GPA side by side with a numeric delta. Green when
 * Live ≥ Target, amber when below. NG/fail warning names affected subjects
 * (Requirements 14.1–14.4).
 */

import React, { useContext, useMemo } from "react";
import { CalculatorContext } from "./CalculatorContext";
import { computeGpa } from "../../lib/calc";
import { GRADING_SCALE } from "../../config/gradingScale";
import type { ScoredSubject } from "../../lib/calc";
import type { SubjectRow } from "./CalculatorContext";
import type { LetterGrade } from "../../config/gradingScale";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function gradeToMinMarksLocal(grade: LetterGrade | "", max: number): number {
  if (!grade || grade === "NG") return 0;
  if (grade === "A+") return max;
  // derive from percent floor
  const band = GRADING_SCALE.find((b) => b.grade === grade);
  if (!band) return 0;
  return Math.ceil((band.minPercent * max) / 100);
}

function rowToScoredSubject(s: SubjectRow): ScoredSubject {
  const theoryMarks =
    s.theoryMarks !== null
      ? s.theoryMarks
      : gradeToMinMarksLocal(s.theoryGrade, s.theoryMax);
  const practicalMarks =
    s.practicalMarks !== null
      ? s.practicalMarks
      : gradeToMinMarksLocal(s.practicalGrade || "A+", s.practicalMax);
  return {
    id: s.id,
    creditHours: s.creditHours,
    splitType: s.splitType,
    theoryMax: s.theoryMax,
    practicalMax: s.practicalMax,
    theoryMarks,
    practicalMarks,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlanBanner() {
  const { state } = useContext(CalculatorContext);
  const { subjects, plan } = state;
  const targetGpa = plan.targetGpa;

  const gpaResult = useMemo(() => {
    const anyInput = subjects.some(
      (s) => s.theoryGrade !== "" || s.theoryMarks !== null
    );
    if (!anyInput) return null;
    return computeGpa(subjects.map(rowToScoredSubject));
  }, [subjects]);

  const liveGpa = gpaResult?.gpa ?? null;

  const ngSubjectNames = useMemo(() => {
    if (!gpaResult) return [];
    return subjects
      .filter((s) => gpaResult.perSubject[s.id]?.isNg === true)
      .map((s) => s.name);
  }, [gpaResult, subjects]);

  const isOnTarget =
    liveGpa !== null && targetGpa !== null && liveGpa >= targetGpa - 1e-9;
  const delta =
    liveGpa !== null && targetGpa !== null
      ? (liveGpa - targetGpa).toFixed(2)
      : null;
  const deltaPositive = delta !== null && parseFloat(delta) >= 0;

  if (targetGpa === null && liveGpa === null) return null;

  return (
    <div className="space-y-2">
      <div
        className={[
          "flex flex-wrap items-center gap-4 rounded-md border px-4 py-3",
          isOnTarget
            ? "border-success bg-canvas-soft"
            : "border-warning bg-warning-soft",
        ].join(" ")}
      >
        {/* Target GPA */}
        <div className="flex flex-col">
          <span className="text-xs font-medium text-mute uppercase tracking-wide">
            Target
          </span>
          <span className="text-xl font-semibold font-mono text-ink">
            {targetGpa !== null ? targetGpa.toFixed(2) : "—"}
          </span>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-hairline" aria-hidden="true" />

        {/* Live GPA */}
        <div className="flex flex-col">
          <span className="text-xs font-medium text-mute uppercase tracking-wide">
            Live GPA
          </span>
          <span
            className={[
              "text-xl font-semibold font-mono",
              liveGpa === null
                ? "text-mute"
                : isOnTarget
                ? "text-success"
                : "text-warning-deep",
            ].join(" ")}
          >
            {liveGpa !== null ? liveGpa.toFixed(2) : "—"}
          </span>
        </div>

        {/* Delta */}
        {delta !== null && (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-mute uppercase tracking-wide">
              Delta
            </span>
            <span
              className={[
                "text-sm font-semibold font-mono",
                deltaPositive ? "text-success" : "text-warning-deep",
              ].join(" ")}
            >
              {deltaPositive ? "+" : ""}
              {delta}
            </span>
          </div>
        )}

        {/* Status label */}
        {liveGpa !== null && targetGpa !== null && (
          <div className="ml-auto">
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-semibold",
                isOnTarget
                  ? "bg-success text-on-brand"
                  : "bg-warning text-on-brand",
              ].join(" ")}
            >
              {isOnTarget ? "On Target ✓" : "Below Target"}
            </span>
          </div>
        )}
      </div>

      {/* NG/fail warning */}
      {ngSubjectNames.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-error bg-error-soft px-4 py-3"
        >
          <span className="mt-px text-error" aria-hidden="true">⚠</span>
          <p className="text-sm text-error font-medium">
            Not passed.{" "}
            {ngSubjectNames.length === 1 ? (
              <>
                <strong>{ngSubjectNames[0]}</strong> has a failing or NG component.
              </>
            ) : (
              <>
                The following subjects have a failing or NG component:{" "}
                <strong>{ngSubjectNames.join(", ")}</strong>.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
