import React, { useEffect, useState, useMemo } from "react";
import {
  FileText,
  Clock,
  CheckCircle,
  RotateCcw,
  XCircle,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./InvoiceDashboard.css";
import { getCustomerGraph } from "../api/invoiceApi-table";
import AdminSettingsModal from "./AdminSettingsModal";
import { FaFileInvoiceDollar } from "react-icons/fa6";
import { IoSettingsSharp } from "react-icons/io5";
import { viewPdf } from "../api/callAxiosInvoiceExtract";
import { toast } from "react-toastify";
import { IoMdEye } from "react-icons/io";
import { executeInvoiceProcessSync } from "../api/rpaInvoiceApi";

interface InvoiceItem {
  id: string;
  userId: string;
  buyerName: string;
  filename: string;
  pdfId: string;
  status: "success" | "pending" | "failed" | "reprocess";
  PONumber?: string;
  customerInvoiceId?: string | null;
  createdAt: string;
  totalAmount: number;
  receivedAmount: number;
}

const InvoiceDashboard: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  const navigate = useNavigate();

  useEffect(() => {
    getCustomerGraph()
      .then((data) => {
        const mappedInvoices: InvoiceItem[] = (data.records ?? []).map((record: any) => ({
          id: record.id.toString(),
          userId: record.user_id,
          buyerName: record.SupplierName,
          filename: record.filename,
          pdfId: record.pdf_id,
          status: (record.status?.toLowerCase() === "processed"
            ? "success"
            : record.status?.toLowerCase() === "success"
            ? "pending"
            : record.status?.toLowerCase() || "failed") as InvoiceItem["status"],
          PONumber: record.PONumber || "N/A",
          customerInvoiceId: record.CUSTOMER_INVOICE_ID,
          createdAt: record.created_at,
          totalAmount: parseFloat(record.Total) || 0,
          receivedAmount: 0.0,
        }));
        setInvoices(mappedInvoices);
        setFilteredInvoices(mappedInvoices);
      })
      .catch((error) => {
        toast.error(error.message || "Failed to fetch invoices");
      });
  }, []);

  const handlePrevious = () => setCurrentPage((prev) => Math.max(0, prev - 1));
  const handleNext = () => setCurrentPage((prev) => prev + 1);

  const handleFilter = (status: string) => {
    setCurrentPage(0);
    setActiveFilter(status);
    let newFilteredInvoices: InvoiceItem[];
    if (status === "All" || status.includes("Amount")) {
      newFilteredInvoices = invoices;
    } else if (status === "Processed") {
      newFilteredInvoices = invoices.filter((inv) => inv.status === "success");
    } else if (status === "Pending") {
      newFilteredInvoices = invoices.filter((inv) => inv.status === "pending");
    } else if (status === "Failed") {
      newFilteredInvoices = invoices.filter((inv) => inv.status === "failed");
    } else if (status === "Reprocess") {
      newFilteredInvoices = invoices.filter((inv) => inv.status === "reprocess");
    } else {
      newFilteredInvoices = invoices;
    }
    setFilteredInvoices(newFilteredInvoices);
  };

  const searchedInvoices = filteredInvoices.filter(
    (inv) =>
      inv.buyerName?.toLowerCase().includes(search.toLowerCase()) ||
      inv.filename.toLowerCase().includes(search.toLowerCase()) ||
      inv.PONumber?.toLowerCase().includes(search.toLowerCase())
  );

  const { currentInvoices, totalPages, currentHasMore } = useMemo(() => {
    const totalCount = searchedInvoices.length;
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const effectivePage = Math.min(currentPage, totalPages > 0 ? totalPages - 1 : 0);
    const startIndex = effectivePage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentInvoices = searchedInvoices.slice(startIndex, endIndex);
    const currentHasMore = endIndex < totalCount;
    return { currentInvoices, totalPages, currentHasMore };
  }, [searchedInvoices, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(0);
  }, [search]);

  const totalInvoices = invoices.length;
  const processedCount = invoices.filter((i) => i.status === "success").length;
  const pendingCount = invoices.filter((i) => i.status === "pending").length;
  const failedCount = invoices.filter((i) => i.status === "failed").length;
  const reprocessCount = invoices.filter((i) => i.status === "reprocess").length;
  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const receivedAmount = invoices.reduce((sum, inv) => sum + (inv.receivedAmount || 0), 0);
  const pendingAmount = totalAmount - receivedAmount;

  const cards = [
    { title: "Total Invoice", count: totalInvoices, icon: FileText, color: "blue" },
    { title: "Processed", count: processedCount, icon: CheckCircle, color: "green" },
    { title: "Pending", count: pendingCount, icon: Clock, color: "orange" },
    { title: "Reprocess", count: reprocessCount, icon: RotateCcw, color: "purple" },
    { title: "Failed", count: failedCount, icon: XCircle, color: "red" },
    { title: "Total Amount", count: `AED ${totalAmount.toFixed(2)}`, icon: DollarSign, color: "purple" },
    { title: "Received Amount", count: `AED ${receivedAmount.toFixed(2)}`, icon: TrendingUp, color: "blue" },
    { title: "Pending Amount", count: `AED ${pendingAmount.toFixed(2)}`, icon: AlertTriangle, color: "red" },
  ];

  const getIconColor = (color: string) => {
    switch (color) {
      case "blue": return "text-blue-500 bg-blue-100";
      case "green": return "text-green-500 bg-green-100";
      case "orange": return "text-orange-500 bg-orange-100";
      case "purple": return "text-purple-500 bg-purple-100";
      case "red": return "text-red-500 bg-red-100";
      default: return "text-gray-500 bg-gray-100";
    }
  };

  const handleInvoiceManagement = () => navigate("/invoice-extractor");
  const handleAdminSetting = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  // ✅ No status guard needed — button is only shown for failed/reprocess
  const handleReprocess = (pdfId: string) => {
    navigate("/reprocessed-invoices", { state: { pdfId: Number(pdfId) } });
  };

  const handleUploadToAriba = async (pdfId: string) => {
    setUploadingIds((prev) => new Set(prev).add(pdfId));
    try {
      await executeInvoiceProcessSync(Number(pdfId));
    } finally {
      setUploadingIds((prev) => {
        const updated = new Set(prev);
        updated.delete(pdfId);
        return updated;
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="invoice-dashboard-content">
      <div className="dashboard-header">
        <div className="dashboard-header-buttons">
          <button className="header-btn invoice-mgmt-btn" onClick={handleInvoiceManagement}>
            <FaFileInvoiceDollar className="header-btn-icon" />
            Invoice Management System
          </button>
          <button className="header-btn admin-setting-btn" onClick={handleAdminSetting}>
            <IoSettingsSharp className="header-btn-icon" />
            Admin Settings
          </button>
        </div>
      </div>

      <div className="dashboard-cards-container">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`dashboard-card ${activeFilter === card.title ? "active-card" : ""}`}
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

      <div className="invoice-filter-section">
        <div className="status-cards">
          <h3>
            Showing: <span className="text-blue-300">{activeFilter}</span>
          </h3>
        </div>
        <input
          type="text"
          placeholder="Search by buyer or filename..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="invoice-table-container">
        <table className="invoice-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Buyer Name</th>
              <th>Customer Invoice ID</th>
              <th>Filename</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Total Amount</th>
              <th>Actions</th>
              <th>View</th>
            </tr>
          </thead>
          <tbody>
            {currentInvoices.length > 0 ? (
              currentInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.id}</td>
                  <td>{inv.buyerName}</td>
                  <td>{inv.customerInvoiceId || "-"}</td>
                  <td>{inv.filename}</td>
                  <td>
                    <span className={`status-badge status-${inv.status}`}>{inv.status}</span>
                  </td>
                  <td>{formatDate(inv.createdAt)}</td>
                  <td>AED {inv.totalAmount.toFixed(2)}</td>
                  <td>
                    {inv.status === "pending" ? (
                      // pending → Upload to Ariba
                      <button
                        className="upload-ariba-btn"
                        onClick={() => handleUploadToAriba(inv.pdfId)}
                        disabled={uploadingIds.has(inv.pdfId)}
                      >
                        {uploadingIds.has(inv.pdfId) ? "Uploading..." : "Upload to Ariba"}
                      </button>
                    ) : inv.status === "success" ? (
                    
                      <span style={{ color: "#9ca3af", fontSize: "13px" }}> </span>
                    ) : (
                      
                      <button
                        className="reprocess-btn"
                        onClick={() => handleReprocess(inv.pdfId)}
                      >
                        <RotateCcw size={16} /> Reprocess
                      </button>
                    )}
                  </td>
                  <td>
                    <span
                      className="iet-view-icon"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!inv?.pdfId) {
                          toast.error("Data not available");
                          return;
                        }
                        const toastId = toast.info("Loading PDF...", {
                          autoClose: false,
                          closeButton: false,
                          draggable: false,
                        });
                        setLoading(true);
                        try {
                          await viewPdf(Number(inv.pdfId), setLoading);
                          toast.update(toastId, {
                            render: "PDF Loaded successfully",
                            type: "success",
                            autoClose: 3000,
                            closeButton: true,
                          });
                        } catch {
                          toast.update(toastId, {
                            render: "Failed to load PDF",
                            type: "error",
                            autoClose: 3000,
                            closeButton: true,
                          });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      title="View PDF"
                      style={{ cursor: "pointer", fontSize: "18px", color: "#1d4ed8" }}
                    >
                      <IoMdEye />
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="no-data">
                  No invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {searchedInvoices.length > itemsPerPage && (
        <div className="invoice-pagination-controls">
          <button disabled={currentPage === 0} onClick={handlePrevious} type="button">
            Previous
          </button>
          <span className="page-info">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button disabled={!currentHasMore} onClick={handleNext} type="button">
            Next
          </button>
        </div>
      )}

      <AdminSettingsModal isOpen={isModalOpen} onClose={handleCloseModal} />

      {loading && (
        <div className="iet-loading-overlay">
          <div className="iet-loading-popup">
            <div className="iet-spinner"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDashboard;