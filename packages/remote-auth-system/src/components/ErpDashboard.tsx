
import React, { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, FileText, TrendingUp, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { toast } from 'react-toastify';
import './ErpDashboard.css';
import { getErpComparison, getFullMatchDetails, getErpComparisonCount } from '../api/erpComparisonApi';
import { getCompanyCodes } from '../api/PulseReportInvoiceApi';
import { getPONumbers } from '../api/GrnDashboardApi';

interface ErpRecord {
  po_number: string;
  line_item: string;
  company_code?: string;
  PO_quantity: number;
  ariba_quantity: number;
  s4_quantity: number;
  unit_price: number;
  ariba_value: number;
  s4_value: number;
  last_modified: string;
  mismatch: boolean;
}

interface FullMatchRecord {
  po_number: string;
  line_item: string;
  company_code?: string;
  ariba_quantity: number;
  s4_quantity: number;
  ariba_value: number;
  s4_value: number;
  s4_material_doc: string;
}

const ErpDashboard: React.FC = () => {
  const [searchPoNumber, setSearchPoNumber] = useState('');
  const [searchCompanyCode, setSearchCompanyCode] = useState('');
  const [poNumberOptions, setPoNumberOptions] = useState<string[]>([]);
  const [poNumberLoading, setPoNumberLoading] = useState(false);
  const [poNumberOpen, setPoNumberOpen] = useState(false);
  const [poNumberSearch, setPoNumberSearch] = useState('');
  const [poNumberPage, setPoNumberPage] = useState(1);
  const [hasMorePoNumbers, setHasMorePoNumbers] = useState(true);
  const [companyCodeOptions, setCompanyCodeOptions] = useState<string[]>([]);
  const [companyCodeLoading, setCompanyCodeLoading] = useState(false);
  const [companyCodeOpen, setCompanyCodeOpen] = useState(false);
  const [companyCodeSearch, setCompanyCodeSearch] = useState('');
  const [companyCodePage, setCompanyCodePage] = useState(1);
  const [hasMoreCompanyCodes, setHasMoreCompanyCodes] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [records, setRecords] = useState<ErpRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mismatchCount, setMismatchCount] = useState(0);
  const [fullMatchData, setFullMatchData] = useState<Record<string, FullMatchRecord[]>>({});
  const [loadingFullMatch, setLoadingFullMatch] = useState<Set<string>>(new Set());
  const [activeStatus, setActiveStatus] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Refs for dropdowns
  const poNumberDropdownRef = useRef<HTMLDivElement>(null);
  const poNumberListRef = useRef<HTMLDivElement>(null);
  const companyCodeDropdownRef = useRef<HTMLDivElement>(null);
  const companyCodeListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchErpData();
    loadMismatchCount();
    loadPoNumberOptions();
    loadCompanyCodeOptions();
  }, []);

  // Handle click outside PO Number dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (poNumberDropdownRef.current && !poNumberDropdownRef.current.contains(event.target as Node)) {
        setPoNumberOpen(false);
      }
    };

    if (poNumberOpen) {
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);

      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [poNumberOpen]);

  // Handle click outside Company Code dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (companyCodeDropdownRef.current && !companyCodeDropdownRef.current.contains(event.target as Node)) {
        setCompanyCodeOpen(false);
      }
    };

    if (companyCodeOpen) {
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);

      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [companyCodeOpen]);

  const loadPoNumberOptions = async () => {
    try {
      setPoNumberLoading(true);
      const response = await getPONumbers('', 1);
      setPoNumberOptions(response?.po_numbers || []);
      setPoNumberPage(1);
      setHasMorePoNumbers(response?.pagination?.total_pages ? response.pagination.page < response.pagination.total_pages : false);
    } catch (error) {
      toast.error('Failed to load PO numbers.');
      setPoNumberOptions([]);
    } finally {
      setPoNumberLoading(false);
    }
  };

  const handlePoNumberSearchChange = async (search: string) => {
    setPoNumberSearch(search);
    setPoNumberPage(1);
    
    if (search.trim().length > 0) {
      try {
        setPoNumberLoading(true);
        const response = await getPONumbers(search, 1);
        setPoNumberOptions(response?.po_numbers || []);
        setHasMorePoNumbers(response?.pagination?.total_pages ? response.pagination.page < response.pagination.total_pages : false);
      } catch (error) {
        toast.error('Failed to search PO numbers.');
      } finally {
        setPoNumberLoading(false);
      }
    } else {
      loadPoNumberOptions();
    }
  };

  const loadMorePoNumbers = async () => {
    try {
      const nextPage = poNumberPage + 1;
      setPoNumberLoading(true);
      const response = await getPONumbers(poNumberSearch, nextPage);
      setPoNumberOptions(prev => [...prev, ...(response?.po_numbers || [])]);
      setPoNumberPage(nextPage);
      setHasMorePoNumbers(response?.pagination?.total_pages ? response.pagination.page < response.pagination.total_pages : false);
    } catch (error) {
      toast.error('Failed to load more PO numbers.');
    } finally {
      setPoNumberLoading(false);
    }
  };

  const handlePoNumberDropdownScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;
    
    if (isNearBottom && hasMorePoNumbers && !poNumberLoading) {
      loadMorePoNumbers();
    }
  };

  const handleSelectPoNumber = (poNumber: string) => {
    setSearchPoNumber(poNumber);
    setPoNumberOpen(false);
    setPoNumberSearch('');
  };

  const handlePoNumberClick = () => {
    setPoNumberOpen(!poNumberOpen);
  };

  const loadCompanyCodeOptions = async () => {
    try {
      setCompanyCodeLoading(true);
      const response = await getCompanyCodes('', 1);
      setCompanyCodeOptions(response.items || []);
      setCompanyCodePage(1);
      setHasMoreCompanyCodes(response.hasMore || false);
    } catch (error) {
      toast.error('Failed to load company codes.');
      setCompanyCodeOptions([]);
    } finally {
      setCompanyCodeLoading(false);
    }
  };

  const handleCompanyCodeSearchChange = async (search: string) => {
    setCompanyCodeSearch(search);
    setCompanyCodePage(1);
    
    if (search.trim().length > 0) {
      try {
        setCompanyCodeLoading(true);
        const response = await getCompanyCodes(search, 1);
        setCompanyCodeOptions(response.items || []);
        setHasMoreCompanyCodes(response.hasMore || false);
      } catch (error) {
        toast.error('Failed to search company codes.');
      } finally {
        setCompanyCodeLoading(false);
      }
    } else {
      loadCompanyCodeOptions();
    }
  };

  const loadMoreCompanyCodes = async () => {
    try {
      const nextPage = companyCodePage + 1;
      setCompanyCodeLoading(true);
      const response = await getCompanyCodes(companyCodeSearch, nextPage);
      setCompanyCodeOptions(prev => [...prev, ...(response.items || [])]);
      setCompanyCodePage(nextPage);
      setHasMoreCompanyCodes(response.hasMore || false);
    } catch (error) {
      toast.error('Failed to load more company codes.');
    } finally {
      setCompanyCodeLoading(false);
    }
  };

  const handleCompanyCodeDropdownScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;
    
    if (isNearBottom && hasMoreCompanyCodes && !companyCodeLoading) {
      loadMoreCompanyCodes();
    }
  };

  const handleSelectCompanyCode = (code: string) => {
    setSearchCompanyCode(code);
    setCompanyCodeOpen(false);
    setCompanyCodeSearch('');
  };

  const handleCompanyCodeClick = () => {
    setCompanyCodeOpen(!companyCodeOpen);
  };

  const fetchErpData = async (poNumber?: string, companyCode?: string, status?: string, page: number = 1, pageSize: number = 10) => {
    try {
      setLoading(true);
      const payload: any = {
        page: page,
        page_size: pageSize
      };
      
      if (poNumber) payload.po_number = poNumber;
      if (companyCode) payload.company_code = companyCode;
      if (status) payload.status = status;

      const response = await getErpComparison(payload);
      
      setRecords(response.records || []);
      setTotalCount(response.total_count || 0);
      setTotalPages(response.total_pages || 0);
      setCurrentPage(response.current_page || 1);
    } catch (error) {
      toast.error('Failed to load ERP data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFullMatch = async (po_number: string, line_item: string) => {
    const key = `${po_number}-${line_item}`;
    
    try {
      setLoadingFullMatch(prev => new Set(prev).add(key));

      if (fullMatchData[key]) {
        setLoadingFullMatch(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
        return;
      }

      const response = await getFullMatchDetails({ po_number, line_item });
      
      setFullMatchData(prev => ({ ...prev, [key]: response }));
    } catch (error) {
      toast.error('Failed to load full match details.');
    } finally {
      setLoadingFullMatch(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  const toggleRowExpand = async (po_number: string, line_item: string) => {
    const key = `${po_number}-${line_item}`;
    const updated = new Set(expandedRows);

    if (updated.has(key)) {
      updated.delete(key);
      setExpandedRows(updated);
    } else {
      updated.add(key);
      setExpandedRows(updated);
      
      if (!fullMatchData[key]) {
        fetchFullMatch(po_number, line_item);
      }
    }
  };

  const handleSearch = () => {
    if (!searchPoNumber.trim() && !searchCompanyCode.trim()) return;
    fetchErpData(searchPoNumber || undefined, searchCompanyCode || undefined, activeStatus, 1, itemsPerPage);
  };

  const loadMismatchCount = async () => {
    try {
      const res = await getErpComparisonCount();
      setMismatchCount(res.count);
    } catch (error) {
      toast.error('Failed to load mismatch count.');
    }
  };

  const handleErpComparison = () => {
    setActiveStatus("erpComparison");
    fetchErpData(searchPoNumber || undefined, searchCompanyCode || undefined, "erpComparison", 1, itemsPerPage);
  };

  const handleClear = () => {
    setSearchPoNumber('');
    setSearchCompanyCode('');
    setPoNumberSearch('');
    setCompanyCodeSearch('');
    setActiveStatus(undefined);
    setPoNumberOpen(false);
    setCompanyCodeOpen(false);
    setPoNumberPage(1);
    setCompanyCodePage(1);
    setHasMorePoNumbers(true);
    setHasMoreCompanyCodes(true);
    fetchErpData(undefined, undefined, undefined, 1, itemsPerPage);
  };

  const handleDownloadData = () => {
    if (records.length === 0) {
      toast.warning('No data to download');
      return;
    }

    const headers = ['PO Number', 'Line Item', 'Company Code', 'PO Qty', 'Ariba Qty', 'S4 Qty', 'Unit Price', 'Ariba Value', 'S4 Value'];
    
    const csvContent = [
      headers.join(','),
      ...records.map(record => [
        record.po_number,
        record.line_item,
        record.company_code || '',
        record.PO_quantity,
        record.ariba_quantity,
        record.s4_quantity,
        record.unit_price.toFixed(2),
        record.ariba_value,
        record.s4_value
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `erp-comparison-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Data downloaded successfully!');
  };

  const handlePageChange = (page: number) => {
    fetchErpData(searchPoNumber || undefined, searchCompanyCode || undefined, activeStatus, page, itemsPerPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    fetchErpData(searchPoNumber || undefined, searchCompanyCode || undefined, activeStatus, 1, value);
  };

  const getPageNumbers = () => {
    const pages: Array<number | string> = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('ellipsis-1');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('ellipsis-2');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('ellipsis-3');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('ellipsis-4');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalCount);

  return (
    <div className="erp-dashboard">
      <div className="erp-header">
        <div className="erp-header-left">
          <FileText className="erp-header-icon" size={36} />
          <h1 className="erp-title">ERP – ARIBA Comparison</h1>
        </div>

        <div className="erp-badge-container">
          <div className="erp-badge erp-badge-primary">
            <TrendingUp size={20} />
            <div className="erp-badge-content">
              <span className="erp-badge-label">Total Records</span>
              <span className="erp-badge-value">{totalCount.toLocaleString()}</span>
            </div>
          </div>

          <div className="erp-badge erp-badge-warning">
            <AlertTriangle size={20} />
            <div className="erp-badge-content">
              <span className="erp-badge-label">Mismatch Count</span>
              <span className="erp-badge-value">{mismatchCount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="erp-controls">
        <div className="erp-search-group">
          <div className="erp-po-number-wrapper" ref={poNumberDropdownRef}>
            <div className="erp-po-number-input">
              <Search className="erp-search-icon" size={20} />
              <input
                type="text"
                className="erp-search-input"
                placeholder="Select PO Number"
                value={searchPoNumber}
                readOnly
                onClick={handlePoNumberClick}
              />
              {searchPoNumber && (
                <button
                  className="erp-clear-selection"
                  onClick={() => {
                    setSearchPoNumber('');
                    setPoNumberSearch('');
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            {poNumberOpen && (
              <div className="erp-dropdown-content">
                <input
                  type="text"
                  className="erp-dropdown-search"
                  placeholder="Search PO numbers..."
                  value={poNumberSearch}
                  onChange={(e) => handlePoNumberSearchChange(e.target.value)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="erp-dropdown-list" ref={poNumberListRef} onScroll={handlePoNumberDropdownScroll}>
                  {poNumberOptions.length > 0 ? (
                    <>
                      {poNumberOptions.map((poNumber, idx) => (
                        <button
                          key={idx}
                          className="erp-dropdown-item"
                          onClick={() => handleSelectPoNumber(poNumber)}
                        >
                          {poNumber}
                        </button>
                      ))}
                      {poNumberLoading && (
                        <div className="erp-dropdown-loading">
                          <RefreshCw className="erp-loading-spinner" size={18} />
                          <span>Loading more...</span>
                        </div>
                      )}
                      {hasMorePoNumbers && !poNumberLoading && (
                        <div className="erp-dropdown-load-more">
                          Scroll to load more...
                        </div>
                      )}
                    </>
                  ) : poNumberLoading ? (
                    <div className="erp-dropdown-loading">
                      <RefreshCw className="erp-loading-spinner" size={18} />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <div className="erp-dropdown-empty">No PO numbers found</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="erp-company-code-wrapper" ref={companyCodeDropdownRef}>
            <div className="erp-company-code-input">
              <Search className="erp-search-icon" size={20} />
              <input
                type="text"
                className="erp-search-input"
                placeholder="Select Company Code"
                value={searchCompanyCode}
                readOnly
                onClick={handleCompanyCodeClick}
              />
              {searchCompanyCode && (
                <button
                  className="erp-clear-selection"
                  onClick={() => {
                    setSearchCompanyCode('');
                    setCompanyCodeSearch('');
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            {companyCodeOpen && (
              <div className="erp-dropdown-content">
                <input
                  type="text"
                  className="erp-dropdown-search"
                  placeholder="Search company codes..."
                  value={companyCodeSearch}
                  onChange={(e) => handleCompanyCodeSearchChange(e.target.value)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="erp-dropdown-list" ref={companyCodeListRef} onScroll={handleCompanyCodeDropdownScroll}>
                  {companyCodeOptions.length > 0 ? (
                    <>
                      {companyCodeOptions.map((code, idx) => (
                        <button
                          key={idx}
                          className="erp-dropdown-item"
                          onClick={() => handleSelectCompanyCode(code)}
                        >
                          {code}
                        </button>
                      ))}
                      {companyCodeLoading && (
                        <div className="erp-dropdown-loading">
                          <RefreshCw className="erp-loading-spinner" size={18} />
                          <span>Loading more...</span>
                        </div>
                      )}
                      {hasMoreCompanyCodes && !companyCodeLoading && (
                        <div className="erp-dropdown-load-more">
                          Scroll to load more...
                        </div>
                      )}
                    </>
                  ) : companyCodeLoading ? (
                    <div className="erp-dropdown-loading">
                      <RefreshCw className="erp-loading-spinner" size={18} />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <div className="erp-dropdown-empty">No company codes found</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button className="erp-btn erp-btn-primary" onClick={handleSearch}>
            <Search size={18} />
            Search
          </button>

          <button className="erp-btn erp-btn-warning" onClick={handleErpComparison}>
            <AlertTriangle size={18} />
            ERP Comparison
          </button>

          <button className="erp-btn erp-btn-secondary" onClick={handleClear}>
            <RefreshCw size={18} />
            Clear
          </button>
        </div>
      </div>

      <div className="erp-table-container">
        {!loading && (
          <div className="erp-pagination-top">
            <div className="erp-pagination-info">
              Showing {startIndex} to {endIndex} of {totalCount.toLocaleString()} entries
              <div>
                <button
                  onClick={handleDownloadData}
                  className="btn-download-data"
                >
                <svg className="download-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download Data
              </button>
              </div>
            </div>
            <div className="erp-items-per-page">
              <label>Rows per page:</label>
              <select 
                value={itemsPerPage} 
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="erp-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}

        <table className="erp-table">
          <thead className="erp-table-header">
            <tr>
              <th className="erp-th erp-th-expand"></th>
              <th className="erp-th">PO Number</th>
              <th className="erp-th">Line Item</th>
              <th className="erp-th">Company Code</th>
              <th className="erp-th">PO Qty</th>
              <th className="erp-th">Ariba Qty</th>
              <th className="erp-th">S4 Qty</th>
              <th className="erp-th">Unit Price</th>
              <th className="erp-th">Ariba Value</th>
              <th className="erp-th">S4 Value</th>
            </tr>
          </thead>

          <tbody className="erp-table-body">
            {loading ? (
              <tr>
                <td colSpan={10} className="erp-td-loading">
                  <div className="erp-loading">
                    <RefreshCw className="erp-loading-spinner" size={32} />
                    <p>Loading data...</p>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((record) => {
                const key = `${record.po_number}-${record.line_item}`;
                const isExpanded = expandedRows.has(key);
                const isLoadingDetails = loadingFullMatch.has(key);
                return (
                  <React.Fragment key={key}>
                    <tr className="erp-tr">
                      <td className="erp-td erp-td-expand">
                        <button
                          className="erp-expand-btn"
                          onClick={() => toggleRowExpand(record.po_number, record.line_item)}
                          disabled={isLoadingDetails}
                        >
                          {isLoadingDetails ? (
                            <RefreshCw className="erp-btn-spinner" size={18} />
                          ) : isExpanded ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>
                      </td>

                      <td className="erp-td erp-td-po">{record.po_number}</td>
                      <td className="erp-td">{record.line_item}</td>
                      <td className="erp-td erp-td-company-code">{record.company_code}</td>
                      <td className="erp-td">{record.PO_quantity}</td>

                      <td className="erp-td">
                        <span
                          className={
                            record.ariba_quantity !== record.PO_quantity
                              ? 'erp-highlight-warning'
                              : ''
                          }
                        >
                          {record.ariba_quantity}
                        </span>
                      </td>

                      <td className="erp-td">
                        <span
                          className={
                            record.s4_quantity !== record.PO_quantity
                              ? 'erp-highlight-danger'
                              : ''
                          }
                        >
                          {record.s4_quantity}
                        </span>
                      </td>

                      <td className="erp-td">{record.unit_price.toFixed(2)}</td>
                      <td className="erp-td erp-td-value">
                        {record.ariba_value.toLocaleString()}
                      </td>
                      <td className="erp-td erp-td-value">
                        {record.s4_value.toLocaleString()}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="erp-expanded-row">
                        <td className="erp-td" colSpan={10}>
                          {fullMatchData[key] ? (
                            <div className="erp-expand-box">
                              <h4 className="erp-expand-title">Full Match Details</h4>
                              <table className="erp-expand-table">
                                <thead>
                                  <tr>
                                    <th>Company Code</th>
                                    <th>Ariba Qty</th>
                                    <th>S4 Qty</th>
                                    <th>Ariba Value</th>
                                    <th>S4 Value</th>
                                    <th>Material Doc</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {fullMatchData[key].map((fm, i) => (
                                    <tr key={`${key}-${i}`}>
                                      <td>{fm.company_code}</td>
                                      <td>{fm.ariba_quantity}</td>
                                      <td>{fm.s4_quantity}</td>
                                      <td>{fm.ariba_value}</td>
                                      <td>{fm.s4_value}</td>
                                      <td>{fm.s4_material_doc}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="erp-expand-loading">
                              <RefreshCw className="erp-loading-spinner" size={20} />
                              <p>Loading details...</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>

        {!loading && records.length > 0 && (
          <div className="erp-pagination">
            <button
              className="erp-pagination-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={18} />
              Previous
            </button>

            <div className="erp-pagination-numbers">
              {getPageNumbers().map((page) => (
                typeof page === 'number' ? (
                  <button
                    key={page}
                    className={`erp-pagination-number ${currentPage === page ? 'active' : ''}`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                ) : (
                  <span key={page} className="erp-pagination-ellipsis">
                    ...
                  </span>
                )
              ))}
            </div>

            <button
              className="erp-pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {!loading && records.length === 0 && (
        <div className="erp-no-results">
          <AlertTriangle size={48} className="erp-no-results-icon" />
          <p>No records found{(searchPoNumber || searchCompanyCode) && ` matching your filters`}</p>
        </div>
      )}
    </div>
  );
};

export default ErpDashboard;