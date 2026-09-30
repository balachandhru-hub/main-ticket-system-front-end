import { useState, useEffect, useRef, useCallback } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { fetchGLAccounts } from '../api/PulseReportFilterApi';
import './GLAccountsFilter.css'
import type { GLAccountsDTO, PaginatedFilterPayload } from '../api/PulseReportFilterApi';
import { toast } from 'react-toastify';

interface GLAccount {
  id: string;
  name?: string;
  code: string;
}

interface GLAccountsFilterProps {
  onSelectionChange?: (selectedCodes: string[]) => void;
}

const GLAccountsFilter = ({ onSelectionChange }: GLAccountsFilterProps) => {
  const [glAccounts, setGlAccounts] = useState<GLAccount[]>([]);
  const [selectedGLAccounts, setSelectedGLAccounts] = useState<string[]>([]);
  const [glSearchTerm, setGlSearchTerm] = useState<string>('');
  const [glPage, setGlPage] = useState<number>(1);
  const [glTotalPages, setGlTotalPages] = useState<number>(1);
  const [glLoading, setGlLoading] = useState<boolean>(false);
  const [glDropdownOpen, setGlDropdownOpen] = useState<boolean>(false);
  const [selectAllChecked, setSelectAllChecked] = useState<boolean>(false);
  const glDropdownRef = useRef<HTMLDivElement>(null);
  const glAccountsListRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (glPage > 1) {
      fetchGLAccountsData(glPage, glSearchTerm);
    }
  }, [glPage, glSearchTerm]);

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      fetchGLAccountsData(1, glSearchTerm);
    }
  }, []);

  useEffect(() => {
    if (glSearchTerm === '') {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchGLAccountsData(1, glSearchTerm);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [glSearchTerm]);

  const fetchGLAccountsData = async (page: number = 1, search: string = ''): Promise<void> => {
    setGlLoading(true);
    try {
      const payload: PaginatedFilterPayload = {
        page,
        page_size: 10,
        ...(search && { search }),
      };

      const response: GLAccountsDTO | null = await fetchGLAccounts(payload);

      if (response) {
        const accounts: GLAccount[] = (response.gl_accounts || []).map((account: string, index: number) => ({
          id: `${account}-${page}-${index}`,
          code: account,
          name: account,
        }));

        if (page === 1) {
          setGlAccounts(accounts);
        } else {
          setGlAccounts(prev => [...prev, ...accounts]);
        }

        const pagination = response.pagination;
        if (pagination) {
          setGlTotalPages(pagination.total_pages || 1);
        }
      }
    } catch (error) {
     
      if (page === 1) {
        setGlAccounts([]);
      }
    } finally {
      setGlLoading(false);
    }
  };

  const handleGLSearch = useCallback((searchValue: string): void => {
    setGlSearchTerm(searchValue);
    setGlPage(1);
  }, []);

  const handleGLCheckboxChange = (accountId: string): void => {
    setSelectedGLAccounts((prev: string[]) => {
      let updated: string[];
      if (prev.includes(accountId)) {
        updated = prev.filter((id: string) => id !== accountId);
      } else {
        if (prev.length >= 5) {
          toast.warning('You can select a maximum of 5 GL accounts only.');
          return prev;
        }
        updated = [...prev, accountId];
      }

      // FIXED: Extract the actual GL account code from the account object
      const selectedAccountCodes = updated.map(id => {
        const account = glAccounts.find(acc => acc.id === id);
        return account ? account.code : id;
      });

    
      onSelectionChange?.(selectedAccountCodes);
      return updated;
    });
    setSelectAllChecked(false);
  };

  const handleSelectAllGL = (checked: boolean): void => {
    if (checked) {
      const allIds = glAccounts.map((account: GLAccount) => account.id);
      let idsToSelect = allIds;

      if (allIds.length > 5) {
        toast.warning('You can select a maximum of 5 GL accounts. Only the first 5 were selected.');
        idsToSelect = allIds.slice(0, 5);
      }

      setSelectedGLAccounts(idsToSelect);

      // FIXED: Extract the actual GL account codes from the account objects
      const selectedAccountCodes = idsToSelect.map(id => {
        const account = glAccounts.find(acc => acc.id === id);
        return account ? account.code : id;
      });

   
      onSelectionChange?.(selectedAccountCodes);
    } else {
      setSelectedGLAccounts([]);
      onSelectionChange?.([]);
    }
  };

  const handleScroll = (): void => {
    if (!glAccountsListRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = glAccountsListRef.current;

    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      if (glPage < glTotalPages && !glLoading) {
        setGlPage(prev => prev + 1);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (glDropdownRef.current && !glDropdownRef.current.contains(event.target as Node)) {
        setGlDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="gl-accounts-filter" ref={glDropdownRef}>
      <label>GL Accounts*</label>
      <div className="gl-dropdown-wrapper">
        <button
          className="gl-dropdown-button"
          onClick={() => setGlDropdownOpen(!glDropdownOpen)}
          type="button"
        >
          <span className="gl-button-text">
            {selectedGLAccounts.length > 0
              ? `${selectedGLAccounts.length} Selected`
              : 'Select GL Accounts'}
          </span>
          <FiChevronDown
            className={`gl-chevron ${glDropdownOpen ? 'open' : ''}`}
            size={18}
          />
        </button>

        {glDropdownOpen && (
          <div className="gl-dropdown-menu">
            {/* Search within dropdown - NO ICON */}
            <div className="gl-dropdown-search">
              <input
                type="text"
                placeholder="Search GL accounts..."
                value={glSearchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleGLSearch(e.target.value)
                }
                className="gl-search-input"
              />
            </div>

            {/* Select All */}
            <div className="gl-select-all">
              <label className="gl-checkbox-label">
                <input
                  type="checkbox"
                  checked={selectAllChecked}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleSelectAllGL(e.target.checked)
                  }
                />
                <span>Select All</span>
              </label>
            </div>

            {/* GL Accounts List - with vertical scroll pagination */}
            <div
              className="gl-accounts-list"
              ref={glAccountsListRef}
              onScroll={handleScroll}
            >
              {glAccounts.length === 0 && !glLoading ? (
                <div className="gl-empty">No GL accounts found</div>
              ) : (
                glAccounts.map((account: GLAccount) => (
                  <label key={account.id} className="gl-checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedGLAccounts.includes(account.id)}
                      onChange={() => handleGLCheckboxChange(account.id)}
                    />
                    <span className="gl-account-name">
                      {account.name || account.code}
                    </span>
                    {/* <span className="gl-account-code">{account.code}</span> */}
                  </label>
                ))
              )}

              {/* Loading indicator at bottom */}
              {glLoading && (
                <div className="gl-loading-more">Loading more...</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GLAccountsFilter;