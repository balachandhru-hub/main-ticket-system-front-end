import React from 'react';
import { X, Info, Filter, DollarSign, Activity, Wrench, Grid } from 'lucide-react';

interface InfoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  infoModalTab: 'filters' | 'kpis' | 'trends' | 'kraljic' | 'anomalies';
  setInfoModalTab: (tab: 'filters' | 'kpis' | 'trends' | 'kraljic' | 'anomalies') => void;
}

export const InfoGuideModal: React.FC<InfoGuideModalProps> = ({
  isOpen,
  onClose,
  infoModalTab,
  setInfoModalTab,
}) => {
  if (!isOpen) return null;

  return (
    <div className="info-guide-modal-overlay" onClick={onClose}>
      <div className="info-guide-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="info-guide-modal-header">
          <div className="info-guide-modal-header-left">
            <div className="info-guide-modal-icon-badge">
              <Info width={20} height={20} />
            </div>
            <div>
              <h3 className="info-guide-modal-title">
                Dashboard & Analytics Executive Guide
              </h3>
              <p className="info-guide-modal-subtitle">
                Learn how filters, metrics, algorithms, Kraljic matrix, and visual charts work across the Procurement Performance Dashboard
              </p>
            </div>
          </div>
          <button
            type="button"
            className="info-guide-modal-close-btn"
            onClick={onClose}
            title="Close Guide"
          >
            <X width={18} height={18} />
          </button>
        </div>

        {/* Info Modal Navigation Tabs */}
        <div className="info-guide-tabs-bar">
          {[
            { id: 'filters', label: 'Filters & Controls', icon: Filter },
            { id: 'kpis', label: 'KPIs & ABC Analysis', icon: DollarSign },
            { id: 'trends', label: 'Trends & Analytics', icon: Activity },
            { id: 'kraljic', label: 'Kraljic Portfolio & Savings', icon: Grid },
            { id: 'anomalies', label: 'Anomalies & Forecast', icon: Wrench },
          ].map(tab => {
            const IconComponent = tab.icon;
            const isActive = infoModalTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setInfoModalTab(tab.id as any)}
                className={`info-guide-tab-btn ${isActive ? 'active' : ''}`}
              >
                <IconComponent width={14} height={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body / Tab Content */}
        <div className="proc-modal-body" style={{ flex: 1, overflowY: 'auto', backgroundColor: '#ffffff', paddingRight: '0.25rem' }}>
          
          {/* TAB 1: FILTERS & CONTROLS */}
          {infoModalTab === 'filters' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '0.5rem', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 700, color: '#1e40af' }}>
                  How the Filtering Engine Works
                </h4>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#1e3a8a', lineHeight: 1.5 }}>
                  The right-hand filter sidebar dynamically refines data across all KPI cards, ABC Pareto analysis, monthly spend trends, unit price trends, spend breakdown charts, purchase frequency, and material anomalies simultaneously.
                </p>
              </div>

              <div className="info-guide-card-grid">
                <div className="info-guide-card">
                  <div className="info-guide-card-title">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }}></span>
                    Item Type Filter (All / Material / Service)
                  </div>
                  <p className="info-guide-card-text">
                    Allows you to segment analysis between physical SKU materials (e.g. food, linen, operational supplies) and service charges (e.g. maintenance contracts, consulting).
                  </p>
                </div>

                <div className="info-guide-card">
                  <div className="info-guide-card-title">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                    Outlet & Property Selection
                  </div>
                  <p className="info-guide-card-text">
                    Filter spend by specific hotel properties, outlets, or business units. Multi-select options let you aggregate spend across selected locations.
                  </p>
                </div>

                <div className="info-guide-card">
                  <div className="info-guide-card-title">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
                    Cost Center Selection
                  </div>
                  <p className="info-guide-card-text">
                    Filter spend transactions by internal financial department cost centers (e.g. Kitchen, Housekeeping, Engineering).
                  </p>
                </div>

                <div className="info-guide-card">
                  <div className="info-guide-card-title">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8b5cf6' }}></span>
                    Supplier & Material Dynamic Cross-Filtering
                  </div>
                  <p className="info-guide-card-text">
                    Selecting a Supplier automatically filters the available Material Codes list to show only items supplied by that vendor. Likewise, selecting a Material filters the Supplier dropdown.
                  </p>
                </div>

                <div className="info-guide-card">
                  <div className="info-guide-card-title">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ec4899' }}></span>
                    Date Range Controls (From / To)
                  </div>
                  <p className="info-guide-card-text">
                    Located at the top header and in the sidebar. Select start and end dates to focus the entire dashboard on specific quarters, months, or custom date ranges.
                  </p>
                </div>

                <div className="info-guide-card">
                  <div className="info-guide-card-title">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#64748b' }}></span>
                    Apply & Clear Actions
                  </div>
                  <p className="info-guide-card-text">
                    Clicking <strong>Apply Filters</strong> executes fresh API calls across all sub-components. Clicking <strong>Clear Filters</strong> resets all dropdowns and date inputs back to defaults.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KPIS & ABC ANALYSIS */}
          {infoModalTab === 'kpis' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 700, color: '#166534' }}>
                  Executive KPIs & Pareto ABC Classification
                </h4>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#14532d', lineHeight: 1.5 }}>
                  High-level overview metrics and Pareto 80/15/5 analysis to categorize inventory spend by value contribution and identify high-impact savings opportunities.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>1. Key Performance Metrics (KPI Cards)</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '0.375rem' }}>
                    <strong style={{ fontSize: '0.75rem', color: '#2563eb' }}>TOTAL SPEND</strong>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.6875rem', color: '#64748b' }}>Sum of all procurement purchase order invoices in AED.</p>
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '0.375rem' }}>
                    <strong style={{ fontSize: '0.75rem', color: '#10b981' }}>ACTIVE SUPPLIERS</strong>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.6875rem', color: '#64748b' }}>Distinct count of active vendors supplying goods or services.</p>
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '0.375rem' }}>
                    <strong style={{ fontSize: '0.75rem', color: '#f59e0b' }}>TOTAL MATERIALS</strong>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.6875rem', color: '#64748b' }}>Total count of unique physical material SKUs purchased.</p>
                  </div>
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '0.375rem' }}>
                    <strong style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>TOTAL SERVICES</strong>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.6875rem', color: '#64748b' }}>Total count of unique service line items ordered.</p>
                  </div>
                </div>

                <h5 style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>2. ABC Pareto Spend Classification (80 / 15 / 5 Rule)</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.875rem', borderRadius: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981' }}>Category A (Top 80% Spend)</span>
                    <p style={{ margin: '0.375rem 0 0 0', fontSize: '0.75rem', color: '#065f46', lineHeight: 1.4 }}>
                      High-value items accounting for 80% of total expenditure. Priority focus for contract negotiations, strategic sourcing, and price monitoring.
                    </p>
                  </div>
                  <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '0.875rem', borderRadius: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b' }}>Category B (Next 15% Spend)</span>
                    <p style={{ margin: '0.375rem 0 0 0', fontSize: '0.75rem', color: '#92400e', lineHeight: 1.4 }}>
                      Medium-value items contributing 15% of total spend. Monitored for bulk discounts and periodic vendor re-evaluations.
                    </p>
                  </div>
                  <div style={{ backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', padding: '0.875rem', borderRadius: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8b5cf6' }}>Category C (Remaining 5% Spend)</span>
                    <p style={{ margin: '0.375rem 0 0 0', fontSize: '0.75rem', color: '#5b21b6', lineHeight: 1.4 }}>
                      Low-value tail-end items representing remaining 5% spend. Ideal for automated catalog ordering and streamlined PO workflows.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRENDS & ANALYTICS */}
          {infoModalTab === 'trends' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '0.5rem', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 700, color: '#c2410c' }}>
                  Trend Analytics & Unit Price Baseline Intelligence
                </h4>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#9a3412', lineHeight: 1.5 }}>
                  Track monthly spend velocity, volume changes, and unit price movements with baseline target comparisons to prevent price creep and evaluate vendor competitiveness.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem' }}>
                  <h5 style={{ margin: '0 0 0.375rem 0', fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>Monthly Spend Trend</h5>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569', lineHeight: 1.5 }}>
                    Line & Bar visualization displaying total spend per month along with percentage changes compared to the preceding month (+/- %). Helps identify seasonal spend peaks.
                  </p>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem' }}>
                  <h5 style={{ margin: '0 0 0.375rem 0', fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                    Average Unit Price Trend & Baseline Target Month Selector
                  </h5>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569', lineHeight: 1.5 }}>
                    Calculates weighted average unit prices per month. Selecting a <strong>Target Month (Baseline)</strong> renders a dashed reference line across the chart, calculating exact savings or cost escalation relative to the selected baseline month.
                  </p>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem' }}>
                  <h5 style={{ margin: '0 0 0.375rem 0', fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>Total Quantity Trend</h5>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569', lineHeight: 1.5 }}>
                    Tracks absolute unit volume ordered across months, enabling procurement managers to determine whether spend increases are driven by price inflation or higher purchase volume.
                  </p>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem' }}>
                  <h5 style={{ margin: '0 0 0.375rem 0', fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                    Spend by Material / Service & Vendor Comparison Modal
                  </h5>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569', lineHeight: 1.5 }}>
                    Horizontal bar charts showing top spend materials and services. Clicking any item bar opens the <strong>Spend Breakdown Modal</strong>, comparing prices, quantities, and unit price trends across suppliers providing that item.
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: KRALJIC PORTFOLIO & SAVINGS */}
          {infoModalTab === 'kraljic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '0.5rem', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 700, color: '#15803d' }}>
                  Kraljic Strategic Portfolio Matrix & Savings Tracking
                </h4>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#166534', lineHeight: 1.5 }}>
                  The Kraljic Matrix segments items into four strategic procurement quadrants based on Financial Impact vs. Supply Risk. Combined with Saved Details mode, procurement leads can lock in contract baselines.
                </p>
              </div>

              <div className="info-guide-card-grid">
                <div className="info-guide-card" style={{ borderLeft: '4px solid #ef4444' }}>
                  <div className="info-guide-card-title" style={{ color: '#991b1b' }}>
                    🎉 Strategic Items (High Spend, High Risk)
                  </div>
                  <p className="info-guide-card-text">
                    Critical materials from limited suppliers. Strategy: Strategic long-term partnerships, supplier risk auditing, and executive relationship management.
                  </p>
                </div>

                <div className="info-guide-card" style={{ borderLeft: '4px solid #22c55e' }}>
                  <div className="info-guide-card-title" style={{ color: '#15803d' }}>
                    🎯 Leverage Items (High Spend, Low Risk)
                  </div>
                  <p className="info-guide-card-text">
                    High volume spend with abundant supplier availability. Strategy: Competitive tendering, bulk volume discounts, and aggressive price negotiation.
                  </p>
                </div>

                <div className="info-guide-card" style={{ borderLeft: '4px solid #f97316' }}>
                  <div className="info-guide-card-title" style={{ color: '#c2410c' }}>
                    ⚠️ Bottleneck Items (Low Spend, High Risk)
                  </div>
                  <p className="info-guide-card-text">
                    Niche, hard-to-source items with low spend contribution. Strategy: Secure stock buffers, long-term contracts, and alternative supplier qualification.
                  </p>
                </div>

                <div className="info-guide-card" style={{ borderLeft: '4px solid #64748b' }}>
                  <div className="info-guide-card-title" style={{ color: '#334155' }}>
                    ⚙️ Non-Critical Items (Low Spend, Low Risk)
                  </div>
                  <p className="info-guide-card-text">
                    Standardized, low-value items. Strategy: Process automation, catalog ordering, e-procurement, and minimal administrative overhead.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ANOMALIES & FORECAST */}
          {infoModalTab === 'anomalies' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ backgroundColor: '#faf5ff', border: '1px solid #f3e8ff', borderRadius: '0.5rem', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 700, color: '#7e22ce' }}>
                  Outlier Detection, Forecasting & GRN Lead Times
                </h4>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: '#6b21a8', lineHeight: 1.5 }}>
                  Advanced analytical modules for spend forecasting, outlet spend variance benchmarking, order frequency lead times, and statistical anomaly detection.
                </p>
              </div>

              <div className="info-guide-card-grid">
                
                <div className="info-guide-card">
                  <strong style={{ fontSize: '0.8125rem', color: '#0f172a' }}>Outlet Spend Variance Breakdown</strong>
                  <p className="info-guide-card-text" style={{ marginTop: '0.375rem' }}>
                    Compares total spending of each property/outlet against the organizational average spend. Outlets spending 50%+ above average are flagged as <strong>High Spend Outliers</strong>.
                  </p>
                </div>

                <div className="info-guide-card">
                  <strong style={{ fontSize: '0.8125rem', color: '#0f172a' }}>Predictive Spend Forecast</strong>
                  <p className="info-guide-card-text" style={{ marginTop: '0.375rem' }}>
                    Generates time-series predictive modeling for future spend (1 to 6 months steps). Helps finance and procurement teams prepare budget allocations.
                  </p>
                </div>

                <div className="info-guide-card">
                  <strong style={{ fontSize: '0.8125rem', color: '#0f172a' }}>Purchase Frequency & GRN Days</strong>
                  <p className="info-guide-card-text" style={{ marginTop: '0.375rem' }}>
                    Calculates the average number of days between Goods Received Notes (GRNs) for suppliers and materials. Clicking any row opens the <strong>Monthly GRN Frequency Modal</strong>.
                  </p>
                </div>

                <div className="info-guide-card">
                  <strong style={{ fontSize: '0.8125rem', color: '#0f172a' }}>Material Variance & Anomaly Reasons</strong>
                  <p className="info-guide-card-text" style={{ marginTop: '0.375rem' }}>
                    Identifies price or quantity anomalies exceeding standard deviation thresholds. Clicking an anomaly card opens the <strong>Driver Analysis Modal</strong> explaining underlying cost drivers.
                  </p>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button
            type="button"
            onClick={onClose}
            className="proc-modal-btn-download"
            style={{ padding: '0.5rem 1.25rem' }}
          >
            Got It, Close Guide
          </button>
        </div>

      </div>
    </div>
  );
};
