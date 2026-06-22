/**
 * StreamCriteriaTable.tsx — Always-visible +2 stream eligibility criteria reference.
 *
 * Shows all three streams with their minimum GPA and per-subject minimum grade
 * point requirements, sourced from STREAM_RULES config (Requirement 15.9).
 */

import React from "react";
import { STREAM_RULES, GRADING_SCALE } from "../../config/gradingScale";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Maps a numeric grade point back to a letter grade for display. */
function gpToGrade(gp: number): string {
  const band = GRADING_SCALE.find((b) => b.gradePoint === gp);
  return band ? `${band.grade} (${gp.toFixed(1)})` : gp.toFixed(1);
}

const SUBJECT_LABELS: Record<string, string> = {
  english: "English",
  nepali: "Nepali",
  socialStudies: "Social Studies",
  math: "Mathematics",
  science: "Science",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StreamCriteriaTable() {
  return (
    <div className="rounded-md border border-hairline overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">+2 Stream Eligibility Criteria Reference</caption>
        <thead>
          <tr className="border-b border-hairline bg-canvas-soft">
            <th scope="col" className="px-4 py-3 text-left font-semibold text-ink">Stream</th>
            <th scope="col" className="px-4 py-3 text-center font-semibold text-ink">Min GPA</th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-ink">Subject Requirements</th>
          </tr>
        </thead>
        <tbody>
          {STREAM_RULES.map((rule) => (
            <tr key={rule.stream} className="border-b border-hairline last:border-b-0">
              <td className="px-4 py-3 font-semibold text-ink">{rule.stream}</td>
              <td className="px-4 py-3 text-center font-mono text-body">
                ≥ {rule.minGpa.toFixed(1)}
              </td>
              <td className="px-4 py-3">
                <ul className="flex flex-wrap gap-2">
                  {Object.entries(rule.subjectMinGp).map(([subjectId, minGp]) => (
                    <li
                      key={subjectId}
                      className="rounded bg-canvas-soft-2 border border-hairline px-2 py-0.5 text-xs text-body"
                    >
                      {SUBJECT_LABELS[subjectId] ?? subjectId}: ≥ {gpToGrade(minGp as number)}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
