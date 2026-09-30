/* File: src/components/PulseReportInvoiceDashboard.tsx */
import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePulseReport } from "./context/PulseReportContext";
import { Download, ChevronDown, Loader } from "lucide-react";
import { toast } from 'react-toastify';
import type { InvoiceDetailsResponse } from "../Dto/PulseReportDashboardDto";
import {
  fetchInvoiceDetails,
  fetchInvoiceSummary,
  getDefaultInvoiceSummary,
  getInvoiceIds,
  getRequesters,
  getCompanyCodes,
  getInvoiceOrderIds,
  getCommodityCodes,
  fetchSuppliers,
  fetchDepartments,
  fetchGLAccounts,
  fetchCostCenter,
} from "../api/PulseReportInvoiceApi";
import {
  downloadInvoiceExcelWithFilters,
  triggerExcelDownload,
  type DownloadInvoiceExcelWithFiltersRequestDto,
} from "../api/PrDownloadExcelApi";
import "./PulseReportInvoiceDashboard.css";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { useFilter } from "./context/PulseContext";
import BackButton from "./BackButton";

// --- Interfaces ---
interface Filters {
  [key: string]: any;
  invoiceNumber: string[];
  companyCode: string[];
  invoiceOrderId: string[];
  commodityCode: string[];
  cost_center: string[];
  gl_account: string[];
  status: string;
  startDate: string;
  endDate: string;
  requesters: string[];
  suppliers: string[];
  departments: string[];
}

type StatusType =
  | "Reconciled"
  | "Exceptions"
  | "In Approval"
  | "Failed"
  | "Rejected"
  | "Paid"
  | "Paying"
  | "Total"
  | "";

const PulseReportInvoiceDashboard: React.FC = () => {
  const { selectedStatus } = usePulseReport();
  const location = useLocation();

  const [currentPage, setCurrentPage] = useState(1);
  const [loadingTable, setLoadingTable] = useState(true);
  const [data, setData] = useState<InvoiceDetailsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<any>(
    getDefaultInvoiceSummary(),
  );
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isDownloadLoading, setIsDownloadLoading] = useState(false);
  const [downloadLoadingLimit, setDownloadLoadingLimit] = useState<number | null>(null);
  const [activeStatus, setActiveStatus] = useState<StatusType>("");
  const { filtersQuick } = useFilter();
    const [copyFilterQuick,setCopyFilterQuick]=useState<any>(filtersQuick);
  const [filters, setFilters] = useState<Filters>({
    invoiceNumber: [],
    companyCode: [],
    invoiceOrderId: [],
    commodityCode: [],
    cost_center: [],
    gl_account: [],
    requesters: [],
    suppliers: [],
    departments: [],
    status: "",
    startDate: "",
    endDate: "",
  });

  const pageSize = 20;
const navigate = useNavigate();
  const handleDownload = useCallback(async (limit: number, currentFilters: Filters, currentActiveStatus: StatusType | "") => {
    setIsDownloadLoading(true);
    setDownloadLoadingLimit(limit);

    try {
      const downloadRequest: DownloadInvoiceExcelWithFiltersRequestDto = {
        index: 1,
        limit,
        status: currentActiveStatus && currentActiveStatus !== "Total" ? [currentActiveStatus] : undefined,
        
        supplier_filter: currentFilters?.suppliers?.length > 0 ? currentFilters.suppliers : undefined,
        requester_filter: currentFilters?.requesters?.length > 0 ? currentFilters.requesters : undefined, 
        department_filter: currentFilters?.departments?.length > 0 ? currentFilters.departments : undefined,
        gl_accounts_filter: currentFilters?.glAccount?.length > 0 ? currentFilters.glAccount : undefined,
        CommodityCodes: currentFilters?.commodityCode?.length > 0 ? currentFilters.commodityCode : undefined, 
        cost_centers_filter: currentFilters?.costCenter?.length > 0 ? currentFilters.costCenter : undefined,
        company_code_filter: currentFilters?.companyCode?.length > 0 ? currentFilters.companyCode : undefined,
        from_date: currentFilters?.startDate ? currentFilters.startDate : undefined,
        to_date: currentFilters?.endDate ? currentFilters.endDate : undefined,
        
        invoice_ids: currentFilters?.invoiceNumber?.length > 0 ? currentFilters.invoiceNumber : undefined,
        invoice_order_ids: currentFilters?.invoiceOrderId?.length > 0 ? currentFilters.invoiceOrderId : undefined,
      };

      const response = await downloadInvoiceExcelWithFilters(downloadRequest);

      triggerExcelDownload(response);

      toast.success("Invoice data download initiated successfully! Check your downloads.");

    } catch (err: any) {
       if (err?.response?.status === 401) {
          navigate("/");
        }
      let errorMessage = "Failed to download file. Please try again.";

      if (err?.response?.status === 404) {
        errorMessage = "No Invoice data found for the applied filters. Please check your filters and try again.";
      } else if (err?.response?.status === 500) {
        errorMessage = "Server error occurred. Please try again later.";
      } else if (err?.message) {
        errorMessage = err.message;
      }

      toast.error(`${errorMessage}`);

    } finally {
      setIsDownloadLoading(false);
      setDownloadLoadingLimit(null);
      setIsDownloadOpen(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlStatus = params.get("status");
    const normalized = urlStatus
      ? (decodeURIComponent(urlStatus) as StatusType)
      : null;

    if (normalized && normalized !== activeStatus) {
      setActiveStatus(normalized);
      setCurrentPage(1);
    } else if (
      selectedStatus &&
      selectedStatus !== activeStatus &&
      !normalized
    ) {
      setActiveStatus(selectedStatus as StatusType);
      setCurrentPage(1);
    } else if (!normalized && !selectedStatus && activeStatus !== "") {
      setActiveStatus("");
      setCurrentPage(1);
    }
  }, [location.search, selectedStatus]);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const summary = await fetchInvoiceSummary(copyFilterQuick);
        if (summary) setStatusCounts(summary);
      } catch(error: any) {
         if (error?.response?.status === 401) {
          navigate("/");
        }
        // ignore
      }
    };
    loadSummary();
  }, [copyFilterQuick]);

  const handleFilterChange = (field: keyof Filters, value: string): void => {
    setCurrentPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleStatusClick = (status: StatusType): void => {
    if (status === "Total") {
        setActiveStatus(prev => prev === "" ? "" : "");
    } else {
        setActiveStatus((prev) => (prev === status ? "" : status));
    }
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getStatusFilter = (
    status: StatusType,
  ): Record<string, string[]> | null => {
    switch (status) {
      case "In Approval":
        return { InvoiceStatusString: ["In Approval"] };
      case "Reconciled":
        return { IR_StatusString: ["Reconciled"] };
      case "Exceptions":
        return { IR_StatusString: ["Exceptions"] };
      case "Paid":
        return { IR_StatusString: ["Paid"] };
      case "Paying":
        return { IR_StatusString: ["Paying"] };
      case "Failed":
        return { IR_StatusString: ["Failed"] };
      case "Rejected":
        return { IR_StatusString: ["Rejected"] };
      case "Total":
      case "":
      default:
        return null;
    }
  };
  
  useEffect(() => {
    let isCancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout>;

    const loadData = async () => {
      try {
        setData(null);
        setError(null);
        setLoadingTable(true);

        const statusFilter = getStatusFilter(activeStatus);

        const params: any = {
          index: currentPage,
          limit: pageSize,
          requester_filter: filters?.requesters?.length
              ? filters.requesters : [],
          supplier_filter: filters?.suppliers?.length ? filters?.suppliers : [],
          company_code_filter:
            filters?.companyCode?.length ?filters?.companyCode : [],
          department_filter:
            filters?.departments?.length ? filters?.departments : [],
          cost_centers_filter:
            filters?.cost_center?.length ? filters?.cost_center :  [],
          gl_accounts_filter:
            filters?.gl_account?.length ? filters?.gl_account :  [],
            CommodityCode: filters.commodityCode || [],
          invoice_ids: filters.invoiceNumber,
          ir_ids: filters.invoiceOrderId,
          from_date: filters.startDate ?? [],
          to_date: filters.endDate ?? [],
        };

        if (statusFilter) {
          const [, values] = Object.entries(statusFilter)[0];

          if (Array.isArray(values) && values.length > 0 && values[0] !== "") {
            params.status = values;
          }
        }

        const response = await fetchInvoiceDetails(params);

        if (!isCancelled) {
          setData(response || null);
        }
      } catch(error:any) {
        if (error?.response?.status === 401) {
          navigate("/");
        }
        if (!isCancelled) {
          setError("Failed to load data. Please try again.");
        }
      } finally {
        if (!isCancelled) {
          setLoadingTable(false);
        }
      }
    };

    setLoadingTable(true);
    debounceTimer = setTimeout(() => {
      loadData();
    }, 1000);

    return () => {
      isCancelled = true;
      clearTimeout(debounceTimer);
    };
  }, [activeStatus, currentPage, filters, filtersQuick, copyFilterQuick]);

  const clearAllFilters = (): void => {
    setFilters({
      invoiceNumber: [],
      requester: [],
      companyCode: [],
      invoiceOrderId: [],
      commodityCode: [],
      cost_center: [],
      gl_account: [],
      requesters: [],
      suppliers: [],
      departments: [],
      status: "",
      startDate: "",
      endDate: "",
    });
    setActiveStatus("");
    setCurrentPage(1);
    setCopyFilterQuick({})
  };

  const nextPage = () => {
    if (data && currentPage < Math.ceil(data.total_count / pageSize))
      setCurrentPage((p) => p + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const totalPages = data ? Math.ceil(data.total_count / pageSize) : 1;
  const recordCount = data?.records?.length || 0;
   useEffect(() => {
      if (!filtersQuick || Object.keys(filtersQuick || {})?.length === 0) {
      return;
    }
    if(filtersQuick?.company_code_filter || filtersQuick?.department_filter || filtersQuick?.cost_centers_filter || filtersQuick?.gl_accounts_filter || filtersQuick?.supplier_filter || filtersQuick?.requester_filter || filtersQuick?.from_date || filtersQuick?.to_date || filtersQuick?. company_code_filter ){
    setFilters({...filters,
      suppliers: filtersQuick?.supplier_filter || [],
      requesters: filtersQuick?.requester_filter || [],
      companyCode: filtersQuick?.company_code_filter || [],
      departments: filtersQuick?.department_filter || [],
      cost_center: filtersQuick?.cost_centers_filter || [],
      gl_account: filtersQuick?.gl_accounts_filter || [],
      startDate: filtersQuick?.from_date || "",
      endDate: filtersQuick?.to_date || "",
      commodityCode:filtersQuick?.company_code_filter || [],
    });
  } 
  }, [filtersQuick]);
  return (
    <div className="im-container">
      <div className="back-button-container">
              <BackButton className="CD-back-button" iconClassName="CD-add-icon" />
            </div>
      <header className="im-header">
        <h1 className="im-header-title">Invoice Management Dashboard</h1>
      </header>

      <div className="im-status-cards">
        {[
          "Exceptions",
          "In Approval",
          "Failed",
          "Rejected",
          "Paid",
          "Paying",
          "Total",
        ]?.map((status) => (
          <button
            key={status}
            className={`im-status-card ${
              activeStatus === status || (status === "Total" && activeStatus === "")
                ? "im-status-card-active"
                : ""
            }`}
            onClick={() => handleStatusClick(status as StatusType)}
          >
            {status}: {statusCounts[status] || 0}
          </button>
        ))}
      </div>

      <div className="im-filters-container">
        <div className="im-filters-header">
          <span>Filters</span>
        </div>

        <div className="im-filters-grid">
          {[
            {
              label: "Invoice ID",
              field: "invoiceNumber",
              placeholder: "INV-xxx",
              api: getInvoiceIds,
            },
            {
             label: "Requesters",
             field: "requesters",
              placeholder: "Enter requester name",
              api: getRequesters,
            },
            {
              label: "Company Code",
              field: "companyCode",
              placeholder: "Entry company code",
              api: getCompanyCodes,
            },
            {
              label: "Invoice Order ID",
              field: "invoiceOrderId",
              placeholder: "EP-xxxx",
              api: getInvoiceOrderIds,
            },
            {
              label: "Commodity Code",
              field: "commodityCode",
              placeholder: "Enter commodity code",
              api: getCommodityCodes,
            },
          {
                             label: "Cost Center",
                             field: "cost_center",
                             placeholder: "Search...",
                             api: fetchCostCenter,
                           },
          ].map(({ label, field, placeholder, api }) => (
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
          ].map(({ label, field, placeholder, api }) => (
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

        <div className="im-date-filters">
          <div className="im-filter-group">
            <label className="im-filter-label">Date Range</label>
            <div className="im-date-range">
              <input
                type="date"
                className="im-date-input"
                value={filters.startDate}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
              />
              <input
                type="date"
                className="im-date-input"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
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
                            right: 0,
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

      {data && (recordCount > 0 || (loadingTable && data)) && (
        <div className="im-pagination-top">
          <button
            className={`im-pagination-btn ${currentPage === 1 || loadingTable ? "im-pagination-btn-disabled" : ""
              }`}
            onClick={prevPage}
            disabled={currentPage === 1 || loadingTable}
          >
            Previous
          </button>
          <span className="im-pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className={`im-pagination-btn ${currentPage >= totalPages || loadingTable ? "im-pagination-btn-disabled" : ""
              }`}
            onClick={nextPage}
            disabled={currentPage >= totalPages || loadingTable}
          >
            Next
          </button>
        </div>
      )}

      <div className="im-table-container">
        <div className="im-table-wrapper">
          <table className="im-table">
            <thead>
              <tr className="im-table-header-row">
                {[
                   "Invoice ID",
                   "Line Item",
                    "Invoice Order ID",
                      "IR Id",
                      "Payment ID",
                       "Requester",
                        "Company Code",
                         "Supplier",
                  "Amount",
                    "Gross Amount",
                     "Net Amount",
                      "Date Created",
                        "Invoice Status",
                         "Status",
                          "Payment Status",
                          "ERP Payable Number",
                           "Cost Center",
                             "GL Account",
                  "Commodity Code",
                  "PO Number",
                   "Last Modified",
                  "Department",
                ].map((header) => (
                  <th key={header} className="im-table-header">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loadingTable ? (
                <tr>
                  <td colSpan={19} className="im-loader-inline">
                    <div className="im-inline-loader">
                      <span className="im-spinner" />
                      <span>Loading invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={19} className="im-error-text">
                    {error}
                  </td>
                </tr>
              ) : data && recordCount > 0 ? (
                data?.records?.map((record: any) => (
                  <tr key={record?.Invoice_ID} className="im-table-row">
                     <td>{record["Invoice ID"]}</td>
                        <td>{record["Line Item Number"]}</td>
                         <td>{record["Invoice Order ID"]}</td>
                           <td>{record["IR ID"]}</td>
                            <td>{record["Payment ID"]}</td>
                            <td>{record["Requester"]}</td>
                             <td>{record["Company Code"]}</td>
                                <td>{record["Supplier"]}</td>
                    <td>{record?.Amount}</td>
                      <td>{record["Gross Amount"]}</td>
                          <td>{record["Net Amount"]}</td>
                            <td>{record["Create Date"]?.split("T")[0] ?? ""}</td>
                              <td>{record["Invoice Status"]}</td>
                               <td>
                      <span className="im-status-badge">
                        {record["IR Status"]}
                      </span>
                    </td>
                     <td>{record["Payment Status"]}</td>
                      <td>{record["ERP Payable Number"]}</td>
                       <td>{record["Cost Center"]}</td>
                    <td>{record["GL Account"]}</td>
                    <td>{record["CommodityCode"]}</td>
                    <td>{record["PO Number"]}</td>
                    <td>{record["Last Modified"]?.split("T")[0] ?? ""}</td>
                    <td>{record["Department"]}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={19} className="im-loader-text">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};

export default PulseReportInvoiceDashboard;