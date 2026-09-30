import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './CompanyDash.css';
import PopupCompanyDetails from './PopupCompanyDetails';
import PopupPlanDetails from './PopupPlanDetails';
import PopupInvoices from './PopupInvoices';
import PopupTaxDetails from './PopupTaxDetails';
import BackButton from './BackButton';
import type { CompanyPreviewDto } from '../Dto/CompanyPreviewDto';
import type { CustomerListResponseDto } from '../Dto/CustomerListResponseDto';
import { getDomainDetail } from '../api/domainApi';
import { toast } from 'react-toastify';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import ErrorModel from './ErrorModel';

interface MenuCard {
  title: string;
  image: string;
  route: string;
}

const cards: MenuCard[] = [
  { title: 'Company Details', image: '/assets/Company Details.png', route: '/company-details' },
  { title: 'Customer Master', image: '/assets/Customer Master.png', route: '/customer-master' },
  { title: 'Plan Details', image: '/assets/plan details.png', route: '/plan-details' },
  { title: 'Invoices', image: '/assets/invoice.png', route: '/invoices' },
  { title: 'TAX Details', image: '/assets/TAX Details.png', route: '/tax-details' },
  { title: 'Extension Upload', image: '/assets/upload.png', route: '/Upload-extension' },
];

const CompanyDash: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [popupContent, setPopupContent] = useState<string | null>(null);

  const customer = location.state as CompanyPreviewDto;
  const companyName = customer?.domainName ?? "Company";
  const [companyDetail, setCompanyDetail] = useState<CustomerListResponseDto | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleCardClick = (card: MenuCard) => {
    if (card.title === 'Customer Master' || card.title === 'Extension Upload') {
      navigate(card.route, { state: customer });
    } else {
      if (!companyDetail) {
        toast.info('Please wait, loading data...');
        return;
      }
      setPopupContent(card.title);
    }
  };

  const closePopup = () => setPopupContent(null);

  const rows: MenuCard[][] = [];
  for (let i = 0; i < cards.length; i += 2) {
    rows.push(cards.slice(i, i + 2));
  }

  function isCompanyDetail(response: CustomerListResponseDto | ErrorResponseDto): response is CustomerListResponseDto {
    return typeof response === 'object' && 'companyDetails' in response;
  }

  function isErrorResponse(response: CustomerListResponseDto | ErrorResponseDto): response is ErrorResponseDto {
    return !Array.isArray(response) && 'message' in response && 'description' in response;
  }

  const fetchDomainDetail = async (id: string) => {
    try {
      setIsLoading(true);
      const data = await getDomainDetail(id);
      if (isErrorResponse(data)) {
        setCompanyDetail(null);
      } else if (isCompanyDetail(data)) {
        setCompanyDetail(data);
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        setShowSessionModal(true);
      } else {
        toast.error('Failed to fetch company detail');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayInitialFetch = setTimeout(() => {
      fetchDomainDetail(customer.id);
    }, 100);
    return () => clearTimeout(delayInitialFetch);
  }, [customer?.id]);

  return (
    <div className="CD-dashboard-container">
      <div className="back-button-container">
        <BackButton className="CD-back-button" iconClassName="CD-add-icon" />
      </div>

      <div className="CD-title-container">
        <h2 className="CD-dashboard-title">{companyName}</h2>
      </div>

      {isLoading ? (
        <div className="loader-container-user">
          <div className="loader"></div>
        </div>
      ) : (
        <div className="CD-dashboard-rows">
          {rows.map((row, index) => (
            <div key={index} className={`CD-card-row ${row.length === 1 ? 'last-row' : ''}`}>
              {row.map((card) => (
                <div key={card.title} className="CD-dashboard-card" onClick={() => handleCardClick(card)}>
                  <img src={card.image} alt={card.title} className="CD-card-image" />
                  <span className="CD-card-title">{card.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {popupContent === 'Company Details' && <PopupCompanyDetails data={companyDetail} onClose={closePopup} />}
      {popupContent === 'Plan Details' && (
        <PopupPlanDetails
          data={companyDetail}
          domainId={customer.id}
          onClose={closePopup}
        />
      )}
      {popupContent === 'Invoices' && <PopupInvoices onClose={closePopup} />}
      {popupContent === 'TAX Details' && <PopupTaxDetails data={companyDetail} onClose={closePopup} />}

      <ErrorModel
        visible={showSessionModal}
        title="Session Expired"
        message="Your session has expired. Please log in again."
        onConfirm={() => {
          setShowSessionModal(false);
          navigate('/');
        }}
        onClose={() => {
          setShowSessionModal(false);
          navigate('/');
        }}
      />
    </div>
  );
};

export default CompanyDash;