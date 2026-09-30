// src/components/MultiSelectFilter.tsx
import React, { useState, useEffect, useRef } from "react";
import SpinnerLoaders from "./SpinnerLoaders";
import { toast } from "react-toastify";
import "./MultiSelectFilter.css";

interface Props {
  label: string;
  placeholder: string;
  selected: string[];
  onChange: (selected: string[]) => void;
  fetchOptions: (
    search: string,
    page: number,
  ) => Promise<{ items: string[]; hasMore: boolean }>;
  onDropdownOpen?: () => void;
}

// Function to sort suggestions with exact matches first
const sortSuggestions = (items: string[], searchTerm: string): string[] => {
  if (!searchTerm.trim()) return items;

  const search = searchTerm.trim().toLowerCase();
  const exactMatches: string[] = [];
  const partialMatches: string[] = [];

  items.forEach((item) => {
    const itemLower = item.toLowerCase();
    if (itemLower === search) {
      exactMatches.push(item);
    } else if (itemLower.includes(search)) {
      partialMatches.push(item);
    }
  });

  return [...exactMatches, ...partialMatches];
};

export const MultiSelectFilter: React.FC<Props> = ({
  label,
  placeholder,
  selected,
  onChange,
  fetchOptions,
  onDropdownOpen,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputId = `multiselect-${label.replace(/\s+/g, "-").toLowerCase()}`;

  const loadOptions = async (
    search: string,
    pageNum: number,
    reset = false,
  ) => {
    if (loading) return;
    setLoading(true);
    try {
      const { items, hasMore: more } = await fetchOptions(
        search.trim(),
        pageNum,
      );

      const fetched = Array.isArray(items) ? items.filter(Boolean) : [];

      // Ensure currently selected items are always present in suggestions
      const base = reset ? [] : suggestions;
      const combined = [...selected, ...base, ...fetched];

      // Deduplicate preserving first occurrence
      const deduped: string[] = [];
      for (const it of combined) {
        if (!it) continue;
        if (!deduped.includes(it)) deduped.push(it);
      }
      setSuggestions(deduped);
      setHasMore(more);
    } catch (err) {
      toast.error("Error loading options:");
    } finally {
      setLoading(false);
    }
  };

  // Load full list when focused (first open)
  const handleFocus = () => {
   setShowSuggestions(true);
   onDropdownOpen?.();
    if (suggestions.length === 0 && !loading) {
      loadOptions("", 1, true);
    }
  };

  // Debounced search on typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSuggestions([]);
      setPage(1);
      setHasMore(true);
      loadOptions(inputValue, 1, true);
    }, 700);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputValue]);

  // Infinite scroll
  useEffect(() => {
    if (page > 1) loadOptions(inputValue, page);
  }, [page]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !loading) {
      setPage((p) => p + 1);
    }
  };

  const handleSelect = (value: string) => {
    if (!selected.includes(value)) {
      onChange([...selected, value]);
    }
    setInputValue("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleRemove = (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    onChange(selected.filter((v) => v !== value));
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (!wrapperRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
      }
    }, 200);
  };
  return (
    <div className="multi-select-container" ref={wrapperRef}>
      <label htmlFor={inputId} className="multi-select-label">
        {label}
      </label>

      <div
        className="multi-select-input-wrapper"
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((item) => (
          <div key={item} className="multi-select-chip">
            <span className="multi-select-chip-text">{item}</span>
            <button
              className="multi-select-remove-btn"
              onClick={(e) => handleRemove(e, item)}
            >
              ×
            </button>
          </div>
        ))}

        <input
          id={inputId}
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={selected.length === 0 ? placeholder : ""}
          className="multi-select-input"
          autoComplete="off"
        />
      </div>

      {showSuggestions && (
  <div className="multi-select-dropdown" onScroll={handleScroll}>
    {loading ? (
      <div className="multi-select-loading-container">
        <SpinnerLoaders fullScreen={false} size="small" text="Loading..." />
      </div>
    ) : suggestions.length === 0 ? (
      inputValue.trim() === "" ? (
        <div className="no-results">No results</div>
      ) : (
        <></>
      )
    ) : (
      sortSuggestions(suggestions, inputValue).map((item) => {
        const isSelected = selected.includes(item);
        return (
          <div
            key={item}
            className={`multi-select-item ${isSelected ? "disabled" : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => !isSelected && handleSelect(item)}
          >
            <span>{item}</span>
          </div>
        );
      })
    )}

    {!hasMore && suggestions.length > 0 && (
      <div className="multi-select-no-more-results">No more results</div>
    )}
  </div>
)}

    </div>
  );
};