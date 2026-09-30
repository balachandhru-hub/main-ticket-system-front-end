import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import "./RoleBasedSelect.css";

interface RoleBasedSelectProps {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  isConsultant?: boolean;
  canSeeOpenAndDecline?: boolean;
  consultantOptions?: Array<{ value: string; label: string }>;
  additionalOptions?: Array<{ value: string; label: string }>;
}

const RoleBasedSelect: React.FC<RoleBasedSelectProps> = ({
  name,
  value,
  onChange,
  options,
  placeholder = "All Status",
  isConsultant = false,
  canSeeOpenAndDecline = false,
  consultantOptions = [],
  additionalOptions = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Determine which options to show based on role
  const displayOptions = isConsultant ? consultantOptions : options;
  const finalOptions = canSeeOpenAndDecline
    ? [...displayOptions, ...additionalOptions]
    : displayOptions;

  const selectedOption = finalOptions.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    setIsOpen(false);
    const event = {
      target: { name, value: optionValue },
    } as React.ChangeEvent<HTMLSelectElement>;
    onChange(event);
  };

  return (
    <div ref={dropdownRef} className={`role-based-select ${isOpen ? "open" : ""}`}>
      <button
        type="button"
        className="select-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="select-label">{displayLabel}</span>
        <ChevronDown size={16} className="select-icon" />
      </button>

      {isOpen && (
        <div className="select-menu">
          {finalOptions.map((option) => (
            <div
              key={option.value}
              className={`select-item ${value === option.value ? "active" : ""}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoleBasedSelect;