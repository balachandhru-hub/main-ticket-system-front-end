import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CompanyBasicInfo from './CompanyBasicInfo';
import CompanySupportInfo from './CompanySupportInfo';
import './CompanyRegistration.css';

import { fetchReferenceList } from '../api/referenceListApi';
import { getDomainById, updateDomain } from '../api/domainApi';
import ErrorModel from '../components/ErrorModel';
 import BackButton from '../components/BackButton';
import type {
  CompanyRegistrationPayload,
  DomainRealm,
  DomainModel,
} from '../Dto/CompanyRegistrationPayload';
import type { ReferenceItem } from '../Dto/ReferenceListDto';
import type { SuccessResponseDto } from '../Dto/SuccessResponseDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
 
const EditDomain: React.FC = () => {
  const inputDisabled = {
    name: true,
    websiteUrl: true,
    registrationNumber: true,
    headquartersLocation: true,
    countriesOfOperation: true,
    businessType: true,
    industryType: true,
    billingAddress: true,
    connectERPSystem: false,
    numberOfUser: false,
    aribaNetworkId: true,
    supportAdminPhoneNo: false,
    supportAdminEmail: false,
    supportAdminName: false,
    supportAdminTimeZone: false,
    designation: false,
    gst: true,
    pan: true,
    tan: true,
    taxRegistration: true,
    vat: true,
    otherLocalTaxId: true,
  };
  const navigate = useNavigate();
  const location = useLocation();
  const domain = location.state as { id: string } | undefined;
  const id = domain?.id;
  const [aribaModules, setAribaModules] = useState<string[]>([]);
  const [realmIds, setRealmIds] = useState<string[]>([]);
  const [urlList, setUrlList] = useState<string[]>([]);
  const [realmInput, setRealmInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createdDomainId, setCreatedDomainId] = useState<string>(''); 
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
      .catch((_error: any) => {
       
        toast.error('Something went wrong while fetching Ariba modules');
      });
 
    if (id) {
      getDomainById(id).then((data) => {
        if ('statusCode' in data) {
          toast.error(data.message || 'Failed to fetch domain details');
        } else {
          setFormData({
            ...formData,
            ...data,
            numberOfUser: data.numberOfUser ? String(data.numberOfUser) : '',
            aribaModules: data.domainModels ? data.domainModels.map((m: any) => m.modelName) : [],
          });
          setRealmIds(data.domainRealms ? data.domainRealms.map((r: any) => r.realmId) : []);
          setUrlList(data.domainRealms ? data.domainRealms.map((r: any) => r.aribaWebsiteUrl) : []);
        }
      });
    }
  }, [id]);
 
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
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
 
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
      nda: false,
      domainRealms,
      domainModels,
    };
 
    function isSuccess(response: SuccessResponseDto | ErrorResponseDto): response is SuccessResponseDto {
      return 'id' in response;
    }
 
    function isErrorResponse(response: SuccessResponseDto | ErrorResponseDto): response is ErrorResponseDto {
      return 'message' in response && 'statusCode' in response;
    }
 
    try {
      if (!id) {
        toast.error('Missing domain ID.');
        return;
      }
      const response = await updateDomain(id, payload);
 
      if (isSuccess(response) && (response.statusCode === 200 || response.statusCode === 201)) {
        toast.success('Domain updated successfully!');
        setCreatedDomainId(response.id);
        setIsSubmitted(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else if (isErrorResponse(response)) {
        if (response.statusCode === 412) {
          toast.error(response.message || 'Ariba Network ID already exists.');
        } else if (response.statusCode === 401) {
          setShowSessionModal(true);
        } else {
          toast.error(response.message || 'Update failed.');
        }
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || 'Update failed';
 
      if (status === 412) {
        toast.error(message || 'Ariba Network ID already exists.');
      } else {
        toast.error(`Update failed: ${message}`);
      }
    }
  };
 
  const handleSessionConfirm = () => {
    setShowSessionModal(false);
    navigate('/');
  };
 
  const handleNext = () => {
    if (createdDomainId) {
      navigate('/business-plan', { state: { domainId: createdDomainId } }); 
    } else {
      toast.error('Missing domain ID. Please resubmit or reload the page.');
    }
  };
 
  return (
    <div className="form-wrapper">
      <form className="company-form" onSubmit={handleSubmit}>
        <ToastContainer position="top-right" autoClose={3000} />
 
    
 <div className='button-row-back'>  <BackButton /></div>
        <div className="cr-title-wrapper">
          <h3 className="form-title">Edit Domain Details</h3>
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
            inputDisabled={inputDisabled}
            isEdit={true}
            hideDropdowns={true} 
          />

          <CompanySupportInfo
            formData={formData}
            handleChange={handleChange}
            errors={errors}
            inputDisabled={inputDisabled}
          />

          <div className="submit-section">
            {!isSubmitted && (
              <button type="submit" className="cr-submit-btn">Update</button>
            )}
            {isSubmitted && (
              <button type="button" className="next-btn" onClick={handleNext}>Next</button>
            )}
          </div>

          {showSessionModal && <ErrorModel
            visible={showSessionModal}
            title="Session Expired"
            message="Your session has expired. Please log in again."
            onConfirm={handleSessionConfirm}
            onClose={handleSessionConfirm} />}
        </div>
      </form>
    </div>
  );
};
 
export default EditDomain;
 