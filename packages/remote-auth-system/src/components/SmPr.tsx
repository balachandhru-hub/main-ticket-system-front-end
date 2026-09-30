import React, { useState, useEffect, useRef } from 'react';
import './SmPr.css';
import { useLocation, useNavigate, } from 'react-router-dom';
import SmPrMaterial from './SmMaterial';
import BulkUploadModal from './BulkUploadModal';
import { ChevronDown, X, Check, Search } from 'lucide-react';
import { FiEdit } from 'react-icons/fi';
import { filterServicePR } from '../api/filterServicePRApi';
import { createServicePR } from '../api/servicePRApi';
import type { ServicePRDto } from '../Dto/CreateServicePRDto';
import {
  fetchGLAccounts,
  fetchCostCenters,
} from '../api/PulseReportFilterApi';
import { fetchMaterialCodes } from '../api/filterMaterialPRApi';
import type { GetServiceLineItemDto, FilterServicePRRequest } from '../Dto/FilterServicePRDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import { toast } from 'react-toastify';
import ErrorModel from './ErrorModel';

interface LineItem extends Omit<GetServiceLineItemDto, 'status'> {
  id: string;
  lineNo: number;
  uniqueId: string;
  status?: string;
  prServiceUniqueName?: string;
}

interface PrItem {
  prNumber: string;
  prUniqueName: string;
  lineItems: LineItem[];
}

interface FilterValues {
  glAccounts: string[];
  costCenters: string[];
  materialCode: string[];
  fromDate: string;
  toDate: string;
  searchQuery: string;
  serviceStartDate: string;
  serviceEndDate: string;
}

interface FilterOptions {
  glAccounts: string[];
  costCenters: string[];
  materialCode: string[];
}



interface DropdownState {
  [key: string]: boolean;
}

interface SearchState {
  [key: string]: string;
}

const SmPr: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownMenuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const debounceTimerRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const [activeTab, setActiveTab] = useState<'service' | 'material'>(location.state?.type || 'service');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // Data State
  const [prData, setPrData] = useState<PrItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);

  // Filters
  const [tempFilters, setTempFilters] = useState<FilterValues>({
    glAccounts: [],
    costCenters: [],
    materialCode: [],
    fromDate: '',
    toDate: '',
    searchQuery: '',
    serviceStartDate: '',
    serviceEndDate: '',
  });

  const [appliedFilters, setAppliedFilters] = useState<FilterValues>({
    glAccounts: [],
    costCenters: [],
    materialCode: [],
    fromDate: '',
    toDate: '',
    searchQuery: '',
    serviceStartDate: '',
    serviceEndDate: '',
  });

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    glAccounts: [],
    costCenters: [],
    materialCode: [],
  });

  const [dropdownOpen, setDropdownOpen] = useState<DropdownState>({
    glAccounts: false,
    costCenters: false,
    materialCode: false,
  });

  const [searchQueries, setSearchQueries] = useState<SearchState>({
    glAccounts: '',
    costCenters: '',
    materialCode: '',
  });



  const [applyingFilter, setApplyingFilter] = useState<boolean>(false);
  const [clearingFilter, setClearingFilter] = useState<boolean>(false);
  const [showSessionModal, setShowSessionModal] = useState(false);

  const itemsPerPage = 8;
  const handleTabChange = (tab: 'service' | 'material') => {
    setActiveTab(tab);
  };

  // Load filter options on mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [glAccountsData, costCentersData, materialCodeData] = await Promise.all([
          fetchGLAccounts({ page: 1, page_size: 100 }),
          fetchCostCenters({ page: 1, page_size: 100 }),
          fetchMaterialCodes({ page: 1, page_size: 100 }),
        ]);

        const materialCodeResult = !isErrorResponse(materialCodeData) ? materialCodeData : null;

        setFilterOptions({
          glAccounts: glAccountsData?.gl_accounts || [],
          costCenters: costCentersData?.cost_centers || [],
          materialCode: materialCodeResult?.data || [],
        });


      } catch (error) {
        toast.error('Failed to load filter options');
      }
    };

    if (activeTab === 'service') {
      loadFilterOptions();
    }
  }, [activeTab]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.pr-checkbox-dropdown')) {
        setDropdownOpen(prev => {
          const updated: DropdownState = { ...prev };
          let hasChange = false;
          Object.keys(updated).forEach(key => {
            if (updated[key]) {
              updated[key] = false;
              hasChange = true;
            }
          });
          return hasChange ? updated : prev;
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch data
  useEffect(() => {
    if (activeTab === 'service') {
      fetchServicePRs();
    }
  }, [activeTab, currentIndex, appliedFilters]);

  function isErrorResponse(response: any): response is ErrorResponseDto {
    return !Array.isArray(response) && response && 'statusCode' in response && 'message' in response && 'description' in response;
  }

  const transformData = (rawData: any[]): PrItem[] => {
    const groupedData: { [key: string]: any[] } = {};

    rawData.forEach((item: any) => {
      const key = item.prUniqueName || item.prNumber || `PR-${item.lineItemNumber}`;
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(item);
    });

    return Object.entries(groupedData).map(([key, items]) => {
      const firstItem = items[0];
      return {
        prNumber: firstItem.prNumber || key,
        prUniqueName: firstItem.prUniqueName || key,
        lineItems: items.map((item: any, idx: number) => ({
          ...item,
          id: `${key}-${idx}`,
          lineNo: item.lineItemNumber || idx + 1,
          uniqueId: `UGI${String(idx + 1).padStart(3, '0')}`,
          status: item.status,
          expectedAmount: item.expectedAmount,
          maxAmount: item.maximumAmount || item.maxAmount,
          serviceStartDate: item.serviceStartDate ? item.serviceStartDate.split('T')[0] : item.serviceStartDate,
          serviceEndDate: item.serviceEndDate ? item.serviceEndDate.split('T')[0] : item.serviceEndDate,
          deliveryDate: item.deliveryDate ? item.deliveryDate.split('T')[0] : item.deliveryDate,
          prServiceUniqueName: item.prServiceUniqueName,
          ...item
        } as LineItem)),
      };
    });
  };

  const fetchServicePRs = async () => {
    setLoading(true);
    try {
      const index = currentIndex;
      const fetchLimit = itemsPerPage + 1;

      const filterPayload: FilterServicePRRequest = {
        index,
        limit: fetchLimit,
        searchTerm: appliedFilters.searchQuery || undefined,
        fromDate: appliedFilters.fromDate ? new Date(appliedFilters.fromDate).toISOString().split('T')[0] : undefined,
        toDate: appliedFilters.toDate ? new Date(appliedFilters.toDate).toISOString().split('T')[0] : undefined,
        serviceStartDate: appliedFilters.serviceStartDate ? new Date(appliedFilters.serviceStartDate).toISOString().split('T')[0] : undefined,
        serviceEndDate: appliedFilters.serviceEndDate ? new Date(appliedFilters.serviceEndDate).toISOString().split('T')[0] : undefined,
        status: undefined,
        glAccount: appliedFilters.glAccounts.length > 0 ? appliedFilters.glAccounts : undefined,
        commodity: appliedFilters.materialCode.length > 0 ? appliedFilters.materialCode : undefined, // Commodity maps to materialCode/commodity from API
        costCenter: appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters : undefined,
        companyCode: undefined, // company code not in filter payload pattern
      };

      const response = await filterServicePR(filterPayload);

      if (isErrorResponse(response)) {
        if (response.statusCode === 401) {
          setShowSessionModal(true);
          setPrData([]);
          setHasNextPage(false);
          return;
        }
        toast.error(response.message || 'Failed to fetch Service PRs');
        setPrData([]);
        setHasNextPage(false);
      } else if (response.statusCode === 200 && 'data' in response) {
        const rawData = response.data || [];

        let displayData = rawData;
        if (rawData.length > itemsPerPage) {
          setHasNextPage(true);
          displayData = rawData.slice(0, itemsPerPage);
        } else {
          setHasNextPage(false);
        }

        const transformedData = transformData(displayData);
        setPrData(transformedData);
      }
    } catch (error) {
      toast.error('Error fetching Service PRs');
      setPrData([]);
      setHasNextPage(false);
    } finally {
      setLoading(false);
    }
  };

  // Filter Handlers (Same as SmMaterial but adapted for fields)
  const handleFilterCheckboxChange = (field: keyof FilterValues, value: string) => {
    setTempFilters(prev => {
      const currentArray = (prev[field] as string[]) || [];
      const isSelected = currentArray.includes(value);
      if (isSelected) {
        return { ...prev, [field]: currentArray.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...currentArray, value] };
      }
    });
  };

  const handleSelectAll = (field: keyof FilterValues) => {
    const options = filterOptions[field as keyof FilterOptions];
    let allValues: string[] = [];
    if (Array.isArray(options)) allValues = options as string[];

    setTempFilters(prev => ({
      ...prev,
      [field]: prev[field].length === allValues.length ? [] : allValues
    }));
  };

  const getFilteredOptions = (field: keyof FilterOptions, searchQuery: string) => {
    const options = filterOptions[field];
    if (!options || !Array.isArray(options)) return [];
    const query = searchQuery.toLowerCase();
    return (options as string[]).filter(opt => opt.toLowerCase().includes(query));
  };

  const handleSearchChange = (field: string, value: string) => {
    setSearchQueries(prev => ({ ...prev, [field]: value }));
    if (debounceTimerRef.current[field]) clearTimeout(debounceTimerRef.current[field]);
    debounceTimerRef.current[field] = setTimeout(() => {
      if (field === 'glAccounts' || field === 'costCenters' || field === 'materialCode') {
      }
    }, 500);
  };

  const handleApplyFilter = () => {
    setApplyingFilter(true);
    setAppliedFilters(tempFilters);
    setCurrentIndex(0);
    setCurrentPage(1);
    setTimeout(() => setApplyingFilter(false), 300);
  };

  const handleClearFilter = () => {
    setClearingFilter(true);
    const cleared = { glAccounts: [], costCenters: [], materialCode: [], fromDate: '', toDate: '', searchQuery: '', serviceStartDate: '', serviceEndDate: '' };
    setTempFilters(cleared);
    setAppliedFilters(cleared);
    setCurrentIndex(0);
    setCurrentPage(1);
    setTimeout(() => setClearingFilter(false), 300);
  };

  const toggleRowExpansion = (prNumber: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(prNumber)) newSet.delete(prNumber);
      else newSet.add(prNumber);
      return newSet;
    });
  };

  const handleCreatePr = () => navigate(`/simply-pr/service`);
  const handleEdit = (prItem: PrItem) => navigate(`/simply-pr/service/edit`, { state: { prData: prItem } });

  const handleAction = async (prNumber: string) => {
    const prItem = prData.find(p => p.prNumber === prNumber);
    if (!prItem) return;

    try {
      const payload: ServicePRDto[] = [{
        name: prItem.lineItems[0].title,
        title: prItem.lineItems[0].title,
        companyCode: prItem.lineItems[0].companyCode,
        needBy: prItem.lineItems[0].serviceStartDate ? new Date(prItem.lineItems[0].serviceStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        prServiceUniqueName: prItem.lineItems[0].prServiceUniqueName,
        lineItems: prItem.lineItems.map((item, idx) => ({
          numberInCollection: idx + 1,
          quantity: 1,
          deliveryDate: item.serviceStartDate ? new Date(item.serviceStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          commodityCode: item.commodityCode,
          materialCode: item.materialCode,
          description: item.description,
          amount: typeof item.expectedAmount === 'string' ? parseFloat(item.expectedAmount) : (item.expectedAmount || 0),
          purchaseOrg: item.purchaseOrg,
          purchaseGroup: item.purchaseGroup,
          costCenter: item.costCenter,
          glAccount: item.glAccount,
          expectedAmount: typeof item.expectedAmount === 'string' ? parseFloat(item.expectedAmount) : (item.expectedAmount || 0),
          maxAmount: typeof item.maxAmount === 'string' ? parseFloat(item.maxAmount) : (item.maxAmount || 0),
          needBy: item.serviceStartDate ? new Date(item.serviceStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          companyCode: item.companyCode,
          isServiceChild: true,
          serviceStartDate: item.serviceStartDate ? new Date(item.serviceStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          serviceEndDate: item.serviceEndDate ? new Date(item.serviceEndDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          vendor: item.vendor,
          contract: item.contract,
          billingAddress: item.billTo,
          taxCode: item.taxCode,
        }))
      }];

      // Show loading toast?
      const toastId = toast.loading("Re-submitting PR...");

      const response = await createServicePR(payload);

      if (response.statusCode === 200 || response.statusCode === 201) {
        toast.update(toastId, { render: "PR Re-submitted Successfully!", type: "success", isLoading: false, autoClose: 3000 });
        fetchServicePRs();
      } else {
        toast.update(toastId, { render: `Submission Failed: ${response.message}`, type: "error", isLoading: false, autoClose: 4000 });
      }

    } catch (error) {
      toast.error("An error occurred while re-submitting");
    }
  };

  const handleNext = () => {
    if (hasNextPage) {
      setCurrentIndex(prev => prev + itemsPerPage);
      setCurrentPage(prev => prev + 1);
    } else {
      toast.error('No more data available');
    }
  };

  const handlePrevious = () => {
    if (currentIndex >= itemsPerPage) {
      setCurrentIndex(prev => prev - itemsPerPage);
      setCurrentPage(prev => Math.max(1, prev - 1));
    }
  };

  const renderCheckboxDropdown = (field: 'glAccounts' | 'costCenters' | 'materialCode') => {
    const isOpen = dropdownOpen[field];
    const selectedValues = tempFilters[field];
    const searchQuery = searchQueries[field];
    const filteredOptions = getFilteredOptions(field, searchQuery);
    const allOptions = filterOptions[field];
    const isAllSelected = selectedValues.length === allOptions.length && allOptions.length > 0;

    const labels: Record<string, string> = { glAccounts: 'GL Accounts', costCenters: 'Cost Centers', materialCode: 'Material Code' };

    return (
      <div className="pr-checkbox-dropdown">
        <button className="pr-dropdown-toggle" onClick={() => setDropdownOpen(prev => ({ ...prev, [field]: !prev[field] }))}>
          <span>
            {selectedValues.length === 0 ? `Select ${labels[field]}` :
              selectedValues.length === allOptions.length ? `All ${labels[field]} ` :
                `${selectedValues.length} selected`}
          </span>
          <ChevronDown width={16} height={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>
        {isOpen && (
          <div className="pr-dropdown-menu" ref={el => { dropdownMenuRefs.current[field] = el }}>
            <div className="pr-search-box">
              <input type="text" placeholder="Search..." value={searchQuery} onChange={e => handleSearchChange(field, e.target.value)} className="pr-search-input" />
              <Search width={14} height={14} className="pr-search-icon" />
            </div>
            <label className="pr-checkbox-item pr-select-all-item">
              <input type="checkbox" checked={isAllSelected} onChange={() => handleSelectAll(field)} />
              <span className="pr-select-all-label">Select All</span>
            </label>
            <div className="pr-dropdown-divider"></div>
            {filteredOptions.length > 0 ? filteredOptions.map(opt => (
              <label key={opt} className="pr-checkbox-item">
                <input type="checkbox" checked={selectedValues.includes(opt)} onChange={() => handleFilterCheckboxChange(field, opt)} />
                <span>{opt}</span>
              </label>
            )) : <div className="pr-dropdown-empty">No options</div>}
          </div>
        )}
      </div>
    );
  };

  const renderServiceContent = () => (
    <div className="sm-pr-content">
      <div className="sm-pr-action-bar">
        <button className="sm-pr-btn sm-pr-btn-create" onClick={handleCreatePr}>
          <span className="sm-pr-btn-icon">+</span> Create PR
        </button>
        <button className="sm-pr-btn sm-pr-btn-upload" onClick={() => setShowBulkUpload(true)}>
          <span className="sm-pr-btn-icon">⬆</span> Bulk Upload
        </button>
      </div>

      {/* Filters Section */}
      <div className="pr-filter-section">
        <div className="pr-filter-header">
          <svg className="pr-filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          <span className="pr-filter-title">Filters</span>
        </div>
        <div className="pr-grid-row">
          <div className="pr-form-group">
            <label className="pr-label">Search (PR Number / Vendor)</label>
            <div className="pr-input-wrapper pr-search-input-wrapper">
              <input type="text" value={tempFilters.searchQuery} onChange={e => setTempFilters(p => ({ ...p, searchQuery: e.target.value }))} className="pr-input pr-search-text-input" placeholder="e.g. PR123" />
              <Search width={16} height={16} className="pr-search-text-icon" />
            </div>
          </div>
          <div className="pr-form-group">
            <label className="pr-label">Material Code</label>
            {renderCheckboxDropdown('materialCode')}
          </div>
          <div className="pr-form-group">
            <label className="pr-label">GL Accounts</label>
            {renderCheckboxDropdown('glAccounts')}
          </div>
          <div className="pr-form-group">
            <label className="pr-label">Cost Centers</label>
            {renderCheckboxDropdown('costCenters')}
          </div>
          <div className="pr-form-group">
            <label className="pr-label">From Date</label>
            <div className="pr-input-wrapper pr-date-input-wrapper">
              <input type="date" value={tempFilters.fromDate} onChange={e => setTempFilters(p => ({ ...p, fromDate: e.target.value }))} className="pr-input pr-date-input" />
            </div>
          </div>
        </div>
        <div className="pr-grid-row">
          <div className="pr-form-group">
            <label className="pr-label">To Date</label>
            <div className="pr-input-wrapper pr-date-input-wrapper">
              <input type="date" value={tempFilters.toDate} onChange={e => setTempFilters(p => ({ ...p, toDate: e.target.value }))} className="pr-input pr-date-input" />
            </div>
          </div>
          <div className="pr-form-group">
            <label className="pr-label">Service Start Date</label>
            <div className="pr-input-wrapper pr-date-input-wrapper">
              <input type="date" value={tempFilters.serviceStartDate} onChange={e => setTempFilters(p => ({ ...p, serviceStartDate: e.target.value }))} className="pr-input pr-date-input" />
            </div>
          </div>
          <div className="pr-form-group">
            <label className="pr-label">Service End Date</label>
            <div className="pr-input-wrapper pr-date-input-wrapper">
              <input type="date" value={tempFilters.serviceEndDate} onChange={e => setTempFilters(p => ({ ...p, serviceEndDate: e.target.value }))} className="pr-input pr-date-input" />
            </div>
          </div>
        </div>
        <div className="pr-grid-row-2">
          <div className="pr-button-group">
            <button className="pr-button pr-button-apply" onClick={handleApplyFilter} disabled={applyingFilter}>
              {applyingFilter ? <span>Applying...</span> : <span><Check width={16} height={16} /> Apply Filter</span>}
            </button>
            <button className="pr-button pr-button-clear" onClick={handleClearFilter} disabled={clearingFilter}>
              {clearingFilter ? <span>Clearing...</span> : <span><X width={16} height={16} /> Clear Filter</span>}
            </button>
          </div>
        </div>
      </div>

      <div className="sm-pr-table-wrapper">
        <table className="sm-pr-table">
          <thead className="sm-pr-table-head">
            <tr>
              <th className="sm-pr-table-header">PR NUMBER</th>
              <th className="sm-pr-table-header">LINE ITEM NO</th>
              <th className="sm-pr-table-header">PR UniqueName</th>
              <th className="sm-pr-table-header">PURCHASE ORG</th>
              <th className="sm-pr-table-header">VENDOR</th>
              <th className="sm-pr-table-header">TITLE</th>
              <th className="sm-pr-table-header">DESCRIPTION</th>
              <th className="sm-pr-table-header">COMMODITY</th>
              <th className="sm-pr-table-header">CONTRACT</th>
              <th className="sm-pr-table-header">PURCHASE GROUP</th>
              <th className="sm-pr-table-header">EXPECTED AMOUNT</th>
              <th className="sm-pr-table-header">MAXIMUM AMOUNT</th>
              <th className="sm-pr-table-header">SERVICE START DATE</th>
              <th className="sm-pr-table-header">SERVICE END DATE</th>
              <th className="sm-pr-table-header">GL ACCOUNT</th>
              <th className="sm-pr-table-header">COST CENTER</th>
              <th className="sm-pr-table-header">COMPANY CODE</th>
              <th className="sm-pr-table-header">SHIP TO PLANT</th>
              <th className="sm-pr-table-header">BILL TO</th>
              <th className="sm-pr-table-header">TAX CODE</th>
              <th className="sm-pr-table-header">DELIVERY DATE</th>
              <th className="sm-pr-table-header">STATUS</th>
              <th className="sm-pr-table-header">EDIT</th>
              <th className="sm-pr-table-header">ACTION</th>
            </tr>
          </thead>
          <tbody className="sm-pr-table-body">
            {prData.length === 0 ? (
              <tr><td colSpan={25} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>{loading ? 'Loading...' : 'No Service PRs found'}</td></tr>
            ) : (
              prData.map((prItem) => (
                <React.Fragment key={prItem.prNumber}>
                  <tr className={`sm-pr-table-row ${expandedRows.has(prItem.prNumber) ? 'sm-pr-expanded' : ''}`}
                    onClick={() => prItem.lineItems.length > 1 && toggleRowExpansion(prItem.prNumber)}
                    style={{ cursor: prItem.lineItems.length > 1 ? 'pointer' : 'default' }}>
                    <td className="sm-pr-table-cell">
                      {prItem.prNumber}
                      {prItem.lineItems.length > 1 && (
                        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6b7280' }}>
                          {expandedRows.has(prItem.prNumber) ? '▼' : '▶'} ({prItem.lineItems.length})
                        </span>
                      )}
                    </td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].lineNo}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].prServiceUniqueName || '-'}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].purchaseOrg}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].vendor}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].title}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].description}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].commodityCode}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].contract || '-'}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].purchaseGroup || '-'}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].expectedAmount || '-'}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].maxAmount || '-'}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].serviceStartDate ? String(prItem.lineItems[0].serviceStartDate).split('T')[0] : '-'}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].serviceEndDate ? String(prItem.lineItems[0].serviceEndDate).split('T')[0] : '-'}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].glAccount || '-'}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].costCenter || '-'}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].companyCode || '-'}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].shipToPlant || '-'}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].billTo || '-'}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].taxCode || '-'}</td>
                    <td className="sm-pr-table-cell">{prItem.lineItems[0].deliveryDate ? String(prItem.lineItems[0].deliveryDate).split('T')[0] : '-'}</td>
                    <td className='sm-pr-table-cell'>{prItem.lineItems[0].status || '-'}</td>
                    <td className="sm-pr-table-cell sm-pr-table-cell-edit">
                      <button className="sm-pr-edit-btn" onClick={() => handleEdit(prItem)} disabled={!['pending', 'composing'].includes(prItem.lineItems[0].status?.toLowerCase() || '')}>
                        <FiEdit /> Edit
                      </button>
                    </td>
                    <td className="sm-pr-table-cell sm-pr-table-cell-action">
                      <button className="sm-pr-action-btn" onClick={() => handleAction(prItem.prNumber)} disabled={!['pending', 'composing'].includes(prItem.lineItems[0].status?.toLowerCase() || '')}>
                        Re-Submit
                      </button>
                    </td>
                  </tr>
                  {expandedRows.has(prItem.prNumber) && prItem.lineItems.slice(1).map((lineItem) => (
                    <tr key={lineItem.id} className="sm-pr-table-row sm-pr-table-row-expanded">
                      <td colSpan={1}></td>
                      <td className="sm-pr-table-cell">{lineItem.lineNo}</td>
                      <td className="sm-pr-table-cell">{lineItem.prServiceUniqueName || '-'}</td>
                      <td className="sm-pr-table-cell">{lineItem.purchaseOrg}</td>
                      <td className="sm-pr-table-cell">{lineItem.vendor}</td>
                      <td className="sm-pr-table-cell">{lineItem.title}</td>
                      <td className="sm-pr-table-cell">{lineItem.description}</td>
                      <td className="sm-pr-table-cell">{lineItem.commodityCode}</td>
                      <td className="sm-pr-table-cell">{lineItem.contract || '-'}</td>
                      <td className="sm-pr-table-cell">{lineItem.purchaseGroup || '-'}</td>
                      <td className="sm-pr-table-cell">{lineItem.expectedAmount || '-'}</td>
                      <td className="sm-pr-table-cell">{lineItem.maxAmount || '-'}</td>
                      <td className="sm-pr-table-cell">{lineItem.serviceStartDate ? String(lineItem.serviceStartDate).split('T')[0] : '-'}</td>
                      <td className="sm-pr-table-cell">{lineItem.serviceEndDate ? String(lineItem.serviceEndDate).split('T')[0] : '-'}</td>
                      <td className="sm-pr-table-cell">{lineItem.glAccount || '-'}</td>
                      <td className="sm-pr-table-cell">{lineItem.costCenter || '-'}</td>
                      <td className="sm-pr-table-cell">{lineItem.companyCode || '-'}</td>
                      <td className="sm-pr-table-cell">{lineItem.materialCode || '-'}</td>
                      <td className="sm-pr-table-cell">{lineItem.shipToPlant || '-'}</td>
                      <td className="sm-pr-table-cell">{lineItem.billTo || '-'}</td>
                      <td className="sm-pr-table-cell">{lineItem.taxCode || '-'}</td>
                      <td className="sm-pr-table-cell">{lineItem.deliveryDate ? String(lineItem.deliveryDate).split('T')[0] : '-'}</td>
                      <td className="sm-pr-table-cell">{lineItem.status || '-'}</td>
                      <td className="sm-pr-table-cell sm-pr-table-cell-edit">
                        <button className="sm-pr-edit-btn" onClick={() => handleEdit(prItem)} disabled={!['pending', 'composing'].includes(lineItem.status?.toLowerCase() || '')}>
                          <FiEdit /> Edit
                        </button>
                      </td>
                      <td className="sm-pr-table-cell"></td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="sm-pr-pagination">
        <span className="sm-pr-pagination-info">Page {currentPage}</span>
        <div className="sm-pr-pagination-controls">
          <button className="sm-pr-pagination-btn" onClick={handlePrevious} disabled={currentIndex === 0}>Previous</button>
          <button className="sm-pr-pagination-btn" onClick={handleNext} disabled={!hasNextPage}>Next</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="sm-pr-container">
      <div className="sm-pr-header">
        <h1 className="sm-pr-title">Simply PR</h1>
        <div className="sm-pr-tabs-wrapper">
          <div className="sm-pr-tabs">
            <button
              className={`sm-pr-tab ${activeTab === 'service' ? 'sm-pr-tab-active' : ''}`}
              onClick={() => handleTabChange('service')}
            >
              Service
            </button>
            <button
              className={`sm-pr-tab ${activeTab === 'material' ? 'sm-pr-tab-active' : ''}`}
              onClick={() => handleTabChange('material')}
            >
              Material
            </button>
          </div>
        </div>
      </div>

      <BulkUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        type="service"
      />

      {activeTab === 'service' ? renderServiceContent() : <SmPrMaterial activeTab={activeTab} setActiveTab={handleTabChange} />}

      <ErrorModel
        visible={showSessionModal}
        title="Session Expired"
        message="Your session has expired. Please log in again."
        onConfirm={() => { setShowSessionModal(false); navigate('/'); }}
        onClose={() => { setShowSessionModal(false); navigate('/'); }}
      />
    </div>
  );
};

export default SmPr;