import { useState, useRef, useEffect } from 'react';
import './CountrySelect.css';

interface CountrySelectProps {
  countries: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const CountrySelect = ({
  countries,
  value,
  onChange,
  placeholder = 'Select the countries / region',
}: CountrySelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredCountries = countries.filter((country) =>
    country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: `${rect.bottom + 4}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
      });

      const handleScroll = () => {
        if (triggerRef.current) {
          const newRect = triggerRef.current.getBoundingClientRect();
          
          // Close dropdown if trigger button scrolls out of view
          if (newRect.bottom < 0 || newRect.top > window.innerHeight) {
            setIsOpen(false);
            return;
          }
          
          setDropdownStyle({
            top: `${newRect.bottom + 4}px`,
            left: `${newRect.left}px`,
            width: `${newRect.width}px`,
          });
        }
      };

      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (country: string) => {
    onChange(country);
    setIsOpen(false);
    setSearchTerm('');
  };

  const displayValue = value ? value.toUpperCase() : placeholder;

  return (
    <div ref={containerRef} className="country-select">
      <button
        ref={triggerRef}
        type="button"
        className="country-select__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="country-select__value">{displayValue}</span>
        <span className={`country-select__icon ${isOpen ? 'open' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && countries && countries.length > 0 && (
        <div className="country-select__dropdown" style={dropdownStyle}>
          <input
            ref={searchInputRef}
            type="text"
            className="country-select__search"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="off"
          />
          {filteredCountries.length > 0 ? (
            <ul className="country-select__list">
              {filteredCountries.map((country) => (
                <li
                  key={country}
                  className={`country-select__item ${
                    country === value ? 'selected' : ''
                  }`}
                  onClick={() => handleSelect(country)}
                >
                  {country.toUpperCase()}
                </li>
              ))}
            </ul>
          ) : (
            <div className="country-select__empty">No results found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default CountrySelect;