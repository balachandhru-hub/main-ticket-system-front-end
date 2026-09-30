import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronDown, DollarSign, Users, Layers,
  Activity, Download, Wrench, Filter, X, ArrowLeft, GripVertical, Search, Info, Copy, Maximize2, Minimize2, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, HelpCircle, MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFilter } from './context/PulseContext';
import './NewPulseReportDashboard.css';
import SpinnerLoaders from './SpinnerLoaders';
import { toast } from 'react-toastify';
import {
  fetchKPI,
  fetchOutlets,
  fetchCostCenters,
  fetchSpendMaterials,
  fetchSpendSuppliers,
  fetchAbcAnalysis,
  fetchSpendServices,
  fetchMonthlySpendTrend,
  fetchOutletSpendVariance,
  fetchSpendForecast,
  fetchPurchaseFrequency,
  fetchMaterialVariance,
  fetchMaterialVarianceReason,
  fetchSpendByCategory,
  fetchSpendByOutlet,
  fetchSpendByType,
  fetchUnitPriceTrend,
  fetchDailySpendTrend,
  fetchUnitPriceOutlierAnalysis,
  fetchQuantityTrend,
  fetchQuantityDetails,
  fetchSpendByMaterialDetail,
  fetchMaterialGroups,
  fetchMaterialsDetails,
  fetchSpendBySupplier,
  fetchSupplierDetails,
  fetchCategoryDetails,
  fetchOutletDetails,
  saveSavingsMode,
  saveBulkSavingsMode,
  fetchFrequencyMonthlyAnalysis,
  fetchKraljicMatrixAnalysis,
  fetchSavingsModeHistory,
  fetchUnitPriceDetails,
  fetchMaterialComparison
} from '../api/SpendApi';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { KraljicMatrixModal } from './dashboard/modals/KraljicMatrixModal';
import { UnitPricePointModal } from './dashboard/modals/UnitPricePointModal';
import { OutlierDetailsModal } from './dashboard/modals/OutlierDetailsModal';
import { SearchableSingleSelect } from './dashboard/modals/SearchableSingleSelect';
import { InfoGuideModal } from './dashboard/modals/InfoGuideModal';
import { RaiseQueryModal } from './dashboard/modals/RaiseQueryModal';
import { GraphPointDetailModal } from './dashboard/modals/GraphPointDetailModal';
import { ShowQueriesModal } from './dashboard/modals/ShowQueriesModal';
import { MaterialSurveyModal } from './dashboard/modals/MaterialSurveyModal';

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);
interface FilterValues {
  suppliers: string[];
  departments: string[];
  properties: string[];
  fromDate: string;
  glAccounts: string[];
  costCenters: string[];
  toDate: string;
  requestors: string[];
  materialCodes: string[];
  materialGroups: string[];
  services: string[];
  itemType: 'all' | 'material' | 'service';
}

interface FilterOptions {
  suppliers: string[];
  materialCodes: string[];
  materialGroups: string[];
  services: string[];
  properties?: string[];
  costCenters?: string[];
}

const DASHBOARD_CONFIG = [
  {
    id: "PROCUREMENT_PERFORMANCE",
    name: "Procurement Performance",
    model: "PROCUREMENT_PERFORMANCE"
  }
];

const CATEGORY_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#f97316', '#84cc16', '#6366f1', '#14b8a6',
  '#ef4444', '#d946ef', '#0284c7', '#059669', '#d97706',
  '#7c3aed', '#db2777', '#0891b2', '#ea580c', '#65a30d'
];

export const getCategoryColor = (categoryName: string, index: number) => {
  if (!categoryName) return CATEGORY_PALETTE[0];
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
};

const getCategoryName = (groupName: string) => {
  if (!groupName) return 'Others';
  return groupName.trim();
};

const aggregateByCategory = (data: Array<{ material_group: string; total_spend: number }>) => {
  const categories: Record<string, number> = {};
  data.forEach(item => {
    const cat = getCategoryName(item.material_group);
    categories[cat] = (categories[cat] || 0) + item.total_spend;
  });
  return Object.entries(categories)
    .map(([category, total_spend]) => ({ category, total_spend }))
    .sort((a, b) => b.total_spend - a.total_spend);
};

export const formatDateTimeDisplay = (dateStr?: string | null): string => {
  if (!dateStr || dateStr === '-') return '-';
  let str = String(dateStr).trim();
  if (!str) return '-';

  // Replace 'T' with space
  str = str.replace('T', ' ');
  // Remove milliseconds and trailing Z if present
  str = str.replace(/\.\d+Z?$/, '').replace(/Z$/, '');
  // Remove trailing 00:00:00 or 00:00 (midnight time placeholder)
  str = str.replace(/ 00:00:00$/, '').replace(/ 00:00$/, '');

  return str;
};

const NewPulseReportDashboard: React.FC = () => {
  const { filtersQuick, setFiltersQuick } = useFilter();
  const navigate = useNavigate();

  // Navigation Hub States
  const [activeTab, setActiveTab] = useState<string>("PROCUREMENT_PERFORMANCE");
  const [userModels, setUserModels] = useState<string[]>([]);
  const [modelLoading, setModelLoading] = useState(true);
  const [dashboardsOpen, setDashboardsOpen] = useState(true);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filtersSidebarOpen, setFiltersSidebarOpen] = useState(true);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const [infoModalTab, setInfoModalTab] = useState<'filters' | 'kpis' | 'trends' | 'kraljic' | 'anomalies'>('filters');

  // 1. Procurement filters state
  const [filters, setFilters] = useState<FilterValues>(() => ({
    suppliers: filtersQuick.supplier_filter || [],
    departments: filtersQuick.department_filter || [],
    properties: filtersQuick.company_code_filter || [],
    fromDate: filtersQuick.from_date || '',
    toDate: filtersQuick.to_date || '',
    glAccounts: filtersQuick.gl_accounts_filter || [],
    costCenters: filtersQuick.cost_centers_filter || [],
    requestors: filtersQuick.requester_filter || [],
    materialCodes: [],
    materialGroups: [],
    services: [],
    itemType: 'all',
  }));

  // Procurement applied filters state
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>(() => ({
    suppliers: filtersQuick.supplier_filter || [],
    departments: filtersQuick.department_filter || [],
    properties: filtersQuick.company_code_filter || [],
    fromDate: filtersQuick.from_date || '',
    toDate: filtersQuick.to_date || '',
    glAccounts: filtersQuick.gl_accounts_filter || [],
    costCenters: filtersQuick.cost_centers_filter || [],
    requestors: filtersQuick.requester_filter || [],
    materialCodes: [],
    materialGroups: [],
    services: [],
    itemType: 'all',
  }));

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    suppliers: [],
    materialCodes: [],
    materialGroups: [],
    services: [],
    properties: [],
    costCenters: [],
  });

  const [initialSuppliers, setInitialSuppliers] = useState<string[]>([]);
  const [initialMaterials, setInitialMaterials] = useState<string[]>([]);
  const [initialServices, setInitialServices] = useState<string[]>([]);
  const [initialProperties, setInitialProperties] = useState<string[]>([]);
  const [initialCostCenters, setInitialCostCenters] = useState<string[]>([]);
  // Open drop-down selector
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchQueries, setSearchQueries] = useState<{ [key: string]: string }>({});
  // Real-time API Spend Performance states (Initialized with empty values)
  const [perfTotalSpend, setPerfTotalSpend] = useState<string>("AED 0");
  const [perfSpendTrend, setPerfSpendTrend] = useState<{ labels: string[]; values: number[]; changePct?: (number | null)[] }>({
    labels: [],
    values: [],
    changePct: []
  });

  const [perfTotalSuppliersCount, setPerfTotalSuppliersCount] = useState<number>(0);
  const [perfTotalMaterialsCount, setPerfTotalMaterialsCount] = useState<number>(0);
  const [perfTotalServicesCount, setPerfTotalServicesCount] = useState<number>(0);
  const [perfTotalSavingAmount, setPerfTotalSavingAmount] = useState<string>("AED 0");

  const [perfUnitPriceTrend, setPerfUnitPriceTrend] = useState<{ labels: string[]; values: number[] }>({ labels: [], values: [] });
  const [perfTargetMonthUnitPrice, setPerfTargetMonthUnitPrice] = useState<number | null>(null);

  const calculateTotalCount = (explicitCount: any, listLength: number, currentPage: number, currentPageSize: number): number => {
    const parsed = Number(explicitCount);
    if (!isNaN(parsed) && parsed > listLength) {
      return parsed;
    }
    if (listLength >= currentPageSize) {
      return currentPage * currentPageSize + 1;
    }
    return Math.max(0, (currentPage - 1) * currentPageSize + listLength);
  };
  const [baselineMonth, setBaselineMonth] = useState<string>('');
  const [targetMonth, setTargetMonth] = useState<string>('');
  const [unitPriceLoading, setUnitPriceLoading] = useState<boolean>(false);
  const [selectedTrendMaterial] = useState<string>('');

  useEffect(() => {
    setBaselineMonth('');
    setTargetMonth('');
  }, [selectedTrendMaterial]);
  const [perfQuantityTrend, setPerfQuantityTrend] = useState<{ labels: string[]; values: number[] }>({ labels: [], values: [] });
  const [_perfPurchaseFrequency, _setPerfPurchaseFrequency] = useState<any[]>([]);

  // Savings Modal States
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState<boolean>(false);
  const [savingsData, setSavingsData] = useState<any[]>([]);
  const [savingsLoading, setSavingsLoading] = useState<boolean>(false);
  const [savingsPage, setSavingsPage] = useState<number>(1);
  const [savingsTotalCount, setSavingsTotalCount] = useState<number>(0);
  const savingsPageSize = 10;

  const loadSavingsData = useCallback(async (page: number) => {
    setSavingsLoading(true);
    try {
      const res = await fetchSavingsModeHistory({
        type: "PROCUREMENT_PERFORMANCE",
        page,
        page_size: savingsPageSize
      });
      if (res && res.status === 'success' && res.data && Array.isArray(res.data.items)) {
        setSavingsData(res.data.items);
        setSavingsTotalCount(res.total_count || 0);
      } else {
        setSavingsData([]);
        setSavingsTotalCount(0);
      }
    } catch (err) {
      console.warn("Failed to fetch savings history", err);
      setSavingsData([]);
    } finally {
      setSavingsLoading(false);
    }
  }, []);
  const [leadTimeViewMode, setLeadTimeViewMode] = useState<'chart' | 'table'>('chart');

  // Drag and Drop States for Trend Cards (Spend Trend, Total Quantity Trend, Avg Unit Price Trend)
  const [trendCardsOrder, setTrendCardsOrder] = useState<string[]>(['spend_trend', 'quantity_trend', 'price_trend']);
  const [draggedCardKey, setDraggedCardKey] = useState<string | null>(null);
  const [dragOverCardKey, setDragOverCardKey] = useState<string | null>(null);

  const handleDropTrendCard = useCallback((targetKey: string) => {
    if (!draggedCardKey || draggedCardKey === targetKey) {
      setDraggedCardKey(null);
      setDragOverCardKey(null);
      return;
    }
    setTrendCardsOrder(prev => {
      const fromIdx = prev.indexOf(draggedCardKey);
      const toIdx = prev.indexOf(targetKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const newOrder = [...prev];
      const temp = newOrder[fromIdx];
      newOrder[fromIdx] = newOrder[toIdx];
      newOrder[toIdx] = temp;
      return newOrder;
    });
    setDraggedCardKey(null);
    setDragOverCardKey(null);
  }, [draggedCardKey]);

  // ABC Spend Analysis States
  const [abcSummary, setAbcSummary] = useState<Array<{ category: string; material_count: number; total_spend: number; percentage_spend: number }>>([]);
  const [abcMaterials, setAbcMaterials] = useState<Array<{ supplier_name: string; material_name: string; total_spend: number; percentage: number; cumulative_percentage: number; category: string }>>([]);
  const [abcTotalMaterials, setAbcTotalMaterials] = useState<number>(0);
  const [abcTotalSpend, setAbcTotalSpend] = useState<number>(0);
  const [abcLoading, setAbcLoading] = useState<boolean>(true);
  const [abcPage, setAbcPage] = useState<number>(1);
  const abcPageSize = 150;
  const [abcItemType, setAbcItemType] = useState<'all' | 'material' | 'service'>('all');
  const [abcCategoryFilter, setAbcCategoryFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');

  // A B C Category Threshold
  const [abcThresholdA, setAbcThresholdA] = useState<number | ''>(40);
  const [abcThresholdB, setAbcThresholdB] = useState<number | ''>(40);

  const [appliedAbcThresholdA, setAppliedAbcThresholdA] = useState<number>(40);
  const [appliedAbcThresholdB, setAppliedAbcThresholdB] = useState<number>(40);

  const abcThresholdC = 100 - (Number(abcThresholdA) || 0) - (Number(abcThresholdB) || 0);

  const handleAbcThresholdAChange = (value: string) => {
    if (value === '') {
      setAbcThresholdA('');
      return;
    }

    const newA = Math.min(100, Math.max(0, Number(value)));

    setAbcThresholdA(newA);

    // If A is 100, B must be 0
    if (newA === 100) {
      setAbcThresholdB(0);
      return;
    }

    // If A is 99, B can only be 1
    if (newA === 99) {
      setAbcThresholdB(Math.min(Number(abcThresholdB) || 0, 1));
      return;
    }

    const currentB = Number(abcThresholdB) || 0;
    const maxB = 100 - newA;

    // Reduce B only if it becomes invalid
    if (currentB > maxB) {
      setAbcThresholdB(maxB);
    }
  };

  const handleAbcThresholdBChange = (value: string) => {
    if (value === '') {
      setAbcThresholdB('');
      return;
    }

    const maxB = 100 - (Number(abcThresholdA) || 0);

    const newB = Math.min(
      maxB,
      Math.max(0, Number(value))
    );

    setAbcThresholdB(newB);
  };

  // Outlet Spend Variance States
  const [varianceChartMode, setVarianceChartMode] = useState<'variance_aed' | 'variance_percent' | 'spend_vs_avg'>('variance_aed');
  const [outletSummary, setOutletSummary] = useState<{ total_outlets: number; average_spend: number }>({ total_outlets: 0, average_spend: 0 });
  const [outletVarianceList, setOutletVarianceList] = useState<Array<{ outlet: string; total_spend: number; avg_spend: number; variance: number; status: string }>>([]);
  const [outletTotalCount, setOutletTotalCount] = useState<number>(0);
  const [outletLoading, setOutletLoading] = useState<boolean>(true);
  const [outletPage, setOutletPage] = useState<number>(1);
  const outletPageSize = 10;
  const [spendByOutletList, setSpendByOutletList] = useState<Array<{ outlet: string; total_spend: number; company_code: string }>>([]);
  const [spendByOutletLoading, setSpendByOutletLoading] = useState<boolean>(true);

  // Spend Forecast States
  const [forecastHistorical, setForecastHistorical] = useState<Array<{ month: string; total_spend: number }>>([]);
  const [forecastPredicted, setForecastPredicted] = useState<Array<{ month: string; total_spend: number }>>([]);
  const [forecastSteps, setForecastSteps] = useState<number>(3);
  const [forecastLoading, setForecastLoading] = useState<boolean>(true);

  // Purchase Frequency States
  const [purchaseFrequencyList, setPurchaseFrequencyList] = useState<Array<{
    supplier: string;
    material_code: string;
    avg_days_between_grns: number;
    frequency: string;
  }>>([]);
  const [purchaseFrequencyTotalCount, setPurchaseFrequencyTotalCount] = useState<number>(0);
  const [purchaseFrequencyPage, setPurchaseFrequencyPage] = useState<number>(1);
  const purchaseFrequencyPageSize = 10;
  const [pfMaterialCodeFilter, setPfMaterialCodeFilter] = useState<string>('all');
  const [pfMaterialOptions, setPfMaterialOptions] = useState<string[]>([]);
  const [pfMaterialSearchQuery, setPfMaterialSearchQuery] = useState<string>('');
  const [pfMaterialSearching, setPfMaterialSearching] = useState<boolean>(false);
  const [isPfMaterialDropdownOpen, setIsPfMaterialDropdownOpen] = useState<boolean>(false);
  const pfDropdownRef = useRef<HTMLDivElement>(null);

  // Frequency Monthly Analysis Modal States
  const [isFrequencyModalOpen, setIsFrequencyModalOpen] = useState<boolean>(false);
  const [selectedMaterialForFrequencyModal, setSelectedMaterialForFrequencyModal] = useState<string>('');
  const [frequencyModalLoading, setFrequencyModalLoading] = useState<boolean>(false);
  const [frequencyMonthlyData, setFrequencyMonthlyData] = useState<Array<{
    month: string;
    outlets: Array<{
      outlet: string;
      company_code: string | null;
      cost_center: string | null;
      quantity: number;
      total_price: number;
      avg_days_between_grns: number | null;
    }>;
  }>>([]);
  const [frequencyModalTotalMonths, setFrequencyModalTotalMonths] = useState<number>(0);

  const loadFrequencyMonthlyAnalysis = async (materialCode: string) => {
    if (!materialCode) return;
    setSelectedMaterialForFrequencyModal(materialCode);
    setIsFrequencyModalOpen(true);
    setFrequencyModalLoading(true);

    try {
      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        material_code: materialCode,
        material_name: materialCode,
        outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        cost_center: appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined,
        supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers[0] : undefined,
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        page: 1,
        page_size: 50
      };
      if (appliedFilters.itemType && appliedFilters.itemType !== 'all') {
        payload.item_type = appliedFilters.itemType;
      }
      if (appliedFilters.materialGroups && appliedFilters.materialGroups.length > 0) {
        payload.material_group = appliedFilters.materialGroups[0];
      }

      const res = await fetchFrequencyMonthlyAnalysis(payload);
      if (res && res.status === "success" && res.data) {
        setFrequencyMonthlyData(res.data.months || []);
        setFrequencyModalTotalMonths(res.total_months || (res.data.months ? res.data.months.length : 0));
      } else {
        setFrequencyMonthlyData([]);
        setFrequencyModalTotalMonths(0);
      }
    } catch (err) {
      console.warn("Failed to fetch frequency monthly analysis", err);
      setFrequencyMonthlyData([]);
      setFrequencyModalTotalMonths(0);
    } finally {
      setFrequencyModalLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pfDropdownRef.current && !pfDropdownRef.current.contains(event.target as Node)) {
        setIsPfMaterialDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Material Code options dynamically from backend API on search
  useEffect(() => {
    if (!isPfMaterialDropdownOpen) return;

    setPfMaterialSearching(true);
    const timer = setTimeout(async () => {
      try {
        const q = pfMaterialSearchQuery;
        const activeOutlet = appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined;
        const activeCostCenter = appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined;
        const activeSupplier = appliedFilters.suppliers.length > 0 ? (Array.isArray(appliedFilters.suppliers) ? appliedFilters.suppliers[0] : appliedFilters.suppliers) : undefined;
        const activeMaterialCode = appliedFilters.materialCodes.length > 0 ? (Array.isArray(appliedFilters.materialCodes) ? appliedFilters.materialCodes[0] : appliedFilters.materialCodes) : undefined;
        const activeMaterialGroup = appliedFilters.materialGroups.length > 0 ? (Array.isArray(appliedFilters.materialGroups) ? appliedFilters.materialGroups[0] : appliedFilters.materialGroups) : undefined;

        const payload: any = {
          type: "PROCUREMENT_PERFORMANCE",
          outlet: activeOutlet || undefined,
          cost_center: activeCostCenter || undefined,
          supplier_name: activeSupplier || undefined,
          material_code: activeMaterialCode || undefined,
          material_name: activeMaterialCode || (filters.services.length > 0 ? filters.services : undefined),
          start_date: appliedFilters.fromDate || undefined,
          end_date: appliedFilters.toDate || undefined,
          material_group: activeMaterialGroup || undefined,
          search: q && q.length > 0 ? q : undefined,
          page: 1,
          page_size: 50
        };

        const res = await fetchSpendMaterials(payload);
        if (res && (res.status === 'success' || res.status === 200 || res.data)) {
          const rawItems = res.data?.materials || res.data?.items || res.materials || (Array.isArray(res.data) ? res.data : []);
          const codes = rawItems.map((m: any) => {
            if (typeof m === 'string') return m;
            return m.material_code || m.material_name || m.code || m.name || m.material;
          }).filter(Boolean);

          if (codes.length > 0) {
            setPfMaterialOptions(Array.from(new Set(codes)));
          } else if (q && q.trim()) {
            const pfRes = await fetchPurchaseFrequency({ ...payload, page_size: 50 });
            if (pfRes && pfRes.status === 'success' && pfRes.data?.purchase_frequency) {
              const pfCodes = pfRes.data.purchase_frequency.map((x: any) => x.material_code).filter(Boolean);
              setPfMaterialOptions(Array.from(new Set(pfCodes)));
            } else {
              setPfMaterialOptions([]);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch material search results from API", err);
      } finally {
        setPfMaterialSearching(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [pfMaterialSearchQuery, isPfMaterialDropdownOpen, appliedFilters]);

  const [isMaterialFilterSearching, setIsMaterialFilterSearching] = useState<boolean>(false);
  const materialFilterSearchQuery = searchQueries['materialCodes'] || '';
  useEffect(() => {
    if (openDropdown !== 'materialCodes') {
      setIsMaterialFilterSearching(false);
      return;
    }

    if (materialFilterSearchQuery && materialFilterSearchQuery.trim().length > 0) {
      setIsMaterialFilterSearching(true);
    } else {
      setIsMaterialFilterSearching(false);
    }

    const timer = setTimeout(async () => {
      try {
        const q = materialFilterSearchQuery;
        const activeOutlet = filters.properties.length > 0 ? filters.properties[0] : undefined;
        const activeCostCenter = filters.costCenters.length > 0 ? filters.costCenters[0] : undefined;
        const activeSupplier = filters.suppliers.length > 0 ? (Array.isArray(filters.suppliers) ? filters.suppliers[0] : filters.suppliers) : undefined;
        const activeMaterialGroup = filters.materialGroups.length > 0 ? (Array.isArray(filters.materialGroups) ? filters.materialGroups[0] : filters.materialGroups) : undefined;

        const payload: any = {
          type: "PROCUREMENT_PERFORMANCE",
          outlet: activeOutlet || undefined,
          cost_center: activeCostCenter || undefined,
          supplier_name: activeSupplier || undefined,
          start_date: filters.fromDate || undefined,
          end_date: filters.toDate || undefined,
          material_group: activeMaterialGroup || undefined,
          search: q && q.length > 0 ? q : undefined,
          page: 1,
          page_size: 50
        };

        const res = await fetchSpendMaterials(payload);
        if (res && (res.status === 'success' || res.status === 200 || res.data)) {
          const rawItems = res.data?.materials || res.data?.items || res.materials || (Array.isArray(res.data) ? res.data : []);
          const fetchedCodes = rawItems.map((m: any) => {
            if (typeof m === 'string') return m;
            return m.material_code || m.material_name || m.code || m.name || m.material;
          }).filter(Boolean);

          if (fetchedCodes.length > 0) {
            setFilterOptions(prev => ({
              ...prev,
              materialCodes: Array.from(new Set([...(prev.materialCodes || []), ...fetchedCodes]))
            }));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch search results for materialCodes filter", err);
      } finally {
        setIsMaterialFilterSearching(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [materialFilterSearchQuery, openDropdown, filters.properties, filters.costCenters, filters.suppliers, filters.materialGroups, filters.fromDate, filters.toDate]);

  // Material Variance / Spend Anomalies States
  const [materialVarianceList, setMaterialVarianceList] = useState<Array<{
    supplier: string;
    material_code: string;
    months: string[];
    current_spend: number[];
    historical_average: number[];
    variance: number[];
    anomaly: string[];
  }>>([]);
  const [materialVarianceTotalCount, setMaterialVarianceTotalCount] = useState<number>(0);
  const [materialVariancePage, setMaterialVariancePage] = useState<number>(1);
  const materialVariancePageSize = 10;
  const [materialVarianceStatusFilter, setMaterialVarianceStatusFilter] = useState<string>('all');
  const [anomalyThreshold, _setAnomalyThreshold] = useState<number | undefined>(undefined);

  // Material Variance Reason & Outlier Analysis Modal States
  const [isVarianceReasonModalOpen, setIsVarianceReasonModalOpen] = useState<boolean>(false);
  const [selectedAnomalyForModal, setSelectedAnomalyForModal] = useState<any | null>(null);
  const [varianceReasonLoading, setVarianceReasonLoading] = useState<boolean>(false);
  const [varianceMonthlyReasons, setVarianceMonthlyReasons] = useState<Array<{
    month: string;
    status: string;
    current_spend: number;
    current_quantity?: number;
    running_weighted_average?: number;
    baseline_value?: number;
    baseline_source?: string;
    arithmetic_mean_running_weighted_average?: number;
    historical_average?: number;
    variance_percentage: number;
    reason: string;
  }>>([]);
  const [modalFromDate, setModalFromDate] = useState<string>('');
  const [modalToDate, setModalToDate] = useState<string>('');

  // Unit Price Outlier Feed & Modal States
  const [raiseQueryModalData, setRaiseQueryModalData] = useState<{
    supplierName?: string;
    materialName?: string;
    fromDate?: string;
    toDate?: string;
    title?: string;
    message?: string;
    to?: string;
    from?: string;
  } | null>(null);
  const [isShowQueriesModalOpen, setIsShowQueriesModalOpen] = useState<boolean>(false);
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState<boolean>(false);
  const [surveyMaterialName] = useState<string>('');
  const [surveySupplierName] = useState<string>('');
  const [isFloatingMenuOpen, setIsFloatingMenuOpen] = useState<boolean>(false);
  const [unitPriceOutlierFeed, setUnitPriceOutlierFeed] = useState<any[]>([]);
  const [unitPriceOutlierLoading, setUnitPriceOutlierLoading] = useState<boolean>(false);
  const [unitPriceOutlierTotalCount, setUnitPriceOutlierTotalCount] = useState<number>(0);
  const [unitPriceOutlierPage, setUnitPriceOutlierPage] = useState<number>(1);
  const unitPriceOutlierPageSize = 10;
  const [unitPriceOutlierBaselineMonth, setUnitPriceOutlierBaselineMonth] = useState<string>('');
  const [unitPriceOutlierOnlyAnomalies, setUnitPriceOutlierOnlyAnomalies] = useState<boolean>(false);

  const [isOutlierModalOpen, setIsOutlierModalOpen] = useState<boolean>(false);
  const [selectedOutlierItemForModal, setSelectedOutlierItemForModal] = useState<any | null>(null);
  const [outlierModelSubTab, setOutlierModelSubTab] = useState<'all' | 'z_score' | 'mad' | 'iqr' | 'rolling'>('all');

  const loadUnitPriceOutlierFeed = useCallback(async () => {
    setUnitPriceOutlierLoading(true);
    try {
      const activeOutlet = appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined;
      const activeCostCenter = appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined;
      const activeSupplier = appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers[0] : undefined;
      const activeMaterialCodes = appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined;
      const activeMaterialGroup = appliedFilters.materialGroups.length > 0 ? (Array.isArray(appliedFilters.materialGroups) ? appliedFilters.materialGroups[0] : appliedFilters.materialGroups) : undefined;

      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        outlet: activeOutlet || undefined,
        cost_center: activeCostCenter || undefined,
        supplier_name: activeSupplier ? [activeSupplier] : undefined,
        material_code: activeMaterialCodes,
        material_name: activeMaterialCodes,
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        calculation: "all",
        item_type: appliedFilters.itemType && appliedFilters.itemType !== 'all' ? appliedFilters.itemType : undefined,
        material_group: activeMaterialGroup || undefined,
        filter: unitPriceOutlierOnlyAnomalies ? "anomaly" : undefined,
        page: unitPriceOutlierPage,
        page_size: unitPriceOutlierPageSize
      };

      const res = await fetchUnitPriceOutlierAnalysis(payload);
      if (res && res.status === "success" && res.data) {
        const items = res.data.items || (Array.isArray(res.data) ? res.data : []);
        setUnitPriceOutlierFeed(items);
        setUnitPriceOutlierTotalCount(calculateTotalCount(res.total_count || res.total_items, items.length, unitPriceOutlierPage, unitPriceOutlierPageSize));
        setUnitPriceOutlierBaselineMonth(res.baseline_month || '');
      } else {
        setUnitPriceOutlierFeed([]);
        setUnitPriceOutlierTotalCount(0);
      }
    } catch (err) {
      console.warn("Failed to fetch unit price outlier feed", err);
      setUnitPriceOutlierFeed([]);
    } finally {
      setUnitPriceOutlierLoading(false);
    }
  }, [appliedFilters, unitPriceOutlierPage, unitPriceOutlierPageSize, unitPriceOutlierOnlyAnomalies]);

  // Unit Price Point Click Details Modal States
  const [isUnitPricePointModalOpen, setIsUnitPricePointModalOpen] = useState<boolean>(false);
  const [unitPricePointSelectedMonth, setUnitPricePointSelectedMonth] = useState<string>('');
  const [unitPricePointData, setUnitPricePointData] = useState<any[]>([]);
  const [unitPricePointLoading, setUnitPricePointLoading] = useState<boolean>(false);
  const [unitPricePointTotalRecords, setUnitPricePointTotalRecords] = useState<number>(0);
  const [unitPricePointTotalUnitPrice, setUnitPricePointTotalUnitPrice] = useState<number>(0);
  const [unitPricePointPage, setUnitPricePointPage] = useState<number>(1);
  const unitPricePointPageSize = 10;

  const loadUnitPricePointDetails = useCallback(async (monthStr?: string, pageNum: number = 1) => {
    const targetM = monthStr || unitPricePointSelectedMonth;
    if (!targetM) return;

    setUnitPricePointLoading(true);
    try {
      const activeOutlet = appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined;
      const activeCostCenter = appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined;
      const activeSupplier = appliedFilters.suppliers.length > 0 ? (Array.isArray(appliedFilters.suppliers) ? appliedFilters.suppliers[0] : appliedFilters.suppliers) : undefined;
      const activeMaterialCode = appliedFilters.materialCodes.length > 0 ? (Array.isArray(appliedFilters.materialCodes) ? appliedFilters.materialCodes[0] : appliedFilters.materialCodes) : undefined;
      const activeMaterialGroup = appliedFilters.materialGroups.length > 0 ? (Array.isArray(appliedFilters.materialGroups) ? appliedFilters.materialGroups[0] : appliedFilters.materialGroups) : undefined;
      const activeCategory = activeMaterialGroup;

      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        month: targetM,
        target_month: targetMonth || undefined,
        supplier_name: activeSupplier || undefined,
        material_name: activeMaterialCode || undefined,
        category: activeCategory || undefined,
        outlet: activeOutlet || undefined,
        costcenter: activeCostCenter || undefined,
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        material_group: activeMaterialGroup || undefined,
        page: pageNum,
        page_size: unitPricePointPageSize
      };

      const res = await fetchUnitPriceDetails(payload);
      if (res && (res.status === 'success' || res.status === 200 || res.data)) {
        const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        setUnitPricePointData(items);
        setUnitPricePointTotalRecords(res.total_records || res.total_count || items.length);
        setUnitPricePointTotalUnitPrice(res.total_unitprice || 0);
      } else {
        setUnitPricePointData([]);
        setUnitPricePointTotalRecords(0);
        setUnitPricePointTotalUnitPrice(0);
      }
    } catch (err) {
      console.warn("Failed to fetch unit price point details", err);
      setUnitPricePointData([]);
    } finally {
      setUnitPricePointLoading(false);
    }
  }, [appliedFilters, targetMonth, unitPricePointPageSize, unitPricePointSelectedMonth]);

  const handleOutlierCardClick = useCallback((item: any) => {
    setSelectedOutlierItemForModal(item);
    setIsOutlierModalOpen(true);
  }, []);

  // Kraljic Matrix Analysis States
  const [kraljicData, setKraljicData] = useState<any | null>(null);
  const [kraljicLoading, setKraljicLoading] = useState<boolean>(false);
  const [kraljicPage, setKraljicPage] = useState<number>(1);
  const [kraljicPageSize, setKraljicPageSize] = useState<number>(25);
  const [isKraljicModalOpen, setIsKraljicModalOpen] = useState<boolean>(false);
  const [isRaiseQueryModalOpen, setIsRaiseQueryModalOpen] = useState<boolean>(false);
  const [selectedKraljicQuadrant, setSelectedKraljicQuadrant] = useState<'all' | 'strategic_items' | 'leverage_items' | 'bottleneck_items' | 'non_critical_items'>('all');
  const [kraljicModalSearchQuery, setKraljicModalSearchQuery] = useState<string>('');
  const [kraljicSupplierFilter, setKraljicSupplierFilter] = useState<string>('');
  const [kraljicMaterialFilter, setKraljicMaterialFilter] = useState<string>('');
  const [kraljicSortField, setKraljicSortField] = useState<'material' | 'quadrant' | 'spend' | 'quantity' | 'suppliers' | 'action'>('spend');
  const [kraljicSortOrder, setKraljicSortOrder] = useState<'asc' | 'desc'>('desc');

  // Reset Kraljic Matrix modal search and filter inputs when the modal closes
  useEffect(() => {
    if (!isKraljicModalOpen) {
      setKraljicModalSearchQuery('');
      setKraljicSupplierFilter('');
      setKraljicMaterialFilter('');
      setSelectedKraljicQuadrant('all');
      setKraljicPage(1);
    }
  }, [isKraljicModalOpen]);

  const loadKraljicMatrixData = useCallback(async (overridePage?: number, overridePageSize?: number) => {
    setKraljicLoading(true);
    try {
      const activeOutlet = appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined;
      const activeCostCenter = appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined;
      const activeSupplier = kraljicSupplierFilter || (appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers[0] : undefined);
      const activeMaterialGroup = appliedFilters.materialGroups.length > 0 ? (Array.isArray(appliedFilters.materialGroups) ? appliedFilters.materialGroups[0] : appliedFilters.materialGroups) : undefined;

      const pageToFetch = overridePage !== undefined ? overridePage : kraljicPage;
      const pageSizeToFetch = overridePageSize !== undefined ? overridePageSize : kraljicPageSize;

      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        outlet: activeOutlet || undefined,
        cost_center: activeCostCenter || undefined,
        supplier: activeSupplier ? [activeSupplier] : undefined,
        material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
        material_name: kraljicMaterialFilter ? [kraljicMaterialFilter] : ((appliedFilters.materialCodes.length > 0 || appliedFilters.services.length > 0) ? [...appliedFilters.materialCodes, ...appliedFilters.services] : undefined),
        search_query: kraljicModalSearchQuery || undefined,
        material_group: activeMaterialGroup || undefined,
        quadrant: selectedKraljicQuadrant !== 'all' ? selectedKraljicQuadrant : undefined,
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        page: pageToFetch,
        page_size: pageSizeToFetch
      };

      const res = await fetchKraljicMatrixAnalysis(payload);
      if (res && (res.status === "success" || res.status === 200 || res.kraljic_matrix)) {
        setKraljicData(res);
      } else {
        setKraljicData(null);
      }
    } catch (err) {
      console.warn("Failed to fetch Kraljic Matrix data", err);
      setKraljicData(null);
    } finally {
      setKraljicLoading(false);
    }
  }, [appliedFilters, kraljicPage, kraljicPageSize, kraljicSupplierFilter, kraljicMaterialFilter, kraljicModalSearchQuery, selectedKraljicQuadrant]);

  const handleAnomalyCardClick = useCallback(async (item: any) => {
    setSelectedAnomalyForModal(item);
    setIsVarianceReasonModalOpen(true);
    setVarianceReasonLoading(true);
    setVarianceMonthlyReasons([]);

    const activeOutlet = item.rawItem?.outlet || item.outlet || (appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined);
    const activeCostCenter = item.rawItem?.cost_center || item.cost_center || (appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined);
    const activeSupplier = item.supplier || item.supplier_name || undefined;
    const activeMaterialCode = item.materialCode || item.material_code || undefined;
    const activeMaterialGroup = appliedFilters.materialGroups.length > 0 ? (Array.isArray(appliedFilters.materialGroups) ? appliedFilters.materialGroups[0] : appliedFilters.materialGroups) : undefined;

    const reasonPayload: any = {
      type: "PROCUREMENT_PERFORMANCE",
      outlet: activeOutlet || "",
      cost_center: activeCostCenter || "",
      supplier_name: activeSupplier ? [activeSupplier] : "",
      material_code: activeMaterialCode ? [activeMaterialCode] : [],
      material_name: activeMaterialCode ? [activeMaterialCode] : [],
      target_month: "",
      baseline_month: "",
      item_type: appliedFilters.itemType && appliedFilters.itemType !== 'all' ? appliedFilters.itemType : "",
      material_group: activeMaterialGroup || ""
    };

    try {
      const reasonRes = await fetchMaterialVarianceReason(reasonPayload).catch(() => null);

      if (reasonRes && reasonRes.status === "success" && reasonRes.data) {
        if (Array.isArray(reasonRes.data.monthly_reasons)) {
          setVarianceMonthlyReasons(reasonRes.data.monthly_reasons);
        } else if (Array.isArray(reasonRes.data)) {
          setVarianceMonthlyReasons(reasonRes.data);
        } else if (typeof reasonRes.data === 'object' && (reasonRes.data.month || reasonRes.data.reason || reasonRes.data.status)) {
          setVarianceMonthlyReasons([reasonRes.data]);
        } else {
          setVarianceMonthlyReasons([]);
        }
      } else if (reasonRes && reasonRes.monthly_reasons && Array.isArray(reasonRes.monthly_reasons)) {
        setVarianceMonthlyReasons(reasonRes.monthly_reasons);
      } else if (reasonRes && typeof reasonRes === 'object' && (reasonRes.month || reasonRes.reason || reasonRes.status)) {
        setVarianceMonthlyReasons([reasonRes]);
      } else {
        setVarianceMonthlyReasons([]);
      }
    } catch (err) {
      console.error("Failed to load anomaly card details", err);
      toast.error("Failed to load anomaly details.");
    } finally {
      setVarianceReasonLoading(false);
    }
  }, [appliedFilters, baselineMonth, modalFromDate, modalToDate]);

  // Spend By Category States
  const [spendByCategoryList, setSpendByCategoryList] = useState<Array<{
    material_group: string;
    total_spend: number;
  }>>([]);
  const [_spendByCategoryTotalCount, setSpendByCategoryTotalCount] = useState<number>(0);
  const [spendByCategoryPage, setSpendByCategoryPage] = useState<number>(1);
  const [spendByCategoryLoading, setSpendByCategoryLoading] = useState<boolean>(true);
  const [spendByCategoryType, setSpendByCategoryType] = useState<string>('material');
  const spendByCategoryPageSize = 100;
  const [hasMoreSpendByCategory, setHasMoreSpendByCategory] = useState<boolean>(true);
  const [isFetchingMoreSpendByCategory, setIsFetchingMoreSpendByCategory] = useState<boolean>(false);

  // Spend By Material & Service Type States
  const [spendByMaterialList, setSpendByMaterialList] = useState<Array<{ material_name: string; total_spend: number }>>([]);
  const [spendByServiceList, setSpendByServiceList] = useState<Array<{ material_name: string; total_spend: number }>>([]);
  const [spendByMaterialTotalCount, setSpendByMaterialTotalCount] = useState<number>(0);
  const [spendByServiceTotalCount, setSpendByServiceTotalCount] = useState<number>(0);
  const [materialServiceLoading, setMaterialServiceLoading] = useState<boolean>(true);
  const [materialServicePage, setMaterialServicePage] = useState<number>(1);
  const materialServicePageSize = 10;
  const [materialServiceActiveTab, setMaterialServiceActiveTab] = useState<'material' | 'service'>('material');
  const [materialServiceViewMode, setMaterialServiceViewMode] = useState<'chart' | 'table'>('chart');
  const [spendDetailList, setSpendDetailList] = useState<Array<{
    supplier_name: string;
    material_name: string;
    item_type: string;
    total_spend: number;
    total_quantity: number;
    unit_price: number;
  }>>([]);
  const [spendDetailTotalCount, setSpendDetailTotalCount] = useState<number>(0);
  const [spendDetailPage, setSpendDetailPage] = useState<number>(1);
  const spendDetailPageSize = 10;
  const [spendDetailLoading, setSpendDetailLoading] = useState<boolean>(false);

  // Spend Breakdown Modal States
  // const [topDrawer, setTopDrawer] = useState<'material' | 'supplier' | 'category' | 'outlet' | null>(null);
  // const [modalOutlet, setModalOutlet] = useState<string>('');
  // const [modalFromDate, setModalFromDate] = useState<string>('');
  // const [modalToDate, setModalToDate] = useState<string>('');
  const [selectedMaterialForModal, setSelectedMaterialForModal] = useState<{ material_name: string; total_spend: number } | null>(null);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState<boolean>(false);
  const [modalMaterialItem, setModalMaterialItem] = useState<{
    item_name?: string;
    total_spend?: number;
    total_quantity?: number;
    total_suppliers?: number;
    best_supplier?: { supplier_name?: string; reason?: string };
    suppliers?: any[];
  } | null>(null);
  const [modalSpendDetails, setModalSpendDetails] = useState<Array<{
    supplier_name: string;
    material_name: string;
    item_type: string;
    total_spend: number;
    total_quantity: number;
    unit_price: number;
    updated_on?: string;
    target_month?: string;
    target_month_unit_price?: number | null;
    flag?: number | boolean | string;
  }>>([]);
  const [modalSpendDetailsLoading, setModalSpendDetailsLoading] = useState<boolean>(false);
  const [modalView, setModalView] = useState<'chart' | 'compare' | 'unit_price' | 'supplier_unit_price' | 'saved_details' | 'material_compare'>('chart');
  const [selectedCompareMaterials, setSelectedCompareMaterials] = useState<string[]>([]);
  const [materialComparisonData, setMaterialComparisonData] = useState<any[] | null>(null);
  const [materialComparisonLoading, setMaterialComparisonLoading] = useState<boolean>(false);
  const [materialSearchQuery, setMaterialSearchQuery] = useState<string>('');
  const [isCompareDropdownOpen, setIsCompareDropdownOpen] = useState<boolean>(false);
  const [compareMaterialOptions, setCompareMaterialOptions] = useState<string[]>([]);
  const [compareMaterialSearching, setCompareMaterialSearching] = useState<boolean>(false);
  const [isMaterialModalFullscreen, setIsMaterialModalFullscreen] = useState<boolean>(false);

  const handleCompareMaterialSearch = useCallback(async (query: string) => {
    setMaterialSearchQuery(query);
    if (!query || query.trim().length === 0) return;

    setCompareMaterialSearching(true);
    try {
      const res = await fetchSpendMaterials({
        type: "PROCUREMENT_PERFORMANCE",
        search: query.trim(),
        page: 1,
        page_size: 100
      });
      if (res && (res.status === 'success' || res.status === 200 || res.data)) {
        const nested = res.data?.data || res.data;
        const raw = Array.isArray(nested?.materials) ? nested.materials : (Array.isArray(nested) ? nested : (res.materials || []));
        const extracted = raw.map((m: any) => {
          if (typeof m === 'string') return m;
          return m.material || m.material_name || m.material_code || m.name || m.code || m.description || '';
        }).filter(Boolean);
        if (extracted.length > 0) {
          setCompareMaterialOptions(prev => Array.from(new Set([...prev, ...extracted])));
        }
      }
    } catch (err) {
      console.warn("Failed to search compare materials", err);
    } finally {
      setCompareMaterialSearching(false);
    }
  }, []);

  const loadMaterialComparison = useCallback(async (materialNames: string[]) => {
    if (!materialNames || materialNames.length === 0) {
      setMaterialComparisonData([]);
      return;
    }
    setMaterialComparisonLoading(true);
    try {
      const res = await fetchMaterialComparison({
        type: "PROCUREMENT_PERFORMANCE",
        material_name: materialNames
      });
      if (res && res.status === "success" && Array.isArray(res.data)) {
        setMaterialComparisonData(res.data);
      } else {
        setMaterialComparisonData([]);
      }
    } catch (err) {
      console.warn("Failed to fetch material comparison", err);
      setMaterialComparisonData([]);
    } finally {
      setMaterialComparisonLoading(false);
    }
  }, []);

  const [savingsHistoryItems, setSavingsHistoryItems] = useState<Array<any>>([]);
  const [savingsHistoryLoading, setSavingsHistoryLoading] = useState<boolean>(false);
  const [savingsHistoryTotalCount, setSavingsHistoryTotalCount] = useState<number>(0);
  const [savingsHistoryTotalMode, setSavingsHistoryTotalMode] = useState<number>(0);
  const [savingsHistoryOverallTotal, setSavingsHistoryOverallTotal] = useState<number>(0);
  const [savingsHistoryPage, setSavingsHistoryPage] = useState<number>(1);
  const [savingsHistoryPageSize, setSavingsHistoryPageSize] = useState<number>(10);
  const [savingsHistorySearch, setSavingsHistorySearch] = useState<string>('');
  const [expandedHistoryRowIdx, setExpandedHistoryRowIdx] = useState<number | null>(null);

  const loadSavingsModeHistory = useCallback(async (page: number = 1, pageSize: number = 10) => {
    setSavingsHistoryLoading(true);
    try {
      const rawMatName = selectedMaterialForModal?.material_name || '';
      const cleanMatName = rawMatName.replace(/\s*\(\d+\)$/, '').replace(/\s*\([^)]*\)$/, '').trim();

      // 1st Attempt: Pass clean material_name
      let payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        material_name: cleanMatName || undefined,
        outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        cost_center: appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined,
        page: page,
        page_size: pageSize,
      };

      let res = await fetchSavingsModeHistory(payload);
      let items = (res && (res.status === "success" || res.status === 200)) ? (res.data?.items || (Array.isArray(res.data) ? res.data : [])) : [];

      // 2nd Attempt Fallback: If 0 items returned and cleanMatName was provided, fetch without material_name filter to locate items client-side
      if ((!items || items.length === 0) && cleanMatName) {
        const fallbackPayload: any = {
          ...payload,
          material_name: undefined,
          page_size: 500,
        };
        const fallbackRes = await fetchSavingsModeHistory(fallbackPayload);
        if (fallbackRes && (fallbackRes.status === "success" || fallbackRes.status === 200)) {
          const allItems = fallbackRes.data?.items || (Array.isArray(fallbackRes.data) ? fallbackRes.data : []);
          const targetClean = cleanMatName.toLowerCase();
          const matched = allItems.filter((it: any) => {
            const itName = (it.material_name || '').toLowerCase();
            return itName.includes(targetClean) || targetClean.includes(itName);
          });
          if (matched.length > 0) {
            res = fallbackRes;
            items = matched;
          }
        }
      }

      if (items && items.length > 0) {
        setSavingsHistoryItems(items);
        setSavingsHistoryTotalCount(res.total_count ?? res.total_savings_mode ?? items.length);
        setSavingsHistoryTotalMode(res.total_savings_mode ?? res.total_count ?? items.length);
        setSavingsHistoryOverallTotal(res.overall_total_savings ?? 0);
      } else {
        setSavingsHistoryItems([]);
        setSavingsHistoryTotalCount(0);
        setSavingsHistoryTotalMode(0);
        setSavingsHistoryOverallTotal(0);
      }
    } catch (err) {
      console.warn("Failed to fetch SavingsModeHistory", err);
      setSavingsHistoryItems([]);
      setSavingsHistoryTotalCount(0);
      setSavingsHistoryTotalMode(0);
      setSavingsHistoryOverallTotal(0);
    } finally {
      setSavingsHistoryLoading(false);
    }
  }, [selectedMaterialForModal, appliedFilters]);

  const [isGraphFullscreen, setIsGraphFullscreen] = useState<boolean>(false);
  const [disabledSuppliersForUnitPriceChart, setDisabledSuppliersForUnitPriceChart] = useState<string[]>([]);
  const DEFAULT_MONTH_LABELS = ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
  const [modalUnitPriceTrendsMap, setModalUnitPriceTrendsMap] = useState<Array<{
    supplierName: string;
    labels: string[];
    values: number[];
    quantities?: (number | null)[];
    amounts?: (number | null)[];
    outlets?: (string | null)[];
    costCenters?: (string | null)[];
    latestUnitPrice?: number;
    targetUnitPrice?: number | null;
  }>>([]);
  const [modalUnitPriceLoading, setModalUnitPriceLoading] = useState<boolean>(false);
  const [modalBaselineMonth, setModalBaselineMonth] = useState<string>('');
  const [modalTargetMonth, setModalTargetMonth] = useState<string>('');
  const [unitPriceClickedPoint, setUnitPriceClickedPoint] = useState<{
    supplier: string;
    material?: string;
    month: string;
    unitPrice: number;
    qty: number | null;
    amount: number | null;
    outlet: string[] | string | null;
    costCenter: string[] | string | null;
  } | null>(null);
  const [selectedOutletFilter, setSelectedOutletFilter] = useState<string>('');
  const [selectedSupplierFilterForModal, setSelectedSupplierFilterForModal] = useState<string>('');
  const [isDailyTrendActive, setIsDailyTrendActive] = useState<boolean>(false);
  const [dailyTrendData, setDailyTrendData] = useState<{ labels: string[]; values: number[]; quantities: (number | null)[]; totalSpend: number[]; unitPrices: (number | null)[] } | null>(null);
  const [dailyTrendLoading, setDailyTrendLoading] = useState<boolean>(false);

  // Month Trend Details Modal Filter States
  const [monthTrendMaterialFilter, setMonthTrendMaterialFilter] = useState<string>('');
  const [monthTrendSupplierFilter, setMonthTrendSupplierFilter] = useState<string>('');
  const [monthTrendSearchQuery, setMonthTrendSearchQuery] = useState<string>('');
  const [modalMaterialOptions, setModalMaterialOptions] = useState<string[]>([]);
  const [modalSupplierOptions, setModalSupplierOptions] = useState<string[]>([]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isGraphFullscreen) {
        setIsGraphFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGraphFullscreen]);
  const [modalTargetMonthPrice, setModalTargetMonthPrice] = useState<number | null>(null);
  const [supplierSaveModeMap, setSupplierSaveModeMap] = useState<Record<string, boolean>>({});
  const [isBulkSavingsLoading, setIsBulkSavingsLoading] = useState<boolean>(false);

  const handleBulkSavingsToggle = useCallback(async () => {
    if (!selectedMaterialForModal || !modalSpendDetails || modalSpendDetails.length === 0) return;

    const supplierNames = modalSpendDetails.map((item: any) => item.supplier_name || item.supplier).filter(Boolean);
    if (supplierNames.length === 0) return;

    const areAllOn = supplierNames.every((sup: string) => {
      if (supplierSaveModeMap[sup] !== undefined) {
        return supplierSaveModeMap[sup];
      }
      const matchingItem = modalSpendDetails.find((d: any) => (d.supplier_name || d.supplier) === sup);
      return matchingItem ? (matchingItem.flag === 1 || matchingItem.flag === true || matchingItem.flag === '1') : false;
    });
    const targetFlag = areAllOn ? 0 : 1;
    const targetState = !areAllOn;

    setIsBulkSavingsLoading(true);

    const newMap = { ...supplierSaveModeMap };
    supplierNames.forEach((sup: string) => {
      newMap[sup] = targetState;
    });
    setSupplierSaveModeMap(newMap);

    try {
      const activeOutlet = appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined;
      const activeCostCenter = appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined;
      const activeMaterialGroup = appliedFilters.materialGroups.length > 0 ? (Array.isArray(appliedFilters.materialGroups) ? appliedFilters.materialGroups[0] : appliedFilters.materialGroups) : undefined;

      const payload = {
        type: 'PROCUREMENT_PERFORMANCE',
        material_name: selectedMaterialForModal.material_name,
        supplier_name: supplierNames,
        flag: targetFlag,
        outlet: activeOutlet || undefined,
        cost_center: activeCostCenter || undefined,
        material_group: activeMaterialGroup || undefined,
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined
      };

      const res = await saveBulkSavingsMode(payload);
      if (res && (res.status === 'success' || res.status === 200)) {
        toast.success(`Bulk Save Mode ${targetState ? 'enabled' : 'disabled'} for ${supplierNames.length} suppliers`);
      } else {
        const revertMap = { ...supplierSaveModeMap };
        supplierNames.forEach((sup: string) => {
          revertMap[sup] = areAllOn;
        });
        setSupplierSaveModeMap(revertMap);
        toast.error(res?.message || "Failed to update Bulk Save Mode");
      }
    } catch (err) {
      console.error("Failed to update Bulk Save Mode", err);
      const revertMap = { ...supplierSaveModeMap };
      supplierNames.forEach((sup: string) => {
        revertMap[sup] = areAllOn;
      });
      setSupplierSaveModeMap(revertMap);
      toast.error("Failed to update Bulk Save Mode");
    } finally {
      setIsBulkSavingsLoading(false);
    }
  }, [selectedMaterialForModal, modalSpendDetails, supplierSaveModeMap, appliedFilters]);

  // Spend by Supplier States
  const [spendBySupplierList, setSpendBySupplierList] = useState<Array<{ supplier: string; total_spend: number }>>([]);
  const [spendBySupplierTotalCount, setSpendBySupplierTotalCount] = useState<number>(0);
  const [spendBySupplierPage, setSpendBySupplierPage] = useState<number>(1);
  const spendBySupplierPageSize = 10;
  const [spendBySupplierLoading, setSpendBySupplierLoading] = useState<boolean>(false);
  const [spendBySupplierItemType, setSpendBySupplierItemType] = useState<'material' | 'service'>('material');

  // Supplier Details Modal States
  const [selectedSupplierForModal, setSelectedSupplierForModal] = useState<{ supplier: string; total_spend: number } | null>(null);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState<boolean>(false);
  const [supplierModalItem, setSupplierModalItem] = useState<any | null>(null);
  const [supplierModalDetails, setSupplierModalDetails] = useState<Array<any>>([]);
  const [supplierModalLoading, setSupplierModalLoading] = useState<boolean>(false);
  const [supplierModalView, setSupplierModalView] = useState<'chart' | 'compare'>('chart');
  const [supplierModalSearchQuery, setSupplierModalSearchQuery] = useState<string>('');
  const [supplierSortField, setSupplierSortField] = useState<'name' | 'quantity' | 'unit_price' | 'spend' | 'updated_on'>('spend');
  const [supplierSortOrder, setSupplierSortOrder] = useState<'asc' | 'desc'>('desc');

  // Category Details Modal States
  const [selectedCategoryForModal, setSelectedCategoryForModal] = useState<{ category: string; total_spend: number } | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [categoryModalDetails, setCategoryModalDetails] = useState<Array<{ supplier_name: string; material_name: string; total_spend: number }>>([]);
  const [categoryModalLoading, setCategoryModalLoading] = useState<boolean>(false);
  const [categoryModalView, setCategoryModalView] = useState<'chart' | 'compare'>('chart');
  const [categoryModalPage, setCategoryModalPage] = useState<number>(1);
  const [categoryModalPageSize, setCategoryModalPageSize] = useState<number>(10);
  const [categoryModalTotalCount, setCategoryModalTotalCount] = useState<number>(0);

  // Outlet Details Modal States
  const [selectedOutletForModal, setSelectedOutletForModal] = useState<{ outlet: string; total_spend?: number } | null>(null);
  const [isOutletModalOpen, setIsOutletModalOpen] = useState<boolean>(false);
  const [isOutletOutlierTableModalOpen, setIsOutletOutlierTableModalOpen] = useState<boolean>(false);
  const [outletModalDetails, setOutletModalDetails] = useState<Array<{
    outlet: string;
    company_code?: string;
    supplier_name: string;
    material_name: string;
    material_group?: string;
    total_quantity?: number;
    total_spend: number;
  }>>([]);
  const [outletModalPage, setOutletModalPage] = useState<number>(1);
  const [outletModalPageSize, setOutletModalPageSize] = useState<number>(10);
  // Close Confirmation State for Modals
  const [outletModalLoading, setOutletModalLoading] = useState<boolean>(false);
  const [outletModalView, setOutletModalView] = useState<'chart' | 'compare'>('chart');
  const [closeConfirmTarget, setCloseConfirmTarget] = useState<'material' | 'supplier' | 'category' | 'outlet' | null>(null);

  // Month Trend Details Modal States (Quantity Details & Spend Details)
  const [isMonthTrendModalOpen, setIsMonthTrendModalOpen] = useState<boolean>(false);
  const [monthTrendModalType, setMonthTrendModalType] = useState<'quantity' | 'spend'>('quantity');
  const [selectedMonthTrendMonth, setSelectedMonthTrendMonth] = useState<string>('');
  const [monthTrendModalDetails, setMonthTrendModalDetails] = useState<Array<{
    date: string;
    supplier_name: string;
    material_name: string;
    total_quantity: number;
    total_spend: number;
  }>>([]);
  const [monthTrendHeaderStats, setMonthTrendHeaderStats] = useState<{
    total_suppliers: number;
    total_materials: number;
    total_quantity: number;
    total_spend: number;
    total_count: number;
  }>({
    total_suppliers: 0,
    total_materials: 0,
    total_quantity: 0,
    total_spend: 0,
    total_count: 0,
  });
  const [monthTrendModalLoading, setMonthTrendModalLoading] = useState<boolean>(false);
  const [monthTrendModalPage, setMonthTrendModalPage] = useState<number>(1);
  const [monthTrendModalPageSize, setMonthTrendModalPageSize] = useState<number>(5);
  const [monthTrendModalTotalCount, setMonthTrendModalTotalCount] = useState<number>(0);
  const [monthTrendModalTotalPages, setMonthTrendModalTotalPages] = useState<number>(1);

  useEffect(() => {
    if (!isMonthTrendModalOpen) {
      setMonthTrendMaterialFilter('');
      setMonthTrendSupplierFilter('');
      setMonthTrendSearchQuery('');
      return;
    }

    const prepareOptions = async () => {
      // 1. Extract unique values from current table data
      const extractedMaterials = Array.from(new Set((monthTrendModalDetails || []).map((it: any) => it.material_name).filter(Boolean)));
      const extractedSuppliers = Array.from(new Set((monthTrendModalDetails || []).map((it: any) => it.supplier_name).filter(Boolean)));

      let mats = Array.from(new Set([...extractedMaterials, ...(filterOptions.materialCodes || []), ...(initialMaterials || [])])).filter(Boolean);
      let sups = Array.from(new Set([...extractedSuppliers, ...(filterOptions.suppliers || []), ...(initialSuppliers || [])])).filter(Boolean);

      // 2. If nothing selected or option lists are empty, call API to fetch full materials & suppliers
      if (mats.length === 0) {
        try {
          const res = await fetchSpendMaterials({ type: "PROCUREMENT_PERFORMANCE" });
          if (res && (res.status === 'success' || res.status === 200 || res.data)) {
            const raw = res.data?.materials || res.data?.items || (Array.isArray(res.data) ? res.data : []);
            mats = raw.map((m: any) => typeof m === 'string' ? m : (m.material_code || m.material_name || m.name)).filter(Boolean);
          }
        } catch (e) {
          console.warn("Could not fetch materials for trend modal dropdown", e);
        }
      }

      if (sups.length === 0) {
        try {
          const res = await fetchSpendSuppliers({ type: "PROCUREMENT_PERFORMANCE" });
          if (res && (res.status === 'success' || res.status === 200 || res.data)) {
            const raw = res.data?.suppliers || res.data?.items || (Array.isArray(res.data) ? res.data : []);
            sups = raw.map((s: any) => typeof s === 'string' ? s : (s.supplier_name || s.name)).filter(Boolean);
          }
        } catch (e) {
          console.warn("Could not fetch suppliers for trend modal dropdown", e);
        }
      }

      setModalMaterialOptions(mats.sort());
      setModalSupplierOptions(sups.sort());
    };

    prepareOptions();
  }, [isMonthTrendModalOpen, monthTrendModalDetails, filterOptions.materialCodes, filterOptions.suppliers, initialMaterials, initialSuppliers]);

  const handleRequestCloseModal = (target: 'material' | 'supplier' | 'category' | 'outlet') => {
    setCloseConfirmTarget(target);
  };

  const handleConfirmCloseModal = () => {
    if (closeConfirmTarget === 'material') setIsMaterialModalOpen(false);
    if (closeConfirmTarget === 'supplier') setIsSupplierModalOpen(false);
    if (closeConfirmTarget === 'category') setIsCategoryModalOpen(false);
    if (closeConfirmTarget === 'outlet') setIsOutletModalOpen(false);
    setCloseConfirmTarget(null);
  };


  const [loading, setLoading] = useState<boolean>(true);
  const [applyingFilter, setApplyingFilter] = useState<boolean>(false);

  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);
  const [trendLoading, setTrendLoading] = useState<boolean>(true);
  const [purchaseLoading, setPurchaseLoading] = useState<boolean>(true);
  const [anomaliesLoading, setAnomaliesLoading] = useState<boolean>(true);

  // Set Permissions and Models (Mocked)
  useEffect(() => {
    const names = [
      "PROCUREMENT_PERFORMANCE"
    ];
    setUserModels(names);
    setActiveTab("PROCUREMENT_PERFORMANCE");
    setModelLoading(false);
  }, []);

  // Sync with filtersQuick context
  useEffect(() => {
    setFiltersQuick({
      supplier_filter: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
      requester_filter: appliedFilters.requestors.length > 0 ? appliedFilters.requestors : undefined,
      department_filter: appliedFilters.departments.length > 0 ? appliedFilters.departments : undefined,
      company_code_filter: appliedFilters.properties.length > 0 ? appliedFilters.properties : undefined,
      gl_accounts_filter: appliedFilters.glAccounts.length > 0 ? appliedFilters.glAccounts : undefined,
      cost_centers_filter: appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters : undefined,
      from_date: appliedFilters.fromDate || undefined,
      to_date: appliedFilters.toDate || undefined,
    });
  }, [appliedFilters, setFiltersQuick]);

  const formatGraphValue = useCallback((val: number) => {
    if (val >= 1000000) {
      return `AED ${(val / 1000000).toFixed(2).replace(/\.?0+$/, '')}M`;
    } else if (val >= 1000) {
      return `AED ${(val / 1000).toFixed(1).replace(/\.?0+$/, '')}K`;
    } else {
      return `AED ${val.toFixed(0)}`;
    }
  }, []);

  const formatVarianceValue = useCallback((val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    let formatted = '';
    if (absVal >= 1000000) {
      formatted = `AED ${(absVal / 1000000).toFixed(2).replace(/\.?0+$/, '')}M`;
    } else if (absVal >= 1000) {
      formatted = `AED ${(absVal / 1000).toFixed(1).replace(/\.?0+$/, '')}K`;
    } else {
      formatted = `AED ${absVal.toFixed(0)}`;
    }
    return isNegative ? `-${formatted}` : formatted;
  }, []);


  const loadSpendPerformanceData = useCallback(async () => {
    const apiParams: any = {
      type: "PROCUREMENT_PERFORMANCE",
      start_date: appliedFilters.fromDate || undefined,
      end_date: appliedFilters.toDate || undefined,
      outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
      cost_center: appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined,
      supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
      material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
      material_name: (appliedFilters.materialCodes.length > 0 || appliedFilters.services.length > 0) ? [...appliedFilters.materialCodes, ...appliedFilters.services] : undefined,
      material_group: appliedFilters.materialGroups.length > 0 ? appliedFilters.materialGroups[0] : undefined,
      service_name: appliedFilters.services.length > 0 ? appliedFilters.services : undefined,
    };
    if (appliedFilters.itemType && appliedFilters.itemType !== 'all') {
      apiParams.item_type = appliedFilters.itemType;
    }

    // Parallel calls
    const fetchSummary = async () => {
      setSummaryLoading(true);
      try {
        const summaryRes = await fetchKPI(apiParams);
        if (summaryRes && summaryRes.status === "success" && Array.isArray(summaryRes.data)) {
          const spendItem = summaryRes.data.find((x: any) => x.name === "Total Spend");
          const suppliersItem = summaryRes.data.find((x: any) => x.name === "Total Suppliers");
          const materialsItem = summaryRes.data.find((x: any) => x.name === "Total Materials");
          const servicesItem = summaryRes.data.find((x: any) => x.name === "Total Services");
          const savingItem = summaryRes.data.find((x: any) => x.name === "Overall Saving Amount" || x.name === "overallsavingamount");

          if (spendItem && typeof spendItem.value === 'number') {
            const formatted = new Intl.NumberFormat('en-AE', {
              style: 'currency',
              currency: 'AED',
              maximumFractionDigits: 0
            }).format(spendItem.value);
            setPerfTotalSpend(formatted);
          }
          if (suppliersItem && typeof suppliersItem.value === 'number') {
            setPerfTotalSuppliersCount(suppliersItem.value);
          }
          if (materialsItem && typeof materialsItem.value === 'number') {
            setPerfTotalMaterialsCount(materialsItem.value);
          }
          if (servicesItem && typeof servicesItem.value === 'number') {
            setPerfTotalServicesCount(servicesItem.value);
          }
          if (savingItem && typeof savingItem.value === 'number') {
            const formatted = new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(savingItem.value);
            setPerfTotalSavingAmount(formatted);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch dashboard summary", err);
      } finally {
        setSummaryLoading(false);
      }
    };

    const fetchTrendsAndPurchase = async () => {
      setTrendLoading(true);
      setPurchaseLoading(true);
      setAnomaliesLoading(true);
      try {
        const [resTrend, resUnitPrice, resQuantity] = await Promise.all([
          fetchMonthlySpendTrend(apiParams).catch(() => null),
          fetchUnitPriceTrend({
            ...apiParams,
            material_code: selectedTrendMaterial ? [selectedTrendMaterial] : (appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined),
            material_name: selectedTrendMaterial ? [selectedTrendMaterial] : ((appliedFilters.materialCodes.length > 0 || appliedFilters.services.length > 0) ? [...appliedFilters.materialCodes, ...appliedFilters.services] : undefined),
            baseline_month: baselineMonth || undefined,
            target_month: baselineMonth || undefined,
            calculation: "all"
          }).catch(() => null),
          fetchQuantityTrend({
            ...apiParams,
            material_code: selectedTrendMaterial ? [selectedTrendMaterial] : (appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined),
            material_name: selectedTrendMaterial ? [selectedTrendMaterial] : (appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined)
          }).catch(() => null)
        ]);

        if (resTrend && resTrend.status === "success" && resTrend.data) {
          let labels: string[] = [];
          let values: number[] = [];
          let changePct: (number | null)[] = [];

          if (Array.isArray(resTrend.data.labels) && Array.isArray(resTrend.data.values)) {
            labels = resTrend.data.labels;
            values = resTrend.data.values.map((v: any) => Number(v) || 0);
            changePct = resTrend.data.change_pct || resTrend.data.change_percentage || [];
          } else if (Array.isArray(resTrend.data.spend_trend)) {
            const trendData = resTrend.data.spend_trend;
            labels = trendData.map((x: any) => x.month || "");
            values = trendData.map((x: any) => Number(x.spend ?? x.value ?? 0));
            changePct = trendData.map((x: any) => x.change_percentage !== undefined ? x.change_percentage : null);
          } else if (Array.isArray(resTrend.data)) {
            labels = resTrend.data.map((x: any) => x.month || "");
            values = resTrend.data.map((x: any) => Number(x.spend ?? x.value ?? 0));
            changePct = resTrend.data.map((x: any) => x.change_percentage !== undefined ? x.change_percentage : null);
          }

          const fromMonth = appliedFilters.fromDate ? appliedFilters.fromDate.substring(0, 7) : '';
          const toMonth = appliedFilters.toDate ? appliedFilters.toDate.substring(0, 7) : '';
          const filterTrendByDateRange = (lbls: string[], vals: number[], pcts?: (number | null)[]) => {
            if (!fromMonth && !toMonth) return { labels: lbls, values: vals, changePct: pcts };
            const filteredIndices: number[] = [];
            lbls.forEach((l, i) => {
              if ((!fromMonth || l >= fromMonth) && (!toMonth || l <= toMonth)) {
                filteredIndices.push(i);
              }
            });
            return {
              labels: filteredIndices.map(i => lbls[i]),
              values: filteredIndices.map(i => vals[i]),
              changePct: pcts && pcts.length > 0 ? filteredIndices.map(i => pcts[i]) : undefined
            };
          };

          const filteredSpend = filterTrendByDateRange(labels, values, changePct);
          setPerfSpendTrend({
            labels: filteredSpend.labels,
            values: filteredSpend.values,
            changePct: filteredSpend.changePct
          });
        }

        if (resUnitPrice && resUnitPrice.status === "success") {
          let uLabels: string[] = [];
          let uValues: number[] = [];
          if (Array.isArray(resUnitPrice.data?.labels) && Array.isArray(resUnitPrice.data?.values)) {
            uLabels = resUnitPrice.data.labels;
            uValues = resUnitPrice.data.values.map((v: any) => Number(v) || 0);
          } else {
            const rawItems = resUnitPrice.data?.unit_price_trend || resUnitPrice.unit_price_trend || (Array.isArray(resUnitPrice.data) ? resUnitPrice.data : []);
            if (Array.isArray(rawItems)) {
              uLabels = rawItems.map((item: any) => item.month || item.label || '');
              uValues = rawItems.map((item: any) => Number(item.unit_price ?? item.value ?? 0));
            }
          }
          const fromMonth = appliedFilters.fromDate ? appliedFilters.fromDate.substring(0, 7) : '';
          const toMonth = appliedFilters.toDate ? appliedFilters.toDate.substring(0, 7) : '';
          if (fromMonth || toMonth) {
            const filteredIndices: number[] = [];
            uLabels.forEach((l, i) => {
              if ((!fromMonth || l >= fromMonth) && (!toMonth || l <= toMonth)) {
                filteredIndices.push(i);
              }
            });
            uLabels = filteredIndices.map(i => uLabels[i]);
            uValues = filteredIndices.map(i => uValues[i]);
          }
          setPerfUnitPriceTrend({ labels: uLabels, values: uValues });

          const targetPrice = resUnitPrice.target_month_unit_price ?? resUnitPrice.data?.target_month_unit_price;
          if (targetPrice !== undefined && targetPrice !== null && Number(targetPrice) > 0) {
            setPerfTargetMonthUnitPrice(Number(targetPrice));
          } else {
            setPerfTargetMonthUnitPrice(null);
          }
        }

        if (resQuantity && resQuantity.status === "success") {
          let qLabels: string[] = [];
          let qValues: number[] = [];
          if (Array.isArray(resQuantity.data?.labels) && Array.isArray(resQuantity.data?.values)) {
            qLabels = resQuantity.data.labels;
            qValues = resQuantity.data.values.map((v: any) => Number(v) || 0);
          } else {
            const rawItems = resQuantity.data?.quantity_trend || resQuantity.quantity_trend || (Array.isArray(resQuantity.data) ? resQuantity.data : []);
            if (Array.isArray(rawItems)) {
              qLabels = rawItems.map((item: any) => item.month || item.label || '');
              qValues = rawItems.map((item: any) => Number(item.total_quantity ?? item.quantity ?? item.value ?? 0));
            }
          }
          const fromMonth = appliedFilters.fromDate ? appliedFilters.fromDate.substring(0, 7) : '';
          const toMonth = appliedFilters.toDate ? appliedFilters.toDate.substring(0, 7) : '';
          if (fromMonth || toMonth) {
            const filteredIndices: number[] = [];
            qLabels.forEach((l, i) => {
              if ((!fromMonth || l >= fromMonth) && (!toMonth || l <= toMonth)) {
                filteredIndices.push(i);
              }
            });
            qLabels = filteredIndices.map(i => qLabels[i]);
            qValues = filteredIndices.map(i => qValues[i]);
          }
          setPerfQuantityTrend({ labels: qLabels, values: qValues });
        }
      } catch (err) {
        console.warn("Failed to fetch trend data", err);
      } finally {
        setTrendLoading(false);
        setPurchaseLoading(false);
        setAnomaliesLoading(false);
      }
    };

    // Run all fetches in parallel
    fetchSummary();
    fetchTrendsAndPurchase();
  }, [appliedFilters, selectedTrendMaterial]);

  useEffect(() => {
    if (activeTab === "PROCUREMENT_PERFORMANCE") {
      loadSpendPerformanceData();
    }
  }, [activeTab, loadSpendPerformanceData]);

  // Fetch Unit Price Trend specifically when baselineMonth or targetMonth changes
  useEffect(() => {
    if (!baselineMonth && !targetMonth) {
      setPerfTargetMonthUnitPrice(null);
      return;
    }
    setUnitPriceLoading(true);
    const apiParams: any = {
      type: "PROCUREMENT_PERFORMANCE",
      start_date: appliedFilters.fromDate || undefined,
      end_date: appliedFilters.toDate || undefined,
      outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
      cost_center: appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined,
      supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
      material_code: selectedTrendMaterial ? [selectedTrendMaterial] : (appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined),
      material_name: selectedTrendMaterial || (appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes[0] : (appliedFilters.services.length > 0 ? appliedFilters.services[0] : undefined)),
      material_group: appliedFilters.materialGroups.length > 0 ? appliedFilters.materialGroups : undefined,
      service_name: appliedFilters.services.length > 0 ? appliedFilters.services : undefined,
      baseline_month: baselineMonth || undefined,
      target_month: targetMonth || baselineMonth || undefined,
      calculation: "all"
    };
    if (appliedFilters.itemType && appliedFilters.itemType !== 'all') {
      apiParams.item_type = appliedFilters.itemType;
    }

    fetchUnitPriceTrend(apiParams)
      .then((resUnitPrice) => {
        if (resUnitPrice && resUnitPrice.status === "success") {
          if (Array.isArray(resUnitPrice.data?.labels) && Array.isArray(resUnitPrice.data?.values)) {
            setPerfUnitPriceTrend({
              labels: resUnitPrice.data.labels,
              values: resUnitPrice.data.values.map((v: any) => Number(v) || 0)
            });
          } else {
            const rawItems = resUnitPrice.data?.unit_price_trend || resUnitPrice.unit_price_trend || (Array.isArray(resUnitPrice.data) ? resUnitPrice.data : []);
            if (Array.isArray(rawItems)) {
              const labels = rawItems.map((item: any) => item.month || item.label || '');
              const values = rawItems.map((item: any) => Number(item.unit_price ?? item.value ?? 0));
              setPerfUnitPriceTrend({ labels, values });
            }
          }
          const targetPrice = resUnitPrice.target_month_unit_price ?? resUnitPrice.data?.target_month_unit_price;
          if (targetPrice !== undefined && targetPrice !== null && Number(targetPrice) > 0) {
            setPerfTargetMonthUnitPrice(Number(targetPrice));
          } else {
            setPerfTargetMonthUnitPrice(null);
          }
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch target month unit price trend", err);
      })
      .finally(() => {
        setUnitPriceLoading(false);
      });
  }, [baselineMonth, targetMonth, appliedFilters, selectedTrendMaterial]);

  const loadAllModalUnitPriceTrends = useCallback(async (
    materialName: string,
    suppliersList: any[],
    baselineMonthOverride?: string,
    selectedOutletOverride?: string,
    targetView: 'unit_price' | 'supplier_unit_price' = 'unit_price',
    fromDateOverride?: string,
    toDateOverride?: string,
    targetMonthOverride?: string
  ) => {
    if (!materialName || !suppliersList || suppliersList.length === 0) return;
    setModalUnitPriceLoading(true);
    setModalView(targetView);

    const activeBaselineMonth = baselineMonthOverride !== undefined ? baselineMonthOverride : (modalBaselineMonth || baselineMonth || undefined);
    const activeTargetMonth = targetMonthOverride !== undefined ? targetMonthOverride : (modalTargetMonth || targetMonth || activeBaselineMonth || undefined);
    const activeOutlet = selectedOutletOverride !== undefined ? selectedOutletOverride : (selectedOutletFilter || (appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined));
    const activeFromDate = fromDateOverride !== undefined ? fromDateOverride : (modalFromDate || appliedFilters.fromDate || undefined);
    const activeToDate = toDateOverride !== undefined ? toDateOverride : (modalToDate || appliedFilters.toDate || undefined);

    try {
      let globalTargetPrice: number | null = null;

      const promises = suppliersList.map(async (item: any) => {
        const sName = item.supplier_name || 'Unknown';
        const payload: any = {
          type: "PROCUREMENT_PERFORMANCE",
          supplier_name: [sName],
          material_code: [materialName],
          material_name: [materialName],
          outlet: activeOutlet || undefined,
          start_date: activeFromDate || undefined,
          end_date: activeToDate || undefined,
          baseline_month: activeBaselineMonth || undefined,
          target_month: activeTargetMonth || undefined,
          calculation: "all"
        };
        if (appliedFilters.itemType && appliedFilters.itemType !== 'all') {
          payload.item_type = appliedFilters.itemType;
        }
        try {
          const res = await fetchUnitPriceTrend(payload);
          let labels: string[] = [];
          let values: number[] = [];
          let quantities: (number | null)[] = [];
          let amounts: (number | null)[] = [];
          let outlets: any[] = [];
          let costCenters: any[] = [];
          let targetUnitPrice: number | null = null;
          if (res && res.status === "success" && res.data) {
            const topOutlets = res.data.outlets || res.outlets || res.data.available_outlets || res.data.outlet_list || [];
            if (Array.isArray(topOutlets)) {
              topOutlets.forEach((o: any) => {
                if (typeof o === 'string' && o.trim()) outlets.push(o.trim());
                else if (o && typeof o === 'object' && (o.outlet || o.name || o.outlet_name)) outlets.push((o.outlet || o.name || o.outlet_name).trim());
              });
            }

            if (Array.isArray(res.data.labels) && Array.isArray(res.data.values)) {
              labels = res.data.labels;
              values = res.data.values.map((v: any) => Number(v) || 0);
              if (Array.isArray(res.data.outlets)) {
                res.data.outlets.forEach((o: any) => { if (o) outlets.push(String(o).trim()); });
              }
            } else {
              const rawItems = res.data.unit_price_trend || res.unit_price_trend || (Array.isArray(res.data) ? res.data : []);
              if (Array.isArray(rawItems)) {
                labels = rawItems.map((item: any) => item.month || item.label || '');
                values = rawItems.map((item: any) => Number(item.unit_price ?? item.value ?? 0));
                quantities = rawItems.map((item: any) => item.total_quantity !== undefined && item.total_quantity !== null ? Number(item.total_quantity) : null);
                amounts = rawItems.map((item: any) => item.total_amount !== undefined && item.total_amount !== null ? Number(item.total_amount) : null);
                outlets = rawItems.map((item: any) => {
                  const o = item.outlet || item.outlets || item.outlet_name || item.property || item.property_name;
                  if (Array.isArray(o)) return o.map((x: any) => String(x).trim()).filter(Boolean);
                  return o ? [String(o).trim()] : [];
                });
                costCenters = rawItems.map((item: any) => {
                  const cc = item.costcenter || item.cost_center || item.cost_centers || item.cost_center_name || item.cost_center_code;
                  if (Array.isArray(cc)) return cc.map((x: any) => String(x).trim()).filter(Boolean);
                  return cc ? [String(cc).trim()] : [];
                });
              }
            }
            const tPrice = res.target_month_unit_price ?? res.data?.target_month_unit_price;
            if (tPrice !== undefined && tPrice !== null && Number(tPrice) > 0) {
              targetUnitPrice = Number(tPrice);
              if (globalTargetPrice === null) globalTargetPrice = Number(tPrice);
            }
          }
          return {
            supplierName: sName,
            materialName: (item as any).material_name || (item as any).item_name || (item as any).name || (item as any).material || materialName || (typeof selectedMaterialForModal === 'string' ? selectedMaterialForModal : (selectedMaterialForModal as any)?.material_name) || '',
            labels,
            values,
            quantities,
            amounts,
            outlets,
            costCenters,
            latestUnitPrice: item.unit_price || item.latest_unit_price || 0,
            targetUnitPrice
          };
        } catch (e) {
          return {
            supplierName: sName,
            materialName: (item as any).material_name || (item as any).item_name || (item as any).name || (item as any).material || materialName || (typeof selectedMaterialForModal === 'string' ? selectedMaterialForModal : (selectedMaterialForModal as any)?.material_name) || '',
            labels: [],
            values: [],
            quantities: [],
            amounts: [],
            outlets: [],
            costCenters: [],
            latestUnitPrice: item.unit_price || item.latest_unit_price || 0,
            targetUnitPrice: null
          };
        }
      });

      const results = await Promise.all(promises);
      setModalUnitPriceTrendsMap(results);
      setModalTargetMonthPrice(globalTargetPrice);
    } catch (err) {
      console.warn("Failed to load in-modal unit price trends", err);
    } finally {
      setModalUnitPriceLoading(false);
    }
  }, [appliedFilters, baselineMonth, modalBaselineMonth, selectedOutletFilter]);

  const loadDailySpendTrendData = useCallback(async () => {
    if (!selectedMaterialForModal) return;
    setDailyTrendLoading(true);
    try {
      const activeFromDate = modalFromDate || appliedFilters.fromDate || undefined;
      const activeToDate = modalToDate || appliedFilters.toDate || undefined;
      const activeOutlet = selectedOutletFilter || (appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined);
      const activeCostCenter = appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined;
      const activeMaterialGroup = appliedFilters.materialGroups.length > 0 ? appliedFilters.materialGroups[0] : undefined;
      const activeSupplier = selectedSupplierFilterForModal || (modalSpendDetails.length > 0 ? modalSpendDetails[0].supplier_name : undefined);
      const activeMaterialCode = (selectedMaterialForModal as any)?.material_code || (selectedMaterialForModal as any)?.code || selectedMaterialForModal.material_name;

      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        outlet: activeOutlet || undefined,
        cost_center: activeCostCenter || undefined,
        supplier_name: activeSupplier || undefined,
        material_code: activeMaterialCode || undefined,
        material_name: selectedMaterialForModal.material_name || activeMaterialCode || undefined,
        start_date: activeFromDate || undefined,
        end_date: activeToDate || undefined,
        item_type: appliedFilters.itemType && appliedFilters.itemType !== 'all' ? appliedFilters.itemType : undefined,
        material_group: activeMaterialGroup || undefined,
      };

      const res = await fetchDailySpendTrend(payload);
      if (res && res.status === "success" && res.data) {
        let labels: string[] = res.data.labels || [];
        let quantities: (number | null)[] = res.data.quantities ? res.data.quantities.map((q: any) => q !== null && q !== undefined ? Number(q) : null) : [];
        let values: number[] = res.data.values ? res.data.values.map((v: any) => Number(v) || 0) : [];

        if ((!labels || labels.length === 0) && Array.isArray(res.data.daily_details)) {
          labels = res.data.daily_details.map((d: any) => d.date || '');
          quantities = res.data.daily_details.map((d: any) => d.total_quantity !== undefined && d.total_quantity !== null ? Number(d.total_quantity) : null);
          values = res.data.daily_details.map((d: any) => Number(d.total_spend || 0));
        }

        let unitPrices: (number | null)[] = [];
        if (Array.isArray(res.data.daily_details)) {
          unitPrices = res.data.daily_details.map((d: any) => {
            const q = Number(d.total_quantity);
            const s = Number(d.total_spend);
            return q > 0 ? Number((s / q).toFixed(4)) : null;
          });
        } else if (quantities.length > 0 && values.length > 0) {
          unitPrices = labels.map((_, idx) => {
            const q = quantities[idx];
            const v = values[idx];
            return (q && q > 0 && v && v > 0) ? Number((v / q).toFixed(4)) : null;
          });
        }

        setDailyTrendData({
          labels,
          values,
          quantities,
          totalSpend: values,
          unitPrices
        });
      } else {
        setDailyTrendData(null);
      }
    } catch (err) {
      console.warn("Failed to load daily spend trend", err);
      setDailyTrendData(null);
    } finally {
      setDailyTrendLoading(false);
    }
  }, [selectedMaterialForModal, selectedSupplierFilterForModal, modalFromDate, modalToDate, selectedOutletFilter, appliedFilters, modalSpendDetails]);

  useEffect(() => {
    if (isDailyTrendActive && (modalView === 'supplier_unit_price' || isGraphFullscreen)) {
      loadDailySpendTrendData();
    }
  }, [isDailyTrendActive, modalView, isGraphFullscreen, loadDailySpendTrendData]);

  const loadAbcAnalysisData = useCallback(async () => {
    setAbcLoading(true);
    try {
      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
        material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
        material_name: (appliedFilters.materialCodes.length > 0 || appliedFilters.services.length > 0) ? [...appliedFilters.materialCodes, ...appliedFilters.services] : undefined,
        service_name: appliedFilters.services.length > 0 ? appliedFilters.services : undefined,
        category: abcCategoryFilter !== 'ALL' ? abcCategoryFilter : "",
        page: abcPage,
        page_size: abcPageSize,
        // ABC thresholds
        threshold_a: appliedAbcThresholdA,
        threshold_b: appliedAbcThresholdB,
      };
      if (abcItemType !== 'all') {
        payload.item_type = abcItemType;
      }
      const res = await fetchAbcAnalysis(payload);
      if (res && res.status === "success" && res.data) {
        const rawMat = res.data.materials || [];
        setAbcSummary(res.data.summary || []);
        setAbcMaterials(rawMat);
        setAbcTotalMaterials(calculateTotalCount(res.data.total_materials || res.total_count || res.total_records, rawMat.length, abcPage, abcPageSize));
        setAbcTotalSpend(res.data.total_spend || 0);
      }
    } catch (err) {
      console.warn("Failed to fetch ABC Analysis", err);
    } finally {
      setAbcLoading(false);
    }
  }, [appliedFilters, abcPage, abcPageSize, abcItemType, abcCategoryFilter, appliedAbcThresholdA, appliedAbcThresholdB]);

  const loadOutletSpendVarianceData = useCallback(async () => {
    setOutletLoading(true);
    try {
      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
        material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
        material_name: (appliedFilters.materialCodes.length > 0 || appliedFilters.services.length > 0) ? [...appliedFilters.materialCodes, ...appliedFilters.services] : undefined,
        service_name: appliedFilters.services.length > 0 ? appliedFilters.services : undefined,
        page: outletPage,
        page_size: outletPageSize,
      };
      if (appliedFilters.itemType && appliedFilters.itemType !== 'all') {
        payload.item_type = appliedFilters.itemType;
      }
      const res = await fetchOutletSpendVariance(payload);
      if (res && res.status === "success" && res.data) {
        const rawList = res.data.outlet_spend_variance || [];
        const totalOutletsCount = calculateTotalCount(res.total_count || res.total_records || res.data.total_count || res.data.summary?.total_outlets, rawList.length, outletPage, outletPageSize);
        const totalSpendSum = rawList.reduce((sum: number, item: any) => sum + (Number(item.total_spend) || 0), 0);
        const avgSpend = res.data.summary?.average_spend ?? (totalOutletsCount > 0 ? totalSpendSum / totalOutletsCount : 0);

        const list = rawList.map((item: any) => ({
          outlet: item.outlet,
          company_code: item.company_code,
          total_spend: Number(item.total_spend) || 0,
          avg_spend: item.avg_spend ?? avgSpend,
          variance: item.variance ?? ((Number(item.total_spend) || 0) - avgSpend),
          status: item.status || ((Number(item.total_spend) || 0) > avgSpend * 1.5 ? 'High Spend Outlier' : 'Normal')
        }));

        setOutletSummary(res.data.summary || { total_outlets: totalOutletsCount, average_spend: avgSpend });
        setOutletVarianceList(list);
        setOutletTotalCount(totalOutletsCount);
      }
    } catch (err) {
      console.warn("Failed to fetch outlet spend variance", err);
    } finally {
      setOutletLoading(false);
    }
  }, [appliedFilters, outletPage, outletPageSize]);

  const loadSpendByOutletData = useCallback(async () => {
    setSpendByOutletLoading(true);
    try {
      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
        material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
        material_name: (appliedFilters.materialCodes.length > 0 || appliedFilters.services.length > 0) ? [...appliedFilters.materialCodes, ...appliedFilters.services] : undefined,
        service_name: appliedFilters.services.length > 0 ? appliedFilters.services : undefined,
        page: 1,
        page_size: 10,
      };
      if (appliedFilters.itemType && appliedFilters.itemType !== 'all') {
        payload.item_type = appliedFilters.itemType;
      }
      const res = await fetchSpendByOutlet(payload);
      if (res && res.status === "success" && res.data) {
        const rawList = res.data.spend_by_outlet || [];
        const list = rawList.map((item: any) => ({
          outlet: item.outlet,
          company_code: item.company_code,
          total_spend: Number(item.total_spend) || 0
        }));
        setSpendByOutletList(list);
      }
    } catch (err) {
      console.warn("Failed to fetch spend by outlet data", err);
    } finally {
      setSpendByOutletLoading(false);
    }
  }, [appliedFilters]);

  const loadSpendForecast = useCallback(async () => {
    setForecastLoading(true);
    try {
      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
        material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
        material_name: (appliedFilters.materialCodes.length > 0 || appliedFilters.services.length > 0) ? [...appliedFilters.materialCodes, ...appliedFilters.services] : undefined,
        service_name: appliedFilters.services.length > 0 ? appliedFilters.services : undefined,
        steps: forecastSteps,
      };
      if (appliedFilters.itemType && appliedFilters.itemType !== 'all') {
        payload.item_type = appliedFilters.itemType;
      }
      const res = await fetchSpendForecast(payload);
      if (res && res.status === "success" && res.data) {
        setForecastHistorical(res.data.historical || []);
        setForecastPredicted(res.data.forecasted || []);
      }
    } catch (err) {
      console.warn("Failed to fetch spend forecast", err);
    } finally {
      setForecastLoading(false);
    }
  }, [appliedFilters, forecastSteps]);

  const loadPurchaseFrequencyData = useCallback(async () => {
    setPurchaseLoading(true);
    try {
      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        cost_center: appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined,
        supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
        material_code: pfMaterialCodeFilter !== 'all' ? [pfMaterialCodeFilter] : (appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined),
        material_name: pfMaterialCodeFilter !== 'all' ? [pfMaterialCodeFilter] : ((appliedFilters.materialCodes.length > 0 || appliedFilters.services.length > 0) ? [...appliedFilters.materialCodes, ...appliedFilters.services] : undefined),
        material_group: appliedFilters.materialGroups.length > 0 ? (Array.isArray(appliedFilters.materialGroups) ? appliedFilters.materialGroups[0] : appliedFilters.materialGroups) : undefined,
        page: purchaseFrequencyPage,
        page_size: purchaseFrequencyPageSize,
      };
      if (appliedFilters.itemType && appliedFilters.itemType !== 'all') {
        payload.item_type = appliedFilters.itemType;
      }
      const res = await fetchPurchaseFrequency(payload);
      if (res && res.status === "success" && res.data) {
        const rawList = res.data.purchase_frequency || [];
        setPurchaseFrequencyList(rawList);
        setPurchaseFrequencyTotalCount(calculateTotalCount(res.total_count || res.total_records || res.data.total_count, rawList.length, purchaseFrequencyPage, purchaseFrequencyPageSize));

        // Collect material codes from response for dropdown list
        const codesFromData = rawList.map((item: any) => item.material_code).filter(Boolean);
        if (codesFromData.length > 0) {
          setPfMaterialOptions(prev => Array.from(new Set([...prev, ...codesFromData])));
        }
      }
    } catch (err) {
      console.warn("Failed to fetch purchase frequency", err);
    } finally {
      setPurchaseLoading(false);
    }
  }, [appliedFilters, purchaseFrequencyPage, purchaseFrequencyPageSize, pfMaterialCodeFilter]);

  const loadMaterialVarianceData = useCallback(async () => {
    setAnomaliesLoading(true);
    try {
      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        cost_center: appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined,
        supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
        material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
        material_name: (appliedFilters.materialCodes.length > 0 || appliedFilters.services.length > 0) ? [...appliedFilters.materialCodes, ...appliedFilters.services] : undefined,
        material_group: appliedFilters.materialGroups.length > 0 ? (Array.isArray(appliedFilters.materialGroups) ? appliedFilters.materialGroups[0] : appliedFilters.materialGroups) : undefined,
        anomaly_threshold: anomalyThreshold,
        status: materialVarianceStatusFilter !== 'all' ? materialVarianceStatusFilter : undefined,
        page: materialVariancePage,
        page_size: materialVariancePageSize,
        baseline_month: baselineMonth || undefined,
      };
      if (appliedFilters.itemType && appliedFilters.itemType !== 'all') {
        payload.item_type = appliedFilters.itemType;
      }
      const res = await fetchMaterialVariance(payload);
      if (res && res.status === "success" && res.data) {
        const rawList = res.data.material_variance || [];
        setMaterialVarianceList(rawList);
        setMaterialVarianceTotalCount(calculateTotalCount(res.total_count || res.total_records || res.data.total_count, rawList.length, materialVariancePage, materialVariancePageSize));
      }
    } catch (err) {
      console.warn("Failed to fetch material variance", err);
    } finally {
      setAnomaliesLoading(false);
    }
  }, [appliedFilters, anomalyThreshold, materialVariancePage, materialVariancePageSize, baselineMonth, materialVarianceStatusFilter]);

  const loadSpendByCategoryData = useCallback(async () => {
    setSpendByCategoryLoading(true);
    setSpendByCategoryPage(1);
    setHasMoreSpendByCategory(true);
    try {
      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        cost_center: appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined,
        supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
        material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
        material_name: (appliedFilters.materialCodes.length > 0 || appliedFilters.services.length > 0) ? [...appliedFilters.materialCodes, ...appliedFilters.services] : undefined,
        material_group: appliedFilters.materialGroups.length > 0 ? (Array.isArray(appliedFilters.materialGroups) ? appliedFilters.materialGroups[0] : appliedFilters.materialGroups) : undefined,
        item_type: appliedFilters.itemType && appliedFilters.itemType !== 'all' ? appliedFilters.itemType : spendByCategoryType,
        page: 1,
        page_size: spendByCategoryPageSize,
      };
      const res = await fetchSpendByCategory(payload);
      if (res && res.status === "success" && res.data) {
        const newData = res.data.spend_by_category || [];
        setSpendByCategoryList(newData);
        const total = calculateTotalCount(res.total_count || res.total_records || res.data.total_count, newData.length, 1, spendByCategoryPageSize);
        setSpendByCategoryTotalCount(total);
        setHasMoreSpendByCategory(newData.length < total);
      }
    } catch (err) {
      console.warn("Failed to fetch spend by category", err);
    } finally {
      setSpendByCategoryLoading(false);
    }
  }, [appliedFilters, spendByCategoryType]);

  const loadMoreSpendByCategory = useCallback(async () => {
    if (spendByCategoryLoading || isFetchingMoreSpendByCategory || !hasMoreSpendByCategory) {
      return;
    }
    setIsFetchingMoreSpendByCategory(true);
    const nextPage = spendByCategoryPage + 1;
    try {
      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        cost_center: appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined,
        supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
        material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
        material_name: (appliedFilters.materialCodes.length > 0 || appliedFilters.services.length > 0) ? [...appliedFilters.materialCodes, ...appliedFilters.services] : undefined,
        material_group: appliedFilters.materialGroups.length > 0 ? (Array.isArray(appliedFilters.materialGroups) ? appliedFilters.materialGroups[0] : appliedFilters.materialGroups) : undefined,
        item_type: appliedFilters.itemType && appliedFilters.itemType !== 'all' ? appliedFilters.itemType : spendByCategoryType,
        page: nextPage,
        page_size: spendByCategoryPageSize,
      };
      const res = await fetchSpendByCategory(payload);
      if (res && res.status === "success" && res.data) {
        const newData = res.data.spend_by_category || [];
        if (newData.length > 0) {
          setSpendByCategoryList(prev => [...prev, ...newData]);
          setSpendByCategoryPage(nextPage);
          const total = res.total_count || 0;
          setSpendByCategoryTotalCount(total);
          setHasMoreSpendByCategory((spendByCategoryList.length + newData.length) < total);
        } else {
          setHasMoreSpendByCategory(false);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch more spend by category", err);
    } finally {
      setIsFetchingMoreSpendByCategory(false);
    }
  }, [
    spendByCategoryLoading,
    isFetchingMoreSpendByCategory,
    hasMoreSpendByCategory,
    spendByCategoryPage,
    appliedFilters,
    spendByCategoryType,
    spendByCategoryList.length
  ]);

  const loadSpendByMaterialServiceTypeData = useCallback(async () => {
    setMaterialServiceLoading(true);
    try {
      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        cost_center: appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined,
        supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
        material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
        material_name: (appliedFilters.materialCodes.length > 0 || appliedFilters.services.length > 0) ? [...appliedFilters.materialCodes, ...appliedFilters.services] : undefined,
        material_group: appliedFilters.materialGroups.length > 0 ? (Array.isArray(appliedFilters.materialGroups) ? appliedFilters.materialGroups[0] : appliedFilters.materialGroups) : undefined,
        page: materialServicePage,
        page_size: materialServicePageSize,
      };
      if (appliedFilters.itemType && appliedFilters.itemType !== 'all') {
        payload.item_type = appliedFilters.itemType;
      }
      const res = await fetchSpendByType(payload);
      if (res && (res.status === "success" || res.status === 200 || res.data)) {
        const matList = res.data?.spend_by_material || res.spend_by_material || [];
        const srvList = res.data?.spend_by_service || res.spend_by_service || [];
        setSpendByMaterialList(matList);
        setSpendByServiceList(srvList);

        const matExplicit = res.total_counts?.spend_by_material ?? res.data?.total_counts?.spend_by_material ?? res.total_count ?? res.total_records;
        const srvExplicit = res.total_counts?.spend_by_service ?? res.data?.total_counts?.spend_by_service ?? res.total_count ?? res.total_records;

        setSpendByMaterialTotalCount(calculateTotalCount(matExplicit, matList.length, materialServicePage, materialServicePageSize));
        setSpendByServiceTotalCount(calculateTotalCount(srvExplicit, srvList.length, materialServicePage, materialServicePageSize));
      }
    } catch (err) {
      console.warn("Failed to fetch spend by type", err);
    } finally {
      setMaterialServiceLoading(false);
    }
  }, [appliedFilters, materialServicePage, materialServicePageSize]);

  const loadSpendDetailData = useCallback(async () => {
    setSpendDetailLoading(true);
    try {
      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        supplier: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
        material: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
        item_type: materialServiceActiveTab,
        page: spendDetailPage,
        page_size: spendDetailPageSize,
      };
      const res = await fetchSpendByMaterialDetail(payload);
      if (res && res.status === "success" && res.data) {
        const items = res.data.items || (Array.isArray(res.data) ? res.data : []);
        setSpendDetailList(items);
        setSpendDetailTotalCount(calculateTotalCount(res.total_counts?.total_items || res.total_count || res.total_records || res.data?.total_count, items.length, spendDetailPage, spendDetailPageSize));
      }
    } catch (err) {
      console.warn("Failed to fetch spend by material detail", err);
    } finally {
      setSpendDetailLoading(false);
    }
  }, [appliedFilters, materialServiceActiveTab, spendDetailPage, spendDetailPageSize]);

  const loadModalSpendDetails = useCallback(async (item: { material_name: string; total_spend: number }, targetMonthOverride?: string) => {
    setModalSpendDetailsLoading(true);
    setModalMaterialItem(null);
    setSelectedSupplierFilterForModal('');
    if (item && item.material_name) {
      setSelectedCompareMaterials([item.material_name]);
      setMaterialComparisonData(null);
    }
    try {
      const activeTargetMonth = targetMonthOverride !== undefined ? targetMonthOverride : modalBaselineMonth;
      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        material_name: item.material_name,
        supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers[0] : undefined,
        outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        page: 1,
        page_size: 10,
        material_group: appliedFilters.materialGroups.length > 0 ? appliedFilters.materialGroups[0] : undefined,
        target_month: activeTargetMonth || undefined,
      };

      const res = await fetchMaterialsDetails(payload);
      if (res && res.status === "success" && res.data) {
        const rawItems = res.data.items || (Array.isArray(res.data) ? res.data : []);
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          const detailItem = rawItems[0];
          setModalMaterialItem(detailItem);
          const suppliersList = detailItem.suppliers || [];
          const formattedSuppliers = suppliersList.map((sup: any) => ({
            supplier_name: sup.supplier_name,
            material_name: detailItem.item_name || item.material_name,
            item_type: materialServiceActiveTab,
            total_spend: Number(sup.total_spend) || 0,
            total_quantity: Number(sup.total_quantity) || 0,
            unit_price: Number(sup.unit_price) || 0,
            updated_on: sup.updated_on || '',
            target_month: sup.target_month || activeTargetMonth || '',
            target_month_unit_price: sup.target_month_unit_price !== undefined && sup.target_month_unit_price !== null ? Number(sup.target_month_unit_price) : null,
            flag: sup.flag !== undefined ? sup.flag : 0
          }));
          setModalSpendDetails(formattedSuppliers);

          const initialSaveModeMap: Record<string, boolean> = {};
          formattedSuppliers.forEach((sup: any) => {
            if (sup.supplier_name) {
              initialSaveModeMap[sup.supplier_name] = sup.flag === 1 || sup.flag === true || sup.flag === '1';
            }
          });
          setSupplierSaveModeMap(initialSaveModeMap);

          return formattedSuppliers;
        } else {
          setModalSpendDetails([]);
          return [];
        }
      } else {
        setModalSpendDetails([]);
        return [];
      }
    } catch (err) {
      console.warn("Failed to fetch modal materials details", err);
      setModalSpendDetails([]);
      return [];
    } finally {
      setModalSpendDetailsLoading(false);
    }
  }, [appliedFilters, materialServiceActiveTab, modalBaselineMonth]);

  const handleBarRowClick = useCallback((item: { material_name: string; total_spend: number }) => {
    setSelectedMaterialForModal(item);
    setIsMaterialModalOpen(true);
    setModalView('chart');
    setModalBaselineMonth(baselineMonth || '');
    setDisabledSuppliersForUnitPriceChart([]);
    setSelectedCompareMaterials([item.material_name]);
    setMaterialComparisonData(null);
    loadModalSpendDetails(item);
  }, [loadModalSpendDetails, baselineMonth]);

  // Fetch Spend By Supplier Data
  const loadSpendBySupplierData = useCallback(async () => {
    setSpendBySupplierLoading(true);
    try {
      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
        material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
        material_name: (appliedFilters.materialCodes.length > 0 || appliedFilters.services.length > 0) ? [...appliedFilters.materialCodes, ...appliedFilters.services] : undefined,
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        page: spendBySupplierPage,
        page_size: spendBySupplierPageSize,
        material_group: appliedFilters.materialGroups.length > 0 ? appliedFilters.materialGroups[0] : undefined,
        item_type: appliedFilters.itemType && appliedFilters.itemType !== 'all' ? appliedFilters.itemType : spendBySupplierItemType,
      };

      const res = await fetchSpendBySupplier(payload);
      if (res && res.status === "success" && res.data) {
        const list = res.data.spend_by_supplier || (Array.isArray(res.data) ? res.data : []);
        setSpendBySupplierList(list);
        const explicitCount = res.total_count || res.total_records || res.data?.total_count || res.data?.total_records;
        setSpendBySupplierTotalCount(calculateTotalCount(explicitCount, list.length, spendBySupplierPage, spendBySupplierPageSize));
      } else {
        setSpendBySupplierList([]);
        setSpendBySupplierTotalCount(0);
      }
    } catch (err) {
      console.warn("Failed to fetch spend by supplier data", err);
      setSpendBySupplierList([]);
      setSpendBySupplierTotalCount(0);
    } finally {
      setSpendBySupplierLoading(false);
    }
  }, [appliedFilters, spendBySupplierPage, spendBySupplierPageSize, spendBySupplierItemType]);

  useEffect(() => {
    loadSpendBySupplierData();
  }, [loadSpendBySupplierData]);

  // Fetch Supplier Details for Modal
  const loadSupplierDetailsModal = useCallback(async (item: { supplier: string; total_spend: number }) => {
    setSupplierModalLoading(true);
    setSupplierModalItem(null);
    try {
      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        supplier_name: item.supplier,
        material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes[0] : undefined,
        material_name: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes[0] : (appliedFilters.services.length > 0 ? appliedFilters.services[0] : undefined),
        outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        page: 1,
        page_size: 500,
        material_group: appliedFilters.materialGroups.length > 0 ? appliedFilters.materialGroups[0] : undefined,
      };

      const res = await fetchSupplierDetails(payload);
      if (res && res.status === "success" && res.data) {
        const suppliersList = res.data.suppliers || res.data.items || res.data.supplier_details || (Array.isArray(res.data) ? res.data : []);
        if (Array.isArray(suppliersList) && suppliersList.length > 0) {
          const detailItem = suppliersList[0];
          setSupplierModalItem(detailItem);
          const materialsList = detailItem.materials || detailItem.items || detailItem.suppliers || [];
          setSupplierModalDetails(materialsList);
        } else {
          setSupplierModalItem(null);
          setSupplierModalDetails(Array.isArray(res.data) ? res.data : []);
        }
      } else {
        setSupplierModalItem(null);
        setSupplierModalDetails([]);
      }
    } catch (err) {
      console.warn("Failed to fetch supplier details", err);
      setSupplierModalItem(null);
      setSupplierModalDetails([]);
    } finally {
      setSupplierModalLoading(false);
    }
  }, [appliedFilters]);

  const handleSupplierBarClick = useCallback((item: { supplier: string; total_spend: number }) => {
    setSelectedSupplierForModal(item);
    setIsSupplierModalOpen(true);
    setSupplierModalView('chart');
    loadSupplierDetailsModal(item);
  }, [loadSupplierDetailsModal]);

  const handleDownloadSupplierModalExcel = useCallback(() => {
    if (!supplierModalDetails || supplierModalDetails.length === 0) {
      toast.info("No supplier data available to download.");
      return;
    }
    const supplierName = supplierModalItem?.supplier_name || selectedSupplierForModal?.supplier || 'Supplier';
    const headers = ['Material / Item Name', 'Total Quantity', 'Latest Unit Price (AED)', 'Total Spend (AED)', 'Last Updated'];
    const rows = supplierModalDetails.map((item: any) => [
      `"${(item.material_name || item.item_name || item.name || '').replace(/"/g, '""')}"`,
      item.total_quantity !== undefined && item.total_quantity !== null ? item.total_quantity : '',
      item.latest_unit_price ?? item.unit_price ?? '',
      item.total_spend ?? '',
      `"${(item.last_updated || item.updated_on || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${supplierName.replace(/[^a-zA-Z0-9_-]/g, '_')}_details.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Excel data downloaded successfully.");
  }, [supplierModalDetails, supplierModalItem, selectedSupplierForModal]);

  // Fetch Category Details for Modal
  const loadCategoryDetailsModal = useCallback(async (item: { category: string; total_spend: number }) => {
    setCategoryModalLoading(true);
    try {
      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        material_group: item.category,
        outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        cost_center: appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined,
        supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers[0] : undefined,
        material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes[0] : undefined,
        material_name: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes[0] : (appliedFilters.services.length > 0 ? appliedFilters.services[0] : undefined),
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        page: 1,
        page_size: 500,
      };

      const res = await fetchCategoryDetails(payload);
      if (res && res.status === "success" && res.data) {
        const rawItems = res.data.items || (Array.isArray(res.data) ? res.data : []);
        setCategoryModalDetails(rawItems);
        const totalCount = res.total_count ?? res.total_items ?? (res.data ? res.data.total_count : undefined) ?? rawItems.length;
        setCategoryModalTotalCount(Number(totalCount) || rawItems.length);
      } else {
        setCategoryModalDetails([]);
        setCategoryModalTotalCount(0);
      }
    } catch (err) {
      console.warn("Failed to fetch category details", err);
      setCategoryModalDetails([]);
      setCategoryModalTotalCount(0);
    } finally {
      setCategoryModalLoading(false);
    }
  }, [appliedFilters]);

  const handleCategoryBarClick = useCallback((item: { category: string; total_spend: number }) => {
    setSelectedCategoryForModal(item);
    setIsCategoryModalOpen(true);
    setCategoryModalView('chart');
    setCategoryModalPage(1);
    loadCategoryDetailsModal(item);
  }, [loadCategoryDetailsModal]);

  // Fetch Outlet Details for Modal
  const loadOutletDetailsModal = useCallback(async (item: { outlet: string; total_spend?: number }) => {
    setOutletModalLoading(true);
    try {
      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        outlet: item.outlet,
        supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
        material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
        material_name: (appliedFilters.materialCodes.length > 0 || appliedFilters.services.length > 0) ? [...appliedFilters.materialCodes, ...appliedFilters.services] : undefined,
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        category: undefined,
        page: 1,
        page_size: 500,
        material_group: appliedFilters.materialGroups.length > 0 ? appliedFilters.materialGroups[0] : undefined,
        target_month: undefined,
      };

      const res = await fetchOutletDetails(payload);
      if (res && res.status === "success" && res.data) {
        const rawItems = res.data.outlet_details || res.data.items || (Array.isArray(res.data) ? res.data : []);
        setOutletModalDetails(rawItems);
      } else {
        setOutletModalDetails([]);
      }
    } catch (err) {
      console.warn("Failed to fetch outlet details", err);
      setOutletModalDetails([]);
    } finally {
      setOutletModalLoading(false);
    }
  }, [appliedFilters]);

  const handleOutletBarClick = useCallback((item: { outlet: string; total_spend?: number }) => {
    setSelectedOutletForModal(item);
    setIsOutletModalOpen(true);
    setOutletModalView('chart');
    loadOutletDetailsModal(item);
  }, [loadOutletDetailsModal]);

  // Fetch Month Trend Details (QuantityDetails / SpendDetails) for Modal
  const loadMonthTrendDetailsModal = useCallback(async (month: string, _trendType: 'quantity' | 'spend', page: number = 1, pageSize: number = 5) => {
    setMonthTrendModalLoading(true);
    try {
      const payload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        month: month,
        page: page,
        page_size: pageSize,
        // Date range filters
        start_date: appliedFilters.fromDate || undefined,
        end_date: appliedFilters.toDate || undefined,
        from_date: appliedFilters.fromDate || undefined,
        to_date: appliedFilters.toDate || undefined,
        startDate: appliedFilters.fromDate || undefined,
        endDate: appliedFilters.toDate || undefined,
        // Outlets / Properties / Company Codes
        outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        outlets: appliedFilters.properties.length > 0 ? appliedFilters.properties : undefined,
        property: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        properties: appliedFilters.properties.length > 0 ? appliedFilters.properties : undefined,
        company_code: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
        company_codes: appliedFilters.properties.length > 0 ? appliedFilters.properties : undefined,
        // Cost Centers
        cost_center: appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined,
        cost_centers: appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters : undefined,
        // Suppliers
        supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
        supplier: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers[0] : undefined,
        suppliers: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
        // Material Codes & Material Groups
        material_code: selectedTrendMaterial ? [selectedTrendMaterial] : (appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined),
        material_codes: selectedTrendMaterial ? [selectedTrendMaterial] : (appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined),
        material_name: selectedTrendMaterial || (appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes[0] : (appliedFilters.services.length > 0 ? appliedFilters.services[0] : undefined)),
        material_group: appliedFilters.materialGroups.length > 0 ? (Array.isArray(appliedFilters.materialGroups) ? appliedFilters.materialGroups[0] : appliedFilters.materialGroups) : undefined,
        material_groups: appliedFilters.materialGroups.length > 0 ? (Array.isArray(appliedFilters.materialGroups) ? appliedFilters.materialGroups : [appliedFilters.materialGroups]) : undefined,
        // Services
        service_name: appliedFilters.services.length > 0 ? appliedFilters.services : undefined,
        services: appliedFilters.services.length > 0 ? appliedFilters.services : undefined,
        // Departments, Requestors, GL Accounts
        department: appliedFilters.departments.length > 0 ? appliedFilters.departments[0] : undefined,
        departments: appliedFilters.departments.length > 0 ? appliedFilters.departments : undefined,
        requestor: appliedFilters.requestors.length > 0 ? appliedFilters.requestors[0] : undefined,
        requestors: appliedFilters.requestors.length > 0 ? appliedFilters.requestors : undefined,
        gl_account: appliedFilters.glAccounts.length > 0 ? appliedFilters.glAccounts[0] : undefined,
        gl_accounts: appliedFilters.glAccounts.length > 0 ? appliedFilters.glAccounts : undefined,
        // Item Type
        item_type: appliedFilters.itemType && appliedFilters.itemType !== 'all' ? appliedFilters.itemType : undefined,
      };

      const res = await fetchQuantityDetails(payload);
      if (res && (res.status === "success" || res.status === 200)) {
        setMonthTrendHeaderStats({
          total_suppliers: Number(res.total_suppliers) || 0,
          total_materials: Number(res.total_materials) || 0,
          total_quantity: Number(res.total_quantity) || 0,
          total_spend: Number(res.total_spend) || 0,
          total_count: Number(res.total_count) || 0,
        });

        const totalRecs = Number(res.total_count) || 0;
        setMonthTrendModalTotalCount(totalRecs);
        const totalPgs = Number(res.total_pages) || Math.max(1, Math.ceil((totalRecs || 1) / pageSize));
        setMonthTrendModalTotalPages(totalPgs);

        let flattenedItems: Array<{
          date: string;
          supplier_name: string;
          material_name: string;
          total_quantity: number;
          total_spend: number;
        }> = [];

        if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
          Object.keys(res.data).forEach(dateKey => {
            const list = res.data[dateKey];
            if (Array.isArray(list)) {
              list.forEach((item: any) => {
                flattenedItems.push({
                  date: dateKey,
                  supplier_name: item.supplier_name || '-',
                  material_name: item.material_name || '-',
                  total_quantity: Number(item.total_quantity ?? item.quantity) || 0,
                  total_spend: Number(item.total_spend ?? item.spend) || 0,
                });
              });
            }
          });
        } else if (Array.isArray(res.data)) {
          flattenedItems = res.data.map((item: any) => ({
            date: item.date || item.created_at || '-',
            supplier_name: item.supplier_name || '-',
            material_name: item.material_name || '-',
            total_quantity: Number(item.total_quantity ?? item.quantity) || 0,
            total_spend: Number(item.total_spend ?? item.spend) || 0,
          }));
        } else if (res.items || res.quantity_details) {
          const raw = res.items || res.quantity_details;
          if (Array.isArray(raw)) {
            flattenedItems = raw.map((item: any) => ({
              date: item.date || '-',
              supplier_name: item.supplier_name || '-',
              material_name: item.material_name || '-',
              total_quantity: Number(item.total_quantity ?? item.quantity) || 0,
              total_spend: Number(item.total_spend ?? item.spend) || 0,
            }));
          }
        }

        setMonthTrendModalDetails(flattenedItems);
      } else {
        setMonthTrendModalDetails([]);
        setMonthTrendHeaderStats({ total_suppliers: 0, total_materials: 0, total_quantity: 0, total_spend: 0, total_count: 0 });
        setMonthTrendModalTotalCount(0);
        setMonthTrendModalTotalPages(1);
      }
    } catch (err) {
      console.warn("Failed to fetch month trend details", err);
      setMonthTrendModalDetails([]);
      setMonthTrendHeaderStats({ total_suppliers: 0, total_materials: 0, total_quantity: 0, total_spend: 0, total_count: 0 });
      setMonthTrendModalTotalCount(0);
      setMonthTrendModalTotalPages(1);
    } finally {
      setMonthTrendModalLoading(false);
    }
  }, [appliedFilters, selectedTrendMaterial]);

  const handleQuantityTrendClick = useCallback((month: string) => {
    setMonthTrendModalType('quantity');
    setSelectedMonthTrendMonth(month);
    setMonthTrendModalPage(1);
    setMonthTrendModalPageSize(5);
    setIsMonthTrendModalOpen(true);
    loadMonthTrendDetailsModal(month, 'quantity', 1, 5);
  }, [loadMonthTrendDetailsModal]);

  const handleSpendTrendClick = useCallback((month: string) => {
    setMonthTrendModalType('spend');
    setSelectedMonthTrendMonth(month);
    setMonthTrendModalPage(1);
    setMonthTrendModalPageSize(5);
    setIsMonthTrendModalOpen(true);
    loadMonthTrendDetailsModal(month, 'spend', 1, 5);
  }, [loadMonthTrendDetailsModal]);

  const handleMonthTrendPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > monthTrendModalTotalPages) return;
    setMonthTrendModalPage(newPage);
    loadMonthTrendDetailsModal(selectedMonthTrendMonth, monthTrendModalType, newPage, monthTrendModalPageSize);
  };

  const handleMonthTrendPageSizeChange = (newSize: number) => {
    setMonthTrendModalPageSize(newSize);
    setMonthTrendModalPage(1);
    loadMonthTrendDetailsModal(selectedMonthTrendMonth, monthTrendModalType, 1, newSize);
  };

  const handleDownloadMonthTrendExcel = useCallback(() => {
    if (!monthTrendModalDetails || monthTrendModalDetails.length === 0) {
      toast.info("No details available to download.");
      return;
    }
    const headers = ['Date', 'Material Name', 'Supplier Name', 'Total Quantity', 'Total Spend (AED)'];
    const rows = monthTrendModalDetails.map((item: any) => [
      `"${(item.date || '').replace(/"/g, '""')}"`,
      `"${(item.material_name || '').replace(/"/g, '""')}"`,
      `"${(item.supplier_name || '').replace(/"/g, '""')}"`,
      item.total_quantity ?? '',
      item.total_spend ?? ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${monthTrendModalType === 'quantity' ? 'Quantity' : 'Spend'}_Details_${selectedMonthTrendMonth.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Details downloaded successfully.");
  }, [monthTrendModalDetails, monthTrendModalType, selectedMonthTrendMonth]);

  const handleClearModalUnitPriceFilters = useCallback(() => {
    setSelectedOutletFilter('');
    setModalFromDate('');
    setModalToDate('');
    setModalBaselineMonth('');
    setDisabledSuppliersForUnitPriceChart([]);
    if (selectedMaterialForModal) {
      loadAllModalUnitPriceTrends(
        selectedMaterialForModal.material_name,
        modalSpendDetails,
        '',
        '',
        modalView === 'supplier_unit_price' ? 'supplier_unit_price' : 'unit_price',
        '',
        ''
      );
    }
    toast.info("Modal filters cleared.");
  }, [selectedMaterialForModal, modalSpendDetails, modalView, loadAllModalUnitPriceTrends]);


  // Isolated effects for each component to prevent cross-component re-fetch cascades
  useEffect(() => {
    if (activeTab === "PROCUREMENT_PERFORMANCE") {
      loadAbcAnalysisData();
    }
  }, [activeTab, loadAbcAnalysisData]);

  useEffect(() => {
    if (activeTab === "PROCUREMENT_PERFORMANCE") {
      loadOutletSpendVarianceData();
    }
  }, [activeTab, loadOutletSpendVarianceData]);

  useEffect(() => {
    if (activeTab === "PROCUREMENT_PERFORMANCE") {
      loadSpendByOutletData();
    }
  }, [activeTab, loadSpendByOutletData]);

  useEffect(() => {
    if (activeTab === "PROCUREMENT_PERFORMANCE") {
      loadSpendForecast();
    }
  }, [activeTab, loadSpendForecast]);

  useEffect(() => {
    if (activeTab === "PROCUREMENT_PERFORMANCE") {
      loadPurchaseFrequencyData();
    }
  }, [activeTab, loadPurchaseFrequencyData]);

  useEffect(() => {
    if (activeTab === "PROCUREMENT_PERFORMANCE") {
      loadMaterialVarianceData();
    }
  }, [activeTab, loadMaterialVarianceData]);

  useEffect(() => {
    if (activeTab === "PROCUREMENT_PERFORMANCE") {
      loadUnitPriceOutlierFeed();
    }
  }, [activeTab, loadUnitPriceOutlierFeed]);

  useEffect(() => {
    if (activeTab === "PROCUREMENT_PERFORMANCE") {
      loadKraljicMatrixData();
    }
  }, [activeTab, loadKraljicMatrixData]);

  useEffect(() => {
    if (activeTab === "PROCUREMENT_PERFORMANCE") {
      loadSpendByMaterialServiceTypeData();
    }
  }, [activeTab, loadSpendByMaterialServiceTypeData]);

  useEffect(() => {
    if (activeTab === "PROCUREMENT_PERFORMANCE") {
      loadSpendDetailData();
    }
  }, [activeTab, loadSpendDetailData]);

  useEffect(() => {
    if (activeTab === "PROCUREMENT_PERFORMANCE") {
      loadSpendByCategoryData();
    }
  }, [activeTab, loadSpendByCategoryData]);

  // Load filter options from API
  const loadFilterOptions = useCallback(async () => {

    // 2. Fetch suppliers, materials, services, and material groups using separate endpoints
    let suppliersList = ['Global Office Supplies', 'Apex Logistics Ltd', 'Tech Solutions Inc', 'Alpha Materials', 'Delta Services'];
    let materialCodesList: string[] = [];
    let materialGroupsList: string[] = [];
    let servicesList: string[] = [];
    let outletsList: string[] = [];
    let costCentersList: string[] = [];

    try {
      const [materialsRes, suppliersRes, servicesRes, materialGroupsRes, outletsRes, costCentersRes] = await Promise.all([
        fetchSpendMaterials({ type: "PROCUREMENT_PERFORMANCE" }),
        fetchSpendSuppliers({ type: "PROCUREMENT_PERFORMANCE" }),
        fetchSpendServices({ type: "PROCUREMENT_PERFORMANCE" }),
        fetchMaterialGroups({ type: "PROCUREMENT_PERFORMANCE" }).catch(() => null),
        fetchOutlets({ type: "PROCUREMENT_PERFORMANCE" }).catch(() => null),
        fetchCostCenters({ type: "PROCUREMENT_PERFORMANCE" }).catch(() => null)
      ]);

      const extractStringItem = (item: any): string => {
        if (typeof item === 'string') return item;
        if (!item || typeof item !== 'object') return String(item || '');
        const val = item.service || item.service_name || item.services || item.supplier || item.supplier_name || item.material || item.material_code || item.cost_center || item.outlet || item.name || item.code || Object.values(item)[0];
        return typeof val === 'string' ? val : String(val || '');
      };

      if (materialsRes && materialsRes.status === "success" && materialsRes.data) {
        const nestedData = materialsRes.data.data || materialsRes.data;
        const rawList = Array.isArray(nestedData.materials) ? nestedData.materials : (Array.isArray(nestedData) ? nestedData : []);
        materialCodesList = rawList.map(extractStringItem).filter(Boolean);
      }

      if (suppliersRes && suppliersRes.status === "success" && suppliersRes.data) {
        const nestedData = suppliersRes.data.data || suppliersRes.data;
        const rawList = Array.isArray(nestedData.suppliers) ? nestedData.suppliers : (Array.isArray(nestedData) ? nestedData : []);
        suppliersList = rawList.map(extractStringItem).filter(Boolean);
      }

      if (servicesRes && servicesRes.status === "success" && servicesRes.data) {
        const nestedData = servicesRes.data.data || servicesRes.data;
        const rawList = Array.isArray(nestedData.services) ? nestedData.services : (Array.isArray(nestedData) ? nestedData : []);
        servicesList = rawList.map(extractStringItem).filter(Boolean);
      }

      if (materialGroupsRes && materialGroupsRes.status === "success" && materialGroupsRes.data) {
        const nestedData = materialGroupsRes.data.data || materialGroupsRes.data;
        const rawList = Array.isArray(nestedData.material_groups) ? nestedData.material_groups : (Array.isArray(nestedData) ? nestedData : []);
        materialGroupsList = rawList.map(extractStringItem).filter(Boolean);
      }

      if (outletsRes && outletsRes.status === "success" && outletsRes.data) {
        const nestedData = outletsRes.data.data || outletsRes.data;
        const rawList = Array.isArray(nestedData.outlets) ? nestedData.outlets : (Array.isArray(nestedData) ? nestedData : []);
        outletsList = rawList.map(extractStringItem).filter(Boolean);
      }

      if (costCentersRes && costCentersRes.status === "success" && costCentersRes.data) {
        const nestedData = costCentersRes.data.data || costCentersRes.data;
        const rawList = Array.isArray(nestedData.cost_centers) ? nestedData.cost_centers : (Array.isArray(nestedData) ? nestedData : []);
        costCentersList = rawList.map(extractStringItem).filter(Boolean);
      }
    } catch (e) {
      console.warn("Failed to fetch separate materials, suppliers, services, material groups, outlets, and cost centers", e);
    }

    setFilterOptions(prev => ({
      ...prev,
      suppliers: suppliersList,
      materialCodes: materialCodesList,
      materialGroups: materialGroupsList,
      services: servicesList,
      properties: outletsList.length > 0 ? outletsList : prev.properties,
      costCenters: costCentersList.length > 0 ? costCentersList : prev.costCenters,
    }));
    setFilterOptions(prev => ({
      ...prev,
      suppliers: suppliersList,
      materialCodes: materialCodesList,
      materialGroups: materialGroupsList,
      services: servicesList,
      properties: outletsList.length > 0 ? outletsList : prev.properties,
      costCenters: costCentersList.length > 0 ? costCentersList : prev.costCenters,
    }));
    setInitialSuppliers(suppliersList);
    setInitialMaterials(materialCodesList);
    setInitialServices(servicesList);
    setInitialProperties(outletsList);
    setInitialCostCenters(costCentersList);

  }, []);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // Dynamic cross-filtering across Supplier, Material, Service, Company Code (Properties/Outlets), and Cost Center
  useEffect(() => {
    const handleCrossFiltering = async () => {
      const activeOutlet = filters.properties.length > 0 ? filters.properties[0] : undefined;
      const activeCostCenter = filters.costCenters.length > 0 ? filters.costCenters[0] : undefined;
      const activeSupplier = filters.suppliers.length > 0 ? filters.suppliers : undefined;
      const activeMaterialCode = filters.materialCodes.length > 0 ? filters.materialCodes : undefined;
      const activeService = filters.services.length > 0 ? filters.services : undefined;
      const start_date = filters.fromDate || undefined;
      const end_date = filters.toDate || undefined;

      const extractStringItem = (item: any): string => {
        if (typeof item === 'string') return item;
        if (!item || typeof item !== 'object') return String(item || '');
        const val = item.service || item.service_name || item.services || item.supplier || item.supplier_name || item.material || item.material_code || item.cost_center || item.outlet || item.name || item.code || Object.values(item)[0];
        return typeof val === 'string' ? val : String(val || '');
      };

      const basePayload: any = {
        type: "PROCUREMENT_PERFORMANCE",
        start_date,
        end_date
      };

      const hasActiveFilter = Boolean(activeOutlet || activeCostCenter || activeSupplier || activeMaterialCode || activeService || start_date || end_date);

      if (!hasActiveFilter) {
        setFilterOptions(prev => ({
          ...prev,
          suppliers: initialSuppliers.length > 0 ? initialSuppliers : prev.suppliers,
          materialCodes: initialMaterials.length > 0 ? initialMaterials : prev.materialCodes,
          services: initialServices.length > 0 ? initialServices : prev.services,
          properties: initialProperties.length > 0 ? initialProperties : prev.properties,
          costCenters: initialCostCenters.length > 0 ? initialCostCenters : prev.costCenters,
        }));
        return;
      }

      try {
        const promises: Promise<any>[] = [];

        // 1. Fetch Materials cross-filtered by active Supplier, Service, Outlet, CostCenter
        promises.push(fetchSpendMaterials({
          ...basePayload,
          supplier_name: activeSupplier,
          service_name: activeService,
          service: activeService ? (Array.isArray(activeService) ? activeService[0] : activeService) : undefined,
          outlet: activeOutlet,
          cost_center: activeCostCenter
        }).catch(() => null));

        const activeMaterialName = (filters.materialCodes.length > 0 || filters.services.length > 0) ? [...filters.materialCodes, ...filters.services] : undefined;

        // 2. Fetch Suppliers cross-filtered by active Material, Service, Outlet, CostCenter
        promises.push(fetchSpendSuppliers({
          ...basePayload,
          material_code: activeMaterialCode,
          material_name: activeMaterialName,
          service_name: activeService,
          service: activeService ? (Array.isArray(activeService) ? activeService[0] : activeService) : undefined,
          outlet: activeOutlet,
          cost_center: activeCostCenter
        }).catch(() => null));

        // 3. Fetch Services cross-filtered by active Material, Supplier, Outlet, CostCenter
        promises.push(fetchSpendServices({
          ...basePayload,
          material_code: activeMaterialCode,
          material_name: activeMaterialName,
          supplier_name: activeSupplier,
          outlet: activeOutlet,
          cost_center: activeCostCenter
        }).catch(() => null));

        // 4. Fetch Outlets (Company Codes) cross-filtered by active Material, Supplier, Service, CostCenter
        promises.push(fetchOutlets({
          ...basePayload,
          material_code: activeMaterialCode,
          material_name: activeMaterialName,
          supplier_name: activeSupplier,
          service_name: activeService,
          service: activeService ? (Array.isArray(activeService) ? activeService[0] : activeService) : undefined,
          cost_center: activeCostCenter
        }).catch(() => null));

        // 5. Fetch Cost Centers cross-filtered by active Material, Supplier, Service, Outlet
        promises.push(fetchCostCenters({
          ...basePayload,
          material_code: activeMaterialCode,
          material_name: activeMaterialName,
          supplier_name: activeSupplier,
          service_name: activeService,
          service: activeService ? (Array.isArray(activeService) ? activeService[0] : activeService) : undefined,
          outlet: activeOutlet
        }).catch(() => null));

        const [matRes, supRes, srvRes, outRes, ccRes] = await Promise.all(promises);

        let newMaterials: string[] | null = null;
        let newSuppliers: string[] | null = null;
        let newServices: string[] | null = null;
        let newOutlets: string[] | null = null;
        let newCostCenters: string[] | null = null;

        if (matRes && matRes.status === "success" && matRes.data) {
          const nested = matRes.data.data || matRes.data;
          const raw = Array.isArray(nested.materials) ? nested.materials : (Array.isArray(nested) ? nested : []);
          newMaterials = raw.map(extractStringItem).filter(Boolean);
        }

        if (supRes && supRes.status === "success" && supRes.data) {
          const nested = supRes.data.data || supRes.data;
          const raw = Array.isArray(nested.suppliers) ? nested.suppliers : (Array.isArray(nested) ? nested : []);
          newSuppliers = raw.map(extractStringItem).filter(Boolean);
        }

        if (srvRes && srvRes.status === "success" && srvRes.data) {
          const nested = srvRes.data.data || srvRes.data;
          const raw = Array.isArray(nested.services) ? nested.services : (Array.isArray(nested) ? nested : []);
          newServices = raw.map(extractStringItem).filter(Boolean);
        }

        if (outRes && outRes.status === "success" && outRes.data) {
          const nested = outRes.data.data || outRes.data;
          const raw = Array.isArray(nested.outlets) ? nested.outlets : (Array.isArray(nested) ? nested : []);
          newOutlets = raw.map(extractStringItem).filter(Boolean);
        }

        if (ccRes && ccRes.status === "success" && ccRes.data) {
          const nested = ccRes.data.data || ccRes.data;
          const raw = Array.isArray(nested.cost_centers) ? nested.cost_centers : (Array.isArray(nested) ? nested : []);
          newCostCenters = raw.map(extractStringItem).filter(Boolean);
        }

        setFilterOptions(prev => ({
          ...prev,
          materialCodes: (newMaterials && newMaterials.length > 0) ? newMaterials : (filters.materialCodes.length > 0 ? prev.materialCodes : (initialMaterials.length > 0 ? initialMaterials : prev.materialCodes)),
          suppliers: (newSuppliers && newSuppliers.length > 0) ? newSuppliers : (filters.suppliers.length > 0 ? prev.suppliers : (initialSuppliers.length > 0 ? initialSuppliers : prev.suppliers)),
          services: (newServices && newServices.length > 0) ? newServices : (filters.services.length > 0 ? prev.services : (initialServices.length > 0 ? initialServices : prev.services)),
          properties: (newOutlets && newOutlets.length > 0) ? newOutlets : (filters.properties.length > 0 ? prev.properties : (initialProperties.length > 0 ? initialProperties : prev.properties)),
          costCenters: (newCostCenters && newCostCenters.length > 0) ? newCostCenters : (filters.costCenters.length > 0 ? prev.costCenters : (initialCostCenters.length > 0 ? initialCostCenters : prev.costCenters)),
        }));
      } catch (err) {
        console.warn("Failed to cross-filter options across Material, Supplier, Service, Outlet, and CostCenter", err);
      }
    };

    handleCrossFiltering();
  }, [filters.suppliers, filters.materialCodes, filters.services, filters.properties, filters.costCenters, filters.fromDate, filters.toDate, initialSuppliers, initialMaterials, initialServices, initialProperties, initialCostCenters]);

  // Load dashboard summaries (Procurement) (Mocked/API integrated)
  const loadAllSummaries = useCallback(async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    loadSpendPerformanceData();

    setLoading(false);
    setApplyingFilter(false);
  }, [loadSpendPerformanceData]);

  useEffect(() => {
    if (activeTab === "PROCUREMENT_PERFORMANCE") {
      loadAllSummaries();
    } else {
      setLoading(false);
    }
  }, [activeTab, loadAllSummaries]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.pr-checkbox-dropdown')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to section in page
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Filter application handlers
  const handleFromDateChange = (newFromDate: string) => {
    setFilters(prev => {
      const updated = { ...prev, fromDate: newFromDate };
      if ((updated.fromDate && updated.toDate) || (!updated.fromDate && !updated.toDate)) {
        setAppliedFilters(updated);
        toast.success("Date filter applied!");
      }
      return updated;
    });
  };

  const handleToDateChange = (newToDate: string) => {
    setFilters(prev => {
      const updated = { ...prev, toDate: newToDate };
      if ((updated.fromDate && updated.toDate) || (!updated.fromDate && !updated.toDate)) {
        setAppliedFilters(updated);
        toast.success("Date filter applied!");
      }
      return updated;
    });
  };

  const handleApplyFilter = async () => {
    setApplyingFilter(true);
    if (activeTab === "PROCUREMENT_PERFORMANCE") {
      setAppliedFilters(filters);
      toast.success("Filters applied successfully!");
    }
  };

  const handleClearFilter = () => {
    if (activeTab === "PROCUREMENT_PERFORMANCE") {
      const cleared = {
        suppliers: [],
        departments: [],
        properties: [],
        fromDate: '',
        toDate: '',
        glAccounts: [],
        costCenters: [],
        requestors: [],
        materialCodes: [],
        materialGroups: [],
        services: [],
        itemType: 'all' as const,
      };
      setFilters(cleared);
      setAppliedFilters(cleared);
    }
    toast.info("Filters cleared.");
  };



  const [downloadingExcelMap, setDownloadingExcelMap] = useState<{ [key: string]: boolean }>({});

  const handleDownloadChart = async (elementId: string, filename: string) => {
    const el = document.getElementById(elementId);
    if (!el) {
      toast.error(`Chart container #${elementId} not found.`);
      return;
    }
    try {
      toast.info("Generating chart image...");
      const dataUrl = await toPng(el, {
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: {
          borderRadius: '0px',
        }
      });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Chart image downloaded successfully!");
    } catch (err) {
      console.error("Failed to download chart", err);
      toast.error("Failed to export chart image.");
    }
  };

  const handleDownloadExcel = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.info("No data available to download.");
      return;
    }
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      XLSX.writeFile(workbook, `${filename}.xlsx`);
      toast.success("Data exported to Excel successfully!");
    } catch (err) {
      console.error("Failed to export Excel", err);
      toast.error("Failed to export data to Excel.");
    }
  };

  const getFullFilteredData = async (_endpointType: string): Promise<any> => {
    return null;
  };

  const handleDownloadDataExcel = async (dataType: string, filename: string) => {
    setDownloadingExcelMap(prev => ({ ...prev, [dataType]: true }));
    try {
      if (dataType === 'spend_trend') {
        const dataToExport = perfSpendTrend.labels.map((lbl, idx) => ({
          "Month": lbl,
          "Total Spend (AED)": perfSpendTrend.values[idx]
        }));
        handleDownloadExcel(dataToExport, filename);
      } else if (dataType === 'spend_by_material_service') {
        const materialRows = spendByMaterialList.map(item => ({
          "Item Type": "Material",
          "Material / Service Name": item.material_name,
          "Total Spend (AED)": item.total_spend
        }));
        const serviceRows = spendByServiceList.map(item => ({
          "Item Type": "Service",
          "Material / Service Name": item.material_name,
          "Total Spend (AED)": item.total_spend
        }));
        handleDownloadExcel([...materialRows, ...serviceRows], filename);
      } else if (dataType === 'unit_price_trend') {
        const dataToExport = perfUnitPriceTrend.labels.map((lbl, idx) => ({
          "Month": lbl,
          "Average Unit Price (AED)": perfUnitPriceTrend.values[idx]
        }));
        handleDownloadExcel(dataToExport, filename);
      } else if (dataType === 'quantity_trend') {
        const dataToExport = perfQuantityTrend.labels.map((lbl, idx) => ({
          "Month": lbl,
          "Total Quantity": perfQuantityTrend.values[idx]
        }));
        handleDownloadExcel(dataToExport, filename);
      } else if (dataType === 'top_suppliers') {
        toast.info("Fetching full filtered suppliers list...");
        const res = await getFullFilteredData('graph1');
        if (res && res.status === "success" && res.data && Array.isArray(res.data.spend_by_supplier)) {
          const rows = res.data.spend_by_supplier.map((item: any) => ({
            "Supplier Name": item.supplier_name,
            "Total Spend (AED)": item.total_spend
          }));
          handleDownloadExcel(rows, filename);
        } else {
          toast.error("Failed to fetch full suppliers list or no data found.");
        }
      } else if (dataType === 'top_materials') {
        toast.info("Fetching full filtered materials list...");
        const res = await getFullFilteredData('graph1');
        if (res && res.status === "success" && res.data && Array.isArray(res.data.spend_by_material)) {
          const rows = res.data.spend_by_material.map((item: any) => ({
            "Material Code": item.material_code,
            "Description": item.description,
            "Total Spend (AED)": item.total_spend
          }));
          handleDownloadExcel(rows, filename);
        } else {
          toast.error("Failed to fetch full materials list or no data found.");
        }
      } else if (dataType === 'outlet_spend') {
        toast.info("Fetching full outlet spend variance dataset...");
        const payload: any = {
          type: "PROCUREMENT_PERFORMANCE",
          start_date: appliedFilters.fromDate || undefined,
          end_date: appliedFilters.toDate || undefined,
          outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
          supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
          material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
          material_name: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
          service_name: appliedFilters.services.length > 0 ? appliedFilters.services : undefined,
          page: 1,
          page_size: 10000
        };
        if (appliedFilters.itemType && appliedFilters.itemType !== 'all') {
          payload.item_type = appliedFilters.itemType;
        }
        const res = await fetchOutletSpendVariance(payload);
        if (res && res.status === "success" && res.data && Array.isArray(res.data.outlet_spend_variance)) {
          const rawList = res.data.outlet_spend_variance || [];
          const totalOutletsCount = res.total_count || rawList.length || 0;
          const totalSpendSum = rawList.reduce((sum: number, item: any) => sum + (Number(item.total_spend) || 0), 0);
          const avgSpend = res.data.summary?.average_spend ?? (totalOutletsCount > 0 ? totalSpendSum / totalOutletsCount : 0);

          const rows = rawList.map((item: any) => {
            const totalSpend = Number(item.total_spend) || 0;
            const avg = item.avg_spend ?? avgSpend;
            const variance = item.variance ?? (totalSpend - avg);
            const varPercent = avg ? (variance / avg) * 100 : 0;
            return {
              "Outlet": item.outlet,
              "Total Spend (AED)": totalSpend,
              "Average Spend (AED)": avg,
              "Variance (AED)": variance,
              "Variance (%)": `${varPercent > 0 ? '+' : ''}${varPercent.toFixed(1)}%`,
              "Status": item.status || (totalSpend > avg * 1.5 ? 'High Spend Outlier' : 'Normal')
            };
          });
          handleDownloadExcel(rows, filename);
        } else {
          toast.error("Failed to fetch outlet spend variance for export.");
        }
      } else if (dataType === 'forecast') {
        toast.info("Fetching forecast dataset...");
        const dataToExport = [
          ...forecastHistorical.map(h => ({
            "Month": h.month,
            "Type": "Historical",
            "Spend (AED)": h.total_spend
          })),
          ...forecastPredicted.map(f => ({
            "Month": f.month,
            "Type": "Forecasted",
            "Spend (AED)": f.total_spend
          }))
        ];
        handleDownloadExcel(dataToExport, filename);
      } else if (dataType === 'lead_times' || dataType === 'purchase_frequency') {
        toast.info("Fetching full purchase frequency dataset...");
        const payload: any = {
          type: "PROCUREMENT_PERFORMANCE",
          start_date: appliedFilters.fromDate || undefined,
          end_date: appliedFilters.toDate || undefined,
          outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
          supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
          material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
          material_name: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
          page: 1,
          page_size: 10000
        };
        if (appliedFilters.itemType && appliedFilters.itemType !== 'all') {
          payload.item_type = appliedFilters.itemType;
        }
        const res = await fetchPurchaseFrequency(payload);
        if (res && res.status === "success" && res.data && Array.isArray(res.data.purchase_frequency)) {
          const rows = res.data.purchase_frequency.map((item: any) => ({
            "Supplier": item.supplier,
            "Material Code": item.material_code,
            "Average Days Between GRNs": item.avg_days_between_grns,
            "Frequency": item.frequency
          }));
          handleDownloadExcel(rows, filename);
        } else {
          toast.error("Failed to fetch purchase frequency data for export.");
        }
      } else if (dataType === 'anomalies' || dataType === 'material_variance') {
        toast.info("Fetching full material variance dataset...");
        const payload: any = {
          type: "PROCUREMENT_PERFORMANCE",
          start_date: appliedFilters.fromDate || undefined,
          end_date: appliedFilters.toDate || undefined,
          outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
          cost_center: appliedFilters.costCenters.length > 0 ? appliedFilters.costCenters[0] : undefined,
          supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
          material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
          material_name: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
          material_group: appliedFilters.materialGroups.length > 0 ? (Array.isArray(appliedFilters.materialGroups) ? appliedFilters.materialGroups[0] : appliedFilters.materialGroups) : undefined,
          anomaly_threshold: anomalyThreshold,
          page: 1,
          page_size: 10000,
          baseline_month: baselineMonth || undefined
        };
        if (appliedFilters.itemType && appliedFilters.itemType !== 'all') {
          payload.item_type = appliedFilters.itemType;
        }
        const res = await fetchMaterialVariance(payload);
        if (res && res.status === "success" && res.data && Array.isArray(res.data.material_variance)) {
          const rows: any[] = [];
          res.data.material_variance.forEach((item: any) => {
            if (Array.isArray(item.months)) {
              item.months.forEach((m: string, idx: number) => {
                rows.push({
                  "Supplier": item.supplier,
                  "Material Code": item.material_code,
                  "Month": m,
                  "Current Spend (AED)": item.current_spend?.[idx] ?? 0,
                  "Historical Average (AED)": item.historical_average?.[idx] ?? 0,
                  "Variance (AED)": item.variance?.[idx] ?? 0,
                  "Anomaly Status": item.anomaly?.[idx] ?? "Normal"
                });
              });
            }
          });
          handleDownloadExcel(rows, filename);
        } else {
          toast.error("Failed to fetch material variance data for export.");
        }
      } else if (dataType === 'spend_by_category') {
        toast.info("Fetching full spend by category dataset...");
        const payload: any = {
          type: "PROCUREMENT_PERFORMANCE",
          start_date: appliedFilters.fromDate || undefined,
          end_date: appliedFilters.toDate || undefined,
          outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
          supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
          material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
          material_name: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
          item_type: appliedFilters.itemType && appliedFilters.itemType !== 'all' ? appliedFilters.itemType : spendByCategoryType,
          page: 1,
          page_size: 10000
        };
        const res = await fetchSpendByCategory(payload);
        if (res && res.status === "success" && res.data && Array.isArray(res.data.spend_by_category)) {
          const rows = res.data.spend_by_category.map((item: any) => ({
            "Material Group / Category": item.material_group,
            "Total Spend (AED)": item.total_spend
          }));
          handleDownloadExcel(rows, filename);
        } else {
          toast.error("Failed to fetch spend by category data for export.");
        }
      } else if (dataType === 'abc_analysis') {
        toast.info("Fetching full ABC Analysis dataset...");
        const payload: any = {
          type: "PROCUREMENT_PERFORMANCE",
          start_date: appliedFilters.fromDate || undefined,
          end_date: appliedFilters.toDate || undefined,
          outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
          supplier_name: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
          material_code: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
          material_name: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
          category: abcCategoryFilter !== 'ALL' ? abcCategoryFilter : "",
          page: 1,
          page_size: 10000,
          threshold_a: abcThresholdA,
          threshold_b: abcThresholdB,
        };
        if (abcItemType !== 'all') {
          payload.item_type = abcItemType;
        }
        const res = await fetchAbcAnalysis(payload);
        if (res && res.status === "success" && res.data && Array.isArray(res.data.materials)) {
          const rows = res.data.materials.map((item: any) => ({
            "Category": item.category,
            "Material / Service Name": item.material_name,
            "Supplier Name": item.supplier_name,
            "Total Spend (AED)": item.total_spend,
            "Spend %": `${item.percentage}%`,
            "Cumulative Spend %": `${item.cumulative_percentage}%`
          }));
          handleDownloadExcel(rows, filename);
        } else {
          toast.error("Failed to fetch ABC Analysis data for export.");
        }
      } else if (dataType === 'spend_by_material_detail') {
        toast.info("Fetching full spend detail breakdown...");
        try {
          const payload: any = {
            type: "PROCUREMENT_PERFORMANCE",
            start_date: appliedFilters.fromDate || undefined,
            end_date: appliedFilters.toDate || undefined,
            outlet: appliedFilters.properties.length > 0 ? appliedFilters.properties[0] : undefined,
            supplier: appliedFilters.suppliers.length > 0 ? appliedFilters.suppliers : undefined,
            material: appliedFilters.materialCodes.length > 0 ? appliedFilters.materialCodes : undefined,
            item_type: materialServiceActiveTab,
            page: 1,
            page_size: 10000,
          };
          const res = await fetchSpendByMaterialDetail(payload);
          if (res && res.status === "success" && res.data && Array.isArray(res.data.items)) {
            const rows = res.data.items.map((item: any) => ({
              "Supplier Name": item.supplier_name,
              "Material / Service Name": item.material_name,
              "Type": item.item_type,
              "Total Quantity": item.total_quantity,
              "Unit Price (AED)": item.unit_price,
              "Total Spend (AED)": item.total_spend
            }));
            handleDownloadExcel(rows, filename);
          } else {
            toast.error("No detailed spend records found for export.");
          }
        } catch (e) {
          toast.error("Failed to export spend detail data.");
        }
      }
    } catch (err) {
      console.error("Failed to download data", err);
      toast.error("Error downloading data.");
    } finally {
      setDownloadingExcelMap(prev => ({ ...prev, [dataType]: false }));
    }
  };

  // Reusable checkbox dropdown component
  const renderDropdown = (
    field: string,
    label: string,
    rawSelectedValues: any[],
    rawOptions: any[],
    onToggle: () => void,
    isOpen: boolean,
    onCheckboxChange: (val: string) => void
  ) => {
    const extractString = (item: any): string => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return String(item || '');
      const str = item.service || item.service_name || item.services || item.supplier || item.supplier_name || item.material || item.material_code || item.cost_center || item.outlet || item.name || item.code || Object.values(item)[0];
      return typeof str === 'string' ? str : String(str || '');
    };

    const options = (rawOptions || []).map(extractString).filter(Boolean);
    const selectedValues = (rawSelectedValues || []).map(extractString).filter(Boolean);

    const searchQuery = String(searchQueries[field] || '').toLowerCase();
    const filteredOptions = options.filter(opt =>
      String(opt || '').toLowerCase().includes(searchQuery)
    );

    let displayLabel = `All ${label}`;
    if (selectedValues.length === 1) {
      displayLabel = selectedValues[0];
    } else if (selectedValues.length > 1) {
      displayLabel = `${selectedValues.length} Selected`;
    }



    return (
      <div className="pr-checkbox-dropdown">
        <button type="button" className="pr-dropdown-toggle" onClick={onToggle} title={selectedValues.length === 1 ? selectedValues[0] : displayLabel}>
          <span className="pr-dropdown-label-truncate" title={displayLabel}>{displayLabel}</span>
          <ChevronDown width={14} height={14} className={`pr-chevron-icon ${isOpen ? 'open' : ''}`} />
        </button>

        {isOpen && (
          <div className="pr-dropdown-menu">
            <div className="pr-search-box" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                className="pr-search-input"
                placeholder={`Search ${label}...`}
                value={searchQuery}
                onChange={e => setSearchQueries(prev => ({ ...prev, [field]: e.target.value }))}
              />
            </div>

            <div className="pr-dropdown-list">
              {field === 'materialCodes' && isMaterialFilterSearching ? (
                <div style={{ padding: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <SpinnerLoaders size="small" text="" fullScreen={false} />
                </div>
              ) : filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isChecked = selectedValues.includes(opt);
                  return (
                    <div
                      key={opt}
                      className="pr-dropdown-option-row"
                    >
                      <label
                        className="pr-checkbox-item pr-dropdown-checkbox-label"
                        title={opt}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onCheckboxChange(opt)}
                          className="pr-dropdown-checkbox-input"
                        />
                        <span
                          className="pr-dropdown-option-text"
                          title={opt}
                        >
                          {opt}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          navigator.clipboard.writeText(opt);
                          toast.success(`Copied: "${opt}"`, { autoClose: 2000, position: 'top-right' });
                        }}
                        className="pr-dropdown-copy-btn"
                        title={`Copy full ${label.toLowerCase()}: "${opt}"`}
                      >
                        <Copy width={11} height={11} />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="pr-dropdown-empty">No matching {label.toLowerCase()} found</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };




  const allowedDashboards = DASHBOARD_CONFIG.filter(db => userModels.includes(db.model));

  if (modelLoading) {
    return <SpinnerLoaders fullScreen={true} size="medium" text="Initializing Dashboards..." />;
  }

  // Sidebar link definitions
  const getSubnavLinks = () => {
    if (activeTab === "PROCUREMENT_PERFORMANCE") {
      return [
        { label: "Procurement Overview", target: "proc-perf-overview" },
        { label: "ABC Spend Analysis", target: "proc-perf-abc-analysis" },
        { label: "Spend By Category", target: "proc-perf-spend-by-category" },
        { label: "Spend by Material/Service", target: "proc-perf-material-service" },
        { label: "Spend Trend", target: "proc-perf-spend-trend" },
        { label: "Unit Price Trend", target: "proc-perf-price-trend" },
        { label: "Total Quantity Trend", target: "proc-perf-quantity-trend" },
        { label: "Outlet Spend Breakdown", target: "proc-perf-outlet-spend" },
        { label: "Spend Forecast", target: "proc-perf-spend-forecast" },
        { label: "Purchase Frequency", target: "proc-perf-lead-times" },
        { label: "Spend Anomalies", target: "proc-perf-anomalies" },
      ];
    }
    return [];
  };


  return (
    <div className="dashboard-hub-root">
      {/* Top Banner Header */}
      <header className="hub-top-header">
        <div className="hub-header-left">
          <button
            type="button"
            onClick={() => navigate('/dashboard/bots')}
            className="hub-back-btn"
            title="Back to Bots List"
          >
            <ArrowLeft width={14} height={14} />
          </button>
          <div className="hub-brand">
            <div className="hub-logo-symbol">
              <Activity className="lightning-icon" width={18} height={18} />
            </div>
            <div className="hub-title-meta">
              <h2 className="hub-main-title">
                {activeTab === "PROCUREMENT_PERFORMANCE" && "Procurement Performance Dashboard"}
              </h2>
              <span className="hub-sub-title">Enterprise Intelligent Analytics</span>
            </div>
          </div>
        </div>
        <div className="hub-header-right">
          <button
            type="button"
            onClick={() => setFiltersSidebarOpen(!filtersSidebarOpen)}
            className={`download-action-btn hub-btn-filter-toggle ${filtersSidebarOpen ? 'active' : ''}`}
          >
            <Filter width={14} height={14} />
            {filtersSidebarOpen ? 'Hide Filters' : 'Show Filters'}
          </button>
          <button
            type="button"
            onClick={() => setIsInfoModalOpen(true)}
            className="download-action-btn hub-btn-info-guide"
            title="How Filters & Dashboard Work"
          >
            <Info width={14} height={14} style={{ color: '#2563eb' }} />
            <span>Info</span>
          </button>
          <button
            type="button"
            onClick={() => setIsShowQueriesModalOpen(true)}
            className="download-action-btn hub-btn-info-guide"
            title="View Submitted Queries"
            style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
          >
            <HelpCircle width={14} height={14} style={{ color: '#2563eb' }} />
            <span>Show Queries</span>
          </button>
          <div className="hub-status-dot active"></div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="hub-main-content">
        <div className="procurement-dashboard-layout">

          {/* Dynamic Filters on the Left side */}
          {filtersSidebarOpen && (
            <aside className="proc-filter-sidebar" style={{ borderRight: '1px solid #e2e8f0', borderLeft: 'none' }}>
              <div className="proc-filter-header-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="proc-brand-title">
                  <Activity width={18} height={18} className="proc-brand-logo" />
                  <div>
                    <h4>
                      {activeTab === "PROCUREMENT_PERFORMANCE" && "Procurement Performance"}
                    </h4>
                    <span>
                      {activeTab === "PROCUREMENT_PERFORMANCE" && "Performance Intelligence"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFiltersSidebarOpen(false)}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.25rem'
                  }}
                  title="Close Filters"
                >
                  <X width={16} height={16} />
                </button>
              </div>

              <div className="sidebar-filter-scroll-wrapper">
                {/* Dashboards Switcher */}
                <div className="sidebar-filter-group">
                  <div
                    className="sidebar-group-header"
                    onClick={() => setDashboardsOpen(!dashboardsOpen)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span className="sidebar-group-label">Dashboards</span>
                    <ChevronDown
                      width={14}
                      height={14}
                      style={{ transform: dashboardsOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease', color: '#64748b' }}
                    />
                  </div>
                  {dashboardsOpen && (
                    <div className="proc-sidebar-subnav" style={{ animation: 'fadeIn 0.2s ease' }}>
                      {allowedDashboards.map((db) => {
                        const isActive = activeTab === db.id;
                        return (
                          <button
                            key={db.id}
                            type="button"
                            className={`proc-subnav-link ${isActive ? 'active' : ''}`}
                            onClick={() => setActiveTab(db.id)}
                          >
                            <span className="proc-subnav-bullet"></span>
                            <span>{db.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Dashboard Subnav Menu (Pictured in user screenshots) */}
                <div className="sidebar-filter-group">
                  <div
                    className="sidebar-group-header"
                    onClick={() => setSectionsOpen(!sectionsOpen)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span className="sidebar-group-label">Sections</span>
                    <ChevronDown
                      width={14}
                      height={14}
                      style={{ transform: sectionsOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease', color: '#64748b' }}
                    />
                  </div>
                  {sectionsOpen && (
                    <div className="proc-sidebar-subnav" style={{ animation: 'fadeIn 0.2s ease' }}>
                      {getSubnavLinks().map((link) => (
                        <button
                          key={link.target + link.label}
                          type="button"
                          className="proc-subnav-link"
                          onClick={() => scrollToSection(link.target)}
                        >
                          <span className="proc-subnav-bullet" style={{ width: '0.1875rem', height: '0.1875rem' }}></span>
                          <span>{link.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dynamic Filters depending on active tab */}
                {activeTab === "PROCUREMENT_PERFORMANCE" && (
                  <div className="sidebar-filter-group">
                    <div
                      className="sidebar-group-header"
                      onClick={() => setFiltersOpen(!filtersOpen)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none', marginBottom: '0.5rem' }}
                    >
                      <span className="sidebar-group-label">Filters</span>
                      <ChevronDown
                        width={14}
                        height={14}
                        style={{ transform: filtersOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s ease', color: '#64748b' }}
                      />
                    </div>
                    {filtersOpen && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.2s ease' }}>
                        <div className="sidebar-filter-group">
                          <span className="sidebar-group-label">Item Type</span>
                          <div className="view-by-selectors">
                            {[
                              { label: "All", value: "all" },
                              { label: "Material", value: "material" },
                              { label: "Service", value: "service" }
                            ].map((item) => (
                              <button
                                key={item.value}
                                type="button"
                                className={`view-by-btn ${filters.itemType === item.value ? 'active' : ''}`}
                                onClick={() => setFilters(prev => ({ ...prev, itemType: item.value as any }))}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="sidebar-filter-group dropdown-selectors">
                          <div className="sidebar-dropdown-item">
                            <label>Company Code</label>
                            {renderDropdown(
                              'properties', 'Company Code', filters.properties, filterOptions.properties || [],
                              () => setOpenDropdown(openDropdown === 'properties' ? null : 'properties'),
                              openDropdown === 'properties',
                              (val) => setFilters(prev => ({ ...prev, properties: prev.properties.includes(val) ? prev.properties.filter(x => x !== val) : [...prev.properties, val] }))
                            )}
                          </div>
                          <div className="sidebar-dropdown-item">
                            <label>Cost Center</label>
                            {renderDropdown(
                              'costCenters', 'Cost Centers', filters.costCenters, filterOptions.costCenters || [],
                              () => setOpenDropdown(openDropdown === 'costCenters' ? null : 'costCenters'),
                              openDropdown === 'costCenters',
                              (val) => setFilters(prev => ({ ...prev, costCenters: prev.costCenters.includes(val) ? prev.costCenters.filter(x => x !== val) : [...prev.costCenters, val] }))
                            )}
                          </div>
                          <div className="sidebar-dropdown-item">
                            <label>Supplier</label>
                            {renderDropdown(
                              'suppliers', 'Suppliers', filters.suppliers, filterOptions.suppliers,
                              () => setOpenDropdown(openDropdown === 'suppliers' ? null : 'suppliers'),
                              openDropdown === 'suppliers',
                              (val) => setFilters(prev => ({ ...prev, suppliers: prev.suppliers.includes(val) ? prev.suppliers.filter(x => x !== val) : [...prev.suppliers, val] }))
                            )}
                          </div>
                          {(filters.itemType === 'all' || filters.itemType === 'material') && (
                            <div className="sidebar-dropdown-item">
                              <label>Material Code</label>
                              {renderDropdown(
                                'materialCodes', 'Material Codes', filters.materialCodes, filterOptions.materialCodes,
                                () => setOpenDropdown(openDropdown === 'materialCodes' ? null : 'materialCodes'),
                                openDropdown === 'materialCodes',
                                (val) => setFilters(prev => ({ ...prev, materialCodes: prev.materialCodes.includes(val) ? prev.materialCodes.filter(x => x !== val) : [...prev.materialCodes, val] }))
                              )}
                            </div>
                          )}
                          {(filters.itemType === 'all' || filters.itemType === 'material') && (
                            <div className="sidebar-dropdown-item">
                              <label>Category</label>
                              {renderDropdown(
                                'materialGroups', 'Material Groups', filters.materialGroups, filterOptions.materialGroups,
                                () => setOpenDropdown(openDropdown === 'materialGroups' ? null : 'materialGroups'),
                                openDropdown === 'materialGroups',
                                (val) => setFilters(prev => ({ ...prev, materialGroups: prev.materialGroups.includes(val) ? prev.materialGroups.filter(x => x !== val) : [...prev.materialGroups, val] }))
                              )}
                            </div>
                          )}
                          {(filters.itemType === 'all' || filters.itemType === 'service') && (
                            <div className="sidebar-dropdown-item">
                              <label>Service Name</label>
                              {renderDropdown(
                                'services', 'Services', filters.services, filterOptions.services,
                                () => setOpenDropdown(openDropdown === 'services' ? null : 'services'),
                                openDropdown === 'services',
                                (val) => setFilters(prev => ({ ...prev, services: prev.services.includes(val) ? prev.services.filter(x => x !== val) : [...prev.services, val] }))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Control Action Buttons */}
                <div className="sidebar-filter-actions">
                  <button className="apply-filter-btn" onClick={handleApplyFilter} disabled={applyingFilter}>
                    {applyingFilter ? "Applying..." : "Apply Filter"}
                  </button>
                  <button className="clear-filter-btn" onClick={handleClearFilter}>
                    Clear all
                  </button>
                </div>
              </div>
            </aside>
          )}

          {/* Right Dashboard Content */}
          <section className="proc-dashboard-content">
            {false && loading ? (
              <div className="proc-loader-wrapper">
                <SpinnerLoaders size="medium" text="Syncing statistics..." fullScreen={false} />
              </div>
            ) : (
              <>
                {/* Procurement Performance Dashboard */}
                {activeTab === "PROCUREMENT_PERFORMANCE" && (
                  <div id="proc-perf-overview">
                    <div className="proc-content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 className="proc-dashboard-title" style={{ margin: 0 }}>Procurement Performance Dashboard</h3>
                        <p className="proc-dashboard-subtitle" style={{ margin: '0.25rem 0 0 0' }}>
                          {(() => {
                            const parseDate = (dStr: string) => {
                              if (!dStr) return null;
                              const d = new Date(dStr);
                              return isNaN(d.getTime()) ? null : d;
                            };
                            const fromD = parseDate(filters.fromDate);
                            const toD = parseDate(filters.toDate);
                            if (fromD && toD) {
                              const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
                              return `${fromD.toLocaleDateString('en-GB', options)} → ${toD.toLocaleDateString('en-GB', options)}`;
                            }
                            return '';
                          })()}
                        </p>
                      </div>

                      {/* Top Bar Date Filter */}
                      <div className="proc-top-date-filter-bar">
                        <div className="proc-date-input-group">
                          <label>From:</label>
                          <input
                            type="date"
                            value={filters.fromDate}
                            onChange={e => handleFromDateChange(e.target.value)}
                            className="proc-top-date-input"
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>→</span>
                        <div className="proc-date-input-group">
                          <label>To:</label>
                          <input
                            type="date"
                            value={filters.toDate}
                            onChange={e => handleToDateChange(e.target.value)}
                            className="proc-top-date-input"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="proc-kpi-grid">
                      <div className="proc-kpi-card spend">
                        <div className="kpi-meta-row">
                          <div className="kpi-icon-container"><DollarSign className="kpi-icon" /></div>
                        </div>
                        <span className="kpi-label">TOTAL SPEND</span>
                        {summaryLoading ? (
                          <div className="kpi-spinner-loader">
                            <SpinnerLoaders size="small" text="" fullScreen={false} />
                          </div>
                        ) : (
                          <h4 className="kpi-value">{perfTotalSpend}</h4>
                        )}
                        <div className="kpi-progress-bar spend"></div>
                      </div>

                      <div className="proc-kpi-card suppliers">
                        <div className="kpi-meta-row">
                          <div className="kpi-icon-container"><Users className="kpi-icon" /></div>
                        </div>
                        <span className="kpi-label">ACTIVE SUPPLIERS</span>
                        {summaryLoading ? (
                          <div className="kpi-spinner-loader">
                            <SpinnerLoaders size="small" text="" fullScreen={false} />
                          </div>
                        ) : (
                          <h4 className="kpi-value">{perfTotalSuppliersCount}</h4>
                        )}
                        <div className="kpi-progress-bar suppliers"></div>
                      </div>

                      <div className="proc-kpi-card lines">
                        <div className="kpi-meta-row">
                          <div className="kpi-icon-container"><Layers className="kpi-icon" /></div>
                        </div>
                        <span className="kpi-label">TOTAL MATERIALS</span>
                        {summaryLoading ? (
                          <div className="kpi-spinner-loader">
                            <SpinnerLoaders size="small" text="" fullScreen={false} />
                          </div>
                        ) : (
                          <h4 className="kpi-value">{perfTotalMaterialsCount.toLocaleString()}</h4>
                        )}
                        <div className="kpi-progress-bar lines"></div>
                      </div>

                      <div className="proc-kpi-card services">
                        <div className="kpi-meta-row">
                          <div className="kpi-icon-container"><Wrench className="kpi-icon" /></div>
                        </div>
                        <span className="kpi-label">TOTAL SERVICES</span>
                        {summaryLoading ? (
                          <div className="kpi-spinner-loader">
                            <SpinnerLoaders size="small" text="" fullScreen={false} />
                          </div>
                        ) : (
                          <h4 className="kpi-value">{perfTotalServicesCount.toLocaleString()}</h4>
                        )}
                        <div className="kpi-progress-bar services"></div>
                      </div>

                      <div
                        className="proc-kpi-card spend"
                        style={{ cursor: 'pointer', transition: 'transform 0.2s', ...({ '&:hover': { transform: 'scale(1.02)' } } as any) }}
                        onClick={() => {
                          setIsSavingsModalOpen(true);
                          setSavingsPage(1);
                          loadSavingsData(1);
                        }}
                        title="Click to view Savings History"
                      >
                        <div className="kpi-meta-row">
                          <div className="kpi-icon-container"><DollarSign className="kpi-icon" /></div>
                        </div>
                        <span className="kpi-label">OVERALL SAVING AMOUNT</span>
                        {summaryLoading ? (
                          <div className="kpi-spinner-loader">
                            <SpinnerLoaders size="small" text="" fullScreen={false} />
                          </div>
                        ) : (
                          <h4 className="kpi-value">{perfTotalSavingAmount}</h4>
                        )}
                        <div className="kpi-progress-bar spend"></div>
                      </div>
                    </div>

                    {/* ABC Spend Analysis Section */}
                    {(() => {
                      const filteredAbcMaterials = abcCategoryFilter === 'ALL'
                        ? abcMaterials
                        : abcMaterials.filter(item => item.category && item.category.toUpperCase() === abcCategoryFilter.toUpperCase());

                      const categoryTotalCount = abcCategoryFilter === 'ALL'
                        ? abcTotalMaterials
                        : (abcSummary.find(s => s.category === abcCategoryFilter)?.material_count || filteredAbcMaterials.length);

                      return (
                        <div id="proc-perf-abc-analysis" className="proc-chart-card full-width-card" style={{ marginBottom: '1.5rem' }}>
                          <div className="chart-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <h4 className="chart-card-title">ABC Spend Analysis (Pareto Classification)</h4>
                                <div className="abc-threshold-controls">

                                  {/* Category A */}
                                  <div className="abc-threshold-field">
                                    <label htmlFor="abc-threshold-a">
                                      A
                                    </label>

                                    <div className="abc-threshold-input-wrapper">
                                      <input
                                        id="abc-threshold-a"
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={1}
                                        placeholder="A"
                                        value={abcThresholdA}
                                        onChange={(e) =>
                                          handleAbcThresholdAChange(e.target.value)
                                        }
                                      />
                                      <span>%</span>
                                    </div>
                                  </div>

                                  <span className="abc-threshold-separator">|</span>

                                  {/* Category B */}
                                  <div className="abc-threshold-field">
                                    <label htmlFor="abc-threshold-b">
                                      B
                                    </label>

                                    <div className="abc-threshold-input-wrapper">
                                      <input
                                        id="abc-threshold-b"
                                        type="number"
                                        min={0}
                                        max={100 - (Number(abcThresholdA) || 0)}
                                        step={1}
                                        placeholder="B"
                                        value={abcThresholdB}
                                        disabled={
                                          abcThresholdA !== '' &&
                                          Number(abcThresholdA) >= 99
                                        }
                                        onChange={(e) =>
                                          handleAbcThresholdBChange(e.target.value)
                                        }
                                      />
                                      <span>%</span>
                                    </div>
                                  </div>

                                  <span className="abc-threshold-separator">|</span>

                                  {/* Category C */}
                                  <div className="abc-threshold-field abc-threshold-field-readonly">
                                    <label htmlFor="abc-threshold-c">
                                      C
                                    </label>

                                    <div className="abc-threshold-input-wrapper">
                                      <input
                                        id="abc-threshold-c"
                                        type="number"
                                        value={Math.max(0, abcThresholdC)}
                                        readOnly
                                      />
                                      <span>%</span>
                                    </div>
                                  </div>

                                  {/* Save Button */}
                                  <button
                                    type="button"
                                    className="abc-threshold-apply-btn"
                                    disabled={
                                      abcThresholdA === '' ||
                                      abcThresholdB === '' ||
                                      abcThresholdC < 0
                                    }
                                    onClick={() => {
                                      setAppliedAbcThresholdA(Number(abcThresholdA));
                                      setAppliedAbcThresholdB(Number(abcThresholdB));

                                      setAbcPage(1);
                                    }}
                                    title="Save ABC thresholds"
                                    aria-label="Save ABC thresholds"
                                  >
                                 <svg
  xmlns="http://www.w3.org/2000/svg"
  width="12"
  height="12"
  viewBox="0 0 16 16"
  fill="currentColor"
  aria-hidden="true"
>
  <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2" />
</svg>
                                  </button>

                                </div>

                              </div>
                              <span className="chart-card-subtitle">
                                Categorizes spend into{' '}
                                <strong>Category A (top {abcThresholdA}%)</strong>,{' '}
                                <strong>Category B (next {abcThresholdB}%)</strong>, and{' '}
                                <strong>Category C (remaining {abcThresholdC}%)</strong>.
                              </span>
                            </div>

                            <div className="card-download-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'end' }}>
                              {/* Filter by Item Type */}
                              <div className="abc-filter-toggle-group">
                                <button
                                  type="button"
                                  className={`view-by-btn abc-filter-btn ${abcItemType === 'all' ? 'active' : ''}`}
                                  onClick={() => { setAbcItemType('all'); setAbcPage(1); }}
                                >
                                  All Items
                                </button>
                                <button
                                  type="button"
                                  className={`view-by-btn abc-filter-btn ${abcItemType === 'material' ? 'active' : ''}`}
                                  onClick={() => { setAbcItemType('material'); setAbcPage(1); }}
                                >
                                  Materials
                                </button>
                                <button
                                  type="button"
                                  className={`view-by-btn abc-filter-btn ${abcItemType === 'service' ? 'active' : ''}`}
                                  onClick={() => { setAbcItemType('service'); setAbcPage(1); }}
                                >
                                  Services
                                </button>
                              </div>

                              <button
                                onClick={() => handleDownloadDataExcel('abc_analysis', 'abc_spend_analysis')}
                                title="Download ABC Analysis Excel"
                                className="download-action-btn"
                                disabled={downloadingExcelMap['abc_analysis']}
                              >
                                <Download width={12} height={12} /> {downloadingExcelMap['abc_analysis'] ? 'Loading...' : 'Excel'}
                              </button>
                            </div>
                          </div>

                          {/* Summary Category Cards */}
                          <div className="abc-summary-grid">
                            {['A', 'B', 'C'].map((cat) => {
                              const summaryData = abcSummary.find(s => s.category === cat);
                              const catColor = cat === 'A' ? '#10b981' : cat === 'B' ? '#f59e0b' : '#8b5cf6';
                              const catBg = cat === 'A' ? '#ecfdf5' : cat === 'B' ? '#fffbeb' : '#f5f3ff';
                              const catBorder = cat === 'A' ? '#a7f3d0' : cat === 'B' ? '#fde68a' : '#ddd6fe';
                              const labelText = cat === 'A' ? `Top ${abcThresholdA}% Spend (High Value)` : cat === 'B' ? `Next ${abcThresholdB}% Spend (Medium Value)` : `Remaining ${abcThresholdC}% Spend (Low Value)`;

                              return (
                                <div
                                  key={cat}
                                  onClick={() => {
                                    setAbcCategoryFilter(cat as any);
                                    setAbcPage(1);
                                  }}
                                  title={`Click to filter by Category ${cat}`}
                                  style={{
                                    backgroundColor: catBg,
                                    border: `1px solid ${abcCategoryFilter === cat ? catColor : catBorder}`,
                                    borderRadius: '0.625rem',
                                    padding: '1rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    boxShadow: abcCategoryFilter === cat ? `0 0 0 2px ${catColor}` : 'none',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="abc-card-badge" style={{ color: catColor, border: `1px solid ${catBorder}` }}>
                                      Category {cat}
                                    </span>
                                    <span className="abc-card-percent" style={{ color: catColor }}>
                                      {summaryData ? summaryData.percentage_spend : 0}% Spend
                                    </span>
                                  </div>
                                  <div style={{ marginTop: '0.25rem' }}>
                                    <div className="abc-card-value">
                                      {summaryData ? formatGraphValue(summaryData.total_spend) : 'AED 0'}
                                    </div>
                                    <div className="abc-card-count">
                                      {summaryData ? summaryData.material_count.toLocaleString() : 0} {abcItemType === 'service' ? 'services' : abcItemType === 'material' ? 'materials' : 'items'}
                                    </div>
                                  </div>
                                  <div className="abc-card-sublabel">
                                    {labelText}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Stacked Spend Distribution Bar */}
                          {abcSummary.length > 0 && (
                            <div className="abc-distribution-box">
                              <div className="abc-distribution-header">
                                <span>Spend Cumulative Ratio (A / B / C)</span>
                                <span>Total Spend: AED {abcTotalSpend.toLocaleString()}</span>
                              </div>
                              <div className="abc-distribution-bar-track">
                                {abcSummary.map((s) => {
                                  const catColor = s.category === 'A' ? '#10b981' : s.category === 'B' ? '#f59e0b' : '#8b5cf6';
                                  return (
                                    <div
                                      key={s.category}
                                      style={{
                                        width: `${s.percentage_spend}%`,
                                        backgroundColor: catColor,
                                        height: '100%',
                                        transition: 'width 0.3s ease'
                                      }}
                                      title={`Category ${s.category}: ${s.percentage_spend}% spend (${formatGraphValue(s.total_spend)})`}
                                    />
                                  );
                                })}
                              </div>
                              <div className="abc-category-legend-bar">
                                <span className="abc-legend-item">
                                  <span className="abc-legend-dot cat-a"></span>  Category A ({abcThresholdA}%)
                                </span>
                                <span className="abc-legend-item">
                                  <span className="abc-legend-dot cat-b"></span> Category B ({abcThresholdB}%)
                                </span>
                                <span className="abc-legend-item">
                                  <span className="abc-legend-dot cat-c"></span> Category C ({abcThresholdC}%)
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Category Filter Pills & Items Table */}
                          <div className="abc-filter-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <span className="abc-filter-label">Filter Category:</span>
                              {(['ALL', 'A', 'B', 'C'] as const).map((cat) => (
                                <button
                                  key={cat}
                                  type="button"
                                  className={`abc-cat-pill-btn ${abcCategoryFilter === cat ? 'active' : ''}`}
                                  onClick={() => {
                                    setAbcCategoryFilter(cat);
                                    setAbcPage(1);
                                  }}
                                >
                                  {cat === 'ALL' ? 'All Categories' : `Category ${cat}`}
                                </button>
                              ))}
                            </div>

                            <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                              Showing {filteredAbcMaterials.length} of {categoryTotalCount.toLocaleString()} items
                            </div>
                          </div>

                          {/* Table of Items */}
                          {abcLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                              <SpinnerLoaders size="medium" text="Loading ABC Analysis items..." fullScreen={false} />
                            </div>
                          ) : (
                            <div className="abc-table-wrapper">
                              <table className="proc-data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                  <tr className="abc-table-header-row">
                                    <th className="abc-th-cell left nowrap">Category</th>
                                    <th className="abc-th-cell left">Material / Service Name</th>
                                    <th className="abc-th-cell left">Supplier Name</th>
                                    <th className="abc-th-cell right nowrap">Total Spend (AED)</th>
                                    <th className="abc-th-cell right nowrap">Spend %</th>
                                    <th className="abc-th-cell right nowrap">Cumul. %</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredAbcMaterials.map((row, idx) => {
                                    const catBadgeBg = row.category === 'A' ? '#dcfce7' : row.category === 'B' ? '#fef3c7' : '#f3e8ff';
                                    const catBadgeText = row.category === 'A' ? '#15803d' : row.category === 'B' ? '#b45309' : '#6b21a8';
                                    const cleanMaterialName = row.material_name ? row.material_name.replace(/\s*\(\s*\)$/, '') : '';
                                    return (
                                      <tr key={idx} className="abc-tr-row">
                                        <td className="abc-td-cell left nowrap">
                                          <span
                                            className="abc-table-cat-badge"
                                            style={{
                                              backgroundColor: catBadgeBg,
                                              color: catBadgeText,
                                            }}
                                          >
                                            Cat {row.category}
                                          </span>
                                        </td>
                                        <td className="abc-td-cell left bold">
                                          {cleanMaterialName}
                                        </td>
                                        <td className="abc-td-cell left">
                                          {row.supplier_name}
                                        </td>
                                        <td className="abc-td-cell right bold nowrap">
                                          AED {row.total_spend ? row.total_spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                        </td>
                                        <td className="abc-td-cell right nowrap" style={{ color: '#2563eb', fontWeight: 500 }}>
                                          {row.percentage}%
                                        </td>
                                        <td className="abc-td-cell right nowrap" style={{ color: '#64748b', fontWeight: 400 }}>
                                          {row.cumulative_percentage}%
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {filteredAbcMaterials.length === 0 && (
                                    <tr>
                                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                        No items match the selected category filter.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Pagination Footer */}
                          <div className="abc-pagination-footer">
                            <div className="abc-pagination-info">
                              Page {abcPage} of {Math.ceil(abcTotalMaterials / abcPageSize) || 1}
                            </div>
                            <div className="abc-pagination-actions">
                              <button
                                type="button"
                                disabled={abcPage <= 1 || abcLoading}
                                className="view-by-btn abc-page-btn"
                                onClick={() => setAbcPage(prev => Math.max(1, prev - 1))}
                              >
                                Previous
                              </button>
                              <button
                                type="button"
                                disabled={abcPage * abcPageSize >= abcTotalMaterials || abcLoading}
                                className="view-by-btn abc-page-btn"
                                onClick={() => setAbcPage(prev => prev + 1)}
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Spend by Category Section */}
                    {(() => {
                      const aggregatedData = aggregateByCategory(spendByCategoryList);

                      return (
                        <div id="proc-perf-spend-by-category" className="proc-chart-card full-width-card margin-y">
                          <div className="chart-info proc-chart-header-flex">
                            <div>
                              <div className="proc-title-row">
                                <h4 className="chart-card-title">Spend by Category</h4>
                                <span className="proc-period-badge green">
                                  Category Analysis
                                </span>
                                {isFetchingMoreSpendByCategory && (
                                  <span className="proc-loading-text">
                                    Loading more...
                                  </span>
                                )}
                              </div>
                              <span className="chart-card-subtitle">
                                Overall expenditure breakdown across material categories and groups.
                              </span>
                            </div>

                            <div className="card-download-actions">
                              {/* Material / Service Tabs */}
                              <div className="proc-type-tabs-group">
                                <button
                                  type="button"
                                  className={`proc-type-tab-btn ${spendByCategoryType === 'material' ? 'active' : ''}`}
                                  onClick={() => {
                                    setSpendByCategoryType('material');
                                  }}
                                >
                                  Material
                                </button>
                                <button
                                  type="button"
                                  className={`proc-type-tab-btn ${spendByCategoryType === 'service' ? 'active' : ''}`}
                                  onClick={() => {
                                    setSpendByCategoryType('service');
                                  }}
                                >
                                  Service
                                </button>
                              </div>

                              <button onClick={() => handleDownloadChart('proc-perf-spend-by-category', 'spend_by_category')} title="Download Chart PNG" className="download-action-btn">
                                <Download width={12} height={12} /> Chart
                              </button>
                              <button
                                onClick={() => handleDownloadDataExcel('spend_by_category', 'spend_by_category')}
                                title="Download Excel"
                                className="download-action-btn"
                                disabled={downloadingExcelMap['spend_by_category']}
                              >
                                <Download width={12} height={12} /> {downloadingExcelMap['spend_by_category'] ? 'Loading...' : 'Excel'}
                              </button>
                            </div>
                          </div>

                          {spendByCategoryLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                              <SpinnerLoaders size="medium" text="Loading spend by category..." fullScreen={false} />
                            </div>
                          ) : (
                            <div className="proc-chart-flex-row">
                              {/* Chart container */}
                              <div
                                className="proc-barchart-scroll-box"
                                onScroll={(e) => {
                                  const container = e.currentTarget;
                                  if (container.scrollLeft > 20 && container.scrollWidth - container.scrollLeft - container.clientWidth < 40) {
                                    loadMoreSpendByCategory();
                                  }
                                }}
                              >
                                {aggregatedData.length > 0 ? (
                                  <div
                                    className="proc-barchart-inner-wrapper"
                                    style={{
                                      width: `${Math.max(600, aggregatedData.length * 36)}px`
                                    }}
                                  >
                                    <Bar
                                      data={{
                                        labels: aggregatedData.map(item => item.category),
                                        datasets: [
                                          {
                                            label: 'Total Spend',
                                            data: aggregatedData.map(item => item.total_spend),
                                            backgroundColor: '#3b82f6',
                                            hoverBackgroundColor: '#2563eb',
                                            borderRadius: 4,
                                            barThickness: 18,
                                          }
                                        ]
                                      }}
                                      options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        onClick: (_event: any, elements: any[]) => {
                                          if (elements.length > 0) {
                                            const elementIndex = elements[0].index;
                                            const clickedItem = aggregatedData[elementIndex];
                                            handleCategoryBarClick(clickedItem);
                                          }
                                        },
                                        onHover: (event: any, chartElement: any) => {
                                          if (event.native && event.native.target) {
                                            event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
                                          }
                                        },
                                        plugins: {
                                          legend: { display: false },
                                          tooltip: {
                                            backgroundColor: '#1e293b',
                                            callbacks: {
                                              label: (ctx: any) => ` Total Spend: AED ${ctx.raw?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                            }
                                          }
                                        },
                                        scales: {
                                          x: {
                                            grid: { display: false },
                                            ticks: {
                                              color: '#334155',
                                              font: { size: 11, weight: 600 },
                                              maxRotation: 90,
                                              minRotation: 90,
                                              autoSkip: false
                                            }
                                          },
                                          y: {
                                            grid: { color: '#f1f5f9' },
                                            title: {
                                              display: true,
                                              text: 'Total_Spend',
                                              color: '#475569',
                                              font: { size: 11, weight: 600 }
                                            },
                                            ticks: {
                                              color: '#64748b',
                                              font: { size: 10 },
                                              callback: (value: any) => {
                                                const val = Number(value);
                                                if (val >= 1000000) return `${(val / 1000000).toFixed(0)}M`;
                                                if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
                                                return `${val}`;
                                              }
                                            }
                                          }
                                        }
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="proc-barchart-empty-state">
                                    No spend data found for categories.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Spend by Material & Service Type Section */}
                    {(() => {
                      const activeList = materialServiceActiveTab === 'material' ? spendByMaterialList : spendByServiceList;
                      const activeTotal = materialServiceActiveTab === 'material' ? spendByMaterialTotalCount : spendByServiceTotalCount;

                      return (
                        <div id="proc-perf-material-service" className="proc-chart-card full-width-card margin-y">
                          <div className="chart-info proc-chart-header-flex">
                            <div>
                              <div className="proc-title-row">
                                <h4 className="chart-card-title">Spend by Material & Service Type</h4>
                                <span className="proc-period-badge blue">
                                  Category Performance
                                </span>
                              </div>
                              <span className="chart-card-subtitle">
                                Top spend breakdown categorized by specific Material item and Service descriptions.
                              </span>
                            </div>

                            <div className="card-download-actions">
                              {/* Toggle between Material and Service */}
                              <div className="proc-type-tabs-group">
                                <button
                                  type="button"
                                  className={`view-by-btn proc-toggle-pill-btn ${materialServiceActiveTab === 'material' ? 'active' : ''}`}
                                  onClick={() => { setMaterialServiceActiveTab('material'); setMaterialServicePage(1); setSpendDetailPage(1); }}
                                >
                                  Materials
                                </button>
                                <button
                                  type="button"
                                  className={`view-by-btn proc-toggle-pill-btn ${materialServiceActiveTab === 'service' ? 'active' : ''}`}
                                  onClick={() => { setMaterialServiceActiveTab('service'); setMaterialServicePage(1); setSpendDetailPage(1); }}
                                >
                                  Services
                                </button>
                              </div>

                              {/* Toggle between Chart and Table */}
                              <div className="proc-type-tabs-group">
                                <button
                                  type="button"
                                  className={`view-by-btn proc-toggle-pill-btn ${materialServiceViewMode === 'chart' ? 'active' : ''}`}
                                  onClick={() => setMaterialServiceViewMode('chart')}
                                >
                                  Chart
                                </button>
                                <button
                                  type="button"
                                  className={`view-by-btn proc-toggle-pill-btn ${materialServiceViewMode === 'table' ? 'active' : ''}`}
                                  onClick={() => setMaterialServiceViewMode('table')}
                                >
                                  Details Table
                                </button>
                              </div>

                              {materialServiceViewMode === 'chart' ? (
                                <>
                                  <button onClick={() => handleDownloadChart('proc-perf-material-service', 'spend_by_material_service')} title="Download Chart PNG" className="download-action-btn">
                                    <Download width={12} height={12} /> Chart
                                  </button>
                                  <button
                                    onClick={() => handleDownloadDataExcel('spend_by_material_service', 'spend_by_material_service')}
                                    title="Download Excel"
                                    className="download-action-btn"
                                    disabled={downloadingExcelMap['spend_by_material_service']}
                                  >
                                    <Download width={12} height={12} /> {downloadingExcelMap['spend_by_material_service'] ? 'Loading...' : 'Excel'}
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleDownloadDataExcel('spend_by_material_detail', 'detailed_spend_breakdown')}
                                  title="Download Detailed Excel"
                                  className="download-action-btn"
                                  disabled={downloadingExcelMap['spend_by_material_detail']}
                                >
                                  <Download width={12} height={12} /> {downloadingExcelMap['spend_by_material_detail'] ? 'Loading...' : 'Excel'}
                                </button>
                              )}
                            </div>
                          </div>

                          {materialServiceViewMode === 'chart' ? (
                            materialServiceLoading ? (
                              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                                <SpinnerLoaders size="medium" text="Loading spend by material & service type..." fullScreen={false} />
                              </div>
                            ) : (
                              <div style={{ height: '320px', position: 'relative', marginTop: '1rem' }}>
                                {activeList.length > 0 ? (
                                  <Bar
                                    data={{
                                      labels: activeList.map(item => item.material_name),
                                      datasets: [
                                        {
                                          label: 'Total Spend',
                                          data: activeList.map(item => item.total_spend),
                                          backgroundColor: materialServiceActiveTab === 'material' ? '#3b82f6' : '#8b5cf6',
                                          borderRadius: 4,
                                          barThickness: 14,
                                        }
                                      ]
                                    }}
                                    options={{
                                      indexAxis: 'y',
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      onClick: (_event: any, elements: any[]) => {
                                        if (elements.length > 0) {
                                          const elementIndex = elements[0].index;
                                          const clickedItem = activeList[elementIndex];
                                          handleBarRowClick(clickedItem);
                                        }
                                      },
                                      onHover: (event: any, chartElement: any) => {
                                        if (event.native && event.native.target) {
                                          event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
                                        }
                                      },
                                      plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                          backgroundColor: '#1e293b',
                                          callbacks: {
                                            label: (ctx: any) => ` Total Spend: AED ${ctx.raw?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                          }
                                        }
                                      },
                                      scales: {
                                        x: {
                                          grid: { color: '#f1f5f9' },
                                          ticks: {
                                            color: '#94a3b8',
                                            font: { size: 9 },
                                            callback: (value: any) => formatGraphValue(value as number)
                                          }
                                        },
                                        y: {
                                          grid: { display: false },
                                          ticks: {
                                            color: '#334155',
                                            font: { size: 9, weight: 600 },
                                            callback: function (this: any, val: any) {
                                              const label = this.getLabelForValue(val);
                                              return label.length > 35 ? label.substring(0, 32) + '...' : label;
                                            }
                                          }
                                        }
                                      }
                                    }}
                                  />
                                ) : (
                                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8', fontSize: '0.75rem' }}>
                                    No spend data found for {materialServiceActiveTab}s.
                                  </div>
                                )}
                              </div>
                            )
                          ) : (
                            spendDetailLoading ? (
                              <div className="proc-loading-spinner-container">
                                <SpinnerLoaders size="medium" text="Loading detailed spend items..." fullScreen={false} />
                              </div>
                            ) : (
                              <div className="proc-detail-table-wrapper">
                                <table className="proc-data-table">
                                  <thead>
                                    <tr className="abc-table-header-row">
                                      <th className="proc-detail-th left">Supplier Name</th>
                                      <th className="proc-detail-th left">Material / Service Name</th>
                                      <th className="proc-detail-th left">Type</th>
                                      <th className="proc-detail-th right">Total Quantity</th>
                                      <th className="proc-detail-th right">Unit Price (AED)</th>
                                      <th className="proc-detail-th right">Total Spend (AED)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {spendDetailList.map((item, idx) => (
                                      <tr key={idx} className="proc-detail-tr">
                                        <td className="proc-detail-td left bold">{item.supplier_name}</td>
                                        <td className="proc-detail-td left">{item.material_name}</td>
                                        <td className="proc-detail-td left">
                                          <span className={`status-badge proc-detail-type-badge ${item.item_type === 'service' ? 'purple' : 'blue'}`}>
                                            {item.item_type}
                                          </span>
                                        </td>
                                        <td className="proc-detail-td right">{item.total_quantity?.toLocaleString()}</td>
                                        <td className="proc-detail-td right">
                                          {item.unit_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="proc-detail-td right bold-heavy">
                                          {item.total_spend?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    ))}
                                    {spendDetailList.length === 0 && (
                                      <tr>
                                        <td colSpan={6} className="abc-table-empty">
                                          No detailed spend records found.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )
                          )}

                          {/* Pagination Footer */}
                          <div className="abc-pagination-footer">
                            <div className="abc-pagination-info">
                              {materialServiceViewMode === 'chart' ? (
                                `Page ${materialServicePage} of ${Math.ceil(activeTotal / materialServicePageSize) || 1}`
                              ) : (
                                `Page ${spendDetailPage} of ${Math.ceil(spendDetailTotalCount / spendDetailPageSize) || 1}`
                              )}
                            </div>
                            <div className="abc-pagination-actions">
                              {materialServiceViewMode === 'chart' ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={materialServicePage <= 1 || materialServiceLoading}
                                    className="view-by-btn abc-page-btn"
                                    onClick={() => setMaterialServicePage(prev => Math.max(1, prev - 1))}
                                  >
                                    Previous
                                  </button>
                                  <button
                                    type="button"
                                    disabled={materialServicePage * materialServicePageSize >= activeTotal || materialServiceLoading}
                                    className="view-by-btn abc-page-btn"
                                    onClick={() => setMaterialServicePage(prev => prev + 1)}
                                  >
                                    Next
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={spendDetailPage <= 1 || spendDetailLoading}
                                    className="view-by-btn abc-page-btn"
                                    onClick={() => setSpendDetailPage(prev => Math.max(1, prev - 1))}
                                  >
                                    Previous
                                  </button>
                                  <button
                                    type="button"
                                    disabled={spendDetailPage * spendDetailPageSize >= spendDetailTotalCount || spendDetailLoading}
                                    className="view-by-btn abc-page-btn"
                                    onClick={() => setSpendDetailPage(prev => prev + 1)}
                                  >
                                    Next
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Spend by Supplier Section */}
                    <div id="proc-perf-spend-by-supplier" className="proc-chart-card supplier-card">
                      <div className="chart-info proc-chart-header-compact">
                        <div>
                          <h4 className="chart-card-title">Spend by Supplier</h4>
                          <span className="chart-card-subtitle">Top suppliers by total spend</span>
                        </div>
                        <div className="card-download-actions">
                          {/* Material / Service Toggle */}
                          <div className="proc-type-tabs-group">
                            <button
                              type="button"
                              className={`proc-type-tab-btn ${spendBySupplierItemType === 'material' ? 'active' : ''}`}
                              onClick={() => {
                                setSpendBySupplierItemType('material');
                                setSpendBySupplierPage(1);
                              }}
                            >
                              Material
                            </button>
                            <button
                              type="button"
                              className={`proc-type-tab-btn ${spendBySupplierItemType === 'service' ? 'active' : ''}`}
                              onClick={() => {
                                setSpendBySupplierItemType('service');
                                setSpendBySupplierPage(1);
                              }}
                            >
                              Service
                            </button>
                          </div>

                          <button onClick={() => handleDownloadChart('proc-perf-spend-by-supplier-chart', 'spend_by_supplier')} title="Download Chart PNG" className="download-action-btn">
                            <Download width={12} height={12} /> Chart
                          </button>
                        </div>
                      </div>

                      {spendBySupplierLoading ? (
                        <div className="proc-chart-spinner-box">
                          <SpinnerLoaders size="medium" text="Loading spend by supplier..." fullScreen={false} />
                        </div>
                      ) : (
                        <div id="proc-perf-spend-by-supplier-chart" className="proc-chart-viewport-sm">
                          {spendBySupplierList.length > 0 ? (
                            <Bar
                              data={{
                                labels: spendBySupplierList.map(item => item.supplier),
                                datasets: [
                                  {
                                    label: 'Total Spend',
                                    data: spendBySupplierList.map(item => item.total_spend),
                                    backgroundColor: '#059669',
                                    borderRadius: 4,
                                    barThickness: 14,
                                  }
                                ]
                              }}
                              options={{
                                indexAxis: 'y',
                                responsive: true,
                                maintainAspectRatio: false,
                                onClick: (_event: any, elements: any[]) => {
                                  if (elements.length > 0) {
                                    const elementIndex = elements[0].index;
                                    const clickedItem = spendBySupplierList[elementIndex];
                                    handleSupplierBarClick(clickedItem);
                                  }
                                },
                                onHover: (event: any, chartElement: any) => {
                                  if (event.native && event.native.target) {
                                    event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
                                  }
                                },
                                plugins: {
                                  legend: { display: false },
                                  tooltip: {
                                    backgroundColor: '#1e293b',
                                    callbacks: {
                                      label: (ctx: any) => ` Total Spend: AED ${ctx.raw?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    }
                                  }
                                },
                                scales: {
                                  x: {
                                    grid: { color: '#f1f5f9' },
                                    ticks: {
                                      color: '#94a3b8',
                                      font: { size: 9 },
                                      callback: (value: any) => formatGraphValue(value as number)
                                    }
                                  },
                                  y: {
                                    grid: { display: false },
                                    ticks: {
                                      color: '#334155',
                                      font: { size: 9, weight: 600 },
                                      callback: function (this: any, val: any) {
                                        const label = this.getLabelForValue(val);
                                        return label.length > 35 ? label.substring(0, 32) + '...' : label;
                                      }
                                    }
                                  }
                                }
                              }}
                            />
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8', fontSize: '0.75rem' }}>
                              No spend data found for suppliers.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Pagination Footer */}
                      <div className="abc-pagination-footer">
                        <div className="abc-pagination-info">
                          Page {spendBySupplierPage} of {Math.ceil(spendBySupplierTotalCount / spendBySupplierPageSize) || 1}
                        </div>
                        <div className="abc-pagination-actions">
                          <button
                            type="button"
                            disabled={spendBySupplierPage <= 1 || spendBySupplierLoading}
                            className="view-by-btn abc-page-btn"
                            onClick={() => setSpendBySupplierPage(prev => Math.max(1, prev - 1))}
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            disabled={spendBySupplierPage * spendBySupplierPageSize >= spendBySupplierTotalCount || spendBySupplierLoading}
                            className="view-by-btn abc-page-btn"
                            onClick={() => setSpendBySupplierPage(prev => prev + 1)}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="proc-charts-grid proc-trend-grid">
                      {trendCardsOrder.map((cardKey: string, index: number) => {
                        const isFullWidth = index === trendCardsOrder.length - 1 && index % 2 === 0;
                        if (cardKey === 'spend_trend') {
                          return (
                            <div
                              key="spend_trend"
                              id="proc-perf-spend-trend"
                              className={`proc-chart-card ${isFullWidth ? 'full-width-card' : ''} ${dragOverCardKey === 'spend_trend' ? 'drag-over' : ''}`}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', 'spend_trend');
                                setDraggedCardKey('spend_trend');
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverCardKey('spend_trend');
                              }}
                              onDragLeave={() => setDragOverCardKey(null)}
                              onDrop={() => handleDropTrendCard('spend_trend')}
                              style={{
                                gridColumn: isFullWidth ? '1 / -1' : 'span 1',
                                opacity: draggedCardKey === 'spend_trend' ? 0.4 : 1
                              }}
                            >
                              <div className="chart-info proc-chart-header-compact">
                                <div className="proc-title-row">
                                  <span title="Drag to reorder chart"><GripVertical width={16} height={16} className="proc-drag-handle-icon" /></span>
                                  <div>
                                    <h4 className="chart-card-title">Spend Trend</h4>
                                    <span className="chart-card-subtitle">Total monthly spend</span>
                                  </div>
                                </div>
                                <div className="card-download-actions">
                                  <button onClick={() => handleDownloadChart('proc-perf-spend-trend', 'spend_trend_performance')} title="Download Chart PNG" className="download-action-btn">
                                    <Download width={12} height={12} /> Chart
                                  </button>
                                  <button onClick={() => handleDownloadDataExcel('spend_trend', 'spend_trend_performance')} title="Download Data Excel" className="download-action-btn" disabled={downloadingExcelMap['spend_trend']}>
                                    <Download width={12} height={12} /> {downloadingExcelMap['spend_trend'] ? 'Loading...' : 'Excel'}
                                  </button>
                                </div>
                              </div>
                              {trendLoading ? (
                                <div className="proc-trend-spinner-box">
                                  <SpinnerLoaders size="small" text="Loading spend trend..." fullScreen={false} />
                                </div>
                              ) : (
                                <div className="svg-chart-container proc-trend-chart-viewport">
                                  <Line
                                    data={{
                                      labels: perfSpendTrend.labels,
                                      datasets: [{
                                        label: 'Spend',
                                        data: perfSpendTrend.values,
                                        borderColor: '#10b981',
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                        fill: true,
                                        tension: 0.35,
                                        borderWidth: 2.5,
                                        pointBackgroundColor: '#10b981',
                                        pointBorderColor: '#ffffff',
                                        pointBorderWidth: 1.5,
                                        pointRadius: 4.5,
                                        pointHoverRadius: 6.5,
                                      }]
                                    }}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      onClick: (_event: any, elements: any[]) => {
                                        if (elements && elements.length > 0) {
                                          const elementIndex = elements[0].index;
                                          const clickedMonth = perfSpendTrend.labels[elementIndex];
                                          if (clickedMonth) {
                                            handleSpendTrendClick(clickedMonth);
                                          }
                                        }
                                      },
                                      onHover: (event: any, chartElement: any) => {
                                        if (event.native && event.native.target) {
                                          event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
                                        }
                                      },
                                      plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                          backgroundColor: '#1e293b',
                                          titleColor: '#ffffff',
                                          bodyColor: '#ffffff',
                                          borderColor: '#e2e8f0',
                                          borderWidth: 1,
                                          padding: 10,
                                          displayColors: false,
                                          callbacks: {
                                            label: (ctx: any) => {
                                              const spendVal = formatGraphValue(ctx.raw as number);
                                              const idx = ctx.dataIndex;
                                              const changePct = perfSpendTrend.changePct?.[idx];
                                              if (changePct !== undefined && changePct !== null) {
                                                const prefix = changePct > 0 ? '+' : '';
                                                return [` Spend: ${spendVal}`, ` MoM Change: ${prefix}${changePct}%`];
                                              }
                                              return ` Spend: ${spendVal}`;
                                            }
                                          }
                                        }
                                      },
                                      scales: {
                                        x: {
                                          grid: { display: false },
                                          ticks: {
                                            color: '#94a3b8',
                                            font: { size: 9, weight: 500 },
                                            maxRotation: 0,
                                            autoSkip: true,
                                            maxTicksLimit: 12
                                          }
                                        },
                                        y: {
                                          grid: { color: '#f1f5f9' },
                                          ticks: {
                                            color: '#94a3b8',
                                            font: { size: 9 },
                                            callback: (value: any) => formatGraphValue(value as number)
                                          }
                                        }
                                      }
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        }

                        if (cardKey === 'quantity_trend') {
                          return (
                            <div
                              key="quantity_trend"
                              id="proc-perf-quantity-trend"
                              className={`proc-chart-card ${isFullWidth ? 'full-width-card' : ''} ${dragOverCardKey === 'quantity_trend' ? 'drag-over' : ''}`}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', 'quantity_trend');
                                setDraggedCardKey('quantity_trend');
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverCardKey('quantity_trend');
                              }}
                              onDragLeave={() => setDragOverCardKey(null)}
                              onDrop={() => handleDropTrendCard('quantity_trend')}
                              style={{
                                gridColumn: isFullWidth ? '1 / -1' : 'span 1',
                                opacity: draggedCardKey === 'quantity_trend' ? 0.4 : 1
                              }}
                            >
                              <div className="chart-info proc-chart-header-compact">
                                <div className="proc-title-row">
                                  <span title="Drag to reorder chart"><GripVertical width={16} height={16} className="proc-drag-handle-icon" /></span>
                                  <div>
                                    <h4 className="chart-card-title">Total Quantity Trend</h4>
                                    <span className="chart-card-subtitle">Monthly purchase quantity trend</span>
                                  </div>
                                </div>
                                <div className="card-download-actions">
                                  <button onClick={() => handleDownloadChart('proc-perf-quantity-trend', 'quantity_trend_performance')} title="Download Chart PNG" className="download-action-btn">
                                    <Download width={12} height={12} /> Chart
                                  </button>
                                  <button onClick={() => handleDownloadDataExcel('quantity_trend', 'quantity_trend_performance')} title="Download Data Excel" className="download-action-btn" disabled={downloadingExcelMap['quantity_trend']}>
                                    <Download width={12} height={12} /> {downloadingExcelMap['quantity_trend'] ? 'Loading...' : 'Excel'}
                                  </button>
                                </div>
                              </div>
                              {trendLoading ? (
                                <div className="proc-trend-spinner-box">
                                  <SpinnerLoaders size="small" text="Loading quantity trend..." fullScreen={false} />
                                </div>
                              ) : (
                                <div className="svg-chart-container proc-trend-chart-viewport">
                                  <Line
                                    data={{
                                      labels: perfQuantityTrend.labels,
                                      datasets: [{
                                        label: 'Total Quantity',
                                        data: perfQuantityTrend.values,
                                        borderColor: '#3b82f6',
                                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                        fill: true,
                                        tension: 0.35,
                                        borderWidth: 2.5,
                                        pointBackgroundColor: '#3b82f6',
                                        pointBorderColor: '#ffffff',
                                        pointBorderWidth: 1.5,
                                        pointRadius: 4.5,
                                        pointHoverRadius: 6.5,
                                      }]
                                    }}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      onClick: (_event: any, elements: any[]) => {
                                        if (elements && elements.length > 0) {
                                          const elementIndex = elements[0].index;
                                          const clickedMonth = perfQuantityTrend.labels[elementIndex];
                                          if (clickedMonth) {
                                            handleQuantityTrendClick(clickedMonth);
                                          }
                                        }
                                      },
                                      onHover: (event: any, chartElement: any) => {
                                        if (event.native && event.native.target) {
                                          event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
                                        }
                                      },
                                      plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                          backgroundColor: '#1e293b',
                                          titleColor: '#ffffff',
                                          bodyColor: '#ffffff',
                                          borderColor: '#e2e8f0',
                                          borderWidth: 1,
                                          padding: 10,
                                          displayColors: false,
                                          callbacks: {
                                            label: (ctx: any) => ` Quantity: ${Number(ctx.raw).toLocaleString()}`
                                          }
                                        }
                                      },
                                      scales: {
                                        x: {
                                          grid: { display: false },
                                          ticks: {
                                            color: '#94a3b8',
                                            font: { size: 9, weight: 500 },
                                            maxRotation: 0,
                                            autoSkip: true,
                                            maxTicksLimit: 12
                                          }
                                        },
                                        y: {
                                          grid: { color: '#f1f5f9' },
                                          ticks: {
                                            color: '#94a3b8',
                                            font: { size: 9 },
                                            callback: (value) => Number(value).toLocaleString()
                                          }
                                        }
                                      }
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        }

                        if (cardKey === 'price_trend') {
                          return (
                            <div
                              key="price_trend"
                              id="proc-perf-price-trend"
                              className={`proc-chart-card ${isFullWidth ? 'full-width-card' : ''} ${dragOverCardKey === 'price_trend' ? 'drag-over' : ''}`}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', 'price_trend');
                                setDraggedCardKey('price_trend');
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverCardKey('price_trend');
                              }}
                              onDragLeave={() => setDragOverCardKey(null)}
                              onDrop={() => handleDropTrendCard('price_trend')}
                              style={{
                                gridColumn: isFullWidth ? '1 / -1' : 'span 1',
                                opacity: draggedCardKey === 'price_trend' ? 0.4 : 1
                              }}
                            >
                              <div className="chart-info proc-chart-header-compact">
                                <div className="proc-title-row">
                                  <span title="Drag to reorder chart"><GripVertical width={16} height={16} className="proc-drag-handle-icon" /></span>
                                  <div>
                                    <h4 className="chart-card-title">Average Unit Price Trend</h4>
                                  </div>
                                </div>
                                <div className="card-download-actions">
                                  <div className="proc-trend-baseline-controls">
                                    <span className="proc-trend-baseline-label">Baseline:</span>
                                    <select
                                      value={baselineMonth}
                                      onChange={(e) => setBaselineMonth(e.target.value)}
                                      className="proc-trend-baseline-select"
                                    >
                                      <option value="">None</option>
                                      {perfUnitPriceTrend.labels.map((lbl: string) => (
                                        <option key={lbl} value={lbl}>{lbl}</option>
                                      ))}
                                    </select>
                                    <span className="proc-trend-baseline-label" style={{ marginLeft: '0.375rem' }}>Target:</span>
                                    <select
                                      value={targetMonth}
                                      onChange={(e) => setTargetMonth(e.target.value)}
                                      className="proc-trend-baseline-select"
                                    >
                                      <option value="">None</option>
                                      {perfUnitPriceTrend.labels.map((lbl: string) => (
                                        <option key={lbl} value={lbl}>{lbl}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <button onClick={() => handleDownloadChart('proc-perf-price-trend', 'unit_price_trend')} title="Download Chart PNG" className="download-action-btn">
                                    <Download width={12} height={12} /> Chart
                                  </button>
                                  <button onClick={() => handleDownloadDataExcel('unit_price_trend', 'unit_price_trend')} title="Download Data Excel" className="download-action-btn" disabled={downloadingExcelMap['unit_price_trend']}>
                                    <Download width={12} height={12} /> {downloadingExcelMap['unit_price_trend'] ? 'Loading...' : 'Excel'}
                                  </button>
                                </div>
                              </div>
                              {trendLoading || unitPriceLoading ? (
                                <div className="proc-trend-spinner-box">
                                  <SpinnerLoaders size="small" text="Loading unit price trend..." fullScreen={false} />
                                </div>
                              ) : (
                                <div className="svg-chart-container proc-trend-chart-viewport">
                                  <Line
                                    data={{
                                      labels: perfUnitPriceTrend.labels,
                                      datasets: [
                                        {
                                          label: 'Avg Unit Price',
                                          data: perfUnitPriceTrend.values,
                                          borderColor: '#8b5cf6',
                                          backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                          fill: true,
                                          tension: 0.35,
                                          borderWidth: 2.5,
                                          pointBackgroundColor: '#8b5cf6',
                                          pointBorderColor: '#ffffff',
                                          pointBorderWidth: 1.5,
                                          pointRadius: 4.5,
                                          pointHoverRadius: 6.5,
                                        },
                                        ...(baselineMonth && perfTargetMonthUnitPrice !== null && perfTargetMonthUnitPrice !== undefined && perfTargetMonthUnitPrice > 0 ? [{
                                          label: `Baseline (${baselineMonth})`,
                                          data: Array(perfUnitPriceTrend.labels.length).fill(perfTargetMonthUnitPrice),
                                          borderColor: '#ef4444',
                                          borderWidth: 1.5,
                                          borderDash: [5, 5],
                                          pointRadius: 0,
                                          pointHoverRadius: 0,
                                          fill: false,
                                          tension: 0,
                                        }] : [])
                                      ]
                                    }}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      onClick: (_event: any, elements: any[]) => {
                                        if (elements && elements.length > 0) {
                                          const clickedIndex = elements[0].index;
                                          const monthLabel = perfUnitPriceTrend.labels[clickedIndex];
                                          if (monthLabel) {
                                            setUnitPricePointSelectedMonth(monthLabel);
                                            setUnitPricePointPage(1);
                                            setIsUnitPricePointModalOpen(true);
                                            loadUnitPricePointDetails(monthLabel, 1);
                                          }
                                        }
                                      },
                                      plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                          backgroundColor: '#1e293b',
                                          titleColor: '#ffffff',
                                          bodyColor: '#ffffff',
                                          borderColor: '#e2e8f0',
                                          borderWidth: 1,
                                          padding: 10,
                                          displayColors: false,
                                          callbacks: {
                                            label: (ctx: any) => ` Price: ${formatGraphValue(ctx.raw as number)}`
                                          }
                                        }
                                      },
                                      scales: {
                                        x: {
                                          grid: { display: false },
                                          ticks: {
                                            color: '#94a3b8',
                                            font: { size: 9, weight: 500 },
                                            maxRotation: 0,
                                            autoSkip: true,
                                            maxTicksLimit: 12
                                          }
                                        },
                                        y: {
                                          grid: { color: '#f1f5f9' },
                                          ticks: {
                                            color: '#94a3b8',
                                            font: { size: 9 },
                                            callback: (value) => formatGraphValue(value as number)
                                          }
                                        }
                                      }
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>



                    {/* Outlet Spend & Variance Section */}
                    <div id="proc-perf-outlet-spend" style={{ marginTop: '2rem', marginBottom: '1.5rem' }}>

                      {/* Grid for Spend By Outlet and Outlet Spend Variance charts */}
                      <div className="proc-charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

                        {/* 1. Spend by Outlet Bar Graph (left card) */}
                        <div className="proc-chart-card" style={{ height: 'auto', minHeight: '440px', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                          <div className="chart-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                              <h4 className="chart-card-title">Spend by Outlet</h4>
                              <span className="chart-card-subtitle">Total expenditure per property/outlet</span>
                            </div>
                            <div className="card-download-actions">
                              <button
                                onClick={() => handleDownloadChart('outlet-spend-bar-chart', 'spend_by_outlet')}
                                title="Download Chart PNG"
                                className="download-action-btn"
                              >
                                <Download width={12} height={12} /> Chart
                              </button>
                            </div>
                          </div>

                          {spendByOutletLoading ? (
                            <div className="proc-chart-spinner-box">
                              <SpinnerLoaders size="small" text="Loading spend by outlet..." fullScreen={false} />
                            </div>
                          ) : spendByOutletList.length === 0 ? (
                            <div className="proc-barchart-empty-state" style={{ flex: 1, height: '300px' }}>
                              No spend data found.
                            </div>
                          ) : (
                            <div id="outlet-spend-bar-chart" className="proc-chart-viewport-sm">
                              <Bar
                                data={{
                                  labels: spendByOutletList.map(item => item.outlet),
                                  datasets: [
                                    {
                                      label: 'Total Spend',
                                      data: spendByOutletList.map(item => item.total_spend),
                                      backgroundColor: '#3b82f6',
                                      borderRadius: 4,
                                      barThickness: 12,
                                    }
                                  ]
                                }}
                                options={{
                                  indexAxis: 'y',
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  onClick: (_event: any, elements: any[]) => {
                                    if (elements.length > 0) {
                                      const elementIndex = elements[0].index;
                                      const clickedItem = spendByOutletList[elementIndex];
                                      handleOutletBarClick(clickedItem);
                                    }
                                  },
                                  onHover: (event: any, chartElement: any) => {
                                    if (event.native && event.native.target) {
                                      event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
                                    }
                                  },
                                  plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                      backgroundColor: '#1e293b',
                                      callbacks: {
                                        label: (ctx: any) => ` Spend: AED ${(ctx.raw as number).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                      }
                                    }
                                  },
                                  scales: {
                                    x: {
                                      grid: { color: '#f8fafc' },
                                      ticks: {
                                        color: '#94a3b8',
                                        font: { size: 9 },
                                        callback: (value: any) => formatGraphValue(value as number)
                                      }
                                    },
                                    y: {
                                      grid: { display: false },
                                      ticks: {
                                        color: '#334155',
                                        font: { size: 8, weight: 600 },
                                        callback: function (this: any, val: any) {
                                          const label = this.getLabelForValue(val);
                                          return label.length > 20 ? label.substring(0, 17) + '...' : label;
                                        }
                                      }
                                    }
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* 2. Outlet Spend Variance Analysis (right card) */}
                        <div className="proc-chart-card supplier-card">
                          <div className="chart-info proc-chart-header-compact">
                            <div>
                              <h4 className="chart-card-title">Outlet Spend Variance Analysis</h4>
                              <span className="chart-card-subtitle">
                                {varianceChartMode === 'variance_aed' && "Property spend variance compared against overall portfolio average (AED)"}
                                {varianceChartMode === 'variance_percent' && "Property spend variance percentage compared against overall portfolio average (%)"}
                                {varianceChartMode === 'spend_vs_avg' && "Property spend compared against overall portfolio average"}
                              </span>
                            </div>
                            <div className="card-download-actions">
                              <div className="proc-variance-mode-group">
                                {(['variance_aed', 'variance_percent', 'spend_vs_avg'] as const).map(mode => (
                                  <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setVarianceChartMode(mode)}
                                    className={`proc-variance-mode-btn ${varianceChartMode === mode ? 'active' : ''}`}
                                  >
                                    {mode === 'variance_aed' ? 'Variance (AED)' : mode === 'variance_percent' ? 'Variance (%)' : 'Spend vs Avg'}
                                  </button>
                                ))}
                              </div>
                              <button
                                onClick={() => handleDownloadChart('outlet-spend-variance-chart', 'outlet_spend_variance')}
                                title="Download Chart PNG"
                                className="download-action-btn"
                              >
                                <Download width={12} height={12} /> Chart
                              </button>
                            </div>
                          </div>

                          {/* Outlet Summary Stat Cards inside the right panel */}
                          <div className="proc-outlet-stat-grid">
                            <div className="proc-outlet-stat-box blue">
                              <span className="proc-outlet-stat-label blue">
                                TOTAL OUTLETS
                              </span>
                              <div className="proc-outlet-stat-val">
                                {outletSummary.total_outlets}
                              </div>
                            </div>

                            <div className="proc-outlet-stat-box green">
                              <span className="proc-outlet-stat-label green">
                                AVERAGE OUTLET SPEND
                              </span>
                              <div className="proc-outlet-stat-val">
                                {formatGraphValue(outletSummary.average_spend)}
                              </div>
                            </div>
                          </div>

                          {outletLoading ? (
                            <div className="proc-chart-spinner-box-sm">
                              <SpinnerLoaders size="small" text="Loading variance..." fullScreen={false} />
                            </div>
                          ) : outletVarianceList.length === 0 ? (
                            <div className="proc-barchart-empty-state" style={{ flex: 1, height: '230px' }}>
                              No variance data found.
                            </div>
                          ) : (
                            <div id="outlet-spend-variance-chart" className="proc-chart-viewport-xs">
                              <Bar
                                data={{
                                  labels: outletVarianceList.map(item => item.outlet),
                                  datasets: [
                                    {
                                      label: varianceChartMode === 'variance_aed' ? 'Variance (AED)' : varianceChartMode === 'variance_percent' ? 'Variance (%)' : 'Total Spend',
                                      data: outletVarianceList.map(item => {
                                        if (varianceChartMode === 'variance_aed') {
                                          return item.variance;
                                        } else if (varianceChartMode === 'variance_percent') {
                                          return item.avg_spend ? (item.variance / item.avg_spend) * 100 : 0;
                                        } else {
                                          return item.total_spend;
                                        }
                                      }),
                                      backgroundColor: outletVarianceList.map(item => {
                                        if (varianceChartMode === 'spend_vs_avg') {
                                          return item.status === 'High Spend Outlier' ? '#ef4444' : '#3b82f6';
                                        }
                                        if (item.variance > 0) {
                                          return item.status === 'High Spend Outlier' ? '#ef4444' : '#f97316';
                                        }
                                        return '#10b981';
                                      }),
                                      borderRadius: 4,
                                      barThickness: 12,
                                    }
                                  ]
                                }}
                                plugins={[
                                  {
                                    id: 'verticalLine',
                                    afterDraw: (chart) => {
                                      if (varianceChartMode !== 'spend_vs_avg') return;
                                      const ctx = chart.ctx;
                                      const xScale = chart.scales.x;
                                      const yScale = chart.scales.y;
                                      const avgValue = outletSummary.average_spend;
                                      const xPos = xScale.getPixelForValue(avgValue);

                                      ctx.save();
                                      ctx.beginPath();
                                      ctx.strokeStyle = '#2563eb';
                                      ctx.lineWidth = 1.5;
                                      ctx.setLineDash([4, 4]);
                                      ctx.moveTo(xPos, yScale.top);
                                      ctx.lineTo(xPos, yScale.bottom);
                                      ctx.stroke();

                                      ctx.fillStyle = '#2563eb';
                                      ctx.font = 'bold 9px Inter, sans-serif';
                                      ctx.fillText('AVG', xPos + 4, yScale.top + 12);
                                      ctx.restore();
                                    }
                                  }
                                ]}
                                options={{
                                  indexAxis: 'y',
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                      backgroundColor: '#1e293b',
                                      callbacks: {
                                        label: (ctx: any) => {
                                          const item = outletVarianceList[ctx.dataIndex];
                                          const variancePercent = item.avg_spend ? (item.variance / item.avg_spend) * 100 : 0;
                                          const varianceFormatted = item.variance > 0
                                            ? `+${formatVarianceValue(item.variance)} (+${variancePercent.toFixed(1)}%)`
                                            : `${formatVarianceValue(item.variance)} (${variancePercent.toFixed(1)}%)`;
                                          return [
                                            ` Spend: ${formatVarianceValue(item.total_spend)}`,
                                            ` Average: ${formatVarianceValue(item.avg_spend)}`,
                                            ` Variance vs Avg: ${varianceFormatted}`,
                                            ` Status: ${item.status}`
                                          ];
                                        }
                                      }
                                    }
                                  },
                                  scales: {
                                    x: {
                                      grid: { color: '#f8fafc' },
                                      ticks: {
                                        color: '#94a3b8',
                                        font: { size: 9 },
                                        callback: (value: any) => {
                                          if (varianceChartMode === 'variance_percent') {
                                            return `${value > 0 ? '+' : ''}${value}%`;
                                          }
                                          return formatVarianceValue(value as number);
                                        }
                                      }
                                    },
                                    y: {
                                      grid: { display: false },
                                      ticks: {
                                        color: '#334155',
                                        font: { size: 8, weight: 600 },
                                        callback: function (this: any, val: any) {
                                          const label = this.getLabelForValue(val);
                                          return label.length > 20 ? label.substring(0, 17) + '...' : label;
                                        }
                                      }
                                    }
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Outlet Spend Details Table moved into Modal */}
                    </div>

                    {/* Spend Forecast & Predictive Analytics Section */}
                    <div id="proc-perf-spend-forecast" className="proc-chart-card full-width-card" style={{ marginTop: '2rem', marginBottom: '1.5rem' }}>
                      <div className="chart-info proc-chart-header-compact">
                        <div>
                          <h4 className="chart-card-title">Spend Forecast & Predictive Analytics</h4>
                          <span className="chart-card-subtitle">
                            Historical trend analysis and projected spend forecast
                          </span>
                        </div>

                        <div className="proc-forecast-controls-group">
                          {/* Forecast Horizon Selector */}
                          <div className="proc-forecast-step-box">
                            <span className="proc-forecast-step-label">Steps:</span>
                            {[3, 6, 12].map(stepVal => (
                              <button
                                key={stepVal}
                                type="button"
                                className={`proc-forecast-step-btn ${forecastSteps === stepVal ? 'active' : ''}`}
                                onClick={() => setForecastSteps(stepVal)}
                              >
                                {stepVal} Mo
                              </button>
                            ))}
                          </div>

                          <div className="card-download-actions">
                            <button
                              onClick={() => handleDownloadChart('proc-perf-spend-forecast', 'spend_forecast')}
                              title="Download Chart PNG"
                              className="download-action-btn"
                            >
                              <Download width={12} height={12} /> Chart
                            </button>
                            <button
                              onClick={() => handleDownloadDataExcel('forecast', 'spend_forecast')}
                              title="Download Data Excel"
                              className="download-action-btn"
                              disabled={downloadingExcelMap['forecast']}
                            >
                              <Download width={12} height={12} /> {downloadingExcelMap['forecast'] ? 'Loading...' : 'Excel'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Forecast Summary Stat Badges */}
                      {(() => {
                        const lastHist = forecastHistorical[forecastHistorical.length - 1];
                        const firstPred = forecastPredicted[0];
                        const totalPredSpend = forecastPredicted.reduce((sum, item) => sum + item.total_spend, 0);

                        return (
                          <div className="proc-forecast-stat-grid">
                            <div className="proc-forecast-stat-card blue">
                              <span className="proc-forecast-stat-label blue">
                                LATEST HISTORICAL ({lastHist?.month || 'N/A'})
                              </span>
                              <div className="proc-forecast-stat-value">
                                {lastHist ? formatGraphValue(lastHist.total_spend) : 'AED 0'}
                              </div>
                            </div>

                            <div className="proc-forecast-stat-card green">
                              <span className="proc-forecast-stat-label green">
                                NEXT MONTH PROJECTED ({firstPred?.month || 'N/A'})
                              </span>
                              <div className="proc-forecast-stat-value">
                                {firstPred ? formatGraphValue(firstPred.total_spend) : 'AED 0'}
                              </div>
                            </div>

                            <div className="proc-forecast-stat-card purple">
                              <span className="proc-forecast-stat-label purple">
                                TOTAL {forecastSteps}-MONTH FORECAST
                              </span>
                              <div className="proc-forecast-stat-value">
                                {formatGraphValue(totalPredSpend)}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Line Chart comparing Historical vs Forecasted */}
                      {forecastLoading ? (
                        <div className="proc-chart-spinner-box">
                          <SpinnerLoaders size="medium" text="Generating spend forecast..." fullScreen={false} />
                        </div>
                      ) : (
                        <div className="proc-chart-spinner-box" style={{ height: '300px', marginTop: '0.5rem' }}>
                          <Line
                            data={{
                              labels: [
                                ...forecastHistorical.map(h => h.month),
                                ...forecastPredicted.map(f => f.month)
                              ],
                              datasets: [
                                {
                                  label: 'Historical Spend',
                                  data: [
                                    ...forecastHistorical.map(h => h.total_spend),
                                    ...Array(forecastPredicted.length).fill(null)
                                  ],
                                  borderColor: '#2563eb',
                                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                                  fill: true,
                                  tension: 0.35,
                                  borderWidth: 2.5,
                                  pointBackgroundColor: '#2563eb',
                                  pointBorderColor: '#ffffff',
                                  pointBorderWidth: 1.5,
                                  pointRadius: 4.5,
                                },
                                {
                                  label: 'Forecasted Spend',
                                  data: [
                                    ...Array(Math.max(0, forecastHistorical.length - 1)).fill(null),
                                    forecastHistorical[forecastHistorical.length - 1]?.total_spend || null,
                                    ...forecastPredicted.map(f => f.total_spend)
                                  ],
                                  borderColor: '#8b5cf6',
                                  backgroundColor: 'rgba(139, 92, 246, 0.08)',
                                  borderDash: [6, 6],
                                  fill: true,
                                  tension: 0.35,
                                  borderWidth: 2.5,
                                  pointBackgroundColor: '#8b5cf6',
                                  pointBorderColor: '#ffffff',
                                  pointBorderWidth: 1.5,
                                  pointRadius: 5,
                                }
                              ]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  position: 'top',
                                  align: 'end',
                                  labels: {
                                    boxWidth: 12,
                                    font: { size: 11, weight: 600 },
                                    color: '#475569'
                                  }
                                },
                                tooltip: {
                                  backgroundColor: '#1e293b',
                                  titleColor: '#ffffff',
                                  bodyColor: '#ffffff',
                                  borderColor: '#e2e8f0',
                                  borderWidth: 1,
                                  padding: 10,
                                  callbacks: {
                                    label: (ctx: any) => {
                                      const val = ctx.raw as number;
                                      if (val === null || val === undefined) return '';
                                      return ` ${ctx.dataset.label}: ${formatGraphValue(val)}`;
                                    }
                                  }
                                }
                              },
                              scales: {
                                x: {
                                  grid: { color: '#f1f5f9' },
                                  ticks: {
                                    color: '#64748b',
                                    font: { size: 9, weight: 500 },
                                    maxRotation: 0,
                                    autoSkip: true
                                  }
                                },
                                y: {
                                  grid: { color: '#f1f5f9' },
                                  ticks: {
                                    color: '#64748b',
                                    font: { size: 9 },
                                    callback: (value: any) => formatGraphValue(value as number)
                                  }
                                }
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Purchase Frequency & Spend Anomalies Row */}
                    <div className="proc-charts-grid proc-freq-anomalies-grid">

                      {/* Material Purchase Frequency Section */}
                      <div id="proc-perf-lead-times" className="proc-suppliers-section proc-freq-card">
                        <div className="section-head-info proc-chart-header-compact">
                          <div>
                            <h4 className="proc-suppliers-heading">Material Purchase Frequency</h4>
                            <p className="proc-suppliers-subheading">Average days between Goods Receipt Notes (GRNs) and order frequency</p>
                            <div className="chart-view-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => setLeadTimeViewMode('chart')}
                                className={`tab-toggle-btn proc-freq-tab-toggle ${leadTimeViewMode === 'chart' ? 'active' : ''}`}
                              >
                                Chart View
                              </button>
                              <button
                                onClick={() => setLeadTimeViewMode('table')}
                                className={`tab-toggle-btn proc-freq-tab-toggle ${leadTimeViewMode === 'table' ? 'active' : ''}`}
                              >
                                Table View
                              </button>

                              {/* Searchable Material Code Dropdown Selector */}
                              <div ref={pfDropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
                                <div
                                  onClick={() => setIsPfMaterialDropdownOpen(prev => !prev)}
                                  className="proc-material-dropdown-trigger"
                                  title="Click to search and filter Material Codes"
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                    <Search width={12} height={12} style={{ color: '#64748b', flexShrink: 0 }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {pfMaterialCodeFilter === 'all' ? 'All Material Codes' : pfMaterialCodeFilter}
                                    </span>
                                  </div>
                                  <ChevronDown width={12} height={12} style={{ color: '#64748b', flexShrink: 0 }} />
                                </div>

                                {isPfMaterialDropdownOpen && (
                                  <div className="proc-material-dropdown-menu">
                                    {/* Search Input Field */}
                                    <div className="proc-material-search-header">
                                      <Search width={12} height={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                      <input
                                        type="text"
                                        placeholder="Search Material Code..."
                                        value={pfMaterialSearchQuery}
                                        onChange={(e) => setPfMaterialSearchQuery(e.target.value)}
                                        autoFocus
                                        className="proc-material-search-input"
                                      />
                                      {pfMaterialSearchQuery && (
                                        <X
                                          width={12}
                                          height={12}
                                          style={{ color: '#94a3b8', cursor: 'pointer', flexShrink: 0 }}
                                          onClick={() => setPfMaterialSearchQuery('')}
                                        />
                                      )}
                                    </div>

                                    {/* Options List */}
                                    <div className="proc-material-options-list">
                                      <div
                                        onClick={() => {
                                          setPfMaterialCodeFilter('all');
                                          setPurchaseFrequencyPage(1);
                                          setIsPfMaterialDropdownOpen(false);
                                        }}
                                        className={`proc-material-option-item ${pfMaterialCodeFilter === 'all' ? 'active' : ''}`}
                                      >
                                        All Material Codes
                                      </div>
                                      {pfMaterialSearching ? (
                                        <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <SpinnerLoaders size="small" text="" fullScreen={false} />
                                        </div>
                                      ) : pfMaterialOptions.length > 0 ? (
                                        pfMaterialOptions.map((mat) => (
                                          <div
                                            key={mat}
                                            onClick={() => {
                                              setPfMaterialCodeFilter(mat);
                                              setPurchaseFrequencyPage(1);
                                              setIsPfMaterialDropdownOpen(false);
                                            }}
                                            style={{
                                              padding: '0.375rem 0.75rem',
                                              fontSize: '0.75rem',
                                              color: pfMaterialCodeFilter === mat ? '#2563eb' : '#334155',
                                              fontWeight: pfMaterialCodeFilter === mat ? 600 : 400,
                                              backgroundColor: pfMaterialCodeFilter === mat ? '#eff6ff' : 'transparent',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              gap: '0.5rem',
                                              minWidth: 0,
                                              boxSizing: 'border-box'
                                            }}
                                            title={mat}
                                          >
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={mat}>
                                              {mat}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(mat);
                                                toast.success(`Copied material code: "${mat}"`, { autoClose: 2000, position: 'top-right' });
                                              }}
                                              style={{
                                                border: 'none',
                                                background: 'none',
                                                padding: '0.125rem 0.25rem',
                                                borderRadius: '0.25rem',
                                                color: '#94a3b8',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                              }}
                                              title={`Copy "${mat}"`}
                                              onMouseEnter={(e) => {
                                                e.currentTarget.style.color = '#2563eb';
                                                e.currentTarget.style.backgroundColor = '#dbeafe';
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.color = '#94a3b8';
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                              }}
                                            >
                                              <Copy width={11} height={11} />
                                            </button>
                                          </div>
                                        ))
                                      ) : (
                                        <div style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                                          No material codes found
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="card-download-actions">
                            <button onClick={() => handleDownloadDataExcel('purchase_frequency', 'purchase_frequency')} title="Download Data Excel" className="download-action-btn" disabled={downloadingExcelMap['purchase_frequency']}>
                              <Download width={12} height={12} /> {downloadingExcelMap['purchase_frequency'] ? 'Loading...' : 'Excel'}
                            </button>
                          </div>
                        </div>
                        {purchaseLoading ? (
                          <div className="proc-chart-spinner-box" style={{ flex: 1, minHeight: '320px' }}>
                            <SpinnerLoaders size="small" text="Loading purchase frequency..." fullScreen={false} />
                          </div>
                        ) : leadTimeViewMode === 'chart' ? (
                          <div className="proc-chart-viewport-sm" style={{ flex: 1, minHeight: '320px', maxHeight: '420px' }}>
                            {purchaseFrequencyList.length === 0 ? (
                              <div className="proc-barchart-empty-state" style={{ height: '100%' }}>
                                ℹ️ No purchase frequency data found for selected filters.
                              </div>
                            ) : (
                              <Bar
                                data={{
                                  labels: purchaseFrequencyList.map(item => item.material_code),
                                  datasets: [{
                                    label: 'Avg Days Between GRNs',
                                    data: purchaseFrequencyList.map(item => item.avg_days_between_grns),
                                    backgroundColor: '#10b981',
                                    borderRadius: 4,
                                    barThickness: 12,
                                  }]
                                }}
                                options={{
                                  indexAxis: 'y',
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  onClick: (_event: any, elements: any[]) => {
                                    if (elements.length > 0) {
                                      const index = elements[0].index;
                                      const clickedItem = purchaseFrequencyList[index];
                                      if (clickedItem && clickedItem.material_code) {
                                        loadFrequencyMonthlyAnalysis(clickedItem.material_code);
                                      }
                                    }
                                  },
                                  onHover: (event: any, chartElement: any) => {
                                    if (event.native && event.native.target) {
                                      event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
                                    }
                                  },
                                  plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                      backgroundColor: '#1e293b',
                                      callbacks: {
                                        label: (ctx: any) => {
                                          const item = purchaseFrequencyList[ctx.dataIndex];
                                          return ` Avg Days: ${ctx.raw} | Frequency: ${item?.frequency || 'N/A'}`;
                                        }
                                      }
                                    }
                                  },
                                  scales: {
                                    x: {
                                      grid: { color: '#f8fafc' },
                                      ticks: {
                                        color: '#94a3b8',
                                        font: { size: 9 },
                                        callback: (value: any) => `${value} Days`
                                      }
                                    },
                                    y: {
                                      grid: { display: false },
                                      ticks: {
                                        color: '#334155',
                                        font: { size: 9, weight: 600 },
                                        callback: function (this: any, val: any) {
                                          const label = this.getLabelForValue(val);
                                          return label.length > 20 ? label.substring(0, 17) + '...' : label;
                                        }
                                      }
                                    }
                                  }
                                }}
                              />
                            )}
                          </div>
                        ) : (
                          <div className="proc-table-container proc-detail-table-wrapper" style={{ flex: 1, minHeight: '320px', maxHeight: '420px', marginTop: '0.75rem' }}>
                            <table className="proc-data-table">
                              <thead>
                                <tr>
                                  <th>Supplier</th>
                                  <th>Material Code</th>
                                  <th>Avg Days</th>
                                  <th>Frequency</th>
                                </tr>
                              </thead>
                              <tbody>
                                {purchaseFrequencyList.map((item, idx) => (
                                  <tr key={idx}>
                                    <td style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }}>{item.supplier}</td>
                                    <td
                                      className="supplier-name-cell"
                                      style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                                      onClick={() => loadFrequencyMonthlyAnalysis(item.material_code)}
                                      title="Click to view monthly purchase frequency breakdown"
                                    >
                                      {item.material_code}
                                    </td>
                                    <td>
                                      <span className="status-badge green">{item.avg_days_between_grns} Days</span>
                                    </td>
                                    <td>
                                      <span className={`status-badge ${item.frequency === 'Monthly' ? 'blue' : item.frequency === 'Weekly' ? 'green' : 'yellow'}`}>
                                        {item.frequency}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {purchaseFrequencyList.length === 0 && (
                                  <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                      No purchase frequency records found.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Pagination Footer */}
                        <div className="abc-pagination-footer">
                          <div className="abc-pagination-info">
                            Page {purchaseFrequencyPage} of {Math.ceil(purchaseFrequencyTotalCount / purchaseFrequencyPageSize) || 1}
                          </div>
                          <div className="abc-pagination-actions">
                            <button
                              type="button"
                              disabled={purchaseFrequencyPage <= 1 || purchaseLoading}
                              className="view-by-btn abc-page-btn"
                              onClick={() => setPurchaseFrequencyPage(prev => Math.max(1, prev - 1))}
                            >
                              Prev
                            </button>
                            <button
                              type="button"
                              disabled={purchaseFrequencyPage * purchaseFrequencyPageSize >= purchaseFrequencyTotalCount || purchaseLoading}
                              className="view-by-btn abc-page-btn"
                              onClick={() => setPurchaseFrequencyPage(prev => prev + 1)}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Spend Anomalies Feed (Material Variance) */}
                      {(() => {
                        const materialAnomaliesFeed = materialVarianceList.map((item) => {
                          const months = Array.isArray(item.months) ? item.months : (item.months ? [item.months] : []);
                          const anomalyStatuses = Array.isArray(item.anomaly) ? item.anomaly : [];
                          const curSpends = Array.isArray(item.current_spend) ? item.current_spend : [];
                          const histAvgs = Array.isArray(item.historical_average) ? item.historical_average : [];
                          const variances = Array.isArray(item.variance) ? item.variance : [];

                          const isAnomaly = anomalyStatuses.some(a => a && a !== 'Normal');
                          const flaggedCount = anomalyStatuses.filter(a => a && a !== 'Normal').length;

                          const totalCurrentSpend = curSpends.reduce((a, b) => a + (b || 0), 0);
                          const avgHistorical = histAvgs.length ? (histAvgs.reduce((a, b) => a + (b || 0), 0) / histAvgs.length) : 0;

                          let maxVar = 0;
                          if (variances.length > 0) {
                            maxVar = variances.reduce((prev, curr) => Math.abs(curr) > Math.abs(prev) ? curr : prev, 0);
                          }

                          let statusLabel = 'Normal';
                          const anomalyIdx = anomalyStatuses.findIndex(a => a && a !== 'Normal');
                          if (anomalyIdx !== -1) {
                            statusLabel = anomalyStatuses[anomalyIdx];
                          } else if (maxVar > 30) {
                            statusLabel = 'High Spend';
                          } else if (maxVar < -30) {
                            statusLabel = 'Low Spend';
                          }

                          return {
                            supplier: item.supplier,
                            materialCode: item.material_code,
                            months,
                            currentSpend: totalCurrentSpend,
                            historicalAvg: avgHistorical,
                            variance: maxVar,
                            status: statusLabel,
                            isAnomaly,
                            flaggedCount,
                            rawItem: item
                          };
                        }).filter(Boolean);

                        const flaggedAnomalies = materialAnomaliesFeed.filter(x => x.isAnomaly);
                        const displayAnomaliesList = flaggedAnomalies.length > 0 ? flaggedAnomalies : materialAnomaliesFeed.slice(0, 10);

                        return (
                          <div id="proc-perf-anomalies" className="proc-chart-card anomaly-feed-container">
                            <div className="chart-info anomaly-feed-header">
                              <div>
                                <h4 className="chart-card-title anomaly-feed-title-flex">
                                  <span>Spend Anomalies Feed</span>
                                  {flaggedAnomalies.length > 0 && (
                                    <span className="status-badge red kraljic-badge-sm">
                                      {flaggedAnomalies.length} Flagged
                                    </span>
                                  )}
                                </h4>
                                <span className="chart-card-subtitle">Identified spend deviations exceeding 30% from historical average</span>
                              </div>
                              <div className="card-download-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <select
                                  value={materialVarianceStatusFilter}
                                  onChange={(e) => {
                                    setMaterialVarianceStatusFilter(e.target.value);
                                    setMaterialVariancePage(1);
                                  }}
                                  style={{
                                    padding: '0.25rem 0.625rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: '0.375rem',
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: '#ffffff',
                                    color: '#0f172a',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    height: '28px'
                                  }}
                                  title="Filter by Status"
                                >
                                  <option value="all">All Statuses</option>
                                  <option value="High Spend">High Spend</option>
                                  <option value="Low Spend">Low Spend</option>
                                  <option value="Normal">Normal</option>
                                </select>
                                <button onClick={() => handleDownloadDataExcel('anomalies', 'material_variance')} title="Download Data Excel" className="download-action-btn" disabled={downloadingExcelMap['anomalies']}>
                                  <Download width={12} height={12} /> {downloadingExcelMap['anomalies'] ? 'Loading...' : 'Excel'}
                                </button>
                              </div>
                            </div>
                            {anomaliesLoading ? (
                              <div className="proc-chart-spinner-box" style={{ flex: 1, minHeight: '320px' }}>
                                <SpinnerLoaders size="small" text="Loading anomalies..." fullScreen={false} />
                              </div>
                            ) : (
                              <div className="anomaly-feed-list">
                                {displayAnomaliesList.map((item, idx) => {
                                  const rawVar = item.variance !== undefined && item.variance !== null && !isNaN(item.variance)
                                    ? item.variance
                                    : (item.historicalAvg > 0 ? ((item.currentSpend - item.historicalAvg) / item.historicalAvg) * 100 : 0);

                                  const isHigh = item.status === 'High Spend' || (item.status === 'Normal' && rawVar > 30);
                                  const isLow = item.status === 'Low Spend' || (item.status === 'Normal' && rawVar < -30);

                                  let cardBg = '#f8fafc';
                                  let cardBorder = '#e2e8f0';
                                  let titleColor = '#2d3748';
                                  let badgeBg = '#edf2f7';
                                  let badgeText = '#4a5568';
                                  let statusLabel = item.status;
                                  let currentBarColor = '#94a3b8';

                                  if (isHigh) {
                                    cardBg = '#fff5f5';
                                    cardBorder = '#fed7d7';
                                    titleColor = '#9b2c2c';

                                    badgeBg = '#fed7d7';
                                    badgeText = '#9b2c2c';
                                    statusLabel = 'High Spend';
                                    currentBarColor = '#ef4444';
                                  } else if (isLow) {
                                    cardBg = '#f0fdf4';
                                    cardBorder = '#bbf7d0';
                                    titleColor = '#166534';

                                    badgeBg = '#dcfce7';
                                    badgeText = '#166534';
                                    statusLabel = 'Low Spend';
                                    currentBarColor = '#22c55e';
                                  }

                                  const cleanMaterialCode = item.materialCode ? item.materialCode.replace(/\s*\(\s*\)$/, '') : '';
                                  const formattedCurrentSpend = item.currentSpend !== undefined ? item.currentSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
                                  const formattedHistoricalAvg = item.historicalAvg !== undefined ? item.historicalAvg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
                                  const formattedVarianceText = rawVar > 0 ? `+${rawVar.toFixed(2)}% Variance` : `${rawVar.toFixed(2)}% Variance`;

                                  return (
                                    <div
                                      key={idx}
                                      onClick={() => handleAnomalyCardClick(item)}
                                      title="Click to view material variance analysis & reasons for all months"
                                      className="anomaly-feed-item-card"
                                      style={{
                                        backgroundColor: cardBg,
                                        border: `1px solid ${cardBorder}`,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <div className="anomaly-feed-item-header">
                                        <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                                          <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: titleColor, wordBreak: 'break-word', display: 'block' }}>
                                            {cleanMaterialCode}
                                          </span>
                                          <div style={{ fontSize: '0.6875rem', color: '#718096', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                                            <span>Supplier: <strong style={{ color: '#4a5568' }}>{item.supplier}</strong></span>
                                            {item.months && item.months.length > 0 && (
                                              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                {item.months.map((m: string) => (
                                                  <span key={m} className="anomaly-month-badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '0.25rem', padding: '0.0625rem 0.375rem', fontSize: '0.625rem', fontWeight: 600 }}>
                                                    📅 {m}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                          <span style={{
                                            fontSize: '0.625rem',
                                            fontWeight: 700,
                                            padding: '0.125rem 0.375rem',
                                            borderRadius: '0.25rem',
                                            backgroundColor: badgeBg,
                                            color: badgeText,
                                            textTransform: 'uppercase'
                                          }}>
                                            {statusLabel}
                                          </span>
                                          <span style={{
                                            fontSize: '0.625rem',
                                            fontWeight: 700,
                                            padding: '0.125rem 0.375rem',
                                            borderRadius: '0.25rem',
                                            backgroundColor: isHigh ? '#fed7d7' : isLow ? '#dcfce7' : '#edf2f7',
                                            color: isHigh ? '#9b2c2c' : isLow ? '#166534' : '#4a5568'
                                          }}>
                                            {formattedVarianceText}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Comparative bar representation */}
                                      <div className="proc-anomaly-comparative-bars">
                                        {/* Historical average bar */}
                                        <div>
                                          <div className="proc-anomaly-bar-meta">
                                            <span>HISTORICAL AVERAGE</span>
                                            <span>AED {formattedHistoricalAvg}</span>
                                          </div>
                                          <div className="proc-anomaly-bar-track">
                                            <div className="proc-anomaly-bar-fill" style={{ width: `${(item.historicalAvg / Math.max(item.currentSpend, item.historicalAvg, 0.01)) * 100}%`, backgroundColor: '#94a3b8' }}></div>
                                          </div>
                                        </div>

                                        {/* Current spend bar */}
                                        <div>
                                          <div className="proc-anomaly-bar-meta current" style={{ color: titleColor }}>
                                            <span>CURRENT SPEND</span>
                                            <span>AED {formattedCurrentSpend}</span>
                                          </div>
                                          <div className="proc-anomaly-bar-track">
                                            <div className="proc-anomaly-bar-fill" style={{ width: `${(item.currentSpend / Math.max(item.currentSpend, item.historicalAvg, 0.01)) * 100}%`, backgroundColor: currentBarColor }}></div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Driver Reasons Click Indicator */}
                                      <div style={{ marginTop: '0.5rem', paddingTop: '0.375rem', borderTop: '1px solid #e2e8f0', fontSize: '0.6875rem', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span>💡 Click to view monthly driver analysis & reasons ({item.months.length} Months)</span>
                                        <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>View Details &rarr;</span>
                                      </div>
                                    </div>
                                  );
                                })}
                                {displayAnomaliesList.length === 0 && (
                                  <div className="proc-barchart-empty-state" style={{ padding: '2.5rem' }}>
                                    ✅ No anomalies detected for the selected period and filters.
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Pagination Footer */}
                            <div className="abc-pagination-footer">
                              <div className="abc-pagination-info">
                                Page {materialVariancePage} of {Math.ceil(materialVarianceTotalCount / materialVariancePageSize) || 1}
                              </div>
                              <div className="abc-pagination-actions">
                                <button
                                  type="button"
                                  disabled={materialVariancePage <= 1 || anomaliesLoading}
                                  className="view-by-btn abc-page-btn"
                                  onClick={() => setMaterialVariancePage(prev => Math.max(1, prev - 1))}
                                >
                                  Previous
                                </button>
                                <button
                                  type="button"
                                  disabled={materialVariancePage * materialVariancePageSize >= materialVarianceTotalCount || anomaliesLoading}
                                  className="view-by-btn"
                                  style={{ padding: '0.375rem 0.75rem', border: '1px solid #cbd5e1', fontSize: '0.6875rem' }}
                                  onClick={() => setMaterialVariancePage(prev => prev + 1)}
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Unit Price Outlier Analysis Feed Card */}
                      <div id="proc-perf-outlier-feed" className="proc-chart-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                        <div className="chart-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h4 className="chart-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span>Unit Price Outlier Analysis</span>
                              {unitPriceOutlierFeed.some(item =>
                                item.standard_z_score?.outlier_flags?.some(Boolean) ||
                                item.modified_z_score_mad?.outlier_flags?.some(Boolean) ||
                                item.iqr?.outlier_flags?.some(Boolean) ||
                                item.rolling_mean_std?.outlier_flags?.some(Boolean)
                              ) && (
                                  <span className="status-badge red" style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem' }}>
                                    {unitPriceOutlierFeed.filter(item =>
                                      item.standard_z_score?.outlier_flags?.some(Boolean) ||
                                      item.modified_z_score_mad?.outlier_flags?.some(Boolean) ||
                                      item.iqr?.outlier_flags?.some(Boolean) ||
                                      item.rolling_mean_std?.outlier_flags?.some(Boolean)
                                    ).length} Flagged
                                  </span>
                                )}
                            </h4>
                            <span className="chart-card-subtitle">Statistical unit price outlier analysis across 4 analytical models</span>
                          </div>
                          <div className="card-download-actions">
                            {/* Checkbox for Anomaly Filter */}
                            <label style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: unitPriceOutlierOnlyAnomalies ? '#dc2626' : '#475569',
                              backgroundColor: unitPriceOutlierOnlyAnomalies ? '#fef2f2' : '#ffffff',
                              border: `1px solid ${unitPriceOutlierOnlyAnomalies ? '#fca5a5' : '#cbd5e1'}`,
                              borderRadius: '0.375rem',
                              padding: '0.125rem 0.5rem',
                              height: '28px',
                              cursor: 'pointer',
                              userSelect: 'none',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.2s ease'
                            }}>
                              <input
                                type="checkbox"
                                checked={unitPriceOutlierOnlyAnomalies}
                                onChange={(e) => {
                                  setUnitPriceOutlierOnlyAnomalies(e.target.checked);
                                  setUnitPriceOutlierPage(1);
                                }}
                                style={{ accentColor: '#dc2626', width: '14px', height: '14px', cursor: 'pointer' }}
                              />
                              <span>Anomalies Only</span>
                            </label>

                            <button onClick={() => handleDownloadDataExcel('anomalies', 'unit_price_outlier')} title="Download Data Excel" className="download-action-btn" disabled={downloadingExcelMap['anomalies']} style={{ height: '28px', padding: '0 0.625rem' }}>
                              <Download width={12} height={12} /> {downloadingExcelMap['anomalies'] ? 'Loading...' : 'Excel'}
                            </button>
                          </div>
                        </div>

                        {unitPriceOutlierLoading ? (
                          <div className="proc-chart-spinner-box" style={{ height: '250px' }}>
                            <SpinnerLoaders size="small" text="Loading outlier analysis feed..." fullScreen={false} />
                          </div>
                        ) : (
                          <div className="anomaly-feed-list" style={{ minHeight: '320px', maxHeight: '420px', paddingRight: '0.5rem', scrollbarGutter: 'stable' }}>
                            {unitPriceOutlierFeed.map((item: any, idx: number) => {
                              const zFlagged = item.standard_z_score?.outlier_flags?.some(Boolean);
                              const madFlagged = item.modified_z_score_mad?.outlier_flags?.some(Boolean);
                              const iqrFlagged = item.iqr?.outlier_flags?.some(Boolean);
                              const rollingFlagged = item.rolling_mean_std?.outlier_flags?.some(Boolean);
                              const flaggedCount = [zFlagged, madFlagged, iqrFlagged, rollingFlagged].filter(Boolean).length;
                              const isOutlier = flaggedCount > 0 || item.is_anomaly === true || item.anomaly === true || item.status === 'anomaly' || item.status === 'outlier';

                              if (unitPriceOutlierOnlyAnomalies && !isOutlier) {
                                return null;
                              }

                              let cardBg = '#f8fafc';
                              let cardBorder = '#e2e8f0';
                              let titleColor = '#2d3748';
                              let badgeBg = '#edf2f7';
                              let badgeText = '#4a5568';

                              if (isOutlier) {
                                cardBg = '#fff5f5';
                                cardBorder = '#fed7d7';
                                titleColor = '#9b2c2c';
                                badgeBg = '#fed7d7';
                                badgeText = '#9b2c2c';
                              }

                              const cleanMaterialCode = item.material_name ? item.material_name.replace(/\s*\(\s*\)$/, '') : '';

                              return (
                                <div
                                  key={idx}
                                  onClick={() => handleOutlierCardClick(item)}
                                  title="Click to view 4-model statistical unit price outlier analysis"
                                  className="anomaly-feed-item-card"
                                  style={{
                                    backgroundColor: cardBg,
                                    border: `1px solid ${cardBorder}`
                                  }}
                                >
                                  <div className="anomaly-feed-item-header">
                                    <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                                      <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: titleColor, wordBreak: 'break-word', display: 'block' }}>
                                        {cleanMaterialCode}
                                      </span>
                                      <div style={{ fontSize: '0.6875rem', color: '#718096', marginTop: '0.125rem' }}>
                                        Supplier: <strong style={{ color: '#4a5568' }}>{item.supplier_name || 'N/A'}</strong>
                                      </div>
                                    </div>
                                    {isOutlier && (
                                      <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                                        <span style={{
                                          fontSize: '0.625rem',
                                          fontWeight: 700,
                                          padding: '0.125rem 0.375rem',
                                          borderRadius: '0.25rem',
                                          backgroundColor: badgeBg,
                                          color: badgeText,
                                          textTransform: 'uppercase'
                                        }}>
                                          🚨 {flaggedCount > 0 ? `${flaggedCount} Outlier Models` : 'Anomaly'}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Monthly Unit Price Badges */}
                                  {Array.isArray(item.months) && item.months.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                                      <div className="proc-anomaly-bar-meta">
                                        <span>MONTHLY UNIT PRICES</span>
                                        <span>
                                          {item.months.slice(-3).map((m: string, mIdx: number) => {
                                            const p = item.unit_prices?.[item.months.length - 3 + mIdx];
                                            return `${m}: AED ${p !== undefined ? p : '-'}`;
                                          }).join(' | ')}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {unitPriceOutlierFeed.length === 0 && (
                              <div className="proc-barchart-empty-state" style={{ padding: '2.5rem' }}>
                                ✅ No unit price outliers detected for the selected period and filters.
                              </div>
                            )}
                          </div>
                        )}

                        {/* Pagination Footer */}
                        <div className="abc-pagination-footer">
                          <div className="abc-pagination-info">
                            Page {unitPriceOutlierPage} of {Math.ceil(unitPriceOutlierTotalCount / unitPriceOutlierPageSize) || 1}
                          </div>
                          <div className="abc-pagination-actions">
                            <button
                              type="button"
                              disabled={unitPriceOutlierPage <= 1 || unitPriceOutlierLoading}
                              className="view-by-btn abc-page-btn"
                              onClick={() => setUnitPriceOutlierPage(prev => Math.max(1, prev - 1))}
                            >
                              Previous
                            </button>
                            <button
                              type="button"
                              disabled={unitPriceOutlierPage * unitPriceOutlierPageSize >= unitPriceOutlierTotalCount || unitPriceOutlierLoading}
                              className="view-by-btn abc-page-btn"
                              onClick={() => setUnitPriceOutlierPage(prev => prev + 1)}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Kraljic Matrix Analysis 2x2 Heat Map Card */}
                      <div id="proc-perf-kraljic-matrix" className="proc-chart-card kraljic-widget-container">
                        <div className="chart-info kraljic-widget-header">
                          <div>
                            <h4 className="chart-card-title kraljic-title-flex">
                              <span>Kraljic Strategic Portfolio Matrix</span>
                              <span className="status-badge blue kraljic-badge-sm">
                                2x2 Heat Map Analysis
                              </span>
                            </h4>
                            <span className="chart-card-subtitle">Strategic material segmentation: Financial Impact (Spend) vs. Supply Risk (Supplier Count)</span>
                          </div>
                          <div className="card-download-actions kraljic-actions-row">
                            {/* Supplier Filter Dropdown */}
                            <div className="kraljic-filter-group">
                              <span className="kraljic-filter-label">Supplier:</span>
                              <select
                                value={kraljicSupplierFilter}
                                onChange={(e) => setKraljicSupplierFilter(e.target.value)}
                                className={`kraljic-supplier-select ${kraljicSupplierFilter ? 'active' : ''}`}
                              >
                                <option value="">All Suppliers</option>
                                {Array.from(new Set([
                                  ...initialSuppliers,
                                  ...(kraljicData?.kraljic_matrix?.bottleneck_items?.items || []).flatMap((it: any) => it.supplier_names || it.suppliers || []),
                                  ...(kraljicData?.kraljic_matrix?.strategic_items?.items || []).flatMap((it: any) => it.supplier_names || it.suppliers || []),
                                  ...(kraljicData?.kraljic_matrix?.leverage_items?.items || []).flatMap((it: any) => it.supplier_names || it.suppliers || []),
                                  ...(kraljicData?.kraljic_matrix?.non_critical_items?.items || []).flatMap((it: any) => it.supplier_names || it.suppliers || [])
                                ])).filter(Boolean).sort().map((supName: string) => (
                                  <option key={supName} value={supName}>{supName}</option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedKraljicQuadrant('all');
                                setIsKraljicModalOpen(true);
                              }}
                              className="view-by-btn kraljic-view-btn"
                            >
                              🔍 View Detailed Matrix
                            </button>
                          </div>
                        </div>

                        {kraljicLoading ? (
                          <div className="proc-chart-spinner-box" style={{ height: '180px' }}>
                            <SpinnerLoaders size="small" text="Loading Kraljic Matrix analysis..." fullScreen={false} />
                          </div>
                        ) : kraljicData && kraljicData.kraljic_matrix ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '0.5rem' }}>
                            {/* KPI Metrics Header Bar */}
                            <div className="kraljic-metrics-bar">
                              <div className="kraljic-metric-col">
                                <span className="kraljic-metric-title">Analyzed Materials</span>
                                <strong className="kraljic-metric-val-dark">
                                  {kraljicData.calculation_methodology?.total_analyzed_materials?.toLocaleString() || 0}
                                </strong>
                              </div>
                              <div className="kraljic-v-divider" />
                              <div className="kraljic-metric-col">
                                <span className="kraljic-metric-title">Grand Total Spend</span>
                                <strong className="kraljic-metric-val-blue">
                                  AED {Math.round(kraljicData.calculation_methodology?.grand_total_spend_value || 0).toLocaleString()}
                                </strong>
                              </div>
                              <div className="kraljic-v-divider" />
                              <div className="kraljic-metric-col">
                                <span className="kraljic-metric-title">Median Spend Cutoff</span>
                                <span className="kraljic-metric-val-sm">
                                  AED {kraljicData.thresholds?.median_spend_cutoff?.toLocaleString() || 0}
                                </span>
                              </div>
                              <div className="kraljic-v-divider" />
                              <div className="kraljic-metric-col">
                                <span className="kraljic-metric-title">Supplier Risk Cutoff</span>
                                <span className="kraljic-metric-val-sm">
                                  ≤ {kraljicData.thresholds?.median_supplier_count || 1} Supplier(s)
                                </span>
                              </div>
                            </div>

                            {/* Methodology & Quality Assumption Information Banner */}
                            {kraljicData.calculation_methodology && (
                              <div className="kraljic-methodology-banner">
                                <div className="kraljic-methodology-row">
                                  <span>📐</span>
                                  <span>Methodology:</span>
                                  <span className="kraljic-methodology-val">{kraljicData.calculation_methodology.total_spend_formula}</span>
                                </div>
                                <div className="kraljic-quality-row">
                                  <span>ℹ️</span>
                                  <span>Quality Assumption:</span>
                                  <span className="kraljic-methodology-val">{kraljicData.calculation_methodology.quality_assumption}</span>
                                </div>
                              </div>
                            )}

                            {/* 2x2 Heat Map Grid */}
                            <div className="kraljic-heatmap-grid">

                              {/* Quadrant 1 (Top Left): BOTTLENECK ITEMS */}
                              {(() => {
                                const qData = kraljicData.kraljic_matrix?.bottleneck_items;
                                const count = qData?.total_items_in_quadrant || qData?.items?.length || 0;
                                const items = qData?.items || [];
                                return (
                                  <div
                                    onClick={() => {
                                      setSelectedKraljicQuadrant('bottleneck_items');
                                      setKraljicModalSearchQuery('');
                                      setIsKraljicModalOpen(true);
                                    }}
                                    className="kraljic-quadrant-card bottleneck"
                                  >
                                    <div>
                                      <div className="kraljic-quadrant-header">
                                        <span className="kraljic-quadrant-title" style={{ color: '#c2410c' }}>
                                          <span>⚠️</span> BOTTLENECK ITEMS
                                        </span>
                                        <span className="kraljic-quadrant-count-badge" style={{ color: '#c2410c', backgroundColor: '#ffedd5', border: '1px solid #fed7aa' }}>
                                          {count.toLocaleString()} Items
                                        </span>
                                      </div>
                                      <p style={{ margin: '0.25rem 0 0.5rem 0', fontSize: '0.625rem', color: '#9a3412', lineHeight: 1.25 }}>
                                        <strong>Low Spend | High Supply Risk</strong> (Few Suppliers). Focus on securing volume supply & long-term agreements.
                                      </p>
                                    </div>

                                    {/* Preview Top Items (Scrollable List - Compact 85px) */}
                                    <div className="kraljic-items-preview-list">
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.575rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>Materials Preview ({items.length})</span>
                                        <span style={{ fontSize: '0.55rem', color: '#c2410c', fontWeight: 600 }}>Click item for Unit Price & Spend</span>
                                      </div>
                                      {items.map((it: any, i: number) => (
                                        <div
                                          key={i}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleBarRowClick({
                                              material_name: it.material,
                                              total_spend: it.total_spend_value || 0
                                            });
                                          }}
                                          title={`Click to open Material Unit Price & Spend for "${it.material}"`}
                                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.625rem', backgroundColor: '#ffffff', padding: '0.25rem 0.4rem', borderRadius: '0.25rem', border: '1px solid #ffedd5', cursor: 'pointer' }}
                                        >
                                          <span style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'underline', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>
                                            {it.material}
                                          </span>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <span style={{ fontWeight: 700, color: '#c2410c' }}>
                                              AED {Math.round(it.total_spend_value || 0).toLocaleString()}
                                            </span>
                                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#c2410c', backgroundColor: '#ffedd5', padding: '0.025rem 0.25rem', borderRadius: '0.2rem', border: '1px solid #fed7aa' }}>
                                              {it.unique_suppliers_count} {it.unique_suppliers_count === 1 ? 'Sup' : 'Sups'}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Quadrant 2 (Top Right): STRATEGIC ITEMS */}
                              {(() => {
                                const qData = kraljicData.kraljic_matrix?.strategic_items;
                                const count = qData?.total_items_in_quadrant || qData?.items?.length || 0;
                                const items = qData?.items || [];
                                return (
                                  <div
                                    onClick={() => {
                                      setSelectedKraljicQuadrant('strategic_items');
                                      setKraljicModalSearchQuery('');
                                      setIsKraljicModalOpen(true);
                                    }}
                                    className="kraljic-quadrant-card strategic"
                                  >
                                    <div>
                                      <div className="kraljic-quadrant-header">
                                        <span className="kraljic-quadrant-title" style={{ color: '#991b1b' }}>
                                          <span>🚨</span> STRATEGIC ITEMS
                                        </span>
                                        <span className="kraljic-quadrant-count-badge" style={{ color: '#991b1b', backgroundColor: '#fee2e2', border: '1px solid #fecaca' }}>
                                          {count.toLocaleString()} Items
                                        </span>
                                      </div>
                                      <p style={{ margin: '0.25rem 0 0.5rem 0', fontSize: '0.625rem', color: '#7f1d1d', lineHeight: 1.25 }}>
                                        <strong>High Spend | High Supply Risk</strong> (Few Suppliers). Critical profit drivers; require strategic partnerships.
                                      </p>
                                    </div>

                                    {/* Preview Top Items (Scrollable List - Compact 85px) */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '85px', overflowY: 'auto', paddingRight: '0.125rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.575rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Materials Preview ({items.length})</span>
                                        <span style={{ fontSize: '0.55rem', color: '#991b1b', fontWeight: 600 }}>Click item for Unit Price & Spend</span>
                                      </div>
                                      {items.map((it: any, i: number) => (
                                        <div
                                          key={i}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleBarRowClick({
                                              material_name: it.material,
                                              total_spend: it.total_spend_value || 0
                                            });
                                          }}
                                          title={`Click to open Material Unit Price & Spend for "${it.material}"`}
                                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.625rem', backgroundColor: '#ffffff', padding: '0.25rem 0.4rem', borderRadius: '0.25rem', border: '1px solid #fee2e2', cursor: 'pointer' }}
                                        >
                                          <span style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'underline', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>
                                            {it.material}
                                          </span>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <span style={{ fontWeight: 700, color: '#991b1b' }}>
                                              AED {Math.round(it.total_spend_value || 0).toLocaleString()}
                                            </span>
                                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#991b1b', backgroundColor: '#fee2e2', padding: '0.025rem 0.25rem', borderRadius: '0.2rem', border: '1px solid #fecaca' }}>
                                              {it.unique_suppliers_count} {it.unique_suppliers_count === 1 ? 'Sup' : 'Sups'}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Quadrant 3 (Bottom Left): NON-CRITICAL ITEMS */}
                              {(() => {
                                const qData = kraljicData.kraljic_matrix?.non_critical_items;
                                const count = qData?.total_items_in_quadrant || qData?.items?.length || 0;
                                const items = qData?.items || [];
                                return (
                                  <div
                                    onClick={() => {
                                      setSelectedKraljicQuadrant('non_critical_items');
                                      setKraljicModalSearchQuery('');
                                      setIsKraljicModalOpen(true);
                                    }}
                                    className="kraljic-quadrant-card non-critical"
                                  >
                                    <div>
                                      <div className="kraljic-quadrant-header">
                                        <span className="kraljic-quadrant-title" style={{ color: '#475569' }}>
                                          <span>⚙️</span> NON-CRITICAL ITEMS
                                        </span>
                                        <span className="kraljic-quadrant-count-badge" style={{ color: '#475569', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1' }}>
                                          {count.toLocaleString()} Items
                                        </span>
                                      </div>
                                      <p style={{ margin: '0.25rem 0 0.5rem 0', fontSize: '0.625rem', color: '#475569', lineHeight: 1.25 }}>
                                        <strong>Low Spend | Low Supply Risk</strong> (Many Suppliers). Focus on efficiency & ordering automation.
                                      </p>
                                    </div>

                                    {/* Preview Top Items (Scrollable List - Compact 85px) */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '85px', overflowY: 'auto', paddingRight: '0.125rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.575rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Materials Preview ({items.length})</span>
                                        <span style={{ fontSize: '0.55rem', color: '#475569', fontWeight: 600 }}>Click item for Unit Price & Spend</span>
                                      </div>
                                      {items.map((it: any, i: number) => (
                                        <div
                                          key={i}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleBarRowClick({
                                              material_name: it.material,
                                              total_spend: it.total_spend_value || 0
                                            });
                                          }}
                                          title={`Click to open Material Unit Price & Spend for "${it.material}"`}
                                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.625rem', backgroundColor: '#ffffff', padding: '0.25rem 0.4rem', borderRadius: '0.25rem', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                                        >
                                          <span style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'underline', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>
                                            {it.material}
                                          </span>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <span style={{ fontWeight: 700, color: '#475569' }}>
                                              AED {Math.round(it.total_spend_value || 0).toLocaleString()}
                                            </span>
                                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#475569', backgroundColor: '#e2e8f0', padding: '0.025rem 0.25rem', borderRadius: '0.2rem', border: '1px solid #cbd5e1' }}>
                                              {it.unique_suppliers_count} {it.unique_suppliers_count === 1 ? 'Sup' : 'Sups'}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Quadrant 4 (Bottom Right): LEVERAGE ITEMS */}
                              {(() => {
                                const qData = kraljicData.kraljic_matrix?.leverage_items;
                                const count = qData?.total_items_in_quadrant || qData?.items?.length || 0;
                                const items = qData?.items || [];
                                return (
                                  <div
                                    onClick={() => {
                                      setSelectedKraljicQuadrant('leverage_items');
                                      setKraljicModalSearchQuery('');
                                      setIsKraljicModalOpen(true);
                                    }}
                                    className="kraljic-quadrant-card leverage"
                                  >
                                    <div>
                                      <div className="kraljic-quadrant-header">
                                        <span className="kraljic-quadrant-title" style={{ color: '#15803d' }}>
                                          <span>🎯</span> LEVERAGE ITEMS
                                        </span>
                                        <span className="kraljic-quadrant-count-badge" style={{ color: '#15803d', backgroundColor: '#dcfce7', border: '1px solid #bbf7d0' }}>
                                          {count.toLocaleString()} Items
                                        </span>
                                      </div>
                                      <p style={{ margin: '0.25rem 0 0.5rem 0', fontSize: '0.625rem', color: '#166534', lineHeight: 1.25 }}>
                                        <strong>High Spend | Low Supply Risk</strong> (Many Suppliers). Leverage market competition for cost reductions.
                                      </p>
                                    </div>

                                    {/* Preview Top Items (Scrollable List - Compact 85px) */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '85px', overflowY: 'auto', paddingRight: '0.125rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.575rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Materials Preview ({items.length})</span>
                                        <span style={{ fontSize: '0.55rem', color: '#15803d', fontWeight: 600 }}>Click item for Unit Price & Spend</span>
                                      </div>
                                      {items.map((it: any, i: number) => (
                                        <div
                                          key={i}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleBarRowClick({
                                              material_name: it.material,
                                              total_spend: it.total_spend_value || 0
                                            });
                                          }}
                                          title={`Click to open Material Unit Price & Spend for "${it.material}"`}
                                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.625rem', backgroundColor: '#ffffff', padding: '0.25rem 0.4rem', borderRadius: '0.25rem', border: '1px solid #dcfce7', cursor: 'pointer' }}
                                        >
                                          <span style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'underline', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>
                                            {it.material}
                                          </span>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                            <span style={{ fontWeight: 700, color: '#15803d' }}>
                                              AED {Math.round(it.total_spend_value || 0).toLocaleString()}
                                            </span>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#15803d', backgroundColor: '#dcfce7', padding: '0.05rem 0.35rem', borderRadius: '0.25rem', border: '1px solid #bbf7d0' }}>
                                              {it.unique_suppliers_count} {it.unique_suppliers_count === 1 ? 'Sup' : 'Sups'}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}

                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', padding: '2.5rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', marginTop: '1rem' }}>
                            ✅ No Kraljic Matrix analysis data available for the selected filters.
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Material Unit Price & Spend Slide-over Left Drawer */}
          {isMaterialModalOpen && selectedMaterialForModal && (
            <div className="proc-drawer-overlay-left" style={{ zIndex: 1100 }} onClick={() => handleRequestCloseModal('material')}>
              <div
                className="proc-drawer-content-left"
                style={
                  (isMaterialModalFullscreen || modalView === 'material_compare')
                    ? { width: '98vw', maxWidth: '1680px', transition: 'all 0.3s ease' }
                    : { transition: 'all 0.3s ease' }
                }
                onClick={(e) => e.stopPropagation()}
              >
                <div className="proc-drawer-header">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 className="proc-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Material Unit Price & Spend</h3>
                    </div>
                    <span className="proc-modal-subtitle" style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 600 }}>
                      {modalView === 'material_compare'
                        ? `Comparing ${selectedCompareMaterials.length} Materials Side-by-Side`
                        : selectedMaterialForModal.material_name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="proc-modal-close-btn"
                      onClick={() => setIsMaterialModalFullscreen(prev => !prev)}
                      style={{ border: '1px solid #cbd5e1', background: (isMaterialModalFullscreen || modalView === 'material_compare') ? '#eff6ff' : '#f1f5f9', cursor: 'pointer', color: (isMaterialModalFullscreen || modalView === 'material_compare') ? '#2563eb' : '#475569', display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.4rem 0.75rem', borderRadius: '0.375rem', fontWeight: 600, fontSize: '0.8125rem', transition: 'all 0.2s ease' }}
                      title={isMaterialModalFullscreen ? "Exit Big Screen Mode" : "Expand to Big Screen Mode"}
                    >
                      {isMaterialModalFullscreen ? <Minimize2 width={15} height={15} /> : <Maximize2 width={15} height={15} />}
                      <span>{(isMaterialModalFullscreen || modalView === 'material_compare') ? 'Exit Big Screen' : 'Big Screen'}</span>
                    </button>
                    <button className="proc-modal-close-btn" onClick={() => handleRequestCloseModal('material')} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: '0.375rem', transition: 'all 0.2s ease' }} title="Close Panel">
                      <X width={18} height={18} />
                    </button>
                  </div>
                </div>

                <div className="proc-drawer-body">
                  {/* Summary Stats Row */}
                  <div className="proc-modal-stats-grid">
                    <div className="proc-modal-stat-card">
                      <span className="proc-modal-stat-label">Total Spend</span>
                      <span className="proc-modal-stat-value">
                        AED {(modalMaterialItem?.total_spend ?? selectedMaterialForModal.total_spend)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="proc-modal-stat-card">
                      <span className="proc-modal-stat-label">Total Suppliers</span>
                      <span className="proc-modal-stat-value">
                        {modalMaterialItem?.total_suppliers ?? modalSpendDetails.length}
                      </span>
                    </div>
                    <div className="proc-modal-stat-card">
                      <span className="proc-modal-stat-label">Best Supplier</span>
                      <span className="proc-modal-stat-value" title={modalMaterialItem?.best_supplier?.reason || ''}>
                        {modalMaterialItem?.best_supplier?.supplier_name || (modalSpendDetails.length > 0 ? modalSpendDetails[0].supplier_name : 'N/A')}
                      </span>
                      {modalMaterialItem?.best_supplier?.reason && (
                        <span style={{ fontSize: '0.625rem', color: '#16a34a', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={modalMaterialItem.best_supplier.reason}>
                          {modalMaterialItem.best_supplier.reason}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tabs/Compare Toggle */}
                  <div className="proc-modal-controls">
                    <div className="proc-type-tabs-group" style={{ backgroundColor: '#f1f5f9', padding: '0.125rem' }}>
                      <button
                        type="button"
                        className={`proc-toggle-pill-btn ${modalView === 'chart' ? 'active' : ''}`}
                        onClick={() => setModalView('chart')}
                      >
                        Spend Chart
                      </button>
                      <button
                        type="button"
                        className={`proc-toggle-pill-btn ${modalView === 'compare' ? 'active' : ''}`}
                        onClick={() => setModalView('compare')}
                      >
                        Comparison Details
                      </button>
                      <button
                        type="button"
                        className={`proc-toggle-pill-btn ${modalView === 'unit_price' ? 'active' : ''}`}
                        onClick={() => loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, undefined, undefined, 'unit_price')}
                      >
                        Unit Price Trend
                      </button>
                      <button
                        type="button"
                        className={`proc-toggle-pill-btn ${modalView === 'supplier_unit_price' ? 'active' : ''}`}
                        onClick={() => {
                          const initialSup = selectedSupplierFilterForModal || (modalSpendDetails.length > 0 ? modalSpendDetails[0].supplier_name : '');
                          if (initialSup) {
                            setSelectedSupplierFilterForModal(initialSup);
                            const match = modalSpendDetails.find((d: any) => d.supplier_name === initialSup);
                            loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, [match || { supplier_name: initialSup }], undefined, undefined, 'supplier_unit_price');
                          } else {
                            setModalView('supplier_unit_price');
                          }
                        }}
                      >
                        Supplier Trend
                      </button>
                      <button
                        type="button"
                        className={`proc-toggle-pill-btn ${modalView === 'material_compare' ? 'active' : ''}`}
                        onClick={() => {
                          setModalView('material_compare');
                          setIsMaterialModalFullscreen(true);
                          const currentMatName = selectedMaterialForModal?.material_name;
                          let initialList = selectedCompareMaterials;
                          if (!initialList || initialList.length === 0 || (currentMatName && !initialList.includes(currentMatName))) {
                            initialList = currentMatName ? [currentMatName] : [];
                          }
                          setSelectedCompareMaterials(initialList);
                          loadMaterialComparison(initialList);
                        }}
                      >
                        Material Compare ⚖️
                      </button>
                      <button
                        type="button"
                        className={`proc-toggle-pill-btn ${modalView === 'saved_details' ? 'active' : ''}`}
                        onClick={() => {
                          setModalView('saved_details');
                          loadSavingsModeHistory(1, savingsHistoryPageSize);
                        }}
                      >
                        Saved Details
                      </button>
                    </div>

                    {/* Baseline Month Rectangle Button, Bulk Savings & Saved Details Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <button
                        type="button"
                        className={`proc-action-pill-btn ${modalView === 'unit_price' ? 'active' : ''}`}
                        onClick={() => {
                          if (selectedMaterialForModal) {
                            loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, undefined, undefined, 'unit_price');
                          }
                        }}
                        title="Click to view Baseline Month Unit Price Trend Graph"
                      >
                        <span style={{ fontSize: '0.875rem' }}>📊</span>
                        <span>Baseline Month Graph</span>
                        {modalBaselineMonth && (
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, backgroundColor: '#dbeafe', color: '#1e40af', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>
                            {modalBaselineMonth}
                          </span>
                        )}
                      </button>

                      {/* Bulk Savings Mode Switch Button */}
                      {(() => {
                        const supplierNames = modalSpendDetails ? modalSpendDetails.map((item: any) => item.supplier_name || item.supplier).filter(Boolean) : [];
                        const isBulkActive = supplierNames.length > 0 && supplierNames.every((sup: string) => {
                          if (supplierSaveModeMap[sup] !== undefined) {
                            return supplierSaveModeMap[sup];
                          }
                          const matchingItem = modalSpendDetails.find((d: any) => (d.supplier_name || d.supplier) === sup);
                          return matchingItem ? (matchingItem.flag === 1 || matchingItem.flag === true || matchingItem.flag === '1') : false;
                        });
                        return (
                          <button
                            type="button"
                            onClick={handleBulkSavingsToggle}
                            disabled={isBulkSavingsLoading || supplierNames.length === 0}
                            title="Toggle Bulk Savings Mode for all suppliers"
                            className={`proc-action-pill-btn ${isBulkActive ? 'active' : ''}`}
                          >
                            <span>Bulk Savings</span>
                            <div style={{
                              width: '28px',
                              height: '16px',
                              backgroundColor: isBulkActive ? '#22c55e' : '#cbd5e1',
                              borderRadius: '999px',
                              position: 'relative',
                              transition: 'background-color 0.2s ease',
                              display: 'inline-block'
                            }}>
                              <div style={{
                                width: '12px',
                                height: '12px',
                                backgroundColor: '#ffffff',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '2px',
                                left: isBulkActive ? '14px' : '2px',
                                transition: 'left 0.2s ease',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                              }} />
                            </div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: isBulkActive ? '#15803d' : '#64748b' }}>
                              {isBulkActive ? 'ON' : 'OFF'}
                            </span>
                          </button>
                        );
                      })()}

                      {/* Saved Details Corner Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setModalView('saved_details');
                          loadSavingsModeHistory(1, savingsHistoryPageSize);
                        }}
                        title="Click to fetch and view Saved Savings Mode History Details"
                        className={`proc-action-pill-btn ${modalView === 'saved_details' ? 'saved-details-active' : ''}`}
                      >
                        <span style={{ fontSize: '0.875rem' }}>💾</span>
                        <span>Saved Details</span>
                      </button>

                      {/* Fullscreen Expand [ ] Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedMaterialForModal) {
                            const isSup = modalView === 'supplier_unit_price';
                            const targetSuppliers = isSup
                              ? [modalSpendDetails.find((d: any) => d.supplier_name === selectedSupplierFilterForModal) || modalSpendDetails[0]]
                              : modalSpendDetails;
                            loadAllModalUnitPriceTrends(
                              selectedMaterialForModal.material_name,
                              targetSuppliers,
                              modalBaselineMonth,
                              selectedOutletFilter,
                              isSup ? 'supplier_unit_price' : 'unit_price'
                            );
                          }
                          setIsGraphFullscreen(true);
                        }}
                        className="proc-forecast-step-btn active"
                        title="Expand Graph to Full Screen [ ]"
                      >
                        <Maximize2 width={14} height={14} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>[ ]</span>
                      </button>
                    </div>
                  </div>

                  {modalSpendDetailsLoading ? (
                    <div className="proc-chart-spinner-box" style={{ padding: '4rem 0' }}>
                      <SpinnerLoaders size="medium" text="Loading details..." fullScreen={false} />
                    </div>
                  ) : (
                    <div className="proc-modal-view-container" style={{ marginTop: '1rem' }}>
                      {modalView === 'chart' && (
                        <div className="proc-table-container" style={{ maxHeight: '460px', overflowY: 'auto', padding: '0.5rem' }}>
                          {modalSpendDetails.length > 0 ? (
                            (() => {
                              const supplierMap: Record<string, number> = {};
                              modalSpendDetails.forEach((d: any) => {
                                const name = d.supplier_name || 'Unknown';
                                supplierMap[name] = (supplierMap[name] || 0) + (d.total_spend || 0);
                              });
                              const chartData = Object.entries(supplierMap)
                                .map(([supplier_name, total_spend]) => ({ supplier_name, total_spend }))
                                .sort((a, b) => b.total_spend - a.total_spend);

                              const dynamicHeight = Math.max(300, chartData.length * 34);

                              return (
                                <div style={{ height: `${dynamicHeight}px`, position: 'relative', width: '100%' }}>
                                  <Bar
                                    data={{
                                      labels: chartData.map(c => c.supplier_name),
                                      datasets: [
                                        {
                                          label: 'Total Spend',
                                          data: chartData.map(c => c.total_spend),
                                          backgroundColor: '#10b981',
                                          borderRadius: 4,
                                          barThickness: 16,
                                        }
                                      ]
                                    }}
                                    options={{
                                      indexAxis: 'y',
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                          backgroundColor: '#1e293b',
                                          callbacks: {
                                            label: (ctx: any) => ` Total Spend: AED ${ctx.raw?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                          }
                                        }
                                      },
                                      scales: {
                                        x: {
                                          grid: { color: '#f1f5f9' },
                                          ticks: {
                                            color: '#94a3b8',
                                            font: { size: 9 },
                                            callback: (value: any) => formatGraphValue(value as number)
                                          }
                                        },
                                        y: {
                                          grid: { display: false },
                                          ticks: {
                                            color: '#334155',
                                            font: { size: 9, weight: 600 },
                                            callback: function (this: any, val: any) {
                                              const label = this.getLabelForValue(val);
                                              return label.length > 35 ? label.substring(0, 32) + '...' : label;
                                            }
                                          }
                                        }
                                      }
                                    }}
                                  />
                                </div>
                              );
                            })()
                          ) : (
                            <div className="proc-barchart-empty-state" style={{ height: '200px' }}>
                              No supplier data found.
                            </div>
                          )}
                        </div>
                      )}

                      {modalView === 'compare' && (
                        <div className="proc-table-container proc-detail-table-wrapper" style={{ maxHeight: 'calc(100vh - 280px)', minHeight: '480px' }}>
                          <table className="proc-data-table">
                            <thead>
                              <tr className="abc-table-header-row">
                                <th className="proc-detail-th">Supplier Name</th>
                                <th className="proc-detail-th">Material / Service Name</th>
                                <th className="proc-detail-th" style={{ textAlign: 'right' }}>Total Quantity</th>
                                <th className="proc-detail-th" style={{ textAlign: 'right' }}>Unit Price (AED)</th>
                                <th className="proc-detail-th" style={{ textAlign: 'right' }}>Total Spend (AED)</th>
                                <th className="proc-detail-th" style={{ textAlign: 'center' }}>Updated On</th>
                                <th className="proc-detail-th" style={{ textAlign: 'right' }}>Baseline Month</th>
                                <th className="proc-detail-th" style={{ textAlign: 'center' }}>Save Mode</th>
                              </tr>
                            </thead>
                            <tbody>
                              {modalSpendDetails.map((item, idx) => {
                                const isSaveModeOn = supplierSaveModeMap[item.supplier_name] !== undefined
                                  ? supplierSaveModeMap[item.supplier_name]
                                  : (item.flag === 1 || item.flag === true || item.flag === '1');
                                return (
                                  <tr key={idx} className="proc-detail-tr">
                                    <td
                                      className="proc-detail-td supplier-name-cell"
                                      title={`Click to load and view Supplier Trend graph for ${item.supplier_name}`}
                                      onClick={() => {
                                        setSelectedSupplierFilterForModal(item.supplier_name);
                                        loadAllModalUnitPriceTrends(item.material_name, [item], undefined, undefined, 'supplier_unit_price');
                                      }}
                                    >
                                      {item.supplier_name}
                                    </td>
                                    <td className="proc-detail-td">{item.material_name}</td>
                                    <td className="proc-detail-td" style={{ textAlign: 'right', fontWeight: 500 }}>{item.total_quantity?.toLocaleString()}</td>
                                    <td
                                      className="proc-detail-td supplier-name-cell"
                                      style={{ textAlign: 'right' }}
                                      title={`Click to load and view Supplier Trend graph for ${item.supplier_name}`}
                                      onClick={() => {
                                        setSelectedSupplierFilterForModal(item.supplier_name);
                                        loadAllModalUnitPriceTrends(item.material_name, [item], undefined, undefined, 'supplier_unit_price');
                                      }}
                                    >
                                      {item.unit_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="proc-detail-td" style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                      {item.total_spend?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="proc-detail-td" style={{ textAlign: 'center', color: '#64748b', whiteSpace: 'nowrap' }}>
                                      {formatDateTimeDisplay(item.updated_on)}
                                    </td>
                                    <td className="proc-detail-td" style={{ textAlign: 'right', fontWeight: 600 }}>
                                      {item.target_month_unit_price !== undefined && item.target_month_unit_price !== null ? (
                                        <span>
                                          <span style={{ color: '#059669' }}>AED {item.target_month_unit_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                          {item.target_month && <span style={{ color: '#64748b', fontSize: '0.6875rem', marginLeft: '0.375rem' }}>({item.target_month})</span>}
                                        </span>
                                      ) : item.target_month ? (
                                        item.target_month
                                      ) : (
                                        '-'
                                      )}
                                    </td>
                                    <td className="proc-detail-td" style={{ textAlign: 'center' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                                        <button
                                          type="button"
                                          title={isSaveModeOn ? "Save Mode Enabled" : "Save Mode Disabled"}
                                          onClick={async () => {
                                            const nextSaveMode = !isSaveModeOn;
                                            setSupplierSaveModeMap(prev => ({
                                              ...prev,
                                              [item.supplier_name]: nextSaveMode
                                            }));
                                            try {
                                              const res = await saveSavingsMode({
                                                type: 'PROCUREMENT_PERFORMANCE',
                                                material_name: item.material_name,
                                                supplier_name: item.supplier_name,
                                                flag: nextSaveMode ? 1 : 0
                                              });
                                              if (res && (res.status === 'success' || res.status === 200)) {
                                                toast.success(`Save mode ${nextSaveMode ? 'enabled' : 'disabled'} for ${item.supplier_name}`);
                                              }
                                            } catch (err) {
                                              setSupplierSaveModeMap(prev => ({
                                                ...prev,
                                                [item.supplier_name]: isSaveModeOn
                                              }));
                                              toast.error(`Failed to update Save Mode for ${item.supplier_name}`);
                                            }
                                          }}
                                          style={{
                                            width: '34px',
                                            height: '18px',
                                            backgroundColor: isSaveModeOn ? '#10b981' : '#cbd5e1',
                                            borderRadius: '9px',
                                            padding: '2px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            transition: 'background-color 0.25s ease',
                                            outline: 'none',
                                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
                                          }}
                                        >
                                          <div style={{
                                            width: '14px',
                                            height: '14px',
                                            backgroundColor: '#ffffff',
                                            borderRadius: '50%',
                                            transform: isSaveModeOn ? 'translateX(16px)' : 'translateX(0px)',
                                            transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                          }} />
                                        </button>
                                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: isSaveModeOn ? '#059669' : '#64748b' }}>
                                          {isSaveModeOn ? 'ON' : 'OFF'}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                              {modalSpendDetails.length === 0 && (
                                <tr>
                                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                    No details found.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {modalView === 'unit_price' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {modalUnitPriceLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem 0' }}>
                              <SpinnerLoaders size="medium" text="Fetching unit price trend for suppliers..." fullScreen={false} />
                            </div>
                          ) : (
                            <>
                              {/* Supplier Badges & Baseline Month Selector Container */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', backgroundColor: '#f8fafc', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginBottom: '0.75rem' }}>
                                {/* Top Row: Header Label (Left) + Filters (Right) */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                                    Click Supplier to Erase/Restore Line:
                                  </span>

                                  {/* Right: Outlet + Date Pickers + Baseline Month + Clear Filter + Full Screen */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {/* Outlet Filter Dropdown */}
                                    {(() => {
                                      const allOutlets = Array.from(new Set(
                                        modalUnitPriceTrendsMap.flatMap(t => (t.outlets || []).filter(Boolean) as string[])
                                      )).sort();
                                      if (allOutlets.length === 0) return null;
                                      return (
                                        <div className="proc-modal-filter-item">
                                          <span className="proc-modal-filter-label">Outlet:</span>
                                          <select
                                            value={selectedOutletFilter}
                                            onChange={(e) => {
                                              const selectedOutlet = e.target.value;
                                              setSelectedOutletFilter(selectedOutlet);
                                              if (selectedMaterialForModal) {
                                                loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, modalBaselineMonth, selectedOutlet, 'unit_price');
                                              }
                                            }}
                                            className={`proc-modal-filter-input ${selectedOutletFilter ? 'active' : ''}`}
                                            style={{ maxWidth: '160px' }}
                                          >
                                            <option value="">All Outlets</option>
                                            {allOutlets.map(o => <option key={o} value={o}>{o}</option>)}
                                          </select>
                                        </div>
                                      );
                                    })()}

                                    {/* From Date Filter */}
                                    <div className="proc-modal-filter-item">
                                      <span className="proc-modal-filter-label">From:</span>
                                      <input
                                        type="date"
                                        value={modalFromDate || appliedFilters.fromDate || ''}
                                        onChange={(e) => {
                                          const selectedFrom = e.target.value;
                                          setModalFromDate(selectedFrom);
                                          if (selectedMaterialForModal) {
                                            loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, modalBaselineMonth, selectedOutletFilter, 'unit_price', selectedFrom, modalToDate || appliedFilters.toDate || '');
                                          }
                                        }}
                                        className={`proc-modal-filter-input ${modalFromDate ? 'active' : ''}`}
                                      />
                                    </div>

                                    {/* To Date Filter */}
                                    <div className="proc-modal-filter-item">
                                      <span className="proc-modal-filter-label">To:</span>
                                      <input
                                        type="date"
                                        value={modalToDate || appliedFilters.toDate || ''}
                                        onChange={(e) => {
                                          const selectedTo = e.target.value;
                                          setModalToDate(selectedTo);
                                          if (selectedMaterialForModal) {
                                            loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, modalBaselineMonth, selectedOutletFilter, 'unit_price', modalFromDate || appliedFilters.fromDate || '', selectedTo);
                                          }
                                        }}
                                        className={`proc-modal-filter-input ${modalToDate ? 'active' : ''}`}
                                      />
                                    </div>

                                    {/* Baseline Month */}
                                    <div className="proc-modal-filter-item">
                                      <span className="proc-modal-filter-label">
                                        Baseline:
                                      </span>
                                      <select
                                        value={modalBaselineMonth}
                                        onChange={(e) => {
                                          const selectedMonth = e.target.value;
                                          setModalBaselineMonth(selectedMonth);
                                          if (selectedMaterialForModal) {
                                            loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, selectedMonth, selectedOutletFilter, 'unit_price', modalFromDate, modalToDate, modalTargetMonth);
                                          }
                                        }}
                                        className="proc-modal-filter-input"
                                      >
                                        <option value="">None</option>
                                        {(perfUnitPriceTrend.labels.length > 0 ? perfUnitPriceTrend.labels : ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']).map((lbl) => (
                                          <option key={lbl} value={lbl}>{lbl}</option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Target Month */}
                                    <div className="proc-modal-filter-item">
                                      <span className="proc-modal-filter-label">
                                        Target:
                                      </span>
                                      <select
                                        value={modalTargetMonth}
                                        onChange={(e) => {
                                          const selectedTarget = e.target.value;
                                          setModalTargetMonth(selectedTarget);
                                          if (selectedMaterialForModal) {
                                            loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, modalBaselineMonth, selectedOutletFilter, 'unit_price', modalFromDate, modalToDate, selectedTarget);
                                          }
                                        }}
                                        className="proc-modal-filter-input"
                                      >
                                        <option value="">None</option>
                                        {(perfUnitPriceTrend.labels.length > 0 ? perfUnitPriceTrend.labels : ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']).map((lbl) => (
                                          <option key={lbl} value={lbl}>{lbl}</option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Clear Filters Small Button */}
                                    <button
                                      type="button"
                                      onClick={handleClearModalUnitPriceFilters}
                                      className={`proc-modal-btn-clear ${(selectedOutletFilter || modalFromDate || modalToDate || modalBaselineMonth || disabledSuppliersForUnitPriceChart.length > 0) ? 'active' : ''}`}
                                      title="Reset all modal filters (Outlet, Dates, Baseline & Supplier Lines)"
                                    >
                                      <RotateCcw width={11} height={11} />
                                      <span>Clear Filter</span>
                                    </button>

                                    {/* Fullscreen Expand Button */}
                                    <button
                                      type="button"
                                      onClick={() => setIsGraphFullscreen(true)}
                                      className="proc-modal-btn-fullscreen"
                                      title="Expand graph to Full Screen Mode [ ]"
                                    >
                                      <Maximize2 width={12} height={12} />
                                      <span>Full Screen [ ]</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Bottom Row: Clickable Supplier Badges */}
                                <div className="proc-modal-supplier-badges">
                                  {modalSpendDetails.map((item, idx) => {
                                    const sName = item.supplier_name || `Supplier ${idx + 1}`;
                                    const isErased = disabledSuppliersForUnitPriceChart.includes(sName);
                                    const color = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
                                    return (
                                      <button
                                        key={sName + idx}
                                        type="button"
                                        onClick={() => {
                                          setDisabledSuppliersForUnitPriceChart(prev =>
                                            prev.includes(sName) ? prev.filter(s => s !== sName) : [...prev, sName]
                                          );
                                        }}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.25rem',
                                          padding: '0.2rem 0.5rem',
                                          borderRadius: '1rem',
                                          border: `1.5px solid ${isErased ? '#cbd5e1' : color}`,
                                          backgroundColor: isErased ? '#ffffff' : `${color}15`,
                                          color: isErased ? '#94a3b8' : '#0f172a',
                                          fontSize: '0.6875rem',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          textDecoration: isErased ? 'line-through' : 'none',
                                          opacity: isErased ? 0.5 : 1,
                                          transition: 'all 0.2s ease'
                                        }}
                                        title={isErased ? `Restore ${sName} line` : `Erase ${sName} line`}
                                      >
                                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: isErased ? '#cbd5e1' : color }} />
                                        {sName} (AED {item.unit_price?.toLocaleString() || '0'})
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Multi-Line Unit Price Comparison Chart */}
                              <div className="proc-modal-chart-box">
                                {modalSpendDetails.length > 0 ? (
                                  (() => {
                                    const sourceData = modalUnitPriceTrendsMap.length > 0 ? modalUnitPriceTrendsMap : modalSpendDetails.map(d => ({
                                      supplierName: d.supplier_name,
                                      materialName: d.material_name || (d as any).item_name || (d as any).name || (d as any).material || (typeof selectedMaterialForModal === 'string' ? selectedMaterialForModal : (selectedMaterialForModal as any)?.material_name) || '',
                                      labels: [] as string[],
                                      values: [] as number[],
                                      quantities: [] as (number | null)[],
                                      amounts: [] as (number | null)[],
                                      outlets: [] as (string | null)[],
                                      costCenters: [] as (string | null)[],
                                      latestUnitPrice: d.unit_price
                                    }));

                                    const activeTrends = sourceData.filter(item => !disabledSuppliersForUnitPriceChart.includes(item.supplierName));

                                    if (activeTrends.length === 0) {
                                      return (
                                        <div className="proc-modal-empty-state">
                                          All supplier lines erased. Click a supplier badge above to restore.
                                        </div>
                                      );
                                    }

                                    const activeFrom = modalFromDate || appliedFilters.fromDate || '';
                                    const activeTo = modalToDate || appliedFilters.toDate || '';
                                    const fromMonth = activeFrom ? activeFrom.substring(0, 7) : '';
                                    const toMonth = activeTo ? activeTo.substring(0, 7) : '';

                                    const monthLabelsSet = new Set<string>();
                                    activeTrends.forEach(t => {
                                      if (Array.isArray(t.labels)) {
                                        t.labels.forEach(l => { if (l) monthLabelsSet.add(l); });
                                      }
                                    });
                                    if (monthLabelsSet.size === 0 && Array.isArray(perfUnitPriceTrend.labels)) {
                                      perfUnitPriceTrend.labels.forEach(l => { if (l) monthLabelsSet.add(l); });
                                    }

                                    let monthLabels = Array.from(monthLabelsSet).filter(Boolean).sort();
                                    if (fromMonth || toMonth) {
                                      monthLabels = monthLabels.filter(m => (!fromMonth || m >= fromMonth) && (!toMonth || m <= toMonth));
                                    }

                                    if (monthLabels.length === 0) {
                                      if (fromMonth && toMonth && fromMonth <= toMonth) {
                                        const generated: string[] = [];
                                        let curr = fromMonth;
                                        while (curr <= toMonth) {
                                          generated.push(curr);
                                          const [y, m] = curr.split('-').map(Number);
                                          const nextM = m === 12 ? 1 : m + 1;
                                          const nextY = m === 12 ? y + 1 : y;
                                          curr = `${nextY}-${String(nextM).padStart(2, '0')}`;
                                        }
                                        monthLabels = generated;
                                      } else {
                                        monthLabels = ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
                                        if (fromMonth || toMonth) {
                                          monthLabels = monthLabels.filter(m => (!fromMonth || m >= fromMonth) && (!toMonth || m <= toMonth));
                                        }
                                      }
                                    }

                                    const supplierDatasets = activeTrends.map((trendItem) => {
                                      const originalIndex = modalSpendDetails.findIndex(d => d.supplier_name === trendItem.supplierName);
                                      const color = CATEGORY_PALETTE[(originalIndex >= 0 ? originalIndex : 0) % CATEGORY_PALETTE.length];

                                      let dataPoints: (number | null)[] = [];
                                      let dataQuantities: (number | null)[] = [];
                                      let dataAmounts: (number | null)[] = [];
                                      let dataOutlets: (string | null)[] = [];
                                      let dataCostCenters: (string | null)[] = [];

                                      if (trendItem.labels && trendItem.labels.length > 0) {
                                        dataPoints = monthLabels.map((m: string) => {
                                          const idx = trendItem.labels.indexOf(m);
                                          if (idx === -1) return null;
                                          if (selectedOutletFilter) {
                                            const outletAtIdx = trendItem.outlets ? trendItem.outlets[idx] : null;
                                            if (outletAtIdx !== selectedOutletFilter) return null;
                                          }
                                          return trendItem.values[idx];
                                        });
                                        dataQuantities = monthLabels.map((m: string) => {
                                          const idx = trendItem.labels.indexOf(m);
                                          return idx !== -1 && trendItem.quantities ? trendItem.quantities[idx] : null;
                                        });
                                        dataAmounts = monthLabels.map((m: string) => {
                                          const idx = trendItem.labels.indexOf(m);
                                          return idx !== -1 && trendItem.amounts ? trendItem.amounts[idx] : null;
                                        });
                                        dataOutlets = monthLabels.map((m: string) => {
                                          const idx = trendItem.labels.indexOf(m);
                                          return idx !== -1 && trendItem.outlets ? trendItem.outlets[idx] : null;
                                        });
                                        dataCostCenters = monthLabels.map((m: string) => {
                                          const idx = trendItem.labels.indexOf(m);
                                          return idx !== -1 && trendItem.costCenters ? trendItem.costCenters[idx] : null;
                                        });
                                      } else {
                                        const singleVal = trendItem.latestUnitPrice || 0;
                                        dataPoints = monthLabels.map((_, i) => (i === monthLabels.length - 1 ? singleVal : null));
                                        dataQuantities = monthLabels.map(() => null);
                                        dataAmounts = monthLabels.map(() => null);
                                        dataOutlets = monthLabels.map(() => null);
                                        dataCostCenters = monthLabels.map(() => null);
                                      }

                                      return {
                                        label: trendItem.supplierName,
                                        supplierName: trendItem.supplierName,
                                        materialName: (trendItem as any).materialName || (trendItem as any).material_name || (typeof selectedMaterialForModal === 'string' ? selectedMaterialForModal : ((selectedMaterialForModal as any)?.material_name || (selectedMaterialForModal as any)?.material_code || (selectedMaterialForModal as any)?.material)) || '',
                                        data: dataPoints,
                                        quantities: dataQuantities,
                                        amounts: dataAmounts,
                                        outlets: dataOutlets,
                                        costCenters: dataCostCenters,
                                        borderColor: color,
                                        backgroundColor: color,
                                        borderWidth: 2.5,
                                        pointBackgroundColor: color,
                                        pointBorderColor: '#ffffff',
                                        pointBorderWidth: 1.5,
                                        pointRadius: 4.5,
                                        pointHoverRadius: 6.5,
                                        fill: false,
                                        tension: 0.35,
                                        spanGaps: false,
                                      };
                                    });

                                    const datasets = [
                                      ...supplierDatasets,
                                      ...(modalBaselineMonth && modalTargetMonthPrice !== null && modalTargetMonthPrice > 0 ? [{
                                        label: `Baseline (${modalBaselineMonth}): AED ${modalTargetMonthPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                                        data: Array(monthLabels.length).fill(modalTargetMonthPrice),
                                        borderColor: '#ef4444',
                                        borderWidth: 1.5,
                                        borderDash: [5, 5],
                                        pointRadius: 0,
                                        pointHoverRadius: 0,
                                        fill: false,
                                        tension: 0,
                                      }] : [])
                                    ];

                                    return (
                                      <Line
                                        data={{
                                          labels: monthLabels,
                                          datasets
                                        }}
                                        options={{
                                          responsive: true,
                                          maintainAspectRatio: false,
                                          onClick: (_event: any, activeElements: any[], chart: any) => {
                                            if (activeElements && activeElements.length > 0) {
                                              const el = activeElements[0];
                                              const dataset = chart.data.datasets[el.datasetIndex];
                                              if (dataset && dataset.label) {
                                                const month = chart.data.labels[el.index];
                                                const unitPrice = dataset.data[el.index];
                                                const qty = dataset.quantities ? dataset.quantities[el.index] : null;
                                                const amt = dataset.amounts ? dataset.amounts[el.index] : null;
                                                const outlet = dataset.outlets ? dataset.outlets[el.index] : null;
                                                const cc = dataset.costCenters ? dataset.costCenters[el.index] : null;
                                                const matName = dataset.materialName || (typeof selectedMaterialForModal === 'string' ? selectedMaterialForModal : ((selectedMaterialForModal as any)?.material_name || (selectedMaterialForModal as any)?.material_code || (selectedMaterialForModal as any)?.material)) || (selectedAnomalyForModal as any)?.material_name || (selectedAnomalyForModal as any)?.material || (appliedFilters.materialCodes && appliedFilters.materialCodes[0]) || (appliedFilters.materialGroups && appliedFilters.materialGroups[0]) || '';
                                                // Toggle: if same point clicked again, close
                                                setUnitPriceClickedPoint(prev =>
                                                  prev && prev.supplier === (dataset.supplierName || dataset.label) && prev.month === month && prev.material === matName
                                                    ? null
                                                    : {
                                                      supplier: dataset.supplierName || dataset.label,
                                                      material: matName,
                                                      month,
                                                      unitPrice: Number(unitPrice),
                                                      qty: qty ?? null,
                                                      amount: amt ?? null,
                                                      outlet: Array.isArray(outlet) ? outlet : (outlet ? [String(outlet)] : []),
                                                      costCenter: Array.isArray(cc) ? cc : (cc ? [String(cc)] : [])
                                                    }
                                                );
                                              }
                                            } else {
                                              setUnitPriceClickedPoint(null);
                                            }
                                          },
                                          plugins: {
                                            legend: { display: true, position: 'top', labels: { font: { size: 10, weight: 600 } } },
                                            tooltip: {
                                              backgroundColor: '#0f172a',
                                              titleFont: { size: 12, weight: 700 },
                                              bodyFont: { size: 11 },
                                              padding: 8,
                                              borderColor: '#334155',
                                              borderWidth: 1,
                                              callbacks: {
                                                label: (ctx: any) => {
                                                  const ds = ctx.dataset;
                                                  const unitPrice = ctx.raw;
                                                  if (unitPrice === null || unitPrice === undefined) return ` Unit Price: N/A`;
                                                  const dataIdx = ctx.dataIndex;
                                                  const qty = ds.quantities ? ds.quantities[dataIdx] : null;
                                                  const amt = ds.amounts ? ds.amounts[dataIdx] : null;
                                                  const outlet = ds.outlets ? ds.outlets[dataIdx] : null;
                                                  const cc = ds.costCenters ? ds.costCenters[dataIdx] : null;

                                                  let text = ` ${ds.label}: AED ${unitPrice}`;
                                                  if (qty !== null) text += ` | Total Qty: ${qty.toLocaleString()}`;
                                                  if (amt !== null) text += ` | Total Amt: AED ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                                  if (outlet) text += ` | Outlet: ${outlet}`;
                                                  if (cc) text += ` | Cost Center: ${cc}`;
                                                  return text;
                                                },
                                                footer: () => '📋 Click a point to open detail box'
                                              }
                                            }
                                          },
                                          layout: {
                                            padding: { bottom: 35, top: 10, left: 10, right: 25 }
                                          },
                                          scales: {
                                            x: {
                                              offset: true,
                                              grid: { color: '#f1f5f9' },
                                              ticks: { color: '#0f172a', font: { size: 11, weight: 700 }, autoSkip: false, maxRotation: 45, minRotation: 0, padding: 8 }
                                            },
                                            y: {
                                              grid: { color: '#f1f5f9' },
                                              ticks: {
                                                color: '#334155',
                                                font: { size: 10, weight: 600 },
                                                callback: (val: any) => `AED ${Number(val).toLocaleString()}`
                                              }
                                            }
                                          }
                                        }}
                                      />
                                    );
                                  })()
                                ) : (
                                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8', fontSize: '0.75rem' }}>
                                    No unit price comparison data available.
                                  </div>
                                )}
                              </div>

                              {/* Clicked Point Detail Box */}
                              {unitPriceClickedPoint && (
                                <div className="proc-forecast-stat-card" style={{ marginTop: '0.75rem', border: '1.5px solid #2563eb', backgroundColor: '#eff6ff' }}>
                                  <div className="anomaly-feed-item-header" style={{ borderBottom: '1px solid #bfdbfe', paddingBottom: '0.375rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }} />
                                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e40af' }}>{unitPriceClickedPoint.supplier}{' — '}{unitPriceClickedPoint.month}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const p = unitPriceClickedPoint;
                                          let t = `Supplier: ${p.supplier}\nMonth: ${p.month}\nUnit Price: AED ${p.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                          if (p.qty !== null) t += `\nTotal Qty: ${p.qty.toLocaleString()}`;
                                          if (p.amount !== null) t += `\nTotal Spend: AED ${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                          if (p.outlet) t += `\nOutlet: ${p.outlet}`;
                                          if (p.costCenter) t += `\nCost Center: ${p.costCenter}`;
                                          navigator.clipboard.writeText(t);
                                          toast.success('Point details copied to clipboard!');
                                        }}
                                        className="proc-forecast-step-btn active"
                                        style={{ padding: '0.2rem 0.5rem' }}
                                        title="Copy details to clipboard"
                                      >
                                        <Copy width={12} height={12} />
                                        <span>Copy Details</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setUnitPriceClickedPoint(null)}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.875rem', lineHeight: 1 }}
                                        title="Close Box"
                                      >✕</button>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem', fontSize: '0.75rem', color: '#1e293b', marginTop: '0.375rem' }}>
                                    <span><strong>Unit Price:</strong> AED {unitPriceClickedPoint.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    {unitPriceClickedPoint.qty !== null && <span><strong>Qty:</strong> {unitPriceClickedPoint.qty.toLocaleString()}</span>}
                                    {unitPriceClickedPoint.amount !== null && <span><strong>Total Spend:</strong> AED {unitPriceClickedPoint.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                                    {unitPriceClickedPoint.outlet && <span><strong>Outlet:</strong> {unitPriceClickedPoint.outlet}</span>}
                                    {unitPriceClickedPoint.costCenter && <span><strong>Cost Center:</strong> {unitPriceClickedPoint.costCenter}</span>}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {modalView === 'supplier_unit_price' && (
                        <div className="proc-modal-supplier-section">
                          {modalUnitPriceLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem 0' }}>
                              <SpinnerLoaders size="medium" text="Fetching supplier unit price trend..." fullScreen={false} />
                            </div>
                          ) : (
                            <>
                              {/* Supplier Selector Controls Container */}
                              <div className="proc-modal-supplier-toolbar">
                                <div className="proc-modal-filter-item">
                                  <span className="proc-modal-filter-label">
                                    Supplier:
                                  </span>
                                  <select
                                    value={selectedSupplierFilterForModal}
                                    onChange={(e) => {
                                      const sName = e.target.value;
                                      setSelectedSupplierFilterForModal(sName);
                                      const match = modalSpendDetails.find((d: any) => d.supplier_name === sName);
                                      loadAllModalUnitPriceTrends(
                                        selectedMaterialForModal.material_name,
                                        [match || { supplier_name: sName }],
                                        modalBaselineMonth,
                                        selectedOutletFilter,
                                        'supplier_unit_price'
                                      );
                                    }}
                                    className="proc-modal-supplier-select"
                                  >
                                    {modalSpendDetails.map((sup: any, idx: number) => {
                                      const name = sup.supplier_name || `Supplier ${idx + 1}`;
                                      return (
                                        <option key={name + idx} value={name}>
                                          {name}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                  {/* From Date Filter */}

                                  {/* From Date Filter */}
                                  <div className="proc-modal-filter-item">
                                    <span className="proc-modal-filter-label">From:</span>
                                    <input
                                      type="date"
                                      value={modalFromDate || appliedFilters.fromDate || ''}
                                      onChange={(e) => {
                                        const selectedFrom = e.target.value;
                                        setModalFromDate(selectedFrom);
                                        const match = modalSpendDetails.find((d: any) => d.supplier_name === selectedSupplierFilterForModal);
                                        loadAllModalUnitPriceTrends(
                                          selectedMaterialForModal.material_name,
                                          [match || modalSpendDetails[0]],
                                          modalBaselineMonth,
                                          selectedOutletFilter,
                                          'supplier_unit_price',
                                          selectedFrom,
                                          modalToDate || appliedFilters.toDate || ''
                                        );
                                      }}
                                      className={`proc-modal-filter-input ${modalFromDate ? 'active' : ''}`}
                                    />
                                  </div>

                                  {/* To Date Filter */}
                                  <div className="proc-modal-filter-item">
                                    <span className="proc-modal-filter-label">To:</span>
                                    <input
                                      type="date"
                                      value={modalToDate || appliedFilters.toDate || ''}
                                      onChange={(e) => {
                                        const selectedTo = e.target.value;
                                        setModalToDate(selectedTo);
                                        const match = modalSpendDetails.find((d: any) => d.supplier_name === selectedSupplierFilterForModal);
                                        loadAllModalUnitPriceTrends(
                                          selectedMaterialForModal.material_name,
                                          [match || modalSpendDetails[0]],
                                          modalBaselineMonth,
                                          selectedOutletFilter,
                                          'supplier_unit_price',
                                          modalFromDate || appliedFilters.fromDate || '',
                                          selectedTo
                                        );
                                      }}
                                      className={`proc-modal-filter-input ${modalToDate ? 'active' : ''}`}
                                    />
                                  </div>

                                  {/* Select Baseline Month Dropdown */}
                                  <div className="proc-modal-filter-item">
                                    <span className="proc-modal-filter-label">
                                      Baseline Month:
                                    </span>
                                    <select
                                      value={modalBaselineMonth}
                                      onChange={(e) => {
                                        const selectedMonth = e.target.value;
                                        setModalBaselineMonth(selectedMonth);
                                        const match = modalSpendDetails.find((d: any) => d.supplier_name === selectedSupplierFilterForModal);
                                        loadAllModalUnitPriceTrends(
                                          selectedMaterialForModal.material_name,
                                          [match || modalSpendDetails[0]],
                                          selectedMonth,
                                          selectedOutletFilter,
                                          'supplier_unit_price'
                                        );
                                      }}
                                      className="proc-modal-filter-input"
                                    >
                                      <option value="">None</option>
                                      {(perfUnitPriceTrend.labels.length > 0 ? perfUnitPriceTrend.labels : ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']).map((lbl) => (
                                        <option key={lbl} value={lbl}>{lbl}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Daily Trend Checkbox */}
                                  <label className={`proc-modal-checkbox-label ${isDailyTrendActive ? 'active' : ''}`}>
                                    <input
                                      type="checkbox"
                                      checked={isDailyTrendActive}
                                      onChange={(e) => setIsDailyTrendActive(e.target.checked)}
                                      className="proc-modal-checkbox-input"
                                    />
                                    <span>Daily Trend</span>
                                  </label>
                                </div>
                              </div>

                              {/* Supplier Trend Chart Container */}
                              <div className="proc-modal-chart-box">
                                {dailyTrendLoading ? (
                                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem 0', flex: 1 }}>
                                    <SpinnerLoaders size="medium" text="Fetching daily trend..." fullScreen={false} />
                                  </div>
                                ) : isDailyTrendActive && dailyTrendData ? (
                                  <Line
                                    data={{
                                      labels: dailyTrendData.labels,
                                      datasets: [{
                                        label: `Daily Spend Trend (${selectedSupplierFilterForModal || selectedMaterialForModal.material_name})`,
                                        data: dailyTrendData.values,
                                        borderColor: '#2563eb',
                                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                        fill: true,
                                        tension: 0.2,
                                        borderWidth: 2,
                                        pointBackgroundColor: '#2563eb',
                                        pointBorderColor: '#ffffff',
                                        pointRadius: dailyTrendData.labels.length > 60 ? 1.5 : 3,
                                        pointHoverRadius: 5,
                                      }]
                                    }}
                                    options={{
                                      responsive: true,
                                      maintainAspectRatio: false,
                                      plugins: {
                                        legend: { display: true, position: 'top', labels: { font: { size: 11, weight: 600 } } },
                                        tooltip: {
                                          backgroundColor: '#0f172a',
                                          padding: 10,
                                          callbacks: {
                                            label: (ctx: any) => {
                                              const idx = ctx.dataIndex;
                                              const spend = formatGraphValue(ctx.raw as number);
                                              const qty = dailyTrendData.quantities[idx];
                                              const uPrice = dailyTrendData.unitPrices[idx];
                                              const lines = [` Total Spend: AED ${spend}`];
                                              if (qty !== null && qty !== undefined) lines.push(` Quantity: ${qty.toLocaleString()}`);
                                              if (uPrice !== null && uPrice !== undefined) lines.push(` Avg Unit Price: AED ${uPrice.toLocaleString()}`);
                                              return lines;
                                            }
                                          }
                                        }
                                      },
                                      scales: {
                                        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 9 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 25 } },
                                        y: { grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 9 }, callback: (v: any) => formatGraphValue(v as number) } }
                                      }
                                    }}
                                  />
                                ) : modalSpendDetails.length > 0 ? (
                                  (() => {
                                    const sourceData = modalUnitPriceTrendsMap.length > 0 ? modalUnitPriceTrendsMap : modalSpendDetails.map(d => ({
                                      supplierName: d.supplier_name,
                                      labels: [] as string[],
                                      values: [] as number[],
                                      quantities: [] as (number | null)[],
                                      amounts: [] as (number | null)[],
                                      outlets: [] as (string | null)[],
                                      costCenters: [] as (string | null)[],
                                      latestUnitPrice: d.unit_price
                                    }));

                                    let activeTrends = sourceData;
                                    if (selectedSupplierFilterForModal) {
                                      activeTrends = sourceData.filter(item => item.supplierName === selectedSupplierFilterForModal);
                                    }
                                    if (activeTrends.length === 0) {
                                      activeTrends = sourceData.slice(0, 1);
                                    }

                                    const monthLabelsSet = new Set<string>();
                                    if (Array.isArray(perfUnitPriceTrend.labels) && perfUnitPriceTrend.labels.length > 0) {
                                      perfUnitPriceTrend.labels.forEach(l => { if (l) monthLabelsSet.add(l); });
                                    }
                                    activeTrends.forEach(t => {
                                      if (Array.isArray(t.labels)) {
                                        t.labels.forEach(l => { if (l) monthLabelsSet.add(l); });
                                      }
                                    });
                                    let monthLabels = Array.from(monthLabelsSet).filter(Boolean).sort();
                                    if (monthLabels.length === 0) {
                                      monthLabels = DEFAULT_MONTH_LABELS;
                                    }

                                    const supplierDatasets = activeTrends.map((trendItem) => {
                                      const originalIndex = modalSpendDetails.findIndex(d => d.supplier_name === trendItem.supplierName);
                                      const color = CATEGORY_PALETTE[(originalIndex >= 0 ? originalIndex : 0) % CATEGORY_PALETTE.length];

                                      let dataPoints: (number | null)[] = [];
                                      let dataQuantities: (number | null)[] = [];
                                      let dataAmounts: (number | null)[] = [];
                                      let dataOutlets: (string | null)[] = [];
                                      let dataCostCenters: (string | null)[] = [];

                                      if (trendItem.labels && trendItem.labels.length > 0) {
                                        dataPoints = monthLabels.map((m: string) => {
                                          const idx = trendItem.labels.indexOf(m);
                                          if (idx === -1) return null;
                                          if (selectedOutletFilter) {
                                            const outletAtIdx = trendItem.outlets ? trendItem.outlets[idx] : null;
                                            if (outletAtIdx !== selectedOutletFilter) return null;
                                          }
                                          return trendItem.values[idx];
                                        });
                                        dataQuantities = monthLabels.map((m: string) => {
                                          const idx = trendItem.labels.indexOf(m);
                                          return idx !== -1 && trendItem.quantities ? trendItem.quantities[idx] : null;
                                        });
                                        dataAmounts = monthLabels.map((m: string) => {
                                          const idx = trendItem.labels.indexOf(m);
                                          return idx !== -1 && trendItem.amounts ? trendItem.amounts[idx] : null;
                                        });
                                        dataOutlets = monthLabels.map((m: string) => {
                                          const idx = trendItem.labels.indexOf(m);
                                          return idx !== -1 && trendItem.outlets ? trendItem.outlets[idx] : null;
                                        });
                                        dataCostCenters = monthLabels.map((m: string) => {
                                          const idx = trendItem.labels.indexOf(m);
                                          return idx !== -1 && trendItem.costCenters ? trendItem.costCenters[idx] : null;
                                        });
                                      } else {
                                        const singleVal = trendItem.latestUnitPrice || 0;
                                        dataPoints = monthLabels.map((_, i) => (i === monthLabels.length - 1 || i === 0 ? singleVal : null));
                                        dataQuantities = monthLabels.map(() => null);
                                        dataAmounts = monthLabels.map(() => null);
                                        dataOutlets = monthLabels.map(() => null);
                                        dataCostCenters = monthLabels.map(() => null);
                                      }

                                      return {
                                        label: trendItem.supplierName,
                                        supplierName: trendItem.supplierName,
                                        materialName: (trendItem as any).materialName || (trendItem as any).material_name || (typeof selectedMaterialForModal === 'string' ? selectedMaterialForModal : ((selectedMaterialForModal as any)?.material_name || (selectedMaterialForModal as any)?.material_code || (selectedMaterialForModal as any)?.material)) || '',
                                        data: dataPoints,
                                        quantities: dataQuantities,
                                        amounts: dataAmounts,
                                        outlets: dataOutlets,
                                        costCenters: dataCostCenters,
                                        borderColor: color,
                                        backgroundColor: color,
                                        borderWidth: 2.5,
                                        pointBackgroundColor: color,
                                        pointBorderColor: '#ffffff',
                                        pointBorderWidth: 1.5,
                                        pointRadius: 4.5,
                                        pointHoverRadius: 6.5,
                                        fill: false,
                                        tension: 0.35,
                                        spanGaps: false,
                                      };
                                    });

                                    const datasets = [
                                      ...supplierDatasets,
                                      ...(modalBaselineMonth && modalTargetMonthPrice !== null && modalTargetMonthPrice > 0 ? [{
                                        label: `Baseline (${modalBaselineMonth}): AED ${modalTargetMonthPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                                        data: Array(monthLabels.length).fill(modalTargetMonthPrice),
                                        borderColor: '#ef4444',
                                        borderWidth: 1.5,
                                        borderDash: [5, 5],
                                        pointRadius: 0,
                                        pointHoverRadius: 0,
                                        fill: false,
                                        tension: 0,
                                      }] : [])
                                    ];

                                    return (
                                      <Line
                                        data={{
                                          labels: monthLabels,
                                          datasets
                                        }}
                                        options={{
                                          responsive: true,
                                          maintainAspectRatio: false,
                                          onClick: (_event: any, activeElements: any[], chart: any) => {
                                            if (activeElements && activeElements.length > 0) {
                                              const el = activeElements[0];
                                              const dataset = chart.data.datasets[el.datasetIndex];
                                              if (dataset && dataset.label) {
                                                const month = chart.data.labels[el.index];
                                                const unitPrice = dataset.data[el.index];
                                                const qty = dataset.quantities ? dataset.quantities[el.index] : null;
                                                const amt = dataset.amounts ? dataset.amounts[el.index] : null;
                                                const outlet = dataset.outlets ? dataset.outlets[el.index] : null;
                                                const cc = dataset.costCenters ? dataset.costCenters[el.index] : null;
                                                const matName = dataset.materialName || (typeof selectedMaterialForModal === 'string' ? selectedMaterialForModal : ((selectedMaterialForModal as any)?.material_name || (selectedMaterialForModal as any)?.material_code || (selectedMaterialForModal as any)?.material)) || (selectedAnomalyForModal as any)?.material_name || (selectedAnomalyForModal as any)?.material || (appliedFilters.materialCodes && appliedFilters.materialCodes[0]) || (appliedFilters.materialGroups && appliedFilters.materialGroups[0]) || '';
                                                setUnitPriceClickedPoint(prev =>
                                                  prev && prev.supplier === (dataset.supplierName || dataset.label) && prev.month === month && prev.material === matName
                                                    ? null
                                                    : {
                                                      supplier: dataset.supplierName || dataset.label,
                                                      material: matName,
                                                      month,
                                                      unitPrice: Number(unitPrice),
                                                      qty: qty ?? null,
                                                      amount: amt ?? null,
                                                      outlet: Array.isArray(outlet) ? outlet : (outlet ? [String(outlet)] : []),
                                                      costCenter: Array.isArray(cc) ? cc : (cc ? [String(cc)] : [])
                                                    }
                                                );
                                              }
                                            } else {
                                              setUnitPriceClickedPoint(null);
                                            }
                                          },
                                          plugins: {
                                            legend: { display: true, position: 'top', labels: { font: { size: 10, weight: 600 } } },
                                            tooltip: {
                                              backgroundColor: '#0f172a',
                                              titleFont: { size: 12, weight: 700 },
                                              bodyFont: { size: 11 },
                                              padding: 8,
                                              borderColor: '#334155',
                                              borderWidth: 1,
                                              callbacks: {
                                                label: (ctx: any) => {
                                                  const ds = ctx.dataset;
                                                  const unitPrice = ctx.raw;
                                                  if (unitPrice === null || unitPrice === undefined) return ` Unit Price: N/A`;
                                                  const dataIdx = ctx.dataIndex;
                                                  const qty = ds.quantities ? ds.quantities[dataIdx] : null;
                                                  const amt = ds.amounts ? ds.amounts[dataIdx] : null;
                                                  const outlet = ds.outlets ? ds.outlets[dataIdx] : null;
                                                  const cc = ds.costCenters ? ds.costCenters[dataIdx] : null;

                                                  let text = ` ${ds.label}: AED ${unitPrice}`;
                                                  if (qty !== null) text += ` | Total Qty: ${qty.toLocaleString()}`;
                                                  if (amt !== null) text += ` | Total Amt: AED ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                                  if (outlet) text += ` | Outlet: ${outlet}`;
                                                  if (cc) text += ` | Cost Center: ${cc}`;
                                                  return text;
                                                },
                                                footer: () => '📋 Click a point to open detail box'
                                              }
                                            }
                                          },
                                          layout: {
                                            padding: { bottom: 35, top: 10, left: 10, right: 25 }
                                          },
                                          scales: {
                                            x: {
                                              offset: true,
                                              grid: { color: '#f1f5f9' },
                                              ticks: { color: '#0f172a', font: { size: 11, weight: 700 }, autoSkip: false, maxRotation: 45, minRotation: 0, padding: 8 }
                                            },
                                            y: {
                                              grid: { color: '#f1f5f9' },
                                              ticks: {
                                                color: '#334155',
                                                font: { size: 10, weight: 600 },
                                                callback: (val: any) => `AED ${Number(val).toLocaleString()}`
                                              }
                                            }
                                          }
                                        }}
                                      />
                                    );
                                  })()
                                ) : (
                                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8', fontSize: '0.75rem' }}>
                                    No supplier unit price trend data available.
                                  </div>
                                )}
                              </div>

                              {/* Clicked Point Detail Box - Supplier Trend */}
                              {unitPriceClickedPoint && (
                                <div className="proc-forecast-stat-card" style={{ marginTop: '0.75rem', border: '1.5px solid #2563eb', backgroundColor: '#eff6ff' }}>
                                  <div className="anomaly-feed-item-header" style={{ borderBottom: '1px solid #bfdbfe', paddingBottom: '0.375rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }} />
                                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e40af' }}>{unitPriceClickedPoint.supplier}{' — '}{unitPriceClickedPoint.month}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const p = unitPriceClickedPoint;
                                          let t = `Supplier: ${p.supplier}\nMonth: ${p.month}\nUnit Price: AED ${p.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                          if (p.qty !== null) t += `\nTotal Qty: ${p.qty.toLocaleString()}`;
                                          if (p.amount !== null) t += `\nTotal Spend: AED ${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                          if (p.outlet) t += `\nOutlet: ${p.outlet}`;
                                          if (p.costCenter) t += `\nCost Center: ${p.costCenter}`;
                                          navigator.clipboard.writeText(t);
                                          toast.success('Point details copied to clipboard!');
                                        }}
                                        className="proc-forecast-step-btn active"
                                        style={{ padding: '0.2rem 0.5rem' }}
                                        title="Copy details to clipboard"
                                      >
                                        <Copy width={12} height={12} />
                                        <span>Copy Details</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setUnitPriceClickedPoint(null)}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.875rem', lineHeight: 1 }}
                                        title="Close Box"
                                      >✕</button>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem', fontSize: '0.75rem', color: '#1e293b', marginTop: '0.375rem' }}>
                                    <span><strong>Unit Price:</strong> AED {unitPriceClickedPoint.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    {unitPriceClickedPoint.qty !== null && <span><strong>Qty:</strong> {unitPriceClickedPoint.qty.toLocaleString()}</span>}
                                    {unitPriceClickedPoint.amount !== null && <span><strong>Total Spend:</strong> AED {unitPriceClickedPoint.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                                    {unitPriceClickedPoint.outlet && <span><strong>Outlet:</strong> {unitPriceClickedPoint.outlet}</span>}
                                    {unitPriceClickedPoint.costCenter && <span><strong>Cost Center:</strong> {unitPriceClickedPoint.costCenter}</span>}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {modalView === 'saved_details' && (
                        <div className="proc-saved-details-container">
                          {/* Summary Stats Row */}
                          <div className="proc-saved-summary-grid">
                            <div className="proc-saved-card-green">
                              <span className="proc-saved-card-label-green">Overall Saved Amount</span>
                              <span className="proc-saved-card-val-green">
                                AED {savingsHistoryOverallTotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="proc-saved-card-slate">
                              <span className="proc-saved-card-label-slate">Total Savings Mode Records</span>
                              <span className="proc-saved-card-val-slate">
                                {savingsHistoryTotalMode || savingsHistoryItems.length}
                              </span>
                            </div>
                            <div className="proc-saved-card-slate">
                              <span className="proc-saved-card-label-slate">Total Records</span>
                              <span className="proc-saved-card-val-slate">
                                {savingsHistoryTotalCount || savingsHistoryItems.length}
                              </span>
                            </div>
                          </div>

                          {/* Search & Filter Bar */}
                          <div className="proc-saved-toolbar">
                            <div className="proc-saved-search-wrapper">
                              <Search width={14} height={14} className="proc-saved-search-icon" />
                              <input
                                type="text"
                                placeholder="Search material / supplier..."
                                value={savingsHistorySearch}
                                onChange={(e) => setSavingsHistorySearch(e.target.value)}
                                className="proc-saved-search-input"
                              />
                              {savingsHistorySearch && (
                                <X
                                  width={12}
                                  height={12}
                                  onClick={() => setSavingsHistorySearch('')}
                                  className="proc-saved-search-clear"
                                />
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => loadSavingsModeHistory(savingsHistoryPage, savingsHistoryPageSize)}
                              className="proc-saved-refresh-btn"
                            >
                              <RotateCcw width={12} height={12} /> Refresh History
                            </button>
                          </div>

                          {/* Saved Details Table */}
                          {savingsHistoryLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                              <SpinnerLoaders size="medium" text="Loading saved details history..." fullScreen={false} />
                            </div>
                          ) : (
                            <div className="proc-saved-table-wrap">
                              <table className="proc-data-table proc-saved-table">
                                <thead className="proc-saved-thead">
                                  <tr className="proc-saved-tr-head">
                                    <th style={{ padding: '0.625rem 0.875rem' }}>Material Name</th>
                                    <th style={{ padding: '0.625rem 0.875rem' }}>Supplier Name</th>
                                    <th style={{ padding: '0.625rem 0.875rem', textAlign: 'right' }}>Latest Price (AED)</th>
                                    <th style={{ padding: '0.625rem 0.875rem', textAlign: 'right' }}>Saved Amount (AED)</th>
                                    <th style={{ padding: '0.625rem 0.875rem', textAlign: 'center' }}>Savings Flag</th>
                                    <th style={{ padding: '0.625rem 0.875rem', textAlign: 'center' }}>Latest Updated</th>
                                    <th style={{ padding: '0.625rem 0.875rem', textAlign: 'center' }}>History Logs</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    const filtered = savingsHistoryItems.filter((item: any) => {
                                      if (!savingsHistorySearch.trim()) return true;
                                      const q = savingsHistorySearch.toLowerCase().trim();
                                      const m = (item.material_name || '').toLowerCase();
                                      const s = (item.supplier_name || '').toLowerCase();
                                      return m.includes(q) || s.includes(q);
                                    });

                                    if (filtered.length === 0) {
                                      return (
                                        <tr>
                                          <td colSpan={7} style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                                            <div className="proc-saved-empty-container">
                                              <span style={{ fontSize: '1.75rem' }}>ℹ️</span>
                                              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
                                                {selectedMaterialForModal?.material_name
                                                  ? `No savings details saved for "${selectedMaterialForModal.material_name}"`
                                                  : 'No savings mode details found'}
                                              </span>
                                              <span style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '420px', lineHeight: 1.4 }}>
                                                No savings mode records have been saved for this material yet. Use the <strong>Save Mode</strong> toggle in Comparison Details or <strong>Bulk Savings</strong> to save price baseline benchmarks.
                                              </span>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    }

                                    const paginated = filtered.slice(
                                      (savingsHistoryPage - 1) * savingsHistoryPageSize,
                                      savingsHistoryPage * savingsHistoryPageSize
                                    );

                                    return paginated.map((item: any, idx: number) => {
                                      const isExpanded = expandedHistoryRowIdx === idx;
                                      const historyList = item.history || [];
                                      return (
                                        <React.Fragment key={idx}>
                                          <tr className="proc-detail-tr">
                                            <td className="proc-detail-td" style={{ fontWeight: 600, color: '#2563eb' }}>
                                              {item.material_name || '-'}
                                            </td>
                                            <td className="proc-detail-td" style={{ fontWeight: 500 }}>
                                              {item.supplier_name || '-'}
                                            </td>
                                            <td className="proc-detail-td" style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                              AED {Number(item.latest_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="proc-detail-td" style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                              AED {Number(item.total_saved_per_record || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="proc-detail-td" style={{ textAlign: 'center' }}>
                                              <span className={item.current_flag ? "proc-saved-badge-active" : "proc-saved-badge-disabled"}>
                                                {item.current_flag ? 'Active (Saved)' : 'Disabled'}
                                              </span>
                                            </td>
                                            <td className="proc-detail-td" style={{ textAlign: 'center', color: '#64748b', fontSize: '0.6875rem', whiteSpace: 'nowrap' }}>
                                              {formatDateTimeDisplay(item.latest_updated_on)}
                                            </td>
                                            <td className="proc-detail-td" style={{ textAlign: 'center' }}>
                                              <button
                                                type="button"
                                                onClick={() => setExpandedHistoryRowIdx(isExpanded ? null : idx)}
                                                className={isExpanded ? "proc-saved-log-btn-active" : "proc-saved-log-btn-inactive"}
                                              >
                                                📜 {historyList.length || item.history_count || 0} Logs {isExpanded ? '▲' : '▼'}
                                              </button>
                                            </td>
                                          </tr>
                                          {isExpanded && (
                                            <tr style={{ backgroundColor: '#f0f9ff' }}>
                                              <td colSpan={7} style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #bae6fd' }}>
                                                <div className="proc-audit-trail-card">
                                                  📜 Audit History Trail ({item.material_name} — {item.supplier_name})
                                                </div>
                                                <table className="proc-audit-table">
                                                  <thead>
                                                    <tr style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 700, textAlign: 'left' }}>
                                                      <th className="proc-detail-th">ID</th>
                                                      <th className="proc-detail-th">Updated On</th>
                                                      <th className="proc-detail-th" style={{ textAlign: 'right' }}>Price (AED)</th>
                                                      <th className="proc-detail-th" style={{ textAlign: 'center' }}>Flag</th>
                                                      <th className="proc-detail-th" style={{ textAlign: 'right' }}>Saved Amount (AED)</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {historyList.map((h: any, hIdx: number) => (
                                                      <tr key={hIdx} className="proc-detail-tr">
                                                        <td className="proc-detail-td" style={{ fontWeight: 600 }}>#{h.id}</td>
                                                        <td className="proc-detail-td" style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{formatDateTimeDisplay(h.updated_on)}</td>
                                                        <td className="proc-detail-td" style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>AED {Number(h.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                        <td className="proc-detail-td" style={{ textAlign: 'center' }}>
                                                          <span style={{ color: h.flag ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{h.flag ? 'True' : 'False'}</span>
                                                        </td>
                                                        <td className="proc-detail-td" style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>AED {Number(h.saved_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </td>
                                            </tr>
                                          )}
                                        </React.Fragment>
                                      );
                                    });
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Saved Details Pagination Footer */}
                          {savingsHistoryItems.length > 0 && (() => {
                            const totalItemsCount = savingsHistoryItems.length;
                            const totalPages = Math.ceil(totalItemsCount / savingsHistoryPageSize) || 1;
                            const startItem = (savingsHistoryPage - 1) * savingsHistoryPageSize + 1;
                            const endItem = Math.min(savingsHistoryPage * savingsHistoryPageSize, totalItemsCount);

                            return (
                              <div className="proc-saved-pagination-bar">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                                    Showing {startItem} to {endItem} of {savingsHistoryTotalCount || totalItemsCount} items
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Per page:</span>
                                    <select
                                      value={savingsHistoryPageSize}
                                      onChange={(e) => {
                                        setSavingsHistoryPageSize(Number(e.target.value));
                                        setSavingsHistoryPage(1);
                                      }}
                                      className="proc-pagination-per-page"
                                    >
                                      <option value={10}>10</option>
                                      <option value={25}>25</option>
                                      <option value={50}>50</option>
                                      <option value={totalItemsCount || 100}>All ({totalItemsCount})</option>
                                    </select>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                  <button
                                    type="button"
                                    disabled={savingsHistoryPage <= 1}
                                    onClick={() => setSavingsHistoryPage(prev => Math.max(1, prev - 1))}
                                    className={`proc-page-btn ${savingsHistoryPage <= 1 ? 'disabled' : ''}`}
                                  >
                                    &lt;
                                  </button>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', padding: '0 0.25rem' }}>
                                    Page {savingsHistoryPage} of {totalPages}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={savingsHistoryPage >= totalPages}
                                    onClick={() => setSavingsHistoryPage(prev => Math.min(totalPages, prev + 1))}
                                    className={`proc-page-btn ${savingsHistoryPage >= totalPages ? 'disabled' : ''}`}
                                  >
                                    &gt;
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {modalView === 'material_compare' && (
                        <div className="proc-material-compare-wrapper" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {/* Multi-Select Header & Material Picker Bar */}
                          <div style={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.25rem' }}>⚖️</span>
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Material Comparison Tool</h4>
                                <span style={{ fontSize: '0.75rem', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '0.25rem 0.625rem', borderRadius: '1rem', fontWeight: 600 }}>
                                  {selectedCompareMaterials.length} Selected
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
                                Compare pricing, spend volume, unit price & suppliers side-by-side.
                              </p>
                            </div>

                            {/* Selected Material Tags + Multi-Select Add Material Dropdown */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
                              {selectedCompareMaterials.map((mat, idx) => (
                                <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', backgroundColor: '#2563eb', color: '#ffffff', padding: '0.375rem 0.75rem', borderRadius: '2rem', fontSize: '0.8125rem', fontWeight: 600, boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)' }}>
                                  <span>{mat}</span>
                                  <X
                                    width={14}
                                    height={14}
                                    style={{ cursor: 'pointer', opacity: 0.9 }}
                                    onClick={() => {
                                      const updated = selectedCompareMaterials.filter(m => m !== mat);
                                      setSelectedCompareMaterials(updated);
                                      if (updated.length > 0) {
                                        loadMaterialComparison(updated);
                                      } else {
                                        setMaterialComparisonData([]);
                                      }
                                    }}
                                  />
                                </div>
                              ))}

                              {/* Add Material Dropdown Button */}
                              <div style={{ position: 'relative' }}>
                                <button
                                  type="button"
                                  onClick={() => setIsCompareDropdownOpen(!isCompareDropdownOpen)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', backgroundColor: '#f8fafc', color: '#2563eb', border: '1px dashed #93c5fd', padding: '0.375rem 0.875rem', borderRadius: '2rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  <span>+ Add Material to Compare</span>
                                  <ChevronDown width={14} height={14} />
                                </button>

                                {isCompareDropdownOpen && (
                                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.375rem', width: '360px', maxHeight: '340px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.625rem', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    {(() => {
                                      const allAvailableMaterials = Array.from(new Set([
                                        ...(filterOptions.materialCodes || []),
                                        ...(initialMaterials || []),
                                        ...(pfMaterialOptions || []),
                                        ...(modalMaterialOptions || []),
                                        ...(compareMaterialOptions || [])
                                      ])).filter(Boolean);

                                      const filtered = allAvailableMaterials
                                        .filter((m: string) => m && m.toLowerCase().includes(materialSearchQuery.toLowerCase()))
                                        .slice(0, 300);

                                      return (
                                        <>
                                          {/* Dropdown Header with Done Button */}
                                          <div style={{ padding: '0.625rem 0.75rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                                              Select Materials ({selectedCompareMaterials.length} Selected)
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => setIsCompareDropdownOpen(false)}
                                              style={{ border: 'none', background: '#2563eb', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                            >
                                              Done ✓
                                            </button>
                                          </div>

                                          {/* Search Input Field */}
                                          <div style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
                                            <input
                                              type="text"
                                              placeholder="Search all materials (e.g. French, Oil, Fish)..."
                                              value={materialSearchQuery}
                                              onChange={(e) => handleCompareMaterialSearch(e.target.value)}
                                              style={{ width: '100%', padding: '0.375rem 2rem 0.375rem 0.625rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.8125rem', outline: 'none' }}
                                              autoFocus
                                            />
                                            {compareMaterialSearching && (
                                              <div style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)' }}>
                                                <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #2563eb', borderTopColor: 'transparent', animation: 'procSpin 0.8s linear infinite' }} />
                                              </div>
                                            )}
                                          </div>

                                          {/* Options List - STAYS OPEN ON SELECTION */}
                                          <div style={{ overflowY: 'auto', flex: 1, padding: '0.25rem 0' }}>
                                            {filtered.length > 0 ? (
                                              filtered.map((mat: string, idx: number) => {
                                                const isSelected = selectedCompareMaterials.includes(mat);
                                                return (
                                                  <div
                                                    key={idx}
                                                    onClick={() => {
                                                      let updated: string[];
                                                      if (isSelected) {
                                                        updated = selectedCompareMaterials.filter(m => m !== mat);
                                                      } else {
                                                        updated = [...selectedCompareMaterials, mat];
                                                      }
                                                      setSelectedCompareMaterials(updated);
                                                      if (updated.length > 0) {
                                                        loadMaterialComparison(updated);
                                                      } else {
                                                        setMaterialComparisonData([]);
                                                      }
                                                    }}
                                                    style={{
                                                      padding: '0.5rem 0.75rem',
                                                      fontSize: '0.8125rem',
                                                      color: isSelected ? '#1e40af' : '#1e293b',
                                                      backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                                                      fontWeight: isSelected ? 700 : 400,
                                                      cursor: 'pointer',
                                                      borderBottom: '1px solid #f8fafc',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'space-between'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                                    }}
                                                  >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, overflow: 'hidden' }}>
                                                      <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => { }}
                                                        style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                                                      />
                                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mat}</span>
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', color: isSelected ? '#dc2626' : '#2563eb', fontWeight: 600, flexShrink: 0, marginLeft: '0.5rem' }}>
                                                      {isSelected ? 'Remove' : '+ Add'}
                                                    </span>
                                                  </div>
                                                );
                                              })
                                            ) : (
                                              <div style={{ padding: '0.75rem', fontSize: '0.8125rem', color: '#94a3b8', textAlign: 'center' }}>
                                                {compareMaterialSearching ? 'Searching...' : 'No matching materials found'}
                                              </div>
                                            )}
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Flipkart-Style Side-by-Side Cards Comparison View */}
                          {materialComparisonLoading ? (
                            <div style={{ padding: '3rem', textAlign: 'center' }}>
                              <SpinnerLoaders size="large" text="Comparing materials side-by-side..." fullScreen={false} />
                            </div>
                          ) : materialComparisonData && materialComparisonData.length > 0 ? (
                            (() => {
                              // Find best (lowest) avg_unit_price for highlight
                              const validPrices = materialComparisonData.map(d => Number(d.avg_unit_price) || 0).filter(p => p > 0);
                              const minAvgUnitPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;

                              // Find all suppliers to calculate shared vs unique
                              const supplierCountMap = new Map<string, number>();
                              materialComparisonData.forEach(item => {
                                (item.suppliers || []).forEach((sup: string) => {
                                  supplierCountMap.set(sup, (supplierCountMap.get(sup) || 0) + 1);
                                });
                              });

                              return (
                                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, materialComparisonData.length)}, minmax(300px, 1fr))`, gap: '1.25rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                                  {materialComparisonData.map((item, idx) => {
                                    const isBestPrice = minAvgUnitPrice > 0 && Number(item.avg_unit_price) === minAvgUnitPrice;
                                    const suppliersList: string[] = item.suppliers || [];

                                    return (
                                      <div
                                        key={idx}
                                        style={{
                                          backgroundColor: '#ffffff',
                                          borderRadius: '0.875rem',
                                          border: isBestPrice ? '2px solid #10b981' : '1px solid #e2e8f0',
                                          boxShadow: isBestPrice ? '0 8px 20px rgba(16, 185, 129, 0.15)' : '0 4px 12px rgba(0,0,0,0.05)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          overflow: 'hidden',
                                          position: 'relative'
                                        }}
                                      >
                                        {/* Highlight Ribbon for Best Price */}
                                        {isBestPrice && (
                                          <div style={{ backgroundColor: '#10b981', color: '#ffffff', fontSize: '0.6875rem', fontWeight: 700, textAlign: 'center', padding: '0.25rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            ⭐ Lowest Avg Unit Price
                                          </div>
                                        )}

                                        {/* Card Header */}
                                        <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                          <div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Material #{idx + 1}</span>
                                            <h3 style={{ margin: '0.25rem 0 0', fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.35 }}>
                                              {item.material_name}
                                            </h3>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = selectedCompareMaterials.filter(m => m !== item.material_name);
                                              setSelectedCompareMaterials(updated);
                                              if (updated.length > 0) {
                                                loadMaterialComparison(updated);
                                              } else {
                                                setMaterialComparisonData([]);
                                              }
                                            }}
                                            style={{ border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', padding: '0.375rem', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            title={`Remove ${item.material_name}`}
                                          >
                                            <X width={14} height={14} />
                                          </button>
                                        </div>

                                        {/* Key Metrics Comparison Grid */}
                                        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                                          {/* Metric 1: Avg Unit Price */}
                                          <div style={{ backgroundColor: isBestPrice ? '#ecfdf5' : '#f8fafc', borderRadius: '0.5rem', padding: '0.75rem', border: isBestPrice ? '1px solid #a7f3d0' : '1px solid #f1f5f9' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block' }}>Average Unit Price</span>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
                                              <span style={{ fontSize: '1.375rem', fontWeight: 800, color: isBestPrice ? '#047857' : '#0f172a' }}>
                                                AED {Number(item.avg_unit_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                              {isBestPrice && (
                                                <span style={{ fontSize: '0.6875rem', fontWeight: 700, backgroundColor: '#059669', color: '#ffffff', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>
                                                  Best Value
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          {/* Metric 2: Total Spend */}
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>Total Spend</span>
                                            <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b' }}>
                                              AED {Number(item.total_spend).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                          </div>

                                          {/* Metric 3: Total Quantity */}
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>Total Quantity</span>
                                            <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b' }}>
                                              {Number(item.total_quantity).toLocaleString()}
                                            </span>
                                          </div>

                                          {/* Metric 4: Total Suppliers Count */}
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#64748b' }}>Suppliers Count</span>
                                            <span style={{ fontSize: '0.8125rem', fontWeight: 700, backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '0.125rem 0.5rem', borderRadius: '1rem' }}>
                                              {suppliersList.length} Suppliers
                                            </span>
                                          </div>

                                          {/* Suppliers List with Shared Supplier Badges */}
                                          <div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>
                                              Suppliers List ({suppliersList.length})
                                            </span>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', maxHeight: '180px', overflowY: 'auto' }}>
                                              {suppliersList.map((sup, sIdx) => {
                                                const isShared = (supplierCountMap.get(sup) || 0) > 1;
                                                return (
                                                  <span
                                                    key={sIdx}
                                                    style={{
                                                      fontSize: '0.6875rem',
                                                      fontWeight: isShared ? 700 : 500,
                                                      backgroundColor: isShared ? '#fef3c7' : '#f1f5f9',
                                                      color: isShared ? '#92400e' : '#334155',
                                                      border: isShared ? '1px solid #fde68a' : '1px solid #e2e8f0',
                                                      padding: '0.25rem 0.5rem',
                                                      borderRadius: '0.375rem',
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      gap: '0.25rem'
                                                    }}
                                                    title={isShared ? 'Shared supplier across compared materials' : 'Unique supplier for this material'}
                                                  >
                                                    {isShared && <span>🤝</span>}
                                                    {sup}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {/* Action Buttons: Raise Query & Go to Survey for this Material */}
                                          <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setRaiseQueryModalData({
                                                  supplierName: suppliersList[0] || '',
                                                  materialName: item.material_name,
                                                  title: `Query regarding ${item.material_name}`,
                                                  message: `Query details for material ${item.material_name}:\n- Total Spend: AED ${Number(item.total_spend).toLocaleString()}\n- Avg Unit Price: AED ${Number(item.avg_unit_price).toLocaleString()}\n- Total Quantity: ${Number(item.total_quantity).toLocaleString()}`
                                                });
                                                setIsRaiseQueryModalOpen(true);
                                              }}
                                              style={{
                                                flex: 1,
                                                backgroundColor: '#2563eb',
                                                color: '#ffffff',
                                                border: 'none',
                                                padding: '0.625rem',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.8125rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.375rem',
                                                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                                              }}
                                            >
                                              <HelpCircle width={14} height={14} />
                                              <span>Raise Query</span>
                                            </button>
                                            {/* <button
                                              type="button"
                                              onClick={() => {
                                                setSurveyMaterialName(item.material_name || item.materialName || item.material_code || '');
                                                setSurveySupplierName(item.suppliers?.[0] || item.supplier_name || item.supplierName || item.vendor_name || item.vendorName || item.supplier || '');
                                                setIsSurveyModalOpen(true);
                                              }}
                                              style={{
                                                flex: 1,
                                                backgroundColor: '#eff6ff',
                                                color: '#2563eb',
                                                border: '1px solid #bfdbfe',
                                                padding: '0.625rem',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.8125rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.375rem',
                                                transition: 'all 0.2s ease'
                                              }}
                                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dbeafe')}
                                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
                                            >
                                              <ClipboardList width={14} height={14} color="#2563eb" />
                                              <span>Go to Survey</span>
                                            </button> */}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()
                          ) : (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                              No comparison data available for the selected materials. Select materials above to compare.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen Graph View Overlay Modal */}
          {isGraphFullscreen && selectedMaterialForModal && (
            <div className="proc-modal-overlay" style={{ zIndex: 10000, backgroundColor: '#ffffff', flexDirection: 'column', padding: '1rem 1.25rem 2rem 1.25rem', overflowY: 'auto' }}>
              {/* Fullscreen Header */}
              <div className="proc-drawer-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                      {modalView === 'supplier_unit_price' ? 'Supplier Unit Price Trend Analysis' : 'Material Unit Price & Baseline Trend Analysis'}
                    </h2>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '0.25rem', backgroundColor: '#2563eb', color: '#ffffff' }}>
                      Full Screen Mode [ ]
                    </span>
                  </div>
                  <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 600 }}>
                    {selectedMaterialForModal.material_name}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Fullscreen View Switcher Tabs */}
                  <div className="proc-type-tabs-group" style={{ backgroundColor: '#e2e8f0' }}>
                    <button
                      type="button"
                      className={`proc-toggle-pill-btn ${modalView !== 'supplier_unit_price' ? 'active' : ''}`}
                      onClick={() => {
                        setModalView('unit_price');
                        if (selectedMaterialForModal) {
                          loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, modalBaselineMonth, selectedOutletFilter, 'unit_price');
                        }
                      }}
                    >
                      Unit Price Trend
                    </button>
                    <button
                      type="button"
                      className={`proc-toggle-pill-btn ${modalView === 'supplier_unit_price' ? 'active' : ''}`}
                      onClick={() => {
                        setModalView('supplier_unit_price');
                        if (selectedMaterialForModal) {
                          const match = modalSpendDetails.find((d: any) => d.supplier_name === selectedSupplierFilterForModal);
                          loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, [match || modalSpendDetails[0]], modalBaselineMonth, selectedOutletFilter, 'supplier_unit_price');
                        }
                      }}
                    >
                      Supplier Trend
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsGraphFullscreen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.45rem 0.875rem',
                      borderRadius: '0.375rem',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#334155',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s ease'
                    }}
                    title="Exit Fullscreen Mode (Esc)"
                  >
                    <Minimize2 width={16} height={16} />
                    <span>Exit Full Screen [ ]</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsGraphFullscreen(false)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: '0.25rem', borderRadius: '0.375rem' }}
                    title="Close Fullscreen View"
                  >
                    <X width={24} height={24} />
                  </button>
                </div>
              </div>

              {/* Fullscreen Controls Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', backgroundColor: '#f8fafc', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginBottom: '0.75rem' }}>
                {/* Top Row: Header (Left) + Filters (Right) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {modalView === 'supplier_unit_price' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                        Supplier:
                      </span>
                      <select
                        value={selectedSupplierFilterForModal}
                        onChange={(e) => {
                          const sName = e.target.value;
                          setSelectedSupplierFilterForModal(sName);
                          const match = modalSpendDetails.find((d: any) => d.supplier_name === sName);
                          loadAllModalUnitPriceTrends(
                            selectedMaterialForModal.material_name,
                            [match || { supplier_name: sName }],
                            modalBaselineMonth,
                            selectedOutletFilter,
                            'supplier_unit_price'
                          );
                        }}
                        style={{
                          padding: '0.375rem 0.625rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          border: '1.5px solid #2563eb',
                          borderRadius: '0.375rem',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          outline: 'none',
                          cursor: 'pointer',
                          maxWidth: '280px'
                        }}
                      >
                        {modalSpendDetails.map((sup: any, idx: number) => {
                          const name = sup.supplier_name || `Supplier ${idx + 1}`;
                          return (
                            <option key={name + idx} value={name}>
                              {name}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ) : (
                    <span className="proc-modal-supplier-hint">
                      Click Supplier to Erase/Restore Line:
                    </span>
                  )}

                  {/* Daily Trend Checkbox (Inside Fullscreen) */}
                  {modalView === 'supplier_unit_price' && (
                    <label className={`proc-modal-checkbox-label ${isDailyTrendActive ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isDailyTrendActive}
                        onChange={(e) => setIsDailyTrendActive(e.target.checked)}
                        className="proc-modal-checkbox-input"
                      />
                      <span>Daily Trend</span>
                    </label>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* Outlet Filter (for Unit Price Trend) */}
                    {modalView !== 'supplier_unit_price' && (() => {
                      const allOutlets = Array.from(new Set(
                        modalUnitPriceTrendsMap.flatMap(t => (t.outlets || []).filter(Boolean) as string[])
                      )).sort();
                      if (allOutlets.length === 0) return null;
                      return (
                        <div className="proc-modal-filter-item">
                          <span className="proc-modal-filter-label">Outlet:</span>
                          <select
                            value={selectedOutletFilter}
                            onChange={(e) => {
                              const selectedOutlet = e.target.value;
                              setSelectedOutletFilter(selectedOutlet);
                              if (selectedMaterialForModal) {
                                loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, modalBaselineMonth, selectedOutlet, 'unit_price');
                              }
                            }}
                            className={`proc-modal-outlet-select ${selectedOutletFilter ? 'active' : ''}`}
                          >
                            <option value="">All Outlets</option>
                            {allOutlets.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      );
                    })()}
                    {/* From Date Filter */}
                    <div className="proc-modal-filter-item">
                      <span className="proc-modal-filter-label">From:</span>
                      <input
                        type="date"
                        value={modalFromDate || appliedFilters.fromDate || ''}
                        onChange={(e) => {
                          const selectedFrom = e.target.value;
                          setModalFromDate(selectedFrom);
                          if (selectedMaterialForModal) {
                            loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, modalBaselineMonth, selectedOutletFilter, modalView === 'supplier_unit_price' ? 'supplier_unit_price' : 'unit_price', selectedFrom, modalToDate || appliedFilters.toDate || '');
                          }
                        }}
                        className={`proc-modal-filter-input ${modalFromDate ? 'active' : ''}`}
                      />
                    </div>

                    {/* To Date Filter */}
                    <div className="proc-modal-filter-item">
                      <span className="proc-modal-filter-label">To:</span>
                      <input
                        type="date"
                        value={modalToDate || appliedFilters.toDate || ''}
                        onChange={(e) => {
                          const selectedTo = e.target.value;
                          setModalToDate(selectedTo);
                          if (selectedMaterialForModal) {
                            loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, modalBaselineMonth, selectedOutletFilter, modalView === 'supplier_unit_price' ? 'supplier_unit_price' : 'unit_price', modalFromDate || appliedFilters.fromDate || '', selectedTo);
                          }
                        }}
                        className={`proc-modal-filter-input ${modalToDate ? 'active' : ''}`}
                      />
                    </div>

                    {/* Baseline Month */}
                    <div className="proc-modal-filter-item">
                      <span className="proc-modal-filter-label">
                        Baseline:
                      </span>
                      <select
                        value={modalBaselineMonth}
                        onChange={(e) => {
                          const selectedMonth = e.target.value;
                          setModalBaselineMonth(selectedMonth);
                          if (selectedMaterialForModal) {
                            loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, selectedMonth, selectedOutletFilter, modalView === 'supplier_unit_price' ? 'supplier_unit_price' : 'unit_price', modalFromDate, modalToDate, modalTargetMonth);
                          }
                        }}
                        className="proc-modal-filter-input"
                      >
                        <option value="">None</option>
                        {(perfUnitPriceTrend.labels.length > 0 ? perfUnitPriceTrend.labels : ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']).map((lbl) => (
                          <option key={lbl} value={lbl}>{lbl}</option>
                        ))}
                      </select>
                    </div>

                    {/* Target Month */}
                    <div className="proc-modal-filter-item">
                      <span className="proc-modal-filter-label">
                        Target:
                      </span>
                      <select
                        value={modalTargetMonth}
                        onChange={(e) => {
                          const selectedTarget = e.target.value;
                          setModalTargetMonth(selectedTarget);
                          if (selectedMaterialForModal) {
                            loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, modalBaselineMonth, selectedOutletFilter, modalView === 'supplier_unit_price' ? 'supplier_unit_price' : 'unit_price', modalFromDate, modalToDate, selectedTarget);
                          }
                        }}
                        className="proc-modal-filter-input"
                      >
                        <option value="">None</option>
                        {(perfUnitPriceTrend.labels.length > 0 ? perfUnitPriceTrend.labels : ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']).map((lbl) => (
                          <option key={lbl} value={lbl}>{lbl}</option>
                        ))}
                      </select>
                    </div>

                    {/* Clear Filters Small Button */}
                    <button
                      type="button"
                      onClick={handleClearModalUnitPriceFilters}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.375rem',
                        border: (selectedOutletFilter || modalFromDate || modalToDate || modalBaselineMonth || disabledSuppliersForUnitPriceChart.length > 0)
                          ? '1px solid #fca5a5'
                          : '1px solid #cbd5e1',
                        backgroundColor: (selectedOutletFilter || modalFromDate || modalToDate || modalBaselineMonth || disabledSuppliersForUnitPriceChart.length > 0)
                          ? '#fef2f2'
                          : '#ffffff',
                        color: (selectedOutletFilter || modalFromDate || modalToDate || modalBaselineMonth || disabledSuppliersForUnitPriceChart.length > 0)
                          ? '#dc2626'
                          : '#64748b',
                        fontWeight: 600,
                        fontSize: '0.6875rem',
                        cursor: 'pointer',
                        height: '24px',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                      title="Reset all modal filters (Outlet, Dates, Baseline & Supplier Lines)"
                    >
                      <RotateCcw width={11} height={11} />
                      <span>Clear Filter</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Clickable Supplier Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', alignItems: 'center' }}>
                  {modalSpendDetails.map((item, idx) => {
                    const sName = item.supplier_name || `Supplier ${idx + 1}`;
                    const isErased = disabledSuppliersForUnitPriceChart.includes(sName);
                    const color = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
                    return (
                      <button
                        key={sName + idx}
                        type="button"
                        onClick={() => {
                          setDisabledSuppliersForUnitPriceChart(prev =>
                            prev.includes(sName) ? prev.filter(s => s !== sName) : [...prev, sName]
                          );
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '1rem',
                          border: `1.5px solid ${isErased ? '#cbd5e1' : color}`,
                          backgroundColor: isErased ? '#ffffff' : `${color}15`,
                          color: isErased ? '#94a3b8' : '#0f172a',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: isErased ? 'line-through' : 'none',
                          opacity: isErased ? 0.5 : 1,
                          transition: 'all 0.2s ease'
                        }}
                        title={isErased ? `Restore ${sName} line` : `Erase ${sName} line`}
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: isErased ? '#cbd5e1' : color }} />
                        {sName} (AED {item.unit_price?.toLocaleString() || '0'})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chart Container in Fullscreen */}
              <div style={{ flex: 1, minHeight: '420px', position: 'relative', width: '100%', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem 1rem 2.25rem 1rem', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
                {dailyTrendLoading || modalUnitPriceLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <SpinnerLoaders size="medium" text={dailyTrendLoading ? "Fetching daily trend in full screen..." : "Fetching unit price trend in full screen..."} fullScreen={false} />
                  </div>
                ) : isDailyTrendActive && dailyTrendData ? (
                  <Line
                    data={{
                      labels: dailyTrendData.labels,
                      datasets: [{
                        label: `Daily Spend Trend (${selectedSupplierFilterForModal || selectedMaterialForModal?.material_name || 'All'})`,
                        data: dailyTrendData.values,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: true,
                        tension: 0.2,
                        borderWidth: 2.5,
                        pointBackgroundColor: '#2563eb',
                        pointBorderColor: '#ffffff',
                        pointRadius: dailyTrendData.labels.length > 60 ? 2 : 4,
                        pointHoverRadius: 6,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: true, position: 'top', labels: { font: { size: 12, weight: 600 } } },
                        tooltip: {
                          backgroundColor: '#0f172a',
                          padding: 12,
                          callbacks: {
                            label: (ctx: any) => {
                              const idx = ctx.dataIndex;
                              const spend = formatGraphValue(ctx.raw as number);
                              const qty = dailyTrendData.quantities[idx];
                              const uPrice = dailyTrendData.unitPrices[idx];
                              const lines = [` Total Spend: AED ${spend}`];
                              if (qty !== null && qty !== undefined) lines.push(` Quantity: ${qty.toLocaleString()}`);
                              if (uPrice !== null && uPrice !== undefined) lines.push(` Avg Unit Price: AED ${uPrice.toLocaleString()}`);
                              return lines;
                            }
                          }
                        }
                      },
                      scales: {
                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 30 } },
                        y: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { size: 10 }, callback: (v: any) => formatGraphValue(v as number) } }
                      }
                    }}
                  />
                ) : modalSpendDetails.length > 0 ? (
                  (() => {
                    const sourceData = modalUnitPriceTrendsMap.length > 0 ? modalUnitPriceTrendsMap : modalSpendDetails.map(d => ({
                      supplierName: d.supplier_name,
                      materialName: d.material_name || (d as any).item_name || (d as any).name || (d as any).material || (typeof selectedMaterialForModal === 'string' ? selectedMaterialForModal : (selectedMaterialForModal as any)?.material_name) || '',
                      labels: [] as string[],
                      values: [] as number[],
                      quantities: [] as (number | null)[],
                      amounts: [] as (number | null)[],
                      outlets: [] as (string | null)[],
                      costCenters: [] as (string | null)[],
                      latestUnitPrice: d.unit_price
                    }));

                    let activeTrends = sourceData.filter(item => !disabledSuppliersForUnitPriceChart.includes(item.supplierName));
                    if (selectedSupplierFilterForModal) {
                      activeTrends = activeTrends.filter(item => item.supplierName === selectedSupplierFilterForModal);
                    }

                    if (activeTrends.length === 0) {
                      return (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8', fontSize: '0.875rem' }}>
                          All supplier lines erased. Click a supplier badge above to restore.
                        </div>
                      );
                    }

                    const activeFrom = modalFromDate || appliedFilters.fromDate || '';
                    const activeTo = modalToDate || appliedFilters.toDate || '';
                    const fromMonth = activeFrom ? activeFrom.substring(0, 7) : '';
                    const toMonth = activeTo ? activeTo.substring(0, 7) : '';

                    const monthLabelsSet = new Set<string>();
                    activeTrends.forEach(t => {
                      if (Array.isArray(t.labels)) {
                        t.labels.forEach(l => { if (l) monthLabelsSet.add(l); });
                      }
                    });
                    if (monthLabelsSet.size === 0 && Array.isArray(perfUnitPriceTrend.labels)) {
                      perfUnitPriceTrend.labels.forEach(l => { if (l) monthLabelsSet.add(l); });
                    }

                    let monthLabels = Array.from(monthLabelsSet).filter(Boolean).sort();
                    if (fromMonth || toMonth) {
                      monthLabels = monthLabels.filter(m => (!fromMonth || m >= fromMonth) && (!toMonth || m <= toMonth));
                    }

                    if (monthLabels.length === 0) {
                      if (fromMonth && toMonth && fromMonth <= toMonth) {
                        const generated: string[] = [];
                        let curr = fromMonth;
                        while (curr <= toMonth) {
                          generated.push(curr);
                          const [y, m] = curr.split('-').map(Number);
                          const nextM = m === 12 ? 1 : m + 1;
                          const nextY = m === 12 ? y + 1 : y;
                          curr = `${nextY}-${String(nextM).padStart(2, '0')}`;
                        }
                        monthLabels = generated;
                      } else {
                        monthLabels = DEFAULT_MONTH_LABELS;
                        if (fromMonth || toMonth) {
                          monthLabels = monthLabels.filter(m => (!fromMonth || m >= fromMonth) && (!toMonth || m <= toMonth));
                        }
                      }
                    }

                    const supplierDatasets = activeTrends.map((trendItem) => {
                      const originalIndex = modalSpendDetails.findIndex(d => d.supplier_name === trendItem.supplierName);
                      const color = CATEGORY_PALETTE[(originalIndex >= 0 ? originalIndex : 0) % CATEGORY_PALETTE.length];

                      let dataPoints: (number | null)[] = [];
                      let dataQuantities: (number | null)[] = [];
                      let dataAmounts: (number | null)[] = [];
                      let dataOutlets: (string | null)[] = [];
                      let dataCostCenters: (string | null)[] = [];

                      if (trendItem.labels && trendItem.labels.length > 0) {
                        dataPoints = monthLabels.map((m: string) => {
                          const idx = trendItem.labels.indexOf(m);
                          if (idx === -1) return null;
                          if (selectedOutletFilter) {
                            const outletAtIdx = trendItem.outlets ? trendItem.outlets[idx] : null;
                            if (outletAtIdx !== selectedOutletFilter) return null;
                          }
                          return trendItem.values[idx];
                        });
                        dataQuantities = monthLabels.map((m: string) => {
                          const idx = trendItem.labels.indexOf(m);
                          return idx !== -1 && trendItem.quantities ? trendItem.quantities[idx] : null;
                        });
                        dataAmounts = monthLabels.map((m: string) => {
                          const idx = trendItem.labels.indexOf(m);
                          return idx !== -1 && trendItem.amounts ? trendItem.amounts[idx] : null;
                        });
                        dataOutlets = monthLabels.map((m: string) => {
                          const idx = trendItem.labels.indexOf(m);
                          return idx !== -1 && trendItem.outlets ? trendItem.outlets[idx] : null;
                        });
                        dataCostCenters = monthLabels.map((m: string) => {
                          const idx = trendItem.labels.indexOf(m);
                          return idx !== -1 && trendItem.costCenters ? trendItem.costCenters[idx] : null;
                        });
                      } else {
                        const singleVal = trendItem.latestUnitPrice || 0;
                        dataPoints = monthLabels.map((_, i) => (i === monthLabels.length - 1 || i === 0 ? singleVal : null));
                        dataQuantities = monthLabels.map(() => null);
                        dataAmounts = monthLabels.map(() => null);
                        dataOutlets = monthLabels.map(() => null);
                        dataCostCenters = monthLabels.map(() => null);
                      }

                      return {
                        label: trendItem.supplierName,
                        supplierName: trendItem.supplierName,
                        materialName: (trendItem as any).materialName || (trendItem as any).material_name || (typeof selectedMaterialForModal === 'string' ? selectedMaterialForModal : ((selectedMaterialForModal as any)?.material_name || (selectedMaterialForModal as any)?.material_code || (selectedMaterialForModal as any)?.material)) || '',
                        data: dataPoints,
                        borderColor: color,
                        backgroundColor: color,
                        borderWidth: 3,
                        pointRadius: 6,
                        pointHoverRadius: 9,
                        tension: 0.2,
                        fill: false,
                        quantities: dataQuantities,
                        amounts: dataAmounts,
                        outlets: dataOutlets,
                        costCenters: dataCostCenters,
                      };
                    });

                    let baselinePrice: number | null = null;
                    if (modalBaselineMonth) {
                      for (const d of modalSpendDetails) {
                        if ((d as any).baseline_unit_price && (d as any).baseline_unit_price > 0) {
                          baselinePrice = Number((d as any).baseline_unit_price);
                          break;
                        }
                        if (d.target_month_unit_price && d.target_month_unit_price > 0) {
                          baselinePrice = Number(d.target_month_unit_price);
                          break;
                        }
                      }
                      if (baselinePrice === null || baselinePrice <= 0) {
                        const validPrices: number[] = [];
                        activeTrends.forEach((trendItem) => {
                          if (trendItem.labels && trendItem.labels.length > 0) {
                            const idx = trendItem.labels.indexOf(modalBaselineMonth);
                            if (idx !== -1 && trendItem.values[idx] !== null && trendItem.values[idx] !== undefined && trendItem.values[idx]! > 0) {
                              validPrices.push(trendItem.values[idx]!);
                            }
                          } else if (trendItem.latestUnitPrice && trendItem.latestUnitPrice > 0) {
                            validPrices.push(trendItem.latestUnitPrice);
                          }
                        });
                        if (validPrices.length > 0) {
                          baselinePrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
                        }
                      }
                      if (baselinePrice === null || baselinePrice <= 0) {
                        const allPrices: number[] = [];
                        activeTrends.forEach((trendItem) => {
                          if (trendItem.values && trendItem.values.length > 0) {
                            trendItem.values.forEach(v => {
                              if (v !== null && v !== undefined && v > 0) allPrices.push(v);
                            });
                          }
                        });
                        if (allPrices.length > 0) {
                          baselinePrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
                        }
                      }
                    }

                    let targetPrice: number | null = null;
                    if (modalTargetMonth) {
                      for (const d of modalSpendDetails) {
                        if (d.target_month_unit_price && d.target_month_unit_price > 0) {
                          targetPrice = Number(d.target_month_unit_price);
                          break;
                        }
                      }
                      if (targetPrice === null || targetPrice <= 0) {
                        const validPrices: number[] = [];
                        activeTrends.forEach((trendItem) => {
                          if (trendItem.labels && trendItem.labels.length > 0) {
                            const idx = trendItem.labels.indexOf(modalTargetMonth);
                            if (idx !== -1 && trendItem.values[idx] !== null && trendItem.values[idx] !== undefined && trendItem.values[idx]! > 0) {
                              validPrices.push(trendItem.values[idx]!);
                            }
                          } else if (trendItem.latestUnitPrice && trendItem.latestUnitPrice > 0) {
                            validPrices.push(trendItem.latestUnitPrice);
                          }
                        });
                        if (validPrices.length > 0) {
                          targetPrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
                        }
                      }
                      if (targetPrice === null || targetPrice <= 0) {
                        const allPrices: number[] = [];
                        activeTrends.forEach((trendItem) => {
                          if (trendItem.values && trendItem.values.length > 0) {
                            trendItem.values.forEach(v => {
                              if (v !== null && v !== undefined && v > 0) allPrices.push(v);
                            });
                          }
                        });
                        if (allPrices.length > 0) {
                          targetPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
                        }
                      }
                    }

                    const datasets = [
                      ...supplierDatasets,
                      ...(modalBaselineMonth && baselinePrice !== null && baselinePrice > 0 ? [{
                        label: `Baseline Average (${modalBaselineMonth}): AED ${baselinePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        data: Array(monthLabels.length > 0 ? monthLabels.length : 1).fill(baselinePrice),
                        borderColor: '#ef4444',
                        borderWidth: 2.5,
                        borderDash: [6, 6],
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false,
                        tension: 0,
                      }] : []),
                      ...(modalTargetMonth && targetPrice !== null && targetPrice > 0 ? [{
                        label: `Target Average (${modalTargetMonth}): AED ${targetPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        data: Array(monthLabels.length > 0 ? monthLabels.length : 1).fill(targetPrice),
                        borderColor: '#10b981',
                        borderWidth: 2.5,
                        borderDash: [4, 4],
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false,
                        tension: 0,
                      }] : [])
                    ];

                    return (
                      <Line
                        data={{
                          labels: monthLabels,
                          datasets
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          onClick: (_event: any, activeElements: any[], chart: any) => {
                            if (activeElements && activeElements.length > 0) {
                              const el = activeElements[0];
                              const dataset = chart.data.datasets[el.datasetIndex];
                              if (dataset && dataset.label) {
                                const month = chart.data.labels[el.index];
                                const unitPrice = dataset.data[el.index];
                                const qty = dataset.quantities ? dataset.quantities[el.index] : null;
                                const amt = dataset.amounts ? dataset.amounts[el.index] : null;
                                const outlet = dataset.outlets ? dataset.outlets[el.index] : null;
                                const cc = dataset.costCenters ? dataset.costCenters[el.index] : null;
                                const matName = dataset.materialName || (typeof selectedMaterialForModal === 'string' ? selectedMaterialForModal : ((selectedMaterialForModal as any)?.material_name || (selectedMaterialForModal as any)?.material_code || (selectedMaterialForModal as any)?.material)) || (selectedAnomalyForModal as any)?.material_name || (selectedAnomalyForModal as any)?.material || (appliedFilters.materialCodes && appliedFilters.materialCodes[0]) || (appliedFilters.materialGroups && appliedFilters.materialGroups[0]) || '';
                                setUnitPriceClickedPoint(prev =>
                                  prev && prev.supplier === (dataset.supplierName || dataset.label) && prev.month === month && prev.material === matName
                                    ? null
                                    : {
                                      supplier: dataset.supplierName || dataset.label,
                                      material: matName,
                                      month,
                                      unitPrice: Number(unitPrice),
                                      qty: qty ?? null,
                                      amount: amt ?? null,
                                      outlet: Array.isArray(outlet) ? outlet : (outlet ? [String(outlet)] : []),
                                      costCenter: Array.isArray(cc) ? cc : (cc ? [String(cc)] : [])
                                    }
                                );
                              }
                            } else {
                              setUnitPriceClickedPoint(null);
                            }
                          },
                          plugins: {
                            legend: {
                              display: (modalBaselineMonth || modalTargetMonth) ? true : false,
                              position: 'top',
                              labels: {
                                filter: (item: any) => item.text.startsWith('Baseline') || item.text.startsWith('Target'),
                                font: { size: 9.5, weight: 600 }
                              }
                            },
                            tooltip: {
                              backgroundColor: '#0f172a',
                              titleFont: { size: 11, weight: 700 },
                              bodyFont: { size: 10 },
                              footerFont: { size: 10, weight: 600 },
                              footerColor: '#60a5fa',
                              padding: 10,
                              borderColor: '#334155',
                              borderWidth: 1,
                              callbacks: {
                                label: (ctx: any) => {
                                  const ds = ctx.dataset;
                                  const val = ctx.raw;
                                  if (val === null || val === undefined) return ` Unit Price: N/A`;
                                  let res = ` ${ds.label}: AED ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                  const dataIdx = ctx.dataIndex;
                                  if (ds.quantities && ds.quantities[dataIdx] !== null && ds.quantities[dataIdx] !== undefined) {
                                    res += ` | Qty: ${ds.quantities[dataIdx].toLocaleString()}`;
                                  }
                                  if (ds.amounts && ds.amounts[dataIdx] !== null && ds.amounts[dataIdx] !== undefined) {
                                    res += ` | Total: AED ${ds.amounts[dataIdx].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                  }
                                  return res;
                                },
                                footer: () => '📋 Click point on graph to copy details'
                              }
                            }
                          },
                          layout: {
                            padding: { bottom: 35, top: 10, left: 10, right: 25 }
                          },
                          scales: {
                            x: {
                              offset: true,
                              grid: { color: '#f1f5f9' },
                              ticks: {
                                color: '#0f172a',
                                font: { size: 9.5, weight: 600 },
                                autoSkip: false,
                                maxRotation: 45,
                                minRotation: 0,
                                padding: 8
                              }
                            },
                            y: {
                              grid: { color: '#f1f5f9' },
                              ticks: {
                                color: '#334155',
                                font: { size: 9.5, weight: 600 },
                                callback: (value: any) => `AED ${Number(value).toLocaleString()}`
                              }
                            }
                          }
                        }}
                      />
                    );
                  })()
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8', fontSize: '0.875rem' }}>
                    No unit price comparison data available.
                  </div>
                )}
              </div>

              {/* Clicked Point Detail Box - Fullscreen */}
              {unitPriceClickedPoint && (
                <div style={{ marginTop: '0.75rem', border: '1.5px solid #2563eb', borderRadius: '0.5rem', padding: '0.75rem 1rem', backgroundColor: '#eff6ff', position: 'relative', boxShadow: '0 2px 8px rgba(37,99,235,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', paddingBottom: '0.375rem', borderBottom: '1px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }} />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e40af' }}>{unitPriceClickedPoint.supplier}{' — '}{unitPriceClickedPoint.month}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const p = unitPriceClickedPoint;
                          let t = `Supplier: ${p.supplier}\nMonth: ${p.month}\nUnit Price: AED ${p.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          if (p.qty !== null) t += `\nTotal Qty: ${p.qty.toLocaleString()}`;
                          if (p.amount !== null) t += `\nTotal Spend: AED ${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          if (p.outlet) t += `\nOutlet: ${p.outlet}`;
                          if (p.costCenter) t += `\nCost Center: ${p.costCenter}`;
                          navigator.clipboard.writeText(t);
                          toast.success('Point details copied to clipboard!');
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', fontSize: '0.6875rem', fontWeight: 700, backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                        title="Copy details to clipboard"
                      >
                        <Copy width={12} height={12} />
                        <span>Copy Details</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnitPriceClickedPoint(null)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '0.875rem', lineHeight: 1 }}
                        title="Close Box"
                      >✕</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem', fontSize: '0.75rem', color: '#1e293b' }}>
                    <span><strong>Unit Price:</strong> AED {unitPriceClickedPoint.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    {unitPriceClickedPoint.qty !== null && <span><strong>Qty:</strong> {unitPriceClickedPoint.qty.toLocaleString()}</span>}
                    {unitPriceClickedPoint.outlet && <span><strong>Outlet:</strong> {unitPriceClickedPoint.outlet}</span>}
                    {unitPriceClickedPoint.costCenter && <span><strong>Cost Center:</strong> {unitPriceClickedPoint.costCenter}</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Supplier Details Slide-over Right Drawer */}
          {isSupplierModalOpen && selectedSupplierForModal && (
            <div className="proc-drawer-overlay" onClick={() => setIsSupplierModalOpen(false)}>
              <div className="proc-drawer-content" onClick={(e) => e.stopPropagation()}>
                <div className="proc-drawer-header">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 className="proc-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Supplier Details</h3>
                      <span className="kraljic-quadrant-count-badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>Detailed View</span>
                    </div>
                    <span className="proc-modal-subtitle" style={{ fontSize: '0.8125rem', color: '#475569', fontWeight: 600 }}>{supplierModalItem?.supplier_name || selectedSupplierForModal.supplier}</span>
                  </div>
                  <button className="proc-modal-close-btn" onClick={() => setIsSupplierModalOpen(false)} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: '0.375rem', transition: 'all 0.2s ease' }} title="Close Panel">
                    <X width={18} height={18} />
                  </button>
                </div>

                <div className="proc-drawer-body">
                  {/* Summary Stats Row */}
                  <div className="proc-modal-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                    <div className="proc-modal-stat-card">
                      <span className="proc-modal-stat-label">Total Spend</span>
                      <span className="proc-modal-stat-value" style={{ color: '#059669' }}>
                        AED {(supplierModalItem?.total_spend ?? selectedSupplierForModal.total_spend)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="proc-modal-stat-card">
                      <span className="proc-modal-stat-label">Total Quantity</span>
                      <span className="proc-modal-stat-value">
                        {supplierModalItem?.total_quantity !== undefined && supplierModalItem?.total_quantity !== null
                          ? Number(supplierModalItem.total_quantity).toLocaleString()
                          : '-'}
                      </span>
                    </div>
                    <div className="proc-modal-stat-card">
                      <span className="proc-modal-stat-label">Total Materials</span>
                      <span className="proc-modal-stat-value">
                        {supplierModalItem?.total_materials ?? supplierModalItem?.total_items ?? supplierModalDetails.length}
                      </span>
                    </div>
                    <div className="proc-modal-stat-card">
                      <span className="proc-modal-stat-label">Supplier Name</span>
                      <span className="proc-modal-stat-value" title={supplierModalItem?.supplier_name || selectedSupplierForModal.supplier}>
                        {supplierModalItem?.supplier_name || selectedSupplierForModal.supplier}
                      </span>
                    </div>
                  </div>

                  {/* Tabs/Compare Toggle */}
                  <div className="proc-modal-controls">
                    <div className="proc-type-tabs-group" style={{ backgroundColor: '#f1f5f9' }}>
                      <button
                        type="button"
                        className={`proc-toggle-pill-btn ${supplierModalView === 'chart' ? 'active' : ''}`}
                        onClick={() => setSupplierModalView('chart')}
                      >
                        Material Chart
                      </button>
                      <button
                        type="button"
                        className={`proc-toggle-pill-btn ${supplierModalView === 'compare' ? 'active' : ''}`}
                        onClick={() => setSupplierModalView('compare')}
                      >
                        Detailed Table
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {/* Search Field Beside Download Excel */}
                      <div className="proc-modal-search-box">
                        <Search width={14} height={14} className="proc-modal-search-icon" />
                        <input
                          type="text"
                          placeholder="Search material / code..."
                          value={supplierModalSearchQuery}
                          onChange={(e) => setSupplierModalSearchQuery(e.target.value)}
                          className="proc-modal-search-input"
                          style={{ width: '180px' }}
                        />
                        {supplierModalSearchQuery && (
                          <X
                            width={12}
                            height={12}
                            onClick={() => setSupplierModalSearchQuery('')}
                            className="proc-modal-search-clear"
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleDownloadSupplierModalExcel}
                        title="Download Supplier Details Excel"
                        className="proc-modal-btn-download"
                      >
                        <Download width={12} height={12} /> Excel
                      </button>
                    </div>
                  </div>

                  {supplierModalLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                      <SpinnerLoaders size="medium" text="Loading supplier details..." fullScreen={false} />
                    </div>
                  ) : (
                    <div className="proc-modal-view-container" style={{ marginTop: '1rem' }}>
                      {(() => {
                        const filteredSupplierDetails = supplierModalDetails.filter((item: any) => {
                          if (!supplierModalSearchQuery.trim()) return true;
                          const q = supplierModalSearchQuery.toLowerCase().trim();
                          const matName = (item.material_name || item.item_name || item.name || '').toLowerCase();
                          const matGroup = (item.material_group || '').toLowerCase();
                          return matName.includes(q) || matGroup.includes(q);
                        });

                        const handleSupplierSort = (field: 'name' | 'quantity' | 'unit_price' | 'spend' | 'updated_on') => {
                          if (supplierSortField === field) {
                            setSupplierSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSupplierSortField(field);
                            setSupplierSortOrder('desc');
                          }
                        };

                        const sortedSupplierDetails = [...filteredSupplierDetails].sort((a: any, b: any) => {
                          let valA: any;
                          let valB: any;
                          if (supplierSortField === 'name') {
                            valA = (a.material_name || a.item_name || a.name || '').toLowerCase();
                            valB = (b.material_name || b.item_name || b.name || '').toLowerCase();
                          } else if (supplierSortField === 'quantity') {
                            valA = Number(a.total_quantity) || 0;
                            valB = Number(b.total_quantity) || 0;
                          } else if (supplierSortField === 'unit_price') {
                            valA = Number(a.latest_unit_price ?? a.unit_price) || 0;
                            valB = Number(b.latest_unit_price ?? b.unit_price) || 0;
                          } else if (supplierSortField === 'spend') {
                            valA = Number(a.total_spend) || 0;
                            valB = Number(b.total_spend) || 0;
                          } else if (supplierSortField === 'updated_on') {
                            valA = a.updated_on || '';
                            valB = b.updated_on || '';
                          }
                          if (valA < valB) return supplierSortOrder === 'asc' ? -1 : 1;
                          if (valA > valB) return supplierSortOrder === 'asc' ? 1 : -1;
                          return 0;
                        });

                        const renderSortIcon = (field: 'name' | 'quantity' | 'unit_price' | 'spend' | 'updated_on') => {
                          const isActive = supplierSortField === field;
                          if (!isActive) {
                            return <ArrowUpDown width={12} height={12} style={{ color: '#94a3b8', flexShrink: 0 }} />;
                          }
                          return supplierSortOrder === 'asc' ? (
                            <ArrowUp width={12} height={12} style={{ color: '#2563eb', flexShrink: 0 }} />
                          ) : (
                            <ArrowDown width={12} height={12} style={{ color: '#2563eb', flexShrink: 0 }} />
                          );
                        };

                        return supplierModalView === 'chart' ? (
                          <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', overflowX: 'hidden', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.75rem' }}>
                            {sortedSupplierDetails.length > 0 ? (() => {
                              const maxSpend = Math.max(...sortedSupplierDetails.map((item: any) => Number(item.total_spend) || 0), 1);
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {sortedSupplierDetails.map((item: any, idx: number) => {
                                    const spend = Number(item.total_spend) || 0;
                                    const pct = Math.max((spend / maxSpend) * 100, 3);
                                    const label = item.material_name || item.item_name || item.name || 'Unknown';
                                    const shortLabel = label.length > 42 ? label.substring(0, 39) + '…' : label;
                                    return (
                                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div title={label} style={{ width: '230px', minWidth: '230px', fontSize: '0.6875rem', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', paddingRight: '6px' }}>
                                          {shortLabel}
                                        </div>
                                        <div style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: '4px', height: '16px' }}>
                                          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#059669', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                                        </div>
                                        <div style={{ minWidth: '90px', fontSize: '0.6875rem', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>
                                          AED {spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })() : (
                              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8', fontSize: '0.75rem' }}>
                                No matching materials found.
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ maxHeight: 'calc(100vh - 280px)', minHeight: '350px', overflowY: 'auto', overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', scrollbarGutter: 'stable' }}>
                            <table className="proc-data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc' }}>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                  <th
                                    onClick={() => handleSupplierSort('name')}
                                    style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: supplierSortField === 'name' ? '#2563eb' : '#475569', textTransform: 'uppercase', textAlign: 'left', width: '38%', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                    title="Click to sort by Material Name"
                                  >
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                                      <span>Material / Item Name</span>
                                      {renderSortIcon('name')}
                                    </span>
                                  </th>
                                  <th
                                    onClick={() => handleSupplierSort('quantity')}
                                    style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: supplierSortField === 'quantity' ? '#2563eb' : '#475569', textTransform: 'uppercase', textAlign: 'right', width: '14%', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                    title="Click to sort by Total Quantity"
                                  >
                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem', width: '100%' }}>
                                      <span>Total Quantity</span>
                                      {renderSortIcon('quantity')}
                                    </span>
                                  </th>
                                  <th
                                    onClick={() => handleSupplierSort('unit_price')}
                                    style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: supplierSortField === 'unit_price' ? '#2563eb' : '#475569', textTransform: 'uppercase', textAlign: 'right', width: '18%', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                    title="Click to sort by Latest Unit Price"
                                  >
                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem', width: '100%' }}>
                                      <span>Latest Unit Price (AED)</span>
                                      {renderSortIcon('unit_price')}
                                    </span>
                                  </th>
                                  <th
                                    onClick={() => handleSupplierSort('spend')}
                                    style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: supplierSortField === 'spend' ? '#2563eb' : '#475569', textTransform: 'uppercase', textAlign: 'right', width: '16%', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                    title="Click to sort by Total Spend"
                                  >
                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem', width: '100%' }}>
                                      <span>Total Spend (AED)</span>
                                      {renderSortIcon('spend')}
                                    </span>
                                  </th>
                                  <th
                                    onClick={() => handleSupplierSort('updated_on')}
                                    style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: supplierSortField === 'updated_on' ? '#2563eb' : '#475569', textTransform: 'uppercase', textAlign: 'center', width: '14%', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                    title="Click to sort by Last Updated"
                                  >
                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', width: '100%' }}>
                                      <span>Last Updated</span>
                                      {renderSortIcon('updated_on')}
                                    </span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortedSupplierDetails.map((item: any, idx: number) => {
                                  const unitPrice = item.latest_unit_price ?? item.unit_price;
                                  return (
                                    <tr key={idx} className="proc-detail-tr">
                                      <td className="proc-detail-td" style={{ fontWeight: 600, color: '#0f172a' }}>
                                        {item.material_name || item.item_name || item.name || '-'}
                                      </td>
                                      <td className="proc-detail-td" style={{ textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                                        {item.total_quantity !== undefined && item.total_quantity !== null ? Number(item.total_quantity).toLocaleString() : '-'}
                                      </td>
                                      <td
                                        className="proc-detail-td supplier-name-cell"
                                        style={{ textAlign: 'right' }}
                                        onClick={() => {
                                          const matName = item.material_name || item.item_name || item.name || '';
                                          const matObj = { material_name: matName, total_spend: item.total_spend || 0 };
                                          setSelectedMaterialForModal(matObj);
                                          setIsMaterialModalOpen(true);
                                          setDisabledSuppliersForUnitPriceChart([]);
                                          loadModalSpendDetails(matObj);
                                          loadAllModalUnitPriceTrends(matName, [{ supplier_name: supplierModalItem?.supplier_name || selectedSupplierForModal?.supplier || '', unit_price: unitPrice }]);
                                        }}
                                      >
                                        {unitPrice !== undefined && unitPrice !== null ? Number(unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                      </td>
                                      <td className="proc-detail-td" style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                                        {item.total_spend !== undefined && item.total_spend !== null ? Number(item.total_spend).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                      </td>
                                      <td className="proc-detail-td" style={{ textAlign: 'center', color: '#64748b', whiteSpace: 'nowrap' }}>
                                        {formatDateTimeDisplay(item.updated_on)}
                                      </td>
                                    </tr>
                                  );
                                })}
                                {sortedSupplierDetails.length === 0 && (
                                  <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                      No details found.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Category Details Modal */}
          {isCategoryModalOpen && selectedCategoryForModal && (
            <div className="proc-modal-overlay" onClick={() => setIsCategoryModalOpen(false)}>
              <div className="proc-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="proc-modal-header">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <h3 className="proc-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Category Details</h3>
                    <span className="proc-modal-subtitle">{selectedCategoryForModal.category}</span>
                  </div>
                  <button className="proc-modal-close-btn" onClick={() => setIsCategoryModalOpen(false)} style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: '0.375rem', transition: 'all 0.2s ease' }} title="Close Modal">
                    <X width={18} height={18} />
                  </button>
                </div>

                <div className="proc-drawer-body">
                  {/* Summary Stats Row */}
                  <div className="proc-modal-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="proc-modal-stat-card">
                      <span className="proc-modal-stat-label">Total Spend</span>
                      <span className="proc-modal-stat-value">
                        AED {selectedCategoryForModal.total_spend?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="proc-modal-stat-card">
                      <span className="proc-modal-stat-label">Total Items</span>
                      <span className="proc-modal-stat-value">
                        {categoryModalTotalCount || categoryModalDetails.length}
                      </span>
                    </div>
                    <div className="proc-modal-stat-card">
                      <span className="proc-modal-stat-label">Category Group</span>
                      <span className="proc-modal-stat-value" title={selectedCategoryForModal.category}>
                        {selectedCategoryForModal.category}
                      </span>
                    </div>
                  </div>

                  {/* Tabs/Compare Toggle */}
                  <div className="proc-modal-controls">
                    <div className="proc-type-tabs-group" style={{ backgroundColor: '#f1f5f9' }}>
                      <button
                        type="button"
                        className={`proc-toggle-pill-btn ${categoryModalView === 'chart' ? 'active' : ''}`}
                        onClick={() => setCategoryModalView('chart')}
                      >
                        Spend Chart
                      </button>
                      <button
                        type="button"
                        className={`proc-toggle-pill-btn ${categoryModalView === 'compare' ? 'active' : ''}`}
                        onClick={() => setCategoryModalView('compare')}
                      >
                        Detailed Table
                      </button>
                    </div>

                    <button
                      type="button"
                      className={`proc-forecast-step-btn ${categoryModalView === 'compare' ? 'active' : ''}`}
                      onClick={() => setCategoryModalView(categoryModalView === 'compare' ? 'chart' : 'compare')}
                    >
                      {categoryModalView === 'compare' ? 'Show Chart' : 'Show Details'}
                    </button>
                  </div>

                  {categoryModalLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                      <SpinnerLoaders size="medium" text="Loading category details..." fullScreen={false} />
                    </div>
                  ) : (
                    <div className="proc-modal-view-container" style={{ marginTop: '1rem' }}>
                      {categoryModalView === 'chart' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                              Top 15 Items by Total Spend (out of {categoryModalDetails.length} total items)
                            </span>
                            <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                              Switch to <strong>Detailed Table</strong> tab to view all {categoryModalDetails.length} items
                            </span>
                          </div>
                          {categoryModalDetails.length > 0 ? (() => {
                            const topCategoryItems = [...categoryModalDetails]
                              .sort((a, b) => (Number(b.total_spend) || 0) - (Number(a.total_spend) || 0))
                              .slice(0, 15);
                            const dynamicHeight = Math.max(380, topCategoryItems.length * 28);
                            return (
                              <div style={{ height: `${dynamicHeight}px`, minHeight: '380px', position: 'relative' }}>
                                <Bar
                                  data={{
                                    labels: topCategoryItems.map((item: any) => item.material_name || item.supplier_name || 'Unknown'),
                                    datasets: [
                                      {
                                        label: 'Total Spend',
                                        data: topCategoryItems.map((item: any) => Number(item.total_spend) || 0),
                                        backgroundColor: '#3b82f6',
                                        hoverBackgroundColor: '#2563eb',
                                        borderRadius: 6,
                                        barThickness: 18,
                                      }
                                    ]
                                  }}
                                  options={{
                                    indexAxis: 'y',
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                      legend: { display: false },
                                      tooltip: {
                                        backgroundColor: '#1e293b',
                                        padding: 10,
                                        cornerRadius: 6,
                                        callbacks: {
                                          label: (ctx: any) => ` Total Spend: AED ${ctx.raw?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                        }
                                      }
                                    },
                                    scales: {
                                      x: {
                                        grid: { color: '#f1f5f9' },
                                        ticks: {
                                          color: '#64748b',
                                          font: { size: 10, weight: 600 },
                                          callback: (value: any) => formatGraphValue(value as number)
                                        }
                                      },
                                      y: {
                                        grid: { display: false },
                                        ticks: {
                                          color: '#334155',
                                          font: { size: 10, weight: 600 },
                                          callback: function (this: any, val: any) {
                                            const label = this.getLabelForValue(val);
                                            return label.length > 35 ? label.substring(0, 32) + '...' : label;
                                          }
                                        }
                                      }
                                    }
                                  }}
                                />
                              </div>
                            );
                          })() : (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px', color: '#94a3b8', fontSize: '0.75rem' }}>
                              No detail data found for category.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
                          <div style={{ maxHeight: 'calc(100vh - 280px)', minHeight: '450px', overflowY: 'auto', overflowX: 'auto', scrollbarGutter: 'stable' }}>
                            <table className="proc-data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f8fafc' }}>
                                <tr className="abc-table-header-row">
                                  <th className="proc-detail-th">Supplier Name</th>
                                  <th className="proc-detail-th">Material / Service Name</th>
                                  <th className="proc-detail-th" style={{ textAlign: 'right' }}>Total Spend (AED)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const paginatedCategoryDetails = categoryModalDetails.slice(
                                    (categoryModalPage - 1) * categoryModalPageSize,
                                    categoryModalPage * categoryModalPageSize
                                  );

                                  return paginatedCategoryDetails.map((item: any, idx: number) => (
                                    <tr key={idx} className="proc-detail-tr">
                                      <td
                                        className={`proc-detail-td ${item.supplier_name ? 'supplier-name-cell' : ''}`}
                                        title={item.supplier_name ? `Click to view supplier details for "${item.supplier_name}"` : ''}
                                        onClick={() => {
                                          if (item.supplier_name && item.supplier_name !== '-') {
                                            handleSupplierBarClick({ supplier: item.supplier_name, total_spend: Number(item.total_spend) || 0 });
                                          }
                                        }}
                                      >
                                        {item.supplier_name || '-'}
                                      </td>
                                      <td
                                        className={`proc-detail-td ${item.material_name ? 'supplier-name-cell' : ''}`}
                                        title={item.material_name ? `Click to view spend breakdown for "${item.material_name}"` : ''}
                                        onClick={() => {
                                          if (item.material_name && item.material_name !== '-') {
                                            handleBarRowClick({ material_name: item.material_name, total_spend: Number(item.total_spend) || 0 });
                                          }
                                        }}
                                      >
                                        {item.material_name || '-'}
                                      </td>
                                      <td className="proc-detail-td" style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                        {item.total_spend ? Number(item.total_spend).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                      </td>
                                    </tr>
                                  ));
                                })()}
                                {categoryModalDetails.length === 0 && (
                                  <tr>
                                    <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                      No details found.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Pagination Control Bar with < > buttons & Per Page selector */}
                          {categoryModalDetails.length > 0 && (() => {
                            const totalItemsCount = categoryModalDetails.length;
                            const totalPages = Math.ceil(totalItemsCount / categoryModalPageSize) || 1;
                            const startItem = (categoryModalPage - 1) * categoryModalPageSize + 1;
                            const endItem = Math.min(categoryModalPage * categoryModalPageSize, totalItemsCount);

                            // Calculate smart 5-button window around active page
                            const windowSize = 5;
                            let startPg = Math.max(1, categoryModalPage - 2);
                            let endPg = Math.min(totalPages, startPg + windowSize - 1);
                            if (endPg - startPg + 1 < windowSize) {
                              startPg = Math.max(1, endPg - windowSize + 1);
                            }
                            const visiblePages = Array.from({ length: endPg - startPg + 1 }, (_, i) => startPg + i);

                            return (
                              <div className="proc-saved-pagination-bar">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                                    Showing {startItem} to {endItem} of {categoryModalTotalCount || totalItemsCount} items
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Per page:</span>
                                    <select
                                      value={categoryModalPageSize}
                                      onChange={(e) => {
                                        setCategoryModalPageSize(Number(e.target.value));
                                        setCategoryModalPage(1);
                                      }}
                                      className="proc-pagination-per-page"
                                    >
                                      <option value={10}>10</option>
                                      <option value={25}>25</option>
                                      <option value={50}>50</option>
                                      <option value={100}>100</option>
                                      <option value={totalItemsCount || 500}>All ({totalItemsCount})</option>
                                    </select>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                  <button
                                    type="button"
                                    disabled={categoryModalPage <= 1}
                                    onClick={() => setCategoryModalPage(prev => Math.max(1, prev - 1))}
                                    className={`proc-page-btn ${categoryModalPage <= 1 ? 'disabled' : ''}`}
                                    title="Previous Page (<)"
                                  >
                                    &lt;
                                  </button>

                                  {visiblePages.map((pg) => (
                                    <button
                                      key={pg}
                                      type="button"
                                      onClick={() => setCategoryModalPage(pg)}
                                      className={`proc-page-btn ${categoryModalPage === pg ? 'active' : ''}`}
                                    >
                                      {pg}
                                    </button>
                                  ))}

                                  <button
                                    type="button"
                                    disabled={categoryModalPage >= totalPages}
                                    onClick={() => setCategoryModalPage(prev => Math.min(totalPages, prev + 1))}
                                    className={`proc-page-btn ${categoryModalPage >= totalPages ? 'disabled' : ''}`}
                                    title="Next Page (>)"
                                  >
                                    &gt;
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {modalView === 'saved_details' && (
                        <div className="proc-saved-details-container">
                          {/* Summary Stats Row */}
                          <div className="proc-saved-summary-grid">
                            <div className="proc-saved-card-green">
                              <span className="proc-saved-card-label-green">Overall Saved Amount</span>
                              <span className="proc-saved-card-val-green">
                                AED {savingsHistoryOverallTotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="proc-saved-card-slate">
                              <span className="proc-saved-card-label-slate">Total Savings Mode Records</span>
                              <span className="proc-saved-card-val-slate">
                                {savingsHistoryTotalMode || savingsHistoryItems.length}
                              </span>
                            </div>
                            <div className="proc-saved-card-slate">
                              <span className="proc-saved-card-label-slate">Total Records</span>
                              <span className="proc-saved-card-val-slate">
                                {savingsHistoryTotalCount || savingsHistoryItems.length}
                              </span>
                            </div>
                          </div>

                          {/* Search & Filter Bar */}
                          <div className="proc-saved-toolbar">
                            <div className="proc-saved-search-wrapper">
                              <Search width={14} height={14} className="proc-saved-search-icon" />
                              <input
                                type="text"
                                placeholder="Search material / supplier..."
                                value={savingsHistorySearch}
                                onChange={(e) => setSavingsHistorySearch(e.target.value)}
                                className="proc-saved-search-input"
                              />
                              {savingsHistorySearch && (
                                <X
                                  width={12}
                                  height={12}
                                  onClick={() => setSavingsHistorySearch('')}
                                  className="proc-saved-search-clear"
                                />
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => loadSavingsModeHistory(savingsHistoryPage, savingsHistoryPageSize)}
                              className="proc-saved-refresh-btn"
                            >
                              <RotateCcw width={12} height={12} /> Refresh History
                            </button>
                          </div>

                          {/* Saved Details Table */}
                          {savingsHistoryLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                              <SpinnerLoaders size="medium" text="Loading saved details history..." fullScreen={false} />
                            </div>
                          ) : (
                            <div className="proc-saved-table-wrap">
                              <table className="proc-data-table proc-saved-table">
                                <thead className="proc-saved-thead">
                                  <tr className="proc-saved-tr-head">
                                    <th style={{ padding: '0.625rem 0.875rem' }}>Material Name</th>
                                    <th style={{ padding: '0.625rem 0.875rem' }}>Supplier Name</th>
                                    <th style={{ padding: '0.625rem 0.875rem', textAlign: 'right' }}>Latest Price (AED)</th>
                                    <th style={{ padding: '0.625rem 0.875rem', textAlign: 'right' }}>Saved Amount (AED)</th>
                                    <th style={{ padding: '0.625rem 0.875rem', textAlign: 'center' }}>Savings Flag</th>
                                    <th style={{ padding: '0.625rem 0.875rem', textAlign: 'center' }}>Latest Updated</th>
                                    <th style={{ padding: '0.625rem 0.875rem', textAlign: 'center' }}>History Logs</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    const filtered = savingsHistoryItems.filter((item: any) => {
                                      if (!savingsHistorySearch.trim()) return true;
                                      const q = savingsHistorySearch.toLowerCase().trim();
                                      const m = (item.material_name || '').toLowerCase();
                                      const s = (item.supplier_name || '').toLowerCase();
                                      return m.includes(q) || s.includes(q);
                                    });

                                    if (filtered.length === 0) {
                                      return (
                                        <tr>
                                          <td colSpan={7} style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                                            <div className="proc-saved-empty-container">
                                              <span style={{ fontSize: '1.75rem' }}>ℹ️</span>
                                              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
                                                {selectedMaterialForModal?.material_name
                                                  ? `No savings details saved for "${selectedMaterialForModal.material_name}"`
                                                  : 'No savings mode details found'}
                                              </span>
                                              <span style={{ fontSize: '0.75rem', color: '#64748b', maxWidth: '420px', lineHeight: 1.4 }}>
                                                No savings mode records have been saved for this material yet. Use the <strong>Save Mode</strong> toggle in Comparison Details or <strong>Bulk Savings</strong> to save price baseline benchmarks.
                                              </span>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    }

                                    const paginated = filtered.slice(
                                      (savingsHistoryPage - 1) * savingsHistoryPageSize,
                                      savingsHistoryPage * savingsHistoryPageSize
                                    );

                                    return paginated.map((item: any, idx: number) => {
                                      const isExpanded = expandedHistoryRowIdx === idx;
                                      const historyList = item.history || [];
                                      return (
                                        <React.Fragment key={idx}>
                                          <tr className="proc-detail-tr">
                                            <td className="proc-detail-td" style={{ fontWeight: 600, color: '#2563eb' }}>
                                              {item.material_name || '-'}
                                            </td>
                                            <td className="proc-detail-td" style={{ fontWeight: 500 }}>
                                              {item.supplier_name || '-'}
                                            </td>
                                            <td className="proc-detail-td" style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                              AED {Number(item.latest_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="proc-detail-td" style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                              AED {Number(item.total_saved_per_record || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="proc-detail-td" style={{ textAlign: 'center' }}>
                                              <span className={item.current_flag ? "proc-saved-badge-active" : "proc-saved-badge-disabled"}>
                                                {item.current_flag ? 'Active (Saved)' : 'Disabled'}
                                              </span>
                                            </td>
                                            <td className="proc-detail-td" style={{ textAlign: 'center', color: '#64748b', fontSize: '0.6875rem', whiteSpace: 'nowrap' }}>
                                              {formatDateTimeDisplay(item.latest_updated_on)}
                                            </td>
                                            <td className="proc-detail-td" style={{ textAlign: 'center' }}>
                                              <button
                                                type="button"
                                                onClick={() => setExpandedHistoryRowIdx(isExpanded ? null : idx)}
                                                className={isExpanded ? "proc-saved-log-btn-active" : "proc-saved-log-btn-inactive"}
                                              >
                                                📜 {historyList.length || item.history_count || 0} Logs {isExpanded ? '▲' : '▼'}
                                              </button>
                                            </td>
                                          </tr>
                                          {isExpanded && (
                                            <tr style={{ backgroundColor: '#f0f9ff' }}>
                                              <td colSpan={7} style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #bae6fd' }}>
                                                <div className="proc-audit-trail-card">
                                                  📜 Audit History Trail ({item.material_name} — {item.supplier_name})
                                                </div>
                                                <table className="proc-audit-table">
                                                  <thead>
                                                    <tr style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 700, textAlign: 'left' }}>
                                                      <th className="proc-detail-th">ID</th>
                                                      <th className="proc-detail-th">Updated On</th>
                                                      <th className="proc-detail-th" style={{ textAlign: 'right' }}>Price (AED)</th>
                                                      <th className="proc-detail-th" style={{ textAlign: 'center' }}>Flag</th>
                                                      <th className="proc-detail-th" style={{ textAlign: 'right' }}>Saved Amount (AED)</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {historyList.map((h: any, hIdx: number) => (
                                                      <tr key={hIdx} className="proc-detail-tr">
                                                        <td className="proc-detail-td" style={{ fontWeight: 600 }}>#{h.id}</td>
                                                        <td className="proc-detail-td" style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{formatDateTimeDisplay(h.updated_on)}</td>
                                                        <td className="proc-detail-td" style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>AED {Number(h.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                        <td className="proc-detail-td" style={{ textAlign: 'center' }}>
                                                          <span style={{ color: h.flag ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{h.flag ? 'True' : 'False'}</span>
                                                        </td>
                                                        <td className="proc-detail-td" style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>AED {Number(h.saved_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </td>
                                            </tr>
                                          )}
                                        </React.Fragment>
                                      );
                                    });
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Saved Details Pagination Footer */}
                          {savingsHistoryItems.length > 0 && (() => {
                            const totalItemsCount = savingsHistoryItems.length;
                            const totalPages = Math.ceil(totalItemsCount / savingsHistoryPageSize) || 1;
                            const startItem = (savingsHistoryPage - 1) * savingsHistoryPageSize + 1;
                            const endItem = Math.min(savingsHistoryPage * savingsHistoryPageSize, totalItemsCount);

                            return (
                              <div className="proc-saved-pagination-bar">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                                    Showing {startItem} to {endItem} of {savingsHistoryTotalCount || totalItemsCount} items
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Per page:</span>
                                    <select
                                      value={savingsHistoryPageSize}
                                      onChange={(e) => {
                                        setSavingsHistoryPageSize(Number(e.target.value));
                                        setSavingsHistoryPage(1);
                                      }}
                                      className="proc-pagination-per-page"
                                    >
                                      <option value={10}>10</option>
                                      <option value={25}>25</option>
                                      <option value={50}>50</option>
                                      <option value={totalItemsCount || 100}>All ({totalItemsCount})</option>
                                    </select>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                  <button
                                    type="button"
                                    disabled={savingsHistoryPage <= 1}
                                    onClick={() => setSavingsHistoryPage(prev => Math.max(1, prev - 1))}
                                    className={`proc-page-btn ${savingsHistoryPage <= 1 ? 'disabled' : ''}`}
                                  >
                                    &lt;
                                  </button>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155', padding: '0 0.25rem' }}>
                                    Page {savingsHistoryPage} of {totalPages}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={savingsHistoryPage >= totalPages}
                                    onClick={() => setSavingsHistoryPage(prev => Math.min(totalPages, prev + 1))}
                                    className={`proc-page-btn ${savingsHistoryPage >= totalPages ? 'disabled' : ''}`}
                                  >
                                    &gt;
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen Graph View Overlay Modal */}
          {isGraphFullscreen && selectedMaterialForModal && (
            <div className="proc-modal-overlay" style={{ zIndex: 10000, backgroundColor: '#ffffff', flexDirection: 'column', padding: '1rem 1.25rem 2rem 1.25rem', overflowY: 'auto' }}>
              {/* Fullscreen Header */}
              <div className="proc-drawer-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                      {modalView === 'supplier_unit_price' ? 'Supplier Unit Price Trend Analysis' : 'Material Unit Price & Baseline Trend Analysis'}
                    </h2>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '0.25rem', backgroundColor: '#2563eb', color: '#ffffff' }}>
                      Full Screen Mode [ ]
                    </span>
                  </div>
                  <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 600 }}>
                    {selectedMaterialForModal.material_name}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Fullscreen View Switcher Tabs */}
                  <div className="proc-type-tabs-group" style={{ backgroundColor: '#e2e8f0' }}>
                    <button
                      type="button"
                      className={`proc-toggle-pill-btn ${modalView !== 'supplier_unit_price' ? 'active' : ''}`}
                      onClick={() => {
                        setModalView('unit_price');
                        if (selectedMaterialForModal) {
                          loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, modalBaselineMonth, selectedOutletFilter, 'unit_price');
                        }
                      }}
                    >
                      Unit Price Trend
                    </button>
                    <button
                      type="button"
                      className={`proc-toggle-pill-btn ${modalView === 'supplier_unit_price' ? 'active' : ''}`}
                      onClick={() => {
                        setModalView('supplier_unit_price');
                        if (selectedMaterialForModal) {
                          const match = modalSpendDetails.find((d: any) => d.supplier_name === selectedSupplierFilterForModal);
                          loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, [match || modalSpendDetails[0]], modalBaselineMonth, selectedOutletFilter, 'supplier_unit_price');
                        }
                      }}
                    >
                      Supplier Trend
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsGraphFullscreen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.45rem 0.875rem',
                      borderRadius: '0.375rem',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#334155',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s ease'
                    }}
                    title="Exit Fullscreen Mode (Esc)"
                  >
                    <Minimize2 width={16} height={16} />
                    <span>Exit Full Screen [ ]</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsGraphFullscreen(false)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: '0.25rem', borderRadius: '0.375rem' }}
                    title="Close Fullscreen View"
                  >
                    <X width={24} height={24} />
                  </button>
                </div>
              </div>

              {/* Fullscreen Controls Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', backgroundColor: '#f8fafc', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginBottom: '0.75rem' }}>
                {/* Top Row: Header (Left) + Filters (Right) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {modalView === 'supplier_unit_price' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                        Supplier:
                      </span>
                      <select
                        value={selectedSupplierFilterForModal}
                        onChange={(e) => {
                          const sName = e.target.value;
                          setSelectedSupplierFilterForModal(sName);
                          const match = modalSpendDetails.find((d: any) => d.supplier_name === sName);
                          loadAllModalUnitPriceTrends(
                            selectedMaterialForModal.material_name,
                            [match || { supplier_name: sName }],
                            modalBaselineMonth,
                            selectedOutletFilter,
                            'supplier_unit_price'
                          );
                        }}
                        style={{
                          padding: '0.375rem 0.625rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          border: '1.5px solid #2563eb',
                          borderRadius: '0.375rem',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          outline: 'none',
                          cursor: 'pointer',
                          maxWidth: '280px'
                        }}
                      >
                        {modalSpendDetails.map((sup: any, idx: number) => {
                          const name = sup.supplier_name || `Supplier ${idx + 1}`;
                          return (
                            <option key={name + idx} value={name}>
                              {name}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ) : (
                    <span className="proc-modal-supplier-hint">
                      Click Supplier to Erase/Restore Line:
                    </span>
                  )}

                  {/* Daily Trend Checkbox (Inside Fullscreen) */}
                  {modalView === 'supplier_unit_price' && (
                    <label className={`proc-modal-checkbox-label ${isDailyTrendActive ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isDailyTrendActive}
                        onChange={(e) => setIsDailyTrendActive(e.target.checked)}
                        className="proc-modal-checkbox-input"
                      />
                      <span>Daily Trend</span>
                    </label>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* Outlet Filter (for Unit Price Trend) */}
                    {modalView !== 'supplier_unit_price' && (() => {
                      const allOutlets = Array.from(new Set(
                        modalUnitPriceTrendsMap.flatMap(t => (t.outlets || []).filter(Boolean) as string[])
                      )).sort();
                      if (allOutlets.length === 0) return null;
                      return (
                        <div className="proc-modal-filter-item">
                          <span className="proc-modal-filter-label">Outlet:</span>
                          <select
                            value={selectedOutletFilter}
                            onChange={(e) => {
                              const selectedOutlet = e.target.value;
                              setSelectedOutletFilter(selectedOutlet);
                              if (selectedMaterialForModal) {
                                loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, modalBaselineMonth, selectedOutlet, 'unit_price');
                              }
                            }}
                            className={`proc-modal-outlet-select ${selectedOutletFilter ? 'active' : ''}`}
                          >
                            <option value="">All Outlets</option>
                            {allOutlets.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      );
                    })()}
                    {/* From Date Filter */}
                    <div className="proc-modal-filter-item">
                      <span className="proc-modal-filter-label">From:</span>
                      <input
                        type="date"
                        value={modalFromDate || appliedFilters.fromDate || ''}
                        onChange={(e) => {
                          const selectedFrom = e.target.value;
                          setModalFromDate(selectedFrom);
                          if (selectedMaterialForModal) {
                            loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, modalBaselineMonth, selectedOutletFilter, modalView === 'supplier_unit_price' ? 'supplier_unit_price' : 'unit_price', selectedFrom, modalToDate || appliedFilters.toDate || '');
                          }
                        }}
                        className={`proc-modal-filter-input ${modalFromDate ? 'active' : ''}`}
                      />
                    </div>

                    {/* To Date Filter */}
                    <div className="proc-modal-filter-item">
                      <span className="proc-modal-filter-label">To:</span>
                      <input
                        type="date"
                        value={modalToDate || appliedFilters.toDate || ''}
                        onChange={(e) => {
                          const selectedTo = e.target.value;
                          setModalToDate(selectedTo);
                          if (selectedMaterialForModal) {
                            loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, modalBaselineMonth, selectedOutletFilter, modalView === 'supplier_unit_price' ? 'supplier_unit_price' : 'unit_price', modalFromDate || appliedFilters.fromDate || '', selectedTo);
                          }
                        }}
                        className={`proc-modal-filter-input ${modalToDate ? 'active' : ''}`}
                      />
                    </div>

                    {/* Baseline Month */}
                    <div className="proc-modal-filter-item">
                      <span className="proc-modal-filter-label">
                        Baseline:
                      </span>
                      <select
                        value={modalBaselineMonth}
                        onChange={(e) => {
                          const selectedMonth = e.target.value;
                          setModalBaselineMonth(selectedMonth);
                          if (selectedMaterialForModal) {
                            loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, selectedMonth, selectedOutletFilter, modalView === 'supplier_unit_price' ? 'supplier_unit_price' : 'unit_price', modalFromDate, modalToDate, modalTargetMonth);
                          }
                        }}
                        className="proc-modal-filter-input"
                      >
                        <option value="">None</option>
                        {(perfUnitPriceTrend.labels.length > 0 ? perfUnitPriceTrend.labels : ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']).map((lbl) => (
                          <option key={lbl} value={lbl}>{lbl}</option>
                        ))}
                      </select>
                    </div>

                    {/* Target Month */}
                    <div className="proc-modal-filter-item">
                      <span className="proc-modal-filter-label">
                        Target:
                      </span>
                      <select
                        value={modalTargetMonth}
                        onChange={(e) => {
                          const selectedTarget = e.target.value;
                          setModalTargetMonth(selectedTarget);
                          if (selectedMaterialForModal) {
                            loadAllModalUnitPriceTrends(selectedMaterialForModal.material_name, modalSpendDetails, modalBaselineMonth, selectedOutletFilter, modalView === 'supplier_unit_price' ? 'supplier_unit_price' : 'unit_price', modalFromDate, modalToDate, selectedTarget);
                          }
                        }}
                        className="proc-modal-filter-input"
                      >
                        <option value="">None</option>
                        {(perfUnitPriceTrend.labels.length > 0 ? perfUnitPriceTrend.labels : ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']).map((lbl) => (
                          <option key={lbl} value={lbl}>{lbl}</option>
                        ))}
                      </select>
                    </div>

                    {/* Clear Filters Small Button */}
                    <button
                      type="button"
                      onClick={handleClearModalUnitPriceFilters}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '0.375rem',
                        border: (selectedOutletFilter || modalFromDate || modalToDate || modalBaselineMonth || disabledSuppliersForUnitPriceChart.length > 0)
                          ? '1px solid #fca5a5'
                          : '1px solid #cbd5e1',
                        backgroundColor: (selectedOutletFilter || modalFromDate || modalToDate || modalBaselineMonth || disabledSuppliersForUnitPriceChart.length > 0)
                          ? '#fef2f2'
                          : '#ffffff',
                        color: (selectedOutletFilter || modalFromDate || modalToDate || modalBaselineMonth || disabledSuppliersForUnitPriceChart.length > 0)
                          ? '#dc2626'
                          : '#64748b',
                        fontWeight: 600,
                        fontSize: '0.6875rem',
                        cursor: 'pointer',
                        height: '24px',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                      title="Reset all modal filters (Outlet, Dates, Baseline & Supplier Lines)"
                    >
                      <RotateCcw width={11} height={11} />
                      <span>Clear Filter</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Clickable Supplier Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', alignItems: 'center' }}>
                  {modalSpendDetails.map((item, idx) => {
                    const sName = item.supplier_name || `Supplier ${idx + 1}`;
                    const isErased = disabledSuppliersForUnitPriceChart.includes(sName);
                    const color = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
                    return (
                      <button
                        key={sName + idx}
                        type="button"
                        onClick={() => {
                          setDisabledSuppliersForUnitPriceChart(prev =>
                            prev.includes(sName) ? prev.filter(s => s !== sName) : [...prev, sName]
                          );
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '1rem',
                          border: `1.5px solid ${isErased ? '#cbd5e1' : color}`,
                          backgroundColor: isErased ? '#ffffff' : `${color}15`,
                          color: isErased ? '#94a3b8' : '#0f172a',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: isErased ? 'line-through' : 'none',
                          opacity: isErased ? 0.5 : 1,
                          transition: 'all 0.2s ease'
                        }}
                        title={isErased ? `Restore ${sName} line` : `Erase ${sName} line`}
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: isErased ? '#cbd5e1' : color }} />
                        {sName} (AED {item.unit_price?.toLocaleString() || '0'})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chart Container in Fullscreen */}
              <div style={{ flex: 1, minHeight: '420px', position: 'relative', width: '100%', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem 1rem 2.25rem 1rem', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
                {dailyTrendLoading || modalUnitPriceLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <SpinnerLoaders size="medium" text={dailyTrendLoading ? "Fetching daily trend in full screen..." : "Fetching unit price trend in full screen..."} fullScreen={false} />
                  </div>
                ) : isDailyTrendActive && dailyTrendData ? (
                  <Line
                    data={{
                      labels: dailyTrendData.labels,
                      datasets: [{
                        label: `Daily Spend Trend (${selectedSupplierFilterForModal || selectedMaterialForModal?.material_name || 'All'})`,
                        data: dailyTrendData.values,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: true,
                        tension: 0.2,
                        borderWidth: 2.5,
                        pointBackgroundColor: '#2563eb',
                        pointBorderColor: '#ffffff',
                        pointRadius: dailyTrendData.labels.length > 60 ? 2 : 4,
                        pointHoverRadius: 6,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: true, position: 'top', labels: { font: { size: 12, weight: 600 } } },
                        tooltip: {
                          backgroundColor: '#0f172a',
                          padding: 12,
                          callbacks: {
                            label: (ctx: any) => {
                              const idx = ctx.dataIndex;
                              const spend = formatGraphValue(ctx.raw as number);
                              const qty = dailyTrendData.quantities[idx];
                              const uPrice = dailyTrendData.unitPrices[idx];
                              const lines = [` Total Spend: AED ${spend}`];
                              if (qty !== null && qty !== undefined) lines.push(` Quantity: ${qty.toLocaleString()}`);
                              if (uPrice !== null && uPrice !== undefined) lines.push(` Avg Unit Price: AED ${uPrice.toLocaleString()}`);
                              return lines;
                            }
                          }
                        }
                      },
                      scales: {
                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 30 } },
                        y: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { size: 10 }, callback: (v: any) => formatGraphValue(v as number) } }
                      }
                    }}
                  />
                ) : modalSpendDetails.length > 0 ? (
                  (() => {
                    const sourceData = modalUnitPriceTrendsMap.length > 0 ? modalUnitPriceTrendsMap : modalSpendDetails.map(d => ({
                      supplierName: d.supplier_name,
                      materialName: d.material_name || (d as any).item_name || (d as any).name || (d as any).material || (typeof selectedMaterialForModal === 'string' ? selectedMaterialForModal : (selectedMaterialForModal as any)?.material_name) || '',
                      labels: [] as string[],
                      values: [] as number[],
                      quantities: [] as (number | null)[],
                      amounts: [] as (number | null)[],
                      outlets: [] as (string | null)[],
                      costCenters: [] as (string | null)[],
                      latestUnitPrice: d.unit_price
                    }));

                    let activeTrends = sourceData.filter(item => !disabledSuppliersForUnitPriceChart.includes(item.supplierName));
                    if (selectedSupplierFilterForModal) {
                      activeTrends = activeTrends.filter(item => item.supplierName === selectedSupplierFilterForModal);
                    }

                    if (activeTrends.length === 0) {
                      return (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8', fontSize: '0.875rem' }}>
                          All supplier lines erased. Click a supplier badge above to restore.
                        </div>
                      );
                    }

                    const activeFrom = modalFromDate || appliedFilters.fromDate || '';
                    const activeTo = modalToDate || appliedFilters.toDate || '';
                    const fromMonth = activeFrom ? activeFrom.substring(0, 7) : '';
                    const toMonth = activeTo ? activeTo.substring(0, 7) : '';

                    const monthLabelsSet = new Set<string>();
                    activeTrends.forEach(t => {
                      if (Array.isArray(t.labels)) {
                        t.labels.forEach(l => { if (l) monthLabelsSet.add(l); });
                      }
                    });
                    if (monthLabelsSet.size === 0 && Array.isArray(perfUnitPriceTrend.labels)) {
                      perfUnitPriceTrend.labels.forEach(l => { if (l) monthLabelsSet.add(l); });
                    }

                    let monthLabels = Array.from(monthLabelsSet).filter(Boolean).sort();
                    if (fromMonth || toMonth) {
                      monthLabels = monthLabels.filter(m => (!fromMonth || m >= fromMonth) && (!toMonth || m <= toMonth));
                    }

                    if (monthLabels.length === 0) {
                      if (fromMonth && toMonth && fromMonth <= toMonth) {
                        const generated: string[] = [];
                        let curr = fromMonth;
                        while (curr <= toMonth) {
                          generated.push(curr);
                          const [y, m] = curr.split('-').map(Number);
                          const nextM = m === 12 ? 1 : m + 1;
                          const nextY = m === 12 ? y + 1 : y;
                          curr = `${nextY}-${String(nextM).padStart(2, '0')}`;
                        }
                        monthLabels = generated;
                      } else {
                        monthLabels = DEFAULT_MONTH_LABELS;
                        if (fromMonth || toMonth) {
                          monthLabels = monthLabels.filter(m => (!fromMonth || m >= fromMonth) && (!toMonth || m <= toMonth));
                        }
                      }
                    }

                    const supplierDatasets = activeTrends.map((trendItem) => {
                      const originalIndex = modalSpendDetails.findIndex(d => d.supplier_name === trendItem.supplierName);
                      const color = CATEGORY_PALETTE[(originalIndex >= 0 ? originalIndex : 0) % CATEGORY_PALETTE.length];

                      let dataPoints: (number | null)[] = [];
                      let dataQuantities: (number | null)[] = [];
                      let dataAmounts: (number | null)[] = [];
                      let dataOutlets: (string | null)[] = [];
                      let dataCostCenters: (string | null)[] = [];

                      if (trendItem.labels && trendItem.labels.length > 0) {
                        dataPoints = monthLabels.map((m: string) => {
                          const idx = trendItem.labels.indexOf(m);
                          if (idx === -1) return null;
                          if (selectedOutletFilter) {
                            const outletAtIdx = trendItem.outlets ? trendItem.outlets[idx] : null;
                            if (outletAtIdx !== selectedOutletFilter) return null;
                          }
                          return trendItem.values[idx];
                        });
                        dataQuantities = monthLabels.map((m: string) => {
                          const idx = trendItem.labels.indexOf(m);
                          return idx !== -1 && trendItem.quantities ? trendItem.quantities[idx] : null;
                        });
                        dataAmounts = monthLabels.map((m: string) => {
                          const idx = trendItem.labels.indexOf(m);
                          return idx !== -1 && trendItem.amounts ? trendItem.amounts[idx] : null;
                        });
                        dataOutlets = monthLabels.map((m: string) => {
                          const idx = trendItem.labels.indexOf(m);
                          return idx !== -1 && trendItem.outlets ? trendItem.outlets[idx] : null;
                        });
                        dataCostCenters = monthLabels.map((m: string) => {
                          const idx = trendItem.labels.indexOf(m);
                          return idx !== -1 && trendItem.costCenters ? trendItem.costCenters[idx] : null;
                        });
                      } else {
                        const singleVal = trendItem.latestUnitPrice || 0;
                        dataPoints = monthLabels.map((_, i) => (i === monthLabels.length - 1 || i === 0 ? singleVal : null));
                        dataQuantities = monthLabels.map(() => null);
                        dataAmounts = monthLabels.map(() => null);
                        dataOutlets = monthLabels.map(() => null);
                        dataCostCenters = monthLabels.map(() => null);
                      }

                      return {
                        label: trendItem.supplierName,
                        supplierName: trendItem.supplierName,
                        materialName: (trendItem as any).materialName || (typeof selectedMaterialForModal === 'string' ? selectedMaterialForModal : ((selectedMaterialForModal as any)?.material_name || (selectedMaterialForModal as any)?.material_code || (selectedMaterialForModal as any)?.material)) || '',
                        data: dataPoints,
                        borderColor: color,
                        backgroundColor: color,
                        borderWidth: 3,
                        pointRadius: 6,
                        pointHoverRadius: 9,
                        tension: 0.2,
                        fill: false,
                        quantities: dataQuantities,
                        amounts: dataAmounts,
                        outlets: dataOutlets,
                        costCenters: dataCostCenters,
                      };
                    });

                    let baselinePrice: number | null = null;
                    if (modalBaselineMonth) {
                      for (const d of modalSpendDetails) {
                        if ((d as any).baseline_unit_price && (d as any).baseline_unit_price > 0) {
                          baselinePrice = Number((d as any).baseline_unit_price);
                          break;
                        }
                        if (d.target_month_unit_price && d.target_month_unit_price > 0) {
                          baselinePrice = Number(d.target_month_unit_price);
                          break;
                        }
                      }
                      if (baselinePrice === null || baselinePrice <= 0) {
                        const validPrices: number[] = [];
                        activeTrends.forEach((trendItem) => {
                          if (trendItem.labels && trendItem.labels.length > 0) {
                            const idx = trendItem.labels.indexOf(modalBaselineMonth);
                            if (idx !== -1 && trendItem.values[idx] !== null && trendItem.values[idx] !== undefined && trendItem.values[idx]! > 0) {
                              validPrices.push(trendItem.values[idx]!);
                            }
                          } else if (trendItem.latestUnitPrice && trendItem.latestUnitPrice > 0) {
                            validPrices.push(trendItem.latestUnitPrice);
                          }
                        });
                        if (validPrices.length > 0) {
                          baselinePrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
                        }
                      }
                      if (baselinePrice === null || baselinePrice <= 0) {
                        const allPrices: number[] = [];
                        activeTrends.forEach((trendItem) => {
                          if (trendItem.values && trendItem.values.length > 0) {
                            trendItem.values.forEach(v => {
                              if (v !== null && v !== undefined && v > 0) allPrices.push(v);
                            });
                          }
                        });
                        if (allPrices.length > 0) {
                          baselinePrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
                        }
                      }
                    }

                    let targetPrice: number | null = null;
                    if (modalTargetMonth) {
                      for (const d of modalSpendDetails) {
                        if (d.target_month_unit_price && d.target_month_unit_price > 0) {
                          targetPrice = Number(d.target_month_unit_price);
                          break;
                        }
                      }
                      if (targetPrice === null || targetPrice <= 0) {
                        const validPrices: number[] = [];
                        activeTrends.forEach((trendItem) => {
                          if (trendItem.labels && trendItem.labels.length > 0) {
                            const idx = trendItem.labels.indexOf(modalTargetMonth);
                            if (idx !== -1 && trendItem.values[idx] !== null && trendItem.values[idx] !== undefined && trendItem.values[idx]! > 0) {
                              validPrices.push(trendItem.values[idx]!);
                            }
                          } else if (trendItem.latestUnitPrice && trendItem.latestUnitPrice > 0) {
                            validPrices.push(trendItem.latestUnitPrice);
                          }
                        });
                        if (validPrices.length > 0) {
                          targetPrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
                        }
                      }
                      if (targetPrice === null || targetPrice <= 0) {
                        const allPrices: number[] = [];
                        activeTrends.forEach((trendItem) => {
                          if (trendItem.values && trendItem.values.length > 0) {
                            trendItem.values.forEach(v => {
                              if (v !== null && v !== undefined && v > 0) allPrices.push(v);
                            });
                          }
                        });
                        if (allPrices.length > 0) {
                          targetPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
                        }
                      }
                    }

                    const datasets = [
                      ...supplierDatasets,
                      ...(modalBaselineMonth && baselinePrice !== null && baselinePrice > 0 ? [{
                        label: `Baseline Average (${modalBaselineMonth}): AED ${baselinePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        data: Array(monthLabels.length > 0 ? monthLabels.length : 1).fill(baselinePrice),
                        borderColor: '#ef4444',
                        borderWidth: 2.5,
                        borderDash: [6, 6],
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false,
                        tension: 0,
                      }] : []),
                      ...(modalTargetMonth && targetPrice !== null && targetPrice > 0 ? [{
                        label: `Target Average (${modalTargetMonth}): AED ${targetPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        data: Array(monthLabels.length > 0 ? monthLabels.length : 1).fill(targetPrice),
                        borderColor: '#10b981',
                        borderWidth: 2.5,
                        borderDash: [4, 4],
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false,
                        tension: 0,
                      }] : [])
                    ];

                    return (
                      <Line
                        data={{
                          labels: monthLabels,
                          datasets
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          onClick: (_event: any, activeElements: any[], chart: any) => {
                            if (activeElements && activeElements.length > 0) {
                              const el = activeElements[0];
                              const dataset = chart.data.datasets[el.datasetIndex];
                              if (dataset && dataset.label && !dataset.label.startsWith('Baseline') && !dataset.label.startsWith('Target')) {
                                const month = chart.data.labels[el.index];
                                const unitPrice = dataset.data[el.index];
                                const qty = dataset.quantities ? dataset.quantities[el.index] : null;
                                const amt = dataset.amounts ? dataset.amounts[el.index] : null;
                                const outlet = dataset.outlets ? dataset.outlets[el.index] : [];
                                const cc = dataset.costCenters ? dataset.costCenters[el.index] : [];
                                const matName = dataset.materialName || (typeof selectedMaterialForModal === 'string' ? selectedMaterialForModal : ((selectedMaterialForModal as any)?.material_name || (selectedMaterialForModal as any)?.material_code || (selectedMaterialForModal as any)?.material)) || (selectedAnomalyForModal as any)?.material_name || (selectedAnomalyForModal as any)?.material || (appliedFilters.materialCodes && appliedFilters.materialCodes[0]) || (appliedFilters.materialGroups && appliedFilters.materialGroups[0]) || '';
                                setUnitPriceClickedPoint(prev =>
                                  prev && prev.supplier === (dataset.supplierName || dataset.label) && prev.month === month && prev.material === matName
                                    ? null
                                    : {
                                      supplier: dataset.supplierName || dataset.label,
                                      material: matName,
                                      month,
                                      unitPrice: Number(unitPrice),
                                      qty: qty ?? null,
                                      amount: amt ?? null,
                                      outlet: Array.isArray(outlet) ? outlet : (outlet ? [String(outlet)] : []),
                                      costCenter: Array.isArray(cc) ? cc : (cc ? [String(cc)] : [])
                                    }
                                );
                              }
                            } else {
                              setUnitPriceClickedPoint(null);
                            }
                          },
                          plugins: {
                            legend: {
                              display: (modalBaselineMonth || modalTargetMonth) ? true : false,
                              position: 'top',
                              labels: {
                                filter: (item: any) => item.text.startsWith('Baseline') || item.text.startsWith('Target'),
                                font: { size: 9.5, weight: 600 }
                              }
                            },
                            tooltip: {
                              backgroundColor: '#0f172a',
                              titleFont: { size: 11, weight: 700 },
                              bodyFont: { size: 10 },
                              footerFont: { size: 10, weight: 600 },
                              footerColor: '#60a5fa',
                              padding: 10,
                              borderColor: '#334155',
                              borderWidth: 1,
                              callbacks: {
                                label: (ctx: any) => {
                                  const ds = ctx.dataset;
                                  const val = ctx.raw;
                                  if (val === null || val === undefined) return ` Unit Price: N/A`;
                                  let res = ` ${ds.label}: AED ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                  const dataIdx = ctx.dataIndex;
                                  if (ds.quantities && ds.quantities[dataIdx] !== null && ds.quantities[dataIdx] !== undefined) {
                                    res += ` | Qty: ${ds.quantities[dataIdx].toLocaleString()}`;
                                  }
                                  if (ds.amounts && ds.amounts[dataIdx] !== null && ds.amounts[dataIdx] !== undefined) {
                                    res += ` | Total: AED ${ds.amounts[dataIdx].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                  }
                                  return res;
                                },
                                footer: () => '📋 Click point on graph to copy details'
                              }
                            }
                          },
                          layout: {
                            padding: { bottom: 35, top: 10, left: 10, right: 25 }
                          },
                          scales: {
                            x: {
                              offset: true,
                              grid: { color: '#f1f5f9' },
                              ticks: {
                                color: '#0f172a',
                                font: { size: 9.5, weight: 600 },
                                autoSkip: false,
                                maxRotation: 45,
                                minRotation: 0,
                                padding: 8
                              }
                            },
                            y: {
                              grid: { color: '#f1f5f9' },
                              ticks: {
                                color: '#334155',
                                font: { size: 9.5, weight: 600 },
                                callback: (value: any) => `AED ${Number(value).toLocaleString()}`
                              }
                            }
                          }
                        }}
                      />
                    );
                  })()
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94a3b8', fontSize: '0.875rem' }}>
                    No unit price comparison data available.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Outlet Details Modal */}
          {isOutletModalOpen && selectedOutletForModal && (
            <div className="proc-modal-overlay" onClick={() => setIsOutletModalOpen(false)}>
              <div className="proc-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="proc-modal-header">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <h3 className="proc-modal-title" style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>Outlet Details</h3>
                    <span className="proc-modal-subtitle" style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{selectedOutletForModal.outlet}</span>
                  </div>
                  <button className="proc-modal-close-btn" onClick={() => setIsOutletModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '0.25rem', borderRadius: '0.375rem', transition: 'background-color 0.2s' }}>
                    <X width={18} height={18} />
                  </button>
                </div>

                <div className="proc-drawer-body">
                  {/* Summary Stats Row */}
                  <div className="proc-modal-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="proc-modal-stat-card">
                      <span className="proc-modal-stat-label">Total Spend</span>
                      <span className="proc-modal-stat-value">
                        AED {(() => {
                          const calculatedTotal = outletModalDetails.reduce((sum, item) => sum + (Number(item.total_spend) || 0), 0);
                          return (selectedOutletForModal.total_spend || calculatedTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()}
                      </span>
                    </div>
                    <div className="proc-modal-stat-card">
                      <span className="proc-modal-stat-label">Total Items</span>
                      <span className="proc-modal-stat-value">
                        {outletModalDetails.length}
                      </span>
                    </div>
                    <div className="proc-modal-stat-card">
                      <span className="proc-modal-stat-label">Outlet Name</span>
                      <span className="proc-modal-stat-value" title={selectedOutletForModal.outlet}>
                        {selectedOutletForModal.outlet}
                      </span>
                    </div>
                  </div>

                  {/* Tabs/Compare Toggle */}
                  <div className="proc-modal-controls">
                    <div className="proc-type-tabs-group" style={{ backgroundColor: '#f1f5f9' }}>
                      <button
                        type="button"
                        className={`proc-toggle-pill-btn ${outletModalView === 'chart' ? 'active' : ''}`}
                        onClick={() => setOutletModalView('chart')}
                      >
                        Spend Chart
                      </button>
                      <button
                        type="button"
                        className={`proc-toggle-pill-btn ${outletModalView === 'compare' ? 'active' : ''}`}
                        onClick={() => setOutletModalView('compare')}
                      >
                        Detailed Table
                      </button>
                    </div>
                  </div>

                  {outletModalLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                      <SpinnerLoaders size="medium" text="Loading outlet details..." fullScreen={false} />
                    </div>
                  ) : (
                    <div className="proc-modal-view-container" style={{ marginTop: '1rem' }}>
                      {outletModalView === 'chart' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                              Top 15 Items by Total Spend (out of {outletModalDetails.length} total items)
                            </span>
                            <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                              Switch to <strong>Detailed Table</strong> tab to view all {outletModalDetails.length} items
                            </span>
                          </div>
                          {outletModalDetails.length > 0 ? (() => {
                            const topOutletItems = [...outletModalDetails]
                              .sort((a, b) => (Number(b.total_spend) || 0) - (Number(a.total_spend) || 0))
                              .slice(0, 15);
                            const dynamicHeight = Math.max(380, topOutletItems.length * 28);
                            return (
                              <div style={{ height: `${dynamicHeight}px`, minHeight: '380px', position: 'relative' }}>
                                <Bar
                                  data={{
                                    labels: topOutletItems.map((item: any) => item.supplier_name || item.material_name || 'Unknown'),
                                    datasets: [
                                      {
                                        label: 'Total Spend',
                                        data: topOutletItems.map((item: any) => Number(item.total_spend) || 0),
                                        backgroundColor: '#3b82f6',
                                        hoverBackgroundColor: '#2563eb',
                                        borderRadius: 6,
                                        barThickness: 18,
                                      }
                                    ]
                                  }}
                                  options={{
                                    indexAxis: 'y',
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                      legend: { display: false },
                                      tooltip: {
                                        backgroundColor: '#1e293b',
                                        padding: 10,
                                        cornerRadius: 6,
                                        callbacks: {
                                          label: (ctx: any) => ` Total Spend: AED ${ctx.raw?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                        }
                                      }
                                    },
                                    scales: {
                                      x: {
                                        grid: { color: '#f1f5f9' },
                                        ticks: {
                                          color: '#64748b',
                                          font: { size: 10, weight: 600 },
                                          callback: (value: any) => formatGraphValue(value as number)
                                        }
                                      },
                                      y: {
                                        grid: { display: false },
                                        ticks: {
                                          color: '#334155',
                                          font: { size: 10, weight: 600 },
                                          callback: function (this: any, val: any) {
                                            const label = this.getLabelForValue(val);
                                            return label.length > 35 ? label.substring(0, 32) + '...' : label;
                                          }
                                        }
                                      }
                                    }
                                  }}
                                />
                              </div>
                            );
                          })() : (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px', color: '#94a3b8', fontSize: '0.75rem' }}>
                              No detail data found for outlet.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
                          <div style={{ overflowX: 'auto', maxHeight: '320px' }}>
                            <table className="proc-data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                              <thead>
                                <tr className="abc-table-header-row">
                                  <th className="proc-detail-th">Supplier Name</th>
                                  <th className="proc-detail-th">Material / Service Name</th>
                                  <th className="proc-detail-th">Material Group</th>
                                  <th className="proc-detail-th" style={{ textAlign: 'right' }}>Total Quantity</th>
                                  <th className="proc-detail-th" style={{ textAlign: 'right' }}>Total Spend (AED)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const paginatedOutletDetails = outletModalDetails.slice(
                                    (outletModalPage - 1) * outletModalPageSize,
                                    outletModalPage * outletModalPageSize
                                  );

                                  return paginatedOutletDetails.map((item: any, idx: number) => (
                                    <tr key={idx} className="proc-detail-tr">
                                      <td
                                        className={`proc-detail-td ${item.supplier_name ? 'supplier-name-cell' : ''}`}
                                        title={item.supplier_name ? `Click to view supplier details for "${item.supplier_name}"` : ''}
                                        onClick={() => {
                                          if (item.supplier_name && item.supplier_name !== '-') {
                                            handleSupplierBarClick({ supplier: item.supplier_name, total_spend: Number(item.total_spend) || 0 });
                                          }
                                        }}
                                      >
                                        {item.supplier_name || '-'}
                                      </td>
                                      <td
                                        className={`proc-detail-td ${item.material_name ? 'supplier-name-cell' : ''}`}
                                        title={item.material_name ? `Click to view spend breakdown for "${item.material_name}"` : ''}
                                        onClick={() => {
                                          if (item.material_name && item.material_name !== '-') {
                                            handleBarRowClick({ material_name: item.material_name, total_spend: Number(item.total_spend) || 0 });
                                          }
                                        }}
                                      >
                                        {item.material_name || '-'}
                                      </td>
                                      <td className="proc-detail-td" style={{ color: '#64748b' }}>
                                        {item.material_group || '-'}
                                      </td>
                                      <td className="proc-detail-td" style={{ textAlign: 'right', fontWeight: 500, color: '#334155' }}>
                                        {item.total_quantity !== undefined ? Number(item.total_quantity).toLocaleString() : '-'}
                                      </td>
                                      <td className="proc-detail-td" style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                        {item.total_spend ? Number(item.total_spend).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                      </td>
                                    </tr>
                                  ));
                                })()}
                                {outletModalDetails.length === 0 && (
                                  <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                      No details found.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Smart 5-Button Pagination Control Bar with Per Page selector */}
                          {outletModalDetails.length > 0 && (() => {
                            const totalItemsCount = outletModalDetails.length;
                            const totalPages = Math.ceil(totalItemsCount / outletModalPageSize) || 1;
                            const startItem = (outletModalPage - 1) * outletModalPageSize + 1;
                            const endItem = Math.min(outletModalPage * outletModalPageSize, totalItemsCount);

                            // Smart 5-button window around active page
                            const windowSize = 5;
                            let startPg = Math.max(1, outletModalPage - 2);
                            let endPg = Math.min(totalPages, startPg + windowSize - 1);
                            if (endPg - startPg + 1 < windowSize) {
                              startPg = Math.max(1, endPg - windowSize + 1);
                            }
                            const visiblePages = Array.from({ length: endPg - startPg + 1 }, (_, i) => startPg + i);

                            return (
                              <div className="proc-saved-pagination-bar">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                                    Showing {startItem} to {endItem} of {totalItemsCount} items
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Per page:</span>
                                    <select
                                      value={outletModalPageSize}
                                      onChange={(e) => {
                                        setOutletModalPageSize(Number(e.target.value));
                                        setOutletModalPage(1);
                                      }}
                                      className="proc-pagination-per-page"
                                    >
                                      <option value={10}>10</option>
                                      <option value={25}>25</option>
                                      <option value={50}>50</option>
                                      <option value={100}>100</option>
                                      <option value={totalItemsCount}>All ({totalItemsCount})</option>
                                    </select>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                  <button
                                    type="button"
                                    disabled={outletModalPage <= 1}
                                    onClick={() => setOutletModalPage(prev => Math.max(1, prev - 1))}
                                    className={`proc-page-btn ${outletModalPage <= 1 ? 'disabled' : ''}`}
                                    title="Previous Page (<)"
                                  >
                                    &lt;
                                  </button>

                                  {visiblePages.map((pg) => (
                                    <button
                                      key={pg}
                                      type="button"
                                      onClick={() => setOutletModalPage(pg)}
                                      className={`proc-page-btn ${outletModalPage === pg ? 'active' : ''}`}
                                    >
                                      {pg}
                                    </button>
                                  ))}

                                  <button
                                    type="button"
                                    disabled={outletModalPage >= totalPages}
                                    onClick={() => setOutletModalPage(prev => Math.min(totalPages, prev + 1))}
                                    className={`proc-page-btn ${outletModalPage >= totalPages ? 'disabled' : ''}`}
                                    title="Next Page (>)"
                                  >
                                    &gt;
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Month Trend Details Modal (Quantity & Spend Trend Point Click) */}
          {isMonthTrendModalOpen && (
            <div className="proc-modal-overlay" style={{ zIndex: 1000 }} onClick={() => setIsMonthTrendModalOpen(false)}>
              <div className="proc-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1100px' }}>
                <div className="proc-modal-header">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <h3 className="proc-modal-title" style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                      {monthTrendModalType === 'quantity' ? 'Quantity Trend Details' : 'Spend Trend Details'}
                    </h3>
                    <span className="proc-modal-subtitle" style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                      Month: <strong style={{ color: '#2563eb' }}>{selectedMonthTrendMonth}</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="download-action-btn"
                      onClick={handleDownloadMonthTrendExcel}
                      disabled={monthTrendModalDetails.length === 0 || monthTrendModalLoading}
                      style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: monthTrendModalDetails.length === 0 ? 'not-allowed' : 'pointer' }}
                    >
                      <Download width={14} height={14} /> Export CSV
                    </button>
                    <button
                      className="proc-modal-close-btn"
                      onClick={() => setIsMonthTrendModalOpen(false)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '0.25rem', borderRadius: '0.375rem', transition: 'background-color 0.2s' }}
                    >
                      <X width={18} height={18} />
                    </button>
                  </div>
                </div>

                <div className="proc-modal-body" style={{ padding: '1.25rem 0 0 0' }}>
                  {(() => {
                    const filteredMonthTrendDetails = (monthTrendModalDetails || []).filter((item: any) => {
                      if (monthTrendMaterialFilter && item.material_name !== monthTrendMaterialFilter) {
                        return false;
                      }
                      if (monthTrendSupplierFilter && item.supplier_name !== monthTrendSupplierFilter) {
                        return false;
                      }
                      if (monthTrendSearchQuery.trim()) {
                        const q = monthTrendSearchQuery.toLowerCase();
                        const mat = String(item.material_name || '').toLowerCase();
                        const sup = String(item.supplier_name || '').toLowerCase();
                        if (!mat.includes(q) && !sup.includes(q)) {
                          return false;
                        }
                      }
                      return true;
                    });

                    const dynamicSuppliersCount = new Set(filteredMonthTrendDetails.map((r: any) => r.supplier_name).filter(Boolean)).size;
                    const dynamicMaterialsCount = new Set(filteredMonthTrendDetails.map((r: any) => r.material_name).filter(Boolean)).size;
                    const dynamicTotalQuantity = filteredMonthTrendDetails.reduce((acc: number, r: any) => acc + (Number(r.total_quantity) || 0), 0);
                    const dynamicTotalSpend = filteredMonthTrendDetails.reduce((acc: number, r: any) => acc + (Number(r.total_spend) || 0), 0);

                    const displaySuppliersCount = (monthTrendMaterialFilter || monthTrendSupplierFilter || monthTrendSearchQuery) ? dynamicSuppliersCount : monthTrendHeaderStats.total_suppliers;
                    const displayMaterialsCount = (monthTrendMaterialFilter || monthTrendSupplierFilter || monthTrendSearchQuery) ? dynamicMaterialsCount : monthTrendHeaderStats.total_materials;
                    const displayTotalQuantity = (monthTrendMaterialFilter || monthTrendSupplierFilter || monthTrendSearchQuery) ? dynamicTotalQuantity : monthTrendHeaderStats.total_quantity;
                    const displayTotalSpend = (monthTrendMaterialFilter || monthTrendSupplierFilter || monthTrendSearchQuery) ? dynamicTotalSpend : monthTrendHeaderStats.total_spend;

                    return (
                      <>
                        {/* Summary Stats Row */}
                        <div className="proc-modal-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                          <div className="proc-modal-stat-card">
                            <span className="proc-modal-stat-label">Total Suppliers</span>
                            <span className="proc-modal-stat-value">
                              {displaySuppliersCount.toLocaleString()}
                            </span>
                          </div>
                          <div className="proc-modal-stat-card">
                            <span className="proc-modal-stat-label">Total Materials</span>
                            <span className="proc-modal-stat-value">
                              {displayMaterialsCount.toLocaleString()}
                            </span>
                          </div>
                          <div className="proc-modal-stat-card">
                            <span className="proc-modal-stat-label">
                              {monthTrendModalType === 'quantity' ? 'Total Quantity' : 'Total Spend'}
                            </span>
                            <span className="proc-modal-stat-value" style={{ color: monthTrendModalType === 'quantity' ? '#059669' : '#2563eb' }}>
                              {monthTrendModalType === 'quantity'
                                ? displayTotalQuantity.toLocaleString()
                                : `AED ${displayTotalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            </span>
                          </div>
                        </div>

                        {/* Controls Bar: Search, Material Dropdown, Supplier Dropdown */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                          <div style={{ position: 'relative', width: '260px' }}>
                            <Search width={14} height={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                              type="text"
                              placeholder="Search material or supplier..."
                              value={monthTrendSearchQuery}
                              onChange={(e) => setMonthTrendSearchQuery(e.target.value)}
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
                                value={monthTrendMaterialFilter}
                                onChange={(val) => setMonthTrendMaterialFilter(val)}
                                options={modalMaterialOptions}
                                placeholder="Search material..."
                                allLabel="All Materials"
                                minWidth="180px"
                                maxWidth="240px"
                              />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Filter Supplier:</span>
                              <SearchableSingleSelect
                                value={monthTrendSupplierFilter}
                                onChange={(val) => setMonthTrendSupplierFilter(val)}
                                options={modalSupplierOptions}
                                placeholder="Search supplier..."
                                allLabel="All Suppliers"
                                minWidth="180px"
                                maxWidth="240px"
                              />
                            </div>
                          </div>
                        </div>

                        {monthTrendModalLoading ? (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                            <SpinnerLoaders size="medium" text="Loading details..." fullScreen={false} />
                          </div>
                        ) : (
                          <div className="proc-modal-view-container">
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
                              <div style={{ overflowX: 'auto', maxHeight: '360px' }}>
                                <table className="proc-data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                  <thead>
                                    <tr className="abc-table-header-row">
                                      <th className="proc-detail-th">Date</th>
                                      <th className="proc-detail-th">Material / Item Name</th>
                                      <th className="proc-detail-th">Supplier Name</th>
                                      <th className="proc-detail-th" style={{ textAlign: 'right' }}>Total Quantity</th>
                                      <th className="proc-detail-th" style={{ textAlign: 'right' }}>Total Spend (AED)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {filteredMonthTrendDetails.length > 0 ? (
                                      filteredMonthTrendDetails.map((item: any, idx: number) => (
                                        <tr key={idx} className="proc-detail-tr">
                                          <td className="proc-detail-td" style={{ color: '#64748b' }}>
                                            {item.date || '-'}
                                          </td>
                                          <td
                                            className={`proc-detail-td ${item.material_name !== '-' ? 'supplier-name-cell' : ''}`}
                                            title={item.material_name !== '-' ? `Click to view spend breakdown for "${item.material_name}"` : ''}
                                            onClick={() => {
                                              if (item.material_name && item.material_name !== '-') {
                                                handleBarRowClick({ material_name: item.material_name, total_spend: Number(item.total_spend) || 0 });
                                              }
                                            }}
                                          >
                                            {item.material_name || '-'}
                                          </td>
                                          <td
                                            className={`proc-detail-td ${item.supplier_name !== '-' ? 'supplier-name-cell' : ''}`}
                                            title={item.supplier_name !== '-' ? `Click to view supplier details for "${item.supplier_name}"` : ''}
                                            onClick={() => {
                                              if (item.supplier_name && item.supplier_name !== '-') {
                                                handleSupplierBarClick({ supplier: item.supplier_name, total_spend: Number(item.total_spend) || 0 });
                                              }
                                            }}
                                          >
                                            {item.supplier_name || '-'}
                                          </td>
                                          <td className="proc-detail-td" style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>
                                            {Number(item.total_quantity).toLocaleString()}
                                          </td>
                                          <td className="proc-detail-td" style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>
                                            AED {Number(item.total_spend).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={5} style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>
                                          No details found matching your filters for this month.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              {/* Pagination Bar */}
                              <div className="proc-saved-pagination-bar">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span>Rows per page:</span>
                                  <select
                                    value={monthTrendModalPageSize}
                                    onChange={(e) => handleMonthTrendPageSizeChange(Number(e.target.value))}
                                    className="proc-pagination-per-page"
                                  >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                  </select>
                                  <span style={{ marginLeft: '0.5rem' }}>
                                    Showing {filteredMonthTrendDetails.length > 0 ? ((monthTrendModalPage - 1) * monthTrendModalPageSize + 1) : 0} to {Math.min(monthTrendModalPage * monthTrendModalPageSize, monthTrendModalTotalCount)} of {monthTrendModalTotalCount} entries
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleMonthTrendPageChange(monthTrendModalPage - 1)}
                                    disabled={monthTrendModalPage <= 1}
                                    className={`proc-page-btn ${monthTrendModalPage <= 1 ? 'disabled' : ''}`}
                                  >
                                    Previous
                                  </button>
                                  <span style={{ padding: '0 0.5rem', fontWeight: 600, color: '#0f172a' }}>
                                    Page {monthTrendModalPage} of {monthTrendModalTotalPages}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleMonthTrendPageChange(monthTrendModalPage + 1)}
                                    disabled={monthTrendModalPage >= monthTrendModalTotalPages}
                                    className={`proc-page-btn ${monthTrendModalPage >= monthTrendModalTotalPages ? 'disabled' : ''}`}
                                  >
                                    Next
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
          {/* Frequency Monthly Analysis Modal */}
          {isFrequencyModalOpen && (
            <div className="proc-modal-overlay" style={{ zIndex: 1000 }} onClick={() => setIsFrequencyModalOpen(false)}>
              <div className="proc-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1250px', height: '88vh', maxHeight: '880px' }}>
                <div className="proc-modal-header">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <h3 className="proc-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                      Monthly Purchase Frequency & GRN Details
                    </h3>
                    <span className="proc-modal-subtitle" style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>
                      Material Code: <strong style={{ color: '#2563eb' }}>{selectedMaterialForFrequencyModal}</strong>
                    </span>
                  </div>
                  <button
                    className="proc-modal-close-btn"
                    onClick={() => setIsFrequencyModalOpen(false)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '0.25rem', borderRadius: '0.375rem', transition: 'background-color 0.2s' }}
                  >
                    <X width={20} height={20} />
                  </button>
                </div>

                <div className="proc-modal-body" style={{ padding: '1.25rem 0 0 0' }}>
                  {frequencyModalLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '5rem 0' }}>
                      <SpinnerLoaders size="medium" text="Loading monthly frequency details..." fullScreen={false} />
                    </div>
                  ) : (
                    (() => {
                      const flatOutletRows: Array<{
                        month: string;
                        outlet: string;
                        company_code: string | null;
                        cost_center: string | null;
                        quantity: number;
                        total_price: number;
                        avg_days_between_grns: number | null;
                      }> = [];

                      let totalQty = 0;
                      let totalPrice = 0;
                      const validDaysList: number[] = [];

                      frequencyMonthlyData.forEach(m => {
                        (m.outlets || []).forEach(o => {
                          flatOutletRows.push({
                            month: m.month,
                            outlet: o.outlet,
                            company_code: o.company_code,
                            cost_center: o.cost_center,
                            quantity: Number(o.quantity) || 0,
                            total_price: Number(o.total_price) || 0,
                            avg_days_between_grns: o.avg_days_between_grns !== null && o.avg_days_between_grns !== undefined ? Number(o.avg_days_between_grns) : null
                          });

                          totalQty += Number(o.quantity) || 0;
                          totalPrice += Number(o.total_price) || 0;
                          if (o.avg_days_between_grns !== null && o.avg_days_between_grns !== undefined) {
                            validDaysList.push(Number(o.avg_days_between_grns));
                          }
                        });
                      });

                      const overallAvgDays = validDaysList.length > 0 ? (validDaysList.reduce((a, b) => a + b, 0) / validDaysList.length) : null;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          {/* KPI Summary Cards */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.875rem 1rem' }}>
                              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active Months</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>{frequencyModalTotalMonths}</div>
                            </div>
                            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.875rem 1rem' }}>
                              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Quantity</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669', marginTop: '0.25rem' }}>{totalQty.toLocaleString()}</div>
                            </div>
                            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.875rem 1rem' }}>
                              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Spend</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb', marginTop: '0.25rem' }}>AED {totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.875rem 1rem' }}>
                              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Avg Days Between GRNs</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706', marginTop: '0.25rem' }}>
                                {overallAvgDays !== null ? `${Math.round(overallAvgDays)} Days` : 'N/A'}
                              </div>
                            </div>
                          </div>

                          {/* Monthly Quantity & Price Chart */}
                          {frequencyMonthlyData.length > 0 && (
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem', backgroundColor: '#ffffff' }}>
                              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                                Monthly Order Quantity & Spend Trend
                              </h4>
                              <div style={{ height: '210px', position: 'relative' }}>
                                <Bar
                                  data={{
                                    labels: frequencyMonthlyData.map(m => m.month),
                                    datasets: [
                                      {
                                        label: 'Total Quantity',
                                        data: frequencyMonthlyData.map(m => (m.outlets || []).reduce((acc, o) => acc + (Number(o.quantity) || 0), 0)),
                                        backgroundColor: '#10b981',
                                        borderRadius: 4,
                                      },
                                      {
                                        label: 'Total Price (AED)',
                                        data: frequencyMonthlyData.map(m => (m.outlets || []).reduce((acc, o) => acc + (Number(o.total_price) || 0), 0)),
                                        backgroundColor: '#3b82f6',
                                        borderRadius: 4,
                                      }
                                    ]
                                  }}
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                      legend: { display: true, position: 'top', labels: { font: { size: 10, weight: 600 } } },
                                      tooltip: { backgroundColor: '#1e293b' }
                                    },
                                    scales: {
                                      x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10, weight: 600 }, color: '#475569' } },
                                      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, color: '#64748b' } }
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Outlet Breakdown Table */}
                          <div style={{ overflowX: 'auto', maxHeight: '300px', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                            <table className="proc-data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                              <thead>
                                <tr className="abc-table-header-row">
                                  <th className="proc-detail-th">Month</th>
                                  <th className="proc-detail-th">Outlet</th>
                                  <th className="proc-detail-th" style={{ textAlign: 'center' }}>Company Code</th>
                                  <th className="proc-detail-th" style={{ textAlign: 'center' }}>Cost Center</th>
                                  <th className="proc-detail-th" style={{ textAlign: 'right' }}>Quantity</th>
                                  <th className="proc-detail-th" style={{ textAlign: 'right' }}>Total Price (AED)</th>
                                  <th className="proc-detail-th" style={{ textAlign: 'center' }}>Avg Days Between GRNs</th>
                                </tr>
                              </thead>
                              <tbody>
                                {flatOutletRows.map((row, idx) => (
                                  <tr key={idx} className="proc-detail-tr">
                                    <td className="proc-detail-td" style={{ fontWeight: 700, color: '#0f172a' }}>{row.month}</td>
                                    <td className="proc-detail-td" style={{ fontWeight: 600, color: '#334155' }}>{row.outlet || '-'}</td>
                                    <td className="proc-detail-td" style={{ textAlign: 'center', color: '#64748b' }}>{row.company_code || '-'}</td>
                                    <td className="proc-detail-td" style={{ textAlign: 'center', color: '#64748b' }}>{row.cost_center || '-'}</td>
                                    <td className="proc-detail-td" style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>{row.quantity.toLocaleString()}</td>
                                    <td className="proc-detail-td" style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                                      {row.total_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="proc-detail-td" style={{ textAlign: 'center' }}>
                                      {row.avg_days_between_grns !== null ? (
                                        <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.6875rem', fontWeight: 600 }}>
                                          {row.avg_days_between_grns} Days
                                        </span>
                                      ) : (
                                        <span style={{ color: '#94a3b8' }}>-</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                                {flatOutletRows.length === 0 && (
                                  <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                      No monthly frequency details found.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
          )}



          {/* Material Spend Variance & Driver Reasons Modal */}
          {isVarianceReasonModalOpen && (
            <div className="proc-modal-overlay" style={{ zIndex: 1000 }} onClick={() => setIsVarianceReasonModalOpen(false)}>
              <div className="proc-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '940px', height: 'auto', maxHeight: '88vh', overflowY: 'auto' }}>
                <div className="proc-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <h3 className="proc-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                      Material Spend Variance & Driver Reasons
                    </h3>
                    <span className="proc-modal-subtitle" style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>
                      Material: <strong style={{ color: '#0f172a' }}>{selectedAnomalyForModal?.materialCode}</strong>
                      {selectedAnomalyForModal?.supplier && (
                        <> | Supplier: <strong style={{ color: '#2563eb' }}>{selectedAnomalyForModal.supplier}</strong></>
                      )}
                    </span>
                  </div>
                  <button
                    className="proc-modal-close-btn"
                    onClick={() => setIsVarianceReasonModalOpen(false)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '0.25rem', borderRadius: '0.375rem' }}
                  >
                    <X width={20} height={20} />
                  </button>
                </div>

                <div className="proc-modal-body" style={{ paddingTop: '1.25rem' }}>
                  <div>
                    {selectedAnomalyForModal && (
                      <div className="anomaly-summary-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <div className="anomaly-summary-card">
                          <div className="anomaly-card-label">Current Spend</div>
                          <div className="anomaly-card-val">
                            AED {selectedAnomalyForModal.currentSpend !== undefined ? selectedAnomalyForModal.currentSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                          </div>
                        </div>
                        <div className="anomaly-summary-card">
                          <div className="anomaly-card-label">Historical Avg</div>
                          <div className="anomaly-card-val">
                            AED {selectedAnomalyForModal.historicalAvg !== undefined ? selectedAnomalyForModal.historicalAvg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                          </div>
                        </div>
                        <div className="anomaly-summary-card">
                          <div className="anomaly-card-label">Anomaly Status</div>
                          <div style={{ marginTop: '0.25rem' }}>
                            <span className={`status-badge ${selectedAnomalyForModal.status === 'High Spend' ? 'red' : selectedAnomalyForModal.status === 'Low Spend' ? 'green' : 'blue'}`} style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                              {selectedAnomalyForModal.status || 'Normal'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {varianceReasonLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem 0' }}>
                        <SpinnerLoaders size="medium" text="Loading material variance reasons..." fullScreen={false} />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b' }}>
                          Monthly Variance Breakdown & Driver Analysis
                        </h4>

                        {varianceMonthlyReasons.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {varianceMonthlyReasons.map((item, idx) => {
                              const isHigh = item.status?.includes('Increased') || item.status === 'High Spend' || item.variance_percentage > 30;
                              const isLow = item.status?.includes('Decreased') || item.status === 'Low Spend' || item.variance_percentage < -30;

                              let badgeBg = '#dbeafe';
                              let badgeText = '#1e40af';

                              if (isHigh) {
                                badgeBg = '#fee2e2';
                                badgeText = '#991b1b';
                              } else if (isLow) {
                                badgeBg = '#dcfce7';
                                badgeText = '#166534';
                              }

                              return (
                                <div
                                  key={idx}
                                  className={`proc-variance-card ${isHigh ? 'high' : isLow ? 'low' : ''}`}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                      <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a', backgroundColor: '#f1f5f9', padding: '0.25rem 0.625rem', borderRadius: '0.375rem' }}>
                                        {item.month}
                                      </span>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '0.25rem', backgroundColor: badgeBg, color: badgeText }}>
                                        {item.status}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 800, color: isHigh ? '#dc2626' : isLow ? '#16a34a' : '#2563eb' }}>
                                      Variance: {item.variance_percentage > 0 ? `+${item.variance_percentage}%` : `${item.variance_percentage}%`}
                                    </div>
                                  </div>

                                  {/* Full Detailed Metrics Grid */}
                                  <div className="proc-variance-metrics-grid">
                                    <div>
                                      <span style={{ color: '#64748b', fontSize: '0.6875rem', display: 'block', fontWeight: 600 }}>Current Spend</span>
                                      <strong style={{ color: '#0f172a', fontSize: '0.875rem' }}>AED {item.current_spend?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                    </div>
                                    {item.current_quantity !== undefined && (
                                      <div>
                                        <span style={{ color: '#64748b', fontSize: '0.6875rem', display: 'block', fontWeight: 600 }}>Current Quantity</span>
                                        <strong style={{ color: '#0f172a', fontSize: '0.875rem' }}>{item.current_quantity.toLocaleString()} units</strong>
                                      </div>
                                    )}
                                    {item.running_weighted_average !== undefined && (
                                      <div>
                                        <span style={{ color: '#64748b', fontSize: '0.6875rem', display: 'block', fontWeight: 600 }}>Running Weighted Avg</span>
                                        <strong style={{ color: '#0f172a', fontSize: '0.875rem' }}>AED {item.running_weighted_average?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                      </div>
                                    )}
                                    <div>
                                      <span style={{ color: '#64748b', fontSize: '0.6875rem', display: 'block', fontWeight: 600 }}>Baseline Value</span>
                                      <strong style={{ color: '#0f172a', fontSize: '0.875rem' }}>AED {(item.baseline_value ?? item.historical_average ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                    </div>
                                    {item.arithmetic_mean_running_weighted_average !== undefined && (
                                      <div>
                                        <span style={{ color: '#64748b', fontSize: '0.6875rem', display: 'block', fontWeight: 600 }}>Arithmetic Mean Avg</span>
                                        <strong style={{ color: '#0f172a', fontSize: '0.875rem' }}>AED {item.arithmetic_mean_running_weighted_average?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                      </div>
                                    )}
                                    {item.baseline_source && (
                                      <div style={{ gridColumn: '1 / -1', fontSize: '0.71875rem', color: '#475569', backgroundColor: '#eff6ff', border: '1px solid #dbeafe', padding: '0.5rem 0.75rem', borderRadius: '0.25rem', marginTop: '0.25rem' }}>
                                        <strong>Baseline Source:</strong> <span>{item.baseline_source}</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="proc-variance-reason-box">
                                    {item.reason}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem', padding: '2.5rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                            ✅ No monthly driver reasons recorded for this anomaly.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Unit Price Outlier Analysis Modal (4 Models) */}
          <OutlierDetailsModal
            isOpen={isOutlierModalOpen}
            onClose={() => setIsOutlierModalOpen(false)}
            selectedOutlierItemForModal={selectedOutlierItemForModal}
            unitPriceOutlierBaselineMonth={unitPriceOutlierBaselineMonth}
            outlierModelSubTab={outlierModelSubTab}
            setOutlierModelSubTab={setOutlierModelSubTab}
          />

          {/* Dynamic Close Confirmation Dialog */}
          {closeConfirmTarget !== null && (
            <div className="proc-modal-overlay" style={{ zIndex: 1300 }} onClick={() => setCloseConfirmTarget(null)}>
              <div
                className="proc-modal-confirm-content"
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{
                  width: '3.5rem',
                  height: '3.5rem',
                  borderRadius: '50%',
                  backgroundColor: '#fef2f2',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #fee2e2'
                }}>
                  <X width={24} height={24} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h4 className="proc-modal-title" style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                    {closeConfirmTarget === 'material' && 'Close Spend Breakdown?'}
                    {closeConfirmTarget === 'supplier' && 'Close Supplier Details?'}
                    {closeConfirmTarget === 'category' && 'Close Category Details?'}
                    {closeConfirmTarget === 'outlet' && 'Close Outlet Details?'}
                  </h4>
                  <p className="proc-modal-subtitle" style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>
                    {closeConfirmTarget === 'material' && `Are you sure you want to close the spend breakdown for "${selectedMaterialForModal?.material_name || 'this item'}"?`}
                    {closeConfirmTarget === 'supplier' && `Are you sure you want to close details for "${(selectedSupplierForModal as any)?.supplier_name || selectedSupplierForModal?.supplier || 'this supplier'}"?`}
                    {closeConfirmTarget === 'category' && `Are you sure you want to close details for "${selectedCategoryForModal?.category || 'this category'}"?`}
                    {closeConfirmTarget === 'outlet' && `Are you sure you want to close details for "${selectedOutletForModal?.outlet || 'this outlet'}"?`}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => setCloseConfirmTarget(null)}
                    className="proc-modal-btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCloseModal}
                    className="proc-modal-btn-download"
                    style={{ flex: 1 }}
                  >
                    Yes, Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Comprehensive Info / How-It-Works Guide Modal */}
          <InfoGuideModal
            isOpen={isInfoModalOpen}
            onClose={() => setIsInfoModalOpen(false)}
            infoModalTab={infoModalTab}
            setInfoModalTab={setInfoModalTab}
          />

          {/* Kraljic Matrix Detailed Analysis Modal */}
          <KraljicMatrixModal
            isOpen={isKraljicModalOpen}
            onClose={() => setIsKraljicModalOpen(false)}
            kraljicData={kraljicData}
            kraljicLoading={kraljicLoading}
            selectedKraljicQuadrant={selectedKraljicQuadrant}
            setSelectedKraljicQuadrant={setSelectedKraljicQuadrant}
            kraljicModalSearchQuery={kraljicModalSearchQuery}
            setKraljicModalSearchQuery={setKraljicModalSearchQuery}
            kraljicSupplierFilter={kraljicSupplierFilter}
            setKraljicSupplierFilter={setKraljicSupplierFilter}
            kraljicMaterialFilter={kraljicMaterialFilter}
            setKraljicMaterialFilter={setKraljicMaterialFilter}
            kraljicSortField={kraljicSortField}
            setKraljicSortField={setKraljicSortField}
            kraljicSortOrder={kraljicSortOrder}
            setKraljicSortOrder={setKraljicSortOrder}
            initialSuppliers={filterOptions.suppliers && filterOptions.suppliers.length > 0 ? filterOptions.suppliers : initialSuppliers}
            initialMaterials={filterOptions.materialCodes && filterOptions.materialCodes.length > 0 ? filterOptions.materialCodes : initialMaterials}
            handleBarRowClick={handleBarRowClick}
            kraljicPage={kraljicPage}
            setKraljicPage={setKraljicPage}
            kraljicPageSize={kraljicPageSize}
            setKraljicPageSize={setKraljicPageSize}
            loadKraljicMatrixData={loadKraljicMatrixData}
          />

          {/* Unit Price Point Click Details Modal */}
          <UnitPricePointModal
            isOpen={isUnitPricePointModalOpen}
            onClose={() => setIsUnitPricePointModalOpen(false)}
            unitPricePointSelectedMonth={unitPricePointSelectedMonth}
            unitPricePointData={unitPricePointData}
            unitPricePointLoading={unitPricePointLoading}
            unitPricePointTotalRecords={unitPricePointTotalRecords}
            unitPricePointTotalUnitPrice={unitPricePointTotalUnitPrice}
            unitPricePointPage={unitPricePointPage}
            unitPricePointPageSize={unitPricePointPageSize}
            setUnitPricePointPage={setUnitPricePointPage}
            loadUnitPricePointDetails={loadUnitPricePointDetails}
            handleBarRowClick={handleBarRowClick}
          />

          {/* Granular Outlet Spend & Outlier Details Modal */}
          {isOutletOutlierTableModalOpen && (
            <div className="proc-modal-overlay" style={{ zIndex: 1250 }} onClick={() => setIsOutletOutlierTableModalOpen(false)}>
              <div
                className="proc-modal-content-lg"
                style={{ maxWidth: '1000px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="proc-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 className="proc-modal-title" style={{ margin: 0 }}>Outlet Spend & Outlier Details</h3>
                    <p className="proc-modal-subtitle" style={{ margin: 0, marginTop: '0.25rem' }}>Granular table records mapping property spend and variance thresholds</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleDownloadDataExcel('outlet_spend', 'outlet_spend_variance')}
                      title="Download Data Excel"
                      className="download-action-btn"
                      disabled={downloadingExcelMap['outlet_spend']}
                    >
                      <Download width={12} height={12} /> {downloadingExcelMap['outlet_spend'] ? 'Loading...' : 'Excel'}
                    </button>
                    <button
                      type="button"
                      className="proc-modal-close-btn"
                      onClick={() => setIsOutletOutlierTableModalOpen(false)}
                    >
                      <X width={18} height={18} />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="proc-modal-body" style={{ padding: '1.25rem' }}>
                  {outletLoading ? (
                    <div className="proc-loading-spinner-container" style={{ minHeight: '200px' }}>
                      <SpinnerLoaders size="medium" text="Loading table details..." fullScreen={false} />
                    </div>
                  ) : (
                    <>
                      <div className="proc-detail-table-wrapper">
                        <table className="proc-data-table">
                          <thead>
                            <tr className="abc-table-header-row">
                              <th className="proc-detail-th left">Outlet Name</th>
                              <th className="proc-detail-th right">Total Spend (AED)</th>
                              <th className="proc-detail-th right">Average Spend (AED)</th>
                              <th className="proc-detail-th right">Variance (AED)</th>
                              <th className="proc-detail-th right">Variance (%)</th>
                              <th className="proc-detail-th left" style={{ textAlign: 'center' }}>Status</th>
                              <th className="proc-detail-th" style={{ textAlign: 'center' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {outletVarianceList.map((row, idx) => {
                              const isOutlier = row.status === 'High Spend Outlier';
                              const statusBg = isOutlier ? '#fef2f2' : '#f0fdf4';
                              const statusColor = isOutlier ? '#991b1b' : '#166534';
                              const statusBorder = isOutlier ? '#fecaca' : '#bbf7d0';

                              const variancePercent = row.avg_spend ? (row.variance / row.avg_spend) * 100 : 0;

                              return (
                                <tr key={idx} className="proc-detail-tr" style={{ cursor: 'pointer' }} onClick={() => {
                                  setIsOutletOutlierTableModalOpen(false);
                                  handleOutletBarClick(row);
                                }}>
                                  <td className="proc-detail-td left bold">
                                    {row.outlet}
                                  </td>
                                  <td className="proc-detail-td right bold-heavy">
                                    AED {row.total_spend ? row.total_spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                  </td>
                                  <td className="proc-detail-td right">
                                    AED {row.avg_spend ? row.avg_spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                  </td>
                                  <td className="proc-detail-td right bold" style={{ color: row.variance > 0 ? '#dc2626' : '#16a34a' }}>
                                    {row.variance > 0 ? (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                        ▲ AED {row.variance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    ) : row.variance < 0 ? (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                        ▼ AED {Math.abs(row.variance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    ) : (
                                      'AED 0.00'
                                    )}
                                  </td>
                                  <td className="proc-detail-td right bold" style={{ color: row.variance > 0 ? '#dc2626' : '#16a34a' }}>
                                    {row.variance > 0 ? `+${variancePercent.toFixed(1)}%` : row.variance < 0 ? `${variancePercent.toFixed(1)}%` : '0.0%'}
                                  </td>
                                  <td className="proc-detail-td" style={{ textAlign: 'center' }}>
                                    <span style={{
                                      padding: '0.125rem 0.5rem',
                                      borderRadius: '0.25rem',
                                      fontSize: '0.6875rem',
                                      fontWeight: 700,
                                      backgroundColor: statusBg,
                                      color: statusColor,
                                      border: `1px solid ${statusBorder}`,
                                    }}>
                                      {row.status}
                                    </span>
                                  </td>
                                  <td className="proc-detail-td" style={{ textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      className="proc-forecast-step-btn active"
                                      style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', fontWeight: 600 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsOutletOutlierTableModalOpen(false);
                                        handleOutletBarClick(row);
                                      }}
                                    >
                                      View Items →
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                            {outletVarianceList.length === 0 && (
                              <tr>
                                <td colSpan={7} className="abc-table-empty">
                                  No outlet spend variance data found.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Footer */}
                      <div className="abc-pagination-footer" style={{ marginTop: '1rem' }}>
                        <div className="abc-pagination-info">
                          Page {outletPage} of {Math.ceil(outletTotalCount / outletPageSize) || 1}
                        </div>
                        <div className="abc-pagination-actions">
                          <button
                            type="button"
                            disabled={outletPage <= 1 || outletLoading}
                            className="view-by-btn abc-page-btn"
                            onClick={() => setOutletPage(prev => Math.max(1, prev - 1))}
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            disabled={outletPage * outletPageSize >= outletTotalCount || outletLoading}
                            className="view-by-btn abc-page-btn"
                            onClick={() => setOutletPage(prev => prev + 1)}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Point Click Details Popup Modal */}
          <GraphPointDetailModal
            isOpen={Boolean(unitPriceClickedPoint)}
            onClose={() => setUnitPriceClickedPoint(null)}
            pointData={unitPriceClickedPoint}
            onRaiseQuery={(data) => {
              setRaiseQueryModalData(data);
              setIsRaiseQueryModalOpen(true);
            }}
          />

          {/* Raise Query / Ticket Modal */}
          <RaiseQueryModal
            isOpen={isRaiseQueryModalOpen}
            onClose={() => {
              setIsRaiseQueryModalOpen(false);
              setRaiseQueryModalData(null);
            }}
            defaultSupplierName={raiseQueryModalData?.supplierName || ''}
            defaultMaterialName={raiseQueryModalData?.materialName || ''}
            defaultFromDate={raiseQueryModalData?.fromDate || appliedFilters.fromDate || ''}
            defaultToDate={raiseQueryModalData?.toDate || appliedFilters.toDate || ''}
            defaultTitle={raiseQueryModalData?.title || ''}
            defaultMessage={raiseQueryModalData?.message || ''}
            defaultTo={raiseQueryModalData?.to || ''}
            defaultFrom={raiseQueryModalData?.from || ''}
          />

          {/* Show Queries Modal */}
          <ShowQueriesModal
            isOpen={isShowQueriesModalOpen}
            onClose={() => setIsShowQueriesModalOpen(false)}
            onOpenRaiseQuery={() => setIsRaiseQueryModalOpen(true)}
          />

          <MaterialSurveyModal
            isOpen={isSurveyModalOpen}
            onClose={() => setIsSurveyModalOpen(false)}
            initialMaterialName={surveyMaterialName || (appliedFilters?.materialCodes?.length ? appliedFilters.materialCodes[0] : '')}
            initialSupplierName={surveySupplierName || (appliedFilters?.suppliers?.length ? appliedFilters.suppliers[0] : '')}
            allAvailableMaterials={filterOptions?.materialCodes || (selectedMaterialForModal?.material_name ? [selectedMaterialForModal.material_name] : [])}
            allAvailableSuppliers={filterOptions?.suppliers || []}
          />

          {/* Floating Quick Action Raise Query Button with Hover Menu */}
          <div
            style={{
              position: 'fixed',
              bottom: '1.5rem',
              right: '1.5rem',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end'
            }}
            onMouseEnter={() => setIsFloatingMenuOpen(true)}
            onMouseLeave={() => setIsFloatingMenuOpen(false)}
          >
            {/* Popover Menu Options */}
            {isFloatingMenuOpen && (
              <div
                style={{
                  marginBottom: '0.5rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '0.75rem',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #cbd5e1',
                  padding: '0.375rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  minWidth: '160px',
                  boxSizing: 'border-box'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsFloatingMenuOpen(false);
                    setIsRaiseQueryModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#eff6ff';
                    e.currentTarget.style.color = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#1e293b';
                  }}
                >
                  <HelpCircle width={15} height={15} color="#2563eb" />
                  <span>Raise Query</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsFloatingMenuOpen(false);
                    setIsShowQueriesModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#eff6ff';
                    e.currentTarget.style.color = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#1e293b';
                  }}
                >
                  <MessageSquare width={15} height={15} color="#2563eb" />
                  <span>Show Queries</span>
                </button>

                {/* <button
                  type="button"
                  onClick={() => {
                    setIsFloatingMenuOpen(false);
                    setSurveyMaterialName('');
                    setIsSurveyModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#1e293b',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#eff6ff';
                    e.currentTarget.style.color = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#1e293b';
                  }}
                >
                  <ClipboardList width={15} height={15} color="#2563eb" />
                  <span>Go to Survey</span>
                </button> */}
              </div>
            )}

            {/* Main Floating Trigger Button */}
            <button
              type="button"
              onClick={() => setIsFloatingMenuOpen(prev => !prev)}
              title="Hover to view options: Raise Query or Show Queries"
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.625rem 1.125rem',
                fontSize: '0.8125rem',
                fontWeight: 700,
                boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.4), 0 4px 6px -4px rgba(37, 99, 235, 0.2)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease'
              }}
            >
              <HelpCircle width={16} height={16} />
              <span>Raise Query</span>
            </button>
          </div>

        </div>
      </main>

      {isSavingsModalOpen && (
        <div className="savings-modal-overlay" onClick={() => setIsSavingsModalOpen(false)}>
          <div className="savings-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="savings-modal-header">
              <div>
                <h3>Overall Savings History</h3>
                <span>Detailed breakdown of savings across materials and suppliers.</span>
              </div>
              <button className="savings-modal-close-btn" onClick={() => setIsSavingsModalOpen(false)}>
                <X width={24} height={24} />
              </button>
            </div>

            <div className="savings-modal-body">


              <div className="savings-modal-table-container">
                <table className="savings-modal-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Material</th>
                      <th style={{ textAlign: 'left' }}>Supplier</th>
                      <th style={{ textAlign: 'right' }} className="text-right">Quantity</th>
                      <th style={{ textAlign: 'right' }} className="text-right">Baseline UP</th>
                      <th style={{ textAlign: 'right' }} className="text-right">Latest UP</th>
                      <th style={{ textAlign: 'right' }} className="text-right">Actual Spend</th>
                      <th style={{ textAlign: 'right' }} className="text-right">Saved Amount</th>
                      <th style={{ textAlign: 'right' }} className="text-right">Savings %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savingsLoading ? (
                      <tr><td colSpan={8} className="text-center" style={{ padding: '3rem', textAlign: 'center' }}><SpinnerLoaders size="medium" text="Loading savings data..." fullScreen={false} /></td></tr>
                    ) : savingsData.length === 0 ? (
                      <tr><td colSpan={8} className="text-slate-500 text-center" style={{ padding: '3rem', textAlign: 'center' }}>No savings data found.</td></tr>
                    ) : (
                      savingsData.map((item, idx) => (
                        <tr key={idx}>
                          <td
                            style={{ textAlign: 'left' }}
                            className="material-link"
                            onClick={() => {
                              handleBarRowClick({
                                material_name: item.material_name,
                                total_spend: item.actual_spend || 0
                              });
                            }}
                          >
                            {item.material_name}
                          </td>
                          <td style={{ textAlign: 'left' }} className="text-slate-600">{item.supplier_name}</td>
                          <td style={{ textAlign: 'right' }} className="text-right font-medium">{item.quantity?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td style={{ textAlign: 'right' }} className="text-right">{item.baseline_unit_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td style={{ textAlign: 'right' }} className="text-right">{item.latest_unit_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td style={{ textAlign: 'right' }} className="text-right text-slate-900">{item.actual_spend?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td style={{ textAlign: 'right' }} className={`text-right font-semibold ${item.saved_amount > 0 ? 'text-green-600' : (item.saved_amount < 0 ? 'text-red-600' : 'text-slate-500')}`}>
                            {item.saved_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: 'right' }} className={`text-right font-semibold ${item.savings_pct > 0 ? 'text-green-600' : (item.savings_pct < 0 ? 'text-red-600' : 'text-slate-500')}`}>
                            {item.savings_pct?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {!savingsLoading && savingsTotalCount > 0 && (
                <div className="savings-modal-pagination">
                  <span>
                    Showing {((savingsPage - 1) * savingsPageSize) + 1} to {Math.min(savingsPage * savingsPageSize, savingsTotalCount)} of {savingsTotalCount} entries
                  </span>
                  <div className="flex-gap-sm">
                    <button
                      type="button"
                      disabled={savingsPage === 1}
                      onClick={() => { const newPage = savingsPage - 1; setSavingsPage(newPage); loadSavingsData(newPage); }}
                      className="savings-pagination-btn"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={savingsPage * savingsPageSize >= savingsTotalCount}
                      onClick={() => { const newPage = savingsPage + 1; setSavingsPage(newPage); loadSavingsData(newPage); }}
                      className="savings-pagination-btn"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewPulseReportDashboard;
