/**
 * TabNav.tsx — ARIA tablist with roving focus for the four calculator methods.
 *
 * Renders four tabs: "Grade", "Marks", "Plan", "+2 Eligibility".
 * Implements the ARIA tablist pattern (Requirement 20.2, 3.1):
 *   - role="tablist" on the container
 *   - role="tab" + aria-selected on each tab button
 *   - Roving tabindex: tabIndex={0} for active tab, tabIndex={-1} for inactive
 *   - Left/right arrow key navigation (Requirement 20.2)
 *   - Dispatches { type: "SET_TAB" } to CalculatorContext (Requirement 3.5)
 */

import React, { useContext, useRef, useCallback } from "react";
import { CalculatorContext } from "./CalculatorContext";
import type { Tab } from "./CalculatorContext";

// ---------------------------------------------------------------------------
// Tab metadata
// ---------------------------------------------------------------------------

const TABS: { id: Tab; label: string }[] = [
  { id: "grade", label: "Grade" },
  { id: "marks", label: "Marks" },
  { id: "plan", label: "Plan" },
  { id: "eligibility", label: "+2 Eligibility" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TabNav() {
  const { state, dispatch } = useContext(CalculatorContext);
  const { activeTab } = state;

  // Refs for each tab button so we can focus on arrow key navigation
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = TABS.findIndex((t) => t.id === activeTab);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      let nextIndex: number | null = null;

      if (e.key === "ArrowRight") {
        nextIndex = (index + 1) % TABS.length;
      } else if (e.key === "ArrowLeft") {
        nextIndex = (index - 1 + TABS.length) % TABS.length;
      } else if (e.key === "Home") {
        nextIndex = 0;
      } else if (e.key === "End") {
        nextIndex = TABS.length - 1;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        const nextTab = TABS[nextIndex];
        dispatch({ type: "SET_TAB", tab: nextTab.id });
        // Move focus to the newly active tab button
        tabRefs.current[nextIndex]?.focus();
      }
    },
    [dispatch]
  );

  return (
    <div
      role="tablist"
      aria-label="Calculator methods"
      className="flex border-b border-hairline bg-canvas"
    >
      {TABS.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => dispatch({ type: "SET_TAB", tab: tab.id })}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={[
              "px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
              isActive
                ? "border-b-2 border-brand text-ink"
                : "text-body hover:text-ink hover:bg-canvas-soft-2",
            ].join(" ")}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
