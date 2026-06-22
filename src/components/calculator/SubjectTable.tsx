/**
 * SubjectTable.tsx — Subject rows table for Grade Mode and Marks Mode.
 *
 * Grade mode columns: Subject, Theory, Practical, Final, CH
 * Marks mode columns: Subject, CH, Theory, Practical, Final Grade, Grade Point, Remark, Actions
 *
 * Optional subjects (Optional I / II) are pre-populated and their names are
 * inline-editable by clicking on the name text — no dropdown or Add button.
 * Additional optional subjects can still be added via the "+ Add" row.
 */

import React, { useContext, useRef, useState, useEffect } from "react";
import { CalculatorContext } from "./CalculatorContext";
import GradeSelect from "./GradeSelect";
import MarksInput from "./MarksInput";
import {
  OPTIONAL_I_CHOICES,
  OPTIONAL_II_CHOICES,
  DEFAULT_OPTIONAL_CH,
  OPTIONAL_SUBJECT_SPLITS,
  DEFAULT_OPTIONAL_SPLIT,
  GRADING_SCALE,
} from "../../config/gradingScale";
import { gradeComponentFromMarks, subjectGradePoint } from "../../lib/calc";
import type { LetterGrade } from "../../config/gradingScale";
import type { SubjectRow } from "./CalculatorContext";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SubjectTableProps {
  /** "grade" — show grade dropdowns; "marks" — show numeric inputs */
  mode: "grade" | "marks";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtGp(gp: number): string {
  return gp.toFixed(2);
}

function deriveSubjectDisplay(
  row: SubjectRow,
  mode: "grade" | "marks"
): { finalGrade: string; gradePoint: string; remark: string; failing: boolean } {
  if (mode === "grade") {
    if (row.theoryGrade === "") {
      return { finalGrade: "—", gradePoint: "—", remark: "—", failing: false };
    }
    const theoryBand = GRADING_SCALE.find((b) => b.grade === row.theoryGrade);
    const practicalBand = GRADING_SCALE.find(
      (b) => b.grade === (row.practicalGrade || "A+")
    );
    const theoryGp = theoryBand?.gradePoint ?? 0;
    const practicalGp = practicalBand?.gradePoint ?? 4.0;
    const subjectGp = subjectGradePoint(theoryGp, practicalGp, row.splitType);
    const finalBand = GRADING_SCALE.slice()
      .sort((a, b) => b.gradePoint - a.gradePoint)
      .find((b) => subjectGp >= b.gradePoint - 1e-9);
    const finalGrade = finalBand?.grade ?? "NG";
    const failing = row.theoryGrade === "NG" || row.practicalGrade === "NG";
    return {
      finalGrade,
      gradePoint: fmtGp(subjectGp),
      remark: failing ? "Not Passed" : "Passed",
      failing,
    };
  }

  const theoryMarks = row.theoryMarks;
  const practicalMarks = row.practicalMarks;
  if (theoryMarks === null && practicalMarks === null) {
    return { finalGrade: "—", gradePoint: "—", remark: "—", failing: false };
  }
  const tMarks = theoryMarks ?? 0;
  const pMarks = practicalMarks ?? 0;
  const theoryResult = gradeComponentFromMarks(tMarks, row.theoryMax, row.splitType, true);
  const practicalResult = gradeComponentFromMarks(pMarks, row.practicalMax, row.splitType, false);
  const subjectGp = subjectGradePoint(theoryResult.gradePoint, practicalResult.gradePoint, row.splitType);
  const finalBand = GRADING_SCALE.slice()
    .sort((a, b) => b.gradePoint - a.gradePoint)
    .find((b) => subjectGp >= b.gradePoint - 1e-9);
  const finalGrade = finalBand?.grade ?? "NG";
  const failing = theoryResult.isFailing || practicalResult.isFailing;
  // Use the official description from the grading scale band
  const remark = failing
    ? GRADING_SCALE.find((b) => b.grade === "NG")?.description ?? "Not Graded"
    : finalBand?.description ?? "—";
  return {
    finalGrade,
    gradePoint: fmtGp(subjectGp),
    remark,
    failing,
  };
}

// ---------------------------------------------------------------------------
// AddOptionalSubjectRow
// ---------------------------------------------------------------------------

let _nextOptionalId = 100;
function nextOptionalId(): string {
  return `optional-${_nextOptionalId++}`;
}

function AddOptionalRow() {
  const { dispatch } = useContext(CalculatorContext);
  const [expanded, setExpanded] = useState(false);
  const [selectedName, setSelectedName] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [nameError, setNameError] = useState<string>("");

  const allChoices = [
    ...OPTIONAL_I_CHOICES.map((c) => ({ label: c, value: c })),
    ...OPTIONAL_II_CHOICES.map((c) => ({ label: c, value: c })),
    { label: "Custom…", value: "__custom__" },
  ];

  function handleAdd() {
    const finalName =
      selectedName === "__custom__" ? customName.trim() : selectedName.trim();
    if (!finalName) {
      setNameError("Please select or enter a subject name.");
      return;
    }
    const splitConfig = OPTIONAL_SUBJECT_SPLITS[finalName] ?? DEFAULT_OPTIONAL_SPLIT;
    const newRow: SubjectRow = {
      id: nextOptionalId(),
      name: finalName,
      creditHours: DEFAULT_OPTIONAL_CH,
      splitType: splitConfig.splitType,
      theoryMax: splitConfig.theoryMax,
      practicalMax: splitConfig.practicalMax,
      isCompulsory: false,
      nameLocked: false,
      theoryGrade: "",
      practicalGrade: "A+",
      theoryMarks: null,
      practicalMarks: splitConfig.practicalMax, // pre-fill practical to max
    };
    dispatch({ type: "ADD_OPTIONAL_SUBJECT", subject: newRow });
    setExpanded(false);
    setSelectedName("");
    setCustomName("");
    setNameError("");
  }

  if (!expanded) {
    return (
      <tr>
        <td colSpan={6} className="px-4 py-2">
          <button
            onClick={() => setExpanded(true)}
            className="text-sm font-medium text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
            aria-label="Add optional subject"
          >
            + Add Optional Subject
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-canvas-soft">
      <td colSpan={6} className="px-4 py-3">
        <div className="flex flex-wrap items-start gap-2">
          <select
            value={selectedName}
            onChange={(e) => {
              setSelectedName(e.target.value);
              setNameError("");
            }}
            className="rounded-sm border border-hairline bg-canvas px-2 py-1 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            aria-label="Choose optional subject"
          >
            <option value="">— Select subject —</option>
            {allChoices.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {selectedName === "__custom__" && (
            <input
              type="text"
              value={customName}
              onChange={(e) => {
                setCustomName(e.target.value);
                setNameError("");
              }}
              placeholder="Subject name"
              className="rounded-sm border border-hairline bg-canvas px-2 py-1 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand w-44"
              aria-label="Custom subject name"
            />
          )}

          <button
            onClick={handleAdd}
            className="rounded-sm bg-brand px-3 py-1 text-sm font-medium text-on-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Add
          </button>
          <button
            onClick={() => {
              setExpanded(false);
              setSelectedName("");
              setCustomName("");
              setNameError("");
            }}
            className="rounded-sm border border-hairline px-3 py-1 text-sm text-body hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Cancel
          </button>

          {nameError && (
            <p role="alert" className="w-full text-xs text-error">
              {nameError}
            </p>
          )}
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// InlineNameCell — click-to-edit name for optional subjects
// ---------------------------------------------------------------------------

interface InlineNameCellProps {
  row: SubjectRow;
}

function InlineNameCell({ row }: InlineNameCellProps) {
  const { dispatch } = useContext(CalculatorContext);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== row.name) {
      dispatch({ type: "RENAME_SUBJECT", id: row.id, name: trimmed });
    } else {
      setDraft(row.name);
    }
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") {
      setDraft(row.name);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="w-full rounded border border-brand bg-canvas px-2 py-0.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
        aria-label={`Rename subject ${row.name}`}
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(row.name);
        setEditing(true);
      }}
      title="Click to rename"
      className="group flex items-center gap-1 text-left text-sm font-medium text-ink hover:text-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
    >
      <span>{row.name}</span>
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
        className="opacity-0 group-hover:opacity-60 transition-opacity"
        aria-hidden="true"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// SubjectRowCmp — Grade mode
// ---------------------------------------------------------------------------

interface SubjectRowCmpProps {
  row: SubjectRow;
  mode: "grade" | "marks";
}

function SubjectRowGrade({ row }: { row: SubjectRow }) {
  const { dispatch } = useContext(CalculatorContext);
  const display = deriveSubjectDisplay(row, "grade");

  return (
    <tr className="border-b border-hairline last:border-b-0 hover:bg-canvas-soft transition-colors">
      {/* Subject name */}
      <td className="px-4 py-3">
        {row.nameLocked ? (
          <span className="text-sm font-medium text-ink">{row.name}</span>
        ) : (
          <InlineNameCell row={row} />
        )}
      </td>

      {/* Theory */}
      <td className="px-4 py-3">
        <GradeSelect
          value={row.theoryGrade}
          onChange={(g) =>
            dispatch({ type: "SET_THEORY_GRADE", id: row.id, grade: g })
          }
          id={`theory-grade-${row.id}`}
          label={`Theory grade for ${row.name}`}
        />
      </td>

      {/* Practical */}
      <td className="px-4 py-3">
        <GradeSelect
          value={row.practicalGrade || "A+"}
          onChange={(g) =>
            dispatch({ type: "SET_PRACTICAL_GRADE", id: row.id, grade: g })
          }
          id={`practical-grade-${row.id}`}
          label={`Practical grade for ${row.name}`}
        />
      </td>

      {/* Final Grade */}
      <td className="px-4 py-3 text-center">
        <span
          className={[
            "inline-block rounded px-2 py-0.5 text-sm font-semibold",
            display.failing
              ? "bg-error-soft text-error"
              : display.finalGrade === "—"
              ? "text-mute"
              : "text-ink",
          ].join(" ")}
        >
          {display.finalGrade}
        </span>
      </td>

      {/* CH */}
      <td className="px-4 py-3 text-sm text-body text-center">{row.creditHours}</td>

      {/* Delete (optional only) */}
      <td className="px-4 py-3 text-center">
        {!row.isCompulsory ? (
          <button
            onClick={() => dispatch({ type: "REMOVE_SUBJECT", id: row.id })}
            aria-label={`Remove ${row.name}`}
            className="rounded p-1 text-mute hover:text-error hover:bg-error-soft transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M8 6V4h8v2" />
            </svg>
          </button>
        ) : (
          <span className="text-mute text-xs select-none">—</span>
        )}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// SubjectRowCmp — Marks mode
// ---------------------------------------------------------------------------

function SubjectRowMarks({ row }: { row: SubjectRow }) {
  const { dispatch } = useContext(CalculatorContext);
  const display = deriveSubjectDisplay(row, "marks");

  return (
    <tr className="border-b border-hairline last:border-b-0 hover:bg-canvas-soft transition-colors">
      {/* Subject name */}
      <td className="px-4 py-3 text-sm font-medium text-ink">
        {row.nameLocked ? (
          <span>{row.name}</span>
        ) : (
          <InlineNameCell row={row} />
        )}
      </td>

      {/* CH */}
      <td className="px-4 py-3 text-sm text-body text-center">{row.creditHours}</td>

      {/* Theory */}
      <td className="px-4 py-3">
        <MarksInput
          value={row.theoryMarks}
          onChange={(m) =>
            dispatch({ type: "SET_THEORY_MARKS", id: row.id, marks: m })
          }
          max={row.theoryMax}
          splitType={row.splitType}
          isTheory={true}
          id={`theory-marks-${row.id}`}
          label={`Theory marks for ${row.name} (max ${row.theoryMax})`}
        />
      </td>

      {/* Practical */}
      <td className="px-4 py-3">
        <MarksInput
          value={row.practicalMarks}
          onChange={(m) =>
            dispatch({ type: "SET_PRACTICAL_MARKS", id: row.id, marks: m })
          }
          max={row.practicalMax}
          splitType={row.splitType}
          isTheory={false}
          id={`practical-marks-${row.id}`}
          label={`Practical marks for ${row.name} (max ${row.practicalMax})`}
        />
      </td>

      {/* Final Grade */}
      <td className="px-4 py-3 text-center">
        <span
          className={[
            "inline-block rounded px-2 py-0.5 text-sm font-semibold",
            display.failing
              ? "bg-error-soft text-error"
              : display.finalGrade === "—"
              ? "text-mute"
              : "text-ink",
          ].join(" ")}
        >
          {display.finalGrade}
        </span>
      </td>

      {/* Grade Point */}
      <td className="px-4 py-3 text-sm text-center font-mono text-body">
        {display.gradePoint}
      </td>

      {/* Remark */}
      <td className="px-4 py-3 text-sm text-center">
        {display.remark === "—" ? (
          <span className="text-mute">—</span>
        ) : (
          <span className="text-ink">{display.remark}</span>
        )}
      </td>

      {/* Delete */}
      <td className="px-4 py-3 text-center">
        {!row.isCompulsory ? (
          <button
            onClick={() => dispatch({ type: "REMOVE_SUBJECT", id: row.id })}
            aria-label={`Remove ${row.name}`}
            className="rounded p-1 text-mute hover:text-error hover:bg-error-soft transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M8 6V4h8v2" />
            </svg>
          </button>
        ) : (
          <span className="text-mute text-xs select-none">—</span>
        )}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// SubjectTable
// ---------------------------------------------------------------------------

export default function SubjectTable({ mode }: SubjectTableProps) {
  const { state } = useContext(CalculatorContext);
  const { subjects } = state;

  if (mode === "grade") {
    return (
      <div className="overflow-x-auto rounded-md border border-hairline">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Grade mode subject table</caption>
          <thead>
            <tr className="border-b border-hairline bg-canvas-soft">
              <th scope="col" className="px-4 py-3 font-semibold text-ink">Subject</th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink">Theory</th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink">Practical</th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink text-center">Final</th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink text-center">CH</th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink text-center">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((row) => (
              <SubjectRowGrade key={row.id} row={row} />
            ))}
            <AddOptionalRow />
          </tbody>
        </table>
      </div>
    );
  }

  // Marks mode — full columns
  return (
    <div className="overflow-x-auto rounded-md border border-hairline">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">Marks mode subject table</caption>
        <thead>
          <tr className="border-b border-hairline bg-canvas-soft">
            <th scope="col" className="px-4 py-3 font-semibold text-ink">Subject</th>
            <th scope="col" className="px-4 py-3 font-semibold text-ink text-center">CH</th>
            <th scope="col" className="px-4 py-3 font-semibold text-ink">
              Theory {`(/${subjects[0]?.theoryMax ?? 75})`}
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-ink">
              Practical {`(/${subjects[0]?.practicalMax ?? 25})`}
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-ink text-center">Final Grade</th>
            <th scope="col" className="px-4 py-3 font-semibold text-ink text-center">Grade Point</th>
            <th scope="col" className="px-4 py-3 font-semibold text-ink text-center">Remark</th>
            <th scope="col" className="px-4 py-3 font-semibold text-ink text-center">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((row) => (
            <SubjectRowMarks key={row.id} row={row} />
          ))}
          <AddOptionalRow />
        </tbody>
      </table>
    </div>
  );
}
