import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Copy } from 'lucide-react';
import { toast } from 'react-toastify';

interface SearchableSingleSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  allLabel?: string;
  minWidth?: string;
  maxWidth?: string;
  onSearch?: (query: string) => void;
  loading?: boolean;
}

export const SearchableSingleSelect: React.FC<SearchableSingleSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Search...',
  allLabel = 'All',
  minWidth = '180px',
  maxWidth = '240px',
  onSearch,
  loading = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (onSearch) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onSearch(query);
      }, 2000);
    }
  };

  const filteredOptions = (options || []).filter(opt =>
    String(opt || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const hasExactOption = (options || []).some(opt =>
    String(opt || '').toLowerCase() === searchQuery.toLowerCase().trim()
  );

  const displayTitle = value ? value : allLabel;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className="proc-material-dropdown-trigger"
        style={{
          minWidth,
          maxWidth,
          padding: '0.375rem 0.625rem',
          fontSize: '0.8125rem',
          borderRadius: '0.375rem',
          border: '1px solid #cbd5e1',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.375rem',
          boxSizing: 'border-box'
        }}
        title={displayTitle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          <Search width={12} height={12} style={{ color: '#64748b', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {value || allLabel}
          </span>
        </div>
        <ChevronDown
          width={14}
          height={14}
          style={{
            color: '#64748b',
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s'
          }}
        />
      </div>

      {isOpen && (
        <div
          className="proc-material-dropdown-menu"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            left: 'auto',
            marginTop: '4px',
            width: '280px',
            maxHeight: '260px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '0.375rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 1050,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Search Header */}
          <div className="proc-material-search-header" style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.375rem', backgroundColor: '#f8fafc' }}>
            <Search width={12} height={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <input
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={handleInputChange}
              autoFocus
              className="proc-material-search-input"
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.75rem', backgroundColor: 'transparent', color: '#1e293b' }}
            />
            {searchQuery && (
              <X
                width={12}
                height={12}
                style={{ color: '#94a3b8', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => setSearchQuery('')}
              />
            )}
          </div>

          {/* Options List */}
          <div className="proc-material-options-list" style={{ overflowY: 'auto', flex: 1, padding: '0.25rem 0', maxHeight: '200px' }}>
            <div
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`proc-material-option-item ${!value ? 'active' : ''}`}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                color: !value ? '#2563eb' : '#334155',
                fontWeight: 600,
                backgroundColor: !value ? '#eff6ff' : 'transparent',
                cursor: 'pointer'
              }}
            >
              {allLabel}
            </div>

            {searchQuery.trim() && !hasExactOption && (
              <div
                onClick={() => {
                  onChange(searchQuery.trim());
                  setIsOpen(false);
                }}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  color: '#2563eb',
                  fontWeight: 600,
                  backgroundColor: '#eff6ff',
                  cursor: 'pointer',
                  borderBottom: '1px solid #dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span>🔍 Filter by "{searchQuery.trim()}"</span>
              </div>
            )}

            {loading ? (
              <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #2563eb', borderTopColor: 'transparent', animation: 'procSpin 0.8s linear infinite' }} />
              </div>
            ) : filteredOptions.length === 0 ? (
              <div style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                No matches found
              </div>
            ) : (
              filteredOptions.slice(0, 150).map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.75rem',
                    color: value === opt ? '#2563eb' : '#334155',
                    fontWeight: value === opt ? 600 : 400,
                    backgroundColor: value === opt ? '#eff6ff' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}
                  title={opt}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={opt}>
                    {opt}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(opt);
                      toast.success(`Copied: "${opt}"`, { autoClose: 2000, position: 'top-right' });
                    }}
                    style={{ border: 'none', background: 'none', padding: '2px', color: '#94a3b8', cursor: 'pointer', flexShrink: 0 }}
                    title={`Copy "${opt}"`}
                  >
                    <Copy width={11} height={11} />
                  </button>
                </div>
              ))
            )}
            {filteredOptions.length > 150 && (
              <div style={{ padding: '0.375rem 0.75rem', fontSize: '0.6875rem', color: '#64748b', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                Showing first 150 of {filteredOptions.length} results. Type to refine.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

