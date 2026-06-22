/**
 * MarksMode.tsx — Marks Mode tab panel.
 *
 * Theory/practical marks bounded by configured maxes, live derived Final Grade
 * and Grade Point, red badge on below-threshold components, and a banner
 * warning on any NG subject (Requirements 10.1, 10.3, 10.4, 10.5).
 */

import React, { useContext, useMemo } from "react";
import SubjectTable from "./SubjectTable";
import { CalculatorContext } from "./CalculatorContext";
import { computeGpa } from "../../lib/calc";
import { GRADING_SCALE, type LetterGrade } from "../../config/gradingScale";
import type { ScoredSubject } from "../../lib/calc";

// ---------------------------------------------------------------------------
// Helpers (mirrors ResultBanner row-to-scored conversion)
// ---------------------------------------------------------------------------

function getMinPercent(grade: LetterGrade): number {
  const band = GRADING_SCALE.find((b) => b.grade === grade);
  return band?.minPercent ?? 0;
}

function rowToScoredSubject(s: {
  id: string;
  creditHours: number;
  splitType: "75-25" | "50-50";
  theoryMax: number;
  practicalMax: number;
  theoryGrade: LetterGrade | "";
  practicalGrade: LetterGrade | "";
  theoryMarks: number | null;
  practicalMarks: number | null;
}): ScoredSubject {
  let theoryMarks =
    s.theoryMarks !== null
      ? s.theoryMarks
      : s.theoryGrade !== ""
      ? s.theoryGrade === "A+"
        ? s.theoryMax
        : s.theoryGrade === "NG"
        ? 0
        : Math.ceil((getMinPercent(s.theoryGrade) * s.theoryMax) / 100)
      : 0;

  let practicalMarks =
    s.practicalMarks !== null
      ? s.practicalMarks
      : s.practicalGrade !== ""
      ? s.practicalGrade === "A+"
        ? s.practicalMax
        : s.practicalGrade === "NG"
        ? 0
        : Math.ceil((getMinPercent(s.practicalGrade) * s.practicalMax) / 100)
      : 0;

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

export default function MarksMode() {
  const { state } = useContext(CalculatorContext);
  const { subjects, lastComputedGpa } = state;

  const gpaResult = useMemo(() => {
    if (lastComputedGpa === null) return null;
    return computeGpa(subjects.map(rowToScoredSubject));
  }, [subjects, lastComputedGpa]);

  return (
    <div className="space-y-4">
      {/* Live GPA display */}
      <div className="flex items-center justify-end gap-3 rounded-md border border-hairline bg-canvas-soft px-4 py-2.5">
        <span className="text-xs font-semibold text-mute uppercase tracking-widest">Live GPA</span>
        {gpaResult ? (
          <span
            className="text-2xl font-bold text-ink tabular-nums"
            aria-label={`GPA ${gpaResult.gpa.toFixed(2)}, ${gpaResult.letter}`}
          >
            {gpaResult.gpa.toFixed(2)}
            <span className="ml-1.5 text-lg font-medium text-body">({gpaResult.letter})</span>
          </span>
        ) : (
          <span className="text-2xl font-bold text-mute" aria-label="GPA not yet computed">
            —
          </span>
        )}
      </div>

      {/* Subject table with marks inputs */}
      <SubjectTable mode="marks" />
    </div>
  );
}
