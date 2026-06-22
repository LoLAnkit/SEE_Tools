/**
 * ExportControls.tsx — PNG and PDF export controls for the marksheet preview.
 *
 * Dynamically imports html2canvas (PNG) and jsPDF (PDF) on first use to avoid
 * adding their weight to the initial bundle. Downloads only — no shareable URL
 * (Requirements 17.4, 17.5, 17.6).
 */

import React, { useRef, useState } from "react";
import MarksheetPreview from "./MarksheetPreview";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExportControls() {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [pngLoading, setPngLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownloadPng() {
    if (!previewRef.current) return;
    setError(null);
    setPngLoading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: null,
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = "see-marksheet.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      setError("PNG export failed. Please try again.");
    } finally {
      setPngLoading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!previewRef.current) return;
    setError(null);
    setPdfLoading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(previewRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width / 2, canvas.height / 2],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save("see-marksheet.pdf");
    } catch {
      setError("PDF export failed. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* The marksheet — capture target for exports */}
      <MarksheetPreview previewRef={previewRef} />

      {/* Export buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-mute">Download:</span>
        <button
          onClick={handleDownloadPng}
          disabled={pngLoading}
          className="inline-flex items-center gap-1.5 rounded-sm border border-hairline px-3 py-1.5 text-xs font-medium text-body hover:text-ink hover:border-hairline-strong transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
          aria-label="Download marksheet as PNG image"
        >
          {pngLoading ? (
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
              PNG
            </>
          )}
        </button>

        <button
          onClick={handleDownloadPdf}
          disabled={pdfLoading}
          className="inline-flex items-center gap-1.5 rounded-sm border border-hairline px-3 py-1.5 text-xs font-medium text-body hover:text-ink hover:border-hairline-strong transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
          aria-label="Download marksheet as PDF"
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
              PDF
            </>
          )}
        </button>

        {error && (
          <p role="alert" className="text-xs text-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
