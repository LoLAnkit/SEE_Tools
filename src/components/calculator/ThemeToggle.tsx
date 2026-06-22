/**
 * ThemeToggle.tsx — Dark/light theme toggle button.
 *
 * Dispatches TOGGLE_THEME to the reducer (which applies the .dark class and
 * persists to localStorage). Icon shows sun in dark mode, moon in light mode
 * (Requirements 19.2, 19.3).
 */

import React, { useContext } from "react";
import { CalculatorContext } from "./CalculatorContext";

export default function ThemeToggle() {
  const { state, dispatch } = useContext(CalculatorContext);
  const isDark = state.theme === "dark";

  return (
    <button
      onClick={() => dispatch({ type: "TOGGLE_THEME" })}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-sm p-1.5 text-body hover:text-ink hover:bg-canvas-soft-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      {isDark ? (
        /* Sun icon */
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        /* Moon icon */
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}
