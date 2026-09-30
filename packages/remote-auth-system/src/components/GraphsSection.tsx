import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import "./GraphsSection.css";

import type { StatusCountsDto } from "../Dto/BuyerInvoiceDto";

interface GraphsSectionProps {
  invoices?: any[];
  statusCounts?: StatusCountsDto;
}

const COLORS = {
  pending: "orange",   // API pending → UI "Pending"
  processed: "#3b82f6", // API processed → UI "Processed"
  failed: "#dc2626",    // API failed → UI "Failed"
  total: "#6366f1",     // API total_invoices → UI "Total Invoices"
};

interface TooltipState {
  name: string;
  count: number;
  pct: number;
  color: string;
  x: number;
  y: number;
}

export default function GraphsSection({ statusCounts }: GraphsSectionProps) {
  const data = useMemo(() => {
    // Use statusCounts from API if available
    if (statusCounts) {
      return {
        status: [
          { name: "Pending", count: statusCounts["OCR-Success"] || 0, color: COLORS.pending },
          { name: "Processed", count: statusCounts.processed || 0, color: COLORS.processed },
          { name: "Failed", count: statusCounts.failed || 0, color: COLORS.failed },
          { name: "Total Invoices", count: statusCounts.total_invoices || 0, color: COLORS.total },
        ],
      };
    }

    // Fallback when no statusCounts available
    return {
      status: [
        { name: "Pending", count: 0, color: COLORS.pending },
        { name: "Processed", count: 0, color: COLORS.processed },
        { name: "Failed", count: 0, color: COLORS.failed },
        { name: "Total Invoices", count: 0, color: COLORS.total },
      ],
    };
  }, [statusCounts]);

  const [isOpen, setIsOpen] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const donutWrapRef = useRef<HTMLDivElement>(null);

  // Extract counts for the donut chart (exclude Total from the donut segments)
  const pending = data.status.find((s) => s.name === "Pending")?.count || 0;
  const processed = data.status.find((s) => s.name === "Processed")?.count || 0;
  const failed = data.status.find((s) => s.name === "Failed")?.count || 0;
  const totalCount = data.status.find((s) => s.name === "Total Invoices")?.count || 0;

  // Donut segments: Pending, Processed, Failed (Total shown in center, not as segment)
  const donutTotal = pending + processed + failed;

  const pendingPct = donutTotal > 0 ? (pending / donutTotal) * 100 : 0;
  const processedPct = donutTotal > 0 ? (processed / donutTotal) * 100 : 0;
  const failedPct = donutTotal > 0 ? (failed / donutTotal) * 100 : 0;

  // Helper to format percentage for display (1 decimal place)
  const formatPct = (pct: number) => `${pct.toFixed(1)}%`;

  // Map each stat name to its computed percentage of the donut total
  const pctByName: Record<string, number> = {
    Pending: pendingPct,
    Processed: processedPct,
    Failed: failedPct,
    "Total Invoices": 100,
  };

  // ==========================================
  // SVG DONUT SEGMENT GEOMETRY (for per-segment hover)
  // ==========================================
  const size = 160;
  const center = size / 2;
  const strokeWidth = 26;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  const rawSegments = [
    { name: "Pending", count: pending, pct: pendingPct, color: COLORS.pending },
    { name: "Processed", count: processed, pct: processedPct, color: COLORS.processed },
    { name: "Failed", count: failed, pct: failedPct, color: COLORS.failed },
  ].filter((s) => s.count > 0);

  let cumulativePct = 0;
  const segments = rawSegments.map((seg) => {
    const dashLength = (seg.pct / 100) * circumference;
    const dasharray = `${dashLength} ${circumference - dashLength}`;
    const dashoffset = circumference - (cumulativePct / 100) * circumference;
    cumulativePct += seg.pct;
    return { ...seg, dasharray, dashoffset };
  });

  const handleSegmentEnter = (
    e: React.MouseEvent<SVGCircleElement>,
    seg: { name: string; count: number; pct: number; color: string }
  ) => {
    const rect = donutWrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      name: seg.name,
      count: seg.count,
      pct: seg.pct,
      color: seg.color,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleSegmentMove = (e: React.MouseEvent<SVGCircleElement>) => {
    const rect = donutWrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip((prev) =>
      prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : prev
    );
  };

  const handleSegmentLeave = () => setTooltip(null);

  return (
    <section className="graphs-section">
      <div className="graphs-header-toggle" onClick={() => setIsOpen(!isOpen)}>
        <div className="graphs-toggle-title">
          <BarChart3 size={18} className="graphs-toggle-icon-main" />
          <h3>Invoice Analytics</h3>
        </div>
        <button className="graphs-toggle-btn">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span>{isOpen ? "Hide Charts" : "Show Charts"}</span>
        </button>
      </div>

      {isOpen && (
        <div className="graphs-grid">
          <div className="graph-card">
            <h3 className="graph-title">Invoice Status Overview</h3>

            <div className="donut-wrap">
              <div className="donut-svg-wrap" ref={donutWrapRef}>
                <svg
                  width={size}
                  height={size}
                  viewBox={`0 0 ${size} ${size}`}
                  className="donut-svg"
                >
                  {/* Background track */}
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth={strokeWidth}
                  />

                  {/* Segments, rotated so first segment starts at 12 o'clock */}
                  <g transform={`rotate(-90 ${center} ${center})`}>
                    {segments.map((seg) => (
                      <circle
                        key={seg.name}
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={seg.dasharray}
                        strokeDashoffset={seg.dashoffset}
                        className="donut-segment"
                        onMouseEnter={(e) => handleSegmentEnter(e, seg)}
                        onMouseMove={handleSegmentMove}
                        onMouseLeave={handleSegmentLeave}
                      />
                    ))}
                  </g>
                </svg>

                <div className="donut-center">
                  <strong>{totalCount}</strong>
                  <span>Total</span>
                </div>

                {tooltip && (
                  <div
                    className="donut-tooltip"
                    style={{ left: tooltip.x, top: tooltip.y }}
                  >
                    <span
                      className="donut-tooltip-dot"
                      style={{ background: tooltip.color }}
                    />
                    <span className="donut-tooltip-text">
                      {tooltip.name}: {tooltip.count} ({formatPct(tooltip.pct)})
                    </span>
                  </div>
                )}
              </div>

              <div className="stats">
                {data.status.map((item) => (
                  <div className="stat-card" key={item.name}>
                    <span
                      className="dot"
                      style={{ background: item.color }}
                    />
                    <div>
                      <p>{item.name}</p>
                      <h4>
                        {item.count}
                        {item.name !== "Total Invoices" && (
                          <span className="stat-pct">
                            {" "}
                            ({formatPct(pctByName[item.name])})
                          </span>
                        )}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}