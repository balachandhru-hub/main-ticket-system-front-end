import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CompanyBasicInfo from './CompanyBasicInfo';
import CompanySupportInfo from './CompanySupportInfo';
import TermsAndCondition from './TermsAndCondition';
import './CompanyRegistration.css';
import BackButton from "./BackButton";
import { fetchReferenceList } from '../api/referenceListApi';
import { createDomain, getDomainDetail } from '../api/domainApi';
import ErrorModel from '../components/ErrorModel';

import type {
  CompanyRegistrationPayload,
  DomainRealm,
  DomainModel,
} from '../Dto/CompanyRegistrationPayload';
import type { ReferenceItem } from '../Dto/ReferenceListDto';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';

const CompanyRegistration: React.FC = () => {
  const navigate = useNavigate();

  const [aribaModules, setAribaModules] = useState<string[]>([]);
  const [realmIds, setRealmIds] = useState<string[]>([]);
  const [urlList, setUrlList] = useState<string[]>([]);
  const [realmInput, setRealmInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [formData, setFormData] = useState({
    name: '',
    websiteUrl: '',
    registrationNumber: '',
    headquartersLocation: '',
    countriesOfOperation: '',
    businessType: '',
    industryType: '',
    billingAddress: '',
    connectERPSystem: '',
    numberOfUser: '',
    aribaNetworkId: '',
    supportAdminPhoneNo: '',
    supportAdminEmail: '',
    supportAdminName: '',
    supportAdminTimeZone: '',
    designation: '',
    gst: '',
    pan: '',
    tan: '',
    taxRegistration: '',
    vat: '',
    lut: '',
    otherLocalTaxId: '',
    aribaModules: [] as string[],
  });

  useEffect(() => {
    fetchReferenceList(['Ariba_model'])
      .then((data) => {
        if ('statusCode' in data) {
         
          toast.error('Failed to fetch Ariba modules');
        } else {
          const cleaned = data.map((item: ReferenceItem) => item.key);
          setAribaModules(cleaned);
        }
      })
      .catch(() => {
       
        toast.error('Something went wrong while fetching Ariba modules');
      });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (typeof value === 'string') {
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleCheckboxChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      aribaModules: prev.aribaModules.includes(value)
        ? prev.aribaModules.filter((m: string) => m !== value)
        : [...prev.aribaModules, value],
    }));
  };

  const validateField = (name: string, value: string): string => {
    if (!value) return 'This field is required';

    const alphaOnly = /^[A-Za-z\s]+$/;
    const alphaNum = /^[A-Za-z0-9\s]+$/;
    const numbersOnly = /^[0-9]+$/;
    const emailOrgRegex = /^[^\s@]+@[^\s@]+\.(com|in)$/;
    const urlRegex = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}.*$/i;
    switch (name) {
      case 'name':
        return '';
      case 'supportAdminName':
      case 'designation':
      case 'headquartersLocation':
        return alphaOnly.test(value) ? '' : 'Only letters are allowed';
      case 'registrationNumber':
      case 'gst':
      case 'pan':
      case 'tan':
      case 'taxRegistration':
      case 'vat':
      case 'otherLocalTaxId':
        return alphaNum.test(value) ? '' : 'Only alphanumeric characters allowed';
      case 'websiteUrl':
        return urlRegex.test(value) ? '' : 'Enter a valid URL';
      case 'supportAdminEmail':
        return emailOrgRegex.test(value) ? '' : 'Use a valid organization email';
      case 'supportAdminPhoneNo':
        return value === '' || numbersOnly.test(value) ? '' : 'Only numbers allowed';
      default:
        return '';
    }
  };

  const handleAddRealm = () => {
    if (realmInput.trim() && urlInput.trim()) {
      setRealmIds((prev) => [...prev, realmInput.trim()]);
      setUrlList((prev) => [...prev, urlInput.trim()]);
      setRealmInput('');
      setUrlInput('');
    } else {
      toast.error('Both Realm ID and URL are required');
    }
  };

  const handleRemoveRealm = (index: number) => {
    const newRealms = [...realmIds];
    const newUrls = [...urlList];
    newRealms.splice(index, 1);
    newUrls.splice(index, 1);
    setRealmIds(newRealms);
    setUrlList(newUrls);
  };

  const requiredFields = [
    'name', 'websiteUrl', 'registrationNumber', 'headquartersLocation', 'countriesOfOperation',
    'businessType', 'industryType', 'billingAddress',
    'supportAdminPhoneNo', 'supportAdminEmail', 'supportAdminName', 'supportAdminTimeZone', 'designation',
  ];

  const handleSessionConfirm = () => {
    setShowSessionModal(false);
    navigate('/');
  };

  const handleNext = async () => {
    const newErrors: { [key: string]: string } = {};
    requiredFields.forEach((field) => {
      const value = formData[field as keyof typeof formData];
      if (typeof value === 'string' && !value.trim()) {
        newErrors[field] = 'This field is required';
      } else if (typeof value === 'string') {
        const error = validateField(field, value);
        if (error) newErrors[field] = error;
      }
    });

    //  conditional required validation for tax fields
    if (formData.countriesOfOperation.trim().toLowerCase() === 'india') {
      if (!formData.gst.trim()) newErrors.gst = 'GST Number is required';
      if (!formData.tan.trim()) newErrors.tan = 'TAN Number is required';
      if (!formData.pan.trim()) newErrors.pan = 'PAN Number is required';
      if (!formData.taxRegistration.trim()) newErrors.taxRegistration = 'TAX Registration is required';
    } else if (formData.countriesOfOperation.trim()) {
      // For non-India countries, require LUT Number (lut)
      if (!formData.lut || !formData.lut.trim()) newErrors.lut = 'LUT Number is required';
    }

    if (!agreedToTerms) {
      toast.error('You must agree to the NDA');
      return;
    }

    if (realmIds.length === 0 || urlList.length === 0 || realmIds.length !== urlList.length) {
      toast.error('Please add at least one valid Ariba Realm ID and URL');
      return;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fix the highlighted errors');
      return;
    }

    const domainRealms: DomainRealm[] = realmIds.map((id, index) => ({
      realmId: id,
      aribaWebsiteUrl: urlList[index],
    }));

    const domainModels: DomainModel[] = formData.aribaModules.map((model: string) => ({
      modelName: model,
    }));

    const payload: CompanyRegistrationPayload = {
      ...formData,
      taxApplicable: true,
      numberOfUser: parseInt(formData.numberOfUser || '0'),
      nda: agreedToTerms,
      domainRealms,
      domainModels,

      ...(undefined as any),
    } as any;


    (payload as any).taxDetails = {
      gst: formData.gst || '',
      pan: formData.pan || '',
      tan: formData.tan || '',
      vat: formData.vat || '',
      taxRegistration: formData.taxRegistration || '',
      otherLocalTaxId: formData.otherLocalTaxId || '',
      lutNumber: formData.lut || ''
    };

    function isSuccess(response: SuccessResponseDto | ErrorResponseDto): response is SuccessResponseDto {
      return 'id' in response;
    }

    function isErrorResponse(response: SuccessResponseDto | ErrorResponseDto): response is ErrorResponseDto {
      return 'message' in response && 'statusCode' in response;
    }

    try {

      (payload as any).lutNumber = formData.lut || '';
      (payload as any).lut = formData.lut || '';

      const response = await createDomain(payload);

        if (isSuccess(response) && response.statusCode === 201) {
          toast.success('submitted successfully!');

          try {
            const created = await getDomainDetail(response.id);
            const createdAny = created as any;
            const createdLut = (
              createdAny?.taxDetails?.lutNumber ||
              createdAny?.taxDetails?.lut ||
              createdAny?.lut ||
              createdAny?.lutNumber ||
              ''
            ).toString().trim();

            if (createdLut) {
              toast.success('LUT saved on server');
            } else {
              toast.warn('Created, but LUT not saved on server');
            }
          } catch (e) {
            
          }

        } else if (isErrorResponse(response)) {
        if (response.statusCode === 412) {
          toast.error(response.message || 'Ariba Network ID already exists.');
        } else if (response.statusCode === 401) {
          setShowSessionModal(true);
        } else {
          toast.error(response.message || 'Submission failed.');
        }
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || 'Submission failed';

      if (status === 412) {
        toast.error(message || 'Ariba Network ID already exists.');
      } else {
        toast.error(`Submission failed: ${message}`);
      }
    }
  };


  return (
    <div className="form-wrapper">
      <div className="company-form">
        <ToastContainer position="top-right" autoClose={3000} />

        <div className="button-row-back">
          <BackButton />
        </div>

        <div className="cr-title-wrapper">
          <h3 className="form-title">Company Registration Details</h3>
        </div>

        <div className="cr-body-wrapper">
          <CompanyBasicInfo
            formData={formData}
            handleChange={handleChange}
            realmIds={realmIds}
            realmInput={realmInput}
            setRealmInput={setRealmInput}
            handleAddRealm={handleAddRealm}
            handleRemoveRealm={handleRemoveRealm}
            urlInput={urlInput}
            setUrlInput={setUrlInput}
            urlList={urlList}
            aribaModules={aribaModules}
            handleCheckboxChange={handleCheckboxChange}
            errors={errors}
          />

          <CompanySupportInfo
            formData={formData}
            handleChange={handleChange}
            errors={errors}
          />

          <div className="nda-agreement">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
              />
              I agree to the Non-Disclosure Agreement (NDA)&nbsp;
              <span onClick={() => setShowTermsModal(true)} className="nda-link">
                View details
              </span>
            </label>
          </div>

          <div className="submit-section">
            <button type="button" className="next-btn" onClick={handleNext}>Submit</button>
          </div>
          {showTermsModal && (
            <div className="CR-modal-overlay">
              <div className="CR-modal-content">
                <TermsAndCondition
                  onClose={() => setShowTermsModal(false)}
                  setAgreedToTerms={setAgreedToTerms}
                />
              </div>
            </div>
          )}
          {showSessionModal && <ErrorModel
            visible={showSessionModal}
            title="Session Expired"
            message="Your session has expired. Please log in again."
            onConfirm={handleSessionConfirm}
            onClose={handleSessionConfirm} />}
        </div>
      </div>
    </div>
  );
};

export default CompanyRegistration;