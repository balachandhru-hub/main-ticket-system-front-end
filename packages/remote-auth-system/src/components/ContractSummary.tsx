import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Contract.css';
import { getAllEasyContracts } from '../api/ContractApi';

interface Contract {
  name: string;
  supplier: string;
  cOntractStatus?: string;
  contractId?: string;
  [key: string]: any;
}


function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
const PAGE_LIMIT = 10;

const columns = [
  { key: 'contractId', label: 'ID' },
  { key: 'name',       label: 'Title' },
  { key: 'supplier',   label: 'Vendor' },
  { key: 'status',     label: 'Status' },
];

const ContractSummary: React.FC = () => {
  const [input, setInput] = useState('');
  const debouncedInput = useDebouncedValue(input, 300);
  const [appliedSearch, setAppliedSearch] = useState<string | null>(null);

  const [items, setItems] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const effectiveQuery = appliedSearch ?? debouncedInput;
  const prevQueryRef = useRef(effectiveQuery);

  useEffect(() => {
    let active = true;

    if (prevQueryRef.current !== effectiveQuery) {
      prevQueryRef.current = effectiveQuery;
      if (currentPage !== 0) {
        setCurrentPage(0);
        return; 
      }
    }

    const fetchContracts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAllEasyContracts({
          index: currentPage * PAGE_LIMIT,
          limit: PAGE_LIMIT,
          search: effectiveQuery || '',
        });

        if (!active) return;

        let raw: any[] = [];
        if (Array.isArray(data)) {
          raw = data;
        } else if (data && typeof data === 'object') {
          const d = data as any;
          raw = d.items ?? d.data ?? d.contracts ?? d.results ?? [];
        }

        let normalized: Contract[] = raw.map((it: any) => ({
          contractId: it.contractId ?? it.id ?? '',
          name:       it.name ?? it.title ?? '',
          supplier:   it.supplier ?? it.vendor ?? it.supplierName ?? '',
          cOntractStatus: it.cOntractStatus ?? it.status ?? '',
          ...it,
        }));

        // Fallback: If backend search fails and returns unrelated items, filter them out
        if (effectiveQuery) {
          const lowerQuery = effectiveQuery.toLowerCase();
          normalized = normalized.filter(c => 
            (c.contractId && c.contractId.toLowerCase().includes(lowerQuery)) ||
            (c.name && c.name.toLowerCase().includes(lowerQuery)) ||
            (c.supplier && c.supplier.toLowerCase().includes(lowerQuery))
          );
        }

        setItems(normalized);
        setHasMore(normalized.length === PAGE_LIMIT);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message ?? 'Failed to load contracts');
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchContracts();

    return () => {
      active = false;
    };
  }, [currentPage, effectiveQuery]);

  const onSearchClick = () => setAppliedSearch(input);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (appliedSearch !== null) setAppliedSearch(null);
  };

  return (
    <div className="summary-container">
      <div className="summary-search-row">
        <div className="search-wrapper">
          <input
            type="search"
            aria-label="Search contracts"
            className="summary-search-input"
            placeholder="Search by ID, Title, Vendor..."
            value={input}
            onChange={onInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter')  onSearchClick();
              if (e.key === 'Escape') { setInput(''); setAppliedSearch(null); }
            }}
          />
          <button
            type="button"
            className="search-icon-btn"
            onClick={onSearchClick}
            aria-label="Search contracts"
          >
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="summary-table-wrapper">
        {loading ? (
          <div className="contract-summary-loading">Loading contracts...</div>
        ) : error ? (
          <div className="contract-summary-error">{error}</div>
        ) : (
          <>
            <table className="contract-summary-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="no-results">
                      {effectiveQuery
                        ? `No contracts found for "${effectiveQuery}"`
                        : 'No contracts found'}
                    </td>
                  </tr>
                ) : (
                  items.map((contract) => (
                    <tr key={contract.contractId || contract.name}>
                      <td>
                        <Link
                          to={`/contract/details/${contract.contractId}`}
                          state={{ contractData: contract }}
                          className="link-text"
                        >
                          {contract.contractId}
                        </Link>
                      </td>
                      <td>{contract.name}</td>
                      <td>{contract.supplier}</td>
                      <td>{contract.cOntractStatus}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {items.length > 0 && (
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={currentPage === 0 || loading}
                >
                  Previous
                </button>
                <span className="pagination-info">Page {currentPage + 1}</span>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={!hasMore || loading}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ContractSummary;