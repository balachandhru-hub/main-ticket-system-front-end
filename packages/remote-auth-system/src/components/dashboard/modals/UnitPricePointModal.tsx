import React, { useState } from 'react';
import { X, BarChart2, Search } from 'lucide-react';
import SpinnerLoaders from '../../SpinnerLoaders';
import { SearchableSingleSelect } from './SearchableSingleSelect';

interface UnitPricePointModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitPricePointSelectedMonth: string;
  unitPricePointData: any[];
  unitPricePointLoading: boolean;
  unitPricePointTotalRecords: number;
  unitPricePointTotalUnitPrice: number;
  unitPricePointPage: number;
  unitPricePointPageSize: number;
  setUnitPricePointPage: (page: number) => void;
  loadUnitPricePointDetails: (monthStr?: string, pageNum?: number) => void;
  handleBarRowClick: (item: { material_name: string; total_spend: number }) => void;
}

export const UnitPricePointModal: React.FC<UnitPricePointModalProps> = React.memo(({
  isOpen,
  onClose,
  unitPricePointSelectedMonth,
  unitPricePointData,
  unitPricePointLoading,
  unitPricePointTotalRecords,
  unitPricePointTotalUnitPrice,
  unitPricePointPage,
  unitPricePointPageSize,
  setUnitPricePointPage,
  loadUnitPricePointDetails,
  handleBarRowClick,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMaterialFilter, setSelectedMaterialFilter] = useState<string>('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('');

  if (!isOpen) return null;

  const filteredData = (unitPricePointData || []).filter((item: any) => {
    if (selectedMaterialFilter && item.material !== selectedMaterialFilter) {
      return false;
    }
    if (selectedSupplierFilter && item.supplier !== selectedSupplierFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const mat = String(item.material || '').toLowerCase();
      const sup = String(item.supplier || '').toLowerCase();
      if (!mat.includes(q) && !sup.includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="unit-price-modal-overlay" onClick={onClose}>
      <div className="unit-price-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="unit-price-modal-header">
          <div className="unit-price-modal-header-left">
            <div className="unit-price-modal-icon-badge">
              <BarChart2 width={20} height={20} />
            </div>
            <div>
              <h3 className="unit-price-modal-title">
                Average Unit Price Details - <span className="unit-price-modal-month-badge">{unitPricePointSelectedMonth}</span>
              </h3>
              <span className="unit-price-modal-subtitle">
                Itemized breakdown of unit prices, purchase quantity, and spend for {unitPricePointSelectedMonth}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="unit-price-modal-close-btn"
            onClick={onClose}
            title="Close Modal"
          >
            <X width={18} height={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="unit-price-modal-body">
          {/* KPI Summary Cards Bar */}
          <div className="unit-price-kpi-grid">
            <div className="unit-price-kpi-card month">
              <span className="unit-price-kpi-label">Selected Month</span>
              <div className="unit-price-kpi-value purple">
                {unitPricePointSelectedMonth || '-'}
              </div>
            </div>
            <div className="unit-price-kpi-card records">
              <span className="unit-price-kpi-label">Total Records</span>
              <div className="unit-price-kpi-value dark">
                {unitPricePointTotalRecords.toLocaleString()}
              </div>
            </div>
            <div className="unit-price-kpi-card price">
              <span className="unit-price-kpi-label">Total Unit Price</span>
              <div className="unit-price-kpi-value blue">
                AED {Number(unitPricePointTotalUnitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Controls Bar: Material & Supplier Filters */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.75rem 1.25rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <Search width={14} height={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search material or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.375rem 0.75rem 0.375rem 2.125rem',
                  fontSize: '0.8125rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Filter Material:</span>
                <SearchableSingleSelect
                  value={selectedMaterialFilter}
                  onChange={(val) => setSelectedMaterialFilter(val)}
                  options={Array.from(new Set(unitPricePointData.map((it: any) => it.material).filter(Boolean))).sort()}
                  placeholder="Search material..."
                  allLabel="All Materials"
                  minWidth="180px"
                  maxWidth="240px"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Filter Supplier:</span>
                <SearchableSingleSelect
                  value={selectedSupplierFilter}
                  onChange={(val) => setSelectedSupplierFilter(val)}
                  options={Array.from(new Set(unitPricePointData.map((it: any) => it.supplier).filter(Boolean))).sort()}
                  placeholder="Search supplier..."
                  allLabel="All Suppliers"
                  minWidth="180px"
                  maxWidth="240px"
                />
              </div>
            </div>
          </div>

          {/* Details Data Table */}
          <div className="unit-price-table-wrapper">
            {unitPricePointLoading ? (
              <div style={{ padding: '3.5rem', textAlign: 'center' }}>
                <SpinnerLoaders size="small" text="Loading unit price details..." fullScreen={false} />
              </div>
            ) : filteredData.length === 0 ? (
              <div style={{ padding: '3.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
                No unit price details records found matching your filters for {unitPricePointSelectedMonth}.
              </div>
            ) : (
              <table className="unit-price-table">
                <thead>
                  <tr>
                    <th style={{ width: '32%', textAlign: 'left' }}>Supplier</th>
                    <th style={{ width: '36%', textAlign: 'left' }}>Material</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Quantity</th>
                    <th style={{ width: '11%', textAlign: 'right' }}>Spend</th>
                    <th style={{ width: '11%', textAlign: 'right' }}>Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: '#334155', fontSize: '0.75rem' }}>
                        {item.supplier || '-'}
                      </td>
                      <td
                        className="unit-price-material-link"
                        onClick={() => {
                          onClose();
                          handleBarRowClick({
                            material_name: item.material,
                            total_spend: item.spend || 0
                          });
                        }}
                        title={`Click to open Material Unit Price & Spend for "${item.material}"`}
                        style={{ fontSize: '0.75rem' }}
                      >
                        {item.material || '-'}
                      </td>
                      <td style={{ textAlign: 'right', color: '#0f172a', fontWeight: 600, fontSize: '0.75rem' }}>
                        {Number(item.quantity || 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.75rem' }}>
                        AED {Math.round(item.spend || 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.75rem' }}>
                        AED {Number(item.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal Footer / Pagination Bar */}
        <div className="unit-price-modal-footer">
          <div className="unit-price-footer-info">
            Showing Page <strong>{unitPricePointPage}</strong> of <strong>{Math.ceil(unitPricePointTotalRecords / unitPricePointPageSize) || 1}</strong>
          </div>
          <div className="unit-price-pagination-btns">
            <button
              type="button"
              className="unit-price-page-btn"
              disabled={unitPricePointPage <= 1 || unitPricePointLoading}
              onClick={() => {
                const newP = unitPricePointPage - 1;
                setUnitPricePointPage(newP);
                loadUnitPricePointDetails(unitPricePointSelectedMonth, newP);
              }}
            >
              Previous
            </button>
            <button
              type="button"
              className="unit-price-page-btn"
              disabled={unitPricePointPage >= Math.ceil(unitPricePointTotalRecords / unitPricePointPageSize) || unitPricePointLoading}
              onClick={() => {
                const newP = unitPricePointPage + 1;
                setUnitPricePointPage(newP);
                loadUnitPricePointDetails(unitPricePointSelectedMonth, newP);
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
