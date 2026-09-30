import React from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, X, Grid } from 'lucide-react';
import { SearchableSingleSelect } from './SearchableSingleSelect';
import { fetchSpendMaterials, fetchSpendSuppliers } from '../../../api/SpendApi';

interface KraljicMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  kraljicData: any;
  kraljicLoading?: boolean;
  selectedKraljicQuadrant: 'all' | 'strategic_items' | 'leverage_items' | 'bottleneck_items' | 'non_critical_items';
  setSelectedKraljicQuadrant: (quadrant: 'all' | 'strategic_items' | 'leverage_items' | 'bottleneck_items' | 'non_critical_items') => void;
  kraljicModalSearchQuery: string;
  setKraljicModalSearchQuery: (query: string) => void;
  kraljicSupplierFilter: string;
  setKraljicSupplierFilter: (supplier: string) => void;
  kraljicMaterialFilter?: string;
  setKraljicMaterialFilter?: (material: string) => void;
  kraljicSortField: 'material' | 'quadrant' | 'spend' | 'quantity' | 'suppliers' | 'action';
  setKraljicSortField: React.Dispatch<React.SetStateAction<'material' | 'quadrant' | 'spend' | 'quantity' | 'suppliers' | 'action'>>;
  kraljicSortOrder: 'asc' | 'desc';
  setKraljicSortOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  initialSuppliers: string[];
  initialMaterials?: string[];
  handleBarRowClick: (item: { material_name: string; total_spend: number }) => void;
  kraljicPage?: number;
  setKraljicPage?: (page: number) => void;
  kraljicPageSize?: number;
  setKraljicPageSize?: (pageSize: number) => void;
  loadKraljicMatrixData?: (overridePage?: number, overridePageSize?: number) => void;
}

export const KraljicMatrixModal: React.FC<KraljicMatrixModalProps> = React.memo(({
  isOpen,
  onClose,
  kraljicData,
  kraljicLoading,
  selectedKraljicQuadrant,
  setSelectedKraljicQuadrant,
  kraljicModalSearchQuery,
  setKraljicModalSearchQuery,
  kraljicSupplierFilter,
  setKraljicSupplierFilter,
  kraljicMaterialFilter,
  setKraljicMaterialFilter,
  kraljicSortField,
  setKraljicSortField,
  kraljicSortOrder,
  setKraljicSortOrder,
  initialSuppliers,
  initialMaterials,
  handleBarRowClick,
  kraljicPage,
  setKraljicPage,
  kraljicPageSize,
  setKraljicPageSize,
  loadKraljicMatrixData,
}) => {
  const [internalMaterialFilter, setInternalMaterialFilter] = React.useState<string>('');
  const materialFilterVal = kraljicMaterialFilter !== undefined ? kraljicMaterialFilter : internalMaterialFilter;
  const handleMaterialFilterChange = setKraljicMaterialFilter || setInternalMaterialFilter;

  const [internalPage, setInternalPage] = React.useState<number>(1);
  const [internalPageSize, setInternalPageSize] = React.useState<number>(25);

  const page = kraljicPage !== undefined ? kraljicPage : internalPage;
  const pageSize = kraljicPageSize !== undefined ? kraljicPageSize : internalPageSize;

  const handlePageChange = (newPage: number) => {
    if (setKraljicPage) setKraljicPage(newPage);
    setInternalPage(newPage);
    if (loadKraljicMatrixData) {
      loadKraljicMatrixData(newPage, pageSize);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    if (setKraljicPageSize) setKraljicPageSize(newPageSize);
    setInternalPageSize(newPageSize);
    if (setKraljicPage) setKraljicPage(1);
    setInternalPage(1);
    if (loadKraljicMatrixData) {
      loadKraljicMatrixData(1, newPageSize);
    }
  };

  const [dynamicMaterials, setDynamicMaterials] = React.useState<string[]>([]);
  const [dynamicSuppliers, setDynamicSuppliers] = React.useState<string[]>([]);
  const [materialSearchLoading, setMaterialSearchLoading] = React.useState<boolean>(false);
  const [supplierSearchLoading, setSupplierSearchLoading] = React.useState<boolean>(false);

  const handleMaterialSearch = React.useCallback(async (query: string) => {
    if (!query || query.trim().length === 0) return;
    setMaterialSearchLoading(true);
    try {
      const res = await fetchSpendMaterials({
        type: "PROCUREMENT_PERFORMANCE",
        search: query.trim(),
        page: 1,
        page_size: 50
      });
      if (res && (res.status === 'success' || res.status === 200 || res.data)) {
        const rawItems = res.data?.materials || res.data?.items || res.materials || (Array.isArray(res.data) ? res.data : []);
        const fetchedCodes = rawItems.map((m: any) => {
          if (typeof m === 'string') return m;
          return m.material_code || m.material_name || m.code || m.name || m.material;
        }).filter(Boolean);

        if (fetchedCodes.length > 0) {
          setDynamicMaterials(prev => Array.from(new Set([...prev, ...fetchedCodes])));
        }
      }
    } catch (err) {
      console.warn("Failed to fetch dynamic material search results", err);
    } finally {
      setMaterialSearchLoading(false);
    }
  }, []);

  const handleSupplierSearch = React.useCallback(async (query: string) => {
    if (!query || query.trim().length === 0) return;
    setSupplierSearchLoading(true);
    try {
      const res = await fetchSpendSuppliers({
        type: "PROCUREMENT_PERFORMANCE",
        search: query.trim(),
        page: 1,
        page_size: 50
      });
      if (res && (res.status === 'success' || res.status === 200 || res.data)) {
        const rawItems = res.data?.suppliers || res.data?.items || res.suppliers || (Array.isArray(res.data) ? res.data : []);
        const fetchedSuppliers = rawItems.map((s: any) => {
          if (typeof s === 'string') return s;
          return s.supplier_name || s.supplier || s.name;
        }).filter(Boolean);

        if (fetchedSuppliers.length > 0) {
          setDynamicSuppliers(prev => Array.from(new Set([...prev, ...fetchedSuppliers])));
        }
      }
    } catch (err) {
      console.warn("Failed to fetch dynamic supplier search results", err);
    } finally {
      setSupplierSearchLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isOpen) {
      setInternalMaterialFilter('');
      setInternalPage(1);
    }
  }, [isOpen]);

  React.useEffect(() => {
    handlePageChange(1);
  }, [selectedKraljicQuadrant, kraljicModalSearchQuery, kraljicSupplierFilter, materialFilterVal, kraljicSortField, kraljicSortOrder]);

  if (!isOpen) return null;

  const handleKraljicSort = (field: 'material' | 'quadrant' | 'spend' | 'quantity' | 'suppliers' | 'action') => {
    if (kraljicSortField === field) {
      setKraljicSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setKraljicSortField(field);
      setKraljicSortOrder('desc');
    }
  };

  const renderKraljicSortIcon = (field: 'material' | 'quadrant' | 'spend' | 'quantity' | 'suppliers' | 'action') => {
    const isActive = kraljicSortField === field;
    if (!isActive) {
      return <ArrowUpDown width={11} height={11} style={{ color: '#94a3b8', flexShrink: 0 }} />;
    }
    return kraljicSortOrder === 'asc' ? (
      <ArrowUp width={11} height={11} style={{ color: '#2563eb', flexShrink: 0 }} />
    ) : (
      <ArrowDown width={11} height={11} style={{ color: '#2563eb', flexShrink: 0 }} />
    );
  };

  const matrix = kraljicData?.kraljic_matrix || {};
  let allItems: Array<{
    material: string;
    total_spend_value: number;
    total_quantity?: number;
    unit?: string;
    uom?: string;
    unique_suppliers_count: number;
    supplier_names: string[];
    primaryCadence?: string;
    quadrantKey: string;
    quadrantTitle: string;
    whyItIsHere?: string;
    businessReason?: string;
    badgeBg: string;
    badgeColor: string;
    action: string;
  }> = [];

  const quadrantConfigs: Record<string, { title: string; bg: string; color: string; action: string }> = {
    strategic_items: { title: 'Strategic Items', bg: '#fee2e2', color: '#991b1b', action: 'Strategic Partnership & Risk Mitigation' },
    leverage_items: { title: 'Leverage Items', bg: '#dcfce7', color: '#15803d', action: 'Drive Market Competition & Savings' },
    bottleneck_items: { title: 'Bottleneck Items', bg: '#ffedd5', color: '#c2410c', action: 'Secure Supply & Contractual Buffer' },
    non_critical_items: { title: 'Non-Critical Items', bg: '#f1f5f9', color: '#475569', action: 'Automate POs & Simplify Purchasing' },
  };

  const keysToInclude = selectedKraljicQuadrant === 'all'
    ? ['strategic_items', 'leverage_items', 'bottleneck_items', 'non_critical_items']
    : [selectedKraljicQuadrant];

  const qExplanations = kraljicData?.quadrant_explanations || {};

  keysToInclude.forEach(qKey => {
    const qObj = matrix[qKey];
    const qExp = qExplanations[qKey];
    const cfg = quadrantConfigs[qKey] || { title: qKey, bg: '#e2e8f0', color: '#334155', action: '-' };
    if (qObj && Array.isArray(qObj.items)) {
      qObj.items.forEach((it: any) => {
        const sups = it.supplier_names || (it.suppliers ? (Array.isArray(it.suppliers) ? it.suppliers : [it.suppliers]) : []);
        const statusObj = it.status || {};
        const statusValues = Object.values(statusObj) as any[];
        const cadence = statusValues.length > 0 ? statusValues[0]?.status : undefined;
        const qtyVal = it.total_quantity !== undefined ? it.total_quantity : (it.quantity !== undefined ? it.quantity : (it.total_quantity_value !== undefined ? it.total_quantity_value : (it.qty !== undefined ? it.qty : 0)));

        allItems.push({
          ...it,
          supplier_names: sups,
          primaryCadence: cadence,
          total_quantity: qtyVal,
          quadrantKey: qKey,
          quadrantTitle: qExp?.title || cfg.title,
          whyItIsHere: qExp?.why_it_is_here || '',
          businessReason: qExp?.business_reason || cfg.action,
          badgeBg: cfg.bg,
          badgeColor: cfg.color,
          action: qExp?.business_reason || cfg.action
        });
      });
    }
  });

  if (kraljicSupplierFilter) {
    allItems = allItems.filter(it => (it.supplier_names || []).includes(kraljicSupplierFilter));
  }

  if (materialFilterVal) {
    allItems = allItems.filter(it => String(it.material || '').toLowerCase() === materialFilterVal.toLowerCase());
  }

  if (kraljicModalSearchQuery.trim()) {
    const q = kraljicModalSearchQuery.toLowerCase();
    allItems = allItems.filter(it => it.material && String(it.material).toLowerCase().includes(q));
  }

  const sortedItems = [...allItems].sort((a, b) => {
    let valA: any;
    let valB: any;
    if (kraljicSortField === 'material') {
      valA = String(a.material || '').toLowerCase();
      valB = String(b.material || '').toLowerCase();
    } else if (kraljicSortField === 'quadrant') {
      valA = String(a.quadrantTitle || '').toLowerCase();
      valB = String(b.quadrantTitle || '').toLowerCase();
    } else if (kraljicSortField === 'spend') {
      valA = Number(a.total_spend_value) || 0;
      valB = Number(b.total_spend_value) || 0;
    } else if (kraljicSortField === 'quantity') {
      valA = Number(a.total_quantity) || 0;
      valB = Number(b.total_quantity) || 0;
    } else if (kraljicSortField === 'suppliers') {
      valA = Number(a.unique_suppliers_count) || 0;
      valB = Number(b.unique_suppliers_count) || 0;
    } else if (kraljicSortField === 'action') {
      valA = (a.action || '').toLowerCase();
      valB = (b.action || '').toLowerCase();
    }
    if (valA < valB) return kraljicSortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return kraljicSortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const getTotalItemsCount = (): number => {
    if (!kraljicData) return sortedItems.length;

    if (selectedKraljicQuadrant !== 'all') {
      const qObj = matrix[selectedKraljicQuadrant];
      if (qObj) {
        const qTotal = qObj.total_items_in_quadrant ?? qObj.total_items ?? qObj.total_count ?? qObj.total_records;
        if (typeof qTotal === 'number' && qTotal > 0) {
          return qTotal;
        }
      }
    }

    const rootTotal = kraljicData.total_items ?? kraljicData.total_count ?? kraljicData.total_records;
    if (typeof rootTotal === 'number' && rootTotal > 0) {
      return rootTotal;
    }

    const sumQuadrants = (matrix.strategic_items?.total_items_in_quadrant || 0) +
                         (matrix.leverage_items?.total_items_in_quadrant || 0) +
                         (matrix.bottleneck_items?.total_items_in_quadrant || 0) +
                         (matrix.non_critical_items?.total_items_in_quadrant || 0);
    if (sumQuadrants > 0) {
      return sumQuadrants;
    }

    if (kraljicData.calculation_methodology?.total_analyzed_materials) {
      return kraljicData.calculation_methodology.total_analyzed_materials;
    }

    return sortedItems.length;
  };

  const totalItemsCount = getTotalItemsCount();
  const itemsToDisplay = sortedItems.length > pageSize
    ? sortedItems.slice((page - 1) * pageSize, page * pageSize)
    : sortedItems.slice(0, pageSize);

  return (
    <div className="kraljic-modal-overlay" onClick={onClose}>
      <div className="kraljic-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="kraljic-modal-header">
          <div className="kraljic-modal-header-left">
            <div className="kraljic-modal-icon-badge">
              <Grid width={20} height={20} />
            </div>
            <div>
              <h3 className="kraljic-modal-title">
                Kraljic Strategic Portfolio Matrix <span className="kraljic-modal-tag">Detailed Analysis</span>
              </h3>
              <span className="kraljic-modal-subtitle">
                Categorizes materials by Financial Impact vs. Supply Risk for procurement optimization
              </span>
            </div>
          </div>
          <button type="button" className="kraljic-modal-close-btn" onClick={onClose} title="Close Modal">
            <X width={18} height={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {kraljicData ? (
            <>
              {/* Executive Methodology & Thresholds Banner */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', padding: '0.875rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.375rem', padding: '0.5rem 0.75rem' }}>
                  <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>SPEND CUTOFF (MEDIAN)</span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                    AED {(kraljicData?.thresholds?.median_spend_cutoff || 1800).toLocaleString()}
                  </div>
                </div>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.375rem', padding: '0.5rem 0.75rem' }}>
                  <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>SUPPLIER CUTOFF (MEDIAN)</span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                    {kraljicData?.thresholds?.median_supplier_count || 1} Supplier(s)
                  </div>
                </div>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.375rem', padding: '0.5rem 0.75rem' }}>
                  <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>ANALYZED MATERIALS</span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#2563eb' }}>
                    {(kraljicData?.calculation_methodology?.total_analyzed_materials || 26560).toLocaleString()} SKUs
                  </div>
                </div>
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.375rem', padding: '0.5rem 0.75rem' }}>
                  <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>GRAND TOTAL SPEND</span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#10b981' }}>
                    AED {Math.round(kraljicData?.calculation_methodology?.grand_total_spend_value || 500634640).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Quadrant Selection Tabs */}
              <div className="kraljic-tabs-bar">
                <button
                  type="button"
                  onClick={() => setSelectedKraljicQuadrant('all')}
                  className={`kraljic-tab-btn ${selectedKraljicQuadrant === 'all' ? 'active-all' : ''}`}
                >
                  📊 All Quadrants
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedKraljicQuadrant('strategic_items')}
                  className={`kraljic-tab-btn ${selectedKraljicQuadrant === 'strategic_items' ? 'active-strategic' : ''}`}
                >
                  🎉 Strategic Items ({matrix.strategic_items?.total_items_in_quadrant || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedKraljicQuadrant('leverage_items')}
                  className={`kraljic-tab-btn ${selectedKraljicQuadrant === 'leverage_items' ? 'active-leverage' : ''}`}
                >
                  🎯 Leverage Items ({matrix.leverage_items?.total_items_in_quadrant || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedKraljicQuadrant('bottleneck_items')}
                  className={`kraljic-tab-btn ${selectedKraljicQuadrant === 'bottleneck_items' ? 'active-bottleneck' : ''}`}
                >
                  ⚠️ Bottleneck Items ({matrix.bottleneck_items?.total_items_in_quadrant || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedKraljicQuadrant('non_critical_items')}
                  className={`kraljic-tab-btn ${selectedKraljicQuadrant === 'non_critical_items' ? 'active-non_critical' : ''}`}
                >
                  ⚙️ Non-Critical Items ({matrix.non_critical_items?.total_items_in_quadrant || 0})
                </button>
              </div>

              {/* Selected Quadrant Reason Banner */}
              {selectedKraljicQuadrant !== 'all' && qExplanations[selectedKraljicQuadrant] && (
                <div style={{ backgroundColor: '#eff6ff', borderBottom: '1px solid #dbeafe', padding: '0.625rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af' }}>
                      {qExplanations[selectedKraljicQuadrant].title}:
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#1e3a8a' }}>
                      {qExplanations[selectedKraljicQuadrant].why_it_is_here}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#2563eb', backgroundColor: '#ffffff', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #bfdbfe' }}>
                    {qExplanations[selectedKraljicQuadrant].business_reason}
                  </span>
                </div>
              )}

              {/* Controls: Search Bar & Supplier Filter */}
              <div className="kraljic-controls-bar">
                <div className="kraljic-search-wrapper">
                  <Search width={15} height={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search material in matrix..."
                    value={kraljicModalSearchQuery}
                    onChange={(e) => setKraljicModalSearchQuery(e.target.value)}
                    className="kraljic-search-input"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Filter Material:</span>
                  <SearchableSingleSelect
                    value={materialFilterVal}
                    onChange={(val) => handleMaterialFilterChange(val)}
                    onSearch={handleMaterialSearch}
                    loading={materialSearchLoading}
                    options={Array.from(new Set([
                      ...(initialMaterials || []),
                      ...dynamicMaterials,
                      ...(kraljicData?.kraljic_matrix?.bottleneck_items?.items || []).map((it: any) => it.material),
                      ...(kraljicData?.kraljic_matrix?.strategic_items?.items || []).map((it: any) => it.material),
                      ...(kraljicData?.kraljic_matrix?.leverage_items?.items || []).map((it: any) => it.material),
                      ...(kraljicData?.kraljic_matrix?.non_critical_items?.items || []).map((it: any) => it.material)
                    ])).filter(Boolean).sort()}
                    placeholder="Search material..."
                    allLabel="All Materials"
                    minWidth="180px"
                    maxWidth="240px"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Filter Supplier:</span>
                  <SearchableSingleSelect
                    value={kraljicSupplierFilter}
                    onChange={(val) => setKraljicSupplierFilter(val)}
                    onSearch={handleSupplierSearch}
                    loading={supplierSearchLoading}
                    options={Array.from(new Set([
                      ...initialSuppliers,
                      ...dynamicSuppliers,
                      ...(kraljicData?.kraljic_matrix?.bottleneck_items?.items || []).flatMap((it: any) => it.supplier_names || it.suppliers || []),
                      ...(kraljicData?.kraljic_matrix?.strategic_items?.items || []).flatMap((it: any) => it.supplier_names || it.suppliers || []),
                      ...(kraljicData?.kraljic_matrix?.leverage_items?.items || []).flatMap((it: any) => it.supplier_names || it.suppliers || []),
                      ...(kraljicData?.kraljic_matrix?.non_critical_items?.items || []).flatMap((it: any) => it.supplier_names || it.suppliers || [])
                    ])).filter(Boolean).sort()}
                    placeholder="Search supplier..."
                    allLabel="All Suppliers"
                    minWidth="180px"
                    maxWidth="240px"
                  />
                </div>
              </div>

              {/* Items List Table */}
              <div className="kraljic-table-wrapper">
                <table className="kraljic-table">
                  <thead>
                    <tr>
                      <th
                        onClick={() => handleKraljicSort('material')}
                        style={{ width: '30%', cursor: 'pointer' }}
                        title="Click to sort by Material Name"
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                          <span>Material Name</span>
                          {renderKraljicSortIcon('material')}
                        </span>
                      </th>
                      <th
                        onClick={() => handleKraljicSort('quadrant')}
                        style={{ width: '16%', textAlign: 'center', cursor: 'pointer' }}
                        title="Click to sort by Quadrant"
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', width: '100%' }}>
                          <span>Quadrant</span>
                          {renderKraljicSortIcon('quadrant')}
                        </span>
                      </th>
                      <th
                        onClick={() => handleKraljicSort('spend')}
                        style={{ width: '14%', textAlign: 'right', cursor: 'pointer' }}
                        title="Click to sort by Total Spend Value"
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem', width: '100%' }}>
                          <span>Total Spend</span>
                          {renderKraljicSortIcon('spend')}
                        </span>
                      </th>
                      <th
                        onClick={() => handleKraljicSort('quantity')}
                        style={{ width: '12%', textAlign: 'right', cursor: 'pointer' }}
                        title="Click to sort by Total Quantity"
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem', width: '100%' }}>
                          <span>Quantity</span>
                          {renderKraljicSortIcon('quantity')}
                        </span>
                      </th>
                      <th
                        onClick={() => handleKraljicSort('suppliers')}
                        style={{ width: '18%', cursor: 'pointer' }}
                        title="Click to sort by Unique Suppliers"
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                          <span>Supplier(s)</span>
                          {renderKraljicSortIcon('suppliers')}
                        </span>
                      </th>
                      <th
                        style={{ width: '10%', textAlign: 'center' }}
                        title="Purchase Frequency Cadence"
                      >
                        <span>Cadence</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsToDisplay.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
                          No material items found for the selected quadrant or search.
                        </td>
                      </tr>
                    ) : (
                      itemsToDisplay.map((it, idx) => {
                        const displayMaterial = (it.material || '').replace(/\s*\(\s*\)$/, '').trim();
                        const supListStr = (it.supplier_names || []).join(', ');
                        const totalQty = it.total_quantity;

                        return (
                          <tr key={idx}>
                            <td
                              style={{
                                fontWeight: 600,
                                color: '#2563eb',
                                cursor: 'pointer'
                              }}
                              onClick={() => {
                                onClose();
                                handleBarRowClick({
                                  material_name: displayMaterial,
                                  total_spend: it.total_spend_value || 0
                                });
                              }}
                              title={`Click to open Material Unit Price & Spend analysis for "${displayMaterial}"`}
                            >
                              {displayMaterial}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '999px', backgroundColor: it.badgeBg, color: it.badgeColor, border: `1px solid ${it.badgeColor}33`, whiteSpace: 'nowrap' }}>
                                {it.quadrantTitle}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                              AED {Math.round(it.total_spend_value || 0).toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                              {totalQty !== undefined && totalQty !== null && !isNaN(totalQty) && totalQty > 0
                                ? `${Number(totalQty).toLocaleString()} ${it.unit || it.uom || ''}`.trim()
                                : '-'}
                            </td>
                            <td style={{ color: '#334155', fontSize: '0.75rem' }} title={supListStr}>
                              <strong style={{ color: '#0f172a' }}>{it.unique_suppliers_count}</strong>
                              {supListStr ? <span style={{ color: '#64748b' }}> ({supListStr})</span> : ''}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {it.primaryCadence ? (
                                <span className="kraljic-cadence-badge">
                                  {it.primaryCadence}
                                </span>
                              ) : '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal Pagination Footer */}
              <div style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>
                  Showing <strong style={{ color: '#0f172a' }}>{totalItemsCount > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to <strong style={{ color: '#0f172a' }}>{Math.min(page * pageSize, totalItemsCount)}</strong> of <strong style={{ color: '#0f172a' }}>{totalItemsCount.toLocaleString()}</strong> items
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#475569' }}>
                    <span>Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1', fontSize: '0.75rem', color: '#0f172a', backgroundColor: '#ffffff', cursor: 'pointer' }}
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <button
                      type="button"
                      disabled={page <= 1 || kraljicLoading}
                      onClick={() => handlePageChange(page - 1)}
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: '0.25rem', border: '1px solid #cbd5e1', backgroundColor: page <= 1 || kraljicLoading ? '#f1f5f9' : '#ffffff', color: page <= 1 || kraljicLoading ? '#94a3b8' : '#334155', cursor: page <= 1 || kraljicLoading ? 'not-allowed' : 'pointer' }}
                    >
                      &lt; Prev
                    </button>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', borderRadius: '0.25rem', border: '1px solid #bfdbfe' }}>
                      {page}
                    </span>
                    <button
                      type="button"
                      disabled={(page * pageSize >= totalItemsCount) || kraljicLoading}
                      onClick={() => handlePageChange(page + 1)}
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: '0.25rem', border: '1px solid #cbd5e1', backgroundColor: (page * pageSize >= totalItemsCount) || kraljicLoading ? '#f1f5f9' : '#ffffff', color: (page * pageSize >= totalItemsCount) || kraljicLoading ? '#94a3b8' : '#334155', cursor: (page * pageSize >= totalItemsCount) || kraljicLoading ? 'not-allowed' : 'pointer' }}
                    >
                      Next &gt;
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
              No Kraljic Matrix data available for selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
