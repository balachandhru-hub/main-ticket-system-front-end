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

/* ── Types ─────────────────────────────────────── */
interface PrDraftProps {
    onBack: () => void;
    onEdit: (data: any) => void;
    onCopy: (data: any) => void;
    filterPrNumber?: string | null;
    onFetchData?: (params: any) => Promise<any>;
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

/* ── Constants ─────────────────────────────────── */
const PAGE_SIZE = 10;

/* ── Helpers ───────────────────────────────────── */
const base64ToFile = (base64: string, fileName: string, contentType: string = 'application/pdf'): File => {
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    const blob = new Blob([bytes], { type: contentType });
    return new File([blob], fileName, { type: contentType });
};

const getMimeType = (contentType: string, fileName: string): string => {
    if (!contentType) {
        if (fileName) {
            const ext = fileName.split('.').pop()?.toLowerCase();
            if (ext === 'pdf') return 'application/pdf';
            if (ext === 'png') return 'image/png';
            if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
            if (ext === 'txt') return 'text/plain';
            if (ext === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            if (ext === 'xls') return 'application/vnd.ms-excel';
        }
        return 'application/pdf';
    }
    const type = contentType.toUpperCase();
    if (type === 'PDF' || type.includes('PDF')) return 'application/pdf';
    if (type === 'PNG' || type.includes('PNG')) return 'image/png';
    if (type === 'JPG' || type === 'JPEG' || type.includes('JPG')) return 'image/jpeg';
    if (type === 'TXT') return 'text/plain';
    if (contentType.includes('/')) return contentType;
    return contentType;
};

/* ── Component ─────────────────────────────────── */
const PrDraft: React.FC<PrDraftProps> = ({ onBack, onCopy, filterPrNumber, onFetchData }) => {

    const [data, setData] = useState<DraftRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [expandedRows, setExpandedRows] = useState<number[]>([]);
    const [searchDraftId, setSearchDraftId] = useState('');
    const observerTarget = useRef<HTMLDivElement>(null);

    /* ── Map response ─────────────────────────── */
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

    /* ── Fetch attachments ─────────────────────── */
    const fetchAndProcessAttachments = async (rawData: any): Promise<{
        headerPdfFiles: File[];
        invoiceMapping: { [lineItemNumber: number]: File[] };
    }> => {
        const result = { headerPdfFiles: [] as File[], invoiceMapping: {} as { [lineItemNumber: number]: File[] } };
        try {
            const headerIds: string[] = [];
            if (rawData.headerAttachments?.length > 0) rawData.headerAttachments.forEach((att: any) => { if (att.id) headerIds.push(att.id); });

            const invoiceIdsMap: { [assetId: string]: number[] } = {};
            const invoiceIds: string[] = [];

            if (rawData.lineItems?.length > 0) {
                rawData.lineItems.forEach((lineItem: any, index: number) => {
                    const lineItemNumber = lineItem.lineItemNumber || lineItem.numberInCollection || (index + 1);
                    const addId = (att: any) => {
                        if (att.id) {
                            invoiceIds.push(att.id);
                            if (!invoiceIdsMap[att.id]) invoiceIdsMap[att.id] = [];
                            invoiceIdsMap[att.id].push(lineItemNumber);
                        }
                    };
                    lineItem.invoiceAttachments?.forEach(addId);
                    if (Array.isArray(lineItem.invoiceAttachment)) lineItem.invoiceAttachment.forEach(addId);
                });
            }

            const allAssetIds = [...headerIds, ...invoiceIds];
            if (allAssetIds.length > 0) {
                toast.info(`Fetching ${allAssetIds.length} attachment(s) in bulk...`);
                const allAssets = await fetchAssetsBulk(allAssetIds);
                const assetMap = new Map();
                if (Array.isArray(allAssets)) allAssets.forEach((asset: any) => { if (asset.assetId) assetMap.set(asset.assetId, asset); });

                headerIds.forEach(id => {
                    const asset = assetMap.get(id);
                    if (asset) result.headerPdfFiles.push(base64ToFile(asset.fileBytes, asset.fileName || `header_${asset.assetId}.pdf`, getMimeType(asset.contentType, asset.fileName)));
                });

                Object.keys(invoiceIdsMap).forEach(assetId => {
                    const asset = assetMap.get(assetId);
                    if (asset) {
                        invoiceIdsMap[assetId].forEach(lineItemNumber => {
                            const pdfFile = base64ToFile(asset.fileBytes, asset.fileName || `invoice_line${lineItemNumber}_${asset.assetId}.pdf`, getMimeType(asset.contentType, asset.fileName));
                            if (!result.invoiceMapping[lineItemNumber]) result.invoiceMapping[lineItemNumber] = [];
                            result.invoiceMapping[lineItemNumber].push(pdfFile);
                        });
                    }
                });
            }
            return result;
        } catch (error: any) {
            if (error?.status === 401) return result;
            toast.warn('Failed to fetch some attachments');
            return result;
        }
    };

    /* ── Fetch data ────────────────────────────── */
    const fetchData = useCallback(async (index = 0, isNew = false) => {
        isNew ? setLoading(true) : setIsLoadingMore(true);
        try {
            const apiCall = onFetchData || getAllDraftMaterialPR;
            const response = await apiCall({
                index,
                limit: PAGE_SIZE,
                ...(searchDraftId && { searchTerm: searchDraftId }),
                ...(filterPrNumber && !searchDraftId && { searchTerm: filterPrNumber })
            });
            const items = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
            const mapped = mapResponse(items);
            if (isNew) {
                setData(mapped);
            } else {
                setData(prev => { const existing = new Set(prev.map(d => d.draftID)); return [...prev, ...mapped.filter(m => !existing.has(m.draftID))]; });
            }
            setCurrentIndex(index + PAGE_SIZE);
            if (items.length < PAGE_SIZE) setHasMore(false);
        } catch (err: any) {
            if (err?.response?.status === 401) return;
            else toast.error('Failed to fetch drafts');
            setHasMore(false);
        } finally {
            setLoading(false);
            setIsLoadingMore(false);
        }
    }, [searchDraftId, filterPrNumber]);

    useEffect(() => { fetchData(0, true); }, []);

    useEffect(() => {
        if (searchDraftId === '') {
            setCurrentIndex(0);
            setHasMore(true);
            fetchData(0, true);
        }
    }, [searchDraftId]);

    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !loading && !isLoadingMore) fetchData(currentIndex);
        });
        const el = observerTarget.current;
        if (el) observer.observe(el);
        return () => { if (el) observer.unobserve(el); };
    }, [hasMore, loading, isLoadingMore, currentIndex, fetchData]);

    /* ── Actions ───────────────────────────────── */
    const handleSearch = () => { setCurrentIndex(0); setHasMore(true); fetchData(0, true); };
    const toggleRow = (id: number) => { setExpandedRows(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };

    const handleCopyWithAttachments = async (row: DraftRow) => {
        try {
            toast.info('Processing draft...');
            const rawData = row.raw;
            const { headerPdfFiles, invoiceMapping } = await fetchAndProcessAttachments(rawData);
            const enrichedData = {
                ...rawData,
                headerAttachmentFiles: headerPdfFiles,
                invoiceMapping,
                lineItems: rawData.lineItems.map((lineItem: any, index: number) => {
                    const lineItemNumber = lineItem.lineItemNumber || lineItem.numberInCollection || (index + 1);
                    return { ...lineItem, invoiceAttachmentFiles: invoiceMapping[lineItemNumber] || [], lineItemNumber };
                })
            };
            onCopy(enrichedData);
            const totalAttachments = headerPdfFiles.length + Object.values(invoiceMapping).reduce((sum, files) => sum + files.length, 0);
            toast.success(`Draft copied successfully${totalAttachments > 0 ? ` with ${totalAttachments} attachment(s)` : ''}!`);
        } catch (error) {
            toast.error('Failed to copy draft');
        }
    };

    /* ── Render ────────────────────────────────── */
    return (
        <div className="draft-container animate-fade-in">

            {/* ── Header ── */}
            <div className="draft-header">
                <div className="draft-header__left">
                    <BackButton onClick={onBack} />
                    <h2 className="draft-title">PR Drafts</h2>
                </div>

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
                        title="Search drafts"
                    />
                </div>
            </div>

            {/* ── Table ── */}
            <div className="draft-table-wrapper glass-panel">
                <table className="draft-table">
                    <thead>
                        <tr>
                            <th style={{width:'90px'}}>PR Draft</th>
                            <th style={{width:'80px'}}>Line Item</th>
                            <th style={{width:'180px'}}>Description</th>
                            <th style={{width:'160px'}}>Vendor Name</th>
                            <th style={{width:'50px'}}>Qty</th>
                            <th style={{width:'100px'}}>Need By</th>
                            <th style={{width:'90px'}}>Amount</th>
                            <th style={{width:'180px'}}>Error Comment</th>
                            <th style={{width:'60px'}}>Actions</th>
                            <th style={{width:'40px'}}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && data.length === 0 ? (
                            <tr>
                                <td colSpan={10} style={{textAlign:'center', padding:'24px', color:'#0064D2', fontWeight:600}}>
                                    Loading drafts...
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={10} style={{textAlign:'center', padding:'24px', color:'#8C8C8C', fontStyle:'italic'}}>
                                    No draft records found.
                                </td>
                            </tr>
                        ) : data.map(row => {
                            const expanded = expandedRows.includes(row.draftID);
                            return (
                                <React.Fragment key={row.draftID}>
                                    <tr className={expanded ? 'active-row' : ''}>
                                        <td className="draft-id">{row.draftID}</td>
                                        <td>
                                           {row.lineItems.length}
                                        </td>
                                        <td title={row.description}>{row.description}</td>
                                        <td title={row.vendorName || row.vendor}>{row.vendorName || row.vendor}</td>
                                        <td>{row.quantity}</td>
                                        <td title={row.needBy ? new Date(row.needBy).toLocaleDateString() : '-'}>
                                            {row.needBy ? new Date(row.needBy).toLocaleDateString() : '-'}
                                        </td>
                                        <td title={row.amount.toFixed(2)}>{row.amount.toFixed(2)}</td>
                                        <td title={row.errorComment}>{row.errorComment}</td>
                                        <td className="draft-actions">
                                            <FaEdit
                                                onClick={() => handleCopyWithAttachments(row)}
                                                title="Copy draft with attachments"
                                            />
                                        </td>
                                        <td style={{textAlign:'center'}}>
                                            {row.lineItems.length > 1 && (
                                                <button
                                                    className="draft-btn-icon-sm"
                                                    onClick={() => toggleRow(row.draftID)}
                                                    title={expanded ? 'Collapse' : 'Expand'}
                                                >
                                                    {expanded ? <FaMinus /> : <FaPlus />}
                                                </button>
                                            )}
                                        </td>
                                    </tr>

                                    {expanded && row.lineItems.slice(1).map((li: any, i: number) => (
                                        <tr key={i} className="draft-sub-row">
                                            <td></td>
                                            <td>{li.lineItemNumber || li.numberInCollection || (i + 2)}</td>
                                            <td title={li.description}>{li.description}</td>
                                            <td>{li.vendorName || li.vendor}</td>
                                            <td>{li.quantity}</td>
                                            <td>{row.needBy ? new Date(row.needBy).toLocaleDateString() : '-'}</td>
                                            <td>{li.amount?.toFixed(2)}</td>
                                            <td></td>
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
                        {isLoadingMore && (
                            <div className="loading-dots">
                                Loading more records
                                <span className="dot">.</span>
                                <span className="dot">.</span>
                                <span className="dot">.</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

        </div>
    );
};

export default PrDraft;