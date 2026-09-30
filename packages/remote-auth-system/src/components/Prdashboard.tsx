import React, { useEffect, useRef, useState, useCallback} from "react";
import type {
  PRListResponseDTO,
  StatusSummaryDTO,
} from "../Dto/PrDashboardDto";
import { Download, ChevronDown, Loader } from "lucide-react";
import {
  dashBoardSummary,
  fetchPRLineItems,
  getGroupEmails,
  getPrFilter,
  getPRList,
  sendReminders,
  // getPrFilter,
} from "../api/PrDashboardApi";
import {
  downloadPRExcelWithFilters,
  triggerExcelDownload,
  type DownloadPRExcelWithFiltersRequestDto,
} from "../api/PrDownloadExcelApi";
import { useNavigate } from "react-router-dom";
import SpinnerLoaders from "./SpinnerLoaders";
import { toast } from "react-toastify";
import styles from "./PrDashboard.styles";
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

type Filters = {
    [key: string]: any;
  commodityCode: string[];
  deliverTo: string[];
  property: string[];
    cost_center: string[];
    gl_account: string[];
  departments: string[];
  suppliers: string[];
  requesters: string[];
  startDate: string;
  endDate: string;
};


type StatusType =
  | "receiving"
  | "ordered"
  | "received"
  | "submitted"
  | "composing"
  | "pending"
  | "Total";

const Prdashboard: React.FC = () => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [activeStatus, setActiveStatus] = useState<StatusType | "">("");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedPR, setSelectedPR] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState<string>("");
  const [emailList, setEmailList] = useState<string[]>([]);
  const [emailError, setEmailError] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [statusCounts, setStatusCounts] = useState<StatusSummaryDTO | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [lineItems, setLineItems] = useState<any>({});
  const [loadingLineItems, setLoadingLineItems] = useState<boolean>(false);
  const [loadingTable, setLoadingTable] = useState<boolean>(true);
  const [loadingReminder, setLoadingReminder] = useState<boolean>(false);
  const [sendloadingReminder, setSendLoadingReminder] =
    useState<boolean>(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isDownloadLoading, setIsDownloadLoading] = useState(false);
  const [downloadLoadingLimit, setDownloadLoadingLimit] = useState<number | null>(null);
  const pageSize = 20;
  const [totalPages, setTotalPages] = useState(0);
  const { filtersQuick } = useFilter();
   const [copyFilterQuick,setCopyFilterQuick]=useState<any>(filtersQuick);
  const [filters, setFilters] = useState<Filters>({
    commodityCode:[],
    deliverTo: [],
    property: [],
      cost_center: [],
      gl_account: [],
    departments: [],
    suppliers:[],
    requesters:[],
    startDate: "",
    endDate: "",
  });

  const [data, setData] = useState<PRListResponseDTO | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { selectedStatus } = usePulseReport();
  const navigate = useNavigate();
    const handleDownload = useCallback(async (limit: number, currentFilters: Filters, currentActiveStatus: StatusType | "") => {
      // 1. Set loading state
      setIsDownloadLoading(true);
      setDownloadLoadingLimit(limit);
  
      try {
        // 2. Construct the request DTO using current filters and active status
        const downloadRequest: DownloadPRExcelWithFiltersRequestDto = {
          index: 1,
          limit, // The selected limit (1000, 5000, 30000)
          status: currentActiveStatus && currentActiveStatus !== "Total" ? [currentActiveStatus] : undefined,
          supplier_filter: currentFilters?.suppliers?.length > 0 ? currentFilters.suppliers : undefined,
          requester_filter: currentFilters?.requesters?.length > 0 ? currentFilters.requesters : undefined,
          department_filter: currentFilters?.departments?.length > 0 ? currentFilters.departments : undefined,
          gl_accounts_filter: currentFilters?.  gl_account?.length > 0 ? currentFilters.  gl_account : undefined,
          cost_centers_filter: currentFilters?.cost_center?.length > 0 ? currentFilters.cost_center : undefined,
          company_code_filter: currentFilters?.property?.length > 0 ? currentFilters.property : undefined,
          Commodity_Code: currentFilters?.commodityCode?.length > 0 ? currentFilters.commodityCode : undefined,
          Deliver_To: currentFilters?.deliverTo?.length > 0 ? currentFilters.deliverTo : undefined,
          from_date: currentFilters?.startDate ? currentFilters.startDate : undefined,
          to_date: currentFilters?.endDate ? currentFilters.endDate : undefined,
        };
  
        // 3. Call the API to get the file stream/response
        const response = await downloadPRExcelWithFilters(downloadRequest);
        
        // 4. Trigger the browser download process
        triggerExcelDownload(response);
        
        // 5. Show success notification
        toast.success("Purchase request data download initiated successfully! \nCheck your downloads.");
        
      } catch (err: any) {
        // 6. Handle errors and show a toast notification
        let errorMessage = "Failed to download file. Please try again.";
         if (err?.response?.status === 401) {
          errorMessage = "Unauthorized access. Please log in again.";
          navigate("/");
        }
        if (err?.response?.status === 404) {
          errorMessage = "No PR data found for the applied filters. Please check your filters and try again.";
        } else if (err?.response?.status === 500) {
          errorMessage = "No data found for the given filters!";
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
    }, []);

  useEffect(() => {
    if (selectedStatus) {
      setActiveStatus(selectedStatus as StatusType);
    }
  }, [selectedStatus]);

  const toggleRow = async (prNumber: string): Promise<void> => {
    if (!prNumber) {
      toast.error("Invalid PR Number");
      return;
    }
    try {
      const isCurrentlyExpanded = expandedRows[prNumber];
      setExpandedRows({});
      if (isCurrentlyExpanded) return;
      setExpandedRows({ [prNumber]: true });
      setLoadingLineItems(true);
      if (!lineItems[prNumber]) {
        const data = await fetchPRLineItems(prNumber);

        if (data?.line_items) {
          setLineItems({
            [prNumber]: data,
          });
        }
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        navigate("/");
      }
      if (error?.response?.status === 404 || error?.response?.status === 500) {
        setLineItems({
          [prNumber]: {},
        });
      }
    } finally {
      setLoadingLineItems(false);
    }
  };

  const handleFilterChange = (field: keyof Filters, value: string): void => {
    setCurrentPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearAllFilters = (): void => {
    setFilters({
      commodityCode: [],
      deliverTo: [],
      property: [],
        cost_center: [],
        gl_account: [],
      departments: [],
      suppliers:[],
      requesters:[],
      startDate: "",
      endDate: "",
    });
    setActiveStatus("");
    setCopyFilterQuick({});
  };

  const openReminderModal = async (prNumber: string): Promise<void> => {
    if (!prNumber) {
      toast.error("Invalid PR Number");
      return;
    }
    setSelectedPR(prNumber);
    setShowModal(true);
    setEmailInput("");
    setEmailError("");
    setLoadingReminder(true);
    try {
      const response = await getGroupEmails(prNumber);
      const allEmails: string[] = Object.values(
        response?.group_emails || {},
      )?.flat();
      setEmailSuggestions(allEmails || []);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        navigate("/");
      }
      if (error?.response?.status === 404 || error?.response?.status === 500) {
        setLineItems({
          [prNumber]: {},
        });
      }
    } finally {
      setLoadingReminder(false);
    }
  };

  const closeModal = (): void => {
    setShowModal(false);
    setSelectedPR(null);
    setEmailList([]);
    setEmailInput("");
    setEmailError("");
    setEmailSuggestions([]);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addEmail = (): void => {
    const email = emailInput.trim();
    if (!email) return;

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (emailList.includes(email)) {
      setEmailError("This email is already added");
      return;
    }

    const newEmailList = [...emailList, email];
    setEmailList(newEmailList);
    setEmailInput("");
    setEmailError("");
    setShowSuggestions(true);
    setFilteredSuggestions(
      emailSuggestions?.filter((e) => !newEmailList?.includes(e)),
    );
    inputRef.current?.focus();
  };

  const removeEmail = (index: number): void => {
    setEmailList((prevList) => {
      const newList = prevList?.filter((_, i) => i !== index);
      const updatedSuggestions =
        emailSuggestions?.length > 0
          ? emailSuggestions?.filter((email) => {
              const matchesInput =
                !emailInput ||
                email?.toLowerCase()?.includes(emailInput?.toLowerCase());
              const notInList = !newList.includes(email);
              return matchesInput && notInList;
            })
          : [];

      setFilteredSuggestions(updatedSuggestions);
      setShowSuggestions(updatedSuggestions?.length > 0);

      return newList;
    });
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    const availableEmails =
      emailSuggestions?.length > 0
        ? emailSuggestions?.filter((email) => !emailList?.includes(email))
        : [];
    setFilteredSuggestions(availableEmails);
    if (availableEmails?.length > 0) {
      setShowSuggestions(true);
    }
  };
  const handleInputContainerClick = () => {
    inputRef.current?.focus();
  };
  const handleKeyPress = (e: any) => {
    if (e.key === "Enter" && emailInput?.trim()) {
      e.preventDefault();
      addEmail();
    } else if (e.key === "Backspace" && !emailInput && emailList?.length > 0) {
      removeEmail(emailList?.length - 1);
    }
  };

  const handleEmailInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const value = e?.target?.value?.trimStart();
    setEmailInput(value);
    setEmailError("");

    const filtered =
      emailSuggestions?.length > 0
        ? emailSuggestions?.filter((email) => {
            const matchesInput =
              !value || email?.toLowerCase()?.includes(value?.toLowerCase());
            const notInList = !emailList?.includes(email);
            return matchesInput && notInList;
          })
        : [];

    setFilteredSuggestions(filtered);
  };

  const selectEmail = (email: string) => {
    if (!emailList.includes(email)) {
      const newEmailList = [...emailList, email];
      setEmailList(newEmailList);
      setEmailInput("");
      setShowSuggestions(true);
      setFilteredSuggestions(
        emailSuggestions?.filter((e) => !newEmailList?.includes(e)),
      );
    }
    inputRef.current?.focus();
  };
  const sendReminder = async (
    selectedPR: string | null,
    email: string[],
  ): Promise<void> => {
    if (!selectedPR) {
      toast.error("No PR selected");
      return;
    }
    if (email.length === 0) {
      toast.error("No email addresses provided");
    }
    const payload = {
      pr_number: selectedPR || "",
      email_addresses: email,
    };
    setSendLoadingReminder(true);
    try {
      const response = await sendReminders(
        payload || { pr_number: "", email_addresses: [] },
      );
      toast.success(response?.message || "Reminder sent successfully");
    } catch (error: any) {
         if (error?.response?.status === 401) {
          navigate("/");
        }
      toast.error(error?.response?.statusText || "Something went wrong");
    } finally {
      setSendLoadingReminder(false);
    }
  };

  const nextPage = (): void => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const prevPage = (): void => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  useEffect(() => {
    const fetchDashboardSummary = async () => {
      setLoading(true);
      try {
        const data = await dashBoardSummary(copyFilterQuick || {});
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

  useEffect(() => {
    setLoadingTable(true);
    const debounceTimer = setTimeout(() => {

      const loadData = async () => {
        try {
          const response = await getPRList({
            page: currentPage,
            page_size: pageSize,
            status_filter:
              activeStatus && activeStatus !== "Total" ? [activeStatus] : [],
            material_filter: filters?.commodityCode,
            cost_center_filter: filters?.cost_center?.length
              ? filters?.cost_center
              : copyFilterQuick?.cost_centers_filter ?? [],

            gl_account_filter: filters?.gl_account?.length
              ? filters?.gl_account
              : copyFilterQuick?.gl_accounts_filter ?? [],
            ship_to_filter: filters?.deliverTo ? filters?.deliverTo : [],
            company_code_filter: filters?.property?.length ? filters?.property : copyFilterQuick.company_code_filter,
            department_filter: filters?.departments?.length
              ? filters?.departments
              : copyFilterQuick?.department_filter ?? [],
            supplier_filter: filters?.suppliers ?? copyFilterQuick?.supplier_filter,
            requester_filter: filters?.requesters?.length ? filters?.requesters : copyFilterQuick?.requester_filter ?? undefined,
            from_date: filters?.startDate || "",
            to_date: filters?.endDate || "",
            approval_filter: activeStatus === "pending" ? true : false,
          });
          setData(response);
          setTotalPages(response?.total_pages || 0);
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
  }, [filters, currentPage, activeStatus,copyFilterQuick]);
     useEffect(() => {
      if (!filtersQuick || Object.keys(filtersQuick || {})?.length === 0) {
      return;
    }
    if(filtersQuick?.company_code_filter || filtersQuick?.department_filter || filtersQuick?.cost_centers_filter || filtersQuick?.gl_accounts_filter || filtersQuick?.supplier_filter || filtersQuick?.requester_filter || filtersQuick?.from_date || filtersQuick?.to_date){
    setFilters({...filters,
      suppliers: filtersQuick?.supplier_filter || [],
      requesters: filtersQuick?.requester_filter || [],
      departments: filtersQuick?.department_filter || [],
      cost_center: filtersQuick?.cost_centers_filter || [],
      property: filtersQuick?.company_code_filter || [],
       gl_account: filtersQuick?.gl_accounts_filter || [],
      startDate: filtersQuick?.from_date || "",
      endDate: filtersQuick?.to_date || "",
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
              <h1 style={styles.headerTitle}>Purchase Requisition Dashboard</h1>
            </header>

            <div style={styles.statusCards}>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "receiving"
                    ? styles.statusCardActive
                    : {}),
                }}
                onClick={() => {
                  setActiveStatus("receiving");
                  setCurrentPage(1);
                }}
              >
                <span>Receiving: {statusCounts?.Receiving || 0}</span>
              </div>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "ordered"
                    ? styles.statusCardActive
                    : {}),
                }}
                onClick={() => {
                  setActiveStatus("ordered");
                  setCurrentPage(1);
                }}
              >
                <span>Ordered: {statusCounts?.Ordered || 0}</span>
              </div>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "received"
                    ? styles.statusCardActive
                    : {}),
                }}
                onClick={() => {
                  setActiveStatus("received");
                  setCurrentPage(1);
                }}
              >
                <span>Received: {statusCounts?.Received || 0}</span>
              </div>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "submitted"
                    ? styles.statusCardActive
                    : {}),
                }}
                onClick={() => {
                  setActiveStatus("submitted");
                  setCurrentPage(1);
                }}
              >
                <span>Submitted: {statusCounts?.Submitted || 0}</span>
              </div>
              <div
                style={{
                  ...styles.statusCard,
                  ...(activeStatus === "composing"
                    ? styles.statusCardActive
                    : {}),
                }}
                onClick={() => {
                  setActiveStatus("composing");
                  setCurrentPage(1);
                }}
              >
                <span>Composing: {statusCounts?.Composing || 0}</span>
              </div>
              <div
                style={{
                  ...styles.statusCard,
                  backgroundColor:
                    activeStatus === "pending" ? "#007bff" : "#c94343",
                }}
                onClick={() => {
                  setActiveStatus("pending");
                  setCurrentPage(1);
                }}
              >
                <span>
                  Pending Approval: {statusCounts?.PendingApproval || 0}
                </span>
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
               <div className="im-filters-grid">
                {[
                  {
                    label: "Commodity Code",
                    field: "commodityCode" as const,
                    placeholder: "Enter Commodity Code",
                    endpoint: "commodity_codes" as const,
                  },
                  {
                    label: "Deliver To",
                    field: "deliverTo" as const,
                    placeholder: "Enter Deliver To",
                    endpoint: "deliver_to" as const,
                  },
                ].map(({ label, field, placeholder, endpoint }) => (
                  <div key={field} className="filter-group">
                    <label className="filter-label">{label}</label>
                    <MultiSelectFilter
                      label=""
                      placeholder={placeholder}
                      selected={filters[field]}
                      onChange={(values) =>
                        setFilters((prev) => ({ ...prev, [field]: values }))
                      }
                      fetchOptions={(search, page) => getPrFilter(endpoint, search, page)}
                    />
                    
                  </div>
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
                                {
                                  label: "Company Code",
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
              <div className="im-date-filters">
          <div className="im-filter-group">
            <label className="im-filter-label">Create Date Range</label>
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
                      onChange={(e) =>
                        handleFilterChange("endDate", e.target.value)
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

            <div style={styles.paginationTop}>
              <button
                style={{
                  ...styles.paginationBtn,
                  ...(currentPage === 1 || loadingTable ? styles.paginationBtnDisabled : {}),
                }}
                onClick={prevPage}
                disabled={currentPage === 1 || loadingTable}
              >
                Previous
              </button>
              <span style={styles.paginationInfo}>
                Page {data?.current_page || 0} of {data?.total_pages || 0}
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
                      <th style={styles.tableHeader}>PR Number</th>
                      <th style={styles.tableHeader}>PR Title</th>
                      <th style={styles.tableHeader}>Status</th>
                      <th style={styles.tableHeader}>Created Date</th>
                      <th style={styles.tableHeader}>Submitted Date</th>
                      <th style={styles.tableHeader}>Preparer</th>
                      <th style={styles.tableHeader}>Requester</th>
                      <th style={styles.tableHeader}>Company Code</th>
                      <th style={styles.tableHeader}>Purchase Organization</th>
                      <th style={styles.tableHeader}>Total Cost</th>
                      <th style={styles.tableHeader}>Tax Amount</th>
                      <th style={styles.tableHeader}>Currency</th>
                      <th style={styles.tableHeader}>Need By Date</th>
                      <th style={styles.tableHeader}>Supplier</th>
                      <th style={styles.tableHeader}>Deliver To</th>
                      <th style={styles.tableHeader}>Department</th>
                      <th style={styles.tableHeader}>Last Modified</th>
                      <th style={styles.tableHeader}>PO Number</th>
                      {activeStatus === "pending" && (
                        <>
                          <th style={styles.tableHeader}>Approvers</th>
                          <th style={styles.tableHeader}>
                            Pending Approval With
                          </th>
                          <th style={styles.tableHeader}>
                            Active Pending With
                          </th>
                        </>
                      )}

                      {activeStatus === "pending" && (
                        <th style={styles.tableHeader}>Reminder</th>
                      )}
                      <th style={styles.tableHeader}>Line Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingTable ? (
                      <tr style={styles.tableRow}>
                        <td
                          colSpan={activeStatus === "pending" ? 19 : 15}
                          style={{ textAlign: "center", padding: "10px" }}
                        >
                          <SpinnerLoaders
                            fullScreen={false}
                            size="medium"
                            text="Loading data..."
                          />
                        </td>
                      </tr>
                    ) : (data?.data?.length ?? 0) > 0 ? (
                      data?.data?.map((item: any, i: number) => (
                        <React.Fragment key={i + 1}>
                          <tr style={styles.tableRow}>
                            <td style={styles.tableCell}>
                              {item?.PR_Number ?? ""}
                            </td>
                            <td style={styles.tableCell}>
                              {item?.PR_Title ?? ""}
                            </td>
                            <td style={styles.tableCell}>
                              <span style={styles.statusBadge}>
                                {item?.Status ?? ""}
                              </span>
                            </td>
                            <td style={styles.tableCell}>
                              {item?.Create_Date?.split(" ")[0] ?? ""}
                            </td>
                            <td style={styles.tableCell}>
                              {item?.Submit_Date?.split(" ")[0] ?? ""}
                            </td>
                            <td style={styles.tableCell}>
                              {item?.Preparer ?? ""}
                            </td>
                            <td style={styles.tableCell}>
                              {item?.Requester ?? ""}
                            </td>
                            <td style={styles.tableCell}>
                              {item?.Company_Code ?? ""}
                            </td>
                            <td style={styles.tableCell}>
                              {item?.Purchase_Org ?? ""}
                            </td>
                            <td style={styles.tableCell}>
                              {item?.Total_Cost ?? ""}
                            </td>
                            <td style={styles.tableCell}>
                              {item?.Tax_Amount ?? ""}
                            </td>
                            <td style={styles.tableCell}>
                              {item?.Currency ?? ""}
                            </td>
                            <td style={styles.tableCell}>
                              {item?.Need_By_Date?.split(" ")[0] ?? ""}
                            </td>
                            <td style={styles.tableCell}>
                              {item?.Supplier ?? ""}
                            </td>
                            <td style={styles.tableCell}>
                              {item?.Deliver_To ?? ""}
                            </td>
                            <td style={styles.tableCell}>
                              {item?.Department ?? ""}
                            </td>
                            <td style={styles.tableCell}>
                              {item?.Last_Modified?.split(" ")[0] ?? ""}
                            </td>
                            <td style={styles.tableCell}>
                              {item?.ERP_PO_Number ?? ""}
                            </td>

                            {activeStatus === "pending" && (
                              <>
                                <td style={styles.tableCell}>
                                  {item?.Approver_s_
                                    ? item?.Approver_s_?.split(";")
                                        ?.map((a: string) => a?.trim())
                                        ?.filter((a: string) => a)
                                        ?.join("; ")
                                    : ""}
                                </td>
                                <td style={styles.tableCell}>
                                  {item?.Pending_Approval_With
                                    ? item?.Pending_Approval_With?.split(";")
                                        ?.map((a: string) => a?.trim())
                                        ?.filter((a: string) => a)
                                        ?.join("; ")
                                    : ""}
                                </td>
                                <td style={styles.tableCell}>
                                  {item?.Active_Pending_With
                                    ? item?.Active_Pending_With?.split(";")
                                        ?.map((a: string) => a?.trim())
                                        ?.filter((a: string) => a)
                                        ?.join("; ")
                                    : ""}
                                </td>
                              </>
                            )}
                            {activeStatus === "pending" && (
                              <td style={styles.tableCell}>
                                <button
                                  style={{
                                    ...styles.sendReminderBtn,
                                    backgroundColor:
                                      !item?.Active_Pending_With ||
                                      item?.Status?.toLowerCase() === "denied"
                                        ? "#d3d3d3"
                                        : styles.sendReminderBtn
                                            .backgroundColor,
                                    color:
                                      !item?.Active_Pending_With ||
                                      item?.Status?.toLowerCase() === "denied"
                                        ? "#000"
                                        : styles.sendReminderBtn.color,
                                    cursor:
                                      !item?.Active_Pending_With ||
                                      item?.Status?.toLowerCase() === "denied"
                                        ? "not-allowed"
                                        : "pointer",
                                  }}
                                  onClick={() =>
                                    openReminderModal(item?.PR_Number)
                                  }
                                  disabled={
                                    !item?.Active_Pending_With ||
                                    item?.Status?.toLocaleLowerCase() ===
                                      "Denied"?.toLocaleLowerCase()
                                  }
                                >
                                  Send Reminder
                                </button>
                              </td>
                            )}

                            <td style={styles.tableCell}>
                              <span
                                style={styles.expandIcon}
                                onClick={() => toggleRow(item?.PR_Number)}
                              >
                                {expandedRows[item?.PR_Number] ? "−" : "+"}
                              </span>
                            </td>
                          </tr>

                          {expandedRows[item?.PR_Number] && (
                            <tr style={styles.expandedRow}>
                              <td
                                colSpan={activeStatus === "pending" ? 19 : 18}
                                style={styles.expandedCell}
                              >
                                <div style={styles.lineItemsContainer}>
                                  <table style={styles.lineItemsTable}>
                                    <thead>
                                      <tr style={styles.lineItemsHeaderRow}>
                                        <th style={styles.lineItemsHeader}>
                                          Line Number
                                        </th>
                                        <th style={styles.lineItemsHeader}>
                                          Item Description
                                        </th>
                                        <th style={styles.lineItemsHeader}>
                                          Quantity
                                        </th>
                                        <th style={styles.lineItemsHeader}>
                                          UOM
                                        </th>
                                        <th style={styles.lineItemsHeader}>
                                          Unit Price
                                        </th>
                                        <th style={styles.lineItemsHeader}>
                                          Line Total
                                        </th>
                                        <th style={styles.lineItemsHeader}>
                                          Commodity Code
                                        </th>
                                        <th style={styles.lineItemsHeader}>
                                          Supplier
                                        </th>
                                        <th style={styles.lineItemsHeader}>
                                          Tax Line Amount
                                        </th>
                                        <th style={styles.lineItemsHeader}>
                                          GL Account
                                        </th>
                                        <th style={styles.lineItemsHeader}>
                                          Cost Center
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {loadingLineItems ? (
                                        <tr>
                                          <td
                                            colSpan={11}
                                            style={{
                                              textAlign: "center",
                                              padding: "10px",
                                            }}
                                          >
                                            <SpinnerLoaders
                                              fullScreen={false}
                                              size="small"
                                              text="Loading..."
                                            />
                                          </td>
                                        </tr>
                                      ) : (
                                        (() => {
                                          const allLineItems = Object.values(
                                            lineItems || {},
                                          )?.flatMap(
                                            (item: any) =>
                                              item?.line_items || [],
                                          );
                                          if (allLineItems?.length === 0) {
                                            return (
                                              <tr>
                                                <td
                                                  colSpan={
                                                    activeStatus === "pending"
                                                      ? 19
                                                      : 18
                                                  }
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
                                            );
                                          }
                                          return allLineItems?.map(
                                            (lineItem: any, idx: number) => (
                                              <tr
                                                key={idx}
                                                style={{
                                                  ...styles.lineItemsRow,
                                                  backgroundColor:
                                                    i % 2 === 0
                                                      ? "#fafafa"
                                                      : "#fff",
                                                }}
                                              >
                                                <td
                                                  style={styles.lineItemsCell}
                                                >
                                                  {lineItem?.Line_Number ?? ""}
                                                </td>
                                                <td
                                                  style={{
                                                    ...styles.tableCell,
                                                    ...styles.lineItemsCell,
                                                  }}
                                                >
                                                  {lineItem?.Description ?? ""}
                                                </td>
                                                <td
                                                  style={styles.lineItemsCell}
                                                >
                                                  {lineItem?.Quantity ?? ""}
                                                </td>
                                                <td
                                                  style={styles.lineItemsCell}
                                                >
                                                  {lineItem?.UOM ?? ""}
                                                </td>
                                                <td
                                                  style={styles.lineItemsCell}
                                                >
                                                  {lineItem?.Unit_Price ?? ""}
                                                </td>
                                                <td
                                                  style={styles.lineItemsCell}
                                                >
                                                  {lineItem?.Line_Total ?? ""}
                                                </td>
                                                <td
                                                  style={styles.lineItemsCell}
                                                >
                                                  {lineItem?.Commodity_Code ??
                                                    ""}
                                                </td>
                                                <td
                                                  style={styles.lineItemsCell}
                                                >
                                                  {lineItem?.Requester ?? ""}
                                                </td>
                                                <td
                                                  style={styles.lineItemsCell}
                                                >
                                                  {lineItem?.Tax_Amount ?? ""}
                                                </td>
                                                <td
                                                  style={styles.lineItemsCell}
                                                >
                                                  {lineItem?.GL_Account ?? ""}
                                                </td>
                                                <td
                                                  style={styles.lineItemsCell}
                                                >
                                                  {lineItem?.Cost_Center ?? ""}
                                                </td>
                                              </tr>
                                            ),
                                          );
                                        })()
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={activeStatus === "pending" ? 19 : 18}
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

            
            {showModal && (
              <div style={styles.modalOverlay}>
                <div
                  style={styles.modalContent}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button style={styles.modalCloseBtn} onClick={closeModal}>
                    ×
                  </button>
                  <h2 style={styles.modalTitle}>
                    Send Reminder for PR {selectedPR}
                  </h2>
                  <p style={styles.modalSubtitle}>
                    Select email addresses to receive the reminder:
                  </p>

                  {loadingReminder ? (
                    <SpinnerLoaders
                      fullScreen={false}
                      size="medium"
                      text="Loading data..."
                    />
                  ) : (
                    <>
                      <div style={styles.emailInputContainer}>
                        <div
                          style={{
                            ...styles.emailInputWrapper,
                            ...(emailError
                              ? styles.emailInputWrapperError
                              : {}),
                          }}
                          onClick={handleInputContainerClick}
                        >
                          {emailList?.length > 0
                            ? emailList?.map((email, index) => (
                                <div key={index} style={styles.emailChip}>
                                  <span
                                    style={styles.emailChipText}
                                    title={email}
                                  >
                                    {email}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeEmail(index);
                                    }}
                                    style={styles.removeChipBtn}
                                    title="Remove"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))
                            : null}
                          <input
                            ref={inputRef}
                            type="text"
                            placeholder={
                              emailList.length === 0
                                ? "Enter email address"
                                : ""
                            }
                            value={emailInput}
                            onChange={handleEmailInputChange}
                            onKeyDown={handleKeyPress}
                            onFocus={handleInputFocus}
                            onBlur={() => {
                              setTimeout(() => setShowSuggestions(false), 200);
                            }}
                            style={styles.emailInput}
                          />
                        </div>

                        {showSuggestions && filteredSuggestions?.length > 0 && (
                          <div style={styles.suggestionsDropdown}>
                            {filteredSuggestions?.map((email, index) => (
                              <div
                                key={index}
                                style={styles.suggestionItem}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  selectEmail(email);
                                }}
                                onMouseEnter={(e) =>
                                  ((
                                    e.target as HTMLElement
                                  ).style.backgroundColor = "#f5f5f5")
                                }
                                onMouseLeave={(e) =>
                                  ((
                                    e.target as HTMLElement
                                  ).style.backgroundColor = "#fff")
                                }
                              >
                                {email}
                              </div>
                            ))}
                          </div>
                        )}

                        {emailError && (
                          <div style={styles.errorMessage}>{emailError}</div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "1rem" }}>
                        <button
                          style={{
                            ...styles.sendReminderModalBtn,
                            opacity:
                              emailList?.length === 0 || sendloadingReminder
                                ? 0.5
                                : 1,
                            cursor:
                              emailList?.length === 0 || sendloadingReminder
                                ? "not-allowed"
                                : "pointer",
                          }}
                          onClick={() => sendReminder(selectedPR, emailList)}
                          disabled={
                            emailList?.length === 0 || sendloadingReminder
                          }
                        >
                          Send Reminder
                        </button>
                        <button
                          style={{
                            ...styles.sendReminderModalBtn,
                            backgroundColor: "red",
                            width: "39%",
                            opacity:
                              emailSuggestions?.length === 0 ||
                              sendloadingReminder
                                ? 0.5
                                : 1,
                            cursor:
                              emailSuggestions?.length === 0 ||
                              sendloadingReminder
                                ? "not-allowed"
                                : "pointer",
                          }}
                          onClick={() => {
                            sendReminder(selectedPR, [
                              ...new Set([...emailSuggestions, ...emailList]),
                            ]);
                            setEmailList([
                              ...new Set([...emailSuggestions, ...emailList]),
                            ]);
                          }}
                          disabled={
                            emailSuggestions?.length === 0 ||
                            sendloadingReminder
                          }
                        >
                          Send All
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default Prdashboard;
