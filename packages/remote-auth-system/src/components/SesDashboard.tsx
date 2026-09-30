// File: SSCManagement.tsx
import React, { useEffect, useState , useCallback} from "react";
import styles from "./PrDashboard.styles";
import type { SesSummaryDTO } from "../Dto/PrDashboardDto";
import { toast} from 'react-toastify';
import { Download, ChevronDown, Loader } from "lucide-react";
import {
  getSESList,
  sesdashBoardSummary,
  getSesFilter,
  type SesRecordsResponseDTO,
} from "../api/SesDashboardApi";
import {
  downloadSesExcelWithFilters,
  triggerSesExcelDownload,
  type DownloadSesExcelWithFiltersRequestDto,

} from "../api/PrDownloadExcelApi";
import { useNavigate } from "react-router-dom";
import SpinnerLoaders from "./SpinnerLoaders";
import { usePulseReport } from "./context/PulseReportContext";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { useFilter } from "./context/PulseContext";
import {
  fetchCostCenter,
  fetchDepartments,
  fetchGLAccounts,
  fetchProperty,
  fetchRequesters,
  fetchSuppliers,
} from "../api/PulseReportInvoiceApi";
import BackButton from "./BackButton";

export interface Filters {
  [key: string]: any;
  status_strings: string;
  unique_names: string[];
  service_entry_ids: string[];
  requesters: string[];
  erp_receipt_numbers: string[];
  from_date: string;
  to_date: string;
  suppliers: string[];
  departments: string[];
  property: string[];
  gl_account: string[];
  cost_center: string[];
}

/** --- Component --- **/
const SSCManagement: React.FC = () => {
  const navigate = useNavigate();
  const { selectedStatus } = usePulseReport();
  type StatusType =
    | "Approved"
    | "Composing"
    | "ERPSystemDeclined"
    | "Invoiced"
    | "PartiallyInvoiced"
    | "Processed"
    | "Rejected"
    | "SendingToExternalSystem"
    | "Submitted"
    | "Total";

  const [activeStatus, setActiveStatus] = useState<StatusType | "">("");
  const [loading, setLoading] = useState<boolean>(true);
  const [statusCounts, setStatusCounts] = useState<SesSummaryDTO | null>(null);
  const [loadingTable, setLoadingTable] = useState<boolean>(true);
  const [data, setData] = useState<SesRecordsResponseDTO | null>(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isDownloadLoading, setIsDownloadLoading] = useState(false);
  const [downloadLoadingLimit, setDownloadLoadingLimit] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState(0);
  const { filtersQuick } = useFilter();
   const [copyFilterQuick,setCopyFilterQuick]=useState<any>(filtersQuick);
  const [filters, setFilters] = useState<Filters>({
    status_strings: "",
    unique_names: [],
    service_entry_ids: [],
    requesters: [],
    erp_receipt_numbers: [],
    from_date: "",
    to_date: "",
    suppliers: [],
    departments: [],
    property: [],
    gl_account: [],
    cost_center: [],
  });

  const clearAllFilters = (): void => {
    setFilters({
      status_strings: "",
      unique_names: [],
      service_entry_ids: [],
      requesters: [],
      erp_receipt_numbers: [],
      from_date: "",
      to_date: "",
      suppliers: [],
      departments: [],
      property: [],
      gl_account: [],
      cost_center: [],
    });
    setActiveStatus("");
    setCopyFilterQuick({});
  };


  // Function to handle the Excel download
    const handleDownload = useCallback(async (limit: number, currentFilters: Filters, currentActiveStatus: StatusType | "") => {
        // 1. Set loading state
        setIsDownloadLoading(true);
        setDownloadLoadingLimit(limit);

        try {
            // 2. Construct the request DTO using current filters and active status
            const downloadRequest: DownloadSesExcelWithFiltersRequestDto = {
                index: 1,
                limit, // The selected limit (1000, 5000, 30000)
                status_strings: currentActiveStatus && currentActiveStatus !== "Total" ? [currentActiveStatus] : undefined,
                unique_names: currentFilters?.unique_names?.length > 0 ? currentFilters.unique_names : undefined,
                service_entry_ids: currentFilters?.service_entry_ids?.length > 0 ? currentFilters.service_entry_ids : undefined,
                requester_filter: currentFilters?.requesters?.length > 0 ? currentFilters.requesters : undefined,
                supplier_filter: currentFilters?.supplier?.length > 0 ? currentFilters.supplier : undefined,
                department_filter: currentFilters?.department?.length > 0 ? currentFilters.department : undefined,
                gl_accounts_filter: currentFilters?.glAccount?.length > 0 ? currentFilters.glAccount : undefined,
                cost_centers_filter: currentFilters?.costCenter?.length > 0 ? currentFilters.costCenter : undefined,
                company_code_filter: currentFilters?.property?.length > 0 ? currentFilters.property : undefined,
                erp_receipt_numbers: currentFilters?.erp_receipt_numbers?.length > 0 ? currentFilters.erp_receipt_numbers : undefined,
                from_date: currentFilters?.from_date ? currentFilters.from_date : undefined,
                to_date: currentFilters?.to_date ? currentFilters.to_date : undefined,
            };

            // 3. Call the API to get the file stream/response
            const response = await downloadSesExcelWithFilters(downloadRequest);
            
            // 4. Trigger the browser download process
            triggerSesExcelDownload(response);
            
            // 5. Show success notification
            toast.success("SES data download initiated successfully! Check your downloads.");
            
        } catch (err: any) {
            // 6. Handle errors and show a toast notification
            let errorMessage = "Failed to download file. Please try again.";
            
            if (err?.response?.status === 404) {
                errorMessage = "No SES data found for the applied filters. Please check your filters and try again.";
            } else if (err?.response?.status === 500) {
                errorMessage = "Server error occurred.Please try again later.";
            }
            else if (err?.message) {
                errorMessage = err.message;
            }

            toast.error(`${errorMessage}`);
            
        } finally {
            // 7. Reset loading state and close the dropdown
            setIsDownloadLoading(false);
            setDownloadLoadingLimit(null);
            setIsDownloadOpen(false);
        }
    }, []);

  // beforeunload listener (browser close / reload)

  const handleFilterChange = <K extends keyof Filters>(
    field: K,
    value: Filters[K], // ← This allows string[] or string
  ): void => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };
  const nextPage = (): void => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const prevPage = (): void => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };
  const fetchDashboardSummary = async () => {
    setLoading(true);
    try {
      const data = (await sesdashBoardSummary(
        copyFilterQuick || {},
      )) as SesSummaryDTO | null;
      setStatusCounts(data);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        navigate("/");
      }
      if (error?.response?.status === 404 || error?.response?.status === 500) {
        setStatusCounts(null);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchDashboardSummary();
  }, [copyFilterQuick]);
  useEffect(() => {
    const loadData = async () => {
      setLoadingTable(true);
      try {
        const data = (await sesdashBoardSummary(
          filtersQuick,
        )) as SesSummaryDTO | null;
        setStatusCounts(data);
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
  }, []);
  useEffect(() => {
    setLoadingTable(true);
    const debounceTimer = setTimeout(() => {
      const loadData = async () => {
        try {
          const response = await getSESList({
            status_strings:
              activeStatus && activeStatus !== "Total" ? [activeStatus] : [],
            requester_filter: filters?.requesters
              ? filters?.requesters
              :  copyFilterQuick?.requester_filter,
            department_filter: filters?.departments,
            supplier_filter:
              filters?.suppliers ?? filters?.supplier_filter,
                company_code_filter: filters?.property
              ? filters?.property
              :  copyFilterQuick?.company_code_filter,
            unique_names: filters?.unique_names,
            service_entry_ids: filters?.service_entry_ids,
            erp_receipt_numbers: filters?.erp_receipt_numbers,
            from_date: filters?.from_date
              ? filters?.from_date ||  copyFilterQuick?.from_date
              : "",
            to_date: filters?.to_date
              ? filters?.to_date || copyFilterQuick?.to_date
              : "",
            index: currentPage,
            limit: 20,
            cost_centers_filter: filters?.cost_center,
            gl_accounts_filter: filters?.gl_account
          });
          setData(response);
          setTotalPages( response?.total_pages || Math.ceil((response?.total_count || 0) / 20));
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
  }, [filters, currentPage, activeStatus, copyFilterQuick]);
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


  // const hasMoreRecords = (data?.total_count ?? 0) > (data?.index ?? 0) * 20;
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
              <h1 style={styles.headerTitle}>Quick SES</h1>
            </header>
            <div style={styles.statusCards}>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "Approved"
                    ? styles.statusCardActive
                    : {}),
                }}
                onClick={() => {
                  setActiveStatus("Approved");
                  setCurrentPage(1);
                }}
              >
                <span>Approved: {statusCounts?.Approved || 0}</span>
              </div>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "Composing"
                    ? styles.statusCardActive
                    : {}),
                }}
                onClick={() => {
                  setActiveStatus("Composing");
                  setCurrentPage(1);
                }}
              >
                <span>Composing: {statusCounts?.Composing || 0}</span>
              </div>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "ERPSystemDeclined"
                    ? styles.statusCardActive
                    : {}),
                }}
                onClick={() => {
                  setActiveStatus("ERPSystemDeclined");
                  setCurrentPage(1);
                }}
              >
                <span>
                  ERP System Declined: {statusCounts?.ERPSystemDeclined || 0}
                </span>
              </div>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "Invoiced"
                    ? styles.statusCardActive
                    : {}),
                }}
                onClick={() => {
                  setActiveStatus("Invoiced");
                  setCurrentPage(1);
                }}
              >
                <span>Invoiced: {statusCounts?.Invoiced || 0}</span>
              </div>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "PartiallyInvoiced"
                    ? styles.statusCardActive
                    : {}),
                }}
                onClick={() => {
                  setActiveStatus("PartiallyInvoiced");
                  setCurrentPage(1);
                }}
              >
                <span>
                  Partially Invoiced: {statusCounts?.PartiallyInvoiced || 0}
                </span>
              </div>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "Processed"
                    ? styles.statusCardActive
                    : {}),
                }}
                onClick={() => {
                  setActiveStatus("Processed");
                  setCurrentPage(1);
                }}
              >
                <span>Processed: {statusCounts?.Processed || 0}</span>
              </div>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "Rejected"
                    ? styles.statusCardActive
                    : {}),
                }}
                onClick={() => {
                  setActiveStatus("Rejected");
                  setCurrentPage(1);
                }}
              >
                <span>Rejected: {statusCounts?.Rejected || 0}</span>
              </div>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "SendingToExternalSystem"
                    ? styles.statusCardActive
                    : {}),
                }}
                onClick={() => {
                  setActiveStatus("SendingToExternalSystem");
                  setCurrentPage(1);
                }}
              >
                <span>
                  Sending To ExternalSystem:{" "}
                  {statusCounts?.SendingToExternalSystem || 0}
                </span>
              </div>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "Submitted"
                    ? styles.statusCardActive
                    : {}),
                }}
               onClick={() => {
                  setActiveStatus("Submitted");
                  setCurrentPage(1);
                }}
              >
                <span>Submitted: {statusCounts?.Submitted || 0}</span>
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

              {/* Controls */}
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
                ].map(({ label, field, placeholder, api}) => (
                  <MultiSelectFilter
                    key={field}
                    label={label}
                    placeholder={placeholder}
                    selected={filters[field] || []}
                    onChange={(values) => {
                      setFilters((prev) => ({ ...prev, [field]: values }));
                    }}
                    fetchOptions={api}
                  />
                ))}
              </div>
            

              <div className="ses-filter-grid">
  {[
    {
      label: "Unique Name",
      field: "unique_names" as const,
      placeholder: "Enter unique name",
      endpoint: "unique-names" as const,
    },
    {
      label: "Service Entry",
      field: "service_entry_ids" as const,
      placeholder: "Enter service entry ID",
      endpoint: "service-entry-ids" as const,
    },
    {
      label: "ERP Receipt Number",
      field: "erp_receipt_numbers" as const,
      placeholder: "Enter ERP receipt number",
      endpoint: "erp-receipt-numbers" as const,
    },
  ].map(({ label, field, placeholder, endpoint }) => (
    <div key={field} className="ses-filter-group">
      <label className="ses-filter-label">{label}</label>
      <MultiSelectFilter
        label=""
        placeholder={placeholder}
        selected={filters[field]}
        onChange={(values: string[]) => handleFilterChange(field, values)}
        fetchOptions={(search, page) => getSesFilter(endpoint, search, page)}
      />
    </div>
  ))}
</div>

              <div className="im-date-filters">
          <div className="im-filter-group">
            <label className="im-filter-label">Create Date Range</label>
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

                    {/* Located inside the filters header div */}
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
            <div style={styles.paginationTop}>
              <button
                style={{
                  ...styles.paginationBtn,
                  ...(currentPage === 1 || loadingTable
                    ? styles.paginationBtnDisabled
                    : {}),
                }}
                onClick={prevPage}
                disabled={currentPage === 1 || loadingTable}
              >
                Previous
              </button>
              <span style={styles.paginationInfo}>
                Page {currentPage || data?.index || 0} of {totalPages || data?.total_pages || 0} 
              </span>
              <button
                style={{
                  ...styles.paginationBtn,
                  ...(currentPage >= totalPages || loadingTable
                    ? styles.paginationBtnDisabled
                    : {}),
                }}
                onClick={nextPage}
                disabled={currentPage >= totalPages || loadingTable}
              >
                Next
              </button>
            </div>
            <div style={styles.tableContainer}>
              <div style={{ overflowX: "auto", maxHeight: "65vh" }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableHeader}>Unique Name</th>
                      <th style={styles.tableHeader}>Amount</th>
                      <th style={styles.tableHeader}>Approved Date</th>
                      <th style={styles.tableHeader}>Create Date</th>
                      <th style={styles.tableHeader}>Currency</th>
                      <th style={styles.tableHeader}>Description</th>
                      <th style={styles.tableHeader}>ERP Receipt Number</th>
                      <th style={styles.tableHeader}>Last Modified</th>
                      <th style={styles.tableHeader}>Preparer</th>
                      <th style={styles.tableHeader}>Requester</th>
                      <th style={styles.tableHeader}>Service Description</th>
                      <th style={styles.tableHeader}>Service Entry ID</th>
                      <th style={styles.tableHeader}>Status</th>
                      <th style={styles.tableHeader}>
                        Supplier Reference Number
                      </th>
                      <th style={styles.tableHeader}>Supplier</th>
                      <th style={styles.tableHeader}>Department</th>
                      <th style={styles.tableHeader}>GlAccount</th>
                      <th style={styles.tableHeader}>Property</th>
                      <th style={styles.tableHeader}>CostCenter</th>
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
                          <td style={styles.tableCell}>
                            {item["Unique Name"]}
                          </td>
                          <td style={styles.tableCell}>{item.Amount}</td>
                          <td style={styles.tableCell}>
                            {item["Approved Date"]?.split("T")[0] ?? ""}
                          </td>
                          <td style={styles.tableCell}>
                            {item["Create Date"]?.split("T")[0] ?? ""}
                          </td>
                          <td style={styles.tableCell}>{item.Currency}</td>
                          <td style={styles.tableCell}>{item.Description}</td>
                          <td style={styles.tableCell}>
                            {item["ERP Receipt Number"]}
                          </td>
                          <td style={styles.tableCell}>
                            {item["Last Modified"]?.split("T")[0] ?? ""}
                          </td>
                          <td style={styles.tableCell}>{item.Preparer}</td>
                          <td style={styles.tableCell}>{item.Requester}</td>
                          <td style={styles.tableCell}>
                            {item["Service Description"]}
                          </td>
                          <td style={styles.tableCell}>
                            {item["Service Entry ID"]}
                          </td>
                          <td style={styles.tableCell}>
                            <span style={styles.statusBadge}>
                              {item?.Status ?? ""}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            {item["Supplier Reference"]}
                          </td>
                            <td style={styles.tableCell}>
                            {item.Supplier}
                          </td>
                           <td style={styles.tableCell}>
                            {item.Department}
                          </td>
                            <td style={styles.tableCell}>
                            {item["GL Account"]}
                          </td>
                            <td style={styles.tableCell}>
                            {item["Company Code"]}
                          </td>
                            <td style={styles.tableCell}>
                            {item["Cost Center"]}
                          </td>

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

export default SSCManagement;
