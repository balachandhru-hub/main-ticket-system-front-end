import React, { useState, useEffect } from 'react';
import './BusinessModels.css';
import PayAsYouGoForm from './PayAsYouGoForm';
import SubscriptionForm from './SubscriptionForm';
import SupportTeamForm from './SupportTeamForm';
import SuccessfulPopup from './SuccessfulPopup';
import BackButton from './BackButton';
import { getPlanConfig } from '../api/planConfig';
import { createDomainPlan } from '../api/domainPlan';
import ErrorModel from './ErrorModel';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { EngagementType, PlanConfigDto } from '../Dto/PlanConfigDto';
import type { CreateDomainPlanDto } from '../Dto/CreateDomainPlanDto';
import DiscountCouponPopup from './DiscountCouponPopup';
import { createDiscountCoupon } from '../api/discountApi';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import { PLAN_TYPES, PAYMENT_TYPES, ENTITY_TYPE, ASSET_TYPES, type PlanType, type PaymentType, type ExpiryTime, EXPIRY_TIME } from '../common/common';
import contractIcon from '../assets/contractIcon.png';
import discountIcon from '../assets/discountIcon.png';

const BusinessModels: React.FC = () => {
  const [showDiscountPopup, setShowDiscountPopup] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discountGenerated, setDiscountGenerated] = useState(false);

  const handleGenerateDiscount = async (discount: number) => {
    try {
      const payload = { discountPercentage: discount };
      const result = await createDiscountCoupon(payload) as any;
      if (result && result.statusCode === 201 && result.id) {
        setCouponCode(result.id);
        setDiscountGenerated(true);
        toast.success(`Coupon code generated: ${result.id}`);
      } else if (result && result.statusCode === 401) {
        toast.error(result.message || 'Session expired. Please log in again.');
        navigate('/');
       } else if (result && result.statusCode === 403) {
        toast.error(result.message || 'No access. You do not have permission to perform this action.');
      }
    } catch (err: any) {
      toast.error('Failed to generate coupon');
    } finally {
      setShowDiscountPopup(false);
    }
  };
  const navigate = useNavigate();
  const location = useLocation();

  const domainId = location.state?.domainId;

  const [activeTab, setActiveTab] = useState<'payg' | 'subscription' | 'support'>('payg');
  const [loading, setLoading] = useState(false);

  const [paygEngagementType, setPaygEngagementType] = useState<EngagementType>('BUSINESS_HOURS');
  const [subscriptionEngagementType, setSubscriptionEngagementType] = useState<EngagementType>('BUSINESS_HOURS');
  const [supportEngagementType, setSupportEngagementType] = useState<EngagementType>('BUSINESS_HOURS');

  const [paygPaymentType, setPaygPaymentType] = useState<PaymentType>(PAYMENT_TYPES.MONTHLY);
  const [paygExpiryTime, setPaygExpiryTime] = useState<ExpiryTime>(EXPIRY_TIME.DAYS_15);
  const [subPaymentType, setSubPaymentType] = useState<PaymentType>(PAYMENT_TYPES.MONTHLY);
  const [subExpiryTime, setSubExpiryTime] = useState<ExpiryTime>(EXPIRY_TIME.DAYS_15);
  const [supPaymentType, setSupPaymentType] = useState<PaymentType>(PAYMENT_TYPES.MONTHLY);
  const [supExpiryTime, setSupExpiryTime] = useState<ExpiryTime>(EXPIRY_TIME.DAYS_15);

  const [paygForm, setPaygForm] = useState<PlanConfigDto>({} as PlanConfigDto);
  const [subscriptionForm, setSubscriptionForm] = useState<PlanConfigDto>({} as PlanConfigDto);
  const [supportForm, setSupportForm] = useState<PlanConfigDto>({} as PlanConfigDto);

  const [paygDefault, setPaygDefault] = useState<PlanConfigDto>({} as PlanConfigDto);
  const [subscriptionDefault, setSubscriptionDefault] = useState<PlanConfigDto>({} as PlanConfigDto);
  const [supportDefault, setSupportDefault] = useState<PlanConfigDto>({} as PlanConfigDto);

  // File state management (only for PAYG)
  const [paygFile, setPaygFile] = useState<File | null>(null);

  const [showPopup, setShowPopup] = useState(false);
  const [submittedFormType, setSubmittedFormType] = useState('');
  const [showSessionModal, setShowSessionModal] = useState(false);

  useEffect(() => {
    if (!domainId) {
      toast.warn('You can not access this page directly. Redirecting...');
      navigate('/dashboard');
    }
  }, [domainId]);

  const isValidGUID = (str: string): boolean =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

  const calculateEndDate = (startDate: string, paymentType: PaymentType): string => {
    if (!startDate) return '';
    const start = new Date(startDate);
    const end = new Date(start);
    switch (paymentType) {
      case PAYMENT_TYPES.MONTHLY: end.setMonth(end.getMonth() + 1); break;
      case PAYMENT_TYPES.YEARLY: end.setFullYear(end.getFullYear() + 1); break;
      default: end.setMonth(end.getMonth() + 1);
    }
    return end.toISOString().split('T')[0];
  };

  const getPlanType = (tab: string): PlanType =>
    tab === 'payg' ? PLAN_TYPES.PAY_AS_USE :
    tab === 'subscription' ? PLAN_TYPES.SUBSCRIPTION :
    PLAN_TYPES.SUPPORT_TEAM;

  const getCurrentEngagementType = (): EngagementType =>
    activeTab === 'payg' ? paygEngagementType :
    activeTab === 'subscription' ? subscriptionEngagementType : supportEngagementType;

  function isErrorResponse(response: PlanConfigDto | ErrorResponseDto): response is ErrorResponseDto {
    return 'message' in response && 'description' in response;
  }

  const fetchPlanData = async (planType: PlanType, engagementType: EngagementType) => {
    setLoading(true);
    try {
      const data = await getPlanConfig(planType, engagementType);
      if (isErrorResponse(data)) {
        if (data.statusCode === 401) {
          setShowSessionModal(true);
        } else {
          toast.error(data.message);
        }
      } else {
        const enriched = { ...data, engagementType, planType };
        if (planType === PLAN_TYPES.PAY_AS_USE) {
          setPaygForm(enriched);
          setPaygDefault(enriched);
        } else if (planType === PLAN_TYPES.SUBSCRIPTION) {
          const defaulted = { ...enriched, noOfConsultants: 1, monthlyHours: 176, resourceCost: 176 };
          setSubscriptionForm(defaulted);
          setSubscriptionDefault(defaulted);
        } else {
          const defaulted = { ...enriched, manager: 1, managerCost: 3000 };
          setSupportForm(defaulted);
          setSupportDefault(defaulted);
        }
      }
    } catch {
      toast.error('Failed to fetch plan data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanData(getPlanType(activeTab), getCurrentEngagementType());
  }, [activeTab]);

  const handleSubmit = async (formType: string) => {
    const rawData = formType === 'payg' ? paygForm : formType === 'subscription' ? subscriptionForm : supportForm;
    const currentFile = paygFile

    if (!domainId) {
      toast.error('Missing domain ID!');
      return;
    }

    const currentPaymentType = formType === 'payg' ? paygPaymentType : formType === 'subscription' ? subPaymentType : supPaymentType;
    const currentExpiryTime = formType === 'payg' ? paygExpiryTime : formType === 'subscription' ? subExpiryTime : supExpiryTime;

    if (!currentPaymentType || !currentExpiryTime || !rawData.startDate) {
      toast.error('Please fill all required fields');
      return;
    }

    const payload: CreateDomainPlanDto = {
      domainId,
      planName: getPlanType(formType),
      engagementType: rawData.engagementType || 'BUSINESS_HOURS',
      startDate: rawData.startDate,
      paymentType: currentPaymentType,
      endDate: calculateEndDate(rawData.startDate, currentPaymentType),
      contractStartDate: rawData.contractStartDate,
      contractEndDate: rawData.contractEndDate,
      expiryTime: formType === 'payg' ? Number(paygExpiryTime) : formType === 'subscription' ? Number(subExpiryTime) : Number(supExpiryTime),
    };

    if (rawData.discountCode && isValidGUID(rawData.discountCode)) {
      payload.discountCouponId = rawData.discountCode;
    }

    // Contract dates are kept in form but not sent to backend yet
    if (formType === 'payg') {
      payload.crHoursBeyondLimit = Number(rawData.crBeyond8Hours);
      payload.ticketCharge = Number(rawData.chargePerTicket);
    } else if (formType === 'subscription') {
      payload.numberOfConsult = Number(rawData.noOfConsultants);
      payload.monthlyHours = Number(rawData.monthlyHours);
      payload.additionalCRHoursCharge = Number(rawData.additionalCR);
      payload.resourceCost = Number(rawData.resourceCost);
    } else {
      payload.numberOfResources = Number(rawData.resources);
      payload.crCost = Number(rawData.crCost);
      payload.numberOfManager = Number(rawData.manager);
      payload.managerCost = Number(rawData.managerCost);
      payload.resourceCost = Number(rawData.resourceCost);
    }

    
    if (currentFile) {
      try {
        const base64String = await convertFileToBase64(currentFile);
        payload.asset = {
          entityType: ENTITY_TYPE.DOMAIN_PLAN,
          entityId: domainId,
          assetType: ASSET_TYPES.CONTRACT_FILE,
          fileBytes: base64String,
          fileName: currentFile.name,
          contentType: currentFile.type,
          isSingletonAsset: true
        };
      } catch (error) {
        toast.error('Failed to process file');
        return;
      }
    }

    try {
      setLoading(true);
      const result = await createDomainPlan(payload);
      if ('statusCode' in result && result.statusCode !== 201) {
              toast.error("Fill all the required fields");
      } else {
        setSubmittedFormType(formType);
        setShowPopup(true);
      }
    } catch {
      toast.error('Failed to submit plan');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert file to base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'engagementType') {
      const newType = value as EngagementType;
      if (activeTab === 'payg') setPaygEngagementType(newType);
      else if (activeTab === 'subscription') setSubscriptionEngagementType(newType);
      else setSupportEngagementType(newType);
      fetchPlanData(getPlanType(activeTab), newType);
      return;
    }
    if (name === 'paymentType') {
      const paymentType = value as PaymentType;
      if (activeTab === 'payg') setPaygPaymentType(paymentType);
      else if (activeTab === 'subscription') setSubPaymentType(paymentType);
      else setSupPaymentType(paymentType);
      return;
    }
    if (name === 'expiryTime') {
      const expiryTime = value as ExpiryTime;
      if (activeTab === 'payg') setPaygExpiryTime(expiryTime);
      else if (activeTab === 'subscription') setSubExpiryTime(expiryTime);
      else setSupExpiryTime(expiryTime);
      return;
    }
    if (activeTab === 'subscription' && (name === 'noOfConsultants' || name === 'numberOfConsultants')) {
      const val = parseInt(value) || 1;
      setSubscriptionForm(prev => ({ ...prev, [name]: val, monthlyHours: 176 * val, resourceCost: 176 * val }));
      return;
    }
    if (activeTab === 'support' && name === 'manager') {
      const val = parseInt(value) || 1;
      setSupportForm(prev => ({ ...prev, [name]: val, managerCost: 3000 * val }));
      return;
    }

    const updater = (prev: PlanConfigDto) => ({ ...prev, [name]: value });
    if (activeTab === 'payg') setPaygForm(updater);
    else if (activeTab === 'subscription') setSubscriptionForm(updater);
    else setSupportForm(updater);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    
    if (file) {
      const validTypes = [
        'application/pdf',
      ];
      
      if (!validTypes.includes(file.type)) {
        toast.error('Please select a valid PDF file');
        e.target.value = ''; 
        return;
      }
      
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error('File size must be less than 10MB');
        e.target.value = ''; 
        return;
      }
    }
    
    setPaygFile(file); // Only for PAYG
  };

  const handleReset = (type: string) => {
    if (type === 'payg') {
      setPaygForm(paygDefault);
      setPaygPaymentType(PAYMENT_TYPES.MONTHLY);
      setPaygExpiryTime(EXPIRY_TIME.DAYS_15);
      setPaygFile(null);
    } else if (type === 'subscription') {
      setSubscriptionForm(subscriptionDefault);
      setSubPaymentType(PAYMENT_TYPES.MONTHLY);
      setSubExpiryTime(EXPIRY_TIME.DAYS_15);
    } else {
      setSupportForm(supportDefault);
      setSupPaymentType(PAYMENT_TYPES.MONTHLY);
      setSupExpiryTime(EXPIRY_TIME.DAYS_15);
    }
  };

  return (
    <>
       <div className="BP-container">
        <div className="bp-back-fixed-wrapper"><BackButton /></div>
        <div className="BP-header">Business Plans</div>

        <div className="BP-button-row">
          <button className="custom-button">
            <img src={contractIcon} alt="Contract Icon" className="button-icon" />
            Contract Agreement
          </button>
          <button
            className="custom-button"
            onClick={() => {
              setShowDiscountPopup(true);
              setCouponCode(null);
              setDiscountGenerated(false);
            }}
            disabled={discountGenerated}
          >
            <img src={discountIcon} alt="Discount Icon" className="button-icon" />
            Generate Discount Code
          </button>
      <DiscountCouponPopup
        visible={showDiscountPopup}
        onClose={() => setShowDiscountPopup(false)}
        onSubmit={handleGenerateDiscount}
        couponCode={couponCode}
        disabled={discountGenerated}
      />
          </div>
        {loading ? (
          <div className="loader-container-user"><div className="loader"></div></div>
        ) : (
          <>
            <div className="BP-tabs">
              <button className={activeTab === 'payg' ? 'BP-active' : ''} onClick={() => setActiveTab('payg')}>Pay as you use</button>
              <button className={activeTab === 'subscription' ? 'BP-active' : ''} onClick={() => setActiveTab('subscription')}>Subscription</button>
              <button className={activeTab === 'support' ? 'BP-active' : ''} onClick={() => setActiveTab('support')}>Support team</button>
            </div>

            {activeTab === 'payg' && (
              <PayAsYouGoForm
              
                formData={{ ...paygForm, discountCode: couponCode || paygForm.discountCode }}
              
                handleChange={handleChange}
              
                handleFileChange={handleFileChange}
                selectedFile={paygFile}
                handleSubmit={handleSubmit}
              
                handleReset={handleReset}
              
                loading={loading}
              
                paymentType={paygPaymentType}

                expiryTime={paygExpiryTime}

              />
            )}
            {activeTab === 'subscription' && (
              <SubscriptionForm 
                formData={{ ...subscriptionForm, discountCode: couponCode || subscriptionForm.discountCode }} 
                handleChange={handleChange} 
                handleSubmit={handleSubmit} 
                handleReset={handleReset} 
                loading={loading} 
                paymentType={subPaymentType} 
                expiryTime={subExpiryTime}
                handleFileChange={handleFileChange}
                selectedFile={paygFile} 
              />
            )}
            {activeTab === 'support' && (
              <SupportTeamForm 
                formData={{ ...supportForm, discountCode: couponCode || supportForm.discountCode }} 
                handleChange={handleChange} 
                handleSubmit={handleSubmit} 
                handleReset={handleReset} 
                loading={loading} 
                paymentType={supPaymentType} 
                expiryTime={supExpiryTime}
                handleFileChange={handleFileChange}
                selectedFile={paygFile} 
              />
            )}
          </>
        )}
      </div>

      <SuccessfulPopup
        show={showPopup}
        onClose={() => setShowPopup(false)}
        formType={submittedFormType}
        startDate={submittedFormType === 'payg' ? paygForm.startDate || '' : submittedFormType === 'subscription' ? subscriptionForm.startDate || '' : supportForm.startDate || ''}
        endDate={
          submittedFormType === 'payg' ? calculateEndDate(paygForm.startDate || '', paygPaymentType) :
          submittedFormType === 'subscription' ? calculateEndDate(subscriptionForm.startDate || '', subPaymentType) :
          submittedFormType === 'support' ? calculateEndDate(supportForm.startDate || '', supPaymentType) : ''
        }
      />

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
    </>
  );
};

export default BusinessModels;