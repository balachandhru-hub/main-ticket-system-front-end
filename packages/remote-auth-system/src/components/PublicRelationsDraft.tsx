import React, { useEffect, useState, useRef, useCallback } from 'react';
import {


    FaPlus,
    FaMinus,
    FaEdit,
    FaSearch
} from 'react-icons/fa';
import {
    getAllDraftMaterialPR,
    fetchAssetsBulk
} from '../api/prEntertainmentApi';
import { toast } from 'react-toastify';
import './PrDraft.css';
import BackButton from './BackButton';

/* =======================
   Types
======================= */

interface PrDraftProps {
    onBack: () => void;
    onEdit: (data: any) => void;
    onCopy: (data: any) => void;
    filterPrNumber?: string | null;
}

interface DraftRow {
    draftID: number;
    status: string;
    needBy: string;
    description: string;
    quantity: number;
    amount: number;
    vendorName: string;
    errorComment: string;
    vendor: string;
    lineItems: any[];
    raw: any;
}

/* =======================
   Constants
======================= */

const PAGE_SIZE = 10; // Always fetch 10 records at a time

/* =======================
   Helper Functions
======================= */

/**
 * Convert base64 string to File object (PDF)
 */
const base64ToFile = (base64: string, fileName: string, contentType: string = 'application/pdf'): File => {
    // Remove data URL prefix if present
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;

    // Convert base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // Create blob and convert to File
    const blob = new Blob([bytes], { type: contentType });
    return new File([blob], fileName, { type: contentType });
};

/**
 * Normalize content type to valid MIME type
 */
const getMimeType = (contentType: string, fileName: string): string => {
    if (!contentType) {
        // deduce from extension
        if (fileName) {
            const ext = fileName.split('.').pop()?.toLowerCase();
            if (ext === 'pdf') return 'application/pdf';
            if (ext === 'png') return 'image/png';
            if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
            if (ext === 'txt') return 'text/plain';
            if (ext === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            if (ext === 'xls') return 'application/vnd.ms-excel';
        }
        return 'application/pdf'; // Fallback
    }

    const type = contentType.toUpperCase();
    if (type === 'PDF' || type.includes('PDF')) return 'application/pdf';
    if (type === 'PNG' || type.includes('PNG')) return 'image/png';
    if (type === 'JPG' || type === 'JPEG' || type.includes('JPG')) return 'image/jpeg';
    if (type === 'TXT') return 'text/plain';

    // If it already looks like a mime type (has /), return it
    if (contentType.includes('/')) return contentType;

    return contentType;
};

/* =======================
   Component
======================= */

const PublicRelationsDraft: React.FC<PrDraftProps> = ({
    onBack,
    onCopy,
    filterPrNumber
}) => {

    const [data, setData] = useState<DraftRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const [currentIndex, setCurrentIndex] = useState(0); // Track index (0, 10, 20, 30...)
    const [expandedRows, setExpandedRows] = useState<number[]>([]);

    const [searchDraftId, setSearchDraftId] = useState('');

    const observerTarget = useRef<HTMLDivElement>(null);

    /* =======================
       Helpers
    ======================= */

    const mapResponse = (items: any[]): DraftRow[] =>
        items.map(item => {
            const firstLine = item.lineItems?.[0] || {};
            return {
                draftID: item.draftID,
                status: 'Draft',
                needBy: item.needBy,
                description: firstLine.description || '',
                quantity: firstLine.quantity || 0,
                amount: firstLine.amount || 0,
                vendorName: firstLine.vendorName || '',
                vendor: firstLine.vendor || firstLine.vendorId || firstLine.Vendor || firstLine.VendorId,
                errorComment: firstLine.errorComment || '',
                lineItems: item.lineItems || [],
                raw: item
            };
        });

    /* =======================
       Fetch and Process Attachments (OPTIMIZED with Bulk API)
    ======================= */

    const fetchAndProcessAttachments = async (rawData: any): Promise<{
        headerPdfFiles: File[];
        invoiceMapping: { [lineItemNumber: number]: File[] };
    }> => {
        const result = {
            headerPdfFiles: [] as File[],
            invoiceMapping: {} as { [lineItemNumber: number]: File[] }
        };

        try {
            // STEP 1: Collect all header attachment IDs
            const headerIds: string[] = [];
            if (rawData.headerAttachments && rawData.headerAttachments.length > 0) {
                rawData.headerAttachments.forEach((att: any) => {
                    if (att.id) headerIds.push(att.id);
                });
            }

            // STEP 2: Collect all invoice attachment IDs with line item mapping
            // IMPORTANT: Keep duplicates - same attachment might be on multiple line items
            const invoiceIdsMap: { [assetId: string]: number[] } = {}; // Changed to array to track multiple line items
            const invoiceIds: string[] = [];

            if (rawData.lineItems && rawData.lineItems.length > 0) {
                rawData.lineItems.forEach((lineItem: any, index: number) => {
                    const lineItemNumber = lineItem.lineItemNumber || lineItem.numberInCollection || (index + 1);

                    // Check for invoice attachments in the line item
                    if (lineItem.invoiceAttachments && lineItem.invoiceAttachments.length > 0) {
                        lineItem.invoiceAttachments.forEach((att: any) => {
                            if (att.id) {
                                invoiceIds.push(att.id); // Keep duplicates

                                // Track which line items this attachment belongs to
                                if (!invoiceIdsMap[att.id]) {
                                    invoiceIdsMap[att.id] = [];
                                }
                                invoiceIdsMap[att.id].push(lineItemNumber);
                            }
                        });
                    }

                    // Also check for invoiceAttachment field (alternative structure)
                    if (lineItem.invoiceAttachment && Array.isArray(lineItem.invoiceAttachment)) {
                        lineItem.invoiceAttachment.forEach((att: any) => {
                            if (att.id) {
                                invoiceIds.push(att.id); // Keep duplicates

                                if (!invoiceIdsMap[att.id]) {
                                    invoiceIdsMap[att.id] = [];
                                }
                                invoiceIdsMap[att.id].push(lineItemNumber);
                            }
                        });
                    }
                });
            }

            // STEP 3: Fetch ALL attachments in ONE bulk request ✅
            const allAssetIds = [...headerIds, ...invoiceIds];

            if (allAssetIds.length > 0) {
                toast.info(`Fetching ${allAssetIds.length} attachment(s) in bulk...`);

                // Single bulk API call
                const allAssets = await fetchAssetsBulk(allAssetIds);

                // Create a lookup map for faster access by ID and to handle out-of-order or deduped responses
                const assetMap = new Map();
                if (Array.isArray(allAssets)) {
                    allAssets.forEach((asset: any) => {
                        if (asset.assetId) {
                            assetMap.set(asset.assetId, asset);
                        }
                    });
                }

                // STEP 4: Process header assets
                headerIds.forEach((id) => {
                    const asset = assetMap.get(id);
                    if (asset) {
                        const file = base64ToFile(
                            asset.fileBytes,
                            asset.fileName || `header_${asset.assetId}.pdf`,
                            getMimeType(asset.contentType, asset.fileName)
                        );
                        result.headerPdfFiles.push(file);
                    }
                });

                // STEP 5: Process invoice assets using the map
                // Iterate through our known invoice IDs map to ensure all requests are handled if data exists
                Object.keys(invoiceIdsMap).forEach((assetId) => {
                    const asset = assetMap.get(assetId);
                    if (asset) {
                        const lineItemNumbers = invoiceIdsMap[assetId] || [];

                        lineItemNumbers.forEach((lineItemNumber) => {
                            const pdfFile = base64ToFile(
                                asset.fileBytes,
                                asset.fileName || `invoice_line${lineItemNumber}_${asset.assetId}.pdf`,
                                getMimeType(asset.contentType, asset.fileName)
                            );

                            if (!result.invoiceMapping[lineItemNumber]) {
                                result.invoiceMapping[lineItemNumber] = [];
                            }
                            result.invoiceMapping[lineItemNumber].push(pdfFile);
                        });
                    }
                });
            }

            return result;

        } catch (error: any) {

            if (error?.status === 401) {

            }
            // Don't throw - return empty result to allow copy without attachments
            toast.warn('Failed to fetch some attachments');
            return result;
        }
    };

    /* =======================
       API Fetch
    ======================= */

    const fetchData = useCallback(
        async (index = 0, isNew = false) => {
            isNew ? setLoading(true) : setIsLoadingMore(true);

            try {
                const response = await getAllDraftMaterialPR({
                    index: index, // 0, 10, 20, 30...
                    limit: PAGE_SIZE, // Always 10
                    ...(searchDraftId && { searchTerm: searchDraftId }),
                    ...(filterPrNumber && !searchDraftId && { searchTerm: filterPrNumber })
                });

                const items = Array.isArray(response)
                    ? response
                    : Array.isArray(response?.data)
                        ? response.data
                        : [];

                const mapped = mapResponse(items);

                if (isNew) {
                    setData(mapped);
                } else {
                    setData(prev => {
                        const existing = new Set(prev.map(d => d.draftID));
                        return [...prev, ...mapped.filter(m => !existing.has(m.draftID))];
                    });
                }

                // Increment index by PAGE_SIZE (10) for next fetch
                setCurrentIndex(index + PAGE_SIZE);

                // If we got less than PAGE_SIZE items, no more data
                if (items.length < PAGE_SIZE) {
                    setHasMore(false);
                }
            } catch (err: any) {
                if (err?.response?.status === 401) return;
                else toast.error('Failed to fetch drafts');
                setHasMore(false);
            } finally {
                setLoading(false);
                setIsLoadingMore(false);
            }
        },
        [searchDraftId, filterPrNumber]
    );

    /* =======================
       Effects
    ======================= */

    useEffect(() => {
        fetchData(0, true);
    }, []);

    useEffect(() => {
        if (searchDraftId === '') {
            setCurrentIndex(0);
            setHasMore(true);
            fetchData(0, true);
        }
    }, [searchDraftId]);

    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !loading && !isLoadingMore) {
                fetchData(currentIndex); // Fetch next batch (index will be 10, 20, 30...)
            }
        });

        const el = observerTarget.current;
        if (el) observer.observe(el);

        return () => {
            if (el) observer.unobserve(el);
        };
    }, [hasMore, loading, isLoadingMore, currentIndex, fetchData]);

    /* =======================
       Actions
    ======================= */

    const handleSearch = () => {
        // Reset pagination when searching
        setCurrentIndex(0);
        setHasMore(true);
        // Fetch from the beginning with the search term
        fetchData(0, true);
    };

    const toggleRow = (id: number) => {
        setExpandedRows(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleCopyWithAttachments = async (row: DraftRow) => {
        try {
            toast.info('Processing draft...');

            const rawData = row.raw;

            const { headerPdfFiles, invoiceMapping } = await fetchAndProcessAttachments(rawData);

            // Prepare enriched data to pass to PrEntertainment
            const enrichedData = {
                ...rawData,
                // Header PDFs (same for all line items)
                headerAttachmentFiles: headerPdfFiles,

                // Invoice mapping (line item number -> PDF files)
                invoiceMapping: invoiceMapping,

                // Enrich line items with their specific invoice PDFs
                lineItems: rawData.lineItems.map((lineItem: any, index: number) => {
                    const lineItemNumber = lineItem.lineItemNumber || lineItem.numberInCollection || (index + 1);
                    return {
                        ...lineItem,
                        // Add invoice PDFs for this specific line item
                        invoiceAttachmentFiles: invoiceMapping[lineItemNumber] || [],
                        lineItemNumber: lineItemNumber
                    };
                })
            };
            onCopy(enrichedData);

            const totalAttachments = headerPdfFiles.length + Object.values(invoiceMapping).reduce((sum, files) => sum + files.length, 0);
            toast.success(
                `Draft copied successfully${totalAttachments > 0 ? ` with ${totalAttachments} attachment(s)` : ''}!`
            );

        } catch (error) {
            toast.error('Failed to copy draft');
        }
    };

    return (
        <div className="draft-container animate-fade-in">
            <div className="draft-header">
                <div className="button-btn">
                    <BackButton onClick={onBack} />
                </div>

                <h2 className="draft-title">PR Drafts</h2>

                <div className="draft-search">
                    <input
                        value={searchDraftId}
                        onChange={e => setSearchDraftId(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Search Draft ID..."
                    />
                    <FaSearch
                        className="draft-search-icon"
                        onClick={handleSearch}
                        style={{ cursor: 'pointer' }}
                        title="Search drafts"
                    />
                </div>


            </div>

            <div className="draft-table-wrapper glass-panel">
                <table className="draft-table">
                    <thead>
                        <tr>
                            <th style={{ width: '90px' }}>PR Draft</th>
                            <th style={{ width: '80px' }}>Line Item</th>
                            <th style={{ width: '180px' }}>Description</th>
                            <th style={{ width: '160px' }}>Vendor Name</th>
                            <th style={{ width: '50px' }}>Qty</th>
                            <th style={{ width: '100px' }}>Need By</th>
                            <th style={{ width: '90px' }}>Amount</th>
                            <th style={{ width: '180px' }}>Error Comment</th>
                            <th style={{ width: '60px' }}>Actions</th>
                            <th style={{ width: '40px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(row => {
                            const expanded = expandedRows.includes(row.draftID);
                            return (
                                <React.Fragment key={row.draftID}>
                                    <tr className={expanded ? 'active-row' : ''}>
                                        <td className="draft-id">{row.draftID}</td>
                                        <td >
                                            {row.lineItems.length }
                                        </td>
                                        <td title={row.description}>{row.description}</td>
                                        <td title={row.vendorName || row.vendor}>{row.vendorName || row.vendor}</td>
                                        <td >{row.quantity}</td>
                                        <td title={row.needBy ? new Date(row.needBy).toLocaleDateString() : '-'}>{row.needBy ? new Date(row.needBy).toLocaleDateString() : '-'}</td>
                                        <td title={row.amount.toFixed(2)}>{row.amount.toFixed(2)}</td>
                                        <td title={row.errorComment}>{row.errorComment}</td>
                                        <td className="draft-actions">
                                            <FaEdit
                                                onClick={() => handleCopyWithAttachments(row)}
                                                style={{ cursor: 'pointer' }}
                                                title="Copy draft with attachments"
                                            />
                                        </td>
                                        <td>
                                            {row.lineItems.length > 1 && (
                                                <button
                                                    className="draft-btn-icon-sm"
                                                    onClick={() => toggleRow(row.draftID)}
                                                >
                                                    {expanded ? <FaMinus /> : <FaPlus />}
                                                </button>
                                            )}
                                        </td>
                                    </tr>

                                    {expanded &&
                                        row.lineItems.slice(1).map((li: any, i: number) => (
                                            <tr key={i} className="draft-sub-row">
                                                <td></td>
                                                <td>{li.lineItemNumber || li.numberInCollection || (i + 2)}</td>
                                                <td className="truncate-text">{li.description}</td>
                                                <td>{li.vendorName || li.vendor}</td>
                                                <td>{li.quantity}</td>
                                                <td>{row.needBy ? new Date(row.needBy).toLocaleDateString() : '-'}</td>
                                                <td>{li.amount?.toFixed(2)}</td>
                                                <td></td>
                                                <td></td>
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
                            <div className="loading-dots">
                                Loading more records...<span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicRelationsDraft;