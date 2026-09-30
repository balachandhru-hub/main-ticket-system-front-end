import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  FileText,
  Clock,
  CheckCircle,
  RotateCcw,
  XCircle,
  Download,
  Hourglass,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./InvoiceDashboard.css";
import {
  getCustomerGraph,
  getPdfBase64,
  executeInvoicePdf,
  getDistinctPoNumbers,
  getDistinctSuppliers,
  getDistinctCompanyCodes,
  addAribaComment,
  exportInvoicesExcel,
  reuploadSingleFile,
} from "../api/invoiceApi-table";
import AdminSettingsModal from "./AdminSettingsModal";
import BackButton from "./BackButton";
import { IoMdEye } from "react-icons/io";
import { toast } from "react-toastify";
import type { InvoiceItem, CustomerRecord, StatusCountsDto } from "../Dto/BuyerInvoiceDto";
import GraphsSection from "./GraphsSection";
import CommentEditModal from "./CommentEditModal";
import { MessageSquare } from "lucide-react";
import BuyerInvoiceCompareModal from "./BuyerInvoiceCompareModal";
import { aribaDataCompare } from "../api/callAxiosInvoiceExtract";
import type { AribaResponseDTO } from "../Dto/InvoiceExtractionDto";

interface LazyDropdownProps {
  label: string;
  allOptions: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  isLoading?: boolean;
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

const LazyLoadDropdown: React.FC<LazyDropdownProps> = ({
  label,
  allOptions,
  selectedValue,
  onSelect,
  isOpen,
  onToggle,
  dropdownRef,
  isLoading = false,
  onSearch,
}) => {
  const [displayCount, setDisplayCount] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const optionsListRef = useRef<HTMLUListElement>(null);

  const filteredOptions = allOptions.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedOptions = filteredOptions.slice(0, displayCount);
  const hasMore = displayCount < filteredOptions.length;

  useEffect(() => {
    if (isOpen) {
      setDisplayCount(10);
      setSearchTerm("");
    }
  }, [isOpen]);

  const handleScroll = useCallback(() => {
    if (optionsListRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = optionsListRef.current;
      if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !isLoading) {
        setDisplayCount((prev) => prev + 10);
      }
    }
  }, [hasMore, isLoading]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setDisplayCount(10);
    onSearch?.(value);
  };

  return (
    <div className="lazy-dropdown-wrapper" ref={dropdownRef}>
      <button
        className="lazy-dropdown-btn"
        onClick={onToggle}
        title={selectedValue}
        disabled={isLoading}
      >
        <span className="lazy-dropdown-label">{label}:</span>
        <span className="lazy-dropdown-value">
          {isLoading ? "Loading..." : selectedValue}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`dropdown-arrow ${isOpen ? "open" : ""}`}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div className="lazy-dropdown-menu">
          <input
            type="text"
            placeholder={`Search ${label.toLowerCase()}...`}
            className="lazy-dropdown-search"
            value={searchTerm}
            onChange={handleSearchChange}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
          <ul
            className="lazy-dropdown-options"
            ref={optionsListRef}
            onScroll={handleScroll}
          >
            {displayedOptions.length > 0 ? (
              displayedOptions.map((option) => (
                <li
                  key={option}
                  className={`lazy-dropdown-option ${
                    selectedValue === option ? "active" : ""
                  }`}
                  onClick={() => {
                    onSelect(option);
                    onToggle();
                    setSearchTerm("");
                  }}
                >
                  {option}
                </li>
              ))
            ) : (
              <li className="lazy-dropdown-option disabled">
                No options found
              </li>
            )}
            {hasMore && !isLoading && (
              <li className="lazy-dropdown-loading">
                Scroll for more...
              </li>
            )}
            {isLoading && (
              <li className="lazy-dropdown-loading">
                <span className="spinner"></span> Loading...
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};


const BuyerInvoiceDashboard: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [uploadingPdfId, setUploadingPdfId] = useState<string | null>(null);
  const [reuploadingPdfId, setReuploadingPdfId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusCounts, setStatusCounts] = useState<StatusCountsDto>({
    total_invoices: 0,
    processed: 0,
    failed: 0,
    "OCR-Success": 0,
    pending: 0,
    rpa_pending: 0,
  });

  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareData, setCompareData] = useState<AribaResponseDTO | null>(null);
  const [selectedPo, setSelectedPo] = useState<string>("");
  const [selectedPdfId, setSelectedPdfId] = useState<string | null>(null);
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState<string>("");
  const [isCompareLoading, setIsCompareLoading] = useState(false);

  // Source Filter State
  const [sourceFilter, setSourceFilter] = useState<string>("SharePoint");
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);

  // Supplier Filter State
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("All Suppliers");
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [isSupplierLoading, setIsSupplierLoading] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  // PO Number Filter State
  const [poNumbers, setPoNumbers] = useState<string[]>([]);
  const [selectedPoNumber, setSelectedPoNumber] = useState<string>("All PO Numbers");
  const [isPoDropdownOpen, setIsPoDropdownOpen] = useState(false);
  const [isPoLoading, setIsPoLoading] = useState(false);
  const poDropdownRef = useRef<HTMLDivElement>(null);

  // Company Code Filter State
  const [companyCodes, setCompanyCodes] = useState<string[]>([]);
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<string>("All Company Codes");
  const [isCompanyCodeDropdownOpen, setIsCompanyCodeDropdownOpen] = useState(false);
  const [isCompanyCodeLoading, setIsCompanyCodeLoading] = useState(false);
  const companyCodeDropdownRef = useRef<HTMLDivElement>(null);

  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [isSavingComment, setIsSavingComment] = useState(false);

  // Sort by Status
  const [sortByStatus, setSortByStatus] = useState<string>("All");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Invoice Date Range Filter State
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const itemsPerPage = 10;
  const navigate = useNavigate();

  const loadDistinctValues = useCallback(async (source: string = "SharePoint") => {
    try {
      setIsSupplierLoading(true);
      setIsPoLoading(true);
      setIsCompanyCodeLoading(true);

      const [supplierResponse, poResponse, codeResponse] = await Promise.all([
        getDistinctSuppliers(source),
        getDistinctPoNumbers(source),
        getDistinctCompanyCodes(source),
      ]);

      setSuppliers(supplierResponse.suppliers || []);
      setPoNumbers(poResponse.po_numbers || []);
      setCompanyCodes(codeResponse.company_codes || []);
    } catch (error) {
      toast.error("Failed to load filter options");
    } finally {
      setIsSupplierLoading(false);
      setIsPoLoading(false);
      setIsCompanyCodeLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(
    (
      page: number,
      source: string = sourceFilter,
      supplier: string = selectedSupplier,
      poNumber: string = selectedPoNumber,
      companyCode: string = selectedCompanyCode,
      searchTerm: string = search,
      sortStatus: string = sortByStatus,
      fromDate: string = dateFrom,
      toDate: string = dateTo
    ) => {
      setIsTableLoading(true);
      const apiField = source === "All Sources" ? undefined : source;
      const apiSupplier = supplier === "All Suppliers" ? undefined : supplier;
      const apiPoNumber = poNumber === "All PO Numbers" ? undefined : poNumber;
      const apiCompanyCode = companyCode === "All Company Codes" ? undefined : companyCode;
      let apiSortStatus: string | undefined;

      if (sortStatus === "Pending") {
        apiSortStatus = "OCR-Success";
      } else if (sortStatus === "Processed") {
        apiSortStatus = "Processed";
      } else if (sortStatus === "Failed") {
        apiSortStatus = "Failed";
      } else if (sortStatus === "Queued") {
        apiSortStatus = "Queued";
      }

      getCustomerGraph(
        page,
        itemsPerPage,
        apiField,
        apiSupplier,
        apiPoNumber,
        apiCompanyCode,
        apiSortStatus,
        fromDate || undefined,
        toDate || undefined
      )
        .then((data) => {
          const records = data.records ?? [];
          if (data.status_counts) {
            setStatusCounts(data.status_counts);
          }
          const mappedInvoices: InvoiceItem[] = records.map((record: CustomerRecord) => ({
            id: record.id.toString(),
            userId: record.user_id,
            buyerName: record.SupplierName,
            filename: record.filename,
            pdfId: record.pdf_id.toString(),
            status: (
              record.status?.trim().toLowerCase() === "processed"
                ? "processed"
                : record.status?.trim().toLowerCase() === "success"
                ? "pending"
                : (record.status?.trim().toLowerCase() || "failed")
            ) as InvoiceItem["status"],
            PONumber: record.PONumber || "N/A",
            customerInvoiceId: record.CUSTOMER_INVOICE_ID,
            createdAt: record.invoice_date,
            processedDate: record.processed_date,
            totalAmount: parseFloat(record.Total) || 0,
            receivedAmount: 0.0,
            comments: record.comments || "",
            aribaComments: record.Ariba_comments || null,
            companyCode: record.Company_Code || "N/A",
            invoiceId: record.InvoiceNumber || "N/A",
            erpPayableNumber: record.ERPPayableNumber || "N/A",
            folderName: (record as any).folder_name || "",
            brand: (record as any).brand || "",
          }));

          setInvoices(mappedInvoices);

          let filtered = mappedInvoices;
          if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter((inv) => {
              return (
                inv.buyerName?.toLowerCase().includes(searchLower) ||
                inv.filename?.toLowerCase().includes(searchLower) ||
                inv.PONumber?.toLowerCase().includes(searchLower) ||
                inv.companyCode?.toLowerCase().includes(searchLower)
              );
            });
          }

          setFilteredInvoices(filtered);
          setHasMore(records.length === itemsPerPage);
        })
        .catch((error) => {
          toast.error(error.message || "Failed to fetch invoices");
        })
        .finally(() => setIsTableLoading(false));
    },
    [
      sourceFilter,
      selectedSupplier,
      selectedPoNumber,
      selectedCompanyCode,
      search,
      sortByStatus,
      dateFrom,
      dateTo,
    ]
  );


  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    try {
      const apiField = sourceFilter === "All Sources" ? undefined : sourceFilter;
      const apiSupplier = selectedSupplier === "All Suppliers" ? undefined : selectedSupplier;
      const apiPoNumber = selectedPoNumber === "All PO Numbers" ? undefined : selectedPoNumber;
      const apiCompanyCode =
        selectedCompanyCode === "All Company Codes" ? undefined : selectedCompanyCode;
      let apiSortStatus: string | undefined;
      if (sortByStatus === "Pending") apiSortStatus = "OCR-Success";
      else if (sortByStatus === "Processed") apiSortStatus = "Processed";
      else if (sortByStatus === "Failed") apiSortStatus = "Failed";
      else if (sortByStatus === "Queued") apiSortStatus = "Queued";

      const { blob, filename } = await exportInvoicesExcel({
        Field: apiField,
        supplier: apiSupplier,
        po_number: apiPoNumber,
        company_code: apiCompanyCode,
        status: apiSortStatus,
        invoice_start_date: dateFrom || undefined,
        invoice_end_date: dateTo || undefined,
      });

      if (!blob || blob.size === 0) {
        toast.warning("No data to download. Please check your filters.");
        return;
      }

      const timestamp = new Date().toISOString().split("T")[0];
      const downloadName = filename || `invoices_${timestamp}.xlsx`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success(`Excel file "${downloadName}" downloaded successfully!`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to download Excel file");
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    loadDistinctValues(sourceFilter);
    fetchInvoices(1);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchInvoices(
      1,
      sourceFilter,
      selectedSupplier,
      selectedPoNumber,
      selectedCompanyCode,
      search,
      sortByStatus,
      dateFrom,
      dateTo
    );
  }, [
    sourceFilter,
    selectedSupplier,
    selectedPoNumber,
    selectedCompanyCode,
    activeFilter,
    search,
    sortByStatus,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    loadDistinctValues(sourceFilter);
    setSelectedSupplier("All Suppliers");
    setSelectedPoNumber("All PO Numbers");
    setSelectedCompanyCode("All Company Codes");
  }, [sourceFilter]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      if (
        sourceDropdownRef.current &&
        !sourceDropdownRef.current.contains(target)
      ) {
        setIsSourceDropdownOpen(false);
      }
      if (
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(target)
      ) {
        setIsSupplierDropdownOpen(false);
      }
      if (
        poDropdownRef.current &&
        !poDropdownRef.current.contains(target)
      ) {
        setIsPoDropdownOpen(false);
      }
      if (
        companyCodeDropdownRef.current &&
        !companyCodeDropdownRef.current.contains(target)
      ) {
        setIsCompanyCodeDropdownOpen(false);
      }
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(target)
      ) {
        setIsSortDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const callCompare = useCallback(
    async (poNumber: string, pdfId?: string, invoiceNumber?: string) => {
      if (!poNumber || !pdfId) {
        toast.error("PO Number and PDF ID are required.");
        return;
      }

      setSelectedPo(poNumber);
      setSelectedPdfId(pdfId);
      setSelectedInvoiceNumber(invoiceNumber || "");
      setIsCompareLoading(true);

      try {
        const result = await aribaDataCompare(poNumber, pdfId);

        if (!result || !("po_number_comparison" in result)) {
          setCompareData({
            po_number_comparison: undefined,
            total_comparison: undefined,
            Comparision_of_lineItems: [],
            ariba_reference_data: undefined,
            poNumber,
            message: "No data found",
          } as AribaResponseDTO);
        } else {
          setCompareData(result as AribaResponseDTO);
        }

        setCompareModalOpen(true);
      } catch (error) {
        setCompareData({
          po_number_comparison: undefined,
          total_comparison: undefined,
          Comparision_of_lineItems: [],
          poNumber,
          message: "No data found due to API error",
        } as AribaResponseDTO);
        setCompareModalOpen(true);
      } finally {
        setIsCompareLoading(false);
      }
    },
    []
  );


  const refreshCompareData = useCallback(
    async (poNumberToCompare: string, pdfIdToCompare: string) => {
      if (!poNumberToCompare || !pdfIdToCompare) {
        return;
      }

      try {
        const result = await aribaDataCompare(poNumberToCompare, pdfIdToCompare);

        if (result && "po_number_comparison" in result) {
          setCompareData(result as AribaResponseDTO);
          setSelectedPo(poNumberToCompare);
        } else {
          toast.warning("No comparison data found for the updated PO Number.");
        }
      } catch (error) {
        toast.error("Failed to refresh comparison data.");
      }
    },
    []
  );

  const handleReprocess = (pdfId: string, poNumber: string, invoiceNumber?: string) => {
    callCompare(poNumber, pdfId, invoiceNumber);
  };

  const handleReupload = async (inv: InvoiceItem) => {
    if (!inv.filename || !inv.folderName || !inv.brand) {
      toast.error(
        "Missing filename, folder, or brand for this invoice. Cannot re-upload."
      );
      return;
    }

    setReuploadingPdfId(inv.pdfId);
    try {
      await reuploadSingleFile(inv.filename, inv.folderName, inv.brand);
      toast.success(`"${inv.filename}" re-uploaded for processing successfully!`);
      fetchInvoices(currentPage);
    } catch (error: any) {
      toast.error(error?.message || "Failed to re-upload file.");
    } finally {
      setReuploadingPdfId(null);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      fetchInvoices(
        prev,
        sourceFilter,
        selectedSupplier,
        selectedPoNumber,
        selectedCompanyCode,
        search,
        sortByStatus,
        dateFrom,
        dateTo
      );
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setSourceFilter("SharePoint");
    setSelectedSupplier("All Suppliers");
    setSelectedPoNumber("All PO Numbers");
    setSelectedCompanyCode("All Company Codes");
    setActiveFilter("All");
    setSortByStatus("All");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const handleNext = () => {
    if (hasMore) {
      const next = currentPage + 1;
      setCurrentPage(next);
      fetchInvoices(
        next,
        sourceFilter,
        selectedSupplier,
        selectedPoNumber,
        selectedCompanyCode,
        search,
        sortByStatus,
        dateFrom,
        dateTo
      );
    }
  };

  const handleViewDetails = async (pdfId: string) => {
    setLoadingPdf(true);

    const newTab = window.open("", "_blank");

    if (!newTab) {
      toast.error("Please allow popups for this site.");
      setLoadingPdf(false);
      return;
    }

    try {
      const response = await getPdfBase64(pdfId);
      if ("statusCode" in response) {
        toast.error(response.message || "Failed to load PDF");
        newTab.close();
        return;
      }

      let base64 =
        response.file_base64 || response.base64 || response.pdf_base64;
      if (!base64) {
        toast.error("No PDF data found");
        newTab.close();
        return;
      }

      base64 = base64.includes("base64,") ? base64.split("base64,")[1] : base64;
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      newTab.location.href = url;
    } catch (error) {
      toast.error("Failed to load PDF");
      newTab.close();
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleFilter = (status: string) => {
    setCurrentPage(1);
    setActiveFilter(status);
  };

  const handleInvoiceManagement = () => navigate("/invoice-extractor");
  const handleTrustedSupplier = () => navigate("/trusted-supplier");
  const handleCloseModal = () => setIsModalOpen(false);

  const handleUploadToAriba = async (pdfId: string) => {
    setUploadingPdfId(pdfId);
    try {
      const response = await executeInvoicePdf(pdfId);

      if (response.status === "completed") {
        const result = response.results?.[0];
        if (result?.Customer_Invoice_ID) {
          toast.success(
            `Invoice processed successfully. Customer Invoice ID: ${result.Customer_Invoice_ID}`
          );
        } else {
          toast.warning(
            result?.Message || "Process completed but no invoice was generated."
          );
        }
      } else {
        toast.error("Invoice process did not complete successfully.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to upload to Ariba.");
    } finally {
      setUploadingPdfId(null);
    }
  };


  const handleOpenCommentModal = (invoice: InvoiceItem) => {
    setSelectedInvoice(invoice);
    setIsCommentModalOpen(true);
  };

  const handleCloseCommentModal = () => {
    setSelectedInvoice(null);
    setIsCommentModalOpen(false);
  };

  const handleSaveComment = async (comment: string) => {
    try {
      setIsSavingComment(true);

      await addAribaComment(selectedInvoice?.pdfId || "", comment);

      setInvoices((prev) =>
        prev.map((item) =>
          item.id === selectedInvoice?.id
            ? { ...item, comments: comment }
            : item
        )
      );

      setFilteredInvoices((prev) =>
        prev.map((item) =>
          item.id === selectedInvoice?.id
            ? { ...item, comments: comment }
            : item
        )
      );

      toast.success("Comment saved successfully");

      handleCloseCommentModal();
    } catch (error: any) {
      toast.error(error.message || "Failed to save comment");
    } finally {
      setIsSavingComment(false);
    }
  };

  const parseDate = (dateString?: string | null): Date | null => {
    if (!dateString) return null;

    const ddmmyyyy = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return isNaN(d.getTime()) ? null : d;
    }

    const normalized = dateString.includes(" ") && !dateString.includes("T")
      ? dateString.replace(" ", "T")
      : dateString;
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDate = (dateString?: string | null) => {
    const date = parseDate(dateString);
    if (!date) return "-";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString?: string | null) => {
    const date = parseDate(dateString);
    if (!date) return "-";
    const datePart = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timePart = date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${datePart}, ${timePart}`;
  };

  const totalInvoices = statusCounts.total_invoices || 0;
  const processedCount = statusCounts.processed || 0;
  const pendingCount = statusCounts["OCR-Success"] || 0;
  const failedCount = statusCounts.failed || 0;
  const queuedCount = statusCounts.Queued || 0;

  const cards = [
    {
      title: "Total Invoice",
      count: totalInvoices,
      icon: FileText,
      color: "blue",
    },
    {
      title: "Processed",
      count: processedCount,
      icon: CheckCircle,
      color: "green",
    },
    { title: "Pending", count: pendingCount, icon: Clock, color: "orange" },
    { title: "Queued", count: queuedCount, icon: Hourglass, color: "purple" },
    { title: "Failed", count: failedCount, icon: XCircle, color: "red" }
  ];

  const getIconColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: "text-blue-500 bg-blue-100",
      green: "text-green-500 bg-green-100",
      orange: "text-orange-500 bg-orange-100",
      purple: "text-purple-500 bg-purple-100",
      red: "text-red-500 bg-red-100",
      gray: "text-gray-500 bg-gray-100",
    };
    return colors[color] || colors.gray;
  };

  return (
    <div className="invoice-dashboard-content buyer-invoice-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <BackButton onClick={() => navigate('/dashboard')} />
        <div className="dashboard-header-buttons">
          <button
            className="header-btn invoice-mgmt-btn"
            onClick={handleInvoiceManagement}
          >
            Invoice Management System
          </button>
          <button
            className="header-btn admin-setting-btn"
            onClick={handleTrustedSupplier}
          >
            Trusted Supplier
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="dashboard-cards-container">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`dashboard-card ${
              activeFilter === card.title ? "active-card" : ""
            }`}
            onClick={() => handleFilter(card.title)}
          >
            <div className="dashboard-card-header">
              <h3 className="dashboard-card-title">{card.title}</h3>
              <div className={`dashboard-card-icon ${getIconColor(card.color)}`}>
                <card.icon size={20} />
              </div>
            </div>
            <div className="dashboard-card-content">
              <span className="dashboard-card-count">{card.count}</span>
            </div>
          </div>
        ))}
      </div>

      <GraphsSection invoices={invoices} statusCounts={statusCounts} />

      {/* Filter Section */}
      <div className="invoice-filter-section">
        <div className="filter-wrapper">
          <div className="filter-status-display">
            <span className="filter-label">Showing:</span>
            <span className="filter-status-value">{activeFilter}</span>
          </div>

          <div className="filter-search-wrapper">
            <input
              type="text"
              placeholder="Search by supplier, PO number, or company code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="filter-search-input"
            />
          </div>

          <div className="filter-dropdowns-container">
            <div className="source-filter-wrapper" ref={sourceDropdownRef}>
              <button
                className="filter-btn"
                onClick={() => setIsSourceDropdownOpen((prev) => !prev)}
              >
                <span className="filter-btn-label">Source:</span>
                <span className="filter-btn-value">{sourceFilter}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`filter-btn-arrow ${isSourceDropdownOpen ? "open" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {isSourceDropdownOpen && (
                <ul className="filter-dropdown-menu">
                  {["All Sources", "Manual", "Email", "SharePoint"].map(
                    (option) => (
                      <li
                        key={option}
                        className={`filter-dropdown-item ${
                          sourceFilter === option ? "active" : ""
                        }`}
                        onClick={() => {
                          setSourceFilter(option);
                          setIsSourceDropdownOpen(false);
                        }}
                      >
                        {option}
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>

            <LazyLoadDropdown
              label="Supplier"
              allOptions={["All Suppliers", ...suppliers]}
              selectedValue={selectedSupplier}
              onSelect={setSelectedSupplier}
              isOpen={isSupplierDropdownOpen}
              onToggle={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
              dropdownRef={supplierDropdownRef}
              isLoading={isSupplierLoading}
            />

            <LazyLoadDropdown
              label="PO Number"
              allOptions={["All PO Numbers", ...poNumbers]}
              selectedValue={selectedPoNumber}
              onSelect={setSelectedPoNumber}
              isOpen={isPoDropdownOpen}
              onToggle={() => setIsPoDropdownOpen(!isPoDropdownOpen)}
              dropdownRef={poDropdownRef}
              isLoading={isPoLoading}
            />

            <LazyLoadDropdown
              label="Company Code"
              allOptions={["All Company Codes", ...companyCodes]}
              selectedValue={selectedCompanyCode}
              onSelect={setSelectedCompanyCode}
              isOpen={isCompanyCodeDropdownOpen}
              onToggle={() =>
                setIsCompanyCodeDropdownOpen(!isCompanyCodeDropdownOpen)
              }
              dropdownRef={companyCodeDropdownRef}
              isLoading={isCompanyCodeLoading}
            />

            <div className="sort-filter-wrapper" ref={sortDropdownRef}>
              <button
                className="filter-btn"
                onClick={() => setIsSortDropdownOpen((prev) => !prev)}
              >
                <span className="filter-btn-label">Status:</span>
                <span className="filter-btn-value">{sortByStatus}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`filter-btn-arrow ${isSortDropdownOpen ? "open" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {isSortDropdownOpen && (
                <ul className="filter-dropdown-menu">
                  {["All", "Pending", "Failed", "Processed", "Queued"].map(
                    (option) => (
                      <li
                        key={option}
                        className={`filter-dropdown-item ${
                          sortByStatus === option ? "active" : ""
                        }`}
                        onClick={() => {
                          setSortByStatus(option);
                          setIsSortDropdownOpen(false);
                        }}
                      >
                        {option}
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>

            {/* Invoice Date Range Filter */}
            <div className="date-filter-wrapper">
              <input
                type="date"
                className="filter-date-input"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                title="From date"
              />
              <span className="date-filter-separator">to</span>
              <input
                type="date"
                className="filter-date-input"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                title="To date"
              />
            </div>

            <button
              className="download-btn"
              onClick={handleDownloadExcel}
              disabled={isDownloading}
              title="Download all filtered invoices as Excel"
            >
              <Download size={16} />
              {isDownloading ? "Downloading..." : "Download"}
            </button>

            <button
              className="clear-filters-btn"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="invoice-table-container">
        <table className="invoice-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Supplier Name</th>
              <th>Customer Invoice ID</th>
              <th>Comments</th>
              <th>PO Number</th>
              <th>Company Code</th>
              <th>Status</th>
              <th>Invoice Date</th>
              <th>Processed Date</th>
              <th>Total Amount</th>
              <th>Amount Paid</th>
              <th>View</th>
              <th>Invoice ID</th>
              <th>Ariba Comment</th>
              <th>ERP Payable Number</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isTableLoading ? (
              <tr>
                <td colSpan={16} className="no-data">
                  Loading...
                </td>
              </tr>
            ) : filteredInvoices.length > 0 ? (
              filteredInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.pdfId}</td>
                  <td>{inv.buyerName}</td>
                  <td>{inv.customerInvoiceId || "-"}</td>
                  <td>
                    {inv.comments && inv.comments.length > 25 ? (
                      <div className="comment-tooltip-wrapper">
                        <span className="comment-text-truncated">
                          {inv.comments}
                        </span>
                        <span className="comment-tooltip-text">
                          {inv.comments}
                        </span>
                      </div>
                    ) : (
                      inv.comments || "-"
                    )}
                  </td>
                  <td>{inv.PONumber}</td>
                  <td>{inv.companyCode}</td>
                  <td>
                    <span className={`status-badge status-${inv.status}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td>{formatDate(inv.createdAt)}</td>
                  <td>{formatDateTime(inv.processedDate)}</td>
                  <td>AED {inv.totalAmount.toFixed(2)}</td>
                  <td>AED 0.00</td>
                  <td>
                    <button
                      className="icon-button--view-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(inv.pdfId);
                      }}
                      disabled={loadingPdf}
                    >
                      <IoMdEye size={18} />
                    </button>
                  </td>
                  <td>{inv.invoiceId || "N/A"}</td>
                    <td>
                      {inv.aribaComments ? (
                        <div className="comment-tooltip-wrapper">
                          <span className="comment-text-truncated">
                            {inv.aribaComments}
                          </span>
                          <span className="comment-tooltip-text">
                            {inv.aribaComments}
                          </span>
                        </div>
                      ) : (
                        <button
                          className={`ariba-comment-btn ${
                            inv.status !== "failed" ? "disabled" : ""
                          }`}
                          onClick={() =>
                            inv.status === "failed" && handleOpenCommentModal(inv)
                          }
                          disabled={inv.status !== "failed"}
                        >
                          <MessageSquare size={14} />
                          {inv.comments ? "Edit Comment" : "Add Comment"}
                        </button>
                      )}
                    </td>
                  <td>{inv.erpPayableNumber || "N/A"}</td>
                  <td>
                    <div className="action-buttons-wrapper">
                      {inv.status === "pending" ? (
                        <button
                          className={`upload-ariba-btn ${
                            uploadingPdfId === inv.pdfId ? "uploading" : ""
                          }`}
                          onClick={() => handleUploadToAriba(inv.pdfId)}
                          disabled={uploadingPdfId === inv.pdfId}
                        >
                          {uploadingPdfId === inv.pdfId ? (
                            <>
                              <span className="ariba-spinner" />
                              Uploading...
                            </>
                          ) : (
                            "Upload to Ariba"
                          )}
                        </button>
                      ) : inv.status === "processed" && inv.customerInvoiceId ? null : (
                        <button
                          className="reprocess-btn"
                          onClick={() => handleReprocess(inv.pdfId, inv.PONumber || "", inv.invoiceId)}
                          disabled={isCompareLoading || inv.status === "queued"}
                          title={inv.status === "queued" ? "Invoice is already added to the queued list" : ""}
                        >
                          <RotateCcw size={16} /> Reprocess
                        </button>
                      )}

                      {inv.status === "failed" && (
                        <button
                          className={`reupload-btn ${
                            reuploadingPdfId === inv.pdfId ? "uploading" : ""
                          }`}
                          onClick={() => handleReupload(inv)}
                          disabled={reuploadingPdfId === inv.pdfId}
                          title="Re-run OCR processing for this file"
                        >
                          {reuploadingPdfId === inv.pdfId ? (
                            <>
                              <span className="ariba-spinner" />
                              Re-Uploading...
                            </>
                          ) : (
                            <>
                              <Upload size={16} /> Re-Upload
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={16} className="no-data">
                  No invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(currentPage > 1 || hasMore) && (
        <div className="invoice-pagination-controls">
          <button
            disabled={currentPage <= 1}
            onClick={handlePrevious}
            type="button"
          >
            Previous
          </button>
          <span className="page-info">Page {currentPage}</span>
          <button disabled={!hasMore} onClick={handleNext} type="button">
            Next
          </button>
        </div>
      )}
      <CommentEditModal
          isOpen={isCommentModalOpen}
          invoiceId={selectedInvoice?.pdfId || ""}
          currentComment={selectedInvoice?.comments || ""}
          onClose={handleCloseCommentModal}
          onSave={handleSaveComment}
          isSaving={isSavingComment}
        />
        {compareModalOpen && compareData && (
          <BuyerInvoiceCompareModal
            isOpen={compareModalOpen}
            onClose={() => setCompareModalOpen(false)}
            data={compareData}
            poNumber={selectedPo}
            invoiceNumber={selectedInvoiceNumber}
            pdfId={selectedPdfId}
            onAfterSave={() => fetchInvoices(currentPage)}
            onRefreshComparison={refreshCompareData}
          />
        )}
      <AdminSettingsModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
};

export default BuyerInvoiceDashboard;