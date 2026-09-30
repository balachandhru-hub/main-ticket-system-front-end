import React, { useEffect, useState, useRef, useCallback } from 'react';
import { FaPlus, FaMinus, FaEdit, FaCopy, FaSearch } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './PrEntertainment.css';
import BackButton from "./BackButton";
import './PrSummary.css';
import { getAllServicePR } from '../api/serviceRelationsApi';

interface PublicRelationsSummaryProps {
    onBack: () => void;
    onEdit: (data: any) => void;
    onCopy: (data: any) => void;
    filterPrNumber?: string | null;
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
    ssid: string,
    poNumber: string,
    extractedInvoiceNumber: string;
    lineItems: any[];
    raw: any;
    autoInvoices: boolean;
}

const ServiceRelationsSummary: React.FC<PublicRelationsSummaryProps> = ({ onBack, onEdit, onCopy, filterPrNumber }) => {
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
    const limit = 50;

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
                        prNumber: prNumber,
                        PRNumber: prNumber,
                        status: item.status || item.Status,
                        needBy: item.needBy || item.NeedBy,
                        headerComment: item.headerComment || item.HeaderComment,
                        lineItems: lineItems,
                        LineItems: lineItems
                    };

                    groupedMap[prNumber] = {
                        prNumber: prNumber,
                        lineNumber: firstLine.lineItemNumber || firstLine.LineItemNumber,
                        lineItemCount: lineItems.length,
                        status: item.status || item.Status,
                        needBy: item.needBy || item.NeedBy,
                        description: firstLine.description || firstLine.Description || item.description || item.Description,
                        headerComment: item.headerComment || item.HeaderComment,
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

    const fetchData = useCallback(async (currentIndex: number = 0, isNewSearch: boolean = false) => {
        if (isNewSearch) {
            setLoading(true);
        } else {
            setIsLoadingMore(true);
        }

        try {
            const response = await getAllServicePR({
                index: currentIndex,
                limit: limit,
                ...(searchTerm && { searchTerm })
            });

            let items: any[] = [];
            if (Array.isArray(response)) {
                items = response;
            } else if (response && Array.isArray(response.data)) {
                items = response.data;
            } else if (response && Array.isArray(response.lineItems)) {
                items = response.lineItems;
            } else {
                items = response ? [response] : [];
            }

            const processedItems = processItems(items);

            if (items.length === 0 || processedItems.length === 0) {
                setHasMore(false);
            } else {
                if (isNewSearch) {
                    setData(processedItems);
                } else {
                    setData(prev => {
                        const existingPrNumbers = new Set(prev.map(item => item.prNumber));
                        const newItems = processedItems.filter(item => !existingPrNumbers.has(item.prNumber));
                        return [...prev, ...newItems];
                    });
                }
                setIndex(currentIndex + 10);
            }
        } catch (error: any) {
            if (error.status === 401) {
              
            }
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
        isNewSearchRef.current = true;
        setExpandedRows([]);
        fetchData(0, true);
    };

    useEffect(() => {
        fetchData(0, true);
    }, []);

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
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loading && !isLoadingMore) {
                    if (isNewSearchRef.current) {
                        isNewSearchRef.current = false;
                        return;
                    }
                    fetchData(index, false);
                }
            },
            { threshold: 0.1 }
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [hasMore, loading, isLoadingMore, index, fetchData]);

    const toggleRow = (prNumber: string) => {
        setExpandedRows(prev =>
            prev.includes(prNumber)
                ? prev.filter(id => id !== prNumber)
                : [...prev, prNumber]
        );
    };


    return (
       <div className="pr-entertainment-form animate-fade-in pr-summary-wrapper">
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
                        style={{ cursor: 'pointer' }}
                        title="Search PR Number"
                    />
                </div>
       
           </div>

            <div className="summary-content">
            {loading && data.length === 0 ? (
                <div className="draft-loader">
                    <div className="loading-text">Loading</div>
                </div>
            ) : data.length === 0 ? (
                <div className="no-items-message">
                    No PR records found.
                </div>
            ) : (
                <div className="draft-table-wrapper glass-panel">
                    <table className="line-items-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '100px' }}>PR Number</th>
                                    <th style={{ width: '80px' }}>Line No.</th>
                                    <th style={{ width: '140px' }}>Status</th>
                                    <th style={{ width: '100px' }}>PO Number</th>
                                    <th style={{ width: '110px' }}>SS ID</th>
                                    <th style={{ width: '110px' }}>Invoice ID</th>
                                    <th style={{ width: '180px' }}>Description</th>
                                    <th style={{ width: '55px' }}>Qty</th>
                                    <th style={{ width: '100px' }}>Need By</th>
                                    <th style={{ width: '90px' }}>Amount</th>
                                    <th style={{ width: '70px' }}>Actions</th>
                                    <th style={{ width: '36px' }}></th>
                                </tr>
                            </thead>
                        <tbody>
                            {data.map((group) => {
                                const isExpanded = expandedRows.includes(group.prNumber);
                                const hasMultiple = group.lineItems.length > 1;

                                return (
                                    <React.Fragment key={group.prNumber}>
                                        <tr className={isExpanded ? 'active-row' : ''}>
                                            <td style={{ fontWeight: 'bold', color: '#111827' }}>{group.prNumber}</td>
                                            <td>
                                               {group.lineItemCount} 
                                            </td>
                                            <td>
                                                <span className={`status-badge ${group.status && group.status.toLowerCase() === 'approved' ? 'active' : 'pending'}`}>
                                                    {group.status}
                                                </span>
                                            </td>
                                            <td title={group.poNumber}>
                                                {group.poNumber && (
                                                    <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85em', fontWeight: 600 }}>
                                                        {group.poNumber}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                {group.ssid ? (
                                                    <span className="badge badge-success">{group.ssid}</span>
                                                ) : (
                                                    <span className="badge badge-pending">Still Processing</span>

                                                )}
                                            </td>
                                            <td>
                                                {group.extractedInvoiceNumber ? (
                                                    <span className="badge badge-success">{group.extractedInvoiceNumber}</span>
                                                ) : group.autoInvoices ? (
                                                    <span className="badge badge-pending">Still Processing</span>
                                                ) : null}
                                            </td>
                                            <td className="truncate-text" title={group.description}>{group.description}</td>
                                            <td>{group.quantity}</td>
                                            <td>{group.needBy ? new Date(group.needBy).toLocaleDateString() : '-'}</td>
                                            <td>{group.amount ? `${parseFloat(group.amount).toFixed(2)}` : '-'}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button
                                                        onClick={() => {
                                                            const dataToEdit = {
                                                                ...group.raw,
                                                                lineItems: group.lineItems,
                                                                prNumber: group.prNumber,
                                                                status: group.status,
                                                                needBy: group.needBy,
                                                                headerComment: group.headerComment
                                                            };
                                                            onEdit(dataToEdit);
                                                        }}
                                                        className="btn-icon btn-edit-sm"
                                                        title="Edit"
                                                        style={{ border: 'none', background: 'transparent', color: '#006eed', cursor: 'pointer' }}
                                                    >
                                                        <FaEdit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const dataToCopy = {
                                                                ...group.raw,
                                                                lineItems: group.lineItems,
                                                                prNumber: group.prNumber,
                                                                status: group.status,
                                                                needBy: group.needBy,
                                                                headerComment: group.headerComment
                                                            };
                                                            onCopy(dataToCopy);
                                                        }}
                                                        className="btn-icon btn-edit-sm"
                                                        title="Copy/Resubmit"
                                                        style={{ border: 'none', background: 'transparent', color: '#006eed', cursor: 'pointer' }}
                                                    >
                                                        <FaCopy size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td>
                                                {hasMultiple && (
                                                    <button
                                                        onClick={() => toggleRow(group.prNumber)}
                                                        className="draft-btn-icon-sm"
                                                        title={isExpanded ? "Collapse" : "Expand"}
                                                    >
                                                        {isExpanded ? <FaMinus /> : <FaPlus />}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                        {isExpanded && group.lineItems.slice(1).map((item: any, i: number) => (
                                            <tr key={`${group.prNumber}-line-${i}`} style={{ backgroundColor: '#f9fafb' }}>
                                                <td></td>
                                                <td>{item.lineItemNumber}</td>
                                                <td>
                                                    <span className={`status-badge ${item.status && item.status.toLowerCase() === 'approved' ? 'active' : 'pending'}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td title={item.poNumber}>
                                                    {item.poNumber && (
                                                         <span className="badge badge-success">{item.poNumber}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {item.ssid ? (
                                                         <span className="badge badge-success">{item.ssid}</span>
                                                    ) : (
                                                        <span className="badge badge-pending">Still Processing</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {item.extractedInvoiceNumber ? (
                                                        <span className="badge badge-success">{item.extractedInvoiceNumber}</span>
                                                    ) : item.autoInvoices ? (
                                                        <span className="badge badge-pending">Still Processing</span>
                                                    ) : null}
                                                </td>
                                                <td className="truncate-text" title={item.description}>{item.description}</td>
                                                <td>{item.quantity}</td>
                                                <td>{item.needBy ? new Date(item.needBy).toLocaleDateString() : '-'}</td>
                                                <td>{(item.amount || item.Price) ? `${parseFloat(item.amount || item.Price).toFixed(2)}` : '-'}</td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>

                    {hasMore && (
                        <div ref={observerTarget} className="draft-loader">
                            {isLoadingMore && (
                                <div className="loading-text">Loading more records...</div>
                            )}
                        </div>
                    )}

                    {!hasMore && data.length > 0 && (
                        <div style={{ padding: '1.25rem', textAlign: 'center', color: '#9ca3af' }}>
                            No more records to load
                        </div>
                    )}
                </div>
            )}
            </div>
        </div>
    );
};

export default ServiceRelationsSummary;