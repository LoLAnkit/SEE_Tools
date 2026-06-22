/**
 * MarksheetPreview.tsx — Simulated official SEE marksheet layout.
 *
 * Columns match the real NEB SEE marksheet:
 * S.N. | COMP./OPT. | SUBJECTS | CREDIT HOUR | TH (Obtained Grade) | PR (Obtained Grade) | FINAL GRADE | GRADE POINT | REMARKS
 *
 * Works from grade-mode inputs (theoryGrade / practicalGrade).
 * Remarks is always "Passed" in English (per the real marksheet).
 */

import React, { useContext } from "react";
import { CalculatorContext } from "./CalculatorContext";
import { GRADING_SCALE, gpaToLetter } from "../../config/gradingScale";
import { subjectGradePoint } from "../../lib/calc";
import type { LetterGrade } from "../../config/gradingScale";
import type { SubjectRow } from "./CalculatorContext";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function gradeToGp(grade: LetterGrade | ""): number {
  if (!grade) return 0;
  return GRADING_SCALE.find((b) => b.grade === grade)?.gradePoint ?? 0;
}

function deriveRow(s: SubjectRow, serial: number) {
  const theoryGrade = s.theoryGrade || ("—" as const);
  const practicalGrade = (s.practicalGrade || "A+") as LetterGrade;

  const theoryGp = gradeToGp(s.theoryGrade);
  const practicalGp = gradeToGp(practicalGrade);
  const subjectGp = s.theoryGrade
    ? subjectGradePoint(theoryGp, practicalGp, s.splitType)
    : 0;
  const finalGrade: LetterGrade | "—" = s.theoryGrade ? gpaToLetter(subjectGp) : "—";
  const failing = s.theoryGrade === "NG" || s.practicalGrade === "NG";

  // Official NEB remark system: description of the final grade (e.g. "Outstanding" for A+)
  const remarkDesc = s.theoryGrade
    ? (GRADING_SCALE.find((b) => b.grade === finalGrade)?.description ?? "")
    : "—";

  return {
    serial,
    type: s.isCompulsory ? "COMP." : "OPT.",
    name: s.name.toUpperCase(),
    creditHour: s.creditHours,
    theoryGrade: theoryGrade === "—" ? "—" : theoryGrade,
    practicalGrade: practicalGrade,
    finalGrade,
    gradePoint: s.theoryGrade ? subjectGp : null,
    remark: remarkDesc,
    failing,
    entered: !!s.theoryGrade,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MarksheetPreviewProps {
  previewRef?: React.RefObject<HTMLDivElement | null>;
}

export default function MarksheetPreview({ previewRef }: MarksheetPreviewProps) {
  const { state } = useContext(CalculatorContext);
  const { subjects } = state;

  const rows = subjects.map((s, i) => deriveRow(s, i + 1));

  // Overall GPA — from subjects that have grades
  const gradedSubjects = subjects.filter((s) => s.theoryGrade !== "");
  let overallGpa: number | null = null;
  let overallLetter: LetterGrade | null = null;
  if (gradedSubjects.length > 0) {
    const totalWeightedGp = gradedSubjects.reduce((sum, s) => {
      const theoryGp = gradeToGp(s.theoryGrade);
      const practicalGp = gradeToGp((s.practicalGrade || "A+") as LetterGrade);
      return sum + subjectGradePoint(theoryGp, practicalGp, s.splitType) * s.creditHours;
    }, 0);
    const totalCh = gradedSubjects.reduce((sum, s) => sum + s.creditHours, 0);
    overallGpa = totalCh > 0 ? totalWeightedGp / totalCh : 0;
    overallLetter = gpaToLetter(overallGpa);
  }

  return (
    <div
      ref={previewRef}
      id="marksheet-preview"
      className="bg-white text-black font-mono text-xs rounded border border-gray-400"
      style={{ fontFamily: "monospace" }}
    >
      {/* Marksheet table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs" style={{ borderSpacing: 0 }}>
          <thead>
            <tr className="border-b-2 border-gray-400 bg-gray-100">
              <th
                rowSpan={2}
                className="border border-gray-400 px-2 py-2 text-center font-bold align-middle text-[10px] leading-tight"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", width: 28 }}
              >
                SERIAL NUMBER
              </th>
              <th
                rowSpan={2}
                className="border border-gray-400 px-2 py-2 text-center font-bold align-middle text-[10px] leading-tight"
                style={{ width: 40 }}
              >
                &nbsp;
              </th>
              <th
                rowSpan={2}
                className="border border-gray-400 px-3 py-2 text-center font-bold align-middle text-[10px]"
              >
                SUBJECTS
              </th>
              <th
                rowSpan={2}
                className="border border-gray-400 px-2 py-2 text-center font-bold align-middle text-[10px] leading-tight"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", width: 32 }}
              >
                CREDIT HOUR
              </th>
              <th
                colSpan={2}
                className="border border-gray-400 px-2 py-1 text-center font-bold text-[10px]"
              >
                OBTAINED<br />GRADE
              </th>
              <th
                rowSpan={2}
                className="border border-gray-400 px-2 py-2 text-center font-bold align-middle text-[10px] leading-tight"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", width: 32 }}
              >
                FINAL GRADE
              </th>
              <th
                rowSpan={2}
                className="border border-gray-400 px-2 py-2 text-center font-bold align-middle text-[10px] leading-tight"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", width: 32 }}
              >
                GRADE POINT
              </th>
              <th
                rowSpan={2}
                className="border border-gray-400 px-2 py-2 text-center font-bold align-middle text-[10px] leading-tight"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", width: 36 }}
              >
                REMARKS
              </th>
            </tr>
            <tr className="border-b-2 border-gray-400 bg-gray-100">
              <th className="border border-gray-400 px-2 py-1 text-center font-bold text-[10px] w-10">TH</th>
              <th className="border border-gray-400 px-2 py-1 text-center font-bold text-[10px] w-10">PR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.serial} className="border-b border-gray-300">
                <td className="border border-gray-300 px-2 py-2 text-center align-middle">
                  {String(row.serial).padStart(2, "0")}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-center align-middle font-semibold text-[10px]">
                  {row.type}
                </td>
                <td className="border border-gray-300 px-3 py-2 align-middle font-semibold tracking-wide">
                  {row.name}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-center align-middle">
                  {row.creditHour}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-center align-middle font-semibold">
                  {row.theoryGrade}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-center align-middle font-semibold">
                  {row.entered ? row.practicalGrade : "—"}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-center align-middle font-bold">
                  {row.finalGrade}
                </td>
                <td className="border border-gray-300 px-2 py-2 text-center align-middle font-semibold">
                  {row.gradePoint !== null ? row.gradePoint.toFixed(2) : "—"}
                </td>
                <td className={`border border-gray-300 px-2 py-2 text-center align-middle font-bold text-[11px] ${row.failing ? "text-red-700" : "text-gray-500"}`}>
                  {row.remark}
                </td>
              </tr>
            ))}
            {/* Padding rows to fill up space like real marksheet */}
            {Array.from({ length: Math.max(0, 10 - rows.length) }).map((_, i) => (
              <tr key={`pad-${i}`} className="border-b border-gray-200">
                <td className="border border-gray-200 px-2 py-3">&nbsp;</td>
                <td className="border border-gray-200 px-2 py-3"></td>
                <td className="border border-gray-200 px-3 py-3"></td>
                <td className="border border-gray-200 px-2 py-3"></td>
                <td className="border border-gray-200 px-2 py-3"></td>
                <td className="border border-gray-200 px-2 py-3"></td>
                <td className="border border-gray-200 px-2 py-3"></td>
                <td className="border border-gray-200 px-2 py-3"></td>
                <td className="border border-gray-200 px-2 py-3"></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-400 bg-gray-50">
              <td
                colSpan={7}
                className="border border-gray-400 px-4 py-3 text-right font-bold tracking-wide text-sm"
              >
                GRADE POINT AVERAGE (GPA):
              </td>
              <td
                colSpan={2}
                className="border border-gray-400 px-3 py-3 text-left font-bold text-sm"
              >
                {overallGpa !== null ? (
                  <span>
                    {overallGpa.toFixed(2)}
                    {overallLetter && (
                      <span className="ml-2 text-xs font-normal">({overallLetter})</span>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="px-3 py-2 text-[9px] text-gray-500">
        Simulated preview — official results published by NEB.
      </p>
    </div>
  );
}
