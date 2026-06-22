/**
 * reducer.ts — `useReducer` reducer and initial state for the calculator island.
 *
 * All state mutations go through this single reducer so every tab always reads
 * from the same subjects array — tab switching never loses data (Requirement 3.2).
 * The `lastComputedGpa` field is re-derived on every grade/marks change so the
 * Eligibility tab always has a fresh value without any extra effect (Req 3.4).
 *
 * No literal grading values appear here; all thresholds come from config
 * (Requirement 2.2).
 */

import {
  COMPULSORY_SUBJECTS,
  DEFAULT_OPTIONAL_CH,
  DEFAULT_OPTIONAL_SPLIT,
  GRADING_SCALE,
  type LetterGrade,
  type RequiredSubjectId,
} from "../../config/gradingScale";
import { computeGpa, type ScoredSubject } from "../../lib/calc";
import type { CalculatorAction, CalculatorState, SubjectRow } from "./CalculatorContext";

// ---------------------------------------------------------------------------
// Initial state helpers
// ---------------------------------------------------------------------------

/**
 * Converts a `SubjectDefinition` from config into a `SubjectRow` with empty
 * grade inputs and null marks (Requirement 11.2 — zero state shows "--").
 */
function subjectDefToRow(
  def: (typeof COMPULSORY_SUBJECTS)[number]
): SubjectRow {
  return {
    id: def.id,
    name: def.name,
    creditHours: def.creditHours,
    splitType: def.splitType,
    theoryMax: def.theoryMax,
    practicalMax: def.practicalMax,
    isCompulsory: def.isCompulsory,
    nameLocked: def.nameLocked,
    theoryGrade: "",
    practicalGrade: "A+", // default per Requirement 9.2
    theoryMarks: null,
    practicalMarks: def.practicalMax, // pre-fill practical to max; user can edit
  };
}

/** Empty required-grades record for the eligibility sub-state. */
function emptyRequiredGrades(): Record<RequiredSubjectId, LetterGrade | ""> {
  return {
    english: "",
    nepali: "",
    socialStudies: "",
    math: "",
    science: "",
  };
}

// ---------------------------------------------------------------------------
// Default optional subjects (pre-populated as Optional I and Optional II)
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONAL_SUBJECTS: SubjectRow[] = [
  {
    id: "optional-i",
    name: "Optional I",
    creditHours: DEFAULT_OPTIONAL_CH,
    splitType: DEFAULT_OPTIONAL_SPLIT.splitType,
    theoryMax: DEFAULT_OPTIONAL_SPLIT.theoryMax,
    practicalMax: DEFAULT_OPTIONAL_SPLIT.practicalMax,
    isCompulsory: false,
    nameLocked: false,
    theoryGrade: "",
    practicalGrade: "A+",
    theoryMarks: null,
    practicalMarks: DEFAULT_OPTIONAL_SPLIT.practicalMax, // pre-fill to max
  },
  {
    id: "optional-ii",
    name: "Optional II",
    creditHours: DEFAULT_OPTIONAL_CH,
    splitType: DEFAULT_OPTIONAL_SPLIT.splitType,
    theoryMax: DEFAULT_OPTIONAL_SPLIT.theoryMax,
    practicalMax: DEFAULT_OPTIONAL_SPLIT.practicalMax,
    isCompulsory: false,
    nameLocked: false,
    theoryGrade: "",
    practicalGrade: "A+",
    theoryMarks: null,
    practicalMarks: DEFAULT_OPTIONAL_SPLIT.practicalMax, // pre-fill to max
  },
];

// ---------------------------------------------------------------------------
// Initial state (Requirement 4.1, 11.2)
// ---------------------------------------------------------------------------

export const initialState: CalculatorState = {
  subjects: [
    ...COMPULSORY_SUBJECTS.map(subjectDefToRow),
    ...DEFAULT_OPTIONAL_SUBJECTS,
  ],
  activeTab: "grade",
  theme: "light",
  lastComputedGpa: null,
  plan: {
    targetGpa: null,
    editPracticals: false,
    message: null,
  },
  eligibility: {
    manualGpa: null,
    requiredGrades: emptyRequiredGrades(),
    result: null,
  },
  errors: {},
};

// ---------------------------------------------------------------------------
// GPA selector
// ---------------------------------------------------------------------------

/**
 * Re-derives `lastComputedGpa` from the current subjects using `computeGpa`.
 *
 * For each subject we use marks-mode values when available; otherwise we
 * synthesise marks from the grade-mode selections by converting the grade's
 * minimum marks for that grade band. If a subject has neither a grade nor marks
 * the row contributes 0 marks (which will produce NG, lowering the GPA).
 *
 * Returns `null` when no compulsory subject has any input (pure zero state).
 */
function deriveLastComputedGpa(subjects: SubjectRow[]): number | null {
  // If every subject has empty grades and null marks, stay null (zero state)
  const anyInput = subjects.some(
    (s) =>
      s.theoryGrade !== "" ||
      s.theoryMarks !== null ||
      s.practicalMarks !== null
  );
  if (!anyInput) return null;

  const scored: ScoredSubject[] = subjects.map((s) => {
    // Prefer marks-mode inputs; fall back to synthesising from grade
    let theoryMarks: number;
    let practicalMarks: number;

    if (s.theoryMarks !== null) {
      theoryMarks = s.theoryMarks;
    } else if (s.theoryGrade !== "") {
      // Use minimum marks for that grade so the grade point is reproduced
      // exactly (same pattern as plan.ts buildScoredSubjects)
      theoryMarks =
        s.theoryGrade === "A+"
          ? s.theoryMax
          : s.theoryGrade === "NG"
          ? 0
          : Math.ceil(
              (getGradeBandMinPercent(s.theoryGrade) * s.theoryMax) / 100
            );
    } else {
      // No input — 0 marks will produce NG, which is the correct zero-state
      theoryMarks = 0;
    }

    if (s.practicalMarks !== null) {
      practicalMarks = s.practicalMarks;
    } else if (s.practicalGrade !== "") {
      practicalMarks =
        s.practicalGrade === "A+"
          ? s.practicalMax
          : s.practicalGrade === "NG"
          ? 0
          : Math.ceil(
              (getGradeBandMinPercent(s.practicalGrade) * s.practicalMax) / 100
            );
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
  });

  return computeGpa(scored).gpa;
}

/** Helper: looks up the minPercent for a given letter grade from the config. */
function getGradeBandMinPercent(grade: LetterGrade): number {
  const band = GRADING_SCALE.find((b) => b.grade === grade);
  return band?.minPercent ?? 0;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction
): CalculatorState {
  switch (action.type) {
    // -----------------------------------------------------------------------
    case "SET_TAB": {
      return { ...state, activeTab: action.tab };
    }

    // -----------------------------------------------------------------------
    case "ADD_OPTIONAL_SUBJECT": {
      const subjects = [...state.subjects, action.subject];
      return {
        ...state,
        subjects,
        lastComputedGpa: deriveLastComputedGpa(subjects),
      };
    }

    // -----------------------------------------------------------------------
    case "REMOVE_SUBJECT": {
      const subjects = state.subjects.filter((s) => s.id !== action.id);
      // Also clear any errors keyed to this subject
      const errors = { ...state.errors };
      Object.keys(errors).forEach((k) => {
        if (k.startsWith(action.id)) delete errors[k];
      });
      return {
        ...state,
        subjects,
        lastComputedGpa: deriveLastComputedGpa(subjects),
        errors,
      };
    }

    // -----------------------------------------------------------------------
    case "RENAME_SUBJECT": {
      const subjects = state.subjects.map((s) =>
        s.id === action.id ? { ...s, name: action.name } : s
      );
      return { ...state, subjects };
    }

    // -----------------------------------------------------------------------
    case "SET_THEORY_GRADE": {
      const subjects = state.subjects.map((s) =>
        s.id === action.id ? { ...s, theoryGrade: action.grade } : s
      );
      return {
        ...state,
        subjects,
        lastComputedGpa: deriveLastComputedGpa(subjects),
      };
    }

    // -----------------------------------------------------------------------
    case "SET_PRACTICAL_GRADE": {
      const subjects = state.subjects.map((s) =>
        s.id === action.id ? { ...s, practicalGrade: action.grade } : s
      );
      return {
        ...state,
        subjects,
        lastComputedGpa: deriveLastComputedGpa(subjects),
      };
    }

    // -----------------------------------------------------------------------
    case "SET_THEORY_MARKS": {
      const subjects = state.subjects.map((s) =>
        s.id === action.id ? { ...s, theoryMarks: action.marks } : s
      );
      return {
        ...state,
        subjects,
        lastComputedGpa: deriveLastComputedGpa(subjects),
      };
    }

    // -----------------------------------------------------------------------
    case "SET_PRACTICAL_MARKS": {
      const subjects = state.subjects.map((s) =>
        s.id === action.id ? { ...s, practicalMarks: action.marks } : s
      );
      return {
        ...state,
        subjects,
        lastComputedGpa: deriveLastComputedGpa(subjects),
      };
    }

    // -----------------------------------------------------------------------
    case "SET_PLAN_TARGET": {
      return {
        ...state,
        plan: { ...state.plan, targetGpa: action.targetGpa },
      };
    }

    // -----------------------------------------------------------------------
    case "TOGGLE_EDIT_PRACTICALS": {
      return {
        ...state,
        plan: {
          ...state.plan,
          editPracticals: !state.plan.editPracticals,
        },
      };
    }

    // -----------------------------------------------------------------------
    case "SET_ELIGIBILITY_GRADE": {
      return {
        ...state,
        eligibility: {
          ...state.eligibility,
          requiredGrades: {
            ...state.eligibility.requiredGrades,
            [action.subjectId]: action.grade,
          },
          // Clear previous result when inputs change
          result: null,
        },
      };
    }

    // -----------------------------------------------------------------------
    case "SET_MANUAL_GPA": {
      return {
        ...state,
        eligibility: {
          ...state.eligibility,
          manualGpa: action.gpa,
          result: null,
        },
      };
    }

    // -----------------------------------------------------------------------
    case "TOGGLE_THEME": {
      const theme = state.theme === "light" ? "dark" : "light";
      // Apply the class to <html> for Tailwind's class-based dark mode
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", theme === "dark");
        try {
          localStorage.setItem("see-theme", theme);
        } catch {
          // Storage unavailable — ignore
        }
      }
      return { ...state, theme };
    }

    // -----------------------------------------------------------------------
    case "CLEAR_ERROR": {
      const errors = { ...state.errors };
      delete errors[action.key];
      return { ...state, errors };
    }

    // -----------------------------------------------------------------------
    case "SET_ERROR": {
      return {
        ...state,
        errors: { ...state.errors, [action.key]: action.message },
      };
    }

    // -----------------------------------------------------------------------
    case "RESET": {
      return {
        ...initialState,
        activeTab: state.activeTab,
        theme: state.theme,
      };
    }

    // -----------------------------------------------------------------------
    default: {
      // Exhaustive check: TypeScript will warn if a case is missing
      const _exhaustive: never = action;
      return state;
    }
  }
}
