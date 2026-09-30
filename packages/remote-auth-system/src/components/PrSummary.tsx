import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getAllPRMaterialPR } from '../api/prEntertainmentApi';
import { FaPlus, FaMinus, FaEdit, FaCopy, FaSearch } from 'react-icons/fa';
import { toast } from 'react-toastify';
import BackButton from './BackButton';
import './PrSummary.css';

/* ── Types ─────────────────────────────────────── */
interface PrSummaryProps {
    onBack: () => void;
    onEdit: (data: any) => void;
    onCopy: (data: any) => void;
    filterPrNumber?: string | null;
    onFetchData?: (params: any) => Promise<any>;
    summaryType?: 'material' | 'service';
}

interface PrGroupedItem {
    prNumber: string;
    status: string;
    needBy: string;
    headerComment: string;
    lineNumber: string;
    lineItemCount: number;
    description: string;
    amount: string;
    currency: string;
    quantity: string;
    reciptID: string;
    ssid: string;
    poNumber: string;
    extractedInvoiceNumber: string;
    lineItems: any[];
    raw: any;
    autoInvoices: boolean;
}

/* ── Component ─────────────────────────────────── */
const PrSummary: React.FC<PrSummaryProps> = ({ onBack, onEdit, onCopy, filterPrNumber, onFetchData, summaryType }) => {
    const [data, setData] = useState<PrGroupedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedRows, setExpandedRows] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [index, setIndex] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const isNewSearchRef = useRef(false);
    const observerTarget = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const limit = 10;

    /* ── Process API items ─────────────────────── */
    const processItems = (items: any[]) => {
        const groupedMap: { [key: string]: PrGroupedItem } = {};

        items
            .filter(item => item && (item.prNumber || item.PRNumber))
            .filter(item => !filterPrNumber || (item.prNumber || item.PRNumber) === filterPrNumber)
            .forEach((item: any) => {
                const prNumber = item.prNumber || item.PRNumber;
                const lineItems = item.lineItems || item.LineItems || [];

                if (!groupedMap[prNumber]) {
                    const firstLine = lineItems.length > 0 ? lineItems[0] : {};
                    const rawData = {
                        ...item,
                        prNumber,
                        PRNumber: prNumber,
                        status: item.status || item.Status,
                        needBy: item.needBy || item.NeedBy,
                        headerComment: item.headerComment || item.HeaderComment,
                        lineItems,
                        LineItems: lineItems
                    };

                    groupedMap[prNumber] = {
                        prNumber,
                        lineNumber: firstLine.lineItemNumber || firstLine.LineItemNumber,
                        lineItemCount: lineItems.length,
                        status: item.status || item.Status,
                        needBy: item.needBy || item.NeedBy,
                        description: firstLine.description || firstLine.Description || item.description || item.Description,
                        headerComment: item.headerComment || item.HeaderComment,
                        reciptID: firstLine.reciptID || item.reciptID,
                        ssid: firstLine.ssid || item.ssid || firstLine.SSID || item.SSID,
                        poNumber: firstLine.poNumber || item.poNumber,
                        amount: firstLine.amount || firstLine.price || item.amount,
                        currency: firstLine.currency || item.currency,
                        quantity: firstLine.quantity || item.quantity,
                        extractedInvoiceNumber: firstLine.extractedInvoiceNumber,
                        autoInvoices: firstLine.autoInvoices,
                        lineItems: lineItems.map((line: any) => ({
                            ...item,
                            ...line,
                            lineItems: undefined,
                            LineItems: undefined
                        })),
                        raw: rawData
                    };
                }
            });

        return Object.values(groupedMap);
    };

    /* ── Fetch ─────────────────────────────────── */
    const fetchData = useCallback(async (currentIndex: number = 0, isNewSearch: boolean = false) => {
        if (isNewSearch) setLoading(true);
        else setIsLoadingMore(true);

        try {
            const apiCall = onFetchData || getAllPRMaterialPR;
            const response = await apiCall({
                index: currentIndex,
                limit,
                ...(searchTerm && { searchTerm })
            });

            let items: any[] = [];
            if (Array.isArray(response)) items = response;
            else if (response && Array.isArray(response.data)) items = response.data;
            else if (response && Array.isArray(response.lineItems)) items = response.lineItems;
            else items = response ? [response] : [];

            const processedItems = processItems(items);

            if (items.length === 0 || processedItems.length === 0) {
                setHasMore(false);
            } else {
                if (isNewSearch) {
                    setData(processedItems);
                } else {
                    setData(prev => {
                        const existing = new Set(prev.map(i => i.prNumber));
                        return [...prev, ...processedItems.filter(i => !existing.has(i.prNumber))];
                    });
                }
                setIndex(currentIndex + 10);
            }
        } catch (error: any) {
            if (error.status === 401) return;
            toast.error('Error fetching summary');
        } finally {
            setLoading(false);
            setIsLoadingMore(false);
        }
    }, [searchTerm, filterPrNumber]);

    const handleSearch = () => {
        setData([]); 
        setIndex(0); 
        setHasMore(true);
        setExpandedRows([]);
        isNewSearchRef.current = true;
        fetchData(0, true);
    };

    useEffect(() => { fetchData(0, true); }, []);
    
    useEffect(() => {
        if (searchTerm === '') {
            setData([]);
            setIndex(0);
            setHasMore(true);
            setExpandedRows([]);
            isNewSearchRef.current = true;
            fetchData(0, true);
        }
    }, [searchTerm]);

    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !loading && !isLoadingMore) {
                if (isNewSearchRef.current) { isNewSearchRef.current = false; return; }
                fetchData(index, false);
            }
        }, { threshold: 0.1 });

        const el = observerTarget.current;
        if (el) observer.observe(el);
        return () => { if (el) observer.unobserve(el); };
    }, [hasMore, loading, isLoadingMore, index, fetchData]);

    const toggleRow = (prNumber: string) => {
        setExpandedRows(prev =>
            prev.includes(prNumber) ? prev.filter(id => id !== prNumber) : [...prev, prNumber]
        );
    };

    /* ── Helpers for action payloads ───────────── */
    const buildPayload = (group: PrGroupedItem) => ({
        ...group.raw,
        lineItems: group.lineItems,
        prNumber: group.prNumber,
        status: group.status,
        needBy: group.needBy,
        headerComment: group.headerComment
    });

    /* ── Status badge class ────────────────────── */
    const statusClass = (status: string) => {
        if (!status) return 'pending';
        const s = status.toLowerCase();
        if (s === 'approved') return 'approved';
        if (s === 'rejected' || s === 'error') return 'inactive';
        return 'pending';
    };

    /* ── Render ────────────────────────────────── */
    return (
        <div className="pr-summary-wrapper animate-fade-in">

            {/* Header */}
            <div className="pr-summary-header">
                <div className="pr-summary-header__left">
                    <BackButton onClick={onBack} />
                    <h2 className="pr-summary-header__title">PR Summary</h2>
                </div>

                <div className="draft-search">
                    <input
                        ref={searchInputRef}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Search PR Number..."
                    />
                    <FaSearch
                        className="draft-search-icon"
                        onClick={handleSearch}
                        title="Search PR Number"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="summary-content">
                {loading && data.length === 0 ? (
                    <div className="draft-loader">
                        <div className="loading-text">Loading</div>
                    </div>
                ) : data.length === 0 ? (
                    <div className="no-items-message">No PR records found.</div>
                ) : (
                    <div className="draft-table-wrapper glass-panel">
                        <table className="line-items-table">
                            <thead>
                                <tr>
                                    <th style={{width:'100px'}}>PR Number</th>
                                    <th style={{width:'80px'}}>Line No.</th>
                                    <th style={{width:'100px'}}>Status</th>
                                    <th style={{width:'100px'}}>PO Number</th>
                                    <th style={{width:'110px'}}>{summaryType === 'service' ? 'SS ID' : 'Receipt ID'}</th>
                                    <th style={{width:'110px'}}>Invoice ID</th>
                                    <th style={{width:'180px'}}>Description</th>
                                    <th style={{width:'55px'}}>Qty</th>
                                    <th style={{width:'100px'}}>Need By</th>
                                    <th style={{width:'90px'}}>Amount</th>
                                    <th style={{width:'70px'}}>Actions</th>
                                    <th style={{width:'36px'}}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(group => {
                                    const isExpanded = expandedRows.includes(group.prNumber);
                                    const hasMultiple = group.lineItems.length > 1;

                                    return (
                                        <React.Fragment key={group.prNumber}>
                                            {/* Main row */}
                                            <tr className={isExpanded ? 'active-row' : ''}>
                                                <td style={{fontWeight:700, color:'#0064D2'}}>{group.prNumber}</td>

                                                <td>
                                                    {group.lineItemCount}
                                                </td>

                                                <td>
                                                    <span className={`status-badge ${statusClass(group.status)}`}>
                                                        {group.status || '—'}
                                                    </span>
                                                </td>

                                                <td title={group.poNumber}>
                                                    {group.poNumber ? (
                                                        <span className="badge badge-success">{group.poNumber}</span>
                                                    ) : '—'}
                                                </td>

                                              <td>
                                                    {summaryType === 'service' ? (
                                                        (group.ssid !== undefined && group.ssid !== null && group.ssid !== '') ? (
                                                            <span className="badge badge-success">{group.ssid}</span>
                                                        ) : (
                                                            <span className="badge badge-pending">Processing</span>
                                                        )
                                                    ) : (group.reciptID !== undefined && group.reciptID !== null && group.reciptID !== '') ? (
                                                        <span className="badge badge-success">{group.reciptID}</span>
                                                    ) : (
                                                        <span className="badge badge-pending">Processing</span>
                                                    )}
                                                </td>

                                                <td>
                                                    {group.extractedInvoiceNumber ? (
                                                        <span className="badge badge-success">{group.extractedInvoiceNumber}</span>
                                                    ) : group.autoInvoices ? (
                                                        <span className="badge badge-pending">Processing</span>
                                                    ) : '—'}
                                                </td>

                                                <td title={group.description}>{group.description}</td>
                                                <td>{group.quantity}</td>
                                                <td>{group.needBy ? new Date(group.needBy).toLocaleDateString() : '—'}</td>
                                                <td>{group.amount ? parseFloat(group.amount).toFixed(2) : '—'}</td>

                                                <td>
                                                    <div style={{display:'flex', gap:'6px', alignItems:'center'}}>
                                                        <button
                                                            className="btn-icon btn-edit-sm"
                                                            title="Edit"
                                                            onClick={() => onEdit(buildPayload(group))}
                                                        >
                                                            <FaEdit size={13} />
                                                        </button>
                                                        <button
                                                            className="btn-icon btn-edit-sm"
                                                            title="Copy / Resubmit"
                                                            onClick={() => {
                                                                const payload: any = buildPayload(group);
                                                                // clear top-level description so the target form starts empty
                                                                payload.description = '';
                                                                // also clear descriptions on each line item to be safe
                                                                if (Array.isArray(payload.lineItems)) {
                                                                    payload.lineItems = payload.lineItems.map((li: any) => ({ ...li, description: '' }));
                                                                }
                                                                onCopy(payload);
                                                            }}
                                                        >
                                                            <FaCopy size={13} />
                                                        </button>
                                                    </div>
                                                </td>

                                                <td style={{textAlign:'center'}}>
                                                    {hasMultiple && (
                                                        <button
                                                            className="btn-icon-sm"
                                                            title={isExpanded ? 'Collapse' : 'Expand'}
                                                            onClick={() => toggleRow(group.prNumber)}
                                                        >
                                                            {isExpanded ? <FaMinus /> : <FaPlus />}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* Expanded sub-rows */}
                                            {isExpanded && group.lineItems.slice(1).map((item: any, i: number) => (
                                                <tr key={`${group.prNumber}-${i}`} className="sub-row">
                                                    <td></td>
                                                    <td>{item.lineItemNumber || (i + 2)}</td>
                                                    <td>
                                                        <span className={`status-badge ${statusClass(item.status)}`}>
                                                            {item.status || '—'}
                                                        </span>
                                                    </td>
                                                    <td title={item.poNumber}>
                                                        {item.poNumber ? (
                                                            <span className="badge badge-success">{item.poNumber}</span>
                                                        ) : '—'}
                                                    </td>
                                                    <td>
                                                        {item.reciptID ? (
                                                            <span className="badge badge-success">{item.reciptID}</span>
                                                        ) : (
                                                            <span className="badge badge-pending">Processing</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {item.extractedInvoiceNumber ? (
                                                            <span className="badge badge-success">{item.extractedInvoiceNumber}</span>
                                                        ) : item.autoInvoices ? (
                                                            <span className="badge badge-pending">Processing</span>
                                                        ) : '—'}
                                                    </td>
                                                    <td title={item.description}>{item.description}</td>
                                                    <td>{item.quantity}</td>
                                                    <td>{item.needBy ? new Date(item.needBy).toLocaleDateString() : '—'}</td>
                                                    <td>{(item.amount || item.Price) ? parseFloat(item.amount || item.Price).toFixed(2) : '—'}</td>
                                                    <td></td>
                                                    <td></td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Infinite scroll trigger */}
                        {hasMore && (
                            <div ref={observerTarget} className="draft-loader">
                                {isLoadingMore && <div className="loading-text">Loading more records</div>}
                            </div>
                        )}

                        {/* End of list */}
                        {!hasMore && data.length > 0 && (
                            <div className="end-of-list">No more records to load</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PrSummary;