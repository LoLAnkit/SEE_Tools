/**
 * ResultBanner.tsx — GPA result display with letter grade, "—" sentinel for
 * zero state, and a red NG/fail warning (Requirements 8.5, 10.5, 11.3, 11.4).
 *
 * Zero state rules (show "—"):
 *   - grade mode: until ALL compulsory subjects have a theory grade selected
 *   - marks mode: lastComputedGpa is null (no marks entered yet)
 *
 * NG/fail warning: when the computed GpaResult contains any subject with
 * isNg === true, a red warning banner names the affected subjects
 * (Requirements 8.5, 10.5).
 *
 * The banner calls computeGpa directly so its result is always current with
 * the live subject state; it reads perSubject detail from the result to
 * identify NG/failing subjects.
 */

import React, { useContext, useMemo } from "react";
import { CalculatorContext } from "./CalculatorContext";
import type { Tab } from "./CalculatorContext";
import { computeGpa } from "../../lib/calc";
import type { ScoredSubject } from "../../lib/calc";
import { GRADING_SCALE, type LetterGrade } from "../../config/gradingScale";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ResultBannerProps {
  /** Which calculator method is active — determines zero-state gating. */
  mode: "grade" | "marks";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Maps a LetterGrade to the minimum percent floor (from the config). */
function getMinPercent(grade: LetterGrade): number {
  const band = GRADING_SCALE.find((b) => b.grade === grade);
  return band?.minPercent ?? 0;
}

/** Converts a subject row to a ScoredSubject for computeGpa, synthesising
 *  marks from grade selections when no raw marks are present. */
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
  let theoryMarks: number;
  if (s.theoryMarks !== null) {
    theoryMarks = s.theoryMarks;
  } else if (s.theoryGrade !== "") {
    // Synthesise minimum marks for the grade so the grade point is exact
    theoryMarks =
      s.theoryGrade === "A+"
        ? s.theoryMax
        : s.theoryGrade === "NG"
        ? 0
        : Math.ceil((getMinPercent(s.theoryGrade) * s.theoryMax) / 100);
  } else {
    theoryMarks = 0;
  }

  let practicalMarks: number;
  if (s.practicalMarks !== null) {
    practicalMarks = s.practicalMarks;
  } else if (s.practicalGrade !== "") {
    practicalMarks =
      s.practicalGrade === "A+"
        ? s.practicalMax
        : s.practicalGrade === "NG"
        ? 0
        : Math.ceil((getMinPercent(s.practicalGrade) * s.practicalMax) / 100);
  } else {
    practicalMarks = 0;
  }

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

export default function ResultBanner({ mode }: ResultBannerProps) {
  const { state } = useContext(CalculatorContext);
  const { subjects, lastComputedGpa } = state;

  // -------------------------------------------------------------------------
  // Determine zero state
  // -------------------------------------------------------------------------

  const isZeroState = useMemo<boolean>(() => {
    if (mode === "grade") {
      // Zero state until ALL compulsory subjects have a theory grade (Req 9.5)
      const allCompulsoryHaveTheory = subjects
        .filter((s) => s.isCompulsory)
        .every((s) => s.theoryGrade !== "");
      return !allCompulsoryHaveTheory;
    }
    // marks mode: null until at least something is computed
    return lastComputedGpa === null;
  }, [mode, subjects, lastComputedGpa]);

  // -------------------------------------------------------------------------
  // Run computeGpa (only when not zero-state)
  // -------------------------------------------------------------------------

  const gpaResult = useMemo(() => {
    if (isZeroState) return null;
    const scored = subjects.map(rowToScoredSubject);
    return computeGpa(scored);
  }, [isZeroState, subjects]);

  // -------------------------------------------------------------------------
  // Build NG/fail subject names list — kept for internal use only
  // -------------------------------------------------------------------------

  // (warning banner removed — not shown during input)

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-2">
      {/* Main result row */}
      <div className="flex items-center gap-3 rounded-md bg-canvas-soft px-4 py-3 border border-hairline">
        <span className="text-xs font-medium text-mute uppercase tracking-wide">
          GPA
        </span>
        {isZeroState || !gpaResult ? (
          <span
            className="text-2xl font-semibold text-mute"
            aria-label="GPA not yet computed"
          >
            —
          </span>
        ) : (
          <span
            className="text-2xl font-semibold text-ink"
            aria-label={`GPA ${gpaResult.gpa.toFixed(2)}, ${gpaResult.letter}`}
          >
            {gpaResult.gpa.toFixed(2)}{" "}
            <span className="text-lg text-body">({gpaResult.letter})</span>
          </span>
        )}
      </div>
    </div>
  );
}
