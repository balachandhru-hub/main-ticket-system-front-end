import React, { useState, useEffect, useRef, useCallback } from 'react';
import './MaterialRequisitionForm.css';
import { TbPackage } from "react-icons/tb";
import { FaFileInvoiceDollar } from "react-icons/fa6";
import { FaChartArea } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";
import { FaBuilding } from "react-icons/fa";
import { FaWandMagicSparkles } from "react-icons/fa6";
import { FiEdit, FiChevronDown } from "react-icons/fi";
import { GrSend } from "react-icons/gr";
import BackButton from './BackButton';
import { createMaterialPR, getPRSmartDefaults, getMaterialDetails } from '../api/smmaterialPRApi';
import { getMyProfile } from '../api/userApi';
import { fetchMaterialCodes } from '../api/filterMaterialPRApi';
import { fetchGLAccounts, fetchCostCenters,searchSuppliers } from '../api/PulseReportFilterApi';
import type { MaterialPRDto, LineItemDto } from '../Dto/CreateMaterialPRDto';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

type LineItem = {
  id: string;
  lineNo: number;
  uniqueId: string;
  purchaseOrg: string;
  prUniqueName: string;
  vendor: string;
  title?: string;
  description: string;
  commodity: string;
  contract: string;
  purchaseGroup: string;
  materialcode: string;
  quantity: string;
  uom: string;
  unitPrice: string;
  deliveryDate: string;
  deliveryTo: string;
  glAccount: string;
  costCenter: string;
  companyCode?: string;
  shipToPlant?: string;
  billTo?: string;
  taxCode?: string;
  materialGroup?: string;
};

type SmartDefaults = {
  companyCode: string;
  shipToPlant: string;
  billTo: string;
  purchaseGroup: string;
  purchaseOrg: string;
  currency: string;
  deliverTo: string;
  costCenter: string;
};

type GLAccount = {
  id: string;
  name?: string;
  code: string;
};

type MaterialCode = {
  id: string;
  name?: string;
  code: string;
};

const STORAGE_KEY = 'materialPRLineItems';
const genUniqueId = (n: number) => `UQID${String(n).padStart(3, '0')}`;

const getDefaultDeliveryDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().split('T')[0];
};

const MaterialRequisitionForm: React.FC = () => {
  const [smartDefaults, setSmartDefaults] = useState<SmartDefaults>({
    companyCode: '',
    shipToPlant: '',
    billTo: '',
    purchaseGroup: '',
    currency: '',
    deliverTo: '',
    purchaseOrg: '',
    costCenter: '',
  });
  const [formData, setFormData] = useState({
    purchaseOrg: '',
    prUniqueName: '',
    vendor: '',
    description: '',
    commodity: '',
    contract: '',
    purchaseGroup: '',
    materialcode: '',
    quantity: '',
    uom: '',
    unitPrice: '',
    deliveryDate: getDefaultDeliveryDate(),
    deliveryTo: '',
    glAccount: '',
    costCenter: smartDefaults.costCenter,
    aribaUsername: '',
    taxCode: '',
  });
  // GL Accounts State
  const [glAccounts, setGlAccounts] = useState<GLAccount[]>([]);
  const [selectedGLAccounts, setSelectedGLAccounts] = useState<string[]>([]);
  const [glSearchTerm, setGlSearchTerm] = useState<string>('');
  const [glPage, setGlPage] = useState<number>(1);
  const [glTotalPages, setGlTotalPages] = useState<number>(1);
  const [glLoading, setGlLoading] = useState<boolean>(false);
  const [glDropdownOpen, setGlDropdownOpen] = useState<boolean>(false);
  const [selectAllChecked, setSelectAllChecked] = useState<boolean>(false);

  // Material Codes State
  const [materialCodesList, setMaterialCodesList] = useState<MaterialCode[]>([]);
  const [selectedMaterialCode, setSelectedMaterialCode] = useState<string>('');
  const [materialSearchTerm, setMaterialSearchTerm] = useState<string>('');
  const [materialPage, setMaterialPage] = useState<number>(1);
  const [materialTotalPages, setMaterialTotalPages] = useState<number>(1);
  const [materialLoading, setMaterialLoading] = useState<boolean>(false);
  const [materialDropdownOpen, setMaterialDropdownOpen] = useState<boolean>(false);
  const [isLoadingMaterialDetails, setIsLoadingMaterialDetails] = useState(false);

  // Cost Centers State
  const [costCentersList, setCostCentersList] = useState<string[]>([]);
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
  const glDropdownRef = useRef<HTMLDivElement>(null);
  const glAccountsListRef = useRef<HTMLDivElement>(null);
  const materialDropdownRef = useRef<HTMLDivElement>(null);
  const materialListRef = useRef<HTMLDivElement>(null);
  const debounceGLRef = useRef<NodeJS.Timeout | null>(null);
  const debounceMaterialRef = useRef<NodeJS.Timeout | null>(null);
  const initialGLLoadRef = useRef(true);
  const initialMaterialLoadRef = useRef(true);

  const costCenterDropdownRef = useRef<HTMLDivElement>(null);
  const costCenterListRef = useRef<HTMLDivElement>(null);
  const debounceCostCenterRef = useRef<NodeJS.Timeout | null>(null);
  const initialCostCenterLoadRef = useRef(true);

  const vendorDropdownRef = useRef<HTMLDivElement>(null);
  const vendorListRef = useRef<HTMLDivElement>(null);
  const debounceVendorRef = useRef<NodeJS.Timeout | null>(null);
  const initialVendorLoadRef = useRef(true);

  const navigate = useNavigate();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showChangePRModal, setShowChangePRModal] = useState(false);
  const [prSearchNumber, setPrSearchNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setIsLoadingProfile] = useState(true);
  const [isLoadingSmartDefaults, setIsLoadingSmartDefaults] = useState(false);

  // Fetch profile data on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const profileData = await getMyProfile();

        if ('aribaUserName' in profileData && profileData.aribaUserName && typeof profileData.aribaUserName === 'string') {
          setFormData(prev => ({
            ...prev,
            aribaUsername: profileData.aribaUserName as string,
          }));

          await fetchSmartDefaults(profileData.aribaUserName as string);
        } else if ('statusCode' in profileData) {
         
        }
      } catch (error) {
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, []);

  // GL Accounts Effects
  useEffect(() => {
    if (glPage > 1) {
      fetchGLAccountsData(glPage, glSearchTerm);
    }
  }, [glPage]);

  useEffect(() => {
    if (initialGLLoadRef.current) {
      initialGLLoadRef.current = false;
      fetchGLAccountsData(1, glSearchTerm);
    }
  }, []);

  useEffect(() => {
    if (glSearchTerm === '') {
      return;
    }

    if (debounceGLRef.current) {
      clearTimeout(debounceGLRef.current);
    }

    debounceGLRef.current = setTimeout(() => {
      fetchGLAccountsData(1, glSearchTerm);
    }, 500);

    return () => {
      if (debounceGLRef.current) {
        clearTimeout(debounceGLRef.current);
      }
    };
  }, [glSearchTerm]);

  // Material Codes Effects
  useEffect(() => {
    if (materialPage > 1) {
      fetchMaterialCodesData(materialPage, materialSearchTerm);
    }
  }, [materialPage]);

  useEffect(() => {
    if (initialMaterialLoadRef.current) {
      initialMaterialLoadRef.current = false;
      fetchMaterialCodesData(1, materialSearchTerm);
    }
  }, []);

  useEffect(() => {
    if (materialSearchTerm === '') {
      return;
    }

    if (debounceMaterialRef.current) {
      clearTimeout(debounceMaterialRef.current);
    }

    debounceMaterialRef.current = setTimeout(() => {
      fetchMaterialCodesData(1, materialSearchTerm);
    }, 500);

    return () => {
      if (debounceMaterialRef.current) {
        clearTimeout(debounceMaterialRef.current);
      }
    };
  }, [materialSearchTerm]);

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
    if (costCenterSearchTerm === '') {
      return;
    }
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

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setLineItems(JSON.parse(saved));
      } catch (e) {
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lineItems));
  }, [lineItems]);

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
    if (vendorSearchTerm === '') {
      return;
    }
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

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (glDropdownRef.current && !glDropdownRef.current.contains(event.target as Node)) {
        setGlDropdownOpen(false);
      }
      if (materialDropdownRef.current && !materialDropdownRef.current.contains(event.target as Node)) {
        setMaterialDropdownOpen(false);
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

  // Fetch GL Accounts
  const fetchGLAccountsData = async (page: number = 1, search: string = ''): Promise<void> => {
    setGlLoading(true);
    try {
      const response = await fetchGLAccounts({
        page,
        page_size: 10,
        ...(search && { search }),
      });

      if (response && 'gl_accounts' in response) {
        const accounts: GLAccount[] = (response.gl_accounts || []).map((account: string, index: number) => ({
          id: `${account}-${page}-${index}`,
          code: account,
          name: account,
        }));

        if (page === 1) {
          setGlAccounts(accounts);
        } else {
          setGlAccounts(prev => [...prev, ...accounts]);
        }

        if (response.pagination) {
          setGlTotalPages(response.pagination.total_pages || 1);
        }
      }
    } catch (error) {

      if (page === 1) {
        setGlAccounts([]);
      }
    } finally {
      setGlLoading(false);
    }
  };

  // Fetch Material Codes
  const fetchMaterialCodesData = async (page: number = 1, search: string = ''): Promise<void> => {
    setMaterialLoading(true);
    try {
      const response = await fetchMaterialCodes({
        page,
        page_size: 10,
        ...(search && { search }),
      });

      if (response && 'data' in response) {
        const codes: MaterialCode[] = (response.data || []).map((code: any, index: number) => ({
          id: `${code.code}-${page}-${index}`,
          code: code.code || code,
          name: code.name || code.code || code,
        }));

        if (page === 1) {
          setMaterialCodesList(codes);
        } else {
          setMaterialCodesList(prev => [...prev, ...codes]);
        }

        if (response.pagination) {
          setMaterialTotalPages(response.pagination.totalPages || 1);
        }
      }
    } catch (error) {

      if (page === 1) {
        setMaterialCodesList([]);
      }
    } finally {
      setMaterialLoading(false);
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

  // FIXED LINE: Added ?. to prevent the "possibly null" error
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

  // Fetch smart defaults using Ariba username
  const fetchSmartDefaults = async (aribaUserName: string) => {
    try {
      setIsLoadingSmartDefaults(true);
      const response = await getPRSmartDefaults(aribaUserName);

      if ('companyCode' in response) {
        setSmartDefaults(response as SmartDefaults);
        setFormData(prev => ({
          ...prev,
          purchaseGroup: response.purchaseGroup || prev.purchaseGroup,
          deliveryTo: response.deliverTo || prev.deliveryTo,
          purchaseOrg: response.purchaseOrg || prev.purchaseOrg,
          costCenter: response.costCenter || prev.costCenter,
        }));
      } else if ('statusCode' in response) {
        
      }
    } catch (error) {

    } finally {
      setIsLoadingSmartDefaults(false);
    }
  };

  const fetchMaterialDetails = async (materialCode: string) => {
    try {
      setIsLoadingMaterialDetails(true);

      const response = await getMaterialDetails(materialCode);

      if ('commodityCode' in response) {
        setFormData(prev => ({
          ...prev,
          commodity: response.commodityCode || prev.commodity,
          uom: response.unitOfMeasure || prev.uom,
          taxCode: response.taxCode || prev.taxCode,
        }));
      } else if ('statusCode' in response) {

        toast.error(response.message);
      }
    } catch (error) {
      toast.error('Failed to fetch material details');
    } finally {
      setIsLoadingMaterialDetails(false);
    }
  };


  // GL Accounts Handlers
  const handleGLSearch = useCallback((searchValue: string): void => {
    setGlSearchTerm(searchValue);
    setGlPage(1);
  }, []);

  const handleGLCheckboxChange = (accountId: string): void => {
    setSelectedGLAccounts((prev: string[]) => {
      let updated: string[];
      if (prev.includes(accountId)) {
        updated = prev.filter((id: string) => id !== accountId);
      } else {
        if (prev.length >= 5) {
          toast.warning('You can select a maximum of 5 GL accounts only.');
          return prev;
        }
        updated = [...prev, accountId];
      }

      const selectedAccountCodes = updated.map(id => {
        const account = glAccounts.find(acc => acc.id === id);
        return account ? account.code : id;
      });

      setFormData(prev => ({
        ...prev,
        glAccount: selectedAccountCodes.length > 0 ? selectedAccountCodes[0] : '',
      }));

      return updated;
    });
    setSelectAllChecked(false);
  };

  const handleSelectAllGL = (checked: boolean): void => {
    if (checked) {
      const allIds = glAccounts.map((account: GLAccount) => account.id);
      let idsToSelect = allIds;

      if (allIds.length > 5) {
        toast.warning('You can select a maximum of 5 GL accounts. Only the first 5 were selected.');
        idsToSelect = allIds.slice(0, 5);
      }

      setSelectedGLAccounts(idsToSelect);

      const selectedAccountCodes = idsToSelect.map(id => {
        const account = glAccounts.find(acc => acc.id === id);
        return account ? account.code : id;
      });

      setFormData(prev => ({
        ...prev,
        glAccount: selectedAccountCodes.length > 0 ? selectedAccountCodes[0] : '',
      }));
    } else {
      setSelectedGLAccounts([]);
      setFormData(prev => ({
        ...prev,
        glAccount: '',
      }));
    }
  };

  const handleGLScroll = (): void => {
    if (!glAccountsListRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = glAccountsListRef.current;

    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      if (glPage < glTotalPages && !glLoading) {
        setGlPage(prev => prev + 1);
      }
    }
  };

  // Material Codes Handlers
  const handleMaterialSearch = useCallback((searchValue: string): void => {
    setMaterialSearchTerm(searchValue);
    setMaterialPage(1);
  }, []);

  const handleMaterialCodeSelect = async (codeId: string): Promise<void> => {
    const selected = materialCodesList.find(code => code.id === codeId);
    if (!selected) return;

    const materialCode = selected.code;

    // 1️⃣ Set material code immediately
    setFormData(prev => ({
      ...prev,
      materialcode: materialCode,
    }));

    setSelectedMaterialCode(codeId);
    setMaterialDropdownOpen(false);

    // 2️⃣ Fetch material-specific defaults
    await fetchMaterialDetails(materialCode);
  };


  const handleMaterialScroll = (): void => {
    if (!materialListRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = materialListRef.current;

    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      if (materialPage < materialTotalPages && !materialLoading) {
        setMaterialPage(prev => prev + 1);
      }
    }
  };

  // Cost Center Handlers
  const handleCostCenterSearch = useCallback((searchValue: string): void => {
    setCostCenterSearchTerm(searchValue);
    setCostCenterPage(1);
  }, []);

  const handleCostCenterScroll = (): void => {
    if (!costCenterListRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = costCenterListRef.current;
    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      if (costCenterPage < costCenterTotalPages && !costCenterLoading) {
        setCostCenterPage(prev => prev + 1);
      }
    }
  };

  const handleCostCenterSelect = (center: string) => {
    setFormData(prev => ({
      ...prev,
      costCenter: center,
    }));

    setCostCenterDropdownOpen(false);
  };

  // Vendor Handlers
  const handleVendorSearch = useCallback((searchValue: string): void => {
    setVendorSearchTerm(searchValue);
    setVendorPage(1);
  }, []);

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

  // Common Handlers
  const extractGLAccountCode = (glAccount: string): string => {
    if (!glAccount) return '';
    return glAccount.includes(' - ') ? glAccount.split(' - ')[0].trim() : glAccount.trim();
  };

  const extractCode = (str: string): string => {
    if (!str) return '';
    return str.split(' - ')[0].trim();
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addLineItem = () => {
    if (!formData.description || !formData.deliveryDate || !formData.deliveryTo || !formData.prUniqueName || !formData.vendor) {
      toast.error('Please fill in Title, Description, Delivery Date, Delivery To, PR Unique Name, and Vendor');
      return;
    }

    const newIndex = lineItems.length + 1;
    const newItem: LineItem = {
      id: `${Date.now()}-${newIndex}`,
      lineNo: newIndex,
      uniqueId: genUniqueId(newIndex),
      purchaseOrg: formData.purchaseOrg,
      prUniqueName: formData.prUniqueName,
      vendor: formData.vendor,
      description: formData.description,
      commodity: formData.commodity,
      contract: formData.contract,
      purchaseGroup: formData.purchaseGroup,
      materialcode: formData.materialcode,
      quantity: formData.quantity,
      uom: formData.uom,
      unitPrice: formData.unitPrice,
      deliveryDate: formData.deliveryDate,
      deliveryTo: formData.deliveryTo,
      glAccount: formData.glAccount,
      costCenter: formData.costCenter,
      companyCode: smartDefaults.companyCode,
      shipToPlant: smartDefaults.shipToPlant,
      billTo: smartDefaults.billTo,
      taxCode: '',
      materialGroup: formData.materialcode,
    };

    setLineItems(prev => [...prev, newItem]);
    toast.success('Line item added successfully!');
  };

  const removeLineItem = (id: string) => {
    setLineItems(prev => prev.filter(i => i.id !== id));
  };

  const editLineItem = (id: string) => {
    const itemToEdit = lineItems.find(i => i.id === id);

    if (!itemToEdit) {
      return;
    }

    const staticPath = `/simply-pr/materials/edit`;
    navigate(staticPath, { state: { lineItemData: itemToEdit } });
  };

  const submitAllFormDirectly = async () => {
    if (!formData.description || !formData.deliveryDate || !formData.deliveryTo || !formData.prUniqueName || !formData.vendor) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const lineItemsDto: LineItemDto[] = [
        {
          NumberInCollection: 1,
          Description: formData.description,
          Quantity: parseInt(formData.quantity) || 0,
          UOM: formData.uom,
          Price: parseFloat(formData.unitPrice) || 0,
          Currency: smartDefaults.currency || 'AED',
          CommodityCode: extractCode(formData.commodity),
          Vendor: formData.vendor,
          Contract: extractCode(formData.contract),
          PurchaseOrg: formData.purchaseOrg,
          GLAccount: extractGLAccountCode(formData.glAccount),
          CostCenter: extractCode(formData.costCenter),
          MaterialCode: extractCode(formData.materialcode),
          NeedBy: formData.deliveryDate,
        }
      ];

      const payload: MaterialPRDto[] = [
        {
          Name: formData.description,
          UniqueName: formData.prUniqueName,
          NeedBy: formData.deliveryDate,
          LineItems: lineItemsDto,
        }
      ];

      const response = await createMaterialPR(payload);

      if (response.statusCode === 200 || response.statusCode < 300) {
        toast.success('Material PR submitted successfully!');
        setFormData({
          purchaseOrg: smartDefaults.purchaseOrg,
          prUniqueName: '',
          vendor: '',
          description: '',
          commodity: '',
          contract: '',
          purchaseGroup: smartDefaults.purchaseGroup,
          materialcode: '',
          quantity: '',
          uom: '',
          unitPrice: '',
          deliveryDate: getDefaultDeliveryDate(),
          deliveryTo: smartDefaults.deliverTo,
          glAccount: '',
          costCenter: '',
          aribaUsername: formData.aribaUsername,
          taxCode: '',
        });
        navigate('/simply-pr', { state: { type: 'material' } });
      } else {
        toast.error(`Error: ${response.message}`);
      }
    } catch (error) {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitAll = async () => {
    if (!lineItems.length) {
      toast.error('No line items to submit. Add at least one.');
      return;
    }

    if (!formData.prUniqueName) {
      toast.error('Please provide a title and PR Unique Name for the requisition');
      return;
    }

    setIsSubmitting(true);
    try {
      const lineItemsDto: LineItemDto[] = lineItems.map(item => ({
        NumberInCollection: item.lineNo,
        Description: item.description,
        Quantity: parseInt(item.quantity) || 0,
        UOM: item.uom,
        Price: parseFloat(item.unitPrice) || 0,
        Currency: smartDefaults.currency || 'AED',
        CommodityCode: extractCode(item.commodity),
        Vendor: item.vendor,
        Contract: extractCode(item.contract),
        PurchaseOrg: item.purchaseOrg,
        GLAccount: extractGLAccountCode(item.glAccount),
        CostCenter: extractCode(item.costCenter),
        MaterialCode: extractCode(item.materialcode),
        NeedBy: item.deliveryDate,
      }));

      const payload: MaterialPRDto[] = [
        {
          Name: formData.description,
          UniqueName: formData.prUniqueName,
          NeedBy: formData.deliveryDate || new Date().toISOString().split('T')[0],
          LineItems: lineItemsDto,
        }
      ];

      const response = await createMaterialPR(payload);

      if (response.statusCode === 200 || response.statusCode < 300) {
        toast.success(`${lineItems.length} line item(s) submitted successfully!`);
        setLineItems([]);
        localStorage.removeItem(STORAGE_KEY);
        navigate('/simply-pr', { state: { type: 'material' } });
        
      } else {
        toast.error(`Error: ${response.message}`);
      }
    } catch (error) {
      toast.error('Failed to submit requisition. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitSingleLine = async (id: string) => {
    const item = lineItems.find(i => i.id === id);
    if (!item) return;

    setIsSubmitting(true);
    try {
      const lineItemsDto: LineItemDto[] = [
        {
          NumberInCollection: item.lineNo,
          Description: item.description,
          Quantity: parseInt(item.quantity) || 0,
          UOM: item.uom,
          Price: parseFloat(item.unitPrice) || 0,
          Currency: smartDefaults.currency || 'AED',
          CommodityCode: extractCode(item.commodity),
          Vendor: item.vendor,
          Contract: extractCode(item.contract),
          PurchaseOrg: item.purchaseOrg,
          GLAccount: extractGLAccountCode(item.glAccount),
          CostCenter: extractCode(item.costCenter),
          MaterialCode: extractCode(item.materialcode),
          NeedBy: item.deliveryDate,
        }
      ];

      const payload: MaterialPRDto[] = [
        {
          Name: item.description,
          UniqueName: item.prUniqueName,
          NeedBy: item.deliveryDate,
          LineItems: lineItemsDto,
        }
      ];

      const response = await createMaterialPR(payload);

      if (response.statusCode === 200 || response.statusCode < 300) {
        toast.success(`Line item ${item.lineNo} submitted successfully!`);
        removeLineItem(id);
      } else {
        toast.error(`Error: ${response.message}`);
      }
    } catch (error) {
      toast.error('Failed to submit line item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="material-requisition-page">
      <header className="material-page-header">
        <div className="material-requis-back-btn">
          <BackButton onClick={() => navigate('/simply-pr', { state: { type: 'material' } })} />
        </div>
      </header>
        <div className="material-page-title"><h1>Material Requisition (Non-Catalog)</h1></div>

      <div className="material-form-card">
        <div className="material-form-header">
          <h2>New Material Request</h2>
        </div>

        <div className="material-form-body">
          <div className="material-row">
            <div className="material-field">
              <label className="material-label">Purchase Org*</label>
              <div className="material-input-wrapper">
                <svg className="material-search-icon" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input type="text" name="purchaseOrg" value={formData.purchaseOrg} onChange={handleInputChange} placeholder="Enter Purchase Org" className="material-input-with-icon" />
              </div>
            </div>

            <div className="material-field">
              <label className="material-label">PR Unique Name*</label>
              <input type="text" name="prUniqueName" value={formData.prUniqueName} onChange={handleInputChange} placeholder="Enter PR Unique Name" className="material-input" />
            </div>
          </div>


          <div className="material-field full">
            <label className="material-label">Description*</label>
            <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Describe the required material in detail..." className="material-textarea" rows={5} />
            <small className="material-helper-text">Title will auto-fill from first line</small>
          </div>

          <div className="material-row">
            {/* Material Code Dropdown */}
            <div className="material-field" ref={materialDropdownRef}>
              <label className="material-label">Material Code*</label>
              <div className="material-dropdown-wrapper">
                <button
                  className="material-dropdown-button"
                  onClick={() => setMaterialDropdownOpen(!materialDropdownOpen)}
                  type="button"
                >
                  <span className="material-dropdown-text">{formData.materialcode || 'Select Material Code'}</span>
                  <FiChevronDown
                    size={18}
                    className={`material-chevron ${materialDropdownOpen ? 'open' : ''}`}
                  />
                </button>

                {materialDropdownOpen && (
                  <div className="material-dropdown-menu">
                    <div className="material-dropdown-search">
                      <input
                        type="text"
                        placeholder="Search material codes..."
                        value={materialSearchTerm}
                        onChange={(e) => handleMaterialSearch(e.target.value)}
                        className="material-search-input"
                      />
                    </div>

                    <div
                      ref={materialListRef}
                      onScroll={handleMaterialScroll}
                      className="material-codes-list"
                    >
                      {materialCodesList.length === 0 && !materialLoading ? (
                        <div className="material-empty">No material codes found</div>
                      ) : (
                        materialCodesList.map((code) => (
                          <label key={code.id} className="material-checkbox-label">
                            <input
                              type="radio"
                              name="materialCode"
                              checked={selectedMaterialCode === code.id}
                              onChange={() => handleMaterialCodeSelect(code.id)}
                            />
                            <span className="material-code-name">
                              {code.code}
                            </span>
                            {code.name && code.name !== code.code && (
                              <span className="material-code-detail">{code.name}</span>
                            )}
                          </label>
                        ))
                      )}

                      {materialLoading && (
                        <div className="material-loading-more">Loading more...</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {formData.materialcode && (
                <small className="material-helper-text">Selected: {formData.materialcode}</small>
              )}
            </div>

            <div className="material-field" ref={vendorDropdownRef}>
              <label className="material-label">Vendor*</label>
              <div className="material-dropdown-wrapper" style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="material-input"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'white',
                    textAlign: 'left',
                    cursor: 'pointer',
                    width:'100%'
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
                        className="material-input"
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
            <div className="material-field">
              <label className="material-label">Contract (Optional)</label>
              <input type="text" name="contract" value={formData.contract} onChange={handleInputChange} placeholder="Enter Contract" className="material-input" />
            </div>
          </div>

          <div className="material-view">
            <div className="material-field">
              <label className="material-label">Quantity*</label>
              <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} placeholder="Enter Quantity" className="material-input" />
            </div>
            <div className="material-field">
              <label className="material-label">UOM*</label>
              <input
                type="text"
                name="uom"
                value={formData.uom}
                onChange={handleInputChange}
                disabled={isLoadingMaterialDetails}
                className="material-input"
              />
            </div>
            <div className="material-field">
              <label className="material-label">Unit Price (AED)*</label>
              <input type="number" name="unitPrice" value={formData.unitPrice} onChange={handleInputChange} placeholder="Enter Unit Price" className="material-input" />
            </div>
          </div>

          <div className="material-row">
            <div className="material-field">
              <label className="material-label">Delivery Date*</label>
              <input type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleInputChange} className="material-input" />
            </div>
            <div className="material-field">
              <label className="material-label">Delivery To*</label>
              <input type="text" name="deliveryTo" value={formData.deliveryTo} onChange={handleInputChange} placeholder="Enter Delivery To" className="material-input" />
            </div>
          </div>

          <div className="material-row">
            {/* GL Accounts Dropdown */}
            <div className="material-field" ref={glDropdownRef}>
              <label className="material-label">GL Accounts*</label>
              <div className="material-dropdown-wrapper">
                <button
                  className="material-dropdown-button"
                  onClick={() => setGlDropdownOpen(!glDropdownOpen)}
                  type="button"
                >
                  <span className="material-dropdown-text">
                    {selectedGLAccounts.length > 0 ? `${selectedGLAccounts.length} Selected` : 'Select GL Accounts'}
                  </span>
                  <FiChevronDown
                    size={18}
                    className={`material-chevron ${glDropdownOpen ? 'open' : ''}`}
                  />
                </button>

                {glDropdownOpen && (
                  <div className="material-dropdown-menu">
                    <div className="material-dropdown-search">
                      <input
                        type="text"
                        placeholder="Search GL accounts..."
                        value={glSearchTerm}
                        onChange={(e) => handleGLSearch(e.target.value)}
                        className="material-search-input"
                      />
                    </div>

                    <div className="material-select-all">
                      <label className="material-checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectAllChecked}
                          onChange={(e) => handleSelectAllGL(e.target.checked)}
                        />
                        <span>Select All</span>
                      </label>
                    </div>

                    <div
                      ref={glAccountsListRef}
                      onScroll={handleGLScroll}
                      className="material-accounts-list"
                    >
                      {glAccounts.length === 0 && !glLoading ? (
                        <div className="material-empty">No GL accounts found</div>
                      ) : (
                        glAccounts.map((account) => (
                          <label key={account.id} className="material-checkbox-label">
                            <input
                              type="checkbox"
                              checked={selectedGLAccounts.includes(account.id)}
                              onChange={() => handleGLCheckboxChange(account.id)}
                            />
                            <span className="material-account-name">
                              {account.name || account.code}
                            </span>
                            {account.name && account.name !== account.code && (
                              <span className="material-account-code">{account.code}</span>
                            )}
                          </label>
                        ))
                      )}

                      {glLoading && (
                        <div className="material-loading-more">Loading more...</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {formData.glAccount && (
                <small className="material-helper-text">Selected: {formData.glAccount}</small>
              )}
            </div>

            <div className="material-field" ref={costCenterDropdownRef}>
              <label className="material-label">Cost Center*</label>
              <div className="material-dropdown-wrapper">
                <button
                  type="button"
                  className="material-dropdown-button"
                  onClick={() => setCostCenterDropdownOpen(!costCenterDropdownOpen)}
                >
                  <span className="material-dropdown-text">
                    {formData.costCenter || 'Select Cost Center'}
                  </span>
                  <FiChevronDown
                    size={18}
                    className={`material-chevron ${costCenterDropdownOpen ? 'open' : ''}`}
                  />
                </button>

                {costCenterDropdownOpen && (
                  <div className="material-dropdown-menu">
                    <div className="material-dropdown-search">
                      <input
                        type="text"
                        placeholder="Search cost center..."
                        value={costCenterSearchTerm}
                        onChange={(e) => handleCostCenterSearch(e.target.value)}
                        className="material-search-input"
                        autoFocus
                      />
                    </div>

                    <div
                      ref={costCenterListRef}
                      onScroll={handleCostCenterScroll}
                      className="material-accounts-list"
                    >
                      {costCentersList.length === 0 && !costCenterLoading ? (
                        <div className="material-empty">No cost centers found</div>
                      ) : (
                        costCentersList.map((center, index) => (
                          <label key={`${center}-${index}`} className="material-checkbox-label">
                            <input
                              type="radio"
                              name="costCenter"
                              checked={formData.costCenter === center}
                              onChange={() => handleCostCenterSelect(center)}
                            />
                            <span className="material-account-name">{center}</span>
                          </label>
                        ))
                      )}

                      {costCenterLoading && (
                        <div className="material-loading-more">Loading more...</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="material-field">
              <label className="material-label">Purchase Group</label>
              <input type="text" name="purchaseGroup" value={formData.purchaseGroup} onChange={handleInputChange} placeholder="Enter Purchase Group" className="material-input" />
            </div>
          </div>

          <div className="material-smart-defaults">
            <div className="material-smart-header">
              <div className="material-zap-icon-wrapper"><FaWandMagicSparkles /></div>
              <div>
                <div className="material-smart-title">Smart Defaults Applied</div>
                <div className="material-smart-subtitle">We've taken care of these for you</div>
              </div>
            </div>

            <div className="material-defaults-grid">
              <div className="material-default-item">
                <div className="material-icon-box material-bg-green-light"><FaBuilding /></div>
                <div>
                  <div className="material-default-label">Company Code</div>
                  <div className="material-default-value">
                    {isLoadingSmartDefaults ? 'Loading...' : (smartDefaults.companyCode || '-')}
                  </div>
                </div>
              </div>
              <div className="material-default-item">
                <div className="material-icon-box material-bg-cyan-light"><FaChartArea /></div>
                <div>
                  <div className="material-default-label">Ship-to Plant</div>
                  <div className="material-default-value">
                    {isLoadingSmartDefaults ? 'Loading...' : (smartDefaults.shipToPlant || '-')}
                  </div>
                </div>
              </div>
              <div className="material-default-item">
                <div className="material-icon-box material-bg-blue-light"><FaLocationDot /></div>
                <div>
                  <div className="material-default-label">Bill-to</div>
                  <div className="material-default-value">
                    {isLoadingSmartDefaults ? 'Loading...' : (smartDefaults.billTo || '-')}
                  </div>
                </div>
              </div>
              <div className="material-default-item">
                <div className="material-icon-box material-bg-yellow-light"><FaFileInvoiceDollar /></div>
                <div>
                  <div className="material-default-label">Currency</div>
                  <div className="material-default-value">
                    {isLoadingSmartDefaults ? 'Loading...' : (smartDefaults.currency || '-')}
                  </div>
                </div>
              </div>
              <div className="material-default-item">
                <div className="material-icon-box material-bg-purple-light"><TbPackage /></div>
                <div>
                  <div className="material-default-label">Deliver To</div>
                  <div className="material-default-value">
                    {isLoadingSmartDefaults ? 'Loading...' : (smartDefaults.deliverTo || '-')}
                  </div>
                </div>
              </div>
              <div className="material-default-item">
                <div className="material-icon-box material-bg-yellow-light"><FaFileInvoiceDollar /></div>
                <div>
                  <div className="material-default-label">Tax Code</div>
                  <div className="material-default-value">{extractCode(formData.taxCode)}</div>
                </div>
              </div>
              <div className="material-default-item">
                <div className="material-icon-box material-bg-purple-light"><TbPackage /></div>
                <div>
                  <div className="material-default-label">Commodity</div>
                  <div className="material-default-value">{extractCode(formData.commodity)}</div>
                </div>
              </div>
            </div>

            <div className="material-smart-footer">
              <div className="material-footer-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <span>Based on your profile & policy</span>
              </div>
              <button type="button" className="material-override-link">Need to override?</button>
            </div>
          </div>

          <div className="material-tags">
            <span className="material-tag">Account Type: Expenses</span>
            <span className="material-tag">Type: Materials</span>
          </div>

          <div className="material-footer">
            <button type="button" className="material-draft-button" onClick={addLineItem} disabled={isSubmitting}>Add Line Item</button>
            <button type="button" className="material-submit-button" onClick={submitAllFormDirectly} disabled={isSubmitting}><GrSend /> {isSubmitting ? 'Submitting...' : 'Submit Requisition'}</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28 }} className="line-items-wrapper">
        <h3 style={{ color: '#5b21b6', margin: '6px 0 12px' ,marginLeft: '20px' }}>Line Item(s) ({lineItems.length})</h3>

        <div className="line-items-table-card">
          <div className="line-items-table-scroll">
            <table className="line-items-table">
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="select all" /></th>
                  <th>LINE ITEM NO</th>
                  <th>UNIQUE ID</th>
                  <th>PURCHASE ORG</th>
                  <th>PR UNIQUE NAME</th>
                  <th>VENDOR</th>
                  <th>DESCRIPTION</th>
                  <th>QTY</th>
                  <th>UOM</th>
                  <th>UNIT PRICE</th>
                  <th>DELIVERY DATE</th>
                  <th>DELIVERY TO</th>
                  <th>GL ACCOUNT</th>
                  <th>COST CENTER</th>
                  <th>COMMODITY</th>
                  <th>EDIT</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={18} style={{ textAlign: 'center', padding: 28, color: '#6b7280' }}>
                      No line items yet
                    </td>
                  </tr>
                ) : (
                  lineItems.map(item => (
                    <tr key={item.id}>
                      <td><input type="checkbox" /></td>
                      <td>{item.lineNo}</td>
                      <td>{item.uniqueId}</td>
                      <td>{item.purchaseOrg}</td>
                      <td>{item.prUniqueName}</td>
                      <td>{item.vendor}</td>
                      <td style={{ maxWidth: 260 }}>{item.description}</td>
                      <td>{item.quantity}</td>
                      <td>{item.uom}</td>
                      <td>{item.unitPrice} AED</td>
                      <td>{item.deliveryDate}</td>
                      <td>{item.deliveryTo}</td>
                      <td>{extractGLAccountCode(item.glAccount)}</td>
                      <td>{extractCode(item.costCenter)}</td>
                      <td>{extractCode(item.commodity)}</td>
                      <td>
                        <button className="link-edit" onClick={() => editLineItem(item.id)} disabled={isSubmitting}><FiEdit /> Edit</button>
                      </td>
                      <td className="action-cell">
                        <button className="remove-btn" onClick={() => removeLineItem(item.id)} disabled={isSubmitting}>Remove</button>
                        <button className="submit-line-btn" onClick={() => submitSingleLine(item.id)} disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit'}</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, paddingRight: 10}}>
          <button className="material-button-submit" onClick={submitAll} disabled={isSubmitting || lineItems.length === 0}><GrSend /> {isSubmitting ? 'Submitting...' : 'Submit Requisition'}</button>
        </div>
      </div>

      {showExcelModal && (
        <div className="material-modal-overlay" onClick={() => setShowExcelModal(false)}>
          <div className="material-modal-content" onClick={e => e.stopPropagation()}>
            <button className="material-close-btn" onClick={() => setShowExcelModal(false)}>×</button>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{ width: "80px", height: "80px", background: "#e6f4ea", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
                <svg width="48" height="48" viewBox="0 0 64 64">
                  <rect width="64" height="64" rx="12" fill="#217346" />
                  <path d="M16 12h32v40H16z" fill="#185C37" />
                  <text x="32" y="48" fill="white" fontSize="32" fontWeight="bold" textAnchor="middle">X</text>
                </svg>
              </div>
            </div>
            <h2 style={{ textAlign: "center", fontSize: "1.8rem", fontWeight: "700" }}>Import from Excel</h2>
            <p style={{ textAlign: "center", color: "#6b7280", marginBottom: "2rem" }}>Upload multiple material lines in seconds</p>
          </div>
        </div>
      )}

      {showChangePRModal && (
        <div className="material-modal-overlay" onClick={() => setShowChangePRModal(false)}>
          <div className="material-modal-content" onClick={e => e.stopPropagation()}>
            <button className="material-close-btn" onClick={() => setShowChangePRModal(false)}>×</button>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{ width: "80px", height: "80px", background: "#fed7aa", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
                <FiEdit size={40} color="#ea580c" />
              </div>
            </div>
            <h2 style={{ textAlign: "center", fontSize: "1.8rem", fontWeight: "700" }}>Change Existing PR</h2>
            <p style={{ textAlign: "center", color: "#6b7280", marginBottom: "2rem" }}>Enter the PR number to load and modify</p>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
              <input type="text" placeholder="PR Number" value={prSearchNumber} onChange={e => setPrSearchNumber(e.target.value)}
                style={{ flex: 1, padding: "14px 18px", borderRadius: "12px", border: "2px solid #e5e7eb" }} />
              <button style={{ padding: "14px 28px", background: "#fb923c", color: "white", border: "none", borderRadius: "12px", fontWeight: "700" }}>
                Load PR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialRequisitionForm;