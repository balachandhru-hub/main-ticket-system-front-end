import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Contract.css';
import { toast } from 'react-toastify';
import { getDropdownData, createContract, fetchVendors, fetchParentAgreements } from '../api/contractService';
import type { DropdownOption } from '../Dto/ContractDetailsDto';
import { fetchContractCustomTypes } from '../api/contractCustomTypesApi';
import { SearchableSelect, MultiSearchableSelect } from './ConciergeForm';
import type { ContractCustomTypeDto } from '../Dto/ContractCustomTypeDto';
import type { CreateContractPayload } from '../Dto/ContractDetailsDto';
import { getMyProfile } from '../api/userApi';
import type { ProfileResponseDto } from '../Dto/ProfileResponseDto';
import type { VendorOption } from '../Dto/ContractCustomTypeDto';

interface ContractFormData {
  isTestProject: string;
  name: string;
  hierarchicalType: string;
  termType: string;
  commodity: string[];
  region: string[];
  department: string[];
  contractValue: string;
  currency: string;
  effectiveDate: string;
  expirationDate: string;
  description: string;
  template: string;
  vendorName: string;
  smVendorId: string;
  renewalInterval: string;
  maxRenewals: string;
  parentAgreement: string;
}

interface DropdownState {
  commodities: DropdownOption[];
  regions: DropdownOption[];
  departments: DropdownOption[];
  isLoading: {
    commodities: boolean;
    regions: boolean;
    departments: boolean;
  };
  pagination: {
    commodities: number;
    regions: number;
    departments: number;
  };
  hasMore: {
    commodities: boolean;
    regions: boolean;
    departments: boolean;
  };
}

const extractErrorMessage = (message: string): string => {
  if (!message) return 'Failed to create contract';

  const duplicateFolderError = 'Another folder or document in the selected parent folder already has the same name.';
  if (message.includes(duplicateFolderError)) return duplicateFolderError;

  const cleanOuterBrackets = (msg: string): string => {
    let clean = msg.trim();
    while (clean.startsWith('[') && clean.endsWith(']')) {
      clean = clean.slice(1, -1).trim();
    }
    return clean;
  };

  // Helper to extract clean strings from a single error object message
  const processSingleMessage = (msg: string): { descriptive: string[]; generic: string[] } => {
    const descriptive: string[] = [];
    const generic: string[] = [];

    if (!msg || typeof msg !== 'string') return { descriptive, generic };

    // If the message contains JSON-like structures (array/object), recurse to parse it
    if (msg.includes('{') || msg.includes('[')) {
      // Check if it looks like an Ariba nested error array or object
      const subBrace = msg.indexOf('{');
      const subBracket = msg.indexOf('[');
      const subStart = subBrace !== -1 && subBracket !== -1 ? Math.min(subBrace, subBracket) : (subBrace !== -1 ? subBrace : subBracket);
      const subEnd = Math.max(msg.lastIndexOf('}'), msg.lastIndexOf(']'));

      if (subStart !== -1 && subEnd !== -1 && subStart < subEnd) {
        const subJsonStr = msg.slice(subStart, subEnd + 1);
        try {
          // If the JSON inside is parsed successfully, get its message
          const parsedSub = JSON.parse(subJsonStr);
          const recursiveResult = processParsedJson(parsedSub);
          if (recursiveResult) {
            if (recursiveResult.includes('Invalid field values')) {
              generic.push(recursiveResult);
            } else {
              descriptive.push(recursiveResult);
            }
            return { descriptive, generic };
          }
        } catch (e) {
          // Ignore parse failures, treat as a normal string
        }
      }
    }

    const cleanMsg = cleanOuterBrackets(msg);

    if (cleanMsg.includes('Invalid field values for following fields')) {
      // It's a generic validation error message. Parse field errors from it.
      // E.g.: "Invalid field values for following fields : [parentAgreement : [Value must be set.], hierarchicalType : [SubAgreement contract cannot have null parent agreement.]]"
      // Or: "Invalid field values for following fields : [title : [Another folder or document in the selected parent folder already has the same name.]]"
      // Regex matches: name : [errorText]
      const regex = /([^:[\]\s]+)\s*:\s*\[([^\]]+)\]/g;
      let match;
      let foundAny = false;
      while ((match = regex.exec(cleanMsg)) !== null) {
        const errorText = cleanOuterBrackets(match[2]);
        if (errorText) {
          generic.push(errorText);
          foundAny = true;
        }
      }
      
      // Fallback in case regex failed to match anything but it's still labeled "Invalid field values"
      if (!foundAny) {
        const start = cleanMsg.indexOf('[');
        const end = cleanMsg.lastIndexOf(']');
        if (start !== -1 && end !== -1 && start < end) {
          const inner = cleanOuterBrackets(cleanMsg.slice(start + 1, end));
          if (inner) generic.push(inner);
        } else {
          generic.push(cleanMsg);
        }
      }
    } else {
      // It's a descriptive custom error message (e.g. "[The parent agreement...]")
      descriptive.push(cleanMsg);
    }

    return { descriptive, generic };
  };

  // Helper to extract and process messages from a parsed JSON structure (array or object)
  const processParsedJson = (parsed: any): string | null => {
    if (!parsed) return null;

    const allDescriptive: string[] = [];
    const allGeneric: string[] = [];

    const items = Array.isArray(parsed) ? parsed : [parsed];

    for (const item of items) {
      if (item && typeof item === 'object') {
        const rawMsg = item.message || item.error?.message || item.description;
        if (rawMsg && typeof rawMsg === 'string') {
          const { descriptive, generic } = processSingleMessage(rawMsg);
          allDescriptive.push(...descriptive);
          allGeneric.push(...generic);
        }
      } else if (typeof item === 'string') {
        const { descriptive, generic } = processSingleMessage(item);
        allDescriptive.push(...descriptive);
        allGeneric.push(...generic);
      }
    }

    // Prioritize descriptive custom messages over generic field validation messages
    if (allDescriptive.length > 0) {
      return allDescriptive.join('\n');
    }

    if (allGeneric.length > 0) {
      return allGeneric.join('\n');
    }

    return null;
  };

  // 1. Try to find and parse JSON inside the message string
  const firstBrace = message.indexOf('{');
  const firstBracket = message.indexOf('[');
  let jsonStartIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    jsonStartIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    jsonStartIdx = firstBrace;
  } else if (firstBracket !== -1) {
    jsonStartIdx = firstBracket;
  }

  const lastBrace = message.lastIndexOf('}');
  const lastBracket = message.lastIndexOf(']');
  let jsonEndIdx = -1;
  if (lastBrace !== -1 && lastBracket !== -1) {
    jsonEndIdx = Math.max(lastBrace, lastBracket);
  } else if (lastBrace !== -1) {
    jsonEndIdx = lastBrace;
  } else if (lastBracket !== -1) {
    jsonEndIdx = lastBracket;
  }

  if (jsonStartIdx !== -1 && jsonEndIdx !== -1 && jsonStartIdx < jsonEndIdx) {
    const jsonStr = message.slice(jsonStartIdx, jsonEndIdx + 1);
    try {
      const parsed = JSON.parse(jsonStr);
      const result = processParsedJson(parsed);
      if (result) return result;
    } catch (e) {
      // Parse failed, proceed to try parsing full message
    }
  }

  // 2. Try to parse the entire message string directly
  try {
    const parsed = JSON.parse(message);
    const result = processParsedJson(parsed);
    if (result) return result;
  } catch (e) {
    // Parse failed, treat message as a plain string
  }

  // 3. Fallback for plain string message
  const { descriptive, generic } = processSingleMessage(message);
  if (descriptive.length > 0) return descriptive.join('\n');
  if (generic.length > 0) return generic.join('\n');

  return message;
};


const ContractCreate: React.FC = () => {
  const [formData, setFormData] = useState<ContractFormData>({
    isTestProject: 'No',
    name: '',
    hierarchicalType: '',
    termType: '',
    commodity: [],
    region: [],
    department: [],
    contractValue: '',
    currency: 'AED',
    effectiveDate: '',
    expirationDate: '',
    description: '',
    template: '',
    vendorName: '',
    smVendorId: '',
    renewalInterval: '',
    maxRenewals: '',
    parentAgreement: '',
  });

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [dateError, setDateError] = useState<string>('');
  const [nameCharError, setNameCharError] = useState<string>('');
  const [descCharError, setDescCharError] = useState<string>('');
  const [contractValueError, setContractValueError] = useState<string>('');
  const [dropdownState, setDropdownState] = useState<DropdownState>({
    commodities: [],
    regions: [],
    departments: [],
    isLoading: {
      commodities: false,
      regions: false,
      departments: false,
    },
    pagination: {
      commodities: 0,
      regions: 0,
      departments: 0,
    },
    hasMore: {
      commodities: true,
      regions: true,
      departments: true,
    },
  });


  const [commoditySearch, setCommoditySearch] = useState('');
  const [regionSearch, setRegionSearch] = useState('');
  const [departmentSearch, setDepartmentSearch] = useState('');

  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendorHasMore, setVendorHasMore] = useState(true);
  const [vendorPage, setVendorPage] = useState(0);
  const [vendorSearch, setVendorSearch] = useState('');
  
  const [parentOptions, setParentOptions] = useState<any[]>([]);
  const [parentLoading, setParentLoading] = useState(false);
  const [parentHasMore, setParentHasMore] = useState(true);
  const [parentPage, setParentPage] = useState(0);
  const [parentSearch, setParentSearch] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState<ProfileResponseDto | null>(null);
  
  const parentDropdownRef = useRef<HTMLDivElement>(null);
  const [isParentDropdownOpen, setIsParentDropdownOpen] = useState(false);


  const cachedDataRef = useRef({
    commodities: false,
    regions: false,
    departments: false,
  });

  const loadDropdownData = async (
    type: 'COMODITY' | 'REGION' | 'DEPARTMENT',
    index: number = 0,
    search: string = ''
  ) => {
    const typeKeyMap = {
      COMODITY: 'commodities',
      REGION: 'regions',
      DEPARTMENT: 'departments',
    } as const;

    const dropdownKey = typeKeyMap[type];

    setDropdownState(prev => ({
      ...prev,
      isLoading: { ...prev.isLoading, [dropdownKey]: true }
    }));

    const result = await getDropdownData(type, index, 10, search);

    if (result.error) {
      toast.error(extractErrorMessage(result.error.message));
      setDropdownState(prev => ({
        ...prev,
        hasMore: { ...prev.hasMore, [dropdownKey]: false }
      }));
    } else {
      setDropdownState(prev => ({
        ...prev,
        [dropdownKey]: index === 0
          ? result.data
          : [...prev[dropdownKey], ...result.data],
        pagination: { ...prev.pagination, [dropdownKey]: index + 10 },
        hasMore: { ...prev.hasMore, [dropdownKey]: result.data.length === 10 }
      }));

      if (index === 0) {
        cachedDataRef.current[dropdownKey] = true;
      }
    }

    setDropdownState(prev => ({
      ...prev,
      isLoading: { ...prev.isLoading, [dropdownKey]: false }
    }));
  };




  const [hierarchicalOptions, setHierarchicalOptions] = useState<ContractCustomTypeDto[]>([]);
  const [hierarchicalLoading, setHierarchicalLoading] = useState(false);
  const [hierarchicalHasMore, setHierarchicalHasMore] = useState(true);
  const [hierarchicalPage, setHierarchicalPage] = useState(0);
  const [hierarchicalSearch, setHierarchicalSearch] = useState('');


  const [termOptions, setTermOptions] = useState<ContractCustomTypeDto[]>([]);
  const [termLoading, setTermLoading] = useState(false);
  const [termHasMore, setTermHasMore] = useState(true);
  const [termPage, setTermPage] = useState(0);
  const [termSearch, setTermSearch] = useState('');


  const [contractTypeOptions, setContractTypeOptions] = useState<ContractCustomTypeDto[]>([]);
  const [contractTypeLoading, setContractTypeLoading] = useState(false);
  const [contractTypeHasMore, setContractTypeHasMore] = useState(true);
  const [contractTypePage, setContractTypePage] = useState(0);
  const [contractTypeSearch, setContractTypeSearch] = useState('');




  const fetchHierarchical = useCallback(async (page: number, search: string, reset = false) => {
    if (hierarchicalLoading) return;
    setHierarchicalLoading(true);
    try {
      const res = await fetchContractCustomTypes('HierarchicalType', page, 10, search);
      if (Array.isArray(res)) {
        setHierarchicalOptions(prev => reset ? res : [...prev, ...res]);
        setHierarchicalHasMore(res.length === 10);
        setHierarchicalPage(page);
      } else {
        toast.error(extractErrorMessage(res.message || 'Failed to load hierarchical types'));
        setHierarchicalHasMore(false);
      }
    } catch {
      setHierarchicalHasMore(false);
    } finally {
      setHierarchicalLoading(false);
    }
  }, []);

  const fetchVendorList = useCallback(async (page: number, search: string, reset = false) => {
    if (vendorLoading) return;
    setVendorLoading(true);
    try {
      const res = await fetchVendors(search, page, 10);
      if (res.error) {
        toast.error(extractErrorMessage(res.error.message || 'Failed to load vendors'));
        setVendorHasMore(false);
      } else {
        setVendorOptions(prev => reset ? res.data : [...prev, ...res.data]);
        setVendorHasMore(res.data.length === 10);
        setVendorPage(page);
      }
    } catch {
      setVendorHasMore(false);
    } finally {
      setVendorLoading(false);
    }
  }, []);

  const fetchParentList = useCallback(async (page: number, search: string, reset = false) => {
    if (parentLoading) return;
    setParentLoading(true);
    try {
      const res = await fetchParentAgreements(search, page, 10);
      if (res.error) {
        toast.error(extractErrorMessage(res.error.message || 'Failed to load parent agreements'));
        setParentHasMore(false);
      } else {
        setParentOptions(prev => reset ? res.data : [...prev, ...res.data]);
        setParentHasMore(res.data.length === 10);
        setParentPage(page);
      }
    } catch {
      setParentHasMore(false);
    } finally {
      setParentLoading(false);
    }
  }, []);

  const handleParentSearch = useCallback((search: string) => {
    setParentSearch(search);
    fetchParentList(0, search, true);
  }, [fetchParentList]);

  const handleParentLoadMore = useCallback(() => {
    if (parentHasMore && !parentLoading) {
      fetchParentList(parentPage + 10, parentSearch, false);
    }
  }, [parentHasMore, parentLoading, parentPage, parentSearch, fetchParentList]);

  const handleVendorSearch = useCallback((search: string) => {
    setVendorSearch(search);
    fetchVendorList(0, search, true);
  }, [fetchVendorList]);

  const handleVendorLoadMore = useCallback(() => {
    if (vendorHasMore && !vendorLoading) {
      fetchVendorList(vendorPage + 10, vendorSearch, false);
    }
  }, [vendorHasMore, vendorLoading, vendorPage, vendorSearch, fetchVendorList]);

  const fetchTermTypes = useCallback(async (page: number, search: string, reset = false) => {
    if (termLoading) return;
    setTermLoading(true);
    try {
      const res = await fetchContractCustomTypes('ExpirationTermType', page, 10, search);
      if (Array.isArray(res)) {
        setTermOptions(prev => reset ? res : [...prev, ...res]);
        setTermHasMore(res.length === 10);
        setTermPage(page);
      } else {
        toast.error(extractErrorMessage(res.message || 'Failed to load term types'));
        setTermHasMore(false);
      }
    } catch {
      setTermHasMore(false);
    } finally {
      setTermLoading(false);
    }
  }, []);

  const fetchContractTypes = useCallback(async (page: number, search: string, reset = false) => {
    if (contractTypeLoading) return;
    setContractTypeLoading(true);
    try {
      const res = await fetchContractCustomTypes('ContractType', page, 10, search);
      if (Array.isArray(res)) {
        setContractTypeOptions(prev => reset ? res : [...prev, ...res]);
        setContractTypeHasMore(res.length === 10);
        setContractTypePage(page);
      } else {
        toast.error(extractErrorMessage(res.message || 'Failed to load contract types'));
        setContractTypeHasMore(false);
      }
    } catch {
      setContractTypeHasMore(false);
    } finally {
      setContractTypeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHierarchical(0, '', true);
    fetchTermTypes(0, '', true);
    fetchContractTypes(0, '', true);
    fetchVendorList(0, '', true);

    const loadProfile = async () => {
      const response = await getMyProfile();
      if (response && 'message' in response) {
      } else {
        setProfile(response as ProfileResponseDto);
      }
    };
    loadProfile();

    const handleClickOutside = (event: MouseEvent) => {
      if (parentDropdownRef.current && !parentDropdownRef.current.contains(event.target as Node)) {
        setIsParentDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [fetchHierarchical, fetchTermTypes, fetchContractTypes, fetchVendorList]);

  const handleCommoditySearch = useCallback((search: string) => {
    setCommoditySearch(search);
    loadDropdownData('COMODITY', 0, search);
  }, []);

  const handleCommodityLoadMore = useCallback(() => {
    if (!dropdownState.isLoading.commodities && dropdownState.hasMore.commodities) {
      loadDropdownData('COMODITY', dropdownState.pagination.commodities, commoditySearch);
    }
  }, [dropdownState.isLoading.commodities, dropdownState.hasMore.commodities, dropdownState.pagination.commodities, commoditySearch]);

  const handleRegionSearch = useCallback((search: string) => {
    setRegionSearch(search);
    loadDropdownData('REGION', 0, search);
  }, []);

  const handleRegionLoadMore = useCallback(() => {
    if (!dropdownState.isLoading.regions && dropdownState.hasMore.regions) {
      loadDropdownData('REGION', dropdownState.pagination.regions, regionSearch);
    }
  }, [dropdownState.isLoading.regions, dropdownState.hasMore.regions, dropdownState.pagination.regions, regionSearch]);

  const handleDepartmentSearch = useCallback((search: string) => {
    setDepartmentSearch(search);
    loadDropdownData('DEPARTMENT', 0, search);
  }, []);

  const handleDepartmentLoadMore = useCallback(() => {
    if (!dropdownState.isLoading.departments && dropdownState.hasMore.departments) {
      loadDropdownData('DEPARTMENT', dropdownState.pagination.departments, departmentSearch);
    }
  }, [dropdownState.isLoading.departments, dropdownState.hasMore.departments, dropdownState.pagination.departments, departmentSearch]);

  // Memoized handlers passed to SearchableSelect to avoid changing identity on each render
  const handleHierarchicalSearch = useCallback((search: string) => {
    setHierarchicalSearch(search);
    fetchHierarchical(0, search, true);
  }, [fetchHierarchical]);

  const handleHierarchicalLoadMore = useCallback(() => {
    if (hierarchicalHasMore && !hierarchicalLoading) {
      fetchHierarchical(hierarchicalPage + 10, hierarchicalSearch, false);
    }
  }, [hierarchicalHasMore, hierarchicalLoading, hierarchicalPage, hierarchicalSearch, fetchHierarchical]);

  const handleTermSearch = useCallback((search: string) => {
    setTermSearch(search);
    fetchTermTypes(0, search, true);
  }, [fetchTermTypes]);

  const handleTermLoadMore = useCallback(() => {
    if (termHasMore && !termLoading) {
      fetchTermTypes(termPage + 10, termSearch, false);
    }
  }, [termHasMore, termLoading, termPage, termSearch, fetchTermTypes]);

  const handleContractTypeSearch = useCallback((search: string) => {
    setContractTypeSearch(search);
    fetchContractTypes(0, search, true);
  }, [fetchContractTypes]);

  const handleContractTypeLoadMore = useCallback(() => {
    if (contractTypeHasMore && !contractTypeLoading) {
      fetchContractTypes(contractTypePage + 10, contractTypeSearch, false);
    }
  }, [contractTypeHasMore, contractTypeLoading, contractTypePage, contractTypeSearch, fetchContractTypes]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: false }));
    }

    if (name === 'contractValue') {
      const numValue = parseFloat(value);
      if (value.trim() !== '') {
        if (isNaN(numValue) || numValue < 0) {
          setContractValueError('Contract Value must be greater than or equal to 0');
        } else {
          setContractValueError('');
        }
      } else {
        setContractValueError('');
      }
    }

    // Validate expiration date is greater than effective date
    if (name === 'effectiveDate' || name === 'expirationDate') {
      const effectiveDate = name === 'effectiveDate' ? value : formData.effectiveDate;
      const expirationDate = name === 'expirationDate' ? value : formData.expirationDate;

      if (effectiveDate && expirationDate) {
        const effDate = new Date(effectiveDate);
        const expDate = new Date(expirationDate);

        if (expDate < effDate) {
          setDateError('Expiration Date must be greater than or equal to Effective Date');
        } else {
          setDateError('');
        }
      } else {
        setDateError('');
      }
    }
  };

  // Helper function to build contract creation payload from form data
  const buildContractPayload = (): CreateContractPayload => {
    const commodityObjects = formData.commodity.map(id => {
      const found = dropdownState.commodities.find(c => c.id === id);
      return {
        uniqueName: found?.uniqueName || id,
        domain: 'custom',
        name: found?.name || id,
      };
    });

    // Map selected region IDs to region objects
    const regions = formData.region.map(id => {
      const found = dropdownState.regions.find(r => r.id === id);
      return {
        uniqueName: found?.uniqueName || id,
        name: found?.name || id,
      };
    });

    // Map selected department IDs to full department objects
    const departmentObjects = formData.department.map(id => {
      const found = dropdownState.departments.find(d => d.id === id);
      return {
        uniqueName: found?.uniqueName || id,
        name: found?.name || id,
      };
    });

    // Building form data and defaults
    const ownerData = {
      uniqueName: profile?.aribaUserName || '',
      passwordAdapter: profile?.aribaPassword || '',
      name: profile?.aribaUserName || '',
      emailAddress: profile?.email || '',
      orgANId: profile?.orgANId || '',
    };

    // Build supplier object
    const supplierData = {
      name: formData.vendorName,
      smVendorID: formData.smVendorId,
    };

    return {
      title: formData.name,
      description: formData.description,
      commodities: commodityObjects,
      regions: regions,
      departments: departmentObjects,
      owner: ownerData,
      supplier: supplierData,
      effectiveDate: formData.effectiveDate ? new Date(formData.effectiveDate).toISOString() : new Date().toISOString(),
      expirationDate: formData.expirationDate ? new Date(formData.expirationDate).toISOString() : new Date().toISOString(),
      contractAmount: {
        amount: parseFloat(formData.contractValue) || 0,
        currency: formData.currency,
      },
      templateId: formData.template,
      hierarchicalType: formData.hierarchicalType,
      expirationTermType: formData.termType,
      isTestProject: formData.isTestProject === 'Yes',
      autoRenewalInterval: formData.termType === 'AutoRenew' ? formData.renewalInterval : undefined,
      maximumNumberOfRenewals: formData.termType === 'AutoRenew' ? formData.maxRenewals : undefined,
      parentAgreement: formData.hierarchicalType.toLowerCase().includes('sub agreement') || formData.hierarchicalType.toLowerCase().includes('subagreement') ? formData.parentAgreement : undefined,
    };
  };

  const handleCreate = async () => {
    if (formData.name.length > 255) {
      setNameCharError('No more characters allowed');
      toast.error('No more characters allowed');
      return;
    }
    if (formData.description.length > 255) {
      setDescCharError('No more characters allowed');
      toast.error('No more characters allowed');
      return;
    }
    const newErrors: Record<string, boolean> = {};

    const stringFields: (keyof ContractFormData)[] = [
      'isTestProject', 'name', 'hierarchicalType', 'termType',
      'contractValue', 'currency', 'effectiveDate',
      'expirationDate', 'description', 'template', 'vendorName',
      'renewalInterval', 'maxRenewals', 'parentAgreement'
    ];

    stringFields.forEach(key => {
      if (key === 'renewalInterval' || key === 'maxRenewals') {
        if (formData.termType === 'AutoRenew' && !formData[key]) {
          newErrors[key] = true;
        }
        return;
      }
      if (key === 'parentAgreement') {
        if ((formData.hierarchicalType.toLowerCase().includes('sub agreement') || formData.hierarchicalType.toLowerCase().includes('subagreement')) && !formData[key]) {
          newErrors[key] = true;
        }
        return;
      }
      if (!formData[key]) {
        newErrors[key] = true;
      }
    });

    if (formData.commodity.length === 0) {
      newErrors['commodity'] = true;
    }

    if (formData.region.length === 0) {
      newErrors['region'] = true;
    }

    if (formData.department.length === 0) {
      newErrors['department'] = true;
    }

    // Validate expiration date is greater than effective date
    if (formData.effectiveDate && formData.expirationDate) {
      const effDate = new Date(formData.effectiveDate);
      const expDate = new Date(formData.expirationDate);
      if (expDate < effDate) {
        setDateError('Expiration Date must be greater than or equal to Effective Date');
        toast.error('Expiration Date must be greater than or equal to Effective Date');
        return;
      }
    }

    // Validate Contract Value is greater than or equal to 0
    if (formData.contractValue) {
      const numValue = parseFloat(formData.contractValue);
      if (isNaN(numValue) || numValue < 0) {
        setContractValueError('Contract Value must be greater than or equal to 0');
        toast.error('Contract Value must be greater than or equal to 0');
        return;
      } else {
        setContractValueError('');
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all the fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildContractPayload();
      const response = await createContract(payload);

      if (response.statusCode >= 400) {
        toast.error(extractErrorMessage(response.message || 'Failed to create contract'));
      } else if (response?.isSuccess === false) {
        toast.error('Failed to create contract');
      }
      else {
        toast.success("Contract created successfully!");
        handleCancel();
      }
    } catch (error) {
      toast.error('An error occurred while creating the contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      isTestProject: 'No',
      name: '',
      hierarchicalType: '',
      termType: '',
      commodity: [],
      region: [],
      department: [],
      contractValue: '',
      currency: 'AED',
      effectiveDate: '',
      expirationDate: '',
      description: '',
      template: '',
      vendorName: '',
      smVendorId: '',
      renewalInterval: '',
      maxRenewals: '',
      parentAgreement: '',
    });

    setErrors({});
    setDateError('');
    setContractValueError('');
  };
  useEffect(() => {
    loadDropdownData('COMODITY', 0);
    loadDropdownData('REGION', 0);
    loadDropdownData('DEPARTMENT', 0);
  }, []);


  return (
    <div className="contract-form-card" id="contract-details-form">
      <div className="contract-form-grid">
        <div className="form-group">
          <label className={errors.isTestProject ? 'label-error' : ''}>Test Project</label>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="isTestProject"
                value="Yes"
                checked={formData.isTestProject === 'Yes'}
                onChange={handleInputChange}
              />
              Yes
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="isTestProject"
                value="No"
                checked={formData.isTestProject === 'No'}
                onChange={handleInputChange}
              />
              No
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="name" className={errors.name || nameCharError ? 'label-error' : ''}>Name</label>
          <input
            type="text"
            id="name"
            name="name"
            className="input-field"
            placeholder="Enter contract name"
            value={formData.name}
            maxLength={255}
            onChange={handleInputChange}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
            <span style={{ color: formData.name.length === 255 ? '#dc3545' : '#6c757d' }}>
              {formData.name.length}/255
            </span>
            {formData.name.length === 255 && (
              <span style={{ color: '#dc3545' }}>No more characters allowed</span>
            )}
            {nameCharError && formData.name.length !== 255 && (
              <span className="field-error-message">{nameCharError}</span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className={errors.hierarchicalType ? 'label-error' : ''}>Hierarchical Type</label>
          <SearchableSelect
            id="hierarchicalType"
            name="hierarchicalType"
            value={formData.hierarchicalType}
            onChange={(value) => {
              setFormData(prev => ({ ...prev, hierarchicalType: value }));
              setErrors(prev => ({ ...prev, hierarchicalType: false }));
            }}
            options={hierarchicalOptions.map(o => o.value)}
            placeholder="Select type"
            label=""
            loading={hierarchicalLoading}
            onSearch={handleHierarchicalSearch}
            searchable={false}
            onLoadMore={handleHierarchicalLoadMore}
            hasMore={hierarchicalHasMore}
          />
        </div>

        {(formData.hierarchicalType.toLowerCase().includes('sub agreement') || formData.hierarchicalType.toLowerCase().includes('subagreement')) && (
          <div className="form-group">
            <label className={errors.parentAgreement ? 'label-error' : ''}>Parent Agreement</label>
            <div className="searchable-select" ref={parentDropdownRef}>
              <input
                type="text"
                className="input-field"
                placeholder="Search or enter parent agreement"
                value={formData.parentAgreement}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, parentAgreement: val }));
                  setErrors(prev => ({ ...prev, parentAgreement: false }));
                  handleParentSearch(val);
                  setIsParentDropdownOpen(true);
                }}
                onFocus={() => {
                   if (parentOptions.length === 0) fetchParentList(0, '', true);
                   setIsParentDropdownOpen(true);
                }}
              />
              {isParentDropdownOpen && parentOptions.length > 0 && (
                <div className="select-dropdown" style={{ display: 'block', position: 'absolute', width: '100%', zIndex: 1000 }}>
                  <div className="select-options" style={{ maxHeight: '200px', overflowY: 'auto' }} onScroll={(e) => {
                    const el = e.currentTarget;
                    if (el.scrollHeight - el.scrollTop - el.clientHeight <= 50 && parentHasMore && !parentLoading) {
                      handleParentLoadMore();
                    }
                  }}>
                    {parentOptions.map((opt, idx) => (
                      <div
                        key={idx}
                        className="select-option"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, parentAgreement: opt.contractId || opt.id || opt.name || (typeof opt === 'string' ? opt : '') }));
                          setIsParentDropdownOpen(false);
                        }}
                      >
                        {opt.contractId || opt.id || opt.name || (typeof opt === 'string' ? opt : JSON.stringify(opt))}
                      </div>
                    ))}
                    {parentLoading && <div className="select-option no-results">Loading...</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="form-group">
          <label className={errors.termType ? 'label-error' : ''}>Term Type</label>
          <SearchableSelect
            id="termType"
            name="termType"
            value={formData.termType}
            onChange={(value) => {
              setFormData(prev => ({ ...prev, termType: value }));
              setErrors(prev => ({ ...prev, termType: false }));
            }}
            options={termOptions.map(o => o.value)}
            placeholder="Select term type"
            label=""
            loading={termLoading}
            onSearch={handleTermSearch}
            searchable={false}
            onLoadMore={handleTermLoadMore}

            hasMore={termHasMore}
          />
        </div>  

        {formData.termType === 'AutoRenew' && (
          <>
            <div className="form-group">
              <label htmlFor="renewalInterval" className={errors.renewalInterval ? 'label-error' : ''}>Renewal Interval (in month)</label>
              <input
                type="number"
                id="renewalInterval"
                name="renewalInterval"
                className="input-field"
                placeholder="Enter interval in months"
                value={formData.renewalInterval}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="maxRenewals" className={errors.maxRenewals ? 'label-error' : ''}>Maximum Number of Renewals</label>
              <input
                type="number"
                id="maxRenewals"
                name="maxRenewals"
                className="input-field"
                placeholder="Enter max renewals"
                value={formData.maxRenewals}
                onChange={handleInputChange}
              />
            </div>
          </>
        )}

        <div className="form-group">
          <label className={errors.commodity ? 'label-error' : ''}>Commodity</label>
          <MultiSearchableSelect
            id="commodity"
            name="commodity"
            label="Commodity"
            placeholder="Select commodities"
            values={formData.commodity}
            options={dropdownState.commodities.map(o => ({
              label: o.name,
              value: o.id
            }))}
            onChange={(values) => {
              setFormData(prev => ({ ...prev, commodity: values }));
              setErrors(prev => ({ ...prev, commodity: false }));
            }}
            loading={dropdownState.isLoading.commodities}
            onSearch={handleCommoditySearch}
            onLoadMore={handleCommodityLoadMore}
            hasMore={dropdownState.hasMore.commodities}
          />
        </div>


        <div className="form-group">
          <label className={errors.region ? 'label-error' : ''}>Region</label>
          <MultiSearchableSelect
            id="region"
            label="Region"
            name="region"
            placeholder="Select regions"
            values={formData.region}
            options={dropdownState.regions.map(o => ({
              label: o.name,
              value: o.id
            }))}
            onChange={(values) => {
              setFormData(prev => ({ ...prev, region: values }));
              setErrors(prev => ({ ...prev, region: false }));
            }}
            loading={dropdownState.isLoading.regions}
            onSearch={handleRegionSearch}
            onLoadMore={handleRegionLoadMore}
            hasMore={dropdownState.hasMore.regions}
          />
        </div>

        <div className="form-group">
          <label className={errors.department ? 'label-error' : ''}>Department</label>
          <MultiSearchableSelect
            id="department"
            name="department"
            label="Department"
            placeholder="Select departments"
            values={formData.department}
            options={dropdownState.departments.map(o => ({
              label: o.name,
              value: o.id
            }))}
            onChange={(values) => {
              setFormData(prev => ({ ...prev, department: values }));
              setErrors(prev => ({ ...prev, department: false }));
            }}
            loading={dropdownState.isLoading.departments}
            onSearch={handleDepartmentSearch}
            onLoadMore={handleDepartmentLoadMore}
            hasMore={dropdownState.hasMore.departments}
          />
        </div>



        <div className="form-group">
          <label htmlFor="contractValue" className={errors.contractValue ? 'label-error' : ''}>Contract Value</label>
          <div className="value-currency-group">
            <input
              type="text"
              id="contractValue"
              name="contractValue"
              className={`input-field ${contractValueError ? 'input-error' : ''}`}
              placeholder="Enter value"
              value={formData.contractValue}
              onChange={handleInputChange}
            />
            <select
              name="currency"
              className="select-field"
              value={formData.currency}
              onChange={handleInputChange}
            >
              <option value="AED">AED</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          {contractValueError && <span className="field-error-message">{contractValueError}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="effectiveDate" className={errors.effectiveDate ? 'label-error' : ''}>Effective Date</label>
          <input
            type="date"
            id="effectiveDate"
            name="effectiveDate"
            className="input-field"
            value={formData.effectiveDate}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="expirationDate" className={errors.expirationDate ? 'label-error' : ''}>Expiration Date</label>
          <input
            type="date"
            id="expirationDate"
            name="expirationDate"
            className={`input-field ${dateError ? 'input-error' : ''}`}
            value={formData.expirationDate}
            onChange={handleInputChange}
          />
          {dateError && <span className="field-error-message">{dateError}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description" className={errors.description || descCharError ? 'label-error' : ''}>Description</label>
          <input
            type="text"
            id="description"
            name="description"
            className="input-field"
            placeholder="Enter description"
            value={formData.description}
            maxLength={255}
            onChange={handleInputChange}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
            <span style={{ color: formData.description.length === 255 ? '#dc3545' : '#6c757d' }}>
              {formData.description.length}/255
            </span>
            {formData.description.length === 255 && (
              <span style={{ color: '#dc3545' }}>No more characters allowed</span>
            )}
            {descCharError && formData.description.length !== 255 && (
              <span className="field-error-message">{descCharError}</span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className={errors.vendorName ? 'label-error' : ''}>Vendor Name</label>
          <SearchableSelect
            id="vendorName"
            name="vendorName"
            value={formData.vendorName}
            onChange={(value) => {
              const selected = vendorOptions.find(o => o.name === value);
              setFormData(prev => ({
                ...prev,
                vendorName: value,
                smVendorId: selected?.smVendorId || ''
              }));
              setErrors(prev => ({ ...prev, vendorName: false }));
            }}
            options={vendorOptions.map(o => o.name)}
            placeholder="Search and select vendor"
            label=""
            loading={vendorLoading}
            onSearch={handleVendorSearch}
            onLoadMore={handleVendorLoadMore}
            hasMore={vendorHasMore}
          />
        </div>


        <div className="form-group">
          <label className={errors.template ? 'label-error' : ''}>Template Type</label>
          <SearchableSelect
            id="template"
            name="template"
            value={formData.template}
            onChange={(value) => {
              setFormData(prev => ({ ...prev, template: value }));
              setErrors(prev => ({ ...prev, template: false }));
            }}
            options={contractTypeOptions.map(o => o.value)}
            placeholder="Select Contract Type"
            label=""
            loading={contractTypeLoading}
            onSearch={handleContractTypeSearch}
            searchable={false}
            onLoadMore={handleContractTypeLoadMore}
            hasMore={contractTypeHasMore}
          />
        </div>
      </div>

      <footer className="contract-form-footer">

        <button
          className="btn contract-create-btn"
          onClick={handleCreate}
          disabled={isSubmitting || !!nameCharError || !!descCharError}
        >
          {isSubmitting ? 'Creating...' : 'Create'}
        </button>

      </footer>
    </div>
  );
};

export default ContractCreate;