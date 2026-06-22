/**
 * GradeMode.tsx — Grade Mode tab panel.
 *
 * Layout:
 *   1. Subject table
 *   2. Single action row: Calculate GPA | Generate Marksheet | Reset
 *   3. GPA result card (shown after Calculate GPA)
 *   4. Marksheet preview + PDF download
 */

import { useContext, useRef, useState } from "react";
import { CalculatorContext } from "./CalculatorContext";
import SubjectTable from "./SubjectTable";
import MarksheetPreview from "./MarksheetPreview";
import { GRADING_SCALE, gpaToLetter } from "../../config/gradingScale";
import { subjectGradePoint } from "../../lib/calc";
import type { LetterGrade } from "../../config/gradingScale";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function gradeToGp(grade: LetterGrade | ""): number {
  if (!grade) return 0;
  return GRADING_SCALE.find((b) => b.grade === grade)?.gradePoint ?? 0;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GradeMode() {
  const { state, dispatch } = useContext(CalculatorContext);
  const { subjects } = state;

  const [gpaResult, setGpaResult] = useState<{
    gpa: number;
    letter: LetterGrade;
    anyNg: boolean;
  } | null>(null);
  const [showMarksheet, setShowMarksheet] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement | null>(null);

  // -------------------------------------------------------------------------
  // Calculate GPA
  // -------------------------------------------------------------------------

  function handleCalculate() {
    const gradedSubjects = subjects.filter((s) => s.theoryGrade !== "");
    if (gradedSubjects.length === 0) return;

    const totalWeightedGp = gradedSubjects.reduce((sum, s) => {
      const thGp = gradeToGp(s.theoryGrade);
      const prGp = gradeToGp((s.practicalGrade || "A+") as LetterGrade);
      return sum + subjectGradePoint(thGp, prGp, s.splitType) * s.creditHours;
    }, 0);
    const totalCh = gradedSubjects.reduce((sum, s) => sum + s.creditHours, 0);
    const gpa = totalCh > 0 ? totalWeightedGp / totalCh : 0;
    const letter = gpaToLetter(gpa);
    const anyNg = gradedSubjects.some(
      (s) => s.theoryGrade === "NG" || s.practicalGrade === "NG"
    );
    setGpaResult({ gpa, letter, anyNg });
  }

  // -------------------------------------------------------------------------
  // PDF export — draws the table directly with jsPDF (no html2canvas)
  // -------------------------------------------------------------------------

  async function handleDownloadPdf() {
    setExportError(null);
    setPdfLoading(true);
    try {
      // jsPDF 4.x: default export is the module object, jsPDF is a named export
      const jsPDFModule = await import("jspdf");
      const JsPDF = jsPDFModule.jsPDF ?? jsPDFModule.default;

      const doc = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      // Page dimensions
      const pageW = doc.internal.pageSize.getWidth();
      const marginL = 10;
      const marginR = 10;
      const tableW = pageW - marginL - marginR;

      // --- Title ---
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("SEE Grade Sheet (Simulated)", pageW / 2, 14, { align: "center" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("National Examinations Board — Secondary Education Examination", pageW / 2, 19, { align: "center" });

      // --- Column definitions ---
      const cols = [
        { header: "S.N.", key: "serial",      w: 10 },
        { header: "",     key: "type",        w: 12 },
        { header: "SUBJECTS",key: "name",     w: 60 },
        { header: "CH",   key: "ch",          w: 10 },
        { header: "TH",   key: "th",          w: 14 },
        { header: "PR",   key: "pr",          w: 14 },
        { header: "FINAL",key: "final",       w: 14 },
        { header: "GP",   key: "gp",          w: 14 },
        { header: "REMARKS",key: "remark",    w: tableW - 10 - 12 - 60 - 10 - 14 - 14 - 14 - 14 },
      ];

      const startX = marginL;
      let y = 25;
      const rowH = 7;
      const headerH = 10;

      // Draw header background
      doc.setFillColor(235, 235, 235);
      doc.rect(startX, y, tableW, headerH, "F");

      // Header borders + text
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      let cx = startX;
      for (const col of cols) {
        doc.rect(cx, y, col.w, headerH);
        // "OBTAINED GRADE" spanning TH+PR
        if (col.key === "th") {
          // draw "OBTAINED GRADE" above TH+PR
          doc.setFontSize(6);
          doc.text("OBTAINED GRADE", cx + col.w - 1, y + 3.5, { align: "center" });
          doc.setFontSize(7);
          doc.text(col.header, cx + col.w / 2, y + 7.5, { align: "center" });
        } else if (col.key === "pr") {
          doc.setFontSize(7);
          doc.text(col.header, cx + col.w / 2, y + 7.5, { align: "center" });
        } else {
          doc.text(col.header, cx + col.w / 2, y + headerH / 2 + 1, { align: "center" });
        }
        cx += col.w;
      }
      y += headerH;

      // --- Data rows ---
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      for (let i = 0; i < subjects.length; i++) {
        const s = subjects[i];
        const thGp = gradeToGp(s.theoryGrade);
        const prGp = gradeToGp((s.practicalGrade || "A+") as LetterGrade);
        const subjectGp = s.theoryGrade
          ? subjectGradePoint(thGp, prGp, s.splitType)
          : null;
        const finalGrade = subjectGp !== null ? gpaToLetter(subjectGp) : "—";
        const failing =
          s.theoryGrade === "NG" || (s.theoryGrade !== "" && s.practicalGrade === "NG");
        const remarkDesc = s.theoryGrade
          ? (GRADING_SCALE.find((b) => b.grade === finalGrade)?.description ?? "")
          : "";

        const cells = [
          String(i + 1).padStart(2, "0"),
          s.isCompulsory ? "COMP." : "OPT.",
          s.name.toUpperCase(),
          String(s.creditHours),
          s.theoryGrade || "—",
          s.theoryGrade ? (s.practicalGrade || "A+") : "—",
          s.theoryGrade ? finalGrade : "—",
          subjectGp !== null ? subjectGp.toFixed(2) : "—",
          remarkDesc,
        ];

        // Alternating row bg
        if (i % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(startX, y, tableW, rowH, "F");
        }

        cx = startX;
        for (let c = 0; c < cols.length; c++) {
          const col = cols[c];
          doc.rect(cx, y, col.w, rowH);
          const align = c === 2 ? "left" : "center";
          const textX = c === 2 ? cx + 2 : cx + col.w / 2;
          if (failing && (c === 4 || c === 8)) {
            doc.setTextColor(180, 0, 0);
          } else {
            doc.setTextColor(0, 0, 0);
          }
          doc.text(cells[c], textX, y + rowH / 2 + 1.5, { align });
          cx += col.w;
        }
        doc.setTextColor(0, 0, 0);
        y += rowH;
      }

      // Padding rows (up to 10 total)
      doc.setFontSize(7);
      for (let i = subjects.length; i < 10; i++) {
        if (i % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(startX, y, tableW, rowH, "F");
        }
        cx = startX;
        for (const col of cols) {
          doc.rect(cx, y, col.w, rowH);
          cx += col.w;
        }
        y += rowH;
      }

      // --- GPA footer row ---
      const gradedSubjects = subjects.filter((s) => s.theoryGrade !== "");
      let overallGpa = 0;
      let overallLetter: LetterGrade = "NG";
      if (gradedSubjects.length > 0) {
        const twGp = gradedSubjects.reduce((sum, s) => {
          const thGp = gradeToGp(s.theoryGrade);
          const prGp = gradeToGp((s.practicalGrade || "A+") as LetterGrade);
          return sum + subjectGradePoint(thGp, prGp, s.splitType) * s.creditHours;
        }, 0);
        const tCh = gradedSubjects.reduce((sum, s) => sum + s.creditHours, 0);
        overallGpa = tCh > 0 ? twGp / tCh : 0;
        overallLetter = gpaToLetter(overallGpa);
      }

      doc.setFillColor(235, 235, 235);
      doc.rect(startX, y, tableW, rowH + 2, "F");
      doc.rect(startX, y, tableW, rowH + 2);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const footerLabel = "GRADE POINT AVERAGE (GPA):";
      const footerW = cols.slice(0, 7).reduce((s, c) => s + c.w, 0);
      doc.text(footerLabel, startX + footerW - 2, y + (rowH + 2) / 2 + 1.5, { align: "right" });
      doc.text(
        `${overallGpa.toFixed(2)}  (${overallLetter})`,
        startX + footerW + 2,
        y + (rowH + 2) / 2 + 1.5,
        { align: "left" }
      );

      y += rowH + 2 + 6;
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(120, 120, 120);
      doc.text(
        "Simulated preview based on entered data. Official results are published by NEB.",
        pageW / 2,
        y,
        { align: "center" }
      );

      doc.save("see-marksheet.pdf");
    } catch (err) {
      console.error("PDF export error:", err);
      setExportError("PDF export failed. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const hasAnyGrade = subjects.some((s) => s.theoryGrade !== "");

  return (
    <div className="space-y-3">
      {/* 1. Subject table */}
      <SubjectTable mode="grade" />

      {/* 2. Single action row: Calculate GPA | Generate Marksheet | Reset */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleCalculate}
          disabled={!hasAnyGrade}
          className="rounded-lg bg-[#1a9c5b] hover:bg-[#168a50] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a9c5b]"
        >
          Calculate GPA
        </button>

        <button
          onClick={() => {
            setShowMarksheet((v) => !v);
            setExportError(null);
          }}
          disabled={!hasAnyGrade}
          className="rounded-lg border border-[#1a9c5b] text-[#1a9c5b] hover:bg-[#1a9c5b] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed font-semibold px-4 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a9c5b]"
        >
          {showMarksheet ? "Hide Marksheet" : "Generate Marksheet"}
        </button>

        <button
          onClick={() => {
            dispatch({ type: "RESET" });
            setGpaResult(null);
            setShowMarksheet(false);
            setExportError(null);
          }}
          className="ml-auto rounded-lg border border-hairline px-4 py-2 text-sm text-mute hover:text-error hover:border-error transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
        >
          Reset
        </button>
      </div>

      {/* 3. GPA Result */}
      {gpaResult && (
        <div className="rounded-xl border border-hairline bg-canvas-soft px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-mute uppercase tracking-wide mb-1">
                Grade Point Average
              </p>
              <p className="text-3xl font-bold text-ink">
                {gpaResult.gpa.toFixed(2)}
                <span className="ml-2 text-xl font-semibold text-body">
                  ({gpaResult.letter})
                </span>
              </p>
            </div>
            {gpaResult.anyNg && (
              <span className="rounded-full bg-error-soft text-error text-xs font-semibold px-3 py-1">
                NG / Not Passed
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4. Marksheet preview + PDF download */}
      {showMarksheet && (
        <div className="space-y-3">
          <MarksheetPreview previewRef={previewRef} />

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="inline-flex items-center gap-1.5 rounded border border-hairline px-3 py-1.5 text-xs font-medium text-body hover:text-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
            >
              {pdfLoading ? (
                <span className="animate-pulse">Generating…</span>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF
                </>
              )}
            </button>
            {exportError && (
              <p role="alert" className="text-xs text-error">
                {exportError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
