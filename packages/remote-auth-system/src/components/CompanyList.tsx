import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { getAllDomains, GetAllExpiredDomain, getDomainDetail } from "../api/domainApi";
import CustomerTable from "./CustomerTable";

import { FiPlus } from "react-icons/fi";
import ErrorModel from "../components/ErrorModel";
import "./CompanyList.css";
import type { CompanyPreviewDto } from "../Dto/CompanyPreviewDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";

const PAGE_SIZE = 10;

interface PaginationState {
  page: number;
  expiredPage: number;
  hasMore: boolean;
  hasMoreExpired: boolean;
}

const CompanyList: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CompanyPreviewDto[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 0,
    expiredPage: 0,
    hasMore: true,
    hasMoreExpired: true,
  });
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [domainFilter, setDomainFilter] = useState<"all" | "expired">("all");

  const isCompanyList = useCallback((
    response: CompanyPreviewDto[] | ErrorResponseDto
  ): response is CompanyPreviewDto[] => {
    return Array.isArray(response);
  }, []);

  const isErrorResponse = useCallback((
    response: CompanyPreviewDto[] | ErrorResponseDto
  ): response is ErrorResponseDto => {
    return (
      !Array.isArray(response) &&
      "message" in response &&
      "description" in response
    );
  }, []);

  const fetchCustomers = useCallback(async (
    pageNumber: number,
    expiredPageNumber: number,
    term: string = "",
    filter: "all" | "expired" = "all"
  ) => {
    try {
      setLoading(true);
      const offset = filter === "expired" ? expiredPageNumber * PAGE_SIZE : pageNumber * PAGE_SIZE;
      let data: CompanyPreviewDto[] | ErrorResponseDto;

      if (filter === "expired") {
        data = await GetAllExpiredDomain(offset, PAGE_SIZE, term);
        if (isCompanyList(data)) {
          setPagination(prev => ({
            ...prev,
            hasMoreExpired: (data as CompanyPreviewDto[]).length === PAGE_SIZE
          }));
        }
      } else {
        data = await getAllDomains(offset, PAGE_SIZE, term);
        if (isCompanyList(data)) {
          setPagination(prev => ({
            ...prev,
            hasMore: (data as CompanyPreviewDto[]).length === PAGE_SIZE
          }));
        }
      }

      if (isErrorResponse(data)) {
        setCustomers([]);
        setPagination(prev => ({
          ...prev,
          ...(filter === "expired" ? { hasMoreExpired: false } : { hasMore: false })
        }));
      } else if (isCompanyList(data)) {
        setCustomers(data);

      
        (async () => {
          try {
            const needsFetch = (data as CompanyPreviewDto[]).filter(c => {
              const gst = (c?.gsT_VAT ?? "").toString().trim();
              const lut = (c?.lut ?? "").toString().trim();
              return gst === "" && lut === "";
            });

            if (needsFetch.length === 0) return;

            const detailed = await Promise.all((data as CompanyPreviewDto[]).map(async (c) => {
              if (!c || !c.id) return c;
              const detail = await getDomainDetail(c.id);
           
              if (!detail || (detail as any).statusCode) return c;

              const detailAny = detail as any;
              const taxDetails = detailAny.taxDetails || {};

              const gst = (
                taxDetails.gst ??
                taxDetails.gsT_VAT ??
                detailAny.gsT_VAT ??
                detailAny.taxDetails?.gst ??
                ""
              ) as string;

              const lutNumber = (
                taxDetails.lutNumber ??
                taxDetails.lut ??
                detailAny.lut ??
                detailAny.taxDetails?.lutNumber ??
                ""
              ) as string;

              return {
                ...c,
                gsT_VAT: gst || c.gsT_VAT,
                lut: lutNumber || c.lut,
              } as CompanyPreviewDto;
            }));

            setCustomers(detailed as CompanyPreviewDto[]);
          } catch (err) {
            
          }
        })();
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        setShowSessionModal(true);
      } else {
        setCustomers([]);
        setPagination(prev => ({
          ...prev,
          ...(filter === "expired" ? { hasMoreExpired: false } : { hasMore: false })
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [isCompanyList, isErrorResponse]);

  useEffect(() => {
    const currentPage = domainFilter === "expired" ? pagination.expiredPage : pagination.page;
    fetchCustomers(currentPage, currentPage, searchTerm, domainFilter);
  }, [pagination.page, pagination.expiredPage, searchTerm, domainFilter, fetchCustomers]);

  const handleAddCustomer = useCallback(() => {
    navigate("/add-domain");
  }, [navigate]);

  const handleEdit = useCallback((customer: CompanyPreviewDto) => {
    navigate("/edit-domain", { state: { id: customer.id } });
  }, [navigate]);

  const handleView = useCallback((customer: CompanyPreviewDto) => {
    navigate("/company-dashboard", { state: customer });
  }, [navigate]);

  const handleSessionConfirm = useCallback(() => {
    setShowSessionModal(false);
    navigate("/");
  }, [navigate]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setPagination(prev => ({
      ...prev,
      page: 0,
      expiredPage: 0
    }));
  }, []);

  const handleFilterChange = useCallback((filter: "all" | "expired") => {
    setDomainFilter(filter);
    setSearchTerm(""); 
    setPagination(prev => ({
      ...prev,
      page: 0,
      expiredPage: 0
    }));
  }, []);

const handlePrevious = useCallback(() => {
    if (domainFilter === "expired") {
      setPagination(prev => ({
        ...prev,
        expiredPage: Math.max(prev.expiredPage - 1, 0)
      }));
    } else {
      setPagination(prev => ({
        ...prev,
        page: Math.max(prev.page - 1, 0)
      }));
    }
  }, [domainFilter]);

  const handleNext = useCallback(() => {
    if (domainFilter === "expired") {
      setPagination(prev => ({
        ...prev,
        expiredPage: prev.expiredPage + 1
      }));
    } else {
      setPagination(prev => ({
        ...prev,
        page: prev.page + 1
      }));
    }
  }, [domainFilter]);

  const currentPage = useMemo(() => 
    domainFilter === "expired" ? pagination.expiredPage : pagination.page, 
    [domainFilter, pagination.expiredPage, pagination.page]
  );

  const currentHasMore = useMemo(() => 
    domainFilter === "expired" ? pagination.hasMoreExpired : pagination.hasMore, 
    [domainFilter, pagination.hasMoreExpired, pagination.hasMore]
  );

  const showNoDataMessage = useMemo(() => 
    !loading && customers.length === 0, 
    [loading, customers.length]
  );

  interface BackButtonProps {
    onClick?: () => void;
  }

  const BackButton: React.FC<BackButtonProps> = ({ onClick }) => {
    return (
      <button className="CL-back-btn" onClick={onClick}>
        <FaArrowLeft style={{ marginRight: "0.5rem" }} />
        Back
      </button>
    );
  };

  if (loading) {
    return (
      <div className="CL-dashboard-container">
        <h2 className="CL-dashboard-title">Domain Registration Details</h2>
        <div className="CL-dashboard-header">
          <button className="CL-add-btn" onClick={handleAddCustomer} type="button">
            <FiPlus className="CL-add-icon" />
            Add New Domain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="CL-dashboard-container">
      {domainFilter === "expired" && searchTerm && (
        <div className="CL-back-btn">
          <BackButton
            onClick={() => {
              setDomainFilter("all");  
              setSearchTerm("");       
              setPagination({
                page: 0,
                expiredPage: 0,
                hasMore: true,
                hasMoreExpired: true
              });
            }}
          />
        </div>
      )}

      <h2 className="CL-dashboard-title">Domain Registration Details</h2>
      <div className="CL-dashboard-header">
        <button className="CL-add-btn" onClick={handleAddCustomer} type="button">
          <FiPlus className="CL-add-icon" />
          Add New Domain
        </button>
       </div>

      {showNoDataMessage ? (
        <p className="no-customers-center">No customers found.</p>
      ) : (
        <>
          <CustomerTable
            customers={customers}
            onEdit={handleEdit}
            onView={handleView}
            onSearch={handleSearch}
            domainFilter={domainFilter}
            onFilterChange={handleFilterChange}
            currentPage={currentPage}
            pageSize={PAGE_SIZE}
          />

          <div className="pagination-controls">
            <button
              disabled={currentPage === 0}
              onClick={handlePrevious}
              type="button"
            >
              Previous
            </button>
            <span className="page-info">
              Page {currentPage + 1}
            </span>
            <button
              disabled={!currentHasMore}
              onClick={handleNext}
              type="button"
            >
              Next
            </button>
          </div>
        </>
      )}

      <ErrorModel
        visible={showSessionModal}
        title="Session Expired"
        message="Your session has expired. Please log in again."
        onConfirm={handleSessionConfirm}
        onClose={handleSessionConfirm}
      />
    </div>
  );
};

export default CompanyList;