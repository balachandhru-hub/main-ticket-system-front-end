import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCw, Check, X, AlertCircle, RefreshCw, Send, ChevronDown } from 'lucide-react';
import { usePulseReport } from './context/PulseReportContext';
import { useFilter } from './context/PulseContext';
import { 
  fetchPRSummary, 
  getDefaultPRSummary, 
  fetchGRNSummary, 
  getDefaultGrnSummary, 
  fetchSesSummary, 
  getDefaultSesSummary,
  fetchInvoiceSummary,
  getDefaultInvoiceSummary,
} from '../api/PulseReportApi';

import {
  fetchDepartments,
  fetchSuppliers,
  fetchRequestors,
  fetchProperties,
  fetchGLAccounts,
  fetchCostCenters,
} from '../api/PulseReportFilterApi';

import type { SummaryFilterDTO } from '../Dto/PrDashboardDto';
import './PulseReportDashboard.css';
import SpinnerLoaders from './SpinnerLoaders';
import { toast } from 'react-toastify';

interface PropertyOption {
  label: string;
  value: string;
}

interface StatusCard {
  label: string;
  count: number;
  icon: 'success' | 'error' | 'info' | 'warning' | 'processing' | 'send';
}

interface Section {
  title: string;
  cards: StatusCard[];
}

interface FilterValues {
  suppliers: string[];
  departments: string[];
  properties: string[];
  fromDate: string;
  glAccounts: string[];
  costCenters: string[];
  toDate: string;
  requestors: string[];
}

interface FilterOptions {
  suppliers: string[];
  departments: string[];
  properties: { label: string; value: string }[];
  requestors: string[];
  glAccounts: string[];
  costCenters: string[];
  fromDate?: string;
  toDate?: string;
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

const PulseReportDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { setSelectedStatus } = usePulseReport();
  const contentRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const debounceTimerRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const { filtersQuick, setFiltersQuick } = useFilter();
  
  const [filters, setFilters] = useState<FilterValues>(() => ({
  suppliers: filtersQuick.supplier_filter || [],
  departments: filtersQuick.department_filter || [],
  properties: filtersQuick.company_code_filter || [],
  fromDate: filtersQuick.from_date || '',
  toDate: filtersQuick.to_date || '',
  glAccounts: filtersQuick.gl_accounts_filter || [],
  costCenters: filtersQuick.cost_centers_filter || [],
  requestors: filtersQuick.requester_filter || [],
}));

useEffect(() => {
  setFiltersQuick({
    supplier_filter: filters.suppliers.length > 0 ? filters.suppliers : undefined,
    requester_filter: filters.requestors.length > 0 ? filters.requestors : undefined,
    department_filter: filters.departments.length > 0 ? filters.departments : undefined,
    company_code_filter: filters.properties.length > 0 ? filters.properties : undefined,
    gl_accounts_filter: filters.glAccounts.length > 0 ? filters.glAccounts : undefined,
    cost_centers_filter: filters.costCenters.length > 0 ? filters.costCenters : undefined,
    from_date: filters.fromDate || undefined,
    to_date: filters.toDate || undefined,
  });
}, [filters, setFiltersQuick]);

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    suppliers: [],
    departments: [],
    properties: [],
    requestors: [],
    glAccounts: [],
    costCenters: [],
  });

  const [dropdownOpen, setDropdownOpen] = useState<DropdownState>({
    suppliers: false,
    departments: false,
    properties: false,
    requestors: false,
    glAccounts: false,
    costCenters: false,
  });

  const [searchQueries, setSearchQueries] = useState<SearchState>({
    suppliers: '',
    departments: '',
    properties: '',
    requestors: '',
    glAccounts: '',
    costCenters: '',
  });

  const [paginationState, setPaginationState] = useState<PaginationState>({
    suppliers: { page: 1, totalPages: 1, isLoading: false, hasMore: true },
    requestors: { page: 1, totalPages: 1, isLoading: false, hasMore: true },
    glAccounts: { page: 1, totalPages: 1, isLoading: false, hasMore: true },
    costCenters: { page: 1, totalPages: 1, isLoading: false, hasMore: true },
  });

  const [displayCounts, setDisplayCounts] = useState(getDefaultPRSummary());
  const [displayGrnCounts, setDisplayGrnCounts] = useState(getDefaultGrnSummary());
  const [displaySesCounts, setDisplaySesCounts] = useState(getDefaultSesSummary());
  const [displayInvoiceCounts, setDisplayInvoiceCounts] = useState(getDefaultInvoiceSummary());
  const [refreshingSection, setRefreshingSection] = useState<string | null>(null);
  const [animatingCards, setAnimatingCards] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [applyingFilter, setApplyingFilter] = useState<boolean>(false);
  const [clearingFilter, setClearingFilter] = useState<boolean>(false);

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

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [departmentsData, suppliersData, requestorsData, propertiesData, glAccountsData, costCentersData] = await Promise.all([
          fetchDepartments(),
          fetchSuppliers({ page: 1, page_size: 100 }),
          fetchRequestors({ page: 1, page_size: 100 }),
          fetchProperties(),
          fetchGLAccounts({ page: 1, page_size: 100 }),
          fetchCostCenters({ page: 1, page_size: 100 }),
        ]);

        setFilterOptions({
          departments: departmentsData?.departments || [],
          suppliers: suppliersData?.suppliers || [],
          requestors: requestorsData?.requesters || [],
          properties: propertiesData?.properties || [],
          glAccounts: glAccountsData?.gl_accounts || [],
          costCenters: costCentersData?.cost_centers || [],
        });

        // Set initial pagination state
        setPaginationState(prev => ({
          ...prev,
          suppliers: {
            page: 1,
            totalPages: suppliersData?.pagination?.total_pages || 1,
            isLoading: false,
            hasMore: (suppliersData?.pagination?.page || 1) < (suppliersData?.pagination?.total_pages || 1),
          },
          requestors: {
            page: 1,
            totalPages: requestorsData?.pagination.total_pages || 1,
            isLoading: false,
            hasMore: (requestorsData?.pagination.page || 1) < (requestorsData?.pagination.total_pages || 1),
          },
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
        }));
      } catch (error: any) {
        if (error?.response?.status === 401) {
          navigate("/");
        }
      }
    };

    loadFilterOptions();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadAllSummaries();
  }, []);

  const loadAllSummaries = async () => {
  setLoading(true);

  // Check if we have filters from context (returning from another page)
  const hasExistingFilters = 
    filtersQuick.supplier_filter?.length ||
    filtersQuick.department_filter?.length ||
    filtersQuick.company_code_filter?.length ||
    filtersQuick.requester_filter?.length ||
    filtersQuick.gl_accounts_filter?.length ||
    filtersQuick.cost_centers_filter?.length ||
    filtersQuick.from_date ||
    filtersQuick.to_date;

  const payload: SummaryFilterDTO | undefined = hasExistingFilters ? filtersQuick : undefined;

  try {
    const [prData, grnData, sesData, invoiceData] = await Promise.all([
      fetchPRSummary(payload),
      fetchGRNSummary(payload),
      fetchSesSummary(payload),
      fetchInvoiceSummary(payload),
    ]);

    if (prData) {
      animateCountsIncrease(prData, setDisplayCounts);
    }
    if (grnData) {
      animateGrnCountsIncrease(grnData, setDisplayGrnCounts);
    }
    if (sesData) {
      animateSesCountsIncrease(sesData, setDisplaySesCounts);
    }
    if (invoiceData) {
      animateInvoiceCountsIncrease(invoiceData, setDisplayInvoiceCounts);
    }
  } catch (error:any) {
    if (error?.response?.status === 401) {
      navigate("/");
    }
    toast.error("Failed to load. Please try again later.");
  } finally {
    setLoading(false);

    setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }, 100);
  }
  };

  const animateCountsIncrease = (targetCounts: typeof displayCounts, setterFunc: any) => {
    const duration = 1200;
    const steps = 30;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setterFunc({
        Composing: Math.floor(targetCounts.Composing * progress),
        Ordered: Math.floor(targetCounts.Ordered * progress),
        PendingApproval: Math.floor(targetCounts.PendingApproval * progress),
        Submitted: Math.floor(targetCounts.Submitted * progress),
        Received: Math.floor(targetCounts.Received * progress),
        Receiving: Math.floor(targetCounts.Receiving * progress),
        Total: Math.floor(targetCounts.Total * progress),
        LastUpdatedAt: targetCounts.LastUpdatedAt
      });

      if (currentStep >= steps) {
        setterFunc(targetCounts);
        clearInterval(interval);
      }
    }, stepDuration);
  };

  const animateGrnCountsIncrease = (targetCounts: typeof displayGrnCounts, setterFunc: any) => {
    const duration = 1200;
    const steps = 30;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setterFunc({
        Completed: Math.floor(targetCounts.Completed * progress),
        Syncing: Math.floor(targetCounts.Syncing * progress),
        InApproval: Math.floor(targetCounts.InApproval * progress),
        InProcess: Math.floor(targetCounts.InProcess * progress),
        Failed: Math.floor(targetCounts.Failed * progress),
        Total: Math.floor(targetCounts.Total * progress),
        LastUpdatedAt: targetCounts.LastUpdatedAt
      });

      if (currentStep >= steps) {
        setterFunc(targetCounts);
        clearInterval(interval);
      }
    }, stepDuration);
  };

  const animateSesCountsIncrease = (targetCounts: typeof displaySesCounts, setterFunc: any) => {
    const duration = 1200;
    const steps = 30;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setterFunc({
        Approved: Math.floor(targetCounts.Approved * progress),
        Composing: Math.floor(targetCounts.Composing * progress),
        ERPSystemDeclined: Math.floor(targetCounts.ERPSystemDeclined * progress),
        Invoiced: Math.floor(targetCounts.Invoiced * progress),
        PartiallyInvoiced: Math.floor(targetCounts.PartiallyInvoiced * progress),
        Processed: Math.floor(targetCounts.Processed * progress),
        Rejected: Math.floor(targetCounts.Rejected * progress),
        SendingToExternalSystem: Math.floor(targetCounts.SendingToExternalSystem * progress),
        Submitted: Math.floor(targetCounts.Submitted * progress),
        Total: Math.floor(targetCounts.Total * progress),
        LastUpdatedAt: targetCounts.LastUpdatedAt
      });

      if (currentStep >= steps) {
        setterFunc(targetCounts);
        clearInterval(interval);
      }
    }, stepDuration);
  };

  const animateInvoiceCountsIncrease = (targetCounts: typeof displayInvoiceCounts, setterFunc: any) => {
    const duration = 1200;
    const steps = 30;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setterFunc({
        "In Approval": Math.floor(targetCounts["In Approval"] * progress),
        Reconciled: Math.floor(targetCounts.Reconciled * progress),
        Exceptions: Math.floor(targetCounts.Exceptions * progress),
        Paid: Math.floor(targetCounts.Paid * progress),
        Paying: Math.floor(targetCounts.Paying * progress),
        Failed: Math.floor(targetCounts.Failed * progress),
        Rejected: Math.floor(targetCounts.Rejected * progress),
        Total: Math.floor(targetCounts.Total * progress),
        LastUpdatedAt: targetCounts.LastUpdatedAt
      });

      if (currentStep >= steps) {
        setterFunc(targetCounts);
        clearInterval(interval);
      }
    }, stepDuration);
  };

  const handleFilterCheckboxChange = (field: keyof FilterValues, value: string) => {
    setFilters(prev => {
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

    if (field === 'properties' && Array.isArray(options)) {
      allValues = (options as PropertyOption[]).map(opt => opt.value);
    } else if (Array.isArray(options)) {
      allValues = options as string[];
    }

    setFilters(prev => ({
      ...prev,
      [field]: prev[field].length === allValues.length ? [] : allValues
    }));
  };

  const getFilteredOptions = (field: keyof FilterOptions, searchQuery: string) => {
    const options = filterOptions[field];
    
    if (!options || !Array.isArray(options)) return [];

    const query = searchQuery.toLowerCase();

    if (field === 'properties') {
      return (options as PropertyOption[]).filter(opt =>
        opt.label.toLowerCase().includes(query)
      );
    }

    return (options as string[]).filter(opt =>
      opt.toLowerCase().includes(query)
    );
  };

  const handleSearchWithAPI = useCallback(async (field: 'suppliers' | 'requestors' | 'glAccounts' | 'costCenters', searchQuery: string) => {
    if (!searchQuery.trim()) return;

    // Reset to page 1 when searching
    setPaginationState(prev => ({
      ...prev,
      [field]: { page: 1, totalPages: 1, isLoading: true, hasMore: true }
    }));

    try {
      if (field === 'suppliers') {
        const response = await fetchSuppliers({ page: 1, page_size: 100, search: searchQuery });
        if (response) {
          setFilterOptions(prev => ({
            ...prev,
            suppliers: response.suppliers || [],
          }));

          setPaginationState(prev => ({
            ...prev,
            [field]: {
              page: 1,
              totalPages: response.pagination?.total_pages || 1,
              isLoading: false,
              hasMore: 1 < (response.pagination?.total_pages || 1),
            }
          }));
        }
      } else if (field === 'requestors') {
        const response = await fetchRequestors({ page: 1, page_size: 100,search: searchQuery });
        if (response) {
          setFilterOptions(prev => ({
            ...prev,
            requestors: response.requesters || [],
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
      } else if (field === 'glAccounts') {
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
      }
    } catch (error:any) {
      if (error?.response?.status === 401) {
        navigate("/");
      }
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

  const handleSearchChange = (field: string, value: string) => {
    setSearchQueries(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear existing debounce timer
    if (debounceTimerRef.current[field]) {
      clearTimeout(debounceTimerRef.current[field]);
    }

    // Set new debounce timer - only trigger API call after 500ms of no typing
    debounceTimerRef.current[field] = setTimeout(() => {
      // Trigger API search for paginated fields
      if (field === 'suppliers' || field === 'requestors' || field === 'glAccounts' || field === 'costCenters') {
        if (value.trim().length > 0) {
          handleSearchWithAPI(field as 'suppliers' | 'requestors' | 'glAccounts' | 'costCenters', value);
        } else {
          // If search is cleared, reload all data
          handleClearSearch(field as 'suppliers' | 'requestors' | 'glAccounts' | 'costCenters');
        }
      }
    }, 500); // 500ms delay
  };

  const handleClearSearch = useCallback(async (field: 'suppliers' | 'requestors' | 'glAccounts' | 'costCenters') => {
    setPaginationState(prev => ({
      ...prev,
      [field]: { page: 1, totalPages: 1, isLoading: true, hasMore: true }
    }));

    try {
      if (field === 'suppliers') {
        const response = await fetchSuppliers({ page: 1, page_size: 100 });
        if (response) {
          setFilterOptions(prev => ({
            ...prev,
            suppliers: response.suppliers || [],
          }));

          setPaginationState(prev => ({
            ...prev,
            [field]: {
              page: 1,
              totalPages: response.pagination?.total_pages || 1,
              isLoading: false,
              hasMore: 1 < (response.pagination?.total_pages || 1),
            }
          }));
        }
      } else if (field === 'requestors') {
        const response = await fetchRequestors({ page: 1, page_size: 100 });
        if (response) {
          setFilterOptions(prev => ({
            ...prev,
            requestors: response.requesters || [],
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
      } else if (field === 'glAccounts') {
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
      }
    } catch (error:any) {
      if (error?.response?.status === 401) {
        navigate("/");
      }
      toast.error("Failed to clear search. Please try again later.");
      setPaginationState(prev => ({
        ...prev,
        [field]: { ...prev[field], isLoading: false }
      }));
    }
  }, []);

  const loadMoreOptions = useCallback(async (field: 'suppliers' | 'requestors' | 'glAccounts' | 'costCenters') => {
    const pagination = paginationState[field];
    const searchQuery = searchQueries[field];
    
    if (!pagination.hasMore || pagination.isLoading) return;

    setPaginationState(prev => ({
      ...prev,
      [field]: { ...prev[field], isLoading: true }
    }));

    try {
      const nextPage = pagination.page + 1;

      if (field === 'suppliers') {
        const response = await fetchSuppliers({ page: nextPage, page_size: 100, search: searchQuery || undefined });
        if (response) {
          setFilterOptions(prev => ({
            ...prev,
            suppliers: [...(prev.suppliers || []), ...response.suppliers],
          }));

          setPaginationState(prev => ({
            ...prev,
            [field]: {
              page: nextPage,
              totalPages: response.pagination?.total_pages || 1,
              isLoading: false,
              hasMore: nextPage < (response.pagination?.total_pages || 1),
            }
          }));
        }
      } else if (field === 'requestors') {
        const response = await fetchRequestors({ page: nextPage, page_size: 100 });
        if (response) {
          setFilterOptions(prev => ({
            ...prev,
            requestors: [...(prev.requestors || []), ...response.requesters],
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
      } else if (field === 'glAccounts') {
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
      }
    } catch (error:any) {
      if (error?.response?.status === 401) {
        navigate("/");
      }
      toast.error("Failed to load more options. Please try again later.");
      setPaginationState(prev => ({
        ...prev,
        [field]: { ...prev[field], isLoading: false }
      }));
    }
  }, [paginationState, searchQueries]);

  const handleDropdownScroll = useCallback((e: React.UIEvent<HTMLDivElement>, field: 'suppliers' | 'requestors' | 'glAccounts' | 'costCenters') => {
    const dropdownMenu = e.currentTarget;
    const scrollPosition = dropdownMenu.scrollTop + dropdownMenu.clientHeight;
    const scrollHeight = dropdownMenu.scrollHeight;

    // Load more when user scrolls to 80% of the dropdown height
    if (scrollHeight - scrollPosition < 50) {
      loadMoreOptions(field);
    }
  }, [loadMoreOptions]);

  const handleApplyFilter = async () => {
    setApplyingFilter(true);
    setAnimatingCards(new Set(['all']));

    const payload: SummaryFilterDTO = {
      supplier_filter: filters.suppliers.length > 0 ? filters.suppliers : undefined,
      requester_filter: filters.requestors.length > 0 ? filters.requestors : undefined,
      department_filter: filters.departments.length > 0 ? filters.departments : undefined,
      company_code_filter: filters.properties.length > 0 ? filters.properties : undefined,
      gl_accounts_filter: filters.glAccounts.length > 0 ? filters.glAccounts : undefined,
      cost_centers_filter: filters.costCenters.length > 0 ? filters.costCenters : undefined,
      from_date: filters.fromDate || undefined,
      to_date: filters.toDate || undefined,
    };

    try {
      const [prData, grnData, sesData, invoiceData] = await Promise.all([
        fetchPRSummary(payload),
        fetchGRNSummary(payload),
        fetchSesSummary(payload),
        fetchInvoiceSummary(payload),
      ]);

      if (prData) {
        animateCountsIncrease(prData, setDisplayCounts);
      }
      if (grnData) {
        animateGrnCountsIncrease(grnData, setDisplayGrnCounts);
      }
      if (sesData) {
        animateSesCountsIncrease(sesData, setDisplaySesCounts);
      }
      if (invoiceData) {
        animateInvoiceCountsIncrease(invoiceData, setDisplayInvoiceCounts);
      }

      setTimeout(() => setAnimatingCards(new Set()), 1200);
    } catch (error:any) {
      if (error?.response?.status === 401) {
        navigate("/");
      }
      setAnimatingCards(new Set());
    } finally {
      setApplyingFilter(false);
    }
  };

  const handleClearFilter = async () => {
  setClearingFilter(true);
  setAnimatingCards(new Set(['all']));

  const clearedFilters = {
    suppliers: [],
    departments: [],
    properties: [],
    fromDate: '',
    toDate: '',
    glAccounts: [],
    costCenters: [],
    requestors: [],
  };

  setFilters(clearedFilters);

  // Clear context as well
  setFiltersQuick({});

  setSearchQueries({
    suppliers: '',
    departments: '',
    properties: '',
    requestors: '',
    glAccounts: '',
    costCenters: '',
  });

  // Reset pagination state
  setPaginationState({
    suppliers: { page: 1, totalPages: 1, isLoading: false, hasMore: true },
    requestors: { page: 1, totalPages: 1, isLoading: false, hasMore: true },
    glAccounts: { page: 1, totalPages: 1, isLoading: false, hasMore: true },
    costCenters: { page: 1, totalPages: 1, isLoading: false, hasMore: true },
  });

  try {
    const [prData, grnData, sesData, invoiceData] = await Promise.all([
      fetchPRSummary(),
      fetchGRNSummary(),
      fetchSesSummary(),
      fetchInvoiceSummary(),
    ]);

    if (prData) {
      animateCountsIncrease(prData, setDisplayCounts);
    }
    if (grnData) {
      animateGrnCountsIncrease(grnData, setDisplayGrnCounts);
    }
    if (sesData) {
      animateSesCountsIncrease(sesData, setDisplaySesCounts);
    }
    if (invoiceData) {
      animateInvoiceCountsIncrease(invoiceData, setDisplayInvoiceCounts);
    }

    setTimeout(() => setAnimatingCards(new Set()), 1200);
  } catch (error:any) {
    if (error?.response?.status === 401) {
      navigate("/");
    }
    setAnimatingCards(new Set());
  } finally {
    setClearingFilter(false);
  }
  };

  const handleRefreshSection = async (sectionTitle: string) => {
    setRefreshingSection(sectionTitle);
    setAnimatingCards(new Set(['all']));

    const hasFilters = filters.suppliers.length > 0 || 
                      filters.departments.length > 0 || 
                      filters.properties.length > 0 || 
                      filters.requestors.length > 0 || 
                      filters.glAccounts.length > 0 || 
                      filters.costCenters.length > 0 || 
                      filters.fromDate || 
                      filters.toDate;

    const payload: SummaryFilterDTO | undefined = hasFilters ? {
      supplier_filter: filters.suppliers.length > 0 ? filters.suppliers : undefined,
      requester_filter: filters.requestors.length > 0 ? filters.requestors : undefined,
      department_filter: filters.departments.length > 0 ? filters.departments : undefined,
      company_code_filter: filters.properties.length > 0 ? filters.properties : undefined,
      gl_accounts_filter: filters.glAccounts.length > 0 ? filters.glAccounts : undefined,
      cost_centers_filter: filters.costCenters.length > 0 ? filters.costCenters : undefined,
      from_date: filters.fromDate || undefined,
      to_date: filters.toDate || undefined,
    } : undefined;

    try {
      if (sectionTitle === 'Purchase Request (PR)') {
        const data = await fetchPRSummary(payload);
        if (data) {
          animateCountsIncrease(data, setDisplayCounts);
        }
      } else if (sectionTitle === 'Goods Receipt Note (GRN)') {
        const data = await fetchGRNSummary(payload);
        if (data) {
          animateGrnCountsIncrease(data, setDisplayGrnCounts);
        }
      } else if (sectionTitle === 'Service Entry Sheet (SES)') {
        const data = await fetchSesSummary(payload);
        if (data) {
          animateSesCountsIncrease(data, setDisplaySesCounts);
        }
      } else if (sectionTitle === 'Invoice Management') {
        const data = await fetchInvoiceSummary(payload);
        if (data) {
          animateInvoiceCountsIncrease(data, setDisplayInvoiceCounts);
        }
      }
    } catch (error:any) {
      if (error?.response?.status === 401) {
        navigate("/");
      }
    } finally {
      setTimeout(() => {
        setAnimatingCards(new Set());
        setRefreshingSection(null);
      }, 1200);
    }
  };

  const handleCardClick = (sectionTitle: string, cardLabel: string, _count: number) => {
    const statusMaps: Record<string, Record<string, string>> = {
      "Purchase Request (PR)": {
        Composing: "composing",
        Ordered: "ordered",
        "Pending Approval": "pending",
        Submitted: "submitted",
        Received: "received",
        Receiving: "receiving",
      },
      "Service Entry Sheet (SES)": {
        Approved: "Approved",
        "Composing": "Composing",
        "ERP System Declined": "ERPSystemDeclined",
        Invoiced: "Invoiced",
        "Partially Invoiced": "PartiallyInvoiced",
        Processed: "Processed",
        Rejected: "Rejected",
        Submitted: "Submitted",
        "Sending To External System": "SendingToExternalSystem"
      },
      "Goods Receipt Note (GRN)": {
        Completed: "Completed",
        Syncing: "Syncing",
        "In Approval": "InApproval",
        "Failed": "Failed",
        "In Process": "InProcess"
      },
      "Invoice Management": {
        "In Approval": "In Approval",
        Reconciled: "Reconciled",
        Exceptions: "Exceptions",
        Paid: "Paid",
        Paying: "Paying",
        Failed: "Failed",
        Rejected: "Rejected",
      },
    };
    const statusMap = statusMaps[sectionTitle] || {};
    const status = statusMap[cardLabel] || cardLabel.toLowerCase();

    setSelectedStatus(status);

    if (sectionTitle === 'Purchase Request (PR)') {
      navigate('/pr-dashboard');
    } else if (sectionTitle === 'Goods Receipt Note (GRN)') {
      navigate('/grn-dashboard');
    } else if (sectionTitle === 'Service Entry Sheet (SES)') {
      navigate('/ses-dashboard');
    } else if (sectionTitle === 'Invoice Management') {
      navigate('/invoice-dashboard');
    }
  };

  const getIcon = (type: string) => {
    const iconConfig = {
      success: { color: '#10b981', bgColor: '#ecfdf5', icon: Check },
      error: { color: '#ef4444', bgColor: '#fef2f2', icon: X },
      info: { color: '#06b6d4', bgColor: '#ecf9fc', icon: AlertCircle },
      warning: { color: '#f97316', bgColor: '#fffbeb', icon: AlertCircle },
      processing: { color: '#a78bfa', bgColor: '#f5f3ff', icon: RefreshCw },
      send: { color: '#a78bfa', bgColor: '#f5f3ff', icon: Send }
    };

    const config = iconConfig[type as keyof typeof iconConfig];
    const IconComponent = config.icon;

    const icon = <IconComponent width={24} height={24} strokeWidth={2.5} color={config.color} />;

    return {
      icon: icon,
      bgColor: config.bgColor
    };
  };

  const buildPRCards = (): StatusCard[] => {
    return [
      { label: 'Composing', count: displayCounts.Composing, icon: 'info' },
      { label: 'Ordered', count: displayCounts.Ordered, icon: 'success' },
      { label: 'Pending Approval', count: displayCounts.PendingApproval, icon: 'warning' },
      { label: 'Submitted', count: displayCounts.Submitted, icon: 'error' },
      { label: 'Received', count: displayCounts.Received, icon: 'info' },
      { label: 'Receiving', count: displayCounts.Receiving, icon: 'info' }
    ];
  };

  const buildGrnCards = (): StatusCard[] => {
    return [
      { label: 'Completed', count: displayGrnCounts.Completed, icon: 'success' },
      { label: 'Failed', count: displayGrnCounts.Failed, icon: 'error' },
      { label: 'Syncing', count: displayGrnCounts.Syncing, icon: 'processing' },
      { label: 'In Approval', count: displayGrnCounts.InApproval, icon: 'warning' },
    ];
  };

  const buildSesCards = (): StatusCard[] => {
    return [
      { label: 'Approved', count: displaySesCounts.Approved, icon: 'success' },
      { label: 'Composing', count: displaySesCounts.Composing, icon: 'info' },
      { label: 'ERP System Declined', count: displaySesCounts.ERPSystemDeclined, icon: 'error' },
      { label: 'Invoiced', count: displaySesCounts.Invoiced, icon: 'success' },
      { label: 'Partially Invoiced', count: displaySesCounts.PartiallyInvoiced, icon: 'warning' },
      { label: 'Processed', count: displaySesCounts.Processed, icon: 'success' },
      { label: 'Rejected', count: displaySesCounts.Rejected, icon: 'error' },
      { label: 'Sending To External System', count: displaySesCounts.SendingToExternalSystem, icon: 'send' },
      { label: 'Submitted', count: displaySesCounts.Submitted, icon: 'info' },
    ];
  };

  const buildInvoiceCards = (): StatusCard[] => {
    return [
      { label: 'In Approval', count: displayInvoiceCounts["In Approval"], icon: 'warning' },
      { label: 'Exceptions', count: displayInvoiceCounts.Exceptions, icon: 'info' },
         { label: 'Paying', count: displayInvoiceCounts.Paying, icon: 'processing' },
      { label: 'Paid', count: displayInvoiceCounts.Paid, icon: 'success' },
      { label: 'Failed', count: displayInvoiceCounts.Failed, icon: 'error' },
      { label: 'Rejected', count: displayInvoiceCounts.Rejected, icon: 'error' },
    ];
  };

  const sections: Section[] = [
    {
      title: 'Purchase Request (PR)',
      cards: buildPRCards()
    },
    {
      title: 'Goods Receipt Note (GRN)',
      cards: buildGrnCards()
    },
    {
      title: 'Service Entry Sheet (SES)',
      cards: buildSesCards()
    },
    {
      title: 'Invoice Management',
      cards: buildInvoiceCards()
    }
  ];

  const getSectionTotal = (title: string) => {
    switch (title) {
      case 'Purchase Request (PR)':
        return displayCounts.Total;
      case 'Goods Receipt Note (GRN)':
        return displayGrnCounts.Total;
      case 'Service Entry Sheet (SES)':
        return displaySesCounts.Total;
      case 'Invoice Management':
        return displayInvoiceCounts.Total;
      default:
        return 0;
    }
  };

const formatTimestampMultipleTimezones = (timestamp: string): { dubai: string; zurich: string; utc: string } => {
  if (!timestamp) {
    return { dubai: '', zurich: '', utc: '' };
  }

  try {
    const date = new Date(timestamp);

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    };

    // Format for Dubai (GST - UTC+4)
    const dubai = date.toLocaleDateString('en-US', {
      ...options,
      timeZone: 'Asia/Dubai',
    });

    // Format for Zurich (CET/CEST - UTC+1/+2)
    const zurich = date.toLocaleDateString('en-US', {
      ...options,
      timeZone: 'Europe/Zurich',
    });

    // UTC time for reference
    const utc = date.toLocaleDateString('en-US', {
      ...options,
      timeZone: 'UTC',
    });

    return { dubai, zurich, utc };
  } catch (error: any) {
    if (error?.response?.status === 401) {
      navigate("/");
    }
    return { dubai: '', zurich: '', utc: '' };
  }
};


const getLastUpdatedAt = (title: string) => {
  let timestamp = '';
  switch (title) {
    case 'Purchase Request (PR)':
      timestamp = displayCounts.LastUpdatedAt;
      break;
    case 'Goods Receipt Note (GRN)':
      timestamp = displayGrnCounts.LastUpdatedAt;
      break;
    case 'Service Entry Sheet (SES)':
      timestamp = displaySesCounts.LastUpdatedAt;
      break;
    case 'Invoice Management':
      timestamp = displayInvoiceCounts.LastUpdatedAt;
      break;
    default:
      return { dubai: '', zurich: '' };
  }

  if (!timestamp) return { dubai: '', zurich: '' };

  return formatTimestampMultipleTimezones(timestamp);
};

 const renderCheckboxDropdown = (field: 'suppliers' | 'departments' | 'properties' | 'requestors' | 'glAccounts' | 'costCenters') => {
    const isOpen = dropdownOpen[field];
    const selectedValues = filters[field];
    const searchQuery = searchQueries[field];
    const filteredOptions = getFilteredOptions(field, searchQuery);
    const allOptions = filterOptions[field];
    const isPaginated = field === 'suppliers' || field === 'requestors' || field === 'glAccounts' || field === 'costCenters';
    const pagination = isPaginated ? paginationState[field] : null;
    
    let totalOptions = 0;
    if (field === 'properties' && Array.isArray(allOptions)) {
      totalOptions = (allOptions as PropertyOption[]).length;
    } else if (Array.isArray(allOptions)) {
      totalOptions = (allOptions as string[]).length;
    }

    const isAllSelected = selectedValues.length === totalOptions && totalOptions > 0;

    return (
      <div className="pr-checkbox-dropdown">
        <button
          className="pr-dropdown-toggle"
          onClick={() => toggleDropdown(field)}
        >
          <span>
  {selectedValues.length > 0
    ? `${selectedValues.length} selected`
    : field === 'glAccounts'
      ? 'Select GL Accounts'
      : field === 'costCenters'
        ? 'Select Cost Centers'
        : `Select ${field.charAt(0).toUpperCase() + field.slice(1)}`
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
              if (isPaginated && (field === 'suppliers' || field === 'requestors' || field === 'glAccounts' || field === 'costCenters')) {
                handleDropdownScroll(e, field);
              }
            }}
          >
            <div className="pr-search-box">
              <input
                type="text"
                placeholder={
  field === 'glAccounts' ? 'Search GL Accounts...' :
  field === 'costCenters' ? 'Search Cost Centers...' :
  `Search ${field.charAt(0).toUpperCase() + field.slice(1)}...`
}
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
                {field === 'properties' ? (
                  (filteredOptions as PropertyOption[]).map((option) => (
                    <label key={option.value} className="pr-checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedValues.includes(option.value)}
                        onChange={() => handleFilterCheckboxChange(field, option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))
                ) : (
                  (filteredOptions as string[]).map((option) => (
                    <label key={option} className="pr-checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedValues.includes(option)}
                        onChange={() => handleFilterCheckboxChange(field, option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))
                )}
              </>
            ) : (
              <div className="pr-dropdown-empty">No options match your search</div>
            )}

            {isPaginated && pagination && pagination.isLoading && (
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

  return (
    <>
      {loading ? (
        <SpinnerLoaders fullScreen={true} size="medium" text="Loading data..." />
      ) : (
        <div className="pr-container">
          <div className="pr-title-section">
            <div className="pr-header-content">
              <div className="pr-logo">
                <svg className="pr-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                </svg>
              </div>
              <div>
                <h1 className="pr-header-title">Pulse Report</h1>
                <p className="pr-header-subtitle">Enterprise Procurement Intelligence Dashboard</p>
              </div>
            </div>
          </div>

          <div className="pr-filter-section">
            <div className="pr-filter-header">
              <svg className="pr-filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              <span className="pr-filter-title">Filters</span>
            </div>

            <div className="pr-grid-row">
  <div className="pr-form-group">
    <label className="pr-label">Supplier</label>
    {renderCheckboxDropdown('suppliers')}
  </div>

  <div className="pr-form-group">
    <label className="pr-label">Department</label>
    {renderCheckboxDropdown('departments')}
  </div>

  <div className="pr-form-group">
    <label className="pr-label">Property</label>
    {renderCheckboxDropdown('properties')}
  </div>

  {/* From Date - Only ONE clean custom calendar icon */}
<div className="pr-form-group">
  <label className="pr-label">From Date</label>
  <div className="pr-input-wrapper pr-date-input-wrapper">
    <input
      type="date"
      value={filters.fromDate}
      onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
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

{/* To Date - Same fix */}
<div className="pr-form-group">
  <label className="pr-label">To Date</label>
  <div className="pr-input-wrapper pr-date-input-wrapper">
    <input
      type="date"
      value={filters.toDate}
      onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
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

<div className="pr-grid-row">
  <div className="pr-form-group">
    <label className="pr-label">GL Accounts</label>
    {renderCheckboxDropdown('glAccounts')}
  </div>

  <div className="pr-form-group">
    <label className="pr-label">Cost Centers</label>
    {renderCheckboxDropdown('costCenters')}
  </div>

  <div className="pr-form-group">
    <label className="pr-label">Requestor</label>
    {renderCheckboxDropdown('requestors')}
  </div>
</div>

            <div className="pr-grid-row-2">
              <div className="pr-button-group">
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

          <div className="pr-content" ref={contentRef}>
            <div className="pr-dashboard-grid">
              {sections.map((section, idx) => (
                <div key={idx} className="pr-section-card">
                  <div className="pr-section-header">
                    <div className="pr-section-header-left">
                      <h2 className="pr-section-title">
                        {section.title}
                        <span className="pr-section-header-total"> {getSectionTotal(section.title)}</span>
                      </h2>
                        {(() => {
                          const timezones = getLastUpdatedAt(section.title);
                          return (
                            <div className="pr-last-updated-container">
                              <div className="pr-last-updated-title">Last Updated</div>

                              <div className="pr-timezone-row">
                                <img src="https://flagcdn.com/ae.svg" alt="UAE flag" className="pr-flag-icon" />
                                <span className="pr-tz-label">Dubai:</span>
                                <span className="pr-tz-time">{timezones.dubai}</span>
                              </div>

                              <div className="pr-timezone-row">
                                <img src="https://flagcdn.com/ch.svg" alt="Switzerland flag" className="pr-flag-icon" />
                                <span className="pr-tz-label">Zurich:</span>
                                <span className="pr-tz-time">{timezones.zurich}</span>
                              </div>
                            </div>
                          );
                        })()}
                    </div>
                    <button
                      className={`pr-expand-button ${refreshingSection === section.title ? 'refreshing' : ''}`}
                      onClick={() => handleRefreshSection(section.title)}
                      disabled={refreshingSection === section.title}
                      title="Refresh data"
                    >
                      <RotateCw width={16} height={16} strokeWidth={2.5} color="#ffffff" />
                    </button>
                  </div>

                  <div className="pr-cards-grid">
                    {section.cards.map((card, cardIdx) => {
                      const iconData = getIcon(card.icon);
                      const isAnimating = animatingCards.has('all') || animatingCards.has(card.label);
                      return (
                        <div
                          key={cardIdx}
                          className={`pr-status-card ${isAnimating ? 'pulse-animate' : ''}`}
                          onClick={() => handleCardClick(section.title, card.label, card.count)}
                        >
                          <div className="pr-status-card-header">
                            <span className="pr-status-label">{card.label}</span>
                            <div className="pr-status-icon" style={{ backgroundColor: iconData.bgColor }}>
                              {iconData.icon}
                            </div>
                          </div>
                          <div className="pr-status-count">{card.count}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PulseReportDashboard;