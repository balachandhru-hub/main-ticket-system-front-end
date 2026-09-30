import "./TicketFilters.css";
import { Filter, Search } from "lucide-react";
import { useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUS,
  USER_ROLES,
} from "../common/common";
import { useAuth } from "../components/context/AuthContext";
import RoleBasedSelect from "./RoleBasedSelect";
export interface FilterState {
  search: string;
  status: string;
  category: string;
  priority: string;
  fromDate: string;
  toDate: string;
}

interface TicketFiltersProps {
  onFilterChange: (filter: FilterState) => void;
}

const TicketFilters: React.FC<TicketFiltersProps> = ({ onFilterChange }) => {
  const { auth } = useAuth();
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "",
    category: "",
    priority: "",
    fromDate: "",
    toDate: "",
  });

  const [searchInput, setSearchInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const canSeeOpenAndDecline =
    auth?.roleId === USER_ROLES.BUSINESS_USER ||
    auth?.roleId === USER_ROLES.BUSINESS_ADMIN_USER||
    auth?.roleId === USER_ROLES.LEADERSHIP_USER;

  // Added check for the consultant role
  const isConsultant = auth?.roleId === USER_ROLES.CONSULTANT;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDateChange = (
    date: Date | null,
    field: "fromDate" | "toDate"
  ) => {
    const formatted = date ? format(date, "MM-dd-yyyy") : "";
    const newFilters = { ...filters, [field]: formatted };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSearchSubmit = () => {
    const updatedFilters = { ...filters, search: searchInput };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  return (
    <div className="filter-wrapper">
      <div className="filter-title">
        <Filter size={16} />
        Filters
      </div>
      <div className="filter-controls">
        <div className="filter-box">
          <div className="search-view">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search tickets..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchSubmit();
                }
              }}
            />
            <button
              type="button"
              className="search-input"
              onClick={handleSearchSubmit}
            >
              <Search size={16} />
            </button>
          </div>
        </div>

        <div className="filter-box">
            <RoleBasedSelect
            name="status"
            value={filters.status}
            onChange={handleChange}
            placeholder="All Status"
            isConsultant={isConsultant}
            canSeeOpenAndDecline={canSeeOpenAndDecline}
            consultantOptions={[
              { value: TICKET_STATUS.IN_PROGRESS, label: "In Progress" },
              { value: TICKET_STATUS.RESOLVED, label: "Resolved" },
              { value: TICKET_STATUS.RE_APPROVE, label: "Re Approved" },
              { value: TICKET_STATUS.ON_HOLD, label: "On Hold" },
            ]}
            options={[
              { value: TICKET_STATUS.IN_PROGRESS, label: "In Progress" },
              { value: TICKET_STATUS.RESOLVED, label: "Resolved" },
              { value: TICKET_STATUS.APPROVED, label: "Approved" },
              { value: TICKET_STATUS.REJECTED, label: "Rejected" },
              { value: TICKET_STATUS.RE_APPROVE, label: "Re Approved" },
              { value: TICKET_STATUS.ON_HOLD, label: "On Hold" },
            ]}
            additionalOptions={[
              { value: TICKET_STATUS.OPEN, label: "Open" },
              { value: TICKET_STATUS.DECLINE, label: "Decline" },
            ]}
          />
        </div>

        <div className="filter-box">
          <RoleBasedSelect
            name="category"
            value={filters.category}
            onChange={handleChange}
          placeholder="All Categories"
            options={[
              { value: TICKET_CATEGORIES.TECHNICAL_SUPPORT, label: "Technical Support" },
              { value: TICKET_CATEGORIES.BILLING_PAYMENT, label: "Billing & Payment" },
              { value: TICKET_CATEGORIES.GENERAL_INQUIRY, label: "General Inquiry" },
            ]}
          />
          
        </div>

        <div className="filter-box">
          <RoleBasedSelect
            name="priority"
            value={filters.priority}
            onChange={handleChange}
          placeholder="All Priorities"
            options={[
              { value: TICKET_PRIORITIES.LOW, label: "Low" },
              { value: TICKET_PRIORITIES.MEDIUM, label: "Medium" },
              { value: TICKET_PRIORITIES.HIGH, label: "High" },
            ]}
          />
        </div>

        <div className="filter-box">
          <label>
            <span className="date-label">From</span>
            <DatePicker
              selected={filters.fromDate ? new Date(filters.fromDate) : null}
              onChange={(date) => handleDateChange(date, "fromDate")}
              dateFormat="MM-dd-yyyy"
              placeholderText="MM-DD-YYYY"
              className="custom-datepicker"
              isClearable
            />
          </label>
        </div>

        <div className="filter-box">
          <label>
            <span className="date-label">To</span>
            <DatePicker
              selected={filters.toDate ? new Date(filters.toDate) : null}
              onChange={(date) => handleDateChange(date, "toDate")}
              dateFormat="MM-dd-yyyy"
              placeholderText="MM-DD-YYYY"
              className="custom-datepicker"
              isClearable
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default TicketFilters;