import React from 'react';
import { X, Copy, HelpCircle, TrendingUp, Building2, Layers, DollarSign, Package } from 'lucide-react';
import { toast } from 'react-toastify';

export interface PointDetailData {
  supplier: string;
  material?: string;
  month: string;
  unitPrice: number;
  qty: number | null;
  amount: number | null;
  outlet: string[] | string | null;
  costCenter: string[] | string | null;
}

interface GraphPointDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pointData: PointDetailData | null;
  onRaiseQuery: (data: {
    supplierName: string;
    materialName: string;
    fromDate?: string;
    toDate?: string;
    title: string;
    message: string;
  }) => void;
}

export const GraphPointDetailModal: React.FC<GraphPointDetailModalProps> = React.memo(({
  isOpen,
  onClose,
  pointData,
  onRaiseQuery,
}) => {
  if (!isOpen || !pointData) return null;

  const { supplier, material, month, unitPrice, qty, amount, outlet, costCenter } = pointData;

  const outletsList: string[] = Array.isArray(outlet)
    ? outlet.filter(Boolean)
    : outlet ? [String(outlet)] : [];

  const costCentersList: string[] = Array.isArray(costCenter)
    ? costCenter.filter(Boolean)
    : costCenter ? [String(costCenter)] : [];

  const handleCopyDetails = () => {
    const lines = [
      `Supplier Name: ${supplier}`,
      `Material Name: ${material || 'N/A'}`,
      `Date: ${month}`,
      `Unit Price: AED ${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('Point details copied to clipboard!');
  };

  const handleRaiseQueryClick = () => {
    const matName = material || '';
    const outletsStr = outletsList.length > 0 ? outletsList.join(', ') : 'N/A';
    const costCentersStr = costCentersList.length > 0 ? costCentersList.join(', ') : 'N/A';

    onRaiseQuery({
      supplierName: supplier,
      materialName: matName,
      fromDate: month,
      toDate: month,
      title: `Query regarding ${matName || supplier} (${month})`,
      message: `Query details for ${matName || 'Item'} supplied by ${supplier} for ${month}:\n- Unit Price: AED ${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n- Quantity: ${qty !== null ? qty.toLocaleString() : 'N/A'}\n- Total Spend: AED ${amount !== null ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}\n- Outlets: ${outletsStr}\n- Cost Centers: ${costCentersStr}`
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99990,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.875rem',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.625rem',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #bfdbfe'
              }}
            >
              <TrendingUp width={20} height={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a' }}>
                  Point Details
                </h3>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#2563eb',
                    backgroundColor: '#eff6ff',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #bfdbfe'
                  }}
                >
                  {month}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginTop: '0.125rem', display: 'block' }}>
                Unit price, spend, outlets, and cost center breakdown
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '0.375rem',
              borderRadius: '0.375rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s'
            }}
            title="Close Modal"
          >
            <X width={20} height={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Supplier & Material Banner */}
          <div
            style={{
              padding: '0.875rem 1rem',
              backgroundColor: '#f1f5f9',
              borderRadius: '0.625rem',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Supplier:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>{supplier}</span>
            </div>
            {material && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Material:</span>
                <span style={{ fontWeight: 700, color: '#2563eb' }}>{material}</span>
              </div>
            )}
          </div>

          {/* KPI Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <div
              style={{
                padding: '0.875rem',
                borderRadius: '0.625rem',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#1e40af', fontSize: '0.75rem', fontWeight: 600 }}>
                <DollarSign width={14} height={14} />
                <span>Unit Price</span>
              </div>
              <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#1e3a8a' }}>
                AED {unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div
              style={{
                padding: '0.875rem',
                borderRadius: '0.625rem',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#166534', fontSize: '0.75rem', fontWeight: 600 }}>
                <DollarSign width={14} height={14} />
                <span>Total Spend</span>
              </div>
              <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#14532d' }}>
                {amount !== null ? `AED ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
              </span>
            </div>

            <div
              style={{
                padding: '0.875rem',
                borderRadius: '0.625rem',
                backgroundColor: '#faf5ff',
                border: '1px solid #e9d5ff',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#6b21a8', fontSize: '0.75rem', fontWeight: 600 }}>
                <Package width={14} height={14} />
                <span>Quantity</span>
              </div>
              <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#581c87' }}>
                {qty !== null ? qty.toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>

          {/* Outlets Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
              <Building2 width={15} height={15} style={{ color: '#2563eb' }} />
              <h4 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>
                Outlets ({outletsList.length})
              </h4>
            </div>
            {outletsList.length === 0 ? (
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No outlets recorded for this period.</span>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.375rem',
                  maxHeight: '110px',
                  overflowY: 'auto',
                  padding: '0.625rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0'
                }}
              >
                {outletsList.map((o, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#1e40af',
                      backgroundColor: '#ffffff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '0.375rem',
                      padding: '0.2rem 0.5rem',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                  >
                    {o}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Cost Centers Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
              <Layers width={15} height={15} style={{ color: '#475569' }} />
              <h4 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>
                Cost Centers ({costCentersList.length})
              </h4>
            </div>
            {costCentersList.length === 0 ? (
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No cost centers recorded for this period.</span>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.375rem',
                  maxHeight: '110px',
                  overflowY: 'auto',
                  padding: '0.625rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0'
                }}
              >
                {costCentersList.map((cc, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#334155',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.375rem',
                      padding: '0.2rem 0.5rem',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                  >
                    {cc}
                  </span>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            onClick={handleCopyDetails}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.875rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <Copy width={14} height={14} />
            <span>Copy Details</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleRaiseQueryClick}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.5rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 700,
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <HelpCircle width={15} height={15} />
              <span>Raise Query</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '0.5rem',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
