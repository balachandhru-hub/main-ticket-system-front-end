import React, { useState, useEffect, useRef, useCallback } from 'react';
import './SmMaterial.css';
import { useNavigate } from 'react-router-dom';
import BulkUploadModal from './BulkUploadModal';
import { ChevronDown, RefreshCw, X, Check, Search } from 'lucide-react';
import { FiEdit } from 'react-icons/fi';
import { filterMaterialPR } from '../api/filterMaterialPRApi';
import {
  fetchGLAccounts,
  fetchCostCenters,
} from '../api/PulseReportFilterApi';
import { fetchMaterialCodes } from '../api/filterMaterialPRApi';
import { createMaterialPR } from '../api/smmaterialPRApi';
import type { MaterialPRDto } from '../Dto/CreateMaterialPRDto';
import type { GetLineItemDto } from '../Dto/GetMaterialPRDto';
import type { FilterMaterialPRRequest } from '../Dto/FilterMaterialPRDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import { toast } from 'react-toastify';
import ErrorModel from './ErrorModel';

interface LineItem extends GetLineItemDto {
  id: string;
  lineNo: number;
  uniqueId: string;
  status?: string;
}

interface PrItem {
  prNumber: string;
  prUniqueName: string;
  lineItems: LineItem[];
  name: string;
  companyCode: string;
  title: string;
  purchaseGroup: string;
  shipToPlant: string;
  deliverTo: string;
  needBy: string;
}

interface FilterValues {
  glAccounts: string[];
  costCenters: string[];
  materialCode: string[];
  fromDate: string;
  toDate: string;
  searchQuery: string;
}

interface FilterOptions {
  glAccounts: string[];
  costCenters: string[];
  materialCode: string[];
}

interface PaginationState {
  [key: string]: {
    page: number;
    totalPages: number;
    isLoading: boolean;
    hasMore: boolean;
  };
}

interface DropdownState {
  [key: string]: boolean;
}

interface SearchState {
  [key: string]: string;
}

interface SmPrMaterialProps {
  activeTab: 'service' | 'material';
  setActiveTab: (tab: 'service' | 'material') => void;
}

const SmPrMaterial: React.FC<SmPrMaterialProps> = ({ }) => {
  const navigate = useNavigate();
  const dropdownMenuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const debounceTimerRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Table state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [prData, setPrData] = useState<PrItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);

  // Temporary filter values (not applied yet)
  const [tempFilters, setTempFilters] = useState<FilterValues>({
    glAccounts: [],
    costCenters: [],
    materialCode: [],
    fromDate: '',
    toDate: '',
    searchQuery: '',
  });

  // Applied filter values
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>({
    glAccounts: [],
    costCenters: [],
    materialCode: [],
    fromDate: '',
    toDate: '',
    searchQuery: '',
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

  const [paginationState, setPaginationState] = useState<PaginationState>({
    glAccounts: { page: 1, totalPages: 1, isLoading: false, hasMore: true },
    costCenters: { page: 1, totalPages: 1, isLoading: false, hasMore: true },
    materialCode: { page: 1, totalPages: 1, isLoading: false, hasMore: true },
  });

  const [applyingFilter, setApplyingFilter] = useState<boolean>(false);
  const [clearingFilter, setClearingFilter] = useState<boolean>(false);
  const [showSessionModal, setShowSessionModal] = useState(false);

  const itemsPerPage = 8;


  // Load filter options on mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [glAccountsData, costCentersData, materialCodeData] = await Promise.all([
          fetchGLAccounts({ page: 1, page_size: 100 }),
          fetchCostCenters({ page: 1, page_size: 100 }),
          fetchMaterialCodes({ page: 1, page_size: 100 }),
        ]);

        // Check if material code response is error
        const materialCodeResult = !isErrorResponse(materialCodeData) ? materialCodeData : null;

        setFilterOptions({
          glAccounts: glAccountsData?.gl_accounts || [],
          costCenters: costCentersData?.cost_centers || [],
          materialCode: materialCodeResult?.data || [],
        });

        setPaginationState(prev => ({
          ...prev,
          glAccounts: {
            page: 1,
            totalPages: glAccountsData?.pagination.total_pages || 1,
            isLoading: false,
            hasMore: (glAccountsData?.pagination.page || 1) < (glAccountsData?.pagination.total_pages || 1),
          },
          costCenters: {
            page: 1,
            totalPages: costCentersData?.pagination.total_pages || 1,
            isLoading: false,
            hasMore: (costCentersData?.pagination.page || 1) < (costCentersData?.pagination.total_pages || 1),
          },
          materialCode: {
            page: 1,
            totalPages: materialCodeResult?.pagination.totalPages || 1,
            isLoading: false,
            hasMore: (materialCodeResult?.pagination.page || 1) < (materialCodeResult?.pagination.totalPages || 1),
          },
        }));
      } catch (error) {
        toast.error('Failed to load filter options');
      }
    };

    loadFilterOptions();
  }, []);

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

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimerRef.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Fetch data when applied filters or index changes
  useEffect(() => {
    fetchMaterialPRs();
  }, [currentIndex, appliedFilters]);

  // Removed prefetchNextPage useEffect

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
        name: firstItem.title,
        title: firstItem.title,
        companyCode: firstItem.companyCode,
        purchaseGroup: firstItem.purchaseGroup,
        shipToPlant: firstItem.shipToPlant,
        deliverTo: firstItem.deliverTo,
        needBy: firstItem.needBy,
        lineItems: items.map((item: any, idx: number) => ({
          ...item,
          id: `${key}-${idx}`,
          lineNo: item.lineItemNumber || idx + 1,
          uniqueId: `UGI${String(idx + 1).padStart(3, '0')}`,
          numberInCollection: item.lineItemNumber || idx + 1,
          quantity: item.quantity,
          price: item.amount,
          commodityCode: item.commodityCode,
          purchaseOrg: item.purchaseOrg,
          vendor: item.vendor,
          contract: item.contract,
          materialCode: item.materialCode,
          uom: item.uom,
          glAccount: item.glAccount,
          costCenter: item.costCenter,
          shipToPlant: item.shipToPlant,
          billTo: item.billTo,
          taxCode: item.taxCode,
          deliverTo: item.deliverTo,
          deliveryDate: item.deliveryDate ? item.deliveryDate.split('T')[0] : item.deliveryDate,
          description: item.description,
          title: item.title,
          status: item.status,
        } as LineItem)),
      };
    });
  };

  const fetchMaterialPRs = async () => {
    setLoading(true);
    try {
      const index = currentIndex;
      let response;

      // Fetch one extra item to check for next page presence
      const fetchLimit = itemsPerPage + 1;

      const filterPayload: FilterMaterialPRRequest = {
        index,
        limit: fetchLimit,
        searchTerm: appliedFilters.searchQuery || undefined,
        fromDate: appliedFilters.fromDate ? new Date(appliedFilters.fromDate).toISOString() : undefined,
        toDate: appliedFilters.toDate ? new Date(appliedFilters.toDate).toISOString() : undefined,
        status: undefined,
        glAccount: appliedFilters.glAccounts.length > 0 ? appliedFilters.glAccounts : undefined,
        materialCode: appliedFilters.materialCode.length > 0 ? appliedFilters.materialCode : undefined,
        costCenter: appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters : undefined,
        companyCode: undefined,
      };
      response = await filterMaterialPR(filterPayload);

      // Check if response is an error
      if (isErrorResponse(response)) {
        if (response.statusCode === 401) {
          setShowSessionModal(true);
          setPrData([]);
          setHasNextPage(false);
          return;
        }

        // Handle other errors
        toast.error(response.message || 'Failed to fetch Material PRs');
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
    } catch (error:any) {
      if (error?.response?.status === 401) {
        navigate("/");
      }
      toast.error('Error fetching Material PRs');;
      setPrData([]);
      setHasNextPage(false);
    } finally {
      setLoading(false);
    }
  };

  function isErrorResponse(response: any): response is ErrorResponseDto {
    return !Array.isArray(response) && response && 'statusCode' in response && 'message' in response && 'description' in response;
  }




  // Filter handlers
  const handleFilterCheckboxChange = (field: keyof FilterValues, value: string) => {
    setTempFilters(prev => {
      const currentArray = (prev[field] as string[]) || [];
      const isSelected = currentArray.includes(value);

      if (isSelected) {
        return {
          ...prev,
          [field]: currentArray.filter(item => item !== value)
        };
      } else {
        return {
          ...prev,
          [field]: [...currentArray, value]
        };
      }
    });
  };

  const handleSelectAll = (field: keyof FilterValues) => {
    const options = filterOptions[field as keyof FilterOptions];
    let allValues: string[] = [];

    if (Array.isArray(options)) {
      allValues = options as string[];
    }

    setTempFilters(prev => ({
      ...prev,
      [field]: prev[field].length === allValues.length ? [] : allValues
    }));
  };

  const getFilteredOptions = (field: keyof FilterOptions, searchQuery: string) => {
    const options = filterOptions[field];

    if (!options || !Array.isArray(options)) return [];

    const query = searchQuery.toLowerCase();
    return (options as string[]).filter(opt =>
      opt.toLowerCase().includes(query)
    );
  };

  const handleSearchWithAPI = useCallback(async (field: 'glAccounts' | 'costCenters' | 'materialCode', searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setPaginationState(prev => ({
      ...prev,
      [field]: { page: 1, totalPages: 1, isLoading: true, hasMore: true }
    }));

    try {
      if (field === 'glAccounts') {
        const response = await fetchGLAccounts({ page: 1, page_size: 100, search: searchQuery });
        if (response) {
          setFilterOptions(prev => ({
            ...prev,
            glAccounts: response.gl_accounts || [],
          }));

          setPaginationState(prev => ({
            ...prev,
            [field]: {
              page: 1,
              totalPages: response.pagination.total_pages,
              isLoading: false,
              hasMore: 1 < response.pagination.total_pages,
            }
          }));
        }
      } else if (field === 'costCenters') {
        const response = await fetchCostCenters({ page: 1, page_size: 100, search: searchQuery });
        if (response) {
          setFilterOptions(prev => ({
            ...prev,
            costCenters: response.cost_centers || [],
          }));

          setPaginationState(prev => ({
            ...prev,
            [field]: {
              page: 1,
              totalPages: response.pagination.total_pages,
              isLoading: false,
              hasMore: 1 < response.pagination.total_pages,
            }
          }));
        }
      } else if (field === 'materialCode') {
        const response = await fetchMaterialCodes({ page: 1, page_size: 100, search: searchQuery });
        if (response && !isErrorResponse(response)) {
          setFilterOptions(prev => ({
            ...prev,
            materialCode: response.data || [],
          }));

          setPaginationState(prev => ({
            ...prev,
            [field]: {
              page: 1,
              totalPages: response.pagination.totalPages,
              isLoading: false,
              hasMore: 1 < response.pagination.totalPages,
            }
          }));
        }
      }
    } catch (error) {
      setPaginationState(prev => ({
        ...prev,
        [field]: { ...prev[field], isLoading: false }
      }));
    }
  }, []);

  const handleSearchChange = (field: string, value: string) => {
    setSearchQueries(prev => ({
      ...prev,
      [field]: value
    }));

    if (debounceTimerRef.current[field]) {
      clearTimeout(debounceTimerRef.current[field]);
    }

    debounceTimerRef.current[field] = setTimeout(() => {
      if (field === 'glAccounts' || field === 'costCenters' || field === 'materialCode') {
        if (value.trim().length > 0) {
          handleSearchWithAPI(field as 'glAccounts' | 'costCenters' | 'materialCode', value);
        } else {
          handleClearSearch(field as 'glAccounts' | 'costCenters' | 'materialCode');
        }
      }
    }, 500);
  };

  const handleClearSearch = useCallback(async (field: 'glAccounts' | 'costCenters' | 'materialCode') => {
    setPaginationState(prev => ({
      ...prev,
      [field]: { page: 1, totalPages: 1, isLoading: true, hasMore: true }
    }));

    try {
      if (field === 'glAccounts') {
        const response = await fetchGLAccounts({ page: 1, page_size: 100 });
        if (response) {
          setFilterOptions(prev => ({
            ...prev,
            glAccounts: response.gl_accounts || [],
          }));

          setPaginationState(prev => ({
            ...prev,
            [field]: {
              page: 1,
              totalPages: response.pagination.total_pages,
              isLoading: false,
              hasMore: 1 < response.pagination.total_pages,
            }
          }));
        }
      } else if (field === 'costCenters') {
        const response = await fetchCostCenters({ page: 1, page_size: 100 });
        if (response) {
          setFilterOptions(prev => ({
            ...prev,
            costCenters: response.cost_centers || [],
          }));

          setPaginationState(prev => ({
            ...prev,
            [field]: {
              page: 1,
              totalPages: response.pagination.total_pages,
              isLoading: false,
              hasMore: 1 < response.pagination.total_pages,
            }
          }));
        }
      } else if (field === 'materialCode') {
        const response = await fetchMaterialCodes({ page: 1, page_size: 100 });
        if (response && !isErrorResponse(response)) {
          setFilterOptions(prev => ({
            ...prev,
            materialCode: response.data || [],
          }));

          setPaginationState(prev => ({
            ...prev,
            [field]: {
              page: 1,
              totalPages: response.pagination.totalPages,
              isLoading: false,
              hasMore: 1 < response.pagination.totalPages,
            }
          }));
        }
      }
    } catch (error) {
      toast.error("Failed to clear search. Please try again later.");
      setPaginationState(prev => ({
        ...prev,
        [field]: { ...prev[field], isLoading: false }
      }));
    }
  }, []);

  const toggleDropdown = (field: string) => {
    setDropdownOpen(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleDropdownScroll = useCallback((e: React.UIEvent<HTMLDivElement>, field: 'glAccounts' | 'costCenters' | 'materialCode') => {
    const dropdownMenu = e.currentTarget;
    const scrollPosition = dropdownMenu.scrollTop + dropdownMenu.clientHeight;
    const scrollHeight = dropdownMenu.scrollHeight;

    if (scrollHeight - scrollPosition < 50) {
      loadMoreOptions(field);
    }
  }, []);

  const loadMoreOptions = useCallback(async (field: 'glAccounts' | 'costCenters' | 'materialCode') => {
    const pagination = paginationState[field];
    const searchQuery = searchQueries[field];

    if (!pagination.hasMore || pagination.isLoading) return;

    setPaginationState(prev => ({
      ...prev,
      [field]: { ...prev[field], isLoading: true }
    }));

    try {
      const nextPage = pagination.page + 1;

      if (field === 'glAccounts') {
        const response = await fetchGLAccounts({ page: nextPage, page_size: 100, search: searchQuery || undefined });
        if (response) {
          setFilterOptions(prev => ({
            ...prev,
            glAccounts: [...(prev.glAccounts || []), ...response.gl_accounts],
          }));

          setPaginationState(prev => ({
            ...prev,
            [field]: {
              page: nextPage,
              totalPages: response.pagination.total_pages,
              isLoading: false,
              hasMore: nextPage < response.pagination.total_pages,
            }
          }));
        }
      } else if (field === 'costCenters') {
        const response = await fetchCostCenters({ page: nextPage, page_size: 100, search: searchQuery || undefined });
        if (response) {
          setFilterOptions(prev => ({
            ...prev,
            costCenters: [...(prev.costCenters || []), ...response.cost_centers],
          }));

          setPaginationState(prev => ({
            ...prev,
            [field]: {
              page: nextPage,
              totalPages: response.pagination.total_pages,
              isLoading: false,
              hasMore: nextPage < response.pagination.total_pages,
            }
          }));
        }
      } else if (field === 'materialCode') {
        const response = await fetchMaterialCodes({ page: nextPage, page_size: 100, search: searchQuery || undefined });
        if (response && !isErrorResponse(response)) {
          setFilterOptions(prev => ({
            ...prev,
            materialCode: [...(prev.materialCode || []), ...response.data],
          }));

          setPaginationState(prev => ({
            ...prev,
            [field]: {
              page: nextPage,
              totalPages: response.pagination.totalPages,
              isLoading: false,
              hasMore: nextPage < response.pagination.totalPages,
            }
          }));
        }
      }
    } catch (error) {
      toast.error("Failed to load more options. Please try again later.");
      setPaginationState(prev => ({
        ...prev,
        [field]: { ...prev[field], isLoading: false }
      }));
    }
  }, [paginationState, searchQueries]);

  const handleApplyFilter = async () => {
    setApplyingFilter(true);
    // Apply temporary filters to applied filters
    setAppliedFilters(tempFilters);
    setCurrentIndex(0);
    setCurrentPage(1);
    setTimeout(() => setApplyingFilter(false), 300);
  };

  const handleClearFilter = async () => {
    setClearingFilter(true);

    const clearedFilters = {
      glAccounts: [],
      costCenters: [],
      materialCode: [],
      fromDate: '',
      toDate: '',
      searchQuery: '',
    };

    setTempFilters(clearedFilters);
    setAppliedFilters(clearedFilters);

    setSearchQueries({
      glAccounts: '',
      costCenters: '',
      materialCode: '',
    });

    setPaginationState({
      glAccounts: { page: 1, totalPages: 1, isLoading: false, hasMore: true },
      costCenters: { page: 1, totalPages: 1, isLoading: false, hasMore: true },
      materialCode: { page: 1, totalPages: 1, isLoading: false, hasMore: true },
    });

    setCurrentIndex(0);
    setCurrentPage(1);

    setTimeout(() => setClearingFilter(false), 300);
  };

  const renderCheckboxDropdown = (field: 'glAccounts' | 'costCenters' | 'materialCode') => {
    const isOpen = dropdownOpen[field];
    const selectedValues = tempFilters[field];
    const searchQuery = searchQueries[field];
    const filteredOptions = getFilteredOptions(field, searchQuery);
    const allOptions = filterOptions[field];
    const pagination = paginationState[field];

    let totalOptions = 0;
    if (Array.isArray(allOptions)) {
      totalOptions = (allOptions as string[]).length;
    }

    const isAllSelected = selectedValues.length === totalOptions && totalOptions > 0;

    const getPlaceholder = () => {
      switch (field) {
        case 'glAccounts':
          return 'Search GL Accounts...';
        case 'costCenters':
          return 'Search Cost Centers...';
        case 'materialCode':
          return 'Search Material Code...';
        default:
          return 'Search...';
      }
    };

    const getLabel = () => {
      switch (field) {
        case 'glAccounts':
          return 'Select GL Accounts';
        case 'costCenters':
          return 'Select Cost Centers';
        case 'materialCode':
          return 'Select Material Code';
        default:
          return 'Select...';
      }
    };

    return (
      <div className="pr-checkbox-dropdown">
        <button
          className="pr-dropdown-toggle"
          onClick={() => toggleDropdown(field)}
        >
          <span>
            {selectedValues.length > 0
              ? `${selectedValues.length} selected`
              : getLabel()
            }
          </span>
          <ChevronDown
            width={16}
            height={16}
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        {isOpen && (
          <div
            className="pr-dropdown-menu"
            ref={el => { dropdownMenuRefs.current[field] = el; }}
            onScroll={(e) => {
              if (field === 'glAccounts' || field === 'costCenters' || field === 'materialCode') {
                handleDropdownScroll(e, field);
              }
            }}
          >
            <div className="pr-search-box">
              <input
                type="text"
                placeholder={getPlaceholder()}
                value={searchQuery}
                onChange={(e) => handleSearchChange(field, e.target.value)}
                className="pr-search-input"
                onClick={(e) => e.stopPropagation()}
              />
              <svg className="pr-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </div>

            <label className="pr-checkbox-item pr-select-all-item">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={() => handleSelectAll(field)}
              />
              <span className="pr-select-all-label">Select All</span>
            </label>

            <div className="pr-dropdown-divider"></div>

            {filteredOptions.length > 0 ? (
              <>
                {(filteredOptions as string[]).map((option) => (
                  <label key={option} className="pr-checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(option)}
                      onChange={() => handleFilterCheckboxChange(field, option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </>
            ) : (
              <div className="pr-dropdown-empty">No options match your search</div>
            )}

            {pagination && pagination.isLoading && (
              <div className="pr-dropdown-loading">
                <RefreshCw width={14} height={14} className="pr-spinner-mini" />
                <span>Loading more...</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Table functions
  const toggleRowExpansion = (prNumber: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(prNumber)) {
        newSet.delete(prNumber);
      } else {
        newSet.add(prNumber);
      }
      return newSet;
    });
  };

  const handleCreatePr = () => {
    navigate(`/simply-pr/materials`);
  };

  const handleEdit = (prNumber: string, lineItem: LineItem) => {
    navigate(`/simply-pr/materials/edit`, {
      state: {
        lineItemData: {
          id: lineItem.id,
          lineNo: lineItem.lineNo,
          uniqueId: lineItem.uniqueId,
          purchaseOrg: lineItem.purchaseOrg,
          prNumber: prNumber,
          vendor: lineItem.vendor,
          title: lineItem.title,
          description: lineItem.description,
          commodity: lineItem.commodityCode,
          contract: lineItem.contract,
          purchaseGroup: lineItem.purchaseGroup,
          materialcode: lineItem.materialCode,
          quantity: String(lineItem.quantity || ''),
          uom: lineItem.uom,
          unitPrice: String(lineItem.price || ''),
          deliveryDate: lineItem.deliveryDate,
          deliveryTo: lineItem.deliverTo,
          glAccount: lineItem.glAccount,
          costCenter: lineItem.costCenter,
          companyCode: lineItem.companyCode,
          shipToPlant: lineItem.shipToPlant,
          billTo: lineItem.billTo,
          taxCode: lineItem.taxCode,
          materialGroup: lineItem.materialCode,
        }
      }
    });
  };

  const handleAction = async (prNumber: string) => {
    const prItem = prData.find(p => p.prNumber === prNumber);
    if (!prItem) return;

    try {
      const payload: MaterialPRDto[] = [{
        Name: prItem.lineItems[0].title,
        UniqueName: prItem.prUniqueName,
        NeedBy: prItem.lineItems[0].needBy ? new Date(prItem.lineItems[0].needBy).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        LineItems: prItem.lineItems.map((item, idx) => ({
          NumberInCollection: idx + 1,
          Description: item.description,
          Quantity: item.quantity,
          UOM: item.uom,
          Price: item.price,
          Currency: item.currency,
          CommodityCode: item.commodityCode,
          Vendor: item.vendor,
          Contract: item.contract,
          PurchaseOrg: item.purchaseOrg,
          GLAccount: item.glAccount,
          CostCenter: item.costCenter,
          MaterialCode: item.materialCode,
          NeedBy: item.needBy ? new Date(item.needBy).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          ShipToPlant: item.shipToPlant,
          BillTo: item.billTo,
          TaxCode: item.taxCode,
          DeliveryDate: item.deliveryDate ? new Date(item.deliveryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        }))
      }];

      const toastId = toast.loading("Re-submitting PR...");

      const response = await createMaterialPR(payload);

      if (response.statusCode === 200 || response.statusCode === 201) {
        toast.update(toastId, { render: "PR Re-submitted Successfully!", type: "success", isLoading: false, autoClose: 3000 });
        fetchMaterialPRs();
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

  if (loading && prData.length === 0) {
    return (
      <div className="sm-pr-content">
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Loading Material PRs...
        </div>
      </div>
    );
  }

  return (
    <>
      <BulkUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        type="material"
      />

      <div className="sm-pr-content">
        {/* Action Bar */}
        <div className="sm-pr-action-bar">
          <button
            className="sm-pr-btn sm-pr-btn-create"
            onClick={handleCreatePr}
          >
            <span className="sm-pr-btn-icon">+</span> Create PR
          </button>
          <button
            className="sm-pr-btn sm-pr-btn-upload"
            onClick={() => setShowBulkUpload(true)}
          >
            <span className="sm-pr-btn-icon">⬆</span> Bulk Upload
          </button>
        </div>

        {/* Filters Section */}
        <div className="pr-filter-section">
          <div className="pr-filter-header">
            <svg className="pr-filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <span className="pr-filter-title">Filters</span>
          </div>

          {/* Search Row - PR Number & Vendor No */}
          <div className="pr-grid-row">

            {/* Search Field - PR Number or Vendor No */}
            <div className="pr-form-group">
              <label className="pr-label">Search (PR Number / Vendor No)</label>
              <div className="pr-input-wrapper pr-search-input-wrapper">
                <input
                  type="text"
                  value={tempFilters.searchQuery}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="pr-input pr-search-text-input"
                  placeholder="e.g., PR23929 or Vendor01"
                />
                <Search width={16} height={16} className="pr-search-text-icon" />
              </div>
            </div>

            {/* GL Accounts Filter */}
            <div className="pr-form-group">
              <label className="pr-label">GL Accounts</label>
              {renderCheckboxDropdown('glAccounts')}
            </div>

            {/* Cost Centers Filter */}
            <div className="pr-form-group">
              <label className="pr-label">Cost Centers</label>
              {renderCheckboxDropdown('costCenters')}
            </div>

            {/* Material Code Filter */}
            <div className="pr-form-group">
              <label className="pr-label">Material Code</label>
              {renderCheckboxDropdown('materialCode')}
            </div>

            {/* From Date Filter */}
            <div className="pr-form-group">
              <label className="pr-label">From Date</label>
              <div className="pr-input-wrapper pr-date-input-wrapper">
                <input
                  type="date"
                  value={tempFilters.fromDate}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                  className="pr-input pr-date-input"
                />
                <svg className="pr-calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
            </div>
          </div>

          {/* Date Row */}
          <div className="pr-grid-row">

            {/* To Date Filter */}
            <div className="pr-form-group">
              <label className="pr-label">To Date</label>
              <div className="pr-input-wrapper pr-date-input-wrapper">
                <input
                  type="date"
                  value={tempFilters.toDate}
                  onChange={(e) => setTempFilters(prev => ({ ...prev, toDate: e.target.value }))}
                  className="pr-input pr-date-input"
                />
                <svg className="pr-calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="pr-grid-row-2">
            <div className="pr-button-group">

              {/* Apply Filter Button */}
              <button
                className="pr-button pr-button-apply"
                onClick={handleApplyFilter}
                disabled={applyingFilter || clearingFilter}
              >
                {applyingFilter ? (
                  <>
                    <RefreshCw width={16} height={16} strokeWidth={2.5} className="pr-spinner" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Check width={16} height={16} strokeWidth={2.5} />
                    <span>Apply Filter</span>
                  </>
                )}
              </button>

              {/* Clear Filter Button */}
              <button
                className="pr-button pr-button-clear"
                onClick={handleClearFilter}
                disabled={applyingFilter || clearingFilter}
              >
                {clearingFilter ? (
                  <>
                    <RefreshCw width={16} height={16} strokeWidth={2.5} className="pr-spinner" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <X width={16} height={16} strokeWidth={2.5} />
                    <span>Clear Filter</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="sm-pr-table-wrapper">
          <table className="sm-pr-table">
            <thead className="sm-pr-table-head">
              <tr>
                <th className="sm-pr-table-header">PR NUMBER</th>
                <th className="sm-pr-table-header">PR UNIQUE NAME</th>
                <th className="sm-pr-table-header">LINE ITEM NO</th>
                <th className="sm-pr-table-header">UNIQUE ID</th>
                <th className="sm-pr-table-header">PURCHASE ORG</th>
                <th className="sm-pr-table-header">VENDOR</th>
                <th className="sm-pr-table-header">TITLE</th>
                <th className="sm-pr-table-header">DESCRIPTION</th>
                <th className="sm-pr-table-header">MATERIAL CODE</th>
                <th className="sm-pr-table-header">COMMODITY</th>
                <th className="sm-pr-table-header">CONTRACT</th>
                <th className="sm-pr-table-header">PURCHASE GROUP</th>
                <th className="sm-pr-table-header">QUANTITY</th>
                <th className="sm-pr-table-header">UOM</th>
                <th className="sm-pr-table-header">UNIT PRICE</th>
                <th className="sm-pr-table-header">DELIVER TO</th>
                <th className="sm-pr-table-header">GL ACCOUNT</th>
                <th className="sm-pr-table-header">COST CENTER</th>
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
                <tr>
                  <td colSpan={25} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    No Material PRs found
                  </td>
                </tr>
              ) : (
                prData.map((prItem) => (
                  <React.Fragment key={prItem.prNumber}>
                    <tr
                      className={`sm-pr-table-row ${expandedRows.has(prItem.prNumber) ? 'sm-pr-expanded' : ''}`}
                      onClick={() => prItem.lineItems.length > 1 && toggleRowExpansion(prItem.prNumber)}
                      style={{ cursor: prItem.lineItems.length > 1 ? 'pointer' : 'default' }}
                    >
                      <td className="sm-pr-table-cell">
                        {prItem.prNumber}
                        {prItem.lineItems.length > 1 && (
                          <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6b7280' }}>
                            {expandedRows.has(prItem.prNumber) ? '▼' : '▶'} ({prItem.lineItems.length})
                          </span>
                        )}
                      </td>
                      <td className="sm-pr-table-cell">{prItem.prUniqueName}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].lineNo}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].uniqueId}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].purchaseOrg}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].vendor || '-'}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].title || '-'}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].description || '-'}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].materialCode || '-'}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].commodityCode || '-'}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].contract || '-'}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].purchaseGroup || '-'}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].quantity || '-'}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].uom || '-'}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].price || '-'}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].deliverTo || '-'}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].glAccount || '-'}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].costCenter || '-'}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].shipToPlant || '-'}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].billTo || '-'}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].taxCode || '-'}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].deliveryDate || '-'}</td>
                      <td className="sm-pr-table-cell">{prItem.lineItems[0].status || '-'}</td>
                      <td className="sm-pr-table-cell sm-pr-table-cell-edit">
                        <button
                          className="sm-pr-edit-btn"
                          onClick={() => handleEdit(prItem.prNumber, prItem.lineItems[0])}
                          title="Edit"
                          disabled={!['pending', 'composing'].includes(prItem.lineItems[0].status?.toLowerCase() || '')}
                          style={{
                            opacity: !['pending', 'composing'].includes(prItem.lineItems[0].status?.toLowerCase() || '') ? 0.5 : 1,
                            cursor: !['pending', 'composing'].includes(prItem.lineItems[0].status?.toLowerCase() || '') ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <FiEdit /> Edit
                        </button>
                      </td>
                      <td className="sm-pr-table-cell sm-pr-table-cell-action">
                        <button
                          className="sm-pr-action-btn"
                          onClick={() => handleAction(prItem.prNumber)}
                          disabled={!['pending', 'composing'].includes(prItem.lineItems[0].status?.toLowerCase() || '')}
                          style={{
                            opacity: !['pending', 'composing'].includes(prItem.lineItems[0].status?.toLowerCase() || '') ? 0.5 : 1,
                            cursor: !['pending', 'composing'].includes(prItem.lineItems[0].status?.toLowerCase() || '') ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Re-Submit
                        </button>
                      </td>
                    </tr >

                    {
                      expandedRows.has(prItem.prNumber) &&
                      prItem.lineItems.slice(1).map((lineItem) => (
                        <tr key={lineItem.id} className="sm-pr-table-row sm-pr-table-row-expanded">
                          <td className="sm-pr-table-cell"></td>
                          <td className="sm-pr-table-cell"></td>
                          <td className="sm-pr-table-cell">{lineItem.lineNo}</td>
                          <td className="sm-pr-table-cell">{lineItem.uniqueId}</td>
                          <td className="sm-pr-table-cell">{lineItem.purchaseOrg}</td>
                          <td className="sm-pr-table-cell">{lineItem.vendor || '-'}</td>
                          <td className="sm-pr-table-cell">{lineItem.title || '-'}</td>
                          <td className="sm-pr-table-cell">{lineItem.description || '-'}</td>
                          <td className="sm-pr-table-cell">{lineItem.materialCode || '-'}</td>
                          <td className="sm-pr-table-cell">{lineItem.commodityCode || '-'}</td>
                          <td className="sm-pr-table-cell">{lineItem.contract || '-'}</td>
                          <td className="sm-pr-table-cell">{lineItem.purchaseGroup || '-'}</td>
                          <td className="sm-pr-table-cell">{lineItem.quantity || '-'}</td>
                          <td className="sm-pr-table-cell">{lineItem.uom || '-'}</td>
                          <td className="sm-pr-table-cell">{lineItem.price || '-'}</td>
                          <td className="sm-pr-table-cell">{lineItem.deliverTo || '-'}</td>
                          <td className="sm-pr-table-cell">{lineItem.glAccount || '-'}</td>
                          <td className="sm-pr-table-cell">{lineItem.costCenter || '-'}</td>
                          <td className="sm-pr-table-cell">{lineItem.shipToPlant || '-'}</td>
                          <td className="sm-pr-table-cell">{lineItem.billTo || '-'}</td>
                          <td className="sm-pr-table-cell">{lineItem.taxCode || '-'}</td>
                          <td className="sm-pr-table-cell">{lineItem.deliveryDate || '-'}</td>
                          <td className="sm-pr-table-cell">{lineItem.status || '-'}</td>
                          <td className="sm-pr-table-cell sm-pr-table-cell-edit">
                            <button
                              className="sm-pr-edit-btn"
                              onClick={() => handleEdit(prItem.prNumber, lineItem)}
                              title="Edit"
                              disabled={!['pending', 'composing'].includes(lineItem.status?.toLowerCase() || '')}
                              style={{
                                opacity: !['pending', 'composing'].includes(lineItem.status?.toLowerCase() || '') ? 0.5 : 1,
                                cursor: !['pending', 'composing'].includes(lineItem.status?.toLowerCase() || '') ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <FiEdit /> Edit
                            </button>
                          </td>
                          <td className="sm-pr-table-cell"></td>
                        </tr>
                      ))
                    }
                  </React.Fragment >
                ))
              )}
            </tbody >
          </table >
        </div >

        {/* Pagination */}
        < div className="sm-pr-pagination" >
          <span className="sm-pr-pagination-info">
            Page {currentPage}
          </span>
          <div className="sm-pr-pagination-controls">
            <button
              className="sm-pr-pagination-btn"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              Previous
            </button>
            <button
              className="sm-pr-pagination-btn"
              onClick={handleNext}
              disabled={!hasNextPage}
            >
              Next
            </button>
          </div>
        </div >

        {/* Session Expired Modal */}
        < ErrorModel
          visible={showSessionModal}
          title="Session Expired"
          message="Your session has expired. Please log in again."
          onConfirm={() => {
            setShowSessionModal(false);
            navigate('/');
          }}
          onClose={() => {
            setShowSessionModal(false);
            navigate('/');
          }}
        />
      </div >
    </>
  );
};

export default SmPrMaterial;