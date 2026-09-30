import React, { useState, useEffect, useRef, useCallback } from "react";
import "./GrnDashboard.css";
import { fetchGRNSummary } from "../api/PulseReportApi";
import styles from "./PrDashboard.styles";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import { Download, ChevronDown, Loader } from "lucide-react";
import {
  getGRNList,
  getPONumbers,
  getReceiptId,
  type RecordsResponseGRNDto,
} from "../api/GrnDashboardApi";
import {
  downloadGrnExcelWithFilters,
  triggerExcelDownload,
  type DownloadGrnExcelWithFiltersRequestDto,
} from "../api/PrDownloadExcelApi";
import SpinnerLoaders from "./SpinnerLoaders";
import { usePulseReport } from "./context/PulseReportContext";
import { useFilter } from "./context/PulseContext";
import { MultiSelectFilter } from "./MultiSelectFilter";
import {
  fetchCostCenter,
  fetchDepartments,
  fetchGLAccounts,
  fetchProperty,
  fetchRequesters,
  fetchSuppliers,
} from "../api/PulseReportInvoiceApi";
import BackButton from "./BackButton";

type StatusType =
  | "Completed"
  | "Failed"
  | "InApproval"
  | "InProcess"
  | "Syncing"
  | "Total"
  | "LastUpdatedAt";

export interface StatusGRNDTO {
  Completed: number;
  Failed: number;
  InApproval: number;
  InProcess: number;
  Syncing: number;
  Total: number;
  LastUpdatedAt: string;
}

export interface Filters {
  [key: string]: any;
  receipt_ids: string;
  po_numbers: string;
  from_date: string;
  to_date: string;
  suppliers: string[];
  departments: string[];
  property: string[];
  gl_account: string[];
  cost_center: string[];
  requesters: string[];
}

const GRNDashboard: React.FC = () => {
  const [activeStatus, setActiveStatus] = useState<StatusType | "">("");
  const [statusCounts, setStatusCounts] = useState<StatusGRNDTO | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [poSuggest, setPoSuggest] = useState<any[]>([]);
  const [ReceiptSuggest, setReceiptSuggest] = useState<any[]>([]);
  const [poInputValue, setPoInputValue] = useState("");
  const [receiptInputValue, setReceiptInputValue] = useState("");
  const [indexPo, setindexPo] = useState(1);
  const [indexReceipt, setindexReceipt] = useState(1);
  const [loadingReceipt, setLoadingReceipt] = useState<boolean>(false);
  const [loadingPo, setLoadingPo] = useState<boolean>(false);
  const [showPoSuggestions, setShowPoSuggestions] = useState(false);
  const [showReceiptSuggestions, setShowReceiptSuggestions] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedPoNumbers, setSelectedPoNumbers] = useState<string[]>([]);
  const [selectedReceiptNumbers, setSelectedReceiptNumbers] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingTable, setLoadingTable] = useState<boolean>(true);
  const [data, setData] = useState<RecordsResponseGRNDto | null>(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isDownloadLoading, setIsDownloadLoading] = useState(false);
  const [downloadLoadingLimit, setDownloadLoadingLimit] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState(0);

  const { filtersQuick } = useFilter();
  const [copyFilterQuick, setCopyFilterQuick] = useState<any>(filtersQuick);
  const [filters, setFilters] = useState<Filters>({
    receipt_ids: "",
    po_numbers: "",
    from_date: "",
    to_date: "",
    suppliers: [],
    departments: [],
    property: [],
    gl_account: [],
    cost_center: [],
    requesters: []
  });
  const navigate = useNavigate();
  const { selectedStatus } = usePulseReport();
  const emptyFetchDone = useRef(false);
  const emptyFetchDonePO = useRef(false);

  // Function to handle the Excel download
  const handleDownload = useCallback(async (limit: number, currentFilters: Filters, currentActiveStatus: StatusType | "") => {
    // 1. Set loading state
    setIsDownloadLoading(true);
    setDownloadLoadingLimit(limit);

    try {
      // 2. Construct the request DTO using current filters and active status
      const downloadRequest: DownloadGrnExcelWithFiltersRequestDto = {
        index: 1,
        limit, // The selected limit (1000, 5000, 30000)
        status: currentActiveStatus && currentActiveStatus !== "Total" ? [currentActiveStatus] : undefined,
        receiptIds: selectedReceiptNumbers?.length > 0 ? selectedReceiptNumbers : undefined,
        poNumbers: selectedPoNumbers?.length > 0 ? selectedPoNumbers : undefined,
        supplier_filter: currentFilters?.suppliers?.length > 0 ? currentFilters.suppliers : undefined,
        requester_filter: currentFilters?.requesters?.length > 0 ? currentFilters.requesters : undefined,
        department_filter: currentFilters?.departments?.length > 0 ? currentFilters.departments : undefined,
        gl_accounts_filter: currentFilters?.gl_account?.length > 0 ? currentFilters.gl_account : undefined,
        cost_centers_filter: currentFilters?.cost_center?.length > 0 ? currentFilters.cost_center : undefined,
        company_code_filter: currentFilters?.property?.length > 0 ? currentFilters.property : undefined,
        from_date: currentFilters?.from_date ? currentFilters.from_date : undefined,
        to_date: currentFilters?.to_date ? currentFilters.to_date : undefined,
      };

      // 3. Call the API to get the file stream/response
      const response = await downloadGrnExcelWithFilters(downloadRequest);
      
      // 4. Trigger the browser download process
      triggerExcelDownload(response);
      
      // 5. Show success notification
      toast.success("GRN data download initiated successfully! Check your downloads.");
      
    } catch (err: any) {
      // 6. Handle errors and show a toast notification
      let errorMessage = "Failed to download file. Please try again.";
      
      if (err?.response?.status === 404) {
        errorMessage = "No GRN data found for the applied filters. Please check your filters and try again.";
      } else if (err?.response?.status === 500) {
        errorMessage = "Server error occurred. Please try again later.";
      } else if (err?.message) {
        errorMessage = err.message;
      }

      toast.error(`${errorMessage}`);
      
    } finally {
      // 7. Reset loading state and close the dropdown
      setIsDownloadLoading(false);
      setDownloadLoadingLimit(null);
      setIsDownloadOpen(false);
    }
  }, [selectedPoNumbers, selectedReceiptNumbers]);

  const handleFilterChange = (field: keyof Filters, value: string): void => {
    setCurrentPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearAllFilters = (): void => {
    setFilters({
      receipt_ids: "",
      po_numbers: "",
      from_date: "",
      to_date: "",
      suppliers: [],
      departments: [],
      property: [],
      gl_account: [],
      cost_center: [],
      requesters: []
    });
    setSelectedPoNumbers([]);
    setSelectedReceiptNumbers([]);
    setActiveStatus("");
    setCopyFilterQuick({});
  };

  const nextPage = (): void => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const prevPage = (): void => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handlePoSelect = (po: string) => {
    setSelectedPoNumbers([...selectedPoNumbers, po]);
    setFilters((prev) => ({
      ...prev,
      po_numbers: [...selectedPoNumbers, po].join(","),
    }));
    setPoInputValue("");
    setShowPoSuggestions(false);
    setCurrentPage(1);
    document.getElementById("po-input-grn")?.blur();
  };

  const handleReceiptSelect = (po: string) => {
    setSelectedReceiptNumbers([...selectedReceiptNumbers, po]);
    setFilters((prev) => ({
      ...prev,
      receipt_ids: [...selectedReceiptNumbers, po].join(","),
    }));
    setReceiptInputValue("");
    setShowReceiptSuggestions(false);
    setCurrentPage(1);
    document.getElementById("receipt_ids-input-grn")?.blur();
  };

  const handlePoRemove = (poToRemove: string) => {
    const updated = selectedPoNumbers.filter((po) => po !== poToRemove);
    setSelectedPoNumbers(updated);
    setFilters((prev) => ({ ...prev, po_numbers: updated.join(",") }));
    setCurrentPage(1);
  };

  const handleReceiptRemove = (poToRemove: string) => {
    const updated = selectedReceiptNumbers.filter((po) => po !== poToRemove);
    setSelectedReceiptNumbers(updated);
    setFilters((prev) => ({ ...prev, receipt_ids: updated.join(",") }));
    setCurrentPage(1);
  };

  const handlePoRemoveReceipt = (poToRemove: string) => {
    const updated = selectedReceiptNumbers.filter((po) => po !== poToRemove);
    setSelectedReceiptNumbers(updated);
    setFilters((prev) => ({ ...prev, receipt_ids: updated.join(",") }));
    setCurrentPage(1);
  };

  const handlePoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setPoInputValue(newValue);
    setindexPo(1);
    if (
      newValue === "" &&
      selectedPoNumbers.length > 0 &&
      poInputValue !== ""
    ) {
      handlePoRemove(selectedPoNumbers[selectedPoNumbers.length - 1]);
    } else {
      setShowPoSuggestions(true);
    }
  };

  const handleReceiptInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setReceiptInputValue(newValue);
    setindexReceipt(1);
    if (
      newValue === "" &&
      selectedReceiptNumbers.length > 0 &&
      receiptInputValue !== ""
    ) {
      handleReceiptRemove(
        selectedReceiptNumbers[selectedReceiptNumbers.length - 1],
      );
    } else {
      setShowReceiptSuggestions(true);
    }
  };

  const handleInputFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setShowPoSuggestions(true);
  };

  const handleInputFocusReceipt = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setShowReceiptSuggestions(true);
  };

  const handleInputBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setShowPoSuggestions(false);
    }, 150);
  };

  const handleInputBlurReceipt = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setShowReceiptSuggestions(false);
    }, 150);
  };

  const filteredPoSuggestions = poSuggest
    ? poSuggest?.filter(
        (po: string) =>
          po.toLowerCase()?.includes(poInputValue?.toLowerCase()) &&
          !selectedPoNumbers.includes(po),
      )
    : [];

  const filteredReceiptSuggestions = ReceiptSuggest
    ? ReceiptSuggest?.filter(
        (po: string) =>
          po.toLowerCase()?.includes(receiptInputValue?.toLowerCase()) &&
          !selectedReceiptNumbers.includes(po),
      )
    : [];

  useEffect(() => {
    const fetchDashboardSummary = async () => {
      setLoading(true);
      try {
        const data = (await fetchGRNSummary(
          copyFilterQuick,
        )) as StatusGRNDTO | null;
        setStatusCounts(data);
      } catch (error: any) {
        if (error?.response?.status === 401) {
          navigate("/");
        }
        if (
          error?.response?.status === 404 ||
          error?.response?.status === 500
        ) {
          setStatusCounts(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardSummary();
  }, [copyFilterQuick]);

  const fetchPONumbers = async () => {
    setLoadingPo(true);
    try {
      const data = await getPONumbers(
        poInputValue,
        indexPo === 1 ? 1 : indexPo,
      );
      setPoSuggest((prev: string[] = []) => [
        ...prev,
        ...(data?.po_numbers || []),
      ]);
    } catch (error: any) {
      if (error?.response?.status === 401) navigate("/");
      if (error?.response?.status === 404 || error?.response?.status === 500) {
        setPoSuggest([]);
      }
    } finally {
      setLoadingPo(false);
      emptyFetchDonePO.current = false;
    }
  };

  useEffect(() => {
    let debounceTimer: any;

    if (poInputValue === "") {
      fetchPONumbers();
      return;
    }
    debounceTimer = setTimeout(() => {
      fetchPONumbers();
    }, 2000);

    return () => clearTimeout(debounceTimer);
  }, [poInputValue, indexPo]);

  const fetchReceiptNumbers = async (indexReceipt: number) => {
    setLoadingReceipt(true);
    try {
      const data = await getReceiptId(
        receiptInputValue,
        indexReceipt === 1 ? 1 : indexReceipt,
      );
      if (data.receipt_ids && data.receipt_ids.length > 0) {
        setReceiptSuggest((prev: any) => [...prev, ...data.receipt_ids]);
      }
    } catch (error: any) {
      if (error?.response?.status === 401) navigate("/");
      if (error?.response?.status === 404 || error?.response?.status === 500) {
        setReceiptSuggest([]);
      }
    } finally {
      emptyFetchDone.current = false;
      setLoadingReceipt(false);
    }
  };

  useEffect(() => {
    let debounceTimer: any;

    if (receiptInputValue === "") {
      fetchReceiptNumbers(indexReceipt);
      return;
    }
    debounceTimer = setTimeout(() => {
      fetchReceiptNumbers(indexReceipt);
    }, 2000);

    return () => clearTimeout(debounceTimer);
  }, [receiptInputValue, indexReceipt]);

  useEffect(() => {
    setLoadingTable(true);
    const debounceTimer = setTimeout(() => {
      const loadData = async () => {
        try {
          const response = await getGRNList({
            status:
              activeStatus && activeStatus !== "Total" ? [activeStatus] : [],
            supplier_filter: filters?.suppliers ?? copyFilterQuick?.supplier_filter,
            requester_filter: filters.requesters ?? copyFilterQuick?.requester_filter,
            company_code_filter: filters.property ?? copyFilterQuick?.company_code_filter,
            department_filter: filters?.departments ?? copyFilterQuick?.department_filter,
            cost_centers_filter: filters?.cost_center ?? copyFilterQuick?.cost_centers_filter,
            gl_accounts_filter: filters?.gl_account ?? copyFilterQuick?.gl_accounts_filter,
            receiptIds: selectedReceiptNumbers || [],
            poNumbers: selectedPoNumbers || [],
            from_date:
              filters?.from_date || "",
            to_date:
              filters?.to_date || "",
            page: currentPage,
            page_size: 20,
          });
           setTotalPages(response?.total_pages || Math.ceil((response?.total_count || 0) / 20));
          setData(response);
        } catch (error: any) {
          if (error?.response?.status === 401) {
            navigate("/");
          }
          if (
            error?.response?.status === 404 ||
            error?.response?.status === 500
          ) {
            setData(null);
          }
        } finally {
          setLoadingTable(false);
        }
      };

      loadData();
    }, 1000);

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [filters, currentPage, activeStatus, selectedPoNumbers, filtersQuick, copyFilterQuick]);

  const handleReceiptScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;

    const isAtBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 5;
    if (!isAtBottom) return;

    if (emptyFetchDone.current) return;

    emptyFetchDone.current = true;
    if (isAtBottom) {
      emptyFetchDone.current = true;
      setindexReceipt((prev) => prev + 1);
    }
  };

  const handleReceiptScrollPO = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;

    const isAtBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 5;
    if (!isAtBottom) return;

    if (emptyFetchDonePO.current) return;

    emptyFetchDonePO.current = true;
    if (isAtBottom) {
      emptyFetchDonePO.current = true;
      setindexPo((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (selectedStatus) {
      setActiveStatus(selectedStatus as StatusType);
    }
  }, [selectedStatus]);
 useEffect(() => {
    if (!filtersQuick || Object.keys(filtersQuick || {})?.length === 0) {
    return;
  }
  if(filtersQuick?.company_code_filter || filtersQuick?.department_filter || filtersQuick?.cost_centers_filter || filtersQuick?.gl_accounts_filter || filtersQuick?.supplier_filter || filtersQuick?.requester_filter || filtersQuick?.from_date || filtersQuick?.to_date){
  setFilters({...filters,
    suppliers: filtersQuick?.supplier_filter || [],
    requesters: filtersQuick?.requester_filter || [],
    property: filtersQuick?.company_code_filter || [],
    departments: filtersQuick?.department_filter || [],
    cost_center: filtersQuick?.cost_centers_filter || [],
    gl_account: filtersQuick?.gl_accounts_filter || [],
    from_date: filtersQuick?.from_date || "",
    to_date: filtersQuick?.to_date || "",
  });
} 
}, [filtersQuick]);
  return (
    <>
      {loading ? (
        <>
          <SpinnerLoaders
            fullScreen={true}
            size="medium"
            text="Loading data..."
          />
        </>
      ) : (
        <>
          <div style={styles.container}>
            <div className="back-button-container">
                    <BackButton className="CD-back-button" iconClassName="CD-add-icon" />
                  </div>
            <header style={styles.header}>
              <h1 style={styles.headerTitle}>GRN Dashboard</h1>
            </header>
            <div style={styles.statusCards}>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "Completed"
                    ? styles.statusCardActive
                    : {}),
                }}
                onClick={() => {
                  setActiveStatus("Completed");
                  setCurrentPage(1);
                }}
              >
                <span>Completed: {statusCounts?.Completed || 0}</span>
              </div>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "Failed" ? styles.statusCardActive : {}),
                }}
               onClick={() => {
                  setActiveStatus("Failed");
                  setCurrentPage(1);
                }}
              >
                <span>Failed: {statusCounts?.Failed || 0}</span>
              </div>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "InApproval"
                    ? styles.statusCardActive
                    : {}),
                }}
                onClick={() => {
                  setActiveStatus("InApproval");
                  setCurrentPage(1);
                }}
              >
                <span>In Approval: {statusCounts?.["InApproval"] || 0}</span>
              </div>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "Syncing"
                    ? styles.statusCardActive
                    : {}),
                }}
                onClick={() => {
                  setActiveStatus("Syncing");
                  setCurrentPage(1);
                }}
              >
                <span>Syncing: {statusCounts?.Syncing || 0}</span>
              </div>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "Total" ? styles.statusCardActive : {}),
                }}
                onClick={() => {
                  setActiveStatus("Total");
                  setCurrentPage(1);
                }}
              >
                <span>Total: {statusCounts?.Total || 0}</span>
              </div>
            </div>
            <div style={styles.filtersContainer}>
              <div style={styles.filtersHeader}>
                <span style={styles.filterIcon}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="18"
                    height="18"
                  >
                    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                  </svg>
                </span>
                <span>Filters</span>
              </div>
              <div style={styles.filtersGridsGrn}>
                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Receipt Id</label>
                  <div style={styles.containerGrn}>
                    <div
                      style={styles.inputWrapperGrn}
                      onClick={() =>
                        document
                          .getElementById("receipt_ids-input-grn")
                          ?.focus()
                      }
                    >
                      {selectedReceiptNumbers?.map((po) => (
                        <div key={po} style={styles.chipGrn}>
                          <span style={styles.chipTextGrn}>{po}</span>
                          <button
                            style={styles.removeBtnGrn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePoRemoveReceipt(po);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <input
                        id="receipt_ids-input-grn"
                        style={styles.inputGrn}
                        value={receiptInputValue}
                        onChange={handleReceiptInputChange}
                        onFocus={handleInputFocusReceipt}
                        onBlur={handleInputBlurReceipt}
                        autoComplete="off"
                      />
                    </div>
                    {showReceiptSuggestions && (
                      <div
                        style={styles.suggestionsDropdownGrn}
                        onScroll={handleReceiptScroll}
                      >
                        {/* ✅ Show loader when loading */}
                        {loadingReceipt ? (
                          <div style={{ padding: "10px", textAlign: "center" }}>
                            <SpinnerLoaders
                              fullScreen={false}
                              size="small"
                              text="Loading data..."
                            />
                          </div>
                        ) : (
                          ReceiptSuggest &&
                          (receiptInputValue === ""
                            ? ReceiptSuggest?.filter(
                                (po: string) =>
                                  !selectedReceiptNumbers?.includes(po),
                              )
                            : filteredReceiptSuggestions
                          )?.map((po: string) => (
                            <div
                              key={po}
                              style={styles.suggestionItemGrn}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleReceiptSelect(po);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#f5f5f5";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                              }}
                            >
                              {po}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Po Number</label>
                  <div style={styles.containerGrn}>
                    <div
                      style={styles.inputWrapperGrn}
                      onClick={() =>
                        document.getElementById("po-input-grn")?.focus()
                      }
                    >
                      {selectedPoNumbers?.map((po) => (
                        <div key={po} style={styles.chipGrn}>
                          <span style={styles.chipTextGrn}>{po}</span>
                          <button
                            style={styles.removeBtnGrn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePoRemove(po);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <input
                        id="po-input-grn"
                        style={styles.inputGrn}
                        value={poInputValue}
                        onChange={handlePoInputChange}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        type="number"
                        autoComplete="off"
                      />
                    </div>
                    {showPoSuggestions && (
                      <div
                        style={styles.suggestionsDropdownGrn}
                        onScroll={handleReceiptScrollPO}
                      >
                        {/* ✅ Show loader when API is loading */}
                        {loadingPo ? (
                          <div style={{ padding: "10px", textAlign: "center" }}>
                            <SpinnerLoaders
                              fullScreen={false}
                              size="small"
                              text="Loading data..."
                            />
                          </div>
                        ) : (
                          poSuggest &&
                          (poInputValue === ""
                            ? poSuggest?.filter(
                                (po: string) =>
                                  !selectedPoNumbers?.includes(po),
                              )
                            : filteredPoSuggestions
                          )?.map((po: string) => (
                            <div
                              key={po}
                              style={styles.suggestionItemGrn}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handlePoSelect(po);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#f5f5f5";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                              }}
                            >
                              {po}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="im-filters-grid">
                {[
                  {
                    label: "Suppliers",
                    field: "suppliers",
                    placeholder: "Search...",
                    api: fetchSuppliers,
                  },
                  {
                    label: "Department",
                    field: "departments",
                    placeholder: "All depts",
                    api: fetchDepartments,
                  },
                  {
                    label: "GL Account",
                    field: "gl_account",
                    placeholder: "Search...",
                    api: fetchGLAccounts,
                  },
                  {
                    label: "Property",
                    field: "property",
                    placeholder: "Search...",
                    api: fetchProperty,
                  },
                  {
                    label: "Cost Center",
                    field: "cost_center",
                    placeholder: "Search...",
                    api: fetchCostCenter,
                  },
                  {
                    label: "Requesters",
                    field: "requesters",
                    placeholder: "Search...",
                    api: fetchRequesters,
                  },
                ].map(({ label, field, placeholder, api }) => (
                  <MultiSelectFilter
                    key={field}
                    label={label}
                    placeholder={placeholder}
                    selected={filters[field]}
                    onChange={(values) => {
                      setFilters((prev) => ({ ...prev, [field]: values }));
                    }}
                    fetchOptions={api}
                  />
                ))}
              </div>
              <div className="im-date-filters">
          <div className="im-filter-group">
            <label className="im-filter-label"> Create Date Range</label>
            <div className="im-date-range">
                    <input
                      type="date"
                      className="im-date-input"
                      value={filters.from_date}
                      onChange={(e) =>
                        handleFilterChange("from_date", e.target.value)
                      }
                    />
                    <input
                      type="date"
                      className="im-date-input"
                      value={filters.to_date}
                      onChange={(e) =>
                        handleFilterChange("to_date", e.target.value)
                      }
                    />
                  </div>
                </div>
                <button className="im-clear-filters-btn" onClick={clearAllFilters}>
                  Clear All Filters
                </button>

                 <div
                        style={{ position: "relative"}}
                        onClick={() => setIsDownloadOpen(prev => !prev)}
                        
                      >
                      <button
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 16px",
                          backgroundColor: "#2563eb",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: isDownloadLoading ? "not-allowed" : "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          opacity: isDownloadLoading ? 0.6 : 1,
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isDownloadLoading)
                            (e.currentTarget as any).style.backgroundColor = "#1d4ed8";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as any).style.backgroundColor = "#2563eb";
                        }}
                        disabled={isDownloadLoading}
                      >
                        <Download size={16} />
                        Download Data
                        <ChevronDown
                          size={16}
                          style={{
                            transition: "transform 0.2s",
                            transform: isDownloadOpen ? "rotate(180deg)" : "rotate(0deg)",
                          }}
                        />
                      </button>

                      {isDownloadOpen && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                           
                            marginTop: "8px",
                            width: "240px",
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            zIndex: 50,
                          }}
                        >
                          {[
                            { label: "Download 1000 Records", limit: 1000 },
                            { label: "Download 5000 Records", limit: 5000 },
                            { label: "Download 10000 Records", limit: 10000 },
                            { label: "Download 20000 Records", limit: 20000 },
                            { label: "Download 25000 Records", limit: 25000 },
                            { label: "Download 30000 Records", limit: 30000 },
                          ].map((option, index) => (
                            <button
                              key={option.limit}
                              onClick={() => handleDownload(option.limit, filters, activeStatus)}
                              disabled={isDownloadLoading}
                              style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "12px 16px",
                                textAlign: "left",
                                color: "#374151",
                                backgroundColor: "transparent",
                                border: index < 2 ? "1px solid #f3f4f6" : "none",
                                cursor: isDownloadLoading ? "not-allowed" : "pointer",
                                fontSize: "14px",
                                transition: "background-color 0.2s",
                                opacity: isDownloadLoading ? 0.5 : 1,
                                borderRadius:
                                  index === 0
                                    ? "8px 8px 0 0"
                                    : index === 2
                                    ? "0 0 8px 8px"
                                    : "0",
                              }}
                              onMouseEnter={(e) => {
                                if (!isDownloadLoading)
                                  (e.currentTarget as any).style.backgroundColor = "#f0f4ff";
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as any).style.backgroundColor = "transparent";
                              }}
                            >
                              {isDownloadLoading && downloadLoadingLimit === option.limit ? (
                                <Loader
                                  size={16}
                                  style={{ color: "#2563eb", animation: "spin 1s linear infinite" }}
                                />
                              ) : (
                                <Download size={16} style={{ color: "#2563eb" }} />
                              )}
                              <span style={{ fontWeight: "500" }}>{option.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
              </div>
            </div>
            {!loadingTable && (
              <div style={styles.paginationTop}>
                <button
                  style={{
                    ...styles.paginationBtn,
                    ...(currentPage === 1 ? styles.paginationBtnDisabled : {}),
                  }}
                  onClick={prevPage}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span style={styles.paginationInfo}>
                  Page {data?.index || 0} of {data?.total_pages || totalPages || 0}
                </span>
                <button
                  style={{
                    ...styles.paginationBtn,
                    ...(data?.records?.length === 0
                      ? styles.paginationBtnDisabled
                      : {}),
                  }}
                  onClick={nextPage}
                  disabled={data?.records?.length === 0}
                >
                  Next
                </button>
              </div>
            )}
            <div style={styles.tableContainer}>
              <div style={{ overflowX: "auto", maxHeight: "65vh" }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableHeader}>Po Number</th>
                      <th style={styles.tableHeader}>Line Item</th>
                      <th style={styles.tableHeader}>Status</th>
                      <th style={styles.tableHeader}>Company Code</th>

                      <th style={styles.tableHeader}>Receipt Id</th>
                      <th style={styles.tableHeader}>Requester</th>
                      <th style={styles.tableHeader}>Created</th>
                      <th style={styles.tableHeader}>EPID</th>
                      <th style={styles.tableHeader}>Erp Receipt Id</th>
                      <th style={styles.tableHeader}>Material Code</th>
                      <th style={styles.tableHeader}>Processed State</th>
                      <th style={styles.tableHeader}>Processed Receipt Id</th>
                      <th style={styles.tableHeader}>Quantity</th>

                      <th style={styles.tableHeader}>Success Cloud Erpid</th>
                      <th style={styles.tableHeader}>Unit Of Measure</th>
                      <th style={styles.tableHeader}>Cost Center</th>
                      <th style={styles.tableHeader}>GL Account</th>
                      <th style={styles.tableHeader}>Supplier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingTable ? (
                      <tr style={styles.tableRow}>
                        <td
                          colSpan={13}
                          style={{ textAlign: "center", padding: "10px" }}
                        >
                          <SpinnerLoaders
                            fullScreen={false}
                            size="medium"
                            text="Loading data..."
                          />
                        </td>
                      </tr>
                    ) : (data?.records?.length ?? 0) > 0 ? (
                      data?.records?.map((item: any, i: number) => (
                        <tr key={i + 1} style={styles.tableRow}>
                          <td style={styles.tableCell}>{item["Po Number"]}</td>
                          <td style={styles.tableCell}>{item.line_item}</td>
                          <td style={styles.tableCell}>
                            <span style={styles.statusBadge}>
                              {item?.display_status ?? ""}
                            </span>
                          </td>
                          <td style={styles.tableCell}>{item.CompanyCode}</td>

                          <td style={styles.tableCell}>{item["Receipt Id"]}</td>
                          <td style={styles.tableCell}>{item.Requester}</td>
                          <td style={styles.tableCell}>
                            {item.date_created?.split("T")[0] ?? ""}
                          </td>
                          <td style={styles.tableCell}>{item.epid}</td>
                          <td style={styles.tableCell}>{item.erpreceipt_id}</td>
                          <td style={styles.tableCell}>{item.material_code}</td>
                          <td style={styles.tableCell}>
                            {item.processed_state}
                          </td>
                          <td style={styles.tableCell}>
                            {item.processed_receipt_id}
                          </td>
                          <td style={styles.tableCell}>{item.quantity}</td>

                          <td style={styles.tableCell}>
                            {item.success_cloud_erpid}
                          </td>
                          <td style={styles.tableCell}>
                            {item.unit_of_measure}
                          </td>
                          <td style={styles.tableCell}>
                            {item["Cost Center"]}
                          </td>
                          <td style={styles.tableCell}>{item["GL Account"]}</td>
                          <td style={styles.tableCell}>{item["Supplier"]}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={13}
                          style={{
                            textAlign: "center",
                            padding: "12px",
                            fontWeight: 500,
                            fontSize: "14px",
                            color: "#555",
                          }}
                        >
                          No Data Found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        </>
      )}
    </>
  );
};

export default GRNDashboard;