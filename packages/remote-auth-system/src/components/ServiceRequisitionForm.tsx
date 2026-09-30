import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ServiceRequisitionForm.css';
import { TbTruckDelivery, TbPackage } from "react-icons/tb";
import { FaFileInvoiceDollar } from "react-icons/fa6";
import { FaChartArea } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";
import { FaBuilding } from "react-icons/fa";
import { FaWandMagicSparkles } from "react-icons/fa6";
import { FiEdit, FiChevronDown } from "react-icons/fi";
import { GrSend } from "react-icons/gr";
import BackButton from './BackButton';
import { createServicePR } from '../api/servicePRApi';
import { getCommodityDetails, getPRSmartDefaults } from '../api/smmaterialPRApi';
import type { ServicePRDto } from '../Dto/CreateServicePRDto';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { getMyProfile } from '../api/userApi';
import { getCommodityCodes } from '../api/PulseReportInvoiceApi';
import { fetchGLAccounts, fetchCostCenters,searchSuppliers } from '../api/PulseReportFilterApi';



type LineItem = {
  maximumAmount: string;
  expectedAmount: string;
  id: string;
  lineNo: number;
  uniqueId: string;
  purchaseOrg: string;
  vendor: string;
  title: string;
  description: string;
  prServiceUniqueName: string;
  contract: string;
  purchaseGroup: string;
  amount: string;
  serviceStartDate: string;
  serviceEndDate: string;
  glAccount: string;
  costCenter: string;
  companyCode?: string;
  shipToPlant?: string;
  billTo?: string;
  taxCode?: string;
  deliveryDate?: string;
  deliveryTo?: string;
  commodityCode: string;
  uom?: string;
};

type SmartDefaults = {
  companyCode: string;
  shipToPlant: string;
  billTo: string;
  purchaseGroup: string;
  purchaseOrg: string;
  currency: string;
  deliverTo?: string;
  taxCode?: string;
  costCenter?: string;
};

const ServiceRequisitionForm: React.FC = () => {
  const navigate = useNavigate();
  const today = new Date();
  const [formData, setFormData] = useState({
    purchaseOrg: '',
    vendor: '',
    description: '',
    commodityCode: '',
    contract: '',
    purchaseGroup: '',
    amount: '',
    serviceStartDate: today.toISOString().split('T')[0],
    serviceEndDate: new Date(
      today.getFullYear(),
      today.getMonth() + 1,
    ).toISOString().split('T')[0],
    glAccount: '',
    costCenter: '',
    title: '',
    prServiceUniqueName: '',
    deliveryDate: '',
    deliveryTo: '',
    companyCode: '',
    shipToPlant: '',
    billTo: '',
    currency: '',
    taxCode: '',
    uom: '',
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [smartDefaults, setSmartDefaults] = useState<SmartDefaults>({
    companyCode: '',
    shipToPlant: '',
    billTo: '',
    purchaseGroup: '',
    currency: '',
    deliverTo: '',
    taxCode: '',
    purchaseOrg: '',
    costCenter: '',
  });
  const [isLoadingSmartDefaults, setIsLoadingSmartDefaults] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showChangePRModal, setShowChangePRModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Commodity Codes State
  const [commodityCodesList, setCommodityCodesList] = useState<string[]>([]);
  const [selectedCommodityCode, setSelectedCommodityCode] = useState<string>('');
  const [commoditySearchTerm, setCommoditySearchTerm] = useState<string>('');
  const [commodityPage, setCommodityPage] = useState<number>(1);
  const [commodityHasMore, setCommodityHasMore] = useState<boolean>(true);
  const [commodityLoading, setCommodityLoading] = useState<boolean>(false);
  const [commodityDropdownOpen, setCommodityDropdownOpen] = useState<boolean>(false);

  // GL Accounts State
  const [glAccountsList, setGlAccountsList] = useState<string[]>([]);
  const [selectedGLAccount, setSelectedGLAccount] = useState<string>('');
  const [glAccountSearchTerm, setGlAccountSearchTerm] = useState<string>('');
  const [glAccountPage, setGlAccountPage] = useState<number>(1);
  const [glAccountTotalPages, setGlAccountTotalPages] = useState<number>(1);
  const [glAccountLoading, setGlAccountLoading] = useState<boolean>(false);
  const [glAccountDropdownOpen, setGlAccountDropdownOpen] = useState<boolean>(false);

  // Cost Centers State
  const [costCentersList, setCostCentersList] = useState<string[]>([]);
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('');
  const [costCenterSearchTerm, setCostCenterSearchTerm] = useState<string>('');
  const [costCenterPage, setCostCenterPage] = useState<number>(1);
  const [costCenterTotalPages, setCostCenterTotalPages] = useState<number>(1);
  const [costCenterLoading, setCostCenterLoading] = useState<boolean>(false);
  const [costCenterDropdownOpen, setCostCenterDropdownOpen] = useState<boolean>(false);

  // Vendor State
  const [vendorsList, setVendorsList] = useState<string[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [vendorSearchTerm, setVendorSearchTerm] = useState<string>('');
  const [vendorPage, setVendorPage] = useState<number>(1);
  const [vendorTotalPages, setVendorTotalPages] = useState<number>(1);
  const [vendorLoading, setVendorLoading] = useState<boolean>(false);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState<boolean>(false);

  // Refs
  const commodityDropdownRef = useRef<HTMLDivElement>(null);
  const commodityListRef = useRef<HTMLDivElement>(null);
  const debounceCommodityRef = useRef<NodeJS.Timeout | null>(null);
  const initialCommodityLoadRef = useRef(true);

  const glAccountDropdownRef = useRef<HTMLDivElement>(null);
  const glAccountListRef = useRef<HTMLDivElement>(null);
  const debounceGlAccountRef = useRef<NodeJS.Timeout | null>(null);
  const initialGlAccountLoadRef = useRef(true);

  const costCenterDropdownRef = useRef<HTMLDivElement>(null);
  const costCenterListRef = useRef<HTMLDivElement>(null);
  const debounceCostCenterRef = useRef<NodeJS.Timeout | null>(null);
  const initialCostCenterLoadRef = useRef(true);

  const vendorDropdownRef = useRef<HTMLDivElement>(null);
  const vendorListRef = useRef<HTMLDivElement>(null);
  const debounceVendorRef = useRef<NodeJS.Timeout | null>(null);
  const initialVendorLoadRef = useRef(true);

  // Commodity Codes Effects
  useEffect(() => {
    if (commodityPage > 1) {
      fetchCommodityCodesData(commodityPage, commoditySearchTerm);
    }
  }, [commodityPage]);

  useEffect(() => {
    if (initialCommodityLoadRef.current) {
      initialCommodityLoadRef.current = false;
      fetchCommodityCodesData(1, commoditySearchTerm);
    }
  }, []);

  useEffect(() => {
    if (commoditySearchTerm === '') {
      return;
    }

    if (debounceCommodityRef.current) {
      clearTimeout(debounceCommodityRef.current);
    }

    debounceCommodityRef.current = setTimeout(() => {
      fetchCommodityCodesData(1, commoditySearchTerm);
    }, 500);

    return () => {
      if (debounceCommodityRef.current) {
        clearTimeout(debounceCommodityRef.current);
      }
    };
  }, [commoditySearchTerm]);



  // GL Accounts Effects
  useEffect(() => {
    if (glAccountPage > 1) {
      fetchGLAccountsData(glAccountPage, glAccountSearchTerm);
    }
  }, [glAccountPage]);

  useEffect(() => {
    if (initialGlAccountLoadRef.current) {
      initialGlAccountLoadRef.current = false;
      fetchGLAccountsData(1, glAccountSearchTerm);
    }
  }, []);

  useEffect(() => {
    if (debounceGlAccountRef.current) {
      clearTimeout(debounceGlAccountRef.current);
    }
    debounceGlAccountRef.current = setTimeout(() => {
      fetchGLAccountsData(1, glAccountSearchTerm);
    }, 500);

    return () => {
      if (debounceGlAccountRef.current) clearTimeout(debounceGlAccountRef.current);
    };
  }, [glAccountSearchTerm]);

  // Cost Centers Effects
  useEffect(() => {
    if (costCenterPage > 1) {
      fetchCostCentersData(costCenterPage, costCenterSearchTerm);
    }
  }, [costCenterPage]);

  useEffect(() => {
    if (initialCostCenterLoadRef.current) {
      initialCostCenterLoadRef.current = false;
      fetchCostCentersData(1, costCenterSearchTerm);
    }
  }, []);

  useEffect(() => {
    if (debounceCostCenterRef.current) {
      clearTimeout(debounceCostCenterRef.current);
    }
    debounceCostCenterRef.current = setTimeout(() => {
      fetchCostCentersData(1, costCenterSearchTerm);
    }, 500);

    return () => {
      if (debounceCostCenterRef.current) clearTimeout(debounceCostCenterRef.current);
    };
  }, [costCenterSearchTerm]);

  // Vendor Effects
  useEffect(() => {
    if (vendorPage > 1) {
      fetchVendorsData(vendorPage, vendorSearchTerm);
    }
  }, [vendorPage]);

  useEffect(() => {
    if (initialVendorLoadRef.current) {
      initialVendorLoadRef.current = false;
      fetchVendorsData(1, vendorSearchTerm);
    }
  }, []);

  useEffect(() => {
    if (debounceVendorRef.current) {
      clearTimeout(debounceVendorRef.current);
    }
    debounceVendorRef.current = setTimeout(() => {
      fetchVendorsData(1, vendorSearchTerm);
    }, 500);

    return () => {
      if (debounceVendorRef.current) clearTimeout(debounceVendorRef.current);
    };
  }, [vendorSearchTerm]);

  // Click outside handler updated
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (commodityDropdownRef.current && !commodityDropdownRef.current.contains(event.target as Node)) {
        setCommodityDropdownOpen(false);
      }
      if (glAccountDropdownRef.current && !glAccountDropdownRef.current.contains(event.target as Node)) {
        setGlAccountDropdownOpen(false);
      }
      if (costCenterDropdownRef.current && !costCenterDropdownRef.current.contains(event.target as Node)) {
        setCostCenterDropdownOpen(false);
      }
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target as Node)) {
        setVendorDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Commodity Codes
  const fetchCommodityCodesData = async (page: number = 1, search: string = ''): Promise<void> => {
    setCommodityLoading(true);
    try {
      const response = await getCommodityCodes(search, page);
      if (page === 1) {
        setCommodityCodesList(response.items);
      } else {
        setCommodityCodesList(prev => [...prev, ...response.items]);
      }
      setCommodityHasMore(response.hasMore);
    } catch (error) {
      if (page === 1) {
        setCommodityCodesList([]);
      }
    } finally {
      setCommodityLoading(false);
    }
  };

 const fetchVendorsData = async (page: number = 1, search: string = ''): Promise<void> => {
   setVendorLoading(true);
   try {
     const response = await searchSuppliers(search || '', page, 10);
     const rawData = Array.isArray(response) ? response : response?.data;
 if (rawData && Array.isArray(rawData) && rawData.length > 0) {
   const vendorNames = rawData.map((item: any) => {
     const fullString = typeof item === 'object' ? item.value : item;
     return fullString ? fullString.trim().split(' - ')[0] : 'Unknown Vendor';
   });
 
   if (page === 1) {
     setVendorsList(vendorNames);
   } else {
     setVendorsList(prev => [...prev, ...vendorNames]);
   }
   if (response?.pagination) {
     setVendorTotalPages(response.pagination.total_pages || 1);
   }
 } else {
   if (page === 1) setVendorsList([]);
 }
   } catch (error) {
   
     if (page === 1) setVendorsList([]);
   } finally {
     setVendorLoading(false);
   }
 };

  const fetchGLAccountsData = async (page: number = 1, search: string = ''): Promise<void> => {
    setGlAccountLoading(true);
    try {
      const response = await fetchGLAccounts({
        page,
        page_size: 10,
        ...(search && { search }),
      });

      if (response && response.gl_accounts) {
        if (page === 1) {
          setGlAccountsList(response.gl_accounts);
        } else {
          setGlAccountsList(prev => [...prev, ...response.gl_accounts]);
        }
        if (response.pagination) {
          setGlAccountTotalPages(response.pagination.total_pages || 1);
        }
      }
    } catch (error) {
      if (page === 1) setGlAccountsList([]);
    } finally {
      setGlAccountLoading(false);
    }
  };

  const fetchCostCentersData = async (page: number = 1, search: string = ''): Promise<void> => {
    setCostCenterLoading(true);
    try {
      const response = await fetchCostCenters({
        page,
        page_size: 10,
        ...(search && { search }),
      });

      if (response && response.cost_centers) {
        if (page === 1) {
          setCostCentersList(response.cost_centers);
        } else {
          setCostCentersList(prev => [...prev, ...response.cost_centers]);
        }
        if (response.pagination) {
          setCostCenterTotalPages(response.pagination.total_pages || 1);
        }
      }
    } catch (error) {
      if (page === 1) setCostCentersList([]);
    } finally {
      setCostCenterLoading(false);
    }
  };

  const handleCommoditySearch = useCallback((searchValue: string): void => {
    setCommoditySearchTerm(searchValue);
    setCommodityPage(1);
  }, []);

  const handleCommodityScroll = (): void => {
    if (!commodityListRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = commodityListRef.current;

    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      if (commodityHasMore && !commodityLoading) {
        setCommodityPage(prev => prev + 1);
      }
    }
  };

  const handleGlAccountScroll = (): void => {
    if (!glAccountListRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = glAccountListRef.current;
    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      if (glAccountPage < glAccountTotalPages && !glAccountLoading) {
        setGlAccountPage(prev => prev + 1);
      }
    }
  };

  const handleCostCenterScroll = (): void => {
    if (!costCenterListRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = costCenterListRef.current;
    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      if (costCenterPage < costCenterTotalPages && !costCenterLoading) {
        setCostCenterPage(prev => prev + 1);
      }
    }
  };

  const handleCommodityCodeSelect = (code: string): void => {
    setFormData(prev => ({
      ...prev,
      commodityCode: code,
    }));

    setSelectedCommodityCode(code);
    setCommodityDropdownOpen(false);
    fetchCommodityDetails(code);
  };

  const handleGLAccountSelect = (account: string) => {
    setFormData(prev => ({
      ...prev,
      glAccount: account,
    }));
    setSelectedGLAccount(account);
    setGlAccountDropdownOpen(false);
  };

  const handleCostCenterSelect = (center: string) => {
    setFormData(prev => ({
      ...prev,
      costCenter: center,
    }));
    setSelectedCostCenter(center);
    setCostCenterDropdownOpen(false);
  };

  const handleVendorScroll = (): void => {
    if (!vendorListRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = vendorListRef.current;
    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      if (vendorPage < vendorTotalPages && !vendorLoading) {
        setVendorPage(prev => prev + 1);
      }
    }
  };

  const handleVendorSelect = (vendor: string) => {
    setFormData(prev => ({
      ...prev,
      vendor: vendor,
    }));
    setSelectedVendor(vendor);
    setVendorDropdownOpen(false);
  };

  const handleVendorSearch = (searchValue: string) => {
    setVendorSearchTerm(searchValue);
    setVendorPage(1);
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoadingSmartDefaults(true);
        const profileData = await getMyProfile();

        if ('aribaUserName' in profileData && profileData.aribaUserName && typeof profileData.aribaUserName === 'string') {

          const response = await getPRSmartDefaults(profileData.aribaUserName as string);

          if ('companyCode' in response) {
            setSmartDefaults({
              companyCode: response.companyCode,
              shipToPlant: response.shipToPlant,
              billTo: response.billTo,
              purchaseGroup: response.purchaseGroup,
              currency: response.currency,
              deliverTo: response.deliverTo || '',
              purchaseOrg: response.purchaseOrg,
              costCenter: response.costCenter,
            });
            setFormData(prev => ({
              ...prev,
              purchaseOrg: response.purchaseOrg,
              purchaseGroup: response.purchaseGroup,
              companyCode: response.companyCode,
              currency: response.currency,
              costCenter: response.costCenter,
            }));
            setSelectedCostCenter(response.costCenter);
          } else {

          }
        } else if ('statusCode' in profileData) {
          // Handle error response
        }
      } catch (error) {

      } finally {
        setIsLoadingSmartDefaults(false);
      }
    };
    fetchUserProfile();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const fetchCommodityDetails = async (code: string) => {
    try {
      const response = await getCommodityDetails(code);
      if ('unitOfMeasure' in response) {
        setFormData(prev => ({ ...prev, uom: response.unitOfMeasure, taxCode: response.taxCode }));
      }
    } catch (error) {
    }
  };

  const addLineItem = () => {
    if (!formData.purchaseOrg || !formData.vendor || !formData.description ||
      !formData.commodityCode || !formData.amount ||
      !formData.serviceStartDate || !formData.serviceEndDate ||
      !formData.glAccount || !formData.costCenter || !formData.prServiceUniqueName) {
      toast.error("Please fill all required fields");
      return;
    }

    const newIndex = lineItems.length + 1;
    const newItem: LineItem = {
      id: `${Date.now()}-${newIndex}`,
      lineNo: newIndex,
      uniqueId: formData.prServiceUniqueName,
      purchaseOrg: formData.purchaseOrg,
      vendor: formData.vendor,
      title: formData.title || (formData.description ? formData.description.split('\n')[0] : 'Service Request'),
      description: formData.description,
      commodityCode: formData.commodityCode,
      prServiceUniqueName: formData.prServiceUniqueName,
      contract: formData.contract,
      purchaseGroup: formData.purchaseGroup,
      amount: formData.amount,
      serviceStartDate: formData.serviceStartDate,
      serviceEndDate: formData.serviceEndDate,
      glAccount: formData.glAccount,
      costCenter: formData.costCenter,
      companyCode: smartDefaults.companyCode,
      shipToPlant: smartDefaults.shipToPlant,
      billTo: smartDefaults.billTo,
      taxCode: formData.taxCode,
      deliveryTo: smartDefaults.deliverTo,
      deliveryDate: formData.serviceStartDate,
      uom: formData.uom,
      expectedAmount: '',
      maximumAmount: ''
    };

    setLineItems(prev => [...prev, newItem]);
    toast.success('Line item added successfully!');
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(lineItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleCheckBoxChange = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const removeLineItem = (id: string) => {
    setLineItems(prev => prev.filter(i => i.id !== id));
    setSelectedItems(prev => prev.filter(itemId => itemId !== id));
  };

  const editLineItem = (id: string) => {
    const item = lineItems.find(i => i.id === id);
    if (!item) return;
    setFormData({
      purchaseOrg: item.purchaseOrg,
      vendor: item.vendor,
      description: item.description,
      commodityCode: item.commodityCode,
      contract: item.contract,
      purchaseGroup: item.purchaseGroup,
      amount: item.amount,
      serviceStartDate: item.serviceStartDate,
      serviceEndDate: item.serviceEndDate,
      glAccount: item.glAccount,
      costCenter: item.costCenter,
      title: item.title,
      prServiceUniqueName: item.prServiceUniqueName,
      companyCode: smartDefaults.companyCode,
      shipToPlant: smartDefaults.shipToPlant,
      billTo: smartDefaults.billTo,
      deliveryTo: item.deliveryTo || smartDefaults.deliverTo || '',
      deliveryDate: item.deliveryDate || '',
      currency: smartDefaults.currency,
      taxCode: item.taxCode || '',
      uom: item.uom || '',
    });
    removeLineItem(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitPayload = async (items: LineItem[]) => {
    for (const item of items) {
      if (item.serviceStartDate && item.serviceEndDate) {
        const startDate = new Date(item.serviceStartDate);
        const endDate = new Date(item.serviceEndDate);
        if (startDate >= endDate) {
          toast.error(`Service start date must be before service end date for line item ${item.lineNo}.`);
          return;
        }
      }
    }
    setIsSubmitting(true);
    const payload: ServicePRDto[] = [{
      name: items[0].prServiceUniqueName,
      title: items[0].title,
      companyCode: items[0].companyCode || "1000",
      needBy: items[0].serviceStartDate ? new Date(items[0].serviceStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      prServiceUniqueName: items[0].uniqueId,
      lineItems: items.map((item, idx) => ({
        numberInCollection: idx + 1,
        quantity: 1,
        deliveryDate: item.serviceStartDate ? new Date(item.serviceStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        commodityCode: item.commodityCode,
        description: item.description,
        amount: parseFloat(item.amount),
        purchaseOrg: item.purchaseOrg,
        purchaseGroup: item.purchaseGroup,
        costCenter: item.costCenter,
        glAccount: item.glAccount,
        needBy: item.serviceStartDate ? new Date(item.serviceStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        companyCode: item.companyCode || "1000",
        isServiceChild: true,
        serviceStartDate: item.serviceStartDate ? new Date(item.serviceStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        serviceEndDate: item.serviceEndDate ? new Date(item.serviceEndDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        vendor: item.vendor,
        contract: item.contract,
        taxCode: item.taxCode,
        uom: item.uom,
      }))
    }];

    try {
      const response = await createServicePR(payload);

      if ('statusCode' in response && response.statusCode === 200) {
        toast.success("Service PR Submitted Successfully!");
        setLineItems([]);
        navigate('/simply-pr', { state: { type: 'service' } });
      } else {
        const errorMsg = 'message' in response ? response.message : "Submission Failed";
        toast.error(`Error: ${errorMsg}`);
      }
    } catch (error) {
      toast.error("Failed to submit Service PR. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitSingleLine = async (id: string) => {
    const item = lineItems.find(i => i.id === id);
    if (!item) return;
    await submitPayload([item]);
  };

  const submitAll = async () => {
    if (lineItems.length > 0) {
      await submitPayload(lineItems);
      return;
    }

    const isFormFilled = formData.purchaseOrg && formData.vendor && formData.description &&
      formData.commodityCode && formData.amount &&
      formData.serviceStartDate && formData.serviceEndDate &&
      formData.glAccount && formData.costCenter && formData.prServiceUniqueName;

    if (isFormFilled) {
      const newItem: LineItem = {
        id: `${Date.now()}-1`,
        lineNo: 1,
        uniqueId: formData.prServiceUniqueName,
        purchaseOrg: formData.purchaseOrg,
        vendor: formData.vendor,
        title: formData.title || (formData.description ? formData.description.split('\n')[0] : 'Service Request'),
        description: formData.description,
        commodityCode: formData.commodityCode,
        prServiceUniqueName: formData.prServiceUniqueName,
        contract: formData.contract,
        purchaseGroup: formData.purchaseGroup,
        amount: formData.amount,
        serviceStartDate: formData.serviceStartDate,
        serviceEndDate: formData.serviceEndDate,
        glAccount: formData.glAccount,
        costCenter: formData.costCenter,
        companyCode: smartDefaults.companyCode,
        shipToPlant: smartDefaults.shipToPlant,
        billTo: smartDefaults.billTo,
        taxCode: formData.taxCode,
        deliveryTo: smartDefaults.deliverTo,
        deliveryDate: formData.serviceStartDate,
        uom: formData.uom,
        maximumAmount: '',
        expectedAmount: ''
      };
      await submitPayload([newItem]);
      return;
    }

    toast.warning('Please add a line item or fill all required fields to submit.');
  };


  return (
    <div className="service-service-requisition-page">
      <div className="service-container">
        <header className="service-form-page-header">
          <div className="service-requis-back-btn">
            <BackButton onClick={() => navigate('/simply-pr', { state: { type: 'service' } })} />
          </div>
         
        </header>

        <div className="service-page-title">
  <h1>Service Requisition (Non-Catalog)</h1>
</div>
        
        
        <div className="service-form-card-wrapper">
          <div className="service-form-header-new">
            <h2>New Service Request</h2>
          </div>

          <div className="service-form-body">
            <div className="service-row">
              <div className="service-field">
                <label className="service-label">Purchase Org*</label>
                <div className="service-input-wrapper">
                  <svg className="service-search-icon" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    name="purchaseOrg"
                    value={formData.purchaseOrg}
                    onChange={handleInputChange}
                    placeholder="Enter Purchase Org"
                    className="service-input-with-icon"
                  />
                </div>
              </div>

              <div className="service-field">
                <label className="service-label">PR Unique Name*</label>
                <div className="service-input-wrapper">
                  <svg className="service-search-icon" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    name="prServiceUniqueName"
                    value={formData.prServiceUniqueName}
                    onChange={handleInputChange}
                    placeholder="Enter PR Unique Name"
                    className="service-input-with-icon"
                  />
                </div>
              </div>
            </div>

            <div className="service-field full">
              <label className="service-label">Description*</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the required service in detail..."
                className="service-textarea"
                rows={5}
              />
              <small className="service-helper-text">Title will auto-fill from first line</small>
            </div>

            <div className="service-row service-row-3cols">
              <div className="service-field" ref={commodityDropdownRef}>
                <label className="service-label">Commodity Code*</label>
                <div className="service-dropdown-wrapper" style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="service-input"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'white',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                    onClick={() => setCommodityDropdownOpen(!commodityDropdownOpen)}
                  >
                    <span>{formData.commodityCode || 'Select Commodity Code'}</span>
                    <FiChevronDown />
                  </button>

                  {commodityDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      marginTop: '4px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      padding: '8px'
                    }}>
                      <div style={{ marginBottom: '8px' }}>
                        <input
                          type="text"
                          placeholder="Search..."
                          value={commoditySearchTerm}
                          onChange={(e) => handleCommoditySearch(e.target.value)}
                          className="service-input"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div
                        ref={commodityListRef}
                        onScroll={handleCommodityScroll}
                        style={{
                          maxHeight: '200px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        {commodityLoading && commodityPage === 1 ? (
                          <div style={{ padding: '8px', color: '#6b7280' }}>Loading...</div>
                        ) : commodityCodesList.length > 0 ? (
                          <>
                            {commodityCodesList.map((code, index) => (
                              <button
                                key={`${code}-${index}`}
                                type="button"
                                onClick={() => handleCommodityCodeSelect(code)}
                                style={{
                                  padding: '8px',
                                  textAlign: 'left',
                                  background: selectedCommodityCode === code ? '#eff6ff' : 'transparent',
                                  border: 'none',
                                  borderRadius: '0.25rem',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  color: selectedCommodityCode === code ? '#2563eb' : '#374151'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#f3f4f6';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = selectedCommodityCode === code ? '#eff6ff' : 'transparent';
                                }}
                              >
                                {code}
                              </button>
                            ))}
                            {commodityLoading && <div style={{ padding: '8px', textAlign: 'center', color: '#6b7280' }}>Loading more...</div>}
                          </>
                        ) : (
                          <div style={{ padding: '8px', color: '#6b7280' }}>No commodity codes found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="service-field">
                <label className="service-label">Contract (Optional)</label>
                <input
                  type="text"
                  name="contract"
                  value={formData.contract}
                  onChange={handleInputChange}
                  placeholder="Enter Contract"
                  className="service-input"
                />
              </div>
              <div className="service-field">
                <label className="service-label">Purchase Group</label>
                <input
                  type="text"
                  name="purchaseGroup"
                  value={formData.purchaseGroup}
                  onChange={handleInputChange}
                  placeholder="Enter Purchase Group"
                  className="service-input"
                />
              </div>
            </div>

            <div className="service-row service-row-3cols">

               <div className="service-field">
  <label className="service-label">Service Start Date*</label>
  <div className="date-input-wrapper">
    <input
      type="date"
      name="serviceStartDate"
      value={formData.serviceStartDate}
      onChange={handleInputChange}
      className="service-input service-date-input"
    />
  </div>
</div>

<div className="service-field">
  <label className="service-label">Service End Date*</label>
  <div className="date-input-wrapper">
    <input
      type="date"
      name="serviceEndDate"
      value={formData.serviceEndDate}
      onChange={handleInputChange}
      className="service-input service-date-input"
    />
  </div>
</div>
              <div className='service-field'>
                <label className="service-label">Unit Price (AED)*</label>
                <input
                  type="text"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="Enter Unit Price"
                  className="service-input"
                />
              </div>
              <div className='service-field'>
                <label className="service-label">Unit Price (AED)*</label>
                <input
                  type="text"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="Enter Unit Price"
                  className="service-input"
                />
              </div>
            </div>

            <div className="service-row service-row-3cols">
              <div className="service-field" ref={glAccountDropdownRef}>
                <label className="service-label">GL Account*</label>
                <div className="service-dropdown-wrapper" style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="service-input"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'white',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                    onClick={() => setGlAccountDropdownOpen(!glAccountDropdownOpen)}
                  >
                    <span>{formData.glAccount || 'Select GL Account'}</span>
                    <FiChevronDown />
                  </button>
                  {glAccountDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      marginTop: '4px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      padding: '8px'
                    }}>
                      <div style={{ marginBottom: '8px' }}>
                        <input
                          type="text"
                          placeholder="Search..."
                          value={glAccountSearchTerm}
                          onChange={(e) => {
                            setGlAccountSearchTerm(e.target.value);
                            setGlAccountPage(1);
                          }}
                          className="service-input"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div
                        ref={glAccountListRef}
                        onScroll={handleGlAccountScroll}
                        style={{
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}
                      >
                        {glAccountsList.length === 0 && !glAccountLoading ? (
                          <div style={{ padding: '8px', textAlign: 'center', color: '#6b7280' }}>No accounts found</div>
                        ) : (
                          glAccountsList.map((account) => (
                            <div
                              key={account}
                              onClick={() => handleGLAccountSelect(account)}
                              style={{
                                padding: '8px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f3f4f6',
                                background: selectedGLAccount === account ? '#f3f4f6' : 'white'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedGLAccount === account ? '#f3f4f6' : 'white'}
                            >
                              {account}
                            </div>
                          ))
                        )}
                        {glAccountLoading && (
                          <div style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>Loading...</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="service-field" ref={vendorDropdownRef}>
                <label className="service-label">Vendor*</label>
                <div className="service-dropdown-wrapper" style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="service-input"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'white',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                    onClick={() => setVendorDropdownOpen(!vendorDropdownOpen)}
                  >
                    <span>{formData.vendor || 'Select Vendor'}</span>
                    <FiChevronDown />
                  </button>
                  {vendorDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      marginTop: '4px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      padding: '8px'
                    }}>
                      <div style={{ marginBottom: '8px' }}>
                        <input
                          type="text"
                          placeholder="Search..."
                          value={vendorSearchTerm}
                          onChange={(e) => handleVendorSearch(e.target.value)}
                          className="service-input"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div
                        ref={vendorListRef}
                        onScroll={handleVendorScroll}
                        style={{
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}
                      >
                        {vendorsList.length === 0 && !vendorLoading ? (
                          <div style={{ padding: '8px', textAlign: 'center', color: '#6b7280' }}>No vendors found</div>
                        ) : (
                          vendorsList.map((vendor, idx) => (
                            <div
                              key={`${vendor}-${idx}`}
                              onClick={() => handleVendorSelect(vendor)}
                              style={{
                                padding: '8px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f3f4f6',
                                background: selectedVendor === vendor ? '#f3f4f6' : 'white'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedVendor === vendor ? '#f3f4f6' : 'white'}
                            >
                              {vendor}
                            </div>
                          ))
                        )}
                        {vendorLoading && (
                          <div style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>Loading...</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="service-field" ref={costCenterDropdownRef}>
                <label className="service-label">Cost Center*</label>
                <div className="service-dropdown-wrapper" style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="service-input"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'white',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                    onClick={() => setCostCenterDropdownOpen(!costCenterDropdownOpen)}
                  >
                    <span>{formData.costCenter || 'Select Cost Center'}</span>
                    <FiChevronDown />
                  </button>
                  {costCenterDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      marginTop: '4px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      padding: '8px'
                    }}>
                      <div style={{ marginBottom: '8px' }}>
                        <input
                          type="text"
                          placeholder="Search..."
                          value={costCenterSearchTerm}
                          onChange={(e) => {
                            setCostCenterSearchTerm(e.target.value);
                            setCostCenterPage(1);
                          }}
                          className="service-input"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div
                        ref={costCenterListRef}
                        onScroll={handleCostCenterScroll}
                        style={{
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}
                      >
                        {costCentersList.length === 0 && !costCenterLoading ? (
                          <div style={{ padding: '8px', textAlign: 'center', color: '#6b7280' }}>No cost centers found</div>
                        ) : (
                          costCentersList.map((center) => (
                            <div
                              key={center}
                              onClick={() => handleCostCenterSelect(center)}
                              style={{
                                padding: '8px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f3f4f6',
                                background: selectedCostCenter === center ? '#f3f4f6' : 'white'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedCostCenter === center ? '#f3f4f6' : 'white'}
                            >
                              {center}
                            </div>
                          ))
                        )}
                        {costCenterLoading && (
                          <div style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>Loading...</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="service-smart-defaults">
              <div className="service-smart-header">
                <div className="service-zap-icon-wrapper">
                  <FaWandMagicSparkles />
                </div>
                <div>
                  <div className="service-smart-title">Smart Defaults Applied</div>
                  <div className="service-smart-subtitle">We've taken care of these for you</div>
                </div>
              </div>

              <div className="service-defaults-grid">
                <div className="service-default-item">
                  <div className="service-icon-box service-bg-green-light">
                    <FaBuilding />
                  </div>
                  <div>
                    <div className="service-default-label">Company Code</div>
                    <div className="service-default-value">
                      {isLoadingSmartDefaults ? 'Loading...' : (smartDefaults.companyCode || '-')}
                    </div>
                  </div>
                </div>

                <div className="service-default-item">
                  <div className="service-icon-box service-bg-cyan-light">
                    <FaChartArea />
                  </div>
                  <div>
                    <div className="service-default-label">Ship-to Plant</div>
                    <div className="service-default-value">
                      {isLoadingSmartDefaults ? 'Loading...' : (smartDefaults.shipToPlant || '-')}
                    </div>
                  </div>
                </div>

                <div className="service-default-item">
                  <div className="service-icon-box service-bg-blue-light">
                    <FaLocationDot />
                  </div>
                  <div>
                    <div className="service-default-label">Bill-to</div>
                    <div className="service-default-value">
                      {isLoadingSmartDefaults ? 'Loading...' : (smartDefaults.billTo || '-')}
                    </div>
                  </div>
                </div>

                <div className="service-default-item">
                  <div className="service-icon-box service-bg-yellow-light">
                    <FaFileInvoiceDollar />
                  </div>
                  <div>
                    <div className="service-default-label">Currency</div>
                    <div className="service-default-value">
                      {isLoadingSmartDefaults ? 'Loading...' : (smartDefaults.currency || '-')}
                    </div>
                  </div>
                </div>

                <div className="service-default-item">
                  <div className="service-icon-box service-bg-orange-light">
                    <TbTruckDelivery />
                  </div>
                  <div>
                    <div className="service-default-label">Delivery To</div>
                    <div className="service-default-value">{isLoadingSmartDefaults ? 'Loading...' : (smartDefaults.deliverTo || '-')}</div>
                  </div>
                </div>

                <div className="service-default-item">
                  <div className="service-icon-box service-bg-purple-light">
                    <TbPackage />
                  </div>
                  <div>
                    <div className="service-default-label">Uom</div>
                    <div className="service-default-value">{formData.uom || '-'}</div>
                  </div>
                </div>
              </div>
            

            <div className="service-smart-footer">
              <div className="service-footer-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <span>Based on your profile & policy</span>
              </div>
              <button type="button" className="service-override-link">Need to override?</button>
            </div>
          </div>
</div>
          <div className="service-tags">
            <span className="service-tag">Account Type: Expenses</span>
            <span className="service-tag">Type: Services</span>
          </div>
        

        <div className="service-footer" style={{ display: "flex", gap: "14px", justifyContent: "flex-end", padding: "18px 36px 36px", background: "white" }}>
          <button
            type="button"
            onClick={addLineItem}
            style={{
              padding: "10px 16px",
              borderRadius: "12px",
              border: "none",
              color: "grey",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Add Line Item
          </button>

          <button type="button" className="service-submit-button" onClick={submitAll} disabled={isSubmitting}>
            <GrSend />
            {isSubmitting ? 'Submitting...' : 'Submit Requisition'}
          </button>
        </div>
      </div>
      </div>

      <div style={{ marginTop: 28 }} className="line-items-wrapper">
        <h3 style={{ color: '#5b21b6', margin: '6px 0 12px' }}>Line Item(s)</h3>
        <div className="line-items-table-card">
          <div className="line-items-table-scroll">
            <table className="line-items-table">
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="select all" checked={lineItems.length > 0 && selectedItems.length === lineItems.length} onChange={handleSelectAll} /></th>
                  <th>LINE ITEM NO</th>
                  <th>UNIQUE ID</th>
                  <th>PURCHASE ORG</th>
                  <th>VENDOR</th>
                  <th>TITLE</th>
                  <th>DESCRIPTION</th>
                  <th>MATERIAL CODE</th>
                  <th>CONTRACT</th>
                  <th>PURCHASE GROUP</th>
                  <th>EXPECTED AMOUNT</th>
                  <th>MAXIMUM AMOUNT</th>
                  <th>SERVICE START DATE</th>
                  <th>SERVICE END DATE</th>
                  <th>GL ACCOUNT</th>
                  <th>COST CENTER</th>
                  <th>COMPANY CODE</th>
                  <th>SHIP TO PLANT</th>
                  <th>BILL TO</th>
                  <th>TAX CODE</th>
                  <th>DELIVERY DATE</th>
                  <th>EDIT</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={23} style={{ textAlign: 'center', padding: 28, color: '#6b7280' }}>
                      No line items yet
                    </td>
                  </tr>
                ) : (
                  lineItems.map(item => (
                    <tr key={item.id}>
                      <td><input type="checkbox" checked={selectedItems.includes(item.id)} onChange={() => handleCheckBoxChange(item.id)} /></td>
                      <td>{item.lineNo}</td>
                      <td>{item.uniqueId}</td>
                      <td>{item.purchaseOrg}</td>
                      <td>{item.vendor}</td>
                      <td>{item.title}</td>
                      <td style={{ maxWidth: 220 }}>{item.description}</td>
                      <td>{item.commodityCode}</td>
                      <td>{item.contract}</td>
                      <td>{item.purchaseGroup}</td>
                      <td>{item.amount} AED</td>
                      <td>{item.serviceStartDate}</td>
                      <td>{item.serviceEndDate}</td>
                      <td>{item.glAccount}</td>
                      <td>{item.costCenter}</td>
                      <td>{item.companyCode}</td>
                      <td>{item.shipToPlant}</td>
                      <td>{item.billTo}</td>
                      <td>{item.taxCode}</td>
                      <td>{item.deliveryDate}</td>
                      <td>
                        <button className="link-edit" onClick={() => editLineItem(item.id)}><FiEdit /> Edit</button>
                      </td>
                      <td className="action-cell">
                        <button className="remove-btn" onClick={() => removeLineItem(item.id)}>Remove</button>
                        <button className="submit-line-btn" onClick={() => submitSingleLine(item.id)} disabled={isSubmitting}>Submit</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <button type="button" className="service-button" onClick={submitAll} disabled={isSubmitting}>
        <GrSend />
        {isSubmitting ? 'Submitting...' : 'Submit Requisition'}
      </button>

      {showExcelModal && (
        <div className="figma-modal-overlay" onClick={() => setShowExcelModal(false)}>
          <div className="figma-modal-content" onClick={e => e.stopPropagation()}>
            <button className="figma-close-btn" onClick={() => setShowExcelModal(false)}>×</button>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{
                width: "80px",
                height: "80px",
                background: "#e6f4ea",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem"
              }}>
                <svg width="48" height="48" viewBox="0 0 64 64">
                  <rect width="64" height="64" rx="12" fill="#217346" />
                  <path d="M16 12h32v40H16z" fill="#185C37" />
                </svg>
              </div>
            </div>
            <h2 style={{ textAlign: "center", fontSize: "1.8rem", fontWeight: "700", margin: "0 0 0.5rem" }}>
              Import from Excel
            </h2>
          </div>
        </div>
      )}

      {showChangePRModal && (
        <div className="figma-modal-overlay" onClick={() => setShowChangePRModal(false)}>
          <div className="figma-modal-content" onClick={e => e.stopPropagation()}>
            <button className="figma-close-btn" onClick={() => setShowChangePRModal(false)}>×</button>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{
                width: "80px",
                height: "80px",
                background: "#fed7aa",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem"
              }}>
                <FiEdit size={40} color="#ea580c" />
              </div>
            </div>
            <h2 style={{ textAlign: "center", fontSize: "1.8rem", fontWeight: "700", margin: "0 0 0.5rem" }}>
              Change Existing PR
            </h2>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceRequisitionForm;