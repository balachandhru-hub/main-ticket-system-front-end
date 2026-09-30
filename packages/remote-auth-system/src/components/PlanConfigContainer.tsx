// src/components/PlanConfigContainer.tsx
import React, { useEffect, useState } from 'react';
import { getPlanConfig } from '../api/planConfig';
import type { PlanType, EngagementType, PlanConfigDto } from '../Dto/PlanConfigDto';
import SubscriptionForm from './SubscriptionForm';
import PayAsYouGoForm from './PayAsYouGoForm';
import SupportTeamForm from './SupportTeamForm';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import { toast } from 'react-toastify';
import ErrorModel from './ErrorModel';
import { useNavigate } from 'react-router-dom';

const PlanConfigContainer: React.FC = () => {
  const [planType, setPlanType] = useState<PlanType>('PAY_AS_USE');
  const [engagementType, setEngagementType] = useState<EngagementType>('BUSINESS_HOURS');
  const [formData, setFormData] = useState<Partial<PlanConfigDto>>({});
  const [defaultData, setDefaultData] = useState<Partial<PlanConfigDto>>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [errorPage, setErrorPage] = useState(false);
  const [errorPageData, setErrorPageData] = useState({
    title: '',
    message: ''
  })

  function isErrorResponse(response: PlanConfigDto | ErrorResponseDto): response is ErrorResponseDto {
    return 'message' in response && 'description' in response;
  }

  const handleModalConfirm = () => {
    setErrorPage(false);
    navigate('/');
  };

  const handleModalClose = () => {
    setErrorPage(false);
    navigate('/');
  };
  // Fetch config when dropdown changes
  useEffect(() => {
    fetchPlanConfig();
  }, [planType, engagementType]);

  const fetchPlanConfig = async () => {
    setLoading(true);
    try {
      const result = await getPlanConfig(planType, engagementType);
      if (isErrorResponse(result)) {
        if (result.statusCode === 401) {
          setErrorPage(true);
          setErrorPageData({
            ...errorPageData,
            title: result.message,
            message: result.description
          });
        }
      } else {
        const enrichedData: Partial<PlanConfigDto> = {
          ...result,
          planType,
          engagementType,
        };
        setFormData(enrichedData);
        setDefaultData(enrichedData);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to Fetch Default Plan Detail');
      setFormData({});
      setDefaultData({});
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = () => {
    // const payload: PlanConfigDto = {
    //   ...(formData as PlanConfigDto),
    //   planType,
    //   engagementType,
    // };

 
  };

  const handleReset = () => {
    setFormData(defaultData);
  };

  const formProps = {
    formData,
    handleChange,
    handleSubmit,
    handleReset,
    loading,
  };

  return (
    <div className="plan-config-wrapper">
      <div className="dropdowns">
        <select value={planType} onChange={(e) => setPlanType(e.target.value as PlanType)}>
          <option value="PAY_AS_USE">Pay As You Use</option>
          <option value="SUBSCRIPTION">Subscription</option>
          <option value="SUPPORT_TEAM">Support Team</option>
        </select>

        <select value={engagementType} onChange={(e) => setEngagementType(e.target.value as EngagementType)}>
          <option value="BUSINESS_HOURS">Business Hours</option>
          <option value="24_7_HOURS">24/7 Hours</option>
        </select>
      </div>

      {planType === 'PAY_AS_USE' && <PayAsYouGoForm {...formProps} />}
      {planType === 'SUBSCRIPTION' && <SubscriptionForm {...formProps} />}
      {planType === 'SUPPORT_TEAM' && <SupportTeamForm {...formProps} />}

      {errorPage && <ErrorModel visible={true} title={''} message={errorPageData.message} onClose={handleModalClose} onConfirm={handleModalConfirm} />}
    </div>
  );
};

export default PlanConfigContainer;
