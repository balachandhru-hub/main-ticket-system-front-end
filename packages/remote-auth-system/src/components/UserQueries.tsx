import React, { useState, useEffect, useCallback } from "react";
import "./UserQueries.css";
import BackButton from "./BackButton";
import { HiOutlineDocumentArrowDown } from "react-icons/hi2";
import UserQueryModal from "./UserQueryModal";
import { toast } from "react-toastify";
import { getAllAdditionalQueries } from "../api/additionalQueryApi";
import type { AdditionalQueryListDto, AdditionalQueryFilterDto } from "../Dto/AdditionalQueryDto";
import { isErrorResponse } from "../api/additionalQueryApi";

const ITEMS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 1000;

const UserQueries: React.FC = () => {
  const [queries, setQueries] = useState<AdditionalQueryListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<AdditionalQueryListDto | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  // Input states
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  // Debounced search value (only this is delayed)
  const [debouncedSearch] = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);

  // Fetch function — depends on debounced search + other filters + page
  const fetchQueries = useCallback(async () => {
    setLoading(true);

    const params: AdditionalQueryFilterDto = {
      SearchQuery: debouncedSearch.trim() || undefined,
      Status: statusFilter || undefined,
      FromDate: fromDate ? `${fromDate}T00:00:00` : undefined,
      ToDate: toDate ? `${toDate}T23:59:59` : undefined,
      Index: (page - 1) * ITEMS_PER_PAGE,
      Limit: ITEMS_PER_PAGE,
    };

    try {
      const result = await getAllAdditionalQueries(params);

      if (isErrorResponse(result)) {
        toast.error(result.message || "Failed to load queries");
        setQueries([]);
        setHasMore(false);
      } else {
        setQueries(result);
        setHasMore(result.length === ITEMS_PER_PAGE);
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
      setQueries([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, fromDate, toDate, page]);

  // ONLY ONE useEffect → fetches when any filter or page changes
  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  // Reset page when any filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, fromDate, toDate]);

  const handleClearFilters = () => {
    setSearchInput("");
    setStatusFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const goNext = () => setPage(p => p + 1);
  const goPrev = () => setPage(p => Math.max(1, p - 1));

  const handleRowClick = (query: AdditionalQueryListDto) => {
    setSelectedQuery(query);
    setModalOpen(true);
  };

  const handleUpdateSuccess = () => {
    setModalOpen(false);
    fetchQueries();
  };

  function useDebounce<T>(value: T, delay: number): [T] {
    const [debounced, setDebounced] = useState<T>(value);

    useEffect(() => {
      const timer = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(timer);
    }, [value, delay]);

    return [debounced];
  }

  const exportToCSV = () => {
  if (queries.length === 0) {
    toast.info("No data to export");
    return;
  }

  // Define headers in order
  const headers = [
    "Query ID",
    "Name",
    "Email",
    "Phone",
    "Organization",
    "Message",
    "Status",
    "Date Created"
  ];

  // Map data to rows
  const rows = queries.map(item => [
    item.id,
    item.name,
    item.email || "-",
    item.phone ? `"${item.phone}"` : "",
    item.organization || "-",
    `"${(item.message || "").replace(/"/g, '""')}"`,
    item.status.replace(/_/g, " "),
    new Date(item.dateCreated).toLocaleDateString()
  ]);

  // Combine headers + rows
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  // Create blob and trigger download
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `User_Queries_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast.success("CSV exported successfully!");
};

  return (
    <div className="uq-container">
      {/* Header */}
      <div className="uq-header">
        <div className="uq-header-row"><div className="button-bar"><BackButton /></div></div>
        <div className="uq-header-row"><h1>User Queries </h1></div>
        <div className="uq-header-row">
          <button className="uq-export-btn" onClick={exportToCSV}>
            <HiOutlineDocumentArrowDown size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="uq-filter-box">
        <div className="uq-filters-row">
          <div className="uq-filter-field">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by organization..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="uq-filter-field">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          <div className="uq-filter-field">
            <label>From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>

          <div className="uq-filter-field">
            <label>To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>

          <div className="uq-filter-actions">
            <button className="uq-clear-btn" onClick={handleClearFilters} disabled={loading}>
              Clear Filter
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          Loading queries...
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="uq-table-wrapper">
          <table className="uq-table">
            <thead>
              <tr>
                <th>QUERY ID</th>
                <th>NAME</th>
                <th>EMAIL</th>
                <th>PHONE</th>
                <th>ORGANIZATION</th>
                <th>MESSAGE</th>
                <th>STATUS</th>
                <th>DATE</th>
              </tr>
            </thead>
            <tbody>
              {queries.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "3rem" }}>
                    No queries found
                  </td>
                </tr>
              ) : (
                queries.map((item) => (
                  <tr
                    key={item.id}
                    className="uq-row"
                    onClick={() => handleRowClick(item)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{item.id.slice(0, 8)}</td>
                    <td>{item.name}</td>
                    <td>{item.email}</td>
                    <td>{item.phone || "—"}</td>
                    <td>{item.organization}</td>
                    <td title={item.message}>
                      {item.message.length > 60 ? item.message.substring(0, 60) + "..." : item.message}
                    </td>
                    <td>
                      <span className={`uq-status-badge ${item.status.toLowerCase().replace('_', '-')}`}>
                        {item.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>{new Date(item.dateCreated).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && queries.length > 0 && (
        <div className="uq-pagination">
          <div className="uq-page-info">
            Page <strong>{page}</strong>
          </div>

          <div className="uq-pagination-buttons">
            <button
              onClick={goPrev}
              disabled={page === 1 || loading}
              className="uq-pagination-btn prev"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Previous
            </button>

            <button
              onClick={goNext}
              disabled={!hasMore || loading}
              className="uq-pagination-btn next"
            >
              Next
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && selectedQuery && (
        <UserQueryModal
          open={isModalOpen}
          onClose={() => setModalOpen(false)}
          data={selectedQuery}
          onUpdateSuccess={handleUpdateSuccess}
        />
      )}
    </div>
  );
};

export default UserQueries;