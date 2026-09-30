import React from 'react';
import { X } from 'lucide-react';

interface OutlierDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOutlierItemForModal: any;
  unitPriceOutlierBaselineMonth: string;
  outlierModelSubTab: 'all' | 'z_score' | 'mad' | 'iqr' | 'rolling';
  setOutlierModelSubTab: (tab: 'all' | 'z_score' | 'mad' | 'iqr' | 'rolling') => void;
}

export const OutlierDetailsModal: React.FC<OutlierDetailsModalProps> = React.memo(({
  isOpen,
  onClose,
  selectedOutlierItemForModal,
  unitPriceOutlierBaselineMonth,
  outlierModelSubTab,
  setOutlierModelSubTab,
}) => {
  if (!isOpen || !selectedOutlierItemForModal) return null;

  const item = selectedOutlierItemForModal;
  const months = item.months || [];
  const unitPrices = item.unit_prices || [];
  const zScore = item.standard_z_score || {};
  const madScore = item.modified_z_score_mad || {};
  const iqrScore = item.iqr || {};
  const rollingScore = item.rolling_mean_std || {};

  return (
    <div className="proc-modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <div className="proc-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '940px', height: 'auto', maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="proc-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <h3 className="proc-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
              Unit Price Outlier Analysis (4 Statistical Models)
            </h3>
            <span className="proc-modal-subtitle" style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>
              Material: <strong style={{ color: '#0f172a' }}>{item.material_name}</strong>
              {item.supplier_name && (
                <> | Supplier: <strong style={{ color: '#2563eb' }}>{item.supplier_name}</strong></>
              )}
            </span>
          </div>
          <button
            className="proc-modal-close-btn"
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '0.25rem', borderRadius: '0.375rem' }}
          >
            <X width={20} height={20} />
          </button>
        </div>

        <div className="proc-modal-body" style={{ paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {unitPriceOutlierBaselineMonth && (
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', backgroundColor: '#f1f5f9', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
                🔍 Baseline Month Analysis: <strong style={{ color: '#0f172a' }}>{unitPriceOutlierBaselineMonth}</strong>
              </div>
            )}

            {/* Model Sub-Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginRight: '0.25rem' }}>Models:</span>
              {(['all', 'z_score', 'mad', 'iqr', 'rolling'] as const).map(modelKey => (
                <button
                  key={modelKey}
                  type="button"
                  onClick={() => setOutlierModelSubTab(modelKey)}
                  style={{
                    padding: '0.25rem 0.625rem',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    borderRadius: '0.25rem',
                    border: outlierModelSubTab === modelKey ? '1px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: outlierModelSubTab === modelKey ? '#2563eb' : '#ffffff',
                    color: outlierModelSubTab === modelKey ? '#ffffff' : '#334155',
                    cursor: 'pointer'
                  }}
                >
                  {modelKey === 'all' && 'All 4 Models'}
                  {modelKey === 'z_score' && 'Standard Z-Score'}
                  {modelKey === 'mad' && 'Modified Z-Score (MAD)'}
                  {modelKey === 'iqr' && 'IQR Range'}
                  {modelKey === 'rolling' && 'Rolling Mean & Std'}
                </button>
              ))}
            </div>

            <div
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '0.625rem',
                padding: '1.25rem',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              {/* Item Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#0f172a' }}>{item.material_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, marginTop: '0.125rem' }}>Supplier: <strong style={{ color: '#2563eb' }}>{item.supplier_name}</strong></div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {months.map((m: string, mIdx: number) => (
                    <span key={m + mIdx} style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>
                      {m}: AED {unitPrices[mIdx] !== undefined ? unitPrices[mIdx].toLocaleString() : 'N/A'}
                    </span>
                  ))}
                </div>
              </div>

              {/* 4 Statistical Models Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1rem' }}>
                
                {/* 1. Standard Z-Score Model */}
                {(outlierModelSubTab === 'all' || outlierModelSubTab === 'z_score') && (
                  <div style={{ border: '1px solid #bfdbfe', borderRadius: '0.5rem', backgroundColor: '#f8fafc', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.375rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e40af' }}>📈 Standard Z-Score</span>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b' }}>Mean: AED {zScore.mean !== undefined ? Number(zScore.mean).toFixed(2) : '0'} | Std Dev: {zScore.standard_deviation !== undefined ? Number(zScore.standard_deviation).toFixed(2) : '0'}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {Array.isArray(zScore.verdicts) && zScore.verdicts.map((v: string, vIdx: number) => {
                        const isFlagged = zScore.outlier_flags ? zScore.outlier_flags[vIdx] : false;
                        return (
                          <div key={vIdx} style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem', borderRadius: '0.25rem', backgroundColor: isFlagged ? '#fef2f2' : '#f0fdf4', border: isFlagged ? '1px solid #fca5a5' : '1px solid #bbf7d0', color: isFlagged ? '#991b1b' : '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <span>{isFlagged ? '🚨' : '✅'}</span>
                            <span>{v}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Modified Z-Score (MAD) Model */}
                {(outlierModelSubTab === 'all' || outlierModelSubTab === 'mad') && (
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '0.5rem', backgroundColor: '#f8fafc', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.375rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>📐 Modified Z-Score (MAD)</span>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b' }}>Median: AED {madScore.median !== undefined ? Number(madScore.median).toFixed(2) : '0'} | MAD: {madScore.mad !== undefined ? Number(madScore.mad).toFixed(2) : '0'}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {Array.isArray(madScore.verdicts) && madScore.verdicts.map((v: string, vIdx: number) => {
                        const isFlagged = madScore.outlier_flags ? madScore.outlier_flags[vIdx] : false;
                        return (
                          <div key={vIdx} style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem', borderRadius: '0.25rem', backgroundColor: isFlagged ? '#fef2f2' : '#f0fdf4', border: isFlagged ? '1px solid #fca5a5' : '1px solid #bbf7d0', color: isFlagged ? '#991b1b' : '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <span>{isFlagged ? '🚨' : '✅'}</span>
                            <span>{v}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. IQR (Interquartile Range) Model */}
                {(outlierModelSubTab === 'all' || outlierModelSubTab === 'iqr') && (
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '0.5rem', backgroundColor: '#f8fafc', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.375rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>🎯 Interquartile Range (IQR)</span>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b' }}>Q1: {iqrScore.q1} | Q3: {iqrScore.q3} | Bounds: [{iqrScore.lower_bound}, {iqrScore.upper_bound}]</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {Array.isArray(iqrScore.verdicts) && iqrScore.verdicts.map((v: string, vIdx: number) => {
                        const isFlagged = iqrScore.outlier_flags ? iqrScore.outlier_flags[vIdx] : false;
                        return (
                          <div key={vIdx} style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem', borderRadius: '0.25rem', backgroundColor: isFlagged ? '#fef2f2' : '#f0fdf4', border: isFlagged ? '1px solid #fca5a5' : '1px solid #bbf7d0', color: isFlagged ? '#991b1b' : '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <span>{isFlagged ? '🚨' : '✅'}</span>
                            <span>{v}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Rolling Mean & Std Model */}
                {(outlierModelSubTab === 'all' || outlierModelSubTab === 'rolling') && (
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '0.5rem', backgroundColor: '#f8fafc', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.375rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>📉 Rolling Mean & Std</span>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b' }}>Window: {rollingScore.window_size || 3}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {Array.isArray(rollingScore.verdicts) && rollingScore.verdicts.map((v: string, vIdx: number) => {
                        const isFlagged = rollingScore.outlier_flags ? rollingScore.outlier_flags[vIdx] : false;
                        return (
                          <div key={vIdx} style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem', borderRadius: '0.25rem', backgroundColor: isFlagged ? '#fef2f2' : '#f0fdf4', border: isFlagged ? '1px solid #fca5a5' : '1px solid #bbf7d0', color: isFlagged ? '#991b1b' : '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <span>{isFlagged ? '🚨' : '✅'}</span>
                            <span>{v}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
