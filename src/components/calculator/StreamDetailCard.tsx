/**
 * StreamDetailCard.tsx — Per-stream eligibility verdict with per-requirement
 * ✓/✗ markers. Failed requirements are highlighted in red (Requirement 15.8).
 */

import React from "react";
import type { StreamVerdict } from "../../lib/eligibility";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StreamDetailCardProps {
  verdict: StreamVerdict;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StreamDetailCard({ verdict }: StreamDetailCardProps) {
  const { stream, passed, checks } = verdict;

  return (
    <div
      className={[
        "rounded-md border p-4 space-y-3",
        passed
          ? "border-success bg-canvas-soft"
          : "border-error bg-error-soft",
      ].join(" ")}
      aria-label={`${stream} eligibility: ${passed ? "Eligible" : "Not eligible"}`}
    >
      {/* Stream header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-ink">{stream}</h4>
        <span
          className={[
            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
            passed
              ? "bg-success text-on-brand"
              : "bg-error text-on-brand",
          ].join(" ")}
        >
          {passed ? "Eligible ✓" : "Not Eligible ✗"}
        </span>
      </div>

      {/* Per-check list */}
      <ul className="space-y-1.5">
        {checks.map((check, i) => (
          <li
            key={i}
            className={[
              "flex items-start gap-2 text-xs rounded px-2 py-1",
              !check.pass ? "bg-error-soft text-error" : "text-body",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 font-bold ${check.pass ? "text-success" : "text-error"}`}
            >
              {check.pass ? "✓" : "✗"}
            </span>
            <span>
              <span className="font-medium">{check.label}</span>
              {" — "}
              Required: ≥ {check.required.toFixed(1)}, Got: {check.actual.toFixed(2)}
              {!check.pass && (
                <span className="ml-1 font-semibold">
                  (need {(check.required - check.actual).toFixed(2)} more)
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
