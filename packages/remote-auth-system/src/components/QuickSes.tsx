import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
// Removed unused icons from lucide-react

import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ErrorModel from "./ErrorModel";
import DatePicker from "react-datepicker";
import { useDebounce } from "../hooks/useDebounce";
import {
  getTableData,
  getPoNumber,
  getLineItem,
  getPurchaseOrder,
  getServiceSheetNum,
  rejectServiceSheet,
  updatedPoTable,
  getPoDetails,
  poChangeSavings,
  poChange,
  fetchSuppliers,
  missingData,
  transferDatas,
  submitPoLineItem,
  viewSubmissions,
  getPendingServiceSheets,
  type SubmissionItem,
  openPr,
} from "../api/mockData";
import "./QuickSes.css";
import { Tooltip } from "react-tooltip";
import type {
  RefreshTableItem,
  RefreshTableResponse,
  FetchPoDetails,
} from "../api/mockData";


/** --- Types --- **/
interface LineItem {
  lineItem: string;
  service_max_amount?: number;
  receiptId: string;
  result: string;
  Service_Description: string;
  extReferenceNo: string;
  start_date: string;
  end_date: string;
  service_sheet_number_generated?: string;
  external_reference_id?: string;
}

interface PODetail {
  purchaseOrderId: string;
  lineItems: LineItem[];
}
interface ServiceSheetResponse {
  external_reference_id: string | null;
  status: string;
  comments: string[];
  total_comments: number;
  message: string;
  process_datetime?: string;
  error?: string;
}
interface SESMappedResult {
  sesId: string;
  resultSesId: string;
  status: string;
}
const normalizeKey = (po: string | number, line: string | number) =>
  `${String(po).trim()}-${String(line).trim()}`;

/** --- Component --- **/
const QuickSes: React.FC = () => {
  const navigate = useNavigate();
  const [poDetailsData, setPODetailsData] = useState<PODetail[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [allPONumbers, setAllPONumbers] = useState<string[]>([]);
  const [poForTable, setPoForTable] = useState<string[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [pendingPOList, setPendingPOList] = useState<string[]>([]);
  const [currentPOIndex, setCurrentPOIndex] = useState<number>(0);
  const [isLoadingPOs, setIsLoadingPOs] = useState<boolean>(false);
  const [isLoadingRCTData, setIsLoadingRCTData] = useState<boolean>(false);
  const [showSessionModal, setShowSessionModal] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState<FetchPoDetails | null>(null);
  const [changedFields, setChangedFields] = useState<Partial<FetchPoDetails>>({});
  const [receiptIds, setReceiptIds] = useState<string[]>([]);
  const [isReceiptDropdownOpen, setIsReceiptDropdownOpen] = useState<boolean>(false);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState<boolean>(false);
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([]);
  const [selectedPO, setSelectedPO] = useState<string[]>([]);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isScheduling, setIsScheduling] = useState<boolean>(false);
  const [showScheduleTable, setShowScheduleTable] = useState<boolean>(false);
  const [scheduleData, setScheduleData] = useState<SubmissionItem[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  const [showUnsavedChangesModal, setShowUnsavedChangesModal] =
    useState<boolean>(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    (() => void) | null
  >(null);
  const [poChangeProcessingRows, setPoChangeProcessingRows] = useState<Set<string>>(new Set());

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [poDate, setPoDate] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });
  const [quickSESResults, setQuickSESResults] = useState<
    Record<
      string,
      {
        sesId: string;
        resultSesId: string;
        status: string;
      }
    >
  >({});
  const [serviceSheetMap, setServiceSheetMap] = useState<
    Record<string, ServiceSheetResponse>
  >({});
  const [refreshTableData, setRefreshTableData] = useState<RefreshTableItem[]>(
    [],
  );
  const [missingTableData, setMissingTableData] = useState<RefreshTableItem[]>(
    [],
  );

  const [refreshSummary, setRefreshSummary] = useState<
    RefreshTableResponse["summary"] | null
  >(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [missingCurrentPage, setMissingCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [missingTotalPages, setMissingTotalPages] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [currentRowKey, setCurrentRowKey] = useState<string | null>(null);
  const [enableSave, setEnableSave] = useState(false);
  const [sesIdRt, setSesIdRt] = useState<string>("");
  const [rejectingRow, setRejectingRow] = useState<string | null>(null);
  const [poFilter, setPoFilter] = useState("");
  const poFilters = useDebounce(poFilter, 1000);
  const [statusFilter, setStatusFilter] = useState("");
  const [showStatusList, setShowStatusList] = useState(false);
  const startDateHeaderRef = useRef<HTMLDivElement>(null);
  const startDatePickerRef = useRef<HTMLDivElement>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const endDateHeaderRef = useRef<HTMLDivElement>(null);
  const endDatePickerRef = useRef<HTMLDivElement>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [showNewTable, setShowNewTable] = useState(false);
  const [lineItemFilter, setLineItemFilter] = useState<string | null>(null);
  const handleStartDateHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEndDatePicker(false);
    setShowPoInput(false);
    setShowStartDatePicker(prev => !prev);
  };
  const activeDatePicker =
    showStartDatePicker ? "start" :
      showEndDatePicker ? "end" :
        null;

  const handleEndDateHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowStartDatePicker(false);
    setShowPoInput(false);
    setShowEndDatePicker(prev => !prev);
  };
  const [showPoInput, setShowPoInput] = useState(false);
  const [reprocessableRows, setReprocessableRows] = useState<Set<string>>(
    new Set(),
  );

  const [processingRows, setProcessingRows] = useState<Set<string>>(new Set());

  const tableRef = useRef<HTMLDivElement | null>(null);

  const fetchingRef = useRef(new Set<string>());
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSearchTermRef = useRef<string>("");
  const isInitialLoadRef = useRef(true);
  const cachedPOsRef = useRef<string[] | null>(null);
  const poPromiseRef = useRef<Promise<string[]> | null>(null);
  const initialStateRef = useRef<{
    selectedPO: string[];
    selectedReceiptIds: string[];
  } | null>(null);
  const [rejectComment, setRejectComment] = useState<string>("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState<boolean>(false);
  const [modalComment, setModalComment] = useState<{
    displayComments: string;
    purchase_order_id: string;
    line_item: string;
  }>({
    displayComments: "",
    purchase_order_id: "",
    line_item: "",
  });

  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vendorList, setVendorList] = useState<string[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [vendorSearchTerm, setVendorSearchTerm] = useState<string>("");
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState<boolean>(false);
  const [isLoadingVendors, setIsLoadingVendors] = useState<boolean>(false);
  const vendorSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [datePickerPos, setDatePickerPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (activeDatePicker) {
      const updatePos = () => {
        const targetRef = activeDatePicker === "start" ? startDateHeaderRef : endDateHeaderRef;
        if (targetRef.current) {
          const rect = targetRef.current.getBoundingClientRect();
          const calendarWidth = 320;
          let left = rect.left + (rect.width / 2) - (calendarWidth / 2);
          left = Math.max(16, Math.min(left, window.innerWidth - calendarWidth - 16));
          const top = rect.bottom + 8;
          setDatePickerPos({ top, left });
        }
      };

      updatePos();
      window.addEventListener("scroll", updatePos, true);
      window.addEventListener("resize", updatePos);

      return () => {
        window.removeEventListener("scroll", updatePos, true);
        window.removeEventListener("resize", updatePos);
      };
    }
  }, [activeDatePicker]);

  useEffect(() => {
    if (!activeDatePicker) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        startDatePickerRef.current?.contains(e.target as Node) ||
        endDatePickerRef.current?.contains(e.target as Node)
      ) {
        return;
      }

      setShowStartDatePicker(false);
      setShowEndDatePicker(false);
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowStartDatePicker(false);
        setShowEndDatePicker(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [activeDatePicker]);

  useEffect(() => {
    if (!showStartDatePicker && !showEndDatePicker) {
      setDatePickerPos(null);
    }
  }, [showStartDatePicker, showEndDatePicker]);

  const fetchVendors = async (search: string = "") => {
    setIsLoadingVendors(true);
    try {
      const data = await fetchSuppliers({ search, page: 1, page_size: 50 });
      setVendorList(data?.suppliers || []);
    } catch (err) {
    } finally {
      setIsLoadingVendors(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (vendorSearchTimeoutRef.current) {
      clearTimeout(vendorSearchTimeoutRef.current);
    }
    vendorSearchTimeoutRef.current = setTimeout(() => {
      fetchVendors(vendorSearchTerm);
    }, 500);
    return () => {
      if (vendorSearchTimeoutRef.current) clearTimeout(vendorSearchTimeoutRef.current);
    };
  }, [vendorSearchTerm]);
  useEffect(() => {
    setSelectedPO([]);
    const fetchFilterPOs = async () => {
      try {
        cachedPOsRef.current = null;
        poPromiseRef.current = null;
        let pos: string[] | null = cachedPOsRef.current;
        if (!pos) {
          if (!poPromiseRef.current) {
            const supplierId = selectedVendor ? selectedVendor.split("-").pop()?.trim() || "" : "";
            poPromiseRef.current = getPoNumber(poDate.from, poDate.to, supplierId).then(res => {
              if (Array.isArray(res) && res.length === 0 && (supplierId || poDate.from || poDate.to)) {
                toast.warn("No PO numbers found for selected criteria");
              }
              cachedPOsRef.current = res;
              poPromiseRef.current = null;
              return res;
            });
          }
          pos = await poPromiseRef.current;
          poPromiseRef.current = null;
        }
        setPoForTable(pos || []);
      } catch (error: any) {
        if (error?.status === 401) {
          navigate("/");
        }

      }
    };
    fetchFilterPOs();
  }, [poDate, navigate, selectedVendor]);
  useEffect(() => {
    const pending = localStorage.getItem("pending_quick_ses");

    if (pending) {
      const poList = JSON.parse(pending);
      setPendingPOList(poList);
      setShowPopup(true);
    }
  }, []);
  const checkAndNavigate = async (poNumber: string, lineItem?: string) => {
    try {
      const trimmedPo = String(poNumber).trim();
      const trimmedLine = lineItem ? String(lineItem).trim() : undefined;

      const response = await updatedPoTable({
        purchase_order_ids: [trimmedPo],
        page: 1,
        page_size: 100,
      });

      const exists = response.data.some((item) => {
        const poMatch = String(item.purchase_order_id).trim() === trimmedPo;
        let lineMatch = true;

        if (trimmedLine) {
          const itemLine = String(item.line_item).trim();
          lineMatch = itemLine === trimmedLine ||
            Number(itemLine) === Number(trimmedLine);
        }

        return poMatch && lineMatch;
      });

      if (exists) {
        setShowNewTable(false);
        setPoFilter(trimmedPo);
        setLineItemFilter(trimmedLine || null);

        setRefreshTableData(response.data);
        if (response.summary) {
          setRefreshSummary(response.summary);
          setTotalPages(response.summary.total_pages || 0);
        }
        setCurrentPage(1);

        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  const transferData = async (
    service_sheet_number_generated: string,
    poNumber?: string,
    lineItem?: string
  ) => {
    try {
      await transferDatas(service_sheet_number_generated);
      toast.success("Transfer successful");
      return true;
    } catch (error: any) {
      const isAlreadyExists = error?.response?.data?.detail?.includes("Service sheet") &&
        error?.response?.data?.detail?.includes("already exists");

      if (poNumber && (isAlreadyExists || error)) {
        await checkAndNavigate(poNumber, lineItem);
        return false;
      }

      if (error?.response?.status === 401) {
        navigate("/");
      }
      toast.error(isAlreadyExists ? "Service Sheet already exists" : "Transfer failed");
      return false;
    }
  };

  const handleRejectClick = async (rowKey: string) => {
    setIsRejecting(true);
    const sesId = sesIdRt || quickSESResults[rowKey]?.resultSesId;
    if (!sesId) {
      toast.warn("SES ID not found");
      setIsRejecting(false);
      return;
    }
    if (!rejectComment) {
      toast.warn("Reject comment is required");
      setIsRejecting(false);
      return;
    }

    setRejectingRow(currentRowKey);

    try {
      if (showNewTable) {
        const poNumber = rowKey.split("-")[0];
        const lineItem = rowKey.split("-")[1];
        const success = await transferData(sesId, poNumber, lineItem);
        if (!success) return;
      }
      const response = await rejectServiceSheet([sesId], rejectComment);

      if (response && response.error_count > 0) {
        const errorInfo = response.results?.[0];
        const errorMessage = errorInfo?.error || errorInfo?.message || "Failed to reject Service Sheet";
        toast.error(errorMessage);
      } else {
        toast.success("Service Sheet rejected successfully!");
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        navigate("/");
      }
      toast.error(error?.description || "Failed to reject Service Sheet");
    } finally {
      setRejectingRow(null);
      setIsRejecting(false);

      if (showNewTable) {
        setShowNewTable(false);
      } else {
        await handleRefreshTable();
      }
    }
  };

  useEffect(() => {
    if (!initialStateRef.current) {
      initialStateRef.current = {
        selectedPO: [],
        selectedReceiptIds: [],
      };
      return;
    }

    const currentState = {
      selectedPO,
      selectedReceiptIds,
    };

    const hasChanges =
      JSON.stringify(currentState.selectedPO) !==
      JSON.stringify(initialStateRef.current.selectedPO) ||
      JSON.stringify(currentState.selectedReceiptIds) !==
      JSON.stringify(initialStateRef.current.selectedReceiptIds);

    setHasUnsavedChanges(hasChanges);
    window.hasUnsavedChanges = hasChanges;
  }, [selectedPO, selectedReceiptIds]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave this page?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        window.history.pushState(null, "", window.location.href);
        setShowUnsavedChangesModal(true);
        setPendingNavigation(() => {
          return () => {
            window.history.back();
          };
        });
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener("popstate", handlePopState);
      try {
        window.history.pushState(null, "", window.location.href);
      } catch {
      }
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasUnsavedChanges]);

  const handleUnsavedChangesConfirm = () => {
    setShowUnsavedChangesModal(false);
    setHasUnsavedChanges(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleUnsavedChangesCancel = () => {
    setShowUnsavedChangesModal(false);
    setPendingNavigation(null);
  };

  const fetchPOs = useCallback(
    async (term: string, index: number, limit: number, isSearch: boolean) => {
      if (isLoadingPOs) return;

      let allPOs = cachedPOsRef.current;

      if (!allPOs) {
        setIsLoadingPOs(true);
        try {
          if (!poPromiseRef.current) {
            const supplierId = selectedVendor ? selectedVendor.split("-").pop()?.trim() || "" : "";
            poPromiseRef.current = getPoNumber(poDate.from, poDate.to, supplierId).then(res => {
              if (Array.isArray(res) && res.length === 0 && (supplierId || poDate.from || poDate.to)) {
                toast.warn("No PO numbers found for selected criteria");
              }
              cachedPOsRef.current = res;
              poPromiseRef.current = null;
              return res;
            }).catch(err => {
              poPromiseRef.current = null;
              throw err;
            });
          }
          allPOs = await poPromiseRef.current;
          poPromiseRef.current = null;
        } catch (error: any) {
          if (error?.statusCode === 401) {
            toast.error("Unauthorized access. Redirecting to login.");
            navigate("/");
            return;
          }
          toast.error("Failed to fetch PO numbers");
          return;
        } finally {
          setIsLoadingPOs(false);
        }
      }

      try {
        let filteredPOs = allPOs || [];
        if (term) {
          filteredPOs = filteredPOs.filter((po) =>
            po.toLowerCase().includes(term.toLowerCase()),
          );
        }
        const start = isSearch ? 0 : index;
        const end = start + limit;
        const data = filteredPOs.slice(start, end);
        if (isSearch || term) {
          setAllPONumbers(data);
          setCurrentPOIndex(0);
        } else {
          setAllPONumbers((prev) => [...new Set([...prev, ...data])]);
          setCurrentPOIndex((prev) => prev + limit);
        }
      } catch (error: any) {
        if (error?.response?.status === 401) {
          navigate("/");
        }
        toast.error("Failed to fetch PO numbers");
      } finally {
        setIsLoadingPOs(false);
      }
    },
    [isLoadingPOs, poDate, selectedVendor],
  );

  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      setCurrentPOIndex(0);
      setAllPONumbers([]);
      fetchPOs("", 0, 10, false);
    }
  }, [fetchPOs]);

  useEffect(() => {
    setAllPONumbers([]);
    setCurrentPOIndex(0);
    fetchPOs(searchTerm, 0, 10, !!searchTerm);
  }, [poDate, fetchPOs, searchTerm, selectedVendor]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchTerm.trim()) {
      if (lastSearchTermRef.current !== "") {
        lastSearchTermRef.current = "";
        setCurrentPOIndex(0);
        setAllPONumbers([]);
        fetchPOs("", 0, 10, false);
      }
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      const trimmedSearchTerm = searchTerm.trim();
      if (
        trimmedSearchTerm &&
        trimmedSearchTerm !== lastSearchTermRef.current
      ) {
        lastSearchTermRef.current = trimmedSearchTerm;
        setCurrentPOIndex(0);
        fetchPOs(trimmedSearchTerm, 0, 10, true);
      }
    }, 1000);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [searchTerm, fetchPOs]);

  // Fetch receipts whenever selected PO numbers change
  useEffect(() => {
    const fetchReceipts = async () => {
      if (!selectedPO || selectedPO.length === 0) {
        setReceiptIds([]);
        setSelectedReceiptIds([]);
        return;
      }

      setIsLoadingReceipts(true);
      try {
        const response = await getLineItem(selectedPO);

        let receipts: string[] = [];

        if (response?.results && Array.isArray(response.results)) {
          response.results.forEach((item: any) => {
            if (item.line_items && Array.isArray(item.line_items)) {
              receipts = receipts.concat(
                item.line_items.map(
                  (li: string) => `${item.purchase_order_id} - ${li}`
                )
              );
            }
          });
        }
        const filterLineItems = receipts.filter((item) => {
          const parts = item.split(" - ");
          if (parts.length < 2) return false;
          const lineVal = parseInt(parts[1].split(" ")[0], 10);
          return lineVal < 1000;
        });
        setReceiptIds([...new Set(filterLineItems)]);

        setSelectedReceiptIds((prev) =>
          prev.filter((id) => filterLineItems.includes(id))
        );
      } catch (error: any) {
        if (error?.response?.status === 401) {
          navigate("/");
        }
        setReceiptIds([]);
        setSelectedReceiptIds([]);
      } finally {
        setIsLoadingReceipts(false);
      }
    };

    fetchReceipts();
  }, [selectedPO]);

  useEffect(() => {
    const fetchRCTData = async () => {
      if (selectedPO.length === 0 || selectedReceiptIds.length === 0) {
        setPODetailsData([]);
        return;
      }

      setIsLoadingRCTData(true);
      try {
        const poIds: string[] = [];
        const lineItems: string[] = [];

        selectedReceiptIds.forEach((receiptStr) => {
          const parts = receiptStr.split(" - ");
          if (parts.length >= 2) {
            const po = parts[0];
            const lineNum = parts[1].split(" ")[0];
            poIds.push(po);
            lineItems.push(lineNum);
          }
        });

        const res = await getTableData(poIds, lineItems);
        const mergedData: PODetail[] = [];

        (res?.results || []).forEach((result: any) => {
          if (!result?.data || result.status !== "success") return;

          const poId = result.purchase_order_id;
          let poEntry = mergedData.find((p) => p.purchaseOrderId === poId);
          if (!poEntry) {
            poEntry = { purchaseOrderId: poId, lineItems: [] };
            mergedData.push(poEntry);
          }

          result.data.forEach((item: any) => {
            poEntry!.lineItems.push({
              lineItem: String(item.line_item ?? result.line_item),
              service_max_amount: item.service_max_amount ?? 0,
              receiptId: String(item.receipt_id ?? item.receiptId ?? ""),
              result: item.result ?? "",
              extReferenceNo: item.ext_reference_no ?? "",
              start_date: item.service_start_date ?? null,
              end_date: item.service_end_date ?? null,
              Service_Description: item.line_item_description ?? item.Service_Description ?? "",
              service_sheet_number_generated: item.service_sheet_number_generated ?? "",
              external_reference_id: item.external_reference_id ?? "",
            });
          });
        });

        setPODetailsData(mergedData);
      } catch (error: any) {
        if (error?.statusCode === 401) {
          toast.error("Unauthorized access. Redirecting to login.");
          navigate("/");
          return;
        }
        toast.error("Failed to load details");
        setPODetailsData([]);
      } finally {
        setIsLoadingRCTData(false);
      }
    };

    fetchRCTData();
  }, [selectedPO, selectedReceiptIds]);

  const currentRCTData = useMemo(() => {
    if (poDetailsData?.length === 0)
      return [] as { item: LineItem; purchaseOrderId: string }[];

    const combined: { item: LineItem; purchaseOrderId: string }[] = [];

    poDetailsData.forEach((poDetail) => {
      poDetail.lineItems.forEach((li) => {
        combined.push({ item: li, purchaseOrderId: poDetail.purchaseOrderId });
      });
    });

    if (poDate.from || poDate.to) {
      return combined.filter(({ item }) => {
        if (!item.start_date) return true;
        const itemDate = new Date(item.start_date);
        const fromDate = poDate.from ? new Date(poDate.from) : null;
        const toDate = poDate.to ? new Date(poDate.to) : null;

        if (fromDate && toDate) {
          return itemDate >= fromDate && itemDate <= toDate;
        } else if (fromDate) {
          return itemDate >= fromDate;
        } else if (toDate) {
          return itemDate <= toDate;
        }
        return true;
      });
    }

    return combined;
  }, [poDetailsData, poDate]);

  /** Handlers */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (!isDropdownOpen) {
      setIsDropdownOpen(true);
    }
  };

  const handleSelectedPr = (po: string) => {
    setSelectedPO((prev) => {
      const isSelected = prev.includes(po);
      if (isSelected) {
        setSelectedReceiptIds((prevReceipts) =>
          prevReceipts.filter((receipt) => !receipt.startsWith(`${po} - `))
        );
        return prev.filter((p) => p !== po);
      }
      return [...prev, po];
    });
  };

  const handleReceiptToggle = (receiptId: string) => {
    setSelectedReceiptIds((prev) =>
      prev.includes(receiptId)
        ? prev.filter((id) => id !== receiptId)
        : [...prev, receiptId],
    );
  };

  const handleRowCheckboxToggle = (rowId: string) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };
  const handleScheduledSubmit = async () => {
    if (currentRCTData.length === 0) {
      toast.warn("Please select PO number and line items first.");
      return;
    }

    setIsScheduling(true);
    try {
      const payload = {
        items: currentRCTData.map((row) => ({
          purchase_order_ids: row.purchaseOrderId,
          line_item: String(row.item?.lineItem ?? ""),
        })),
      };

      await submitPoLineItem(payload);
      setSelectedRows(new Set());
      toast.success("Scheduled successfully!");
      setSelectedPO([]);
      setSelectedReceiptIds([]);
    } catch (error: any) {
      if (error?.statusCode === 401) {
        navigate("/");
        return;
      }
      toast.error(error?.description || "Failed to schedule PO line item.");
    } finally {
      handleRefreshTable(1);
      setIsScheduling(false);
    }
  };

  const handleViewSchedule = async () => {
    if (showScheduleTable) {
      setShowScheduleTable(false);
      return;
    }
    setIsLoadingSchedule(true);
    setShowScheduleTable(true);
    try {
      const result = await viewSubmissions({ flag: 0, page: 1, page_size: 100 });
      setScheduleData(result.submissions || []);
    } catch (error: any) {
      if (error?.statusCode === 401) {
        navigate("/");
        return;
      }
      toast.error(error?.description || "Failed to fetch schedule data.");
      setShowScheduleTable(false);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      currentRCTData.forEach((_, index) => {
        const key = `row-${index}`;
        if (checked) {
          newSet.add(key);
        } else {
          newSet.delete(key);
        }
      });
      return newSet;
    });
  };

  const handleDropdownScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      if (
        target.scrollHeight - target.scrollTop - target.clientHeight < 20 &&
        !isLoadingPOs &&
        !searchTerm
      ) {
        fetchPOs("", currentPOIndex, 10, false);
      }
    },
    [currentPOIndex, isLoadingPOs, searchTerm, fetchPOs],
  );

  const selectedRowData = useMemo(() => {
    const rows: { item: LineItem; purchaseOrderId: string }[] = [];

    selectedRows.forEach((rowId) => {
      const index = parseInt(rowId.replace("row-", ""), 10);
      if (!isNaN(index) && currentRCTData[index]) {
        rows.push(currentRCTData[index]);
      }
    });

    return rows;
  }, [selectedRows, currentRCTData]);

  const handleRunQuickSesNew = async (rowItem: any) => {
    const rowKey = `${rowItem.purchase_order_id}-${rowItem.line_item}`;
    setProcessingRows((prev) => new Set(prev).add(rowKey));

    try {
      if (showNewTable) {
        const poNumber = rowKey.split("-")[0];
        const lineItem = rowKey.split("-")[1];
        const success = await transferData(rowItem.service_sheet_number_generated, poNumber, lineItem);
        if (!success) return;
      }
      const response = await getPurchaseOrder(
        [String(rowItem.purchase_order_id).trim()],
        [String(rowItem.line_item)]
      );

      const resultMap: Record<string, SESMappedResult> = {};

      (response?.details || []).forEach((d: any) => {
        const r = d.results?.[0] || {};
        const key = normalizeKey(d.purchase_order_id, d.line_item);
        resultMap[key] = {
          sesId: r.service_sheet_number || "",
          resultSesId: r.service_sheet_number_generated || "",
          status: r.status || "",
        };
      });

      setQuickSESResults((prev) => ({ ...prev, ...resultMap }));
      setReprocessableRows((prev) => new Set([...prev, rowKey]));

      toast.success("Quick SES completed!");
      if (showNewTable === false) {
        await handleRefreshTable();
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        navigate("/");
      }
      toast.error("Failed to run Quick SES");
    } finally {
      setProcessingRows((prev) => {
        const next = new Set(prev);
        next.delete(rowKey);
        return next;
      });
      setReprocessableRows(new Set());
      if (showNewTable) {
        await checkAndNavigate(String(rowItem.purchase_order_id), String(rowItem.line_item));
      } else {
        await handleRefreshTable();
      }
    }
  };

  const handleRunQuickSES = async (rowItem?: any) => {
    const isSingleRow = rowItem && rowItem.purchase_order_id;

  let keysToProcess: string[] = [];

    try {
      let rowsToProcess;
      if (isSingleRow) {
        rowsToProcess = [{
          purchase_order_id: rowItem.purchase_order_id,
          line_item: rowItem.line_item,
          resultSesId: rowItem.service_sheet_number_generated
        }];
      } else {
        rowsToProcess =
          selectedRowData?.length > 0
            ? selectedRowData.map((row: any) => ({
              purchase_order_id: row.purchaseOrderId ?? row.purchase_order_id,
              line_item: row.item?.lineItem ?? row.line_item ?? row.lineItem,
              resultSesId: row.item?.service_sheet_number_generated
            }))
            : refreshTableData
              ?.filter((item) =>
                selectedRows.has(`${item.purchase_order_id}-${item.line_item}`),
              )
              .map((item) => ({
                purchase_order_id: item.purchase_order_id,
                line_item: item.line_item,
                resultSesId: item.service_sheet_number_generated
              })) ?? [];
      }

      if (rowsToProcess.length === 0) {
        toast.warn("Please select at least one row.");
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
      const poKeys = rowsToProcess.map(
        (r) => `${r.purchase_order_id}-${r.line_item}`,
      );
      keysToProcess = poKeys;
      setProcessingRows(prev => {
        const next = new Set(prev);
        poKeys.forEach(k => next.add(k));
        return next;
      });
      localStorage.setItem("pending_quick_ses", JSON.stringify(poKeys));
      const rowsWithSes: { purchase_order_id: string; line_item: string; resultSesId: string }[] = [];
      const rowsWithoutSes: { purchase_order_id: string; line_item: string }[] = [];

      rowsToProcess.forEach(row => {

        const existingSesId = row.resultSesId;
        if (existingSesId) {
          rowsWithSes.push({ ...row, resultSesId: existingSesId });
        } else {
          rowsWithoutSes.push(row);
        }
      });

      const resultMap: Record<string, SESMappedResult> = {};
      const updates: Record<string, ServiceSheetResponse> = {};
      if (rowsWithoutSes.length > 0) {
        const poIds = rowsWithoutSes.map((r) => String(r.purchase_order_id).trim());
        const lineItems = rowsWithoutSes.map((r) => String(r.line_item));
        const response = await getPurchaseOrder(poIds, lineItems);

        (response?.details || []).forEach((d) => {
          const r = d.results?.[0] || {};
          const key = normalizeKey(d.purchase_order_id, d.line_item);
          resultMap[key] = {
            sesId: r.service_sheet_number || "",
            resultSesId: r.service_sheet_number_generated || "",
            status: r.status || "",
          };
        });
      }
      if (rowsWithSes.length > 0) {
        const sesIds = rowsWithSes.map(r => r.resultSesId);
        try {
          let response: any;
          for (let i = 0; i < 2; i++) {
            try {
              response = await getServiceSheetNum(sesIds) as any;
              const resCheck = response?.results || [];
              const hasFailures = resCheck.some((resData: any) => {
                const rawComments = resData.comments || [];
                return (rawComments.length === 0 && !resData.external_reference_id);
              });
              if (!hasFailures) break;
              if (i < 1) await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (err) {
              if (i === 1) throw err;
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          const results = response?.results || [];

          rowsWithSes.forEach(r => {
            const key = normalizeKey(r.purchase_order_id, r.line_item);
            const existing = quickSESResults[key] || {
              sesId: r.resultSesId,
              resultSesId: r.resultSesId,
              status: ""
            };

            const resData = results.find((item: any) =>
              String(item.service_sheet_number_generated ?? item.service_sheet_number) === String(r.resultSesId)
            );

            if (resData) {
              const rawComments = resData.comments || [];
              const rawMessage = resData.message || "";
              const isAwaiting = rawComments.some((c: any) => String(c).toLowerCase().includes("approvers still present")) ||
                String(rawMessage).toLowerCase().includes("approvers still present");

              if (isAwaiting) {
                updates[key] = {
                  sesId: existing.sesId,
                  resultSesId: existing.resultSesId,
                  external_reference_id: resData.external_reference_id,
                  status: resData.status,
                  comments: ["approvers still present"],
                  total_comments: 1,
                  message: "approvers still present",
                  process_datetime: resData.process_datetime
                } as any;
              } else {
                updates[key] = {
                  sesId: existing.sesId,
                  resultSesId: existing.resultSesId,
                  external_reference_id: resData.external_reference_id,
                  status: resData.status,
                  comments: resData.comments || [],
                  total_comments: resData.total_comments || 0,
                  message: resData.message,
                  process_datetime: resData.process_datetime,
                  error: resData.error
                } as any;
              }

              const newStatus = resData?.external_reference_id ? "Success" : resData.status;

              resultMap[key] = {
                sesId: existing.sesId,
                resultSesId: existing.resultSesId,
                status: newStatus
              };
            } else {
              resultMap[key] = {
                sesId: existing.sesId,
                resultSesId: existing.resultSesId,
                status: (existing as any).status || ""
              };
            }
          });
          if (Object.keys(updates).length > 0) {
            setServiceSheetMap((prev) => ({ ...prev, ...updates }));
          }
        } catch (e: any) {
          rowsWithSes.forEach(r => {
            const key = normalizeKey(r.purchase_order_id, r.line_item);
            if (quickSESResults[key]) {
              const existing = quickSESResults[key];
              resultMap[key] = {
                sesId: existing.sesId,
                resultSesId: existing.resultSesId,
                status: "error",
                message: e.message || "Failed to load details"
              } as any;

              updates[key] = {
                status: "error",
                external_reference_id: null,
                comments: [],
                total_comments: 0,
                message: e.message || "Failed to load details",
                process_datetime: new Date().toISOString().slice(0, 19).replace("T", " ")
              };
            }
          });
        }
      }
      setQuickSESResults(prev => ({ ...prev, ...resultMap }));

      const processedKeys = rowsToProcess.map(
        (r) => `${r.purchase_order_id}-${r.line_item}`,
      );
      setReprocessableRows((prev) => new Set([...prev, ...processedKeys]));
      if (!isSingleRow) {
        setSelectedRows(new Set());
      }
      localStorage.removeItem("pending_quick_ses");

      toast.success(`Quick SES completed! (${rowsToProcess.length} items)`);
      await handleRefreshTable();
    } catch (error: any) {
      if (error?.response?.status === 401) {
        navigate("/");
      }
      localStorage.removeItem("pending_quick_ses");
      toast.error("Failed to run Quick SES");
    } finally {
      setProcessingRows(prev => {
        const next = new Set(prev);
        keysToProcess.forEach(k => next.delete(k));
        return next;
      });
    }
  };

  useEffect(() => {
    const fetchServiceSheets = async (retryKeys: Set<string> | null = null, retryCount: number = 0) => {
      const updates: Record<string, ServiceSheetResponse> = {};
      const nextRetryKeys = new Set<string>();

      for (const { purchaseOrderId, item } of currentRCTData) {
        const lineItem = item.lineItem;
        const rowKey = `${purchaseOrderId}-${lineItem}`;
        if (retryKeys && !retryKeys.has(rowKey)) {
          continue;
        }
        const sesNumber = quickSESResults[rowKey]?.resultSesId;
        if (!sesNumber) {
          continue;
        }
        if (!retryKeys && serviceSheetMap[rowKey]?.comments !== undefined) {
          continue;
        }
        if (fetchingRef.current.has(rowKey)) {
          continue;
        }
        try {
          fetchingRef.current.add(rowKey);
          const response = await getServiceSheetNum([sesNumber]) as any;
          if (response?.results && Array.isArray(response.results)) {
            const resData = response.results[0];
            const rawComments = resData.comments || [];
            const rawMessage = resData.message || "";

            if (resData.status === 'failed' || (rawComments.length === 0 && !resData.external_reference_id)) {
              nextRetryKeys.add(rowKey);
            }
            const isAwaiting = rawComments.some((c: any) => String(c).toLowerCase().includes("approvers still present")) ||
              String(rawMessage).toLowerCase().includes("approvers still present");

            if (isAwaiting) {
              updates[rowKey] = {
                external_reference_id: resData.external_reference_id,
                status: resData.status,
                comments: ["approvers still present"],
                total_comments: 1,
                message: "approvers still present",
                process_datetime: resData.process_datetime
              };
            } else {
              updates[rowKey] = {
                external_reference_id: resData.external_reference_id,
                status: resData.status,
                comments: resData.comments || [],
                total_comments: resData.total_comments || 0,
                message: resData.message,
                process_datetime: resData.process_datetime,
                error: resData.error
              };
            }
          } else {
            updates[rowKey] = Array.isArray(response) ? response[0] : response;
            if (updates[rowKey]?.status === 'error') {
              nextRetryKeys.add(rowKey);
            }
          }
        } catch (error: any) {
          if (error?.response?.status === 401) {
            navigate("/");
          }
          nextRetryKeys.add(rowKey);
          updates[rowKey] = {
            status: "error",
            external_reference_id: null,
            comments: [],
            total_comments: 0,
            message: error.message || "Failed to load comments",
            process_datetime: new Date()
              .toISOString()
              .slice(0, 19)
              .replace("T", " "),
          };
        } finally {
          fetchingRef.current.delete(rowKey);
        }
      }

      if (Object.keys(updates)?.length > 0) {
        setServiceSheetMap((prev) => ({
          ...prev,
          ...updates,
        }));
      }

      if (nextRetryKeys.size > 0 && retryCount < 2) {
        setTimeout(() => {
          fetchServiceSheets(nextRetryKeys, retryCount + 1);
        }, 5000);
      }
    };

    if (
      currentRCTData?.length > 0 &&
      Object.keys(quickSESResults)?.length > 0
    ) {
      fetchServiceSheets();
    }
  }, [currentRCTData, quickSESResults, getServiceSheetNum]);

  const handlePoChangeClick = async (
    purchaseOrderId: string,
    lineItem: string,
    service_sheet_number_generated?: string
  ) => {
    try {

      if (showNewTable) {
        const results = await transferData(String(service_sheet_number_generated), purchaseOrderId, lineItem);
        if (results === false) {
          setIsMenuOpen(false);
          return;
        }
      }
      const response = await getPoDetails(purchaseOrderId, lineItem);
      setFormData(response[0]);
      setChangedFields({});
      setIsMenuOpen(true);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        navigate("/");
      }
    } finally { }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : prev));
    setChangedFields((prev) => ({ ...prev, [name]: value }));
  };
  const handleSave = async (po_number: string, line_item: string | number) => {
    if (!formData) return;

    const payload: Partial<FetchPoDetails> = {
      purchase_order_id: formData.purchase_order_id,
      line_item: String(formData.line_item),
      ...changedFields
    };
    const rowKey = `${po_number}-${line_item}`;
    setIsMenuOpen(false);
    setPoChangeProcessingRows(prev => new Set(prev).add(rowKey));


    try {
      await poChangeSavings(payload);
      await poChange(po_number, String(line_item));
      toast.success("PO changed successfully!");
      setReprocessableRows((prev) => new Set(prev).add(rowKey));
      setEnableSave(true);
      if (showNewTable) {
        await checkAndNavigate(po_number, String(line_item));
      } else {
        await handleRefreshTable();
      }

    } catch (error: any) {
      if (error?.response?.status === 401) {
        navigate("/");
      }
      toast.error(error.message || "Something went wrong!");
    } finally {
      setIsSubmitting(false);
      setPoChangeProcessingRows(prev => {
        const next = new Set(prev);
        next.delete(rowKey);
        return next;
      });
    }
  };

  // updated table data
  const handleRefreshTable = async (pageOverride?: number) => {
    setIsRefreshing(true);
    try {
      const selectedPOs = poFilter ? [poFilter] : undefined;
      let process_status;
      if (
        statusFilter &&
        statusFilter !== "Reprocess" &&
        statusFilter !== "All Status"
      ) {
        process_status = statusFilter;
      }

      const pageToUse = typeof pageOverride === 'number' ? pageOverride : currentPage;

      const result = await updatedPoTable({
        purchase_order_ids: selectedPOs,
        service_start_from: selectedStartDate ? selectedStartDate.toISOString().split("T")[0] : undefined,
        service_start_to: selectedEndDate ? selectedEndDate.toISOString().split("T")[0] : undefined,
        process_status: process_status || undefined,
        page: pageToUse,
        page_size: pageSize,
      });

      setRefreshTableData(result.data);
      setRefreshSummary(result.summary);
      setTotalPages(result.summary?.total_pages || 0);
      setCurrentPage(result.summary?.current_page || 1);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        navigate("/");
      }
      toast.error("Failed to refresh: " + (error.message || "Unknown error"));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMissingData = async (pageOverride?: number) => {
    setIsRefreshing(true);
    try {
      const selectedPOs = poFilter ? [poFilter] : undefined;
      let process_status;
      if (
        statusFilter &&
        statusFilter !== "Reprocess" &&
        statusFilter !== "All Status"
      ) {
        process_status = statusFilter;
      }

      const pageToUse = typeof pageOverride === 'number' ? pageOverride : missingCurrentPage;

      const result = await missingData({
        purchase_order_ids: selectedPOs,
        service_start_from: selectedStartDate ? selectedStartDate.toISOString().split("T")[0] : undefined,
        service_start_to: selectedEndDate ? selectedEndDate.toISOString().split("T")[0] : undefined,
        process_status: process_status || undefined,
        page_index: pageToUse,
        page_size: pageSize,
      });

      setMissingTableData(result.data);
      const totalPages = Math.ceil((result.summary?.total_records || 0) / pageSize);
      setMissingTotalPages(totalPages);
      if (result.data.length === 0) {
        toast.warn("No data found for the selected criteria.");
        setMissingTableData([]);
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        navigate("/");
      }
      if (error?.response?.status === 404) {
        toast.warn("No data found for the selected criteria.");
        setMissingTableData([]);
      }
      toast.error("Failed to refresh: " + (error.message || "Unknown error"));
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isInitialLoadRef.current && refreshTableData === null) {
    return (
      <div className="ssc-interface-container">
        <div className="ssc-interface-empty-state">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const displayedData = useMemo(() => {
    if (!refreshTableData) return [];

    let data = refreshTableData;

    if (statusFilter === "Reprocess") {
      return data.filter(
        (item: any) =>
          String(item.flag) === "2" &&
          !item.external_reference_id &&
          item.service_sheet_number &&
          item.comments,
      );
    }

    if (statusFilter && statusFilter !== "All Status") {
      return data.filter(
        (item: any) =>
          String(item.process_status || "").toLowerCase() ===
          statusFilter.toLowerCase(),
      );
    }

    if (lineItemFilter) {
      data = data.filter((item: any) => String(item.line_item) === String(lineItemFilter));
    }

    return data;
  }, [refreshTableData, statusFilter, lineItemFilter]);

  const displayedMissingData = useMemo(() => {
    if (!missingTableData) return [];

    let data = missingTableData;

    if (statusFilter === "Reprocess") {
      return data.filter(
        (item: any) =>
          String(item.flag) === "2" &&
          !item.external_reference_id &&
          item.service_sheet_number &&
          item.comments,
      );
    }

    if (statusFilter && statusFilter !== "All Status") {
      return data.filter(
        (item: any) =>
          String(item.process_status || "").toLowerCase() ===
          statusFilter.toLowerCase(),
      );
    }

    return data;
  }, [missingTableData, statusFilter]);

  useEffect(() => {
    const shouldRefresh =
      !!poFilter ||
      !!statusFilter ||
      (selectedStartDate) ||
      (selectedEndDate) ||
      (!selectedStartDate && !selectedEndDate) ||
      (showNewTable ? missingCurrentPage : currentPage);
    if (shouldRefresh) {
      if (showNewTable) {
        handleMissingData();
      } else {
        handleRefreshTable();
      }
    }
  }, [poFilters, selectedStartDate, selectedEndDate, statusFilter, currentPage, missingCurrentPage, pageSize, showNewTable]);

  const filteredPoList = useMemo(() => {
    const currentTablePOs = showNewTable
      ? missingTableData.map((item) => item.purchase_order_id)
      : refreshTableData?.map((item) => item.purchase_order_id) || [];

    const combinedPOs = Array.from(new Set([...(poForTable || []), ...currentTablePOs]));

    if (!combinedPOs.length) return [];

    if (!poFilter.trim()) {
      return combinedPOs.slice(0, 5);
    }
    return combinedPOs
      .filter((po) => po.toLowerCase().includes(poFilter.toLowerCase()))
      .slice(0, 5);
  }, [poForTable, poFilter, showNewTable, missingTableData, refreshTableData]);

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setCurrentRowKey(null);
    setRejectComment("");
  };
  const toggleRowSelection = (rowKey: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  };
  const handleStatusClick = async (status: string) => {
    setStatusFilter(status);
    await handleRefreshTable();
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleCreateTicket = async () => {
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(document.body, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#fff",
      });
      sessionStorage.setItem("autoAttachScreenshot", dataUrl);

      toast.success("Screenshot captured!");

      navigate("/dashboard/ticket");
    } catch (error: any) {
      if (error?.response?.status === 401) {
        navigate("/");
      }
      toast.warn("Screenshot failed, but navigating...");
      navigate("/dashboard/ticket");
    }
  };


  const handleSyncAll = async () => {
    setIsSyncingAll(true);

    try {
      const pendingResponse = await getPendingServiceSheets();
      const sesNumbers = pendingResponse.pending_service_sheets || [];

      if (!sesNumbers || sesNumbers.length === 0) {
        toast.warn("No pending service sheets found to sync.");
        setIsSyncingAll(false);
        return;
      }

      const currentData = showNewTable ? displayedMissingData : displayedData;

      const rowKeys = currentData
        .filter((item) => !!item.service_sheet_number_generated && sesNumbers.includes(item.service_sheet_number_generated))
        .map((item) => `${item.purchase_order_id}-${item.line_item}`);

      setProcessingRows((prev) => {
        const next = new Set(prev);
        rowKeys.forEach((k) => next.add(k));
        return next;
      });

      if (showNewTable) {
        for (const item of currentData) {
          if (!item.service_sheet_number_generated || !sesNumbers.includes(item.service_sheet_number_generated)) continue;
          const poNumber = item.purchase_order_id;
          const lineItem = String(item.line_item);
          await transferData(item.service_sheet_number_generated, poNumber, lineItem);
        }
      }

      await getServiceSheetNum(sesNumbers);
      toast.success(`Synced ${sesNumbers.length} record(s) successfully!`);

      if (showNewTable) {
        await handleMissingData();
      } else {
        await handleRefreshTable();
      }

      setProcessingRows((prev) => {
        const next = new Set(prev);
        rowKeys.forEach((k) => next.delete(k));
        return next;
      });
    } catch (error: any) {
      if (error?.response?.status === 401) {
        navigate("/");
      }
      toast.error("Sync All failed.");
    } finally {
      setIsSyncingAll(false);
    }
  };

  const toBeReprocess = async (sesNumber: string, rowKey: string, flag?: string, prVersionReference?: string | null) => {
    setProcessingRows((prev) => new Set(prev).add(rowKey));
    try {
      if (flag === "4" || flag === "5") {
        // Hit openPr API with pr_version_reference
        await openPr(prVersionReference!);
        toast.success("PR opened successfully");
      } else {
        // Existing sync logic
        if (showNewTable) {
          const poNumber = rowKey.split("-")[0];
          const lineItem = rowKey.split("-")[1];
          const success = await transferData(sesNumber, poNumber, lineItem);
          if (!success) return;
        }
        await getServiceSheetNum([sesNumber]);
        toast.success("Sync success");
      }

      if (showNewTable) {
        await handleMissingData();
      } else {
        await handleRefreshTable();
      }
    } catch (error: any) {
      if (error?.response?.status === 401) navigate("/");
      toast.error(error?.description || "Operation failed");
    } finally {
      setProcessingRows((prev) => {
        const next = new Set(prev);
        next.delete(rowKey);
        return next;
      });
    }
  };
  return (
    <div className="ssc-interface-container">
      <div className="ssc-top-ribbon">
        <h1 className="ssc-ribbon-title">Quick SES</h1>
      </div>
      <div className="ssc-content-wrapper">
        <div className="ssc-interface-header">
          <div className="status-pills-container" style={{ marginBottom: 0 }}>
            <button
              className={`status-pill total ${!statusFilter ? "active" : ""}`}
              onClick={() => handleStatusClick("")}
            >
              All
            </button>
            <button
              className={`status-pill success ${statusFilter === "Success" ? "active" : ""}`}
              onClick={() => handleStatusClick("Success")}
            >
              Success <span className="count-number">({refreshSummary?.success_count ?? 0})</span>
            </button>
            <button
              className={`status-pill failed ${statusFilter === "Failed" ? "active" : ""}`}
              onClick={() => handleStatusClick("Failed")}
            >
              Failed <span className="count-number">({refreshSummary?.failed_count ?? 0})</span>
            </button>
            <button
              className={`status-pill pending ${statusFilter === "Pending" ? "active" : ""}`}
              onClick={() => handleStatusClick("Pending")}
            >
              Pending <span className="count-number">({refreshSummary?.pending_count ?? 0})</span>
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button className="ssc-btn-secondary ssc-header-btn" onClick={handleViewSchedule}>
              View Schedule
            </button>
            <button
              className={`run-quick-ses-btn ssc-header-btn ${(isScheduling || currentRCTData.length === 0 || !currentRCTData.some((_, index) => selectedRows.has(`row-${index}`))) ? "btn-disabled" : ""}`}
              disabled={isScheduling || currentRCTData.length === 0 || !currentRCTData.some((_, index) => selectedRows.has(`row-${index}`))}
              onClick={handleScheduledSubmit}
            >
              {isScheduling ? (<><span className="spinner" /> Scheduling...</>) : "Schedule"}
            </button>
          </div>
        </div>
        <div className="ssc-design-layout">
          <section className="ssc-design-section">
            <h2 className="ssc-section-title">Filters</h2>
            <div className="ssc-section-container">
              <div className="filter-row">
                <div className="ssc-interface-dropdown-wrapper-ses">
                  <div className="date-filter-container-ses">
                    <label className="date-filter-label">Supplier:</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        value={selectedVendor || vendorSearchTerm}
                        onChange={(e) => {
                          setVendorSearchTerm(e.target.value);
                          if (selectedVendor) setSelectedVendor("");
                          setIsVendorDropdownOpen(true);
                        }}
                        onFocus={() => setIsVendorDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setIsVendorDropdownOpen(false), 200)}
                        placeholder="Select Supplier"
                        className="date-filter-input"
                      />
                      {selectedVendor && (
                        <button
                          onClick={() => { setSelectedVendor(""); setVendorSearchTerm(""); }}
                          style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#6b7280" }}
                        >×</button>
                      )}
                      {isVendorDropdownOpen && (
                        <div className="dropdown-options" style={{ top: "105%", left: 0, width: "100%", zIndex: 1000 }}>
                          <div className="dropdown-list">
                            {isLoadingVendors ? (
                              <div className="loading-option">Loading...</div>
                            ) : vendorList.length > 0 ? (
                              vendorList.map((vendor, index) => (
                                <div key={index} className="dropdown-option"
                                  onMouseDown={(e) => { e.preventDefault(); setSelectedVendor(vendor); setVendorSearchTerm(""); setIsVendorDropdownOpen(false); }}
                                  style={{ cursor: "pointer", padding: "8px 12px" }}
                                >{vendor}</div>
                              ))
                            ) : (
                              <div className="no-options">No suppliers found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="ssc-interface-dropdown-wrapper-ses">
                  <div className="date-filter-container-ses">
                    <label className="date-filter-label">Start Date:</label>
                    <input type="date" value={poDate.from} onChange={(e) => setPoDate({ ...poDate, from: e.target.value })} className="date-filter-input" />
                  </div>
                </div>
                <div className="ssc-interface-dropdown-wrapper-ses">
                  <div className="date-filter-container-ses">
                    <label className="date-filter-label">End Date:</label>
                    <input type="date" value={poDate.to} onChange={(e) => setPoDate({ ...poDate, to: e.target.value })} className="date-filter-input" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="ssc-design-section">
            <h2 className="ssc-section-title">Selection</h2>
            <div className="ssc-section-container">
              <div className="filter-row">
                <div className="ssc-interface-dropdown-wrapper-ses" style={{ flex: 2 }}>
                  <div className="date-filter-container-ses">
                    <label className="date-filter-label">Search / Select PO Number(s):</label>
                    <div className="multi-select-container">
                      <div className="search-input-container">
                        <input type="text" value={searchTerm} onChange={handleSearchChange} onFocus={() => setIsDropdownOpen(true)} placeholder="Search PO Numbers..." className="ssc-interface-search-input" />
                        <button className="dropdown-toggle-btn" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>▼</button>
                      </div>
                      {selectedPO.map((po) => (
                        <div className="selected-po-tags po-tag">
                          {po}
                          <button onClick={() => handleSelectedPr(po)} className="ssc-tag-remove">×</button>
                        </div>
                      ))}
                      {isDropdownOpen && (
                        <div className="dropdown-options">
                          <div className="dropdown-list" onScroll={handleDropdownScroll}>
                            {isLoadingPOs && allPONumbers?.length === 0 ? (
                              <div className="loading-option">Loading PO numbers...</div>
                            ) : allPONumbers?.length > 0 ? (
                              <>
                                {allPONumbers.map((po) => (
                                  <label key={po} className="dropdown-option">
                                    <input type="checkbox" checked={selectedPO.includes(po)} onChange={() => handleSelectedPr(po)} />
                                    <span className="checkbox-custom" />
                                    {po}
                                  </label>
                                ))}
                                {isLoadingPOs && !searchTerm && <div className="loading-option">Loading more...</div>}
                              </>
                            ) : (
                              <div className="no-options">
                                {searchTerm ? `No PO numbers found matching "${searchTerm}"` : selectedVendor || poDate.from || poDate.to ? "No PO numbers found for selected supplier or date" : "No PO numbers available"}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ssc-interface-dropdown-wrapper-ses" style={{ flex: 1.5 }}>
                  <div className="date-filter-container-ses">
                    <label className="date-filter-label">Select Line Item(s):</label>
                    <div className="receipt-dropdown-container">
                      <div className="receipt-dropdown-header">
                        <button className="receipt-dropdown-btn" onClick={() => setIsReceiptDropdownOpen(!isReceiptDropdownOpen)} disabled={!selectedPO}>
                          {selectedReceiptIds?.length > 0 ? `${selectedReceiptIds?.length} Line Item(s) Selected` : "Select Line Items"}
                        </button>
                        <span className="dropdown-toggle-btn" style={{ pointerEvents: "none" }}>▼</span>
                      </div>
                      {selectedReceiptIds?.length > 0 && (
                        <div className="selected-po-tags">
                          {selectedReceiptIds.map((receiptId) => (
                            <span key={receiptId} className="po-tag">
                              {receiptId}{" "}
                              <button onClick={() => handleReceiptToggle(receiptId)} className="ssc-tag-remove">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                      {isReceiptDropdownOpen && (
                        <div className="dropdown-options">
                          <div className="dropdown-list">
                            {isLoadingReceipts ? (
                              <div className="loading-option">Loading receipts...</div>
                            ) : receiptIds?.length > 0 ? (
                              receiptIds.map((receiptId) => (
                                <label key={receiptId} className="dropdown-option">
                                  <input type="checkbox" checked={selectedReceiptIds.includes(receiptId)} onChange={() => handleReceiptToggle(receiptId)} />
                                  <span className="checkbox-custom" />
                                  {receiptId}
                                </label>
                              ))
                            ) : (
                              <div className="no-options">
                                {selectedPO?.length === 0 ? "Select PO numbers first" : "No line item found for selected POs"}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Top Table */}
        <div>
          {isLoadingRCTData ? (
            <div className="ssc-interface-loading"><p>Loading purchase order details...</p></div>
          ) : currentRCTData?.length > 0 ? (
            <>
              <h3 className="ssc-interface-items-title-h3">SES Scheduling</h3>
              <div className="ssc-interface-items-container">
                <div className="ssc-interface-items-header">
                  <div className="scheduling-header-grid">
                    <div>
                      <input type="checkbox"
                        checked={currentRCTData.length > 0 && currentRCTData.every((_, index) => selectedRows.has(`row-${index}`))}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        style={{ cursor: "pointer" }}
                      />
                    </div>
                    <div className="scheduling-header-label">PO Number</div>
                    <div className="scheduling-header-label">Line Item</div>
                    <div className="scheduling-header-label">Line Item Description</div>
                    <div className="scheduling-header-label">Start date</div>
                    <div className="scheduling-header-label">End date</div>
                    <div className="scheduling-header-label">Max Amount (AED)</div>
                  </div>
                </div>

                {currentRCTData.map(({ item, purchaseOrderId }, index) => {
                  return (
                    <div key={`${purchaseOrderId}-${item.receiptId}-${index}`} className="ssc-interface-item-row">
                      <div className="scheduling-grid">
                        <div>
                          <input type="checkbox" checked={selectedRows.has(`row-${index}`)} onChange={() => handleRowCheckboxToggle(`row-${index}`)} style={{ cursor: "pointer" }} />
                        </div>
                        <div style={{ fontWeight: 600 }}>{purchaseOrderId}</div>
                        <div>{item.lineItem}</div>
                        <div style={{ textAlign: "left" }}>{item.Service_Description}</div>
                        <div>{item.start_date}</div>
                        <div>{item.end_date}</div>
                        <div style={{ fontWeight: 600, color: "var(--a-blue)" }}>
                          {Number(item.service_max_amount ?? 0).toFixed(2) || "0.00"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Tooltip id="correction-tooltip" place="top" variant="light" offset={5} className="tooltip-text" delayShow={100} delayHide={400} clickable />
            </>
          ) : (
            <div className="ssc-interface-empty-state">
              <p>
                {selectedPO?.length === 0 ? "Please select PO Numbers to view details" : selectedReceiptIds?.length === 0 ? "Please select receipt IDs to view details" : "No data available for selected PO numbers and receipt IDs"}
              </p>
            </div>
          )}
        </div>       

        {/* RefreshTable */}
        <div ref={tableRef} className="ssc-interface-table-container ssc-margin">
          <>
            <div className="previous-logs-header">
              <h3 className="previous-logs-title">{showNewTable ? "New Table" : "History"}</h3>
              <div className="previous-logs-actions">
                <button
                  className="btn-base btn-refresh"
                  disabled={isRefreshing}
                  onClick={async () => {
                    setIsRefreshing(true);
                    try {
                      if (showNewTable) {
                        await handleMissingData(1);
                      } else {
                        await handleRefreshTable(1);
                        setLineItemFilter(null);
                      }
                    } finally {
                      setIsRefreshing(false);
                    }
                  }}
                  title="Refresh current table"
                >
                  <svg
                    className={isRefreshing ? "spin-icon" : ""}
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.25l1.09 1.18" />
                  </svg>
                </button>
                <button
                  className={`btn-base btn-blue`}
                  onClick={async () => {
                    const nextShowNewTable = !showNewTable;
                    setIsSwitching(true);
                    setShowNewTable(nextShowNewTable);
                    if (!nextShowNewTable) { setCurrentPage(1); } else { setMissingCurrentPage(1); }
                    setTimeout(() => {
                      if (nextShowNewTable) { handleMissingData(1); } else { handleRefreshTable(1); setLineItemFilter(null); }
                      setIsSwitching(false);
                    }, 50);
                  }}
                >
                  {showNewTable ? "Back to History" : "View More PO's"}
                </button>
                <button className="btn-base btn-blue" disabled={isSyncingAll} onClick={handleSyncAll} title="Sync all visible records that have a generated service sheet">
                  {isSyncingAll ? "Syncing..." : "Sync All"}
                </button>
              </div>
            </div>

            <div className="ssc-interface-items-container prv-logs-height">
              <div className="ssc-interface-items-header">
                <div className="rct-items-header-grid-quick-ses">
                  <div>
                    {statusFilter == "Reprocess" && (
                      <input type="checkbox"
                        checked={refreshTableData.length > 0 && selectedRows.size === refreshTableData.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const allKeys = refreshTableData.map((item) => `${item.purchase_order_id}-${item.line_item}`);
                            setSelectedRows(new Set(allKeys));
                          } else { setSelectedRows(new Set()); }
                        }}
                        style={{ height: "1rem", cursor: "pointer", accentColor: "#7c3aed", margin: 0 }}
                      />
                    )}
                  </div>
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <label className="date-label-trigger" onClick={() => setShowPoInput(true)} style={{ cursor: "pointer" }}>PO Number</label>
                    {poFilter && !showPoInput && (
                      <div className="selected-date" onClick={() => setShowPoInput(true)} style={{ cursor: "pointer" }}>
                        {poFilter}
                        <button onClick={(e) => { e.stopPropagation(); setPoFilter(""); setLineItemFilter(null); }}
                          style={{ marginLeft: 8, background: "none", border: "none", fontSize: "1.2em", cursor: "pointer", color: "#7c3aed", padding: 0 }}>×</button>
                      </div>
                    )}
                    {showPoInput && (
                      <div className="po-search-dropdown-container">
                        <input type="text" value={poFilter}
                          onChange={(e) => { setPoFilter(e.target.value); setLineItemFilter(null); }}
                          placeholder="Search PO..." autoFocus className="po-search-input-field"
                          onKeyDown={(e) => { if (e.key === "Escape" || e.key === "Enter") setShowPoInput(false); }}
                        />
                        <div className="po-search-results-list">
                          <div className="po-search-scroll-area">
                            {filteredPoList.map((po) => (
                              <div key={po} onClick={() => { setPoFilter(po); setLineItemFilter(null); setShowPoInput(false); }}
                                className={`po-search-item ${po === poFilter ? "selected" : ""}`}
                              >{po}</div>
                            ))}
                            {filteredPoList.length === 0 && <div className="po-search-no-results">No PO found</div>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>Line Item</div>
                  <div>Line Item Description</div>
                  <div style={{ position: "relative", display: "inline-block", cursor: "pointer" }} ref={startDateHeaderRef} onClick={handleStartDateHeaderClick}>
                    <label className="date-label-trigger">
                      Service Start Date {selectedStartDate && <span className="ses-active-filter-indicator">({selectedStartDate.toLocaleDateString()})</span>}
                    </label>
                  </div>
                  <div style={{ position: "relative", display: "inline-block", cursor: "pointer" }} ref={endDateHeaderRef} onClick={handleEndDateHeaderClick}>
                    <label className="date-label-trigger">
                      Service End Date {selectedEndDate && <span className="ses-active-filter-indicator">({selectedEndDate.toLocaleDateString()})</span>}
                    </label>
                  </div>
                  <div>Max Amount</div>
                  <div>SES ID</div>
                  <div>Result SES ID</div>
                  <div>Ext. Reference No.</div>
                  <div>Correction Sheet comment</div>
                  <div>UPDATED TIME</div>
                  <div style={{ position: "relative" }}>
                    <label className="date-label-trigger" onClick={() => setShowStatusList(!showStatusList)}>Status</label>
                    {statusFilter && (
                      <div className="selected-date">
                        {statusFilter}
                        <button onClick={(e) => { e.stopPropagation(); setStatusFilter(""); }}
                          style={{ marginLeft: "0.5rem", background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#999" }}>×</button>
                      </div>
                    )}
                    {showStatusList && (
                      <div className="custom-status-dropdown">
                        {["All Status", "Success", "Failed", "Reprocess"].map((status) => (
                          <div key={status}
                            className={`status-option ${statusFilter === (status === "All Status" ? "" : status) ? "selected" : ""}`}
                            onClick={(e) => { e.stopPropagation(); setStatusFilter(status === "All Status" ? "" : status); setShowStatusList(false); }}
                          >{status}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  {showStatusList && <div className="dropdown-backdrop" onClick={() => setShowStatusList(false)} />}
                 <div>ACTION</div>
                </div>
              </div>

              {((refreshTableData.length > 0 && !showNewTable) || (showNewTable && missingTableData.length > 0)) ? (
                <div style={{ position: "relative" }}>
                  {(isRefreshing || isSwitching) && (
                    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 999, background: "white", padding: "10px 20px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", color: "#7c3aed", fontWeight: "bold" }}>
                      Refreshing data...
                    </div>
                  )}
                  <div style={{ opacity: isRefreshing || isSwitching ? 0.5 : 1, transition: "opacity 0.2s", pointerEvents: isRefreshing || isSwitching ? "none" : "auto" }}>
                    {showNewTable ? (
                      <>
                        {displayedMissingData.map((item, idx) => {
                          const rowKey = `${item.purchase_order_id}-${item.line_item}`;
                          const commentsArray = Array.isArray(item.comments) ? item.comments : item.comments ? [item.comments] : [];
                          const displayComments = commentsArray.filter((c) => c && c.trim() !== "No comments extracted").join(" • ") || "No comments";
                          const prNumberMatch = displayComments.match(/Submitted PR:\s*([^\s]+)/);
                          const prNumber = prNumberMatch ? prNumberMatch[1] : "";
                          const hasComment = displayComments == "No comments";
                          const approvalPending = displayComments === "approvers still present";
                          const diableRejectBtn = displayComments.includes("The following errors have been received from the external system");
                          const isSelected = selectedRows.has(rowKey);
                          const reprocessActive = item.flag == "2";
                          const rejectSes = item.flag == "1";
                          const poChangeFailed = item.flag == "3";
                          const poChangeSuccess = item.flag == "4";
                          const openPrFlag = item.flag == "4" || item.flag == "5";
                          const reprocessFlag = item.flag == "6";
                          const rejectStatus = item.reject_status?.trim()?.toLowerCase() === "rejected";
                          const hasSesGenerated = !!(item.service_sheet_number_generated?.trim());
                          const isReprocessAlreadyShown =
                            reprocessFlag ||
                            (!openPrFlag && !reprocessFlag && reprocessableRows.has(rowKey) && enableSave && rejectSes && !item.service_sheet_number_generated) ||
                            (!openPrFlag && !reprocessFlag && !!item.service_sheet_number && reprocessActive && !item.external_reference_id && !item.service_sheet_number_generated);

                          return (
                            <div key={idx} className="ssc-interface-item-row">
                              <div className="rct-item-grid-quick-ses">
                                <div>
                                  <input type="checkbox" checked={isSelected} onChange={() => toggleRowSelection(rowKey)} style={{ cursor: "pointer" }} />
                                </div>
                                <div>{item.purchase_order_id}</div>
                                <div>{item.line_item}</div>
                                <div>{item.Service_Description}</div>
                                <div>{item.service_start_date}</div>
                                <div>{item.service_end_date}</div>
                                <div>{Number(item.service_max_amount ?? 0).toFixed(2)}</div>
                                <div>{item.service_sheet_number}</div>
                                <div>
                                  <span className={`result-badge result-cell`} data-fulltext={item.service_sheet_number_generated} title={item.service_sheet_number_generated}>
                                    {item.service_sheet_number_generated}
                                  </span>
                                </div>
                                <div>{item.external_reference_id}</div>
                                <div>
                                  <span data-tooltip-id="correction-tooltip" data-tooltip-content={displayComments} className="truncate-text"
                                    onClick={() => { setModalComment({ displayComments: displayComments || "No comments available", purchase_order_id: item.purchase_order_id, line_item: String(item.line_item) }); setShowCommentModal(true); }}>
                                    {displayComments}
                                  </span>
                                </div>
                                <div>{item.process_datetime}</div>
                                <div>{item?.external_reference_id ? 'SUCCESS' : ''}</div>

                                {/* Actions */}
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
                                  {openPrFlag && (
                                    <button className="sync-btn" disabled={processingRows.has(rowKey)}
                                      onClick={() => toBeReprocess(item.service_sheet_number_generated, rowKey, item.flag, item.pr_version_reference)}>
                                      {processingRows.has(rowKey) ? "Syncing..." : "Sync"}
                                    </button>
                                  )}
                                  {reprocessFlag && (
                                    <button className={`reprocess-btn ${processingRows.has(rowKey) ? "disable" : ""}`}
                                      disabled={processingRows.has(rowKey)} onClick={() => handleRunQuickSES(item)}>
                                      Reprocess
                                    </button>
                                  )}
                                  {!openPrFlag && !reprocessFlag && (
                                    <>
                                      {!item.external_reference_id && !item.service_sheet_number && reprocessActive && !hasComment && !approvalPending && (
                                        <button className="sync-btn" disabled={processingRows.has(rowKey)}
                                          onClick={() => toBeReprocess(item.service_sheet_number_generated, rowKey, item.flag, item.pr_version_reference)}>
                                          Sync
                                        </button>
                                      )}
                                      {(approvalPending || !hasComment) && item.service_sheet_number_generated && (
                                        <button className="sync-btn" disabled={processingRows.has(rowKey)}
                                          onClick={() => toBeReprocess(item.service_sheet_number_generated, rowKey, item.flag, item.pr_version_reference)}>
                                          Sync
                                        </button>
                                      )}
                                      {!item.external_reference_id && item.service_sheet_number && rejectSes && hasComment && !approvalPending && (
                                        <button className="sync-btn" disabled={processingRows.has(rowKey)}
                                          onClick={() => toBeReprocess(item.service_sheet_number_generated, rowKey, item.flag, item.pr_version_reference)}>
                                          Sync
                                        </button>
                                      )}
                                      {reprocessableRows.has(rowKey) && enableSave && rejectSes && !item.service_sheet_number_generated && (
                                        <button className={`reprocess-btn ${processingRows.has(rowKey) ? "disable" : ""}`}
                                          onClick={() => handleRunQuickSES(item)} disabled={processingRows.has(rowKey)}>
                                          Reprocess
                                        </button>
                                      )}
                                      {item.service_sheet_number && reprocessActive && !item.external_reference_id && !item.service_sheet_number_generated && (
                                        <button className={`reprocess-btn ${processingRows.has(rowKey) ? "disable" : ""}`}
                                          onClick={() => handleRunQuickSES(item)} disabled={processingRows.has(rowKey)}>
                                          Reprocess
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>

                                <div>
                                  <button className={`delete-bton ${rejectingRow === rowKey || rejectStatus ? "disable" : ""}`}
                                    disabled={rejectingRow === rowKey || diableRejectBtn || rejectStatus || !hasSesGenerated || openPrFlag || reprocessFlag}
                                    onClick={() => { setShowRejectModal(true); setCurrentRowKey(rowKey); setSesIdRt(item.service_sheet_number_generated); }}>
                                    {isRejecting && rejectingRow === rowKey ? "Rejecting" : (rejectStatus ? "Rejected" : "Reject")}
                                  </button>
                                </div>
                                <div>
                                  {(reprocessableRows.has(rowKey) || poChangeSuccess) && !poChangeFailed && !rejectStatus && !openPrFlag && !isReprocessAlreadyShown ? (
                                    <button className={`reprocess-btn ${processingRows.has(rowKey) ? "disable" : ""}`}
                                      onClick={() => handleRunQuickSesNew(item)} disabled={processingRows.has(rowKey)}>
                                      Reprocess
                                    </button>
                                  ) : (
                                    <button className={`PoChange-btn ${poChangeProcessingRows.has(rowKey) ? "disable" : ""}`}
                                      disabled={poChangeProcessingRows.has(rowKey) || (!rejectStatus && (openPrFlag || !!item.service_sheet_number_generated))}
                                      onClick={() => handlePoChangeClick(String(item.purchase_order_id), String(item.line_item), item.service_sheet_number_generated)}>
                                      PO Change
                                    </button>
                                  )}
                                </div>
                                <div>
                                  {poChangeFailed && "PO Change Failed"}
                                  {poChangeSuccess && `PO Change Success Waiting For Approval ${prNumber ? `- ${prNumber}` : ""}`}
                                  {item.service_sheet_number && reprocessActive && ""}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <>
                        {isSwitching && <div className="ssc-interface-loading"><p>Loading purchase order details...</p></div>}
                        {displayedData.map((item, idx) => {
                          const rowKey = `${item.purchase_order_id}-${item.line_item}`;
                          const commentsArray = Array.isArray(item.comments) ? item.comments : item.comments ? [item.comments] : [];
                          const displayComments = commentsArray.filter((c) => c && c.trim() !== "No comments extracted").join(" • ") || "No comments";
                          const prNumberMatch = displayComments.match(/Submitted PR:\s*([^\s]+)/);
                          const prNumber = prNumberMatch ? prNumberMatch[1] : "";
                          const hasComment = displayComments == "No comments";
                          const approvalPending = displayComments === "approvers still present";
                          const diableRejectBtn = displayComments.includes("The following errors have been received from the external system");
                          const isSelected = selectedRows.has(rowKey);
                          const reprocessActive = item.flag == "2";
                          const rejectSes = item.flag == "1";
                          const poChangeFailed = item.flag == "3";
                          const poChangeSuccess = item.flag == "4";
                          const openPrFlag = item.flag == "4" || item.flag == "5";
                          const reprocessFlag = item.flag == "6";
                          const rejectStatus = item.reject_status?.trim()?.toLowerCase() === "rejected";
                          const hasSesGenerated = !!(item.service_sheet_number_generated?.trim());
                          const isReprocessAlreadyShown =
                            reprocessFlag ||
                            (!openPrFlag && !reprocessFlag && reprocessableRows.has(rowKey) && enableSave && rejectSes && !item.service_sheet_number_generated) ||
                            (!openPrFlag && !reprocessFlag && !!item.service_sheet_number && reprocessActive && !item.external_reference_id && !item.service_sheet_number_generated);

                          return (
                            <div key={idx} className="ssc-interface-item-row">
                              <div className="rct-item-grid-quick-ses">
                                <div>
                                  <input type="checkbox" checked={isSelected} onChange={() => toggleRowSelection(rowKey)} style={{ cursor: "pointer" }} />
                                </div>
                                <div>{item.purchase_order_id}</div>
                                <div>{item.line_item}</div>
                                <div>{item.Service_Description}</div>
                                <div>{item.service_start_date}</div>
                                <div>{item.service_end_date}</div>
                                <div>{Number(item.service_max_amount ?? 0).toFixed(2)}</div>
                                <div>{item.service_sheet_number}</div>
                                <div>
                                  <span className={`result-badge result-cell`} data-fulltext={item.service_sheet_number_generated} title={item.service_sheet_number_generated}>
                                    {item.service_sheet_number_generated}
                                  </span>
                                </div>
                                <div>{item.external_reference_id}</div>
                                <div>
                                  <span data-tooltip-id="correction-tooltip" data-tooltip-content={displayComments} className="truncate-text"
                                    onClick={() => { setModalComment({ displayComments: displayComments || "No comments available", purchase_order_id: item.purchase_order_id, line_item: String(item.line_item) }); setShowCommentModal(true); }}>
                                    {displayComments}
                                  </span>
                                </div>
                                <div>{item.process_datetime}</div>
                                <div>{item?.external_reference_id ? 'SUCCESS' : ''}</div>

                                {/* Actions */}
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
                                  {openPrFlag && (
                                    <button className="sync-btn" disabled={processingRows.has(rowKey)}
                                      onClick={() => toBeReprocess(item.service_sheet_number_generated, rowKey, item.flag, item.pr_version_reference)}>
                                      {processingRows.has(rowKey) ? "Syncing..." : "Sync"}
                                    </button>
                                  )}
                                  {reprocessFlag && (
                                    <button className={`reprocess-btn ${processingRows.has(rowKey) ? "disable" : ""}`}
                                      disabled={processingRows.has(rowKey)} onClick={() => handleRunQuickSesNew(item)}>
                                      Reprocess
                                    </button>
                                  )}
                                  {!openPrFlag && !reprocessFlag && (
                                    <>
                                      {!item.external_reference_id && !item.service_sheet_number && reprocessActive && !hasComment && !approvalPending && (
                                        <button className="sync-btn" disabled={processingRows.has(rowKey)}
                                          onClick={() => toBeReprocess(item.service_sheet_number_generated, rowKey, item.flag, item.pr_version_reference)}>
                                          Sync
                                        </button>
                                      )}
                                      {(approvalPending || !hasComment) && item.service_sheet_number_generated && (
                                        <button className="sync-btn" disabled={processingRows.has(rowKey)}
                                          onClick={() => toBeReprocess(item.service_sheet_number_generated, rowKey, item.flag, item.pr_version_reference)}>
                                          Sync
                                        </button>
                                      )}
                                      {!item.external_reference_id && item.service_sheet_number && rejectSes && hasComment && !approvalPending && (
                                        <button className="sync-btn" disabled={processingRows.has(rowKey)}
                                          onClick={() => toBeReprocess(item.service_sheet_number_generated, rowKey, item.flag, item.pr_version_reference)}>
                                          Sync
                                        </button>
                                      )}
                                      {reprocessableRows.has(rowKey) && enableSave && rejectSes && !item.service_sheet_number_generated && (
                                        <button className={`reprocess-btn ${processingRows.has(rowKey) ? "disable" : ""}`}
                                          onClick={() => handleRunQuickSesNew(item)} disabled={processingRows.has(rowKey)}>
                                          Reprocess
                                        </button>
                                      )}
                                      {item.service_sheet_number && reprocessActive && !item.external_reference_id && !item.service_sheet_number_generated && (
                                        <button className={`reprocess-btn ${processingRows.has(rowKey) ? "disable" : ""}`}
                                          onClick={() => handleRunQuickSesNew(item)} disabled={processingRows.has(rowKey)}>
                                          Reprocess
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>

                                <div>
                                  <button className={`delete-bton ${rejectingRow === rowKey || rejectStatus ? "disable" : ""}`}
                                    disabled={rejectingRow === rowKey || diableRejectBtn || rejectStatus || !hasSesGenerated || openPrFlag || reprocessFlag}
                                    onClick={() => { setShowRejectModal(true); setCurrentRowKey(rowKey); setSesIdRt(item.service_sheet_number_generated); }}>
                                    {isRejecting && rejectingRow === rowKey ? "Rejecting" : (rejectStatus ? "Rejected" : "Reject")}
                                  </button>
                                </div>
                                <div>
                                  {(reprocessableRows.has(rowKey) || poChangeSuccess) && !poChangeFailed && !rejectStatus && !openPrFlag && !isReprocessAlreadyShown ? (
                                    <button className={`reprocess-btn ${processingRows.has(rowKey) ? "disable" : ""}`}
                                      onClick={() => handleRunQuickSesNew(item)} disabled={processingRows.has(rowKey)}>
                                      Reprocess
                                    </button>
                                  ) : (
                                    <button className={`PoChange-btn ${poChangeProcessingRows.has(rowKey) ? "disable" : ""}`}
                                      disabled={poChangeProcessingRows.has(rowKey) || (!rejectStatus && (openPrFlag || !!item.service_sheet_number_generated))}
                                      onClick={() => handlePoChangeClick(String(item.purchase_order_id), String(item.line_item), item.service_sheet_number_generated)}>
                                      PO Change
                                    </button>
                                  )}
                                </div>
                                <div>
                                  {poChangeFailed && "PO Change Failed"}
                                  {poChangeSuccess && `PO Change Success Waiting For Approval ${prNumber ? `- ${prNumber}` : ""}`}
                                  {item.service_sheet_number && reprocessActive && ""}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="ssc-interface-empty-state">
                  <p>{selectedPO?.length === 0 ? "No Data Found" : ""}</p>
                </div>
              )}
            </div>

            <Tooltip id="correction-tooltip" place="top" variant="light" offset={5} className="tooltip-text" delayShow={100} delayHide={400} clickable />
          </>
        </div>

        {/* Pagination */}
        {((refreshTableData.length > 0 && !showNewTable) || (showNewTable && missingTableData.length > 0)) && (
          <div className="pagination-footer">
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              Page {showNewTable ? missingCurrentPage : currentPage} of {showNewTable ? missingTotalPages : totalPages}
            </span>
            <button
              onClick={() => showNewTable ? setMissingCurrentPage(prev => Math.max(prev - 1, 1)) : setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={showNewTable ? missingCurrentPage <= 1 : currentPage <= 1}
              className="btn-base"
              style={{ background: (showNewTable ? missingCurrentPage <= 1 : currentPage <= 1) ? '#f3f4f6' : 'white', cursor: (showNewTable ? missingCurrentPage <= 1 : currentPage <= 1) ? 'not-allowed' : 'pointer', color: '#0052cc', border: '1px solid #d1d5db' }}
            >Previous</button>
            <button
              onClick={() => showNewTable ? setMissingCurrentPage(prev => Math.min(prev + 1, missingTotalPages)) : setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={showNewTable ? missingCurrentPage >= missingTotalPages : currentPage >= totalPages}
              className="btn-base"
              style={{ background: (showNewTable ? missingCurrentPage >= missingTotalPages : currentPage >= totalPages) ? '#f3f4f6' : 'white', cursor: (showNewTable ? missingCurrentPage >= missingTotalPages : currentPage >= totalPages) ? 'not-allowed' : 'pointer', color: '#0052cc', border: '1px solid #d1d5db' }}
            >Next</button>
          </div>
        )}

        {/* Start Date Picker */}
        {showStartDatePicker && datePickerPos && (
          <div ref={startDatePickerRef} className="ses-date-picker-wrapper" style={{ left: `${datePickerPos.left}px`, top: `${datePickerPos.top}px` }} onClick={(e) => e.stopPropagation()}>
            <div className="ses-date-picker-style">
              <DatePicker selected={selectedStartDate} onChange={(date) => { setSelectedStartDate(date); setShowStartDatePicker(false); setPoDate({ ...poDate, from: date ? date.toISOString().split("T")[0] : "" }); }} inline dateFormat="yyyy-MM-dd" calendarClassName="custom-calendar" />
            </div>
            <button onClick={() => { setSelectedStartDate(null); setShowStartDatePicker(false); setPoDate({ ...poDate, from: "" }); }} className="ses-clear-filter-button">Clear Filter</button>

          </div>
        )}

        {/* End Date Picker */}
        {showEndDatePicker && datePickerPos && (
          <div ref={endDatePickerRef} className="ses-date-picker-wrapper" style={{ left: `${datePickerPos.left}px`, top: `${datePickerPos.top}px` }} onClick={(e) => e.stopPropagation()}>
            <div className="ses-date-picker-style">
              <DatePicker selected={selectedEndDate} onChange={(date) => { setSelectedEndDate(date); setShowEndDatePicker(false); setPoDate({ ...poDate, to: date ? date.toISOString().split("T")[0] : "" }); }} inline dateFormat="yyyy-MM-dd" calendarClassName="custom-calendar" />
            </div>
            <button onClick={() => { setSelectedEndDate(null); setShowEndDatePicker(false); setPoDate({ ...poDate, to: "" }); }} className="ses-clear-filter-button">Clear Filter</button>

          </div>
        )}

        {/* Backdrops */}
        {(isDropdownOpen || isReceiptDropdownOpen) && (
          <div className="dropdown-backdrop" onClick={() => { setIsDropdownOpen(false); setIsReceiptDropdownOpen(false); }} />
        )}

        {showPopup && (
          <div className="confirmation-modal-overlay">
            <div className="confirmation-modal">
              <div className="confirmation-modal-body"></div>
              <p className="modal-text">
                The following PO numbers are still under processing you can check that status in Previous Logs Table
                <h4>{pendingPOList.map((po, i) => <span key={i}>{po}</span>)}</h4>
              </p>
              <div className="confirmation-modal-actions">
                <button className="confirmation-confirm-btn reverse" onClick={() => { setShowPopup(false); localStorage.removeItem("pending_quick_ses"); }}>Close</button>
              </div>
            </div>
          </div>
        )}

        {showPoInput && <div className="dropdown-backdrop" onClick={() => setShowPoInput(false)} />}

        {/* Unsaved Changes Modal */}
        {showUnsavedChangesModal && (
          <div className="confirmation-modal-overlay">
            <div className="confirmation-modal">
              <div className="confirmation-modal-header"><h3>Unsaved Changes</h3></div>
              <div className="confirmation-modal-body">
                <p>You have unsaved changes on this page. Are you sure you want to leave? Your changes will be lost.</p>
              </div>
              <div className="confirmation-modal-actions">
                <button className="confirmation-cancel-btn" onClick={handleUnsavedChangesCancel}>Stay on Page</button>
                <button className="confirmation-confirm-btn reverse" onClick={handleUnsavedChangesConfirm}>Leave Page</button>
              </div>
            </div>
          </div>
        )}

        <ErrorModel visible={showSessionModal} title="Session Expired" message="Your session has expired. Please log in again."
          onConfirm={() => { setShowSessionModal(false); navigate("/"); }}
          onClose={() => { setShowSessionModal(false); navigate("/"); }}
        />

        {isMenuOpen && (
          <>
            <div className="po-menu-overlay" onClick={() => setIsMenuOpen(false)} />
            <div className="po-menu-box" onClick={(e) => e.stopPropagation()}>
              <h2 className="po-menu-title"></h2>
              <span className="close-btn-domain" onClick={() => setIsMenuOpen(false)}>&times;</span>
              <div className="po-menu-content">
                <section>
                  <h3>Accounting - by Line Item</h3>
                  <div className="form-row">
                    <label>Max Amount:</label>
                    <input name="service_max_amount" type="number" value={formData?.service_max_amount ?? ""} onChange={handleChange} />
                  </div>
                  <div className="form-row">
                    <label>Service Start Date:</label>
                    <input name="service_start_date" type="date" value={formData?.service_start_date ? formData.service_start_date.split("T")[0] : ""} onChange={handleChange} />
                  </div>
                  <div className="form-row">
                    <label>Service End Date:</label>
                    <input name="service_end_date" type="date" value={formData?.service_end_date ? formData.service_end_date.split("T")[0] : ""} onChange={handleChange} />
                  </div>
                  <h3>Shipping - by Line Item</h3>
                  <div className="form-row">
                    <label>Need-by Date:</label>
                    <input name="need_by_date" type="date" value={(formData?.need_by_date ? formData?.need_by_date.split("T")[0] : "") || formData?.service_start_date.split("T")[0]} onChange={handleChange} />
                  </div>
                  <div className="po-buttons">
                    <button className={`po-menu-submit`} disabled={isSubmitting}
                      onClick={() => { if (formData?.purchase_order_id && formData?.line_item) { handleSave(formData.purchase_order_id, formData.line_item); } else { toast.error("Purchase Order ID or Line Item is missing!"); } }}>
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </>
        )}

        {/* Reject Modal */}
        {showRejectModal && currentRowKey && (
          <div className="rej-ses-modal">
            <div className="res-ses-modal-body">
              <button onClick={() => { setShowRejectModal(false); setCurrentRowKey(null); setRejectComment(""); }}
                style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#999" }}>×</button>
              <h3>Reject Service Sheet</h3>
              <p>Row: <strong>{currentRowKey}</strong></p>
              <textarea value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} placeholder="Enter reject reason (required)" className="text-area-ses" autoFocus />
              <div className="rej-sse-btn">
                <button onClick={() => closeRejectModal()} className="cancel-ses-btn">Cancel</button>
                <button className="reject-btn" onClick={() => { handleRejectClick(currentRowKey); closeRejectModal(); }}>Reject</button>
              </div>
            </div>
          </div>
        )}
         {showScheduleTable && (
          <div className="ssc-modal-overlay">
            <div className="ssc-modal-container schedule-modal" style={{ maxWidth: "900px" }}>
              <div className="ssc-modal-header">
                <h3 className="ssc-modal-title">Scheduled Submissions</h3>
                <button className="ssc-modal-close" onClick={() => setShowScheduleTable(false)}>×</button>
              </div>
              <div className="ssc-modal-body">
                {isLoadingSchedule ? (
                  <div className="ssc-interface-loading"><p>Loading schedule...</p></div>
                ) : scheduleData?.length > 0 ? (
                  <div className="ssc-interface-items-container schedule-table-container">
                    <div className="ssc-interface-items-header">
                      <div className="schedule-header-grid">
                        <div className="scheduling-header-label">PO NUMBER</div>
                        <div className="scheduling-header-label">LINE ITEM</div>
                        <div className="scheduling-header-label">SUBMITTED DATE</div>
                      </div>
                    </div>
                    {scheduleData.map((item: any, index: number) => (
                      <div key={index} className="ssc-interface-item-row">
                        <div className="schedule-grid-row">
                          <div>{item.po_number}</div>
                          <div>{item.line_item}</div>
                          <div>{item.submitted_date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ssc-interface-empty-state"><p>No scheduled submissions found.</p></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Comment Modal */}
        {showCommentModal && (
          <div className="confirmation-modal-overlay">
            <div className="modal-box">
              <h3 className="modal-title">{modalComment.purchase_order_id}-{modalComment.line_item}</h3>
              <p className="modal-text">{modalComment.displayComments}</p>
              <div className="modal-actions">
                <button className="ticket-btn" onClick={handleCreateTicket}>Create Ticket</button>
                <button className="confirmation-cancel-btn" onClick={() => setShowCommentModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickSes;