 
import React, { useEffect, useState, useCallback, useMemo } from "react";
import "./CustomerTable.css";
import { FiEdit, FiEye, FiSearch } from "react-icons/fi";
import type { CompanyPreviewDto } from "../Dto/CompanyPreviewDto";
import { updateDomainStatus } from "../api/domainApi";
import ConfirmationModal from "./ConfirmationModal";
import { DOMAIN_STATUS } from "../common/common";
 
interface Props {
  customers: CompanyPreviewDto[];
  onEdit: (customer: CompanyPreviewDto) => void;
  onView: (customer: CompanyPreviewDto) => void;
  onSearch?: (term: string) => void;
  domainFilter: "all" | "expired";
  onFilterChange: (filter: "all" | "expired") => void;
  currentPage?: number;
  pageSize?: number;
}
 
interface StatusUpdateResult {
  message: string;
  success?: boolean;
}
 
interface ModalState {
  isOpen: boolean;
  selectedCustomer: CompanyPreviewDto | null;
  newStatus: string;
}
 
const CustomerTable: React.FC<Props> = ({
  customers,
  onEdit,
  onView,
  onSearch,
  domainFilter,
  onFilterChange,
  currentPage = 0,
  pageSize = 10,
}) => {
  const [pendingSearch, setPendingSearch] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState<CompanyPreviewDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialFetchComplete, setInitialFetchComplete] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    selectedCustomer: null,
    newStatus: ""
  });
 
  const formatPlanName = useCallback((plan: string | null | undefined): string => {
    if (!plan) return "N/A";
    return plan
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }, []);
 
  const getCurrentStatus = useCallback((customer: CompanyPreviewDto): string => {
    if (domainFilter === "expired") {
      return "Expired";
    }
    const isActive = (customer as any).isActive;
    return isActive === true ? DOMAIN_STATUS.ACTIVE : DOMAIN_STATUS.INACTIVE;
  }, [domainFilter]);
 
  const processCustomerData = useCallback(() => {
    try {
      setFilteredCustomers(customers);
    } catch (error) {
      setFilteredCustomers([]);
    }
  }, [customers]);
 
  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      processCustomerData();
      setLoading(false);
      setInitialFetchComplete(true);
    }, 100);
 
    return () => clearTimeout(timeout);
  }, [processCustomerData]);
 
  const handleDomainStatusChange = useCallback((cust: CompanyPreviewDto, status: string) => {
    const currentStatus = getCurrentStatus(cust);
   
    if (currentStatus === status) {
      return;
    }
   
    setModalState({
      isOpen: true,
      selectedCustomer: cust,
      newStatus: status
    });
  }, [getCurrentStatus]);
 
  const confirmChange = useCallback(async (): Promise<StatusUpdateResult> => {
    const { selectedCustomer, newStatus } = modalState;
   
    if (!selectedCustomer || !newStatus) {
      return { message: "Missing data for status update", success: false };
    }
 
    try {
      const result = await updateDomainStatus({
        domainId: selectedCustomer.id,
        activeStatus: newStatus,
      });
 
      if ("statusCode" in result && result.statusCode === 200) {
        setFilteredCustomers((prev) =>
          prev.map((item) =>
            item.id === selectedCustomer.id
              ? {
                  ...item,
                  ...(item as any).isActive !== undefined && {
                    isActive: newStatus === DOMAIN_STATUS.ACTIVE
                  }
                }
              : item
          )
        );
 
        setModalState({
          isOpen: false,
          selectedCustomer: null,
          newStatus: ""
        });
       
        return {
          message: result.message || "Status updated successfully",
          success: true
        };
      } else {
        return {
          message: `Error: ${result.message || "Unknown error"}`,
          success: false
        };
      }
    } catch (error) {
      return {
        message: "Failed to update status. Please try again.",
        success: false
      };
    }
  }, [modalState]);
 
  const handleSearch = useCallback(() => {
    onSearch?.(pendingSearch);
  }, [pendingSearch, onSearch]);
 
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  }, [handleSearch]);
 
  const resetModal = useCallback(() => {
    setModalState({
      isOpen: false,
      selectedCustomer: null,
      newStatus: ""
    });
  }, []);
 
  const confirmationMessage = useMemo(() => {
    const { selectedCustomer, newStatus } = modalState;
    if (!selectedCustomer) return "";
   
    return newStatus === DOMAIN_STATUS.ACTIVE
      ? `Are you sure you want to activate ${selectedCustomer.domainName}'s domain?`
      : `Are you sure you want to deactivate ${selectedCustomer.domainName}'s domain?`;
  }, [modalState]);
 
  const tableContent = useMemo(() => {
    if (filteredCustomers.length === 0) {
      return (
        <tr>
          <td colSpan={8} style={{ textAlign: "center" }}>
            No data found.
          </td>
        </tr>
      );
    }
 
    return filteredCustomers.map((cust, index) => {
      const currentStatus = getCurrentStatus(cust);
      const serialNumber = (currentPage * pageSize) + index + 1;
 
   
      const lutVal = ((cust as any).lutNumber ?? (cust as any).lutNo ?? (cust as any).lut ?? "").toString().trim();
      const gstVal = (cust as any).gsT_VAT ?? (cust as any).gst ?? "";
      const gstValStr = gstVal ? gstVal.toString().trim() : "";
      const gstOrLut = lutVal !== "" ? lutVal : (gstValStr !== "" ? gstValStr : "N/A");
 
      return (
        <tr key={cust.id ?? index}>
          <td>{serialNumber}</td>
          <td>
            <span
              className="td-ellipsis"
              title={cust?.domainName ?? "N/A"}
            >
              {cust?.domainName ?? "N/A"}
            </span>
          </td>
 
         
          <td>
            <span
              className="td-ellipsis"
              title={gstOrLut}
            >
              {gstOrLut}
            </span>
          </td>
 
          <td>
            <span
              className="ariba-col"
              title={cust?.aribaNetworkId ?? "N/A"}
            >
              {cust?.aribaNetworkId ?? "N/A"}
            </span>
          </td>
 
          <td>
            <span
              className="td-ellipsis"
              title={formatPlanName(cust?.currentPlan)}
            >
              {formatPlanName(cust?.currentPlan)}
            </span>
          </td>
          <td>
            <span
              className="td-ellipsis"
              title={cust?.activeSince ?? "N/A"}
            >
              {cust?.activeSince ?? "N/A"}
            </span>
          </td>
          <td className={`status ${currentStatus.toLowerCase()}`}>
            {cust.currentPlan ? (
              domainFilter === "expired" ? (
                <span className="expired-status">Expired</span>
              ) : (
                <select
                  value={currentStatus}
                  onChange={(e) => handleDomainStatusChange(cust, e.target.value)}
                  className="status-select"
                >
                  <option value={DOMAIN_STATUS.ACTIVE}>Active</option>
                  <option value={DOMAIN_STATUS.INACTIVE}>Inactive</option>
                </select>
              )
            ) : (
              <span>No Active Plan</span>
            )}
          </td>
          <td>
            <button
              className="action-btnnn"
              onClick={() => onEdit(cust)}
              title="Edit"
              type="button"
            >
              <FiEdit />
            </button>
            <button
              className="action-btnnn"
              onClick={() => onView(cust)}
              title="View"
              type="button"
            >
              <FiEye />
            </button>
          </td>
        </tr>
      );
    });
  }, [
    filteredCustomers,
    getCurrentStatus,
    formatPlanName,
    handleDomainStatusChange,
    domainFilter,
    onEdit,
    onView,
    currentPage,
    pageSize
  ]);
 
  if (loading || !initialFetchComplete) {
    return (
      <div className="customer-table-container">
        <div className="loader-container-user">
          <div className="loader" />
        </div>
      </div>
    );
  }
 
  return (
    <div className="customer-table-container">
      <div className="search-bar">
        <div className="search-left">
          <span className="search-label">Search</span>
          <div className="search-view">
            <input
              type="text"
              className="no-border"
              placeholder="Search by Company Name or Ariba ID"
              value={pendingSearch}
              onChange={(e) => setPendingSearch(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <button
              className="search-btn"
              onClick={handleSearch}
              aria-label="Search"
              type="button"
            >
              <FiSearch size={20} />
            </button>
          </div>
        </div>
 
        <div className="search-right">
          <select
            value={domainFilter}
            onChange={(e) => onFilterChange(e.target.value as "all" | "expired")}
            className="domain-filter-dropdown"
          >
            <option value="all">All Active Domains</option>
            <option value="expired">Expired Domains</option>
          </select>
        </div>
      </div>
 
      <div className="table-responsive">
        <table className="customer-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Company Name</th>
              <th>GST / LUT</th>
              <th>Ariba Network Id</th>
              <th>Current Plan</th>
              <th>Active Since</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {tableContent}
          </tbody>
        </table>
      </div>
 
      <ConfirmationModal
        isOpen={modalState.isOpen}
        message={confirmationMessage}
        onConfirm={confirmChange}
        onCancel={resetModal}
      />
    </div>
  );
};
 
export default CustomerTable;
 
 