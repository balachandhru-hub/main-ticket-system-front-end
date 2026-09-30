import React, { useState, useCallback } from "react";
import { getBatchIds } from "../api/batchApi";
import { getBatchResults } from "../api/batchResult";
import type { BatchResultDto } from "../Dto/batchresultDto";
import { downloadPurchaseOrderLogs } from "../api/pologDownloadApi";
import "./ViewButton.css";
import { toast } from "react-toastify";
import ErrorModel from "./ErrorModel";
import { useNavigate } from "react-router-dom";

interface Option {
  label: string;
  value: string;
}

const ViewButton: React.FC = () => {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [tableData, setTableData] = useState<BatchResultDto[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const [dropdownLimit] = useState(10);
  const [hasMoreDropdownData, setHasMoreDropdownData] = useState(true);
  const [loadingMoreDropdown, setLoadingMoreDropdown] = useState(false);
  const [tableIndex, setTableIndex] = useState(0);
  const [tableLimit] = useState(10);
  const [hasMoreTableData, setHasMoreTableData] = useState(true);
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [showSessionModal, setShowSessionModal] = useState(false);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [startHour, setStartHour] = useState<string>('00');
  const [startMinute, setStartMinute] = useState<string>('00');
  const [endHour, setEndHour] = useState<string>('23');
  const [endMinute, setEndMinute] = useState<string>('59');
  const navigate = useNavigate();

  // New variable to check if all necessary fields are filled
  const isDownloadReady =
    startDate.length > 0 &&
    endDate.length > 0 &&
    startHour.length > 0 &&
    startMinute.length > 0 &&
    endHour.length > 0 &&
    endMinute.length > 0;


  const handleViewClick = async () => {
    setPopupOpen(true);
    setLoading(true);
    setDropdownIndex(0);
    setOptions([]);
    setHasMoreDropdownData(true);

    const data = await getBatchIds(0, dropdownLimit);
    if ("statusCode" in data) {
      setOptions([]);
      setHasMoreDropdownData(false);
    } else {
      setOptions(
        data.map((num) => ({
          label: num.toString(),
          value: num.toString(),
        }))
      );
      setDropdownIndex(dropdownLimit);
      setHasMoreDropdownData(data.length === dropdownLimit);
    }
    setLoading(false);
  };

  const handleDropdownScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    if (
      scrollHeight - scrollTop - clientHeight < 20 &&
      !loadingMoreDropdown &&
      hasMoreDropdownData
    ) {
      setLoadingMoreDropdown(true);

      const data = await getBatchIds(dropdownIndex, dropdownLimit);

      if ("statusCode" in data) {
        setHasMoreDropdownData(false);
      } else {
        const newOptions = data.map((num) => ({
          label: num.toString(),
          value: num.toString(),
        }));

        setOptions((prev) => [...prev, ...newOptions]);
        setDropdownIndex((prev) => prev + dropdownLimit);
        setHasMoreDropdownData(data.length === dropdownLimit);
      }

      setLoadingMoreDropdown(false);
    }
  };


  const handleSelect = async (batchId: string) => {
    setSelectedBatchId(batchId);
    setIsDropdownOpen(false);
    setTableLoading(true);
    setTableIndex(0);
    setTableData([]);
    setPurchaseOrderId("");
    setSearchValue("");
    setStartDate("");
    setEndDate("");
    setStartHour('00');
    setStartMinute('00');
    setEndHour('23');
    setEndMinute('59');

    const data = await getBatchResults(Number(batchId), 0, tableLimit);
    if ("statusCode" in data) {
      setTableData([]);
      setHasMoreTableData(false);
    } else {
      setTableData(data);
      setHasMoreTableData(data.length === tableLimit);
    }
    setTableLoading(false);
  };

  const handleTableNext = async () => {
    if (!hasMoreTableData || !selectedBatchId) return;

    setTableLoading(true);
    const nextIndex = tableIndex + tableLimit;

    const data = await getBatchResults(
      Number(selectedBatchId),
      nextIndex,
      tableLimit,
      purchaseOrderId || undefined
    );

    if ("statusCode" in data) {
      setHasMoreTableData(false);
    } else {
      setTableData(data);
      setTableIndex(nextIndex);
      setHasMoreTableData(data.length === tableLimit);
    }
    setTableLoading(false);
  };

  const handleTablePrevious = async () => {
    if (tableIndex === 0 || !selectedBatchId) return;

    setTableLoading(true);
    const prevIndex = Math.max(0, tableIndex - tableLimit);

    const data = await getBatchResults(
      Number(selectedBatchId),
      prevIndex,
      tableLimit,
      purchaseOrderId || undefined
    );

    if ("statusCode" in data) {
    } else {
      setTableData(data);
      setTableIndex(prevIndex);
      setHasMoreTableData(true);
    }
    setTableLoading(false);
  };

  /**
   * Function to execute the search filter against the API.
   */
  const handleSearch = async () => {
    if (!selectedBatchId) return;

    // Set the filter state and reset table loading/index
    setPurchaseOrderId(searchValue.trim());
    setTableLoading(true);
    setTableIndex(0);

    const data = await getBatchResults(
      Number(selectedBatchId),
      0,
      tableLimit,
      searchValue.trim() || undefined
    );

    if ("statusCode" in data) {
      setTableData([]);
      setHasMoreTableData(false);
    } else {
      setTableData(data);
      setHasMoreTableData(data.length === tableLimit);
    }

    setTableLoading(false);
  };

  const handleDownload = useCallback(async () => {
    if (!isDownloadReady) {
      toast.warn("Please select both Date and Time ranges before downloading.");
      return;
    }
    
    // Simple date validation: End Date should not be before Start Date
    if (new Date(endDate) < new Date(startDate)) {
        toast.error('End Date cannot be before Start Date.');
        return;
    }


    // Construct ISO 8601 UTC timestamp strings
    const start = new Date(`${startDate}T${startHour}:${startMinute}:00Z`);
    const end = new Date(`${endDate}T${endHour}:${endMinute}:59Z`);

    const formatDotNetDate = (date: Date) => {
      const pad = (num: number, size = 2) => num.toString().padStart(size, '0');
      const ms = date.getMilliseconds().toString().padEnd(7, '0'); // .NET precision
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`;
    };

    const startDateTime = formatDotNetDate(start);
    const endDateTime = formatDotNetDate(end);

    setTableLoading(true); // Disable the button immediately

    try {
      const response = await downloadPurchaseOrderLogs(startDateTime, endDateTime);
      
      if (response?.statusCode === 401) {
        setShowSessionModal(true);
      }
      else if (response?.statusCode === 412) {
        toast.error('Failed to Download File Due to Wrong Date Range');
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        setShowSessionModal(true);
      }
      else if (error?.statusCode === 412) {
        toast.error('Failed to Download File Due Wrong Date Range');
      } else {
        // Only show an error for truly unexpected failures/network issues.
        toast.error('An unexpected error occurred during download.'); 
      }
    } finally {
      setLoading(false);
      setTableLoading(false); 
    }
  }, [startDate, endDate, startHour, startMinute, endHour, endMinute, isDownloadReady]);


  const closePopup = () => {
    setPopupOpen(false);
    setIsDropdownOpen(false);
    setSelectedBatchId("");
    setTableData([]);
    setOptions([]);
    setDropdownIndex(0);
    setTableIndex(0);
    setHasMoreDropdownData(true);
    setHasMoreTableData(true);
    setPurchaseOrderId("");
    setSearchValue("");
    setStartDate("");
    setEndDate("");
    setStartHour('00');
    setStartMinute('00');
    setEndHour('23');
    setEndMinute('59');
  };


  return (
    <div className="view-btn-container">
      <button
        className="po-interface-btn po-interface-btn-reverse"
        onClick={handleViewClick}
      >
        View
      </button>

      {popupOpen && (
        <div className="vb-popup-overlay">
          <div className="vb-popup-content">
            <button className="vb-popup-close-btn" onClick={closePopup}>
              ✕
            </button>

            <h3 className="vb-header">Batch Results</h3>

            <div className="vb-controls">

              {/* ROW 1: Batch ID, Date Range, and Download */}
              <div className="vb-control-row vb-first-row">

                <div className="vb-dropdown-section">
                  <label htmlFor="batch-select">Select Batch ID:</label>
                  <div className="vb-dropdown-container">
                    <button
                      className="vb-dropdown-btn"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      disabled={loading}
                    >
                      {selectedBatchId || "Choose a batch ID"}
                      <span className="dropdown-arrow">
                        {isDropdownOpen ? "▲" : "▼"}
                      </span>
                    </button>

                    {isDropdownOpen && (
                      <div className="vb-dropdown-options" onScroll={handleDropdownScroll}>
                        {loading ? (
                          <p className="vb-loading">Loading...</p>
                        ) : options.length > 0 ? (
                          <>
                            {options.map((option) => (
                              <div
                                key={option.value}
                                className="vb-dropdown-item"
                                onClick={() => handleSelect(option.value)}
                              >
                                {option.label}
                              </div>
                            ))}
                            {loadingMoreDropdown && (
                              <div className="vb-loading-more">Loading more...</div>
                            )}
                            {!hasMoreDropdownData && options.length > 0 && (
                              <div className="vb-no-more-data">
                                No more data available
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="vb-empty">No data found</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* FROM DATE/TIME CONTROL */}
                <div className="date-time-control">
                  <span className="vb-date-label">From Date:</span>
                  <div className="date-time-inputs">
                    <input
                      type="date"
                      className="vb-date-input"
                      value={startDate}
                      onChange={(e) => {
                          setStartDate(e.target.value);
                          // Clear end date if the new start date is after the current end date
                          if (endDate && new Date(e.target.value) > new Date(endDate)) {
                              setEndDate("");
                          }
                      }}
                      required
                    />
                    <input
                      type="number"
                      className="time-input"
                      placeholder="HH"
                      min="0"
                      max="23"
                      value={startHour}
                      onChange={(e) => setStartHour(e.target.value.slice(0, 2).padStart(2, '0'))}
                      required
                    />
                    <span>:</span>
                    <input
                      type="number"
                      className="time-input"
                      placeholder="MM"
                      min="0"
                      max="59"
                      value={startMinute}
                      onChange={(e) => setStartMinute(e.target.value.slice(0, 2).padStart(2, '0'))}
                      required
                    />
                  </div>
                </div>

                {/* TO DATE/TIME CONTROL */}
                <div className="date-time-control">
                  <span className="vb-date-label">To Date:</span>
                  <div className="date-time-inputs">
                    <input
                      type="date"
                      className="vb-date-input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      // Set minimum date to the selected start date
                      min={startDate} 
                      required
                      // Disable the input if no start date is selected to guide the user
                      disabled={!startDate}
                    />
                    <input
                      type="number"
                      className="time-input"
                      placeholder="HH"
                      min="0"
                      max="23"
                      value={endHour}
                      onChange={(e) => setEndHour(e.target.value.slice(0, 2).padStart(2, '0'))}
                      required
                    />
                    <span>:</span>
                    <input
                      type="number"
                      className="time-input"
                      placeholder="MM"
                      min="0"
                      max="59"
                      value={endMinute}
                      onChange={(e) => setEndMinute(e.target.value.slice(0, 2).padStart(2, '0'))}
                      required
                    />
                  </div>
                </div>

                <button
                  className="vb-download-btn"
                  onClick={handleDownload}
                  // BUTTON IS DISABLED if tableLoading OR if NOT all fields are ready
                  disabled={tableLoading || !isDownloadReady}
                >
                  Download
                </button>
                
              </div>
              
            
              
            </div>
             {selectedBatchId && (
                <div className="vb-control-row vb-second-row">
                  <div className="vb-search-and-download"> 
                    <input
                      type="text"
                      placeholder="Search by Purchase Order..."
                      className="vb-search-input" 
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                    />
                    <button className="vb-search-btn" onClick={handleSearch}>
                      Search
                    </button>
                  </div>
                </div>
              )}
            {/* START OF vb-results-section (Search Table) */}
            <div className="vb-results-section">
              {tableLoading ? (
                <p>Loading results...</p>
              ) : tableData.length > 0 ? (
                <>
                  <table className="vb-result-table">
                    <thead>
                      <tr>
                        <th>Purchase Order ID</th>
                        <th>Line Item ID</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row) => (
                        <tr key={row.id}>
                          <td>{row.purchaseOrderId}</td>
                          <td>{row.lineItemId}</td>
                          <td>{row.result}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="vb-pagination-controls">
                    <button
                      className="vb-pagination-btn vb-prev-btn"
                      onClick={handleTablePrevious}
                      disabled={tableIndex === 0 || tableLoading}
                    >
                      Previous
                    </button>

                    <button
                      className="vb-pagination-btn vb-next-btn"
                      onClick={handleTableNext}
                      disabled={!hasMoreTableData || tableLoading}
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : selectedBatchId ? (
                <p>No results found for batch ID: {selectedBatchId}</p>
              ) : (
                <p>Please select a batch ID to view results</p>
              )}
            </div>
          </div>
        </div>
      )}
      <ErrorModel
        visible={showSessionModal}
        title="Session Expired"
        message="Your session has expired. Please log in again."
        onConfirm={() => {
          setShowSessionModal(false);
          navigate('/');
        }}
        onClose={() => {
          setShowSessionModal(false);
          navigate('/');
        }}
      />
    </div>
  );
};

export default ViewButton;