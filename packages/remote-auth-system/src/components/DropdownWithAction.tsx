import React, { useState, useCallback, useRef, useEffect } from "react";
import './DropdownWithAction.css';

interface DropdownWithActionProps {
  label: string;
  buttonLabel: string;
  data: { id: number; name: string }[];
  onAction: (selectedIds: number[]) => void;
  onOpen?: (index: number, limit: number, searchTerm: string) => void;
}

const DropdownWithAction: React.FC<DropdownWithActionProps> = ({
  label,
  buttonLabel,
  data,
  onAction,
  onOpen,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const limit = 10; // Number of items per fetch

  // Toggle single checkbox
  const handleToggle = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  // Action button
  const handleAction = () => {
    if (selectedIds.length > 0) {
      onAction(selectedIds);
      setSelectedIds([]);
      setIsOpen(false);
    }
  };

  // Select / Deselect all visible items
  const handleSelectAll = () => {
    if (selectedIds.length === data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map((item) => item.id));
    }
  };

  // Handle scroll for infinite loading
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      if (
        target.scrollHeight - target.scrollTop - target.clientHeight < 20 &&
        !isLoading
      ) {
        setIsLoading(true);
        setIndex((prev) => prev + limit);
        if (onOpen) {
          onOpen(index + limit, limit, searchTerm);
        }
      }
    },
    [index, isLoading, onOpen, limit, searchTerm]
  );

  // Reset loading state when data changes
  useEffect(() => {
    setIsLoading(false);
  }, [data]);

  // Compute Select All / Indeterminate states
  const isAllSelected = data.length > 0 && selectedIds.length === data.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < data.length;

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="dropdown-with-action" ref={dropdownRef}>
      {/* Header with toggle button and action button */}
      <div className="dropdown-headers">
        <button
          onClick={() => {
            const opening = !isOpen;
            setIsOpen(opening);
            if (opening && onOpen) {
              setIndex(0);
              onOpen(0, limit, searchTerm); // ✅ include searchTerm
            }
          }}
          className="dropdown-toggle"
        >
          {label} ({selectedIds.length} selected)
          <div className={`dropdown-arrow ${isOpen ? "open" : ""}`}>▼</div>
        </button>

        <button
          onClick={handleAction}
          disabled={selectedIds.length === 0}
          className={`action-btns ${selectedIds.length === 0 ? "disabled" : ""}`}
        >
          {buttonLabel} ({selectedIds.length})
        </button>
      </div>

      {isOpen && (
        <div className="dropdown-list-b" onScroll={handleScroll}>
          {/* Search Input */}
          <div className="search-section">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search PO..."
              className="dropdown-search-input"
              onKeyUp={() => {
                // Reset index for new search
                setIndex(0);
                if (onOpen) {
                  onOpen(0, limit, searchTerm);
                }
              }}
            />
          </div>

          {data.length > 0 ? (
            <>
              {/* Select All */}
              <div className="select-all-section">
                <label className="dropdown-option select-all-option">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isIndeterminate;
                    }}
                    onChange={handleSelectAll}
                    className="checkbox-input"
                  />
                  <span className="checkbox-custom"></span>
                  <strong>Select All ({data.length})</strong>
                </label>
                <div className="dropdown-separator"></div>
              </div>

              {/* List Items */}
              {data.map((item) => (
                <label key={item.id} className="dropdown-option">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => handleToggle(item.id)}
                    className="checkbox-input"
                  />
                  <span className="checkbox-custom"></span>
                  <span className="item-text">{item.name}</span>
                </label>
              ))}

              {isLoading && <div className="loading-option">Loading more...</div>}
            </>
          ) : (
            <div className="no-data">No items available</div>
          )}
        </div>
      )}
    </div>
  );
};

export default DropdownWithAction;