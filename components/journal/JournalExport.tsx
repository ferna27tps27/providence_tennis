"use client";

import { JournalEntry } from "@/lib/api/journal-api";
import { format } from "date-fns";
import { useState } from "react";

interface JournalExportProps {
  entries: JournalEntry[];
  userRole?: "player" | "coach" | "admin";
}

export default function JournalExport({ entries, userRole }: JournalExportProps) {
  const [exporting, setExporting] = useState(false);

  const generateTextExport = () => {
    const header = `Providence Tennis Club - Journal Entries
Generated: ${format(new Date(), "PPP")}
Total Entries: ${entries.length}
${"=".repeat(60)}

`;

    const entriesText = entries
      .map((entry, index) => {
        const lines = [
          `Entry ${index + 1}`,
          `-`.repeat(60),
          `Date: ${format(new Date(entry.sessionDate), "PPP")}${entry.sessionTime ? ` at ${entry.sessionTime}` : ""}`,
          `${userRole === "coach" ? "Player" : "Coach"}: ${userRole === "coach" ? entry.playerName || "Unknown" : entry.coachName || "Unknown"}`,
          "",
          "Summary:",
          entry.summary,
          "",
          "Areas Worked On:",
          entry.areasWorkedOn.map(area => `  • ${area}`).join("\n"),
          "",
          "Pointers for Next Session:",
          entry.pointersForNextSession,
        ];

        if (entry.additionalNotes) {
          lines.push("", "Additional Notes:", entry.additionalNotes);
        }

        if (entry.playerReflection) {
          lines.push("", "Player Reflection:", entry.playerReflection);
        }

        if (entry.reservationId) {
          lines.push("", `Reservation ID: ${entry.reservationId}`);
        }

        lines.push("", "");

        return lines.join("\n");
      })
      .join("\n");

    return header + entriesText;
  };

  const handleTextExport = () => {
    const text = generateTextExport();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal-entries-${format(new Date(), "yyyy-MM-dd")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    setExporting(true);
    
    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print");
      setExporting(false);
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Journal Entries - Providence Tennis Club</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              color: #333;
            }
            h1 {
              color: #1e40af;
              border-bottom: 2px solid #1e40af;
              padding-bottom: 10px;
            }
            .meta {
              color: #666;
              font-size: 14px;
              margin-bottom: 30px;
            }
            .entry {
              page-break-inside: avoid;
              margin-bottom: 30px;
              border: 1px solid #ddd;
              padding: 20px;
              border-radius: 8px;
            }
            .entry-header {
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .entry-title {
              font-size: 18px;
              font-weight: bold;
              color: #1e40af;
            }
            .entry-date {
              color: #666;
              font-size: 14px;
            }
            .section {
              margin-bottom: 15px;
            }
            .section-title {
              font-weight: bold;
              color: #374151;
              margin-bottom: 5px;
            }
            .areas {
              display: flex;
              flex-wrap: wrap;
              gap: 5px;
              margin-top: 5px;
            }
            .area-tag {
              background: #dbeafe;
              color: #1e40af;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
            }
            .pointers {
              background: #fef3c7;
              border: 1px solid #fcd34d;
              padding: 10px;
              border-radius: 4px;
            }
            .reflection {
              background: #dbeafe;
              border: 1px solid #93c5fd;
              padding: 10px;
              border-radius: 4px;
            }
            @media print {
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <h1>Providence Tennis Club - Journal Entries</h1>
          <div class="meta">
            <div>Generated: ${format(new Date(), "PPP")}</div>
            <div>Total Entries: ${entries.length}</div>
          </div>
          
          ${entries
            .map(
              (entry, index) => `
            <div class="entry">
              <div class="entry-header">
                <div class="entry-title">Session ${index + 1} - ${userRole === "coach" ? entry.playerName || "Unknown Player" : entry.coachName || "Unknown Coach"}</div>
                <div class="entry-date">
                  ${format(new Date(entry.sessionDate), "PPP")}${entry.sessionTime ? ` at ${entry.sessionTime}` : ""}
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">Summary</div>
                <div>${entry.summary}</div>
              </div>
              
              <div class="section">
                <div class="section-title">Areas Worked On</div>
                <div class="areas">
                  ${entry.areasWorkedOn.map(area => `<span class="area-tag">${area}</span>`).join("")}
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">Pointers for Next Session</div>
                <div class="pointers">${entry.pointersForNextSession}</div>
              </div>
              
              ${entry.additionalNotes ? `
                <div class="section">
                  <div class="section-title">Additional Notes</div>
                  <div>${entry.additionalNotes}</div>
                </div>
              ` : ""}
              
              ${entry.playerReflection ? `
                <div class="section">
                  <div class="section-title">Player Reflection</div>
                  <div class="reflection">${entry.playerReflection}</div>
                </div>
              ` : ""}
              
              ${entry.reservationId ? `
                <div class="section">
                  <div style="font-size: 12px; color: #666;">Reservation ID: ${entry.reservationId}</div>
                </div>
              ` : ""}
            </div>
          `
            )
            .join("")}
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 100);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    setTimeout(() => {
      setExporting(false);
    }, 1000);
  };

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handlePrint}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>🖨️</span>
        <span>{exporting ? "Printing..." : "Print"}</span>
      </button>
      
      <button
        onClick={handleTextExport}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
      >
        <span>📥</span>
        <span>Export as Text</span>
      </button>
    </div>
  );
}
