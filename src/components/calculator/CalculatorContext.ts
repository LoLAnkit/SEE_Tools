/**
 * CalculatorContext.ts — React Context for the SEE GPA Calculator island.
 *
 * Exports the context, all shared state types, and the full action union so
 * every child component can dispatch actions and read state without prop-drilling
 * (Requirements 3.2, 3.3, 3.4).
 */

import { createContext } from "react";
import type { LetterGrade, RequiredSubjectId, SplitType } from "../../config/gradingScale";
import type { EligibilityResult } from "../../lib/eligibility";

// ---------------------------------------------------------------------------
// Re-export utility types needed by consumers
// ---------------------------------------------------------------------------

export type { LetterGrade, RequiredSubjectId, SplitType };

// ---------------------------------------------------------------------------
// SubjectRow (Requirement 4.1, 4.2, 5.6, 11.2)
// ---------------------------------------------------------------------------

/**
 * A single row in the subjects table, shared across Grade, Marks, and Plan
 * tabs (Requirement 3.2). Carries both grade-mode and marks-mode inputs so
 * switching tabs never loses data.
 */
export interface SubjectRow {
  id: string;
  name: string;
  creditHours: number;
  splitType: SplitType;
  theoryMax: number;
  practicalMax: number;
  isCompulsory: boolean;
  nameLocked: boolean;
  // Grade mode inputs (letter selections; "" = unselected "--")
  theoryGrade: LetterGrade | "";
  practicalGrade: LetterGrade | ""; // defaults to "A+" on creation (Req 9.2)
  // Marks mode inputs (raw marks or null = not entered)
  theoryMarks: number | null;
  practicalMarks: number | null;
}

// ---------------------------------------------------------------------------
// Tab (Requirement 3.1)
// ---------------------------------------------------------------------------

export type Tab = "grade" | "marks" | "plan" | "eligibility";

// ---------------------------------------------------------------------------
// CalculatorState (Requirement 3.2, 3.3, 3.4, 11.2)
// ---------------------------------------------------------------------------

export interface CalculatorState {
  /** Subjects shared across Grade, Marks, and Plan tabs (Req 3.2). */
  subjects: SubjectRow[];
  activeTab: Tab;
  theme: "light" | "dark";
  /**
   * Most recently computed GPA — null until at least one valid computation.
   * Auto-fed to the Eligibility tab (Requirement 3.4, 15.1).
   */
  lastComputedGpa: number | null;
  plan: {
    targetGpa: number | null;
    editPracticals: boolean;
    message: string | null;
  };
  eligibility: {
    manualGpa: number | null;
    requiredGrades: Record<RequiredSubjectId, LetterGrade | "">;
    result: EligibilityResult | null;
  };
  /** Field-keyed inline error messages (Requirement 10.2, 13.6, 15.10). */
  errors: Record<string, string>;
}

// ---------------------------------------------------------------------------
// CalculatorAction union
// ---------------------------------------------------------------------------

export type CalculatorAction =
  | { type: "SET_TAB"; tab: Tab }
  | {
      type: "ADD_OPTIONAL_SUBJECT";
      subject: SubjectRow;
    }
  | { type: "REMOVE_SUBJECT"; id: string }
  | { type: "RENAME_SUBJECT"; id: string; name: string }
  | { type: "SET_THEORY_GRADE"; id: string; grade: LetterGrade | "" }
  | { type: "SET_PRACTICAL_GRADE"; id: string; grade: LetterGrade | "" }
  | { type: "SET_THEORY_MARKS"; id: string; marks: number | null }
  | { type: "SET_PRACTICAL_MARKS"; id: string; marks: number | null }
  | { type: "SET_PLAN_TARGET"; targetGpa: number | null }
  | { type: "TOGGLE_EDIT_PRACTICALS" }
  | {
      type: "SET_ELIGIBILITY_GRADE";
      subjectId: RequiredSubjectId;
      grade: LetterGrade | "";
    }
  | { type: "SET_MANUAL_GPA"; gpa: number | null }
  | { type: "TOGGLE_THEME" }
  | { type: "CLEAR_ERROR"; key: string }
  | { type: "SET_ERROR"; key: string; message: string }
  | { type: "RESET" };

// ---------------------------------------------------------------------------
// Context default value
// ---------------------------------------------------------------------------

/**
 * A no-op context default — components must always be rendered inside
 * `CalculatorContext.Provider`. The default is typed correctly so TypeScript
 * doesn't need non-null assertions at call sites.
 */
export const CalculatorContext = createContext<{
  state: CalculatorState;
  dispatch: React.Dispatch<CalculatorAction>;
}>({
  state: {} as CalculatorState,
  dispatch: () => undefined,
});
