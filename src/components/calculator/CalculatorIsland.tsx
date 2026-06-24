/**
 * CalculatorIsland.tsx — The single React island for the SEE GPA Calculator.
 *
 * Nav bar layout:
 *   [theme toggle]   [unified 4-tab pill — centered]   [spacer]
 *
 * All four tabs (Grades, Marks, Plan, +2 Eligibility) live in a single
 * pill-style toggle group so the active indicator is seamless across all tabs.
 */

import { useReducer } from "react";
import { CalculatorContext } from "./CalculatorContext";
import { calculatorReducer, initialState } from "./reducer";
import InstructionLine from "./InstructionLine";
import GradeMode from "./GradeMode";
import MarksMode from "./MarksMode";
import PlanMode from "./PlanMode";
import EligibilityChecker from "./EligibilityChecker";
import type { Tab } from "./CalculatorContext";

// ---------------------------------------------------------------------------
// Tab metadata
// ---------------------------------------------------------------------------

const TABS: { id: Tab; label: string }[] = [
  { id: "grade",       label: "Grades"        },
  { id: "marks",       label: "Marks"         },
  { id: "plan",        label: "Plan"          },
  { id: "eligibility", label: "+2 Eligibility" },
];

// ---------------------------------------------------------------------------
// UnifiedTabPill — single pill group for all 4 tabs
// ---------------------------------------------------------------------------

function UnifiedTabPill({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Calculator mode"
      className="inline-flex items-center rounded-full bg-[#e8eaed] dark:bg-canvas-soft p-1 gap-0.5"
    >
      {TABS.map(({ id, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            role="tab"
            id={`tab-${id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(id)}
            className={[
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-all whitespace-nowrap",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1",
              isActive
                ? "bg-white dark:bg-canvas shadow-sm text-ink"
                : "text-[#6b7280] dark:text-mute hover:text-ink",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CalculatorIsland
// ---------------------------------------------------------------------------

export default function CalculatorIsland() {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);
  const { activeTab } = state;

  return (
    <CalculatorContext.Provider value={{ state, dispatch }}>
      <div className="rounded-md border border-hairline bg-canvas shadow-sm overflow-hidden">

        {/* Nav bar: theme toggle left, pill center, mirrored spacer right */}
        <div className="relative flex items-center bg-canvas px-4 py-2">
          {/* Left — spacer to balance the pill centering */}
          <div className="flex items-center" style={{ width: 35 }} aria-hidden="true" />

          {/* Center — unified pill */}
          <div className="absolute inset-x-0 flex justify-center pointer-events-none">
            <div className="pointer-events-auto">
              <UnifiedTabPill
                active={activeTab}
                onChange={(t) => dispatch({ type: "SET_TAB", tab: t })}
              />
            </div>
          </div>

          {/* Right — mirror spacer to keep pill truly centered */}
          <div className="ml-auto flex items-center" style={{ width: 35 }} aria-hidden="true" />
        </div>

        {/* Tab panels */}
        {(["grade", "marks", "plan", "eligibility"] as Tab[]).map((tab) => (
          <div
            key={tab}
            role="tabpanel"
            id={`tabpanel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            hidden={tab !== activeTab}
            className="px-4 py-4 space-y-3"
          >
            {(tab === "grade" || tab === "marks") && <InstructionLine />}
            {tab === "grade"       && <GradeMode />}
            {tab === "marks"       && <MarksMode />}
            {tab === "plan"        && <PlanMode />}
            {tab === "eligibility" && <EligibilityChecker />}
          </div>
        ))}

      </div>
    </CalculatorContext.Provider>
  );
}
