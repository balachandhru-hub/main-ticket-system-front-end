import React, { useState, useEffect, useRef } from 'react';
import { fetchPONumbers } from '../api/sesApi';
import { saveAutoses, fetchRecords, fetchNextSchedules, editAutoses } from '../api/autosesApi';
import type { ScheduleItem } from '../api/autosesApi';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import SpinnerLoaders from './SpinnerLoaders';
import "./AutoSes.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { createPortal } from 'react-dom';

interface LogEntry {
  id: string;
  poNumber: string;
  lineItem: number;
  startDate: string;
  durationType: string;
  serviceSheetStartDate: string;
  serviceSheetEndDate: string;
  endDate: string;
  maxAmount: number;
  sesId: string;
  resultSesId: string;
  extReference: string;
  correctionSheet: string;
  updatedTime: string;
  status: string;
  execution_time?: string;
}

const Autoses: React.FC = () => {
  // PO Selection States
  const [selectedPO, setSelectedPO] = useState<string>('');
  const [poSearchQuery, setPOSearchQuery] = useState('');
  const [poNumbers, setPoNumbers] = useState<string[]>([]);
  const [isPODropdownOpen, setIsPODropdownOpen] = useState(false);
  const [hoveredPOItem, setHoveredPOItem] = useState<string | null>(null);

  // Frequency Selection States
  const [selectedFrequency, setSelectedFrequency] = useState<string>('');
  const [customFrequencyValue, setCustomFrequencyValue] = useState('');
  const [isModifyDateEnabled, setIsModifyDateEnabled] = useState(false);
  const [isFrequencyDropdownOpen, setIsFrequencyDropdownOpen] = useState(false);
  const [hoveredFreqItem, setHoveredFreqItem] = useState<string | null>(null);
  const [isModifyButtonHovered, setIsModifyButtonHovered] = useState(false);

  // Schedule Date State
  const [scheduleDate, setScheduleDate] = useState<Date | null>(null);

  // Logging & Data States
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [hoveredTableRow, setHoveredTableRow] = useState<string | null>(null);

  // Filter States
  const [poFilter, setPoFilter] = useState("");
  const [showPoInput, setShowPoInput] = useState(false);
  const [startDateFilter, setStartDateFilter] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [endDateFilter, setEndDateFilter] = useState<Date | null>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Edit Row States
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editedRowData, setEditedRowData] = useState<LogEntry | null>(null);
  const [editRowPODropdownOpen, setEditRowPODropdownOpen] = useState(false);
  const [editRowFreqDropdownOpen, setEditRowFreqDropdownOpen] = useState(false);
  const [editRowCustomFrequency, setEditRowCustomFrequency] = useState('');
  const [editRowModifyDateEnabled, setEditRowModifyDateEnabled] = useState(false);
  const [isEditRowModifyButtonHovered, setIsEditRowModifyButtonHovered] = useState(false);

  // Delete Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetLog, setDeleteTargetLog] = useState<LogEntry | null>(null);

  // Loading States
  const [poLoader, setPoLoader] = useState<boolean>(false);
  const [sesLoader, setSesLoader] = useState<boolean>(false);
  const [middleLoader, setMiddleLoader] = useState<boolean>(false);
  const [tableLoader, setTableLoader] = useState<boolean>(false);
  const [refreshLogsToggle, setRefreshLogsToggle] = useState<boolean>(false);
  const [isRunButtonHovered, setIsRunButtonHovered] = useState(false);

  // Refs
  const poDropdownRef = useRef<HTMLDivElement>(null);
  const frequencyDropdownRef = useRef<HTMLDivElement>(null);
  const poHeaderRef = useRef<HTMLTableHeaderCellElement>(null);
  const poFilterDropdownRef = useRef<HTMLDivElement>(null);
  const startDateHeaderRef = useRef<HTMLTableHeaderCellElement>(null);
  const startDatePickerRef = useRef<HTMLDivElement>(null);
  const endDateHeaderRef = useRef<HTMLTableHeaderCellElement>(null);
  const endDatePickerRef = useRef<HTMLDivElement>(null);
  const editRowPODropdownRef = useRef<HTMLDivElement>(null);
  const editRowFreqDropdownRef = useRef<HTMLDivElement>(null);
const editRowFreqButtonRef = useRef<HTMLButtonElement>(null); 
  const navigate = useNavigate();

  const frequencyOptions = [
    { value: 'Weekly', label: 'Weekly', disabled: false },
    { value: 'Monthly', label: 'Monthly', disabled: false },
    { value: '3 Months', label: '3 Months', disabled: true },
    { value: '6 Months', label: '6 Months', disabled: true },
    { value: '9 Months', label: '9 Months', disabled: true },
    { value: 'Yearly', label: 'Yearly', disabled: false }
  ];

  // ============= FILTERED DATA =============
  const filteredPONumbers = poNumbers?.filter(po =>
    po?.toLowerCase()?.includes(poSearchQuery?.toLowerCase())
  );

  const filteredPoList = poNumbers?.filter(po =>
    po?.toLowerCase()?.includes(poFilter?.toLowerCase())
  );
 const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
const filteredLogs = logs.filter(log => {
  if (poFilter && !log.poNumber.toLowerCase().includes(poFilter.toLowerCase())) {
    return false;
  }
  if (startDateFilter) {
    const logDate = log.serviceSheetStartDate;
    if (!logDate || logDate === '-') return false;
    
    // Compare date strings directly
    const filterDateStr = formatDate(startDateFilter);
    if (logDate !== filterDateStr) {
      return false;
    }
  }
  if (endDateFilter) {
    const logDate = log.serviceSheetEndDate;
    if (!logDate || logDate === '-') return false;
    
    // Compare date strings directly
    const filterDateStr = formatDate(endDateFilter);
    if (logDate !== filterDateStr) {
      return false;
    }
  }
  return true;
});

  // ============= HELPER FUNCTIONS =============
  const getFrequencyDisplayValue = () => {
    if (!selectedFrequency) return 'Select Frequency';
    if (isModifyDateEnabled && customFrequencyValue) {
      return `${customFrequencyValue} ${selectedFrequency}`;
    }
    return selectedFrequency;
  };

 const getEditRowFrequencyDisplayValue = (durationType: string) => {
  if (!durationType || durationType === '-') return 'Select Frequency';
  
  // If modify date is enabled and we have custom frequency, show it
  if (editRowModifyDateEnabled && editRowCustomFrequency && editedRowData) {
    return `${editRowCustomFrequency} ${editedRowData.durationType}`;
  }
  
  // Otherwise show the durationType as-is
  return durationType;
};


  const getAvailableFrequencies = () => {
    return isModifyDateEnabled 
      ? frequencyOptions?.filter(opt => !opt?.disabled) 
      : frequencyOptions;
  };

  const getEditRowAvailableFrequencies = () => {
    return editRowModifyDateEnabled 
      ? frequencyOptions?.filter(opt => !opt?.disabled) 
      : frequencyOptions;
  };

  // const parseDate = (dateStr: string): Date | null => {
  //   if (!dateStr || dateStr === '-') return null;
  //   const parts = dateStr.split(' ')[0];
  //   const date = new Date(parts);
  //   return isNaN(date.getTime()) ? null : date;
  // };

  // const isSameDate = (date1: Date | null, date2: Date | null): boolean => {
  //   if (!date1 || !date2) return false;
  //   const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  //   const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  //   return d1.getTime() === d2.getTime();
  // };

 

  // ============= EVENT HANDLERS =============
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        poHeaderRef.current?.contains(target) ||
        startDateHeaderRef.current?.contains(target) ||
        endDateHeaderRef.current?.contains(target)
      ) {
        return;
      }

      if (showPoInput && poFilterDropdownRef.current && !poFilterDropdownRef.current.contains(target)) {
        setShowPoInput(false);
      }
      if (showStartDatePicker && startDatePickerRef.current && !startDatePickerRef.current.contains(target)) {
        setShowStartDatePicker(false);
      }
      if (showEndDatePicker && endDatePickerRef.current && !endDatePickerRef.current.contains(target)) {
        setShowEndDatePicker(false);
      }
      if (isPODropdownOpen && poDropdownRef.current && !poDropdownRef.current.contains(target)) {
        setIsPODropdownOpen(false);
      }
      if (isFrequencyDropdownOpen && frequencyDropdownRef.current && !frequencyDropdownRef.current.contains(target)) {
        setIsFrequencyDropdownOpen(false);
      }
      if (editRowPODropdownOpen && editRowPODropdownRef.current && !editRowPODropdownRef.current.contains(target)) {
        setEditRowPODropdownOpen(false);
      }
      if (editRowFreqDropdownOpen && editRowFreqDropdownRef.current && !editRowFreqDropdownRef.current.contains(target)) {
        setEditRowFreqDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPoInput, showStartDatePicker, showEndDatePicker, isPODropdownOpen, isFrequencyDropdownOpen, editRowPODropdownOpen, editRowFreqDropdownOpen]);

  // ============= DATA FETCHING =============
  useEffect(() => {
    const fetchPoData = async () => {
      setPoLoader(true);
      try {
        const data = await fetchPONumbers();
        setPoNumbers(data || []);
      } catch (error: any) {
        toast.error(error.message || "Error fetching PO Numbers");
        if (error.response?.status === 401) {
          navigate("/");
        }
      } finally {
        setPoLoader(false);
      }
    };
    fetchPoData();
  }, []);

  useEffect(() => {
    if (!refreshLogsToggle) {
      setMiddleLoader(true);
      const getSchedules = async () => {
        try {
          const data = await fetchNextSchedules();
          if (Array.isArray(data)) {
            setSchedules(data);
          }
        } catch (error: any) {
          if (error.status === 401) {
            toast.error("Unauthorized Access");
            navigate("/");
          }
          toast.error(error.message || "Failed to fetch schedules");
        } finally {
          setMiddleLoader(false);
        }
      };
      getSchedules();
    }
  }, [refreshLogsToggle]);

  useEffect(() => {
    if (!refreshLogsToggle) {
      setTableLoader(true);
      const getLogs = async () => {
        try {
          const records = await fetchRecords();

          if (!Array.isArray(records)) {
            if (records.statusCode === 401) {
              toast.error("Unauthorized Access");
              navigate("/");
              return;
            }
            toast.error(records.message || "Failed to fetch logs");
            return;
          }

          const mappedLogs: LogEntry[] = records.map((record) => ({
            id: record.id.toString(),
            poNumber: record?.purchase_order_id,
            lineItem: record?.line_item,
            startDate: record?.start_date ? record.start_date?.split('T')[0] : '-',
            durationType: record?.duration_type || '-',
            serviceSheetStartDate: record?.service_start_date ? record.service_start_date?.split('T')[0] : '-',
            serviceSheetEndDate: record?.service_end_date ? record.service_end_date?.split('T')[0] : '-',
            endDate: record?.service_end_date ? record.service_end_date?.replace('T', ' ') : '-',
            maxAmount: record?.service_max_amount || 0,
            sesId: record?.service_sheet_number || '-',
            resultSesId: record?.service_sheet_number_generated || '-',
            extReference: record?.external_reference_id || '',
            correctionSheet: record?.comments || '',
            updatedTime: record?.process_datetime ? record.process_datetime?.replace('T', ' ') : '-',
            status: record?.process_status || record?.status || '',
            execution_time: record?.execution_time || '',
          }));
          setLogs(mappedLogs);
        } catch (error: any) {
          if (error.status === 401) {
            toast.error("Unauthorized Access");
            navigate("/");
          }
          toast.error(error.detail || "Error fetching logs");
        } finally {
          setTableLoader(false);
        }
      };
      getLogs();
    }
  }, [refreshLogsToggle]);

  useEffect(() => {
  if (!showStartDatePicker || !startDateHeaderRef.current) return;

  const handleScroll = () => {
    setShowStartDatePicker(false);
  };

  window.addEventListener('scroll', handleScroll, true); // Use capture phase
  return () => window.removeEventListener('scroll', handleScroll, true);
}, [showStartDatePicker]);

useEffect(() => {
  if (!showEndDatePicker || !endDateHeaderRef.current) return;

  const handleScroll = () => {
    setShowEndDatePicker(false);
  };

  window.addEventListener('scroll', handleScroll, true); // Use capture phase
  return () => window.removeEventListener('scroll', handleScroll, true);
}, [showEndDatePicker]);

  // ============= SELECTION HANDLERS =============
  const handlePOSelect = (po: string) => {
    setSelectedPO(selectedPO === po ? '' : po);
  };

  const handleFrequencySelect = (freq: string) => {
    setSelectedFrequency(selectedFrequency === freq ? '' : freq);
  };

  const handleModifyDateToggle = () => {
    const newState = !isModifyDateEnabled;
    setIsModifyDateEnabled(newState);
    if (!newState) {
      setCustomFrequencyValue('');
    } else {
      if (['3 Months', '6 Months', '9 Months'].includes(selectedFrequency)) {
        setSelectedFrequency('');
      }
    }
  };

  // ============= EDIT HANDLERS =============
  

const handleEditClick = (log: LogEntry) => {
  setEditingRowId(log.id);
  const durationType = log.durationType || '';
  const parts = durationType.trim().split(' ');

  if (parts.length > 1 && !isNaN(Number(parts[0]))) {
    const customValue = parts[0];
    let frequency = parts.slice(1).join(' ').toLowerCase();
    
    // Normalize frequency to match dropdown options
    const frequencyMap: { [key: string]: string } = {
      'weekly': 'Weekly',
      'week': 'Weekly',
      'weeks': 'Weekly',
      'monthly': 'Monthly',
      'month': 'Monthly',
      'months': 'Monthly',
      'yearly': 'Yearly',
      'year': 'Yearly',
      'years': 'Yearly'
    };
    
    frequency = frequencyMap[frequency] || frequency;
    
    setEditRowCustomFrequency(customValue);
    setEditRowModifyDateEnabled(true);
    setEditedRowData({ ...log, durationType: frequency });
  } else {
    // Handle single frequency values (Weekly, Monthly, etc.)
    // Normalize these too
    let normalizedDurationType = durationType.trim();
    const frequencyMap: { [key: string]: string } = {
      'weekly': 'Weekly',
      'monthly': 'Monthly',
      'yearly': 'Yearly',
    };
    normalizedDurationType = frequencyMap[normalizedDurationType.toLowerCase()] || normalizedDurationType;
    
    setEditedRowData({ ...log, durationType: normalizedDurationType });
    setEditRowCustomFrequency('');
    setEditRowModifyDateEnabled(false);
  }
  setEditRowPODropdownOpen(false);
  setEditRowFreqDropdownOpen(false);
};


 const handleEditRowModifyDateToggle = () => {
  const newState = !editRowModifyDateEnabled;
  setEditRowModifyDateEnabled(newState);

  if (!newState) {
    // Turning OFF modify date - combine custom frequency with duration type
    if (editRowCustomFrequency && editedRowData?.durationType) {
      const finalDurationType = `${editRowCustomFrequency} ${editedRowData.durationType}`;
      setEditedRowData({ ...editedRowData, durationType: finalDurationType });
    }
    setEditRowCustomFrequency('');
  } else {
    // Turning ON modify date
    if (editedRowData?.durationType) {
      const normalizedDurationType = editedRowData.durationType.trim().toLowerCase();
      const disabledFrequencies = ['3 months', '6 months', '9 months'];
      if (disabledFrequencies.includes(normalizedDurationType)) {
        handleFieldChange('durationType', '');
      } else {
        const parts = editedRowData.durationType.trim().split(' ');
        if (parts.length > 1 && !isNaN(Number(parts[0]))) {
          const customValue = parts[0];
          const frequency = parts.slice(1).join(' ');
          setEditRowCustomFrequency(customValue);
          setEditedRowData({ ...editedRowData, durationType: frequency });
        }
        // If it's a single frequency like "Monthly", just keep it as is
        // User can now enter a number to make it "4 Monthly"
      }
    }
  }
};

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditedRowData(null);
    setEditRowPODropdownOpen(false);
    setEditRowFreqDropdownOpen(false);
    setEditRowCustomFrequency('');
    setEditRowModifyDateEnabled(false);
  };

  const handleFieldChange = (field: keyof LogEntry, value: string | number) => {
    if (editedRowData) {
      setEditedRowData({ ...editedRowData, [field]: value });
    }
  };

const handleSaveEdit = async () => {
  if (!editedRowData) return;
  setRefreshLogsToggle(true);

  try {
    let finalDurationType = editedRowData.durationType;
    if (editRowModifyDateEnabled && editRowCustomFrequency) {
      finalDurationType = `${editRowCustomFrequency} ${editedRowData.durationType}`;
    }

    let durationTypeForDatabase = '';
    
    // Handle compound values like "4 Monthly" -> "4 months"
    const parts = finalDurationType.trim().split(' ');
    if (parts.length > 1 && !isNaN(Number(parts[0]))) {
      const number = parts[0];
      const frequency = parts.slice(1).join(' ');
      
      // ONLY convert Monthly to months when there's a number
      let dbFrequency = frequency.toLowerCase();
      if (frequency.toLowerCase() === 'monthly' || frequency.toLowerCase() === 'Monthly') {
        dbFrequency = 'months';
      }
      
      durationTypeForDatabase = `${number} ${dbFrequency}`;
    } else {
      // Handle single values - just lowercase, no other changes
      durationTypeForDatabase = finalDurationType.toLowerCase();
    }

    const updatedRow = { ...editedRowData, durationType: finalDurationType };
    setLogs(prevLogs => prevLogs.map(log => (log.id === updatedRow.id ? updatedRow : log)));

    const result = {
      purchase_order_id: updatedRow.poNumber ?? "",
      line_item: updatedRow.lineItem ?? "",
      duration_type: durationTypeForDatabase,
      start_date: updatedRow.startDate ?? "",
      start_time: "03:00",
      cancel_schedule: "false",
    };

    const response = await editAutoses(result);
    toast.success(response?.message || "Record updated successfully");
    handleCancelEdit();
  } catch (error: any) {
    if (error.status === 401) {
      toast.error("Unauthorized Access");
      navigate("/");
    }
    toast.error(error?.detail || "Error saving edited record");
  } finally {
    setRefreshLogsToggle(false);
  }
};

  // ============= DELETE HANDLERS =============
  const handleDeleteClick = (log: LogEntry) => {
    setDeleteTargetLog(log);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetLog) return;
    setRefreshLogsToggle(true);

    try {
      const payload = {
        purchase_order_id: deleteTargetLog.poNumber ?? "",
        line_item: deleteTargetLog.lineItem ?? "",
        cancel_schedule: "true",
        duration_type: deleteTargetLog.durationType?.toLowerCase() ?? "",
        start_date: deleteTargetLog.startDate ?? "",
        start_time: "03:00",
      };

      const response = await editAutoses(payload);
      toast.success(response?.message || "Record deleted successfully");
    } catch (error: any) {
      if (error.status === 401) {
        toast.error("Unauthorized Access");
        navigate("/");
      }
      toast.error(error.detail || "Failed to delete record. Please try again.");
    } finally {
      setShowDeleteModal(false);
      setDeleteTargetLog(null);
      setRefreshLogsToggle(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTargetLog(null);
  };

  // ============= SAVE HANDLERS =============
  const saveSes = async () => {
    setSesLoader(true);
    setRefreshLogsToggle(true);

    try {
      if (!selectedPO && !getFrequencyDisplayValue()) {
        toast.error("PO or Frequency not selected");
        return;
      }
      const response = await saveAutoses(selectedPO, getFrequencyDisplayValue()?.toLowerCase(), formatDate(scheduleDate));
      toast.success(response?.message);
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error("Unauthorized Access");
        navigate("/");
      }
      toast.error(error?.response?.data?.detail || "Error saving Auto SES");
    } finally {
      setSesLoader(false);
      setRefreshLogsToggle(false);
    }
  };

  // ============= FILTER HANDLERS =============
  const handleStartDateHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEndDatePicker(false);
    setShowPoInput(false);
    setShowStartDatePicker(prev => !prev);
  };

  const handleEndDateHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowStartDatePicker(false);
    setShowPoInput(false);
    setShowEndDatePicker(prev => !prev);
  };

useEffect(() => {
  if (!showPoInput || !poHeaderRef.current) return;

  const handleScroll = () => {
    setShowPoInput(false);
  };

  window.addEventListener('scroll', handleScroll, true);
  return () => window.removeEventListener('scroll', handleScroll, true);
}, [showPoInput]);

useEffect(() => {
  if (!editRowFreqDropdownOpen) return;

  const handleScroll = () => {
    setEditRowFreqDropdownOpen(false);
  };

  window.addEventListener('scroll', handleScroll, true);
  return () => window.removeEventListener('scroll', handleScroll, true);
}, [editRowFreqDropdownOpen]);
  // ============= RENDER SECTION =============
  if (poLoader) {
    return <SpinnerLoaders fullScreen={true} size="medium" text="Loading data..." />;
  }
// Helper function to get status chip styling
const getStatusChipClass = (status: string) => {
  const statusLower = status?.toLowerCase();
  switch (statusLower) {
    case 'scheduled':
      return 'ses-status-chip ses-status-scheduled';
    case 'completed':
      return 'ses-status-chip ses-status-completed';
    case 'failed':
      return 'ses-status-chip ses-status-failed';
    case 'cancelled':
      return 'ses-status-chip ses-status-cancelled';
    default:
      return 'ses-status-chip';
  }
};
  return (
    <div className="ses-container">
      <div className="ses-wrapper">
        {/* HEADER CARD */}
        <div className="auto-ses-card">
          <div className="ses-header-container">
            <h1 className="ses-title">Auto SES</h1>
          </div>

          {/* FILTER GRID */}
          <div className="ses-filter-grid">
            {/* PO Selection */}
            <div className="ses-filter-item">
              <label className="ses-label">Search PO Numbers</label>
              <div className="ses-dropdown-container" ref={poDropdownRef}>
                <button className="ses-dropdown-button" onClick={() => setIsPODropdownOpen(!isPODropdownOpen)}>
                  <span className="ses-dropdown-text">{selectedPO || 'Search PO Numbers...'}</span>
                  <svg className="ses-dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isPODropdownOpen && (
                  <div className="ses-dropdown-menu">
                    <div className="ses-search-container">
                      <input
                        type="text"
                        value={poSearchQuery}
                        onChange={(e) => setPOSearchQuery(e.target.value)}
                        placeholder="Search PO Numbers..."
                        className="ses-search-input"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <div className="ses-dropdown-select-all" onClick={() => setSelectedPO('')}>
                      <input type="checkbox" checked={false} onChange={() => {}} className="ses-checkbox-dropdown" readOnly />
                      <span>Clear Selection</span>
                    </div>

                    {filteredPONumbers.length > 0 ? (
                      filteredPONumbers.map((po) => {
                        const isDisabled = selectedPO && selectedPO !== po;
                        return (
                          <div
                            key={po}
                            className={`ses-dropdown-item-checkbox ${hoveredPOItem === po && !isDisabled ? 'ses-dropdown-item-hover' : ''} ${isDisabled ? 'ses-dropdown-item-disabled' : ''}`}
                            onClick={() => !isDisabled && handlePOSelect(po)}
                            onMouseEnter={() => setHoveredPOItem(po)}
                            onMouseLeave={() => setHoveredPOItem(null)}
                          >
                            <input type="checkbox" checked={selectedPO === po} onChange={() => {}} className="ses-checkbox-dropdown" disabled={Boolean(isDisabled)} readOnly />
                            <span className={isDisabled ? 'ses-disabled-text' : ''}>{po}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="ses-no-results">No PO numbers found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Frequency Selection */}
            <div className="ses-filter-item">
              <label className="ses-label">Frequency</label>
              <div className="ses-dropdown-container" ref={frequencyDropdownRef}>
                <button className="ses-dropdown-button" onClick={() => setIsFrequencyDropdownOpen(!isFrequencyDropdownOpen)}>
                  <span className="ses-dropdown-text">{getFrequencyDisplayValue()}</span>
                  <svg className="ses-dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isFrequencyDropdownOpen && (
                  <div className="ses-dropdown-menu">
                    <div className="ses-frequency-input-container">
                      <input
                        type="number"
                        value={customFrequencyValue}
                        onChange={(e) => setCustomFrequencyValue(e.target.value)}
                        placeholder="Enter number"
                        className={`ses-frequency-input ${!isModifyDateEnabled ? 'ses-frequency-input-disabled' : ''}`}
                        disabled={!isModifyDateEnabled}
                      />
                      <button
                        className={`ses-modify-button ${isModifyButtonHovered ? 'ses-modify-button-hover' : ''} ${isModifyDateEnabled ? 'ses-modify-button-active' : ''}`}
                        onClick={handleModifyDateToggle}
                        onMouseEnter={() => setIsModifyButtonHovered(true)}
                        onMouseLeave={() => setIsModifyButtonHovered(false)}
                      >
                        Modify Date
                      </button>
                    </div>

                    {getAvailableFrequencies().map((freqOption) => {
                      const isDisabled = (isModifyDateEnabled && freqOption.disabled) || (selectedFrequency && selectedFrequency !== freqOption.value);
                      return (
                        <div
                          key={freqOption.value}
                          className={`ses-dropdown-item-checkbox ${hoveredFreqItem === freqOption.value && !isDisabled ? 'ses-dropdown-item-hover' : ''} ${isDisabled ? 'ses-dropdown-item-disabled' : ''}`}
                          onClick={() => !isDisabled && handleFrequencySelect(freqOption.value)}
                          onMouseEnter={() => setHoveredFreqItem(freqOption.value)}
                          onMouseLeave={() => setHoveredFreqItem(null)}
                        >
                          <input type="checkbox" checked={selectedFrequency === freqOption.value} onChange={() => {}} className="ses-checkbox-dropdown" disabled={Boolean(isDisabled)} readOnly />
                          <span className={isDisabled ? 'ses-disabled-text' : ''}>{freqOption.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Schedule Date */}
            <div className="ses-filter-item">
              <label className="ses-label">Schedule Date</label>
              <DatePicker
                selected={scheduleDate}
                onChange={(date) => setScheduleDate(date)}
                dateFormat="yyyy-MM-dd"
                placeholderText="Select Date"
                minDate={new Date()}
                customInput={
                  <button className="ses-dropdown-button">
                    <span className="ses-dropdown-text">
                      {scheduleDate ? scheduleDate.toLocaleDateString('en-CA') : 'Select Date'}
                    </span>
                    <svg className="ses-dropdown-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                }
              />
            </div>

            {/* Save Button */}
            <div className="ses-button-container">
              <button
                className={`ses-run-button ${isRunButtonHovered ? 'ses-run-button-hover' : ''} ${sesLoader ? 'ses-run-button-disabled' : ''}`}
                onMouseEnter={() => setIsRunButtonHovered(true)}
                onMouseLeave={() => setIsRunButtonHovered(false)}
                onClick={saveSes}
                disabled={sesLoader}
              >
                {sesLoader ? "Saving..." : "SAVE AUTO SES"}
              </button>
            </div>
          </div>
        </div>

        {/* SCHEDULES TABLE */}
        <div className="ses-table-card">
          <div className="ses-table-header">
            <h2 className="ses-table-title">Next 10 Schedules</h2>
          </div>
          <div className="ses-table-wrapper">
            <table className="ses-table">
              <thead className="ses-thead">
                <tr>
                  <th className="ses-th">PO NUMBER</th>
                  <th className="ses-th">START DATE</th>
                  <th className="ses-th">DURATION TYPE</th>
                  <th className="ses-th">NEXT EXECUTION TIME</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="ses-td" style={{ textAlign: 'center' }}>No schedules found</td>
                  </tr>
                ) : refreshLogsToggle || middleLoader || tableLoader ? (
                  <tr>
                    <td className="ses-td" colSpan={4}>
                      <SpinnerLoaders fullScreen={false} size="medium" text="Loading data..." />
                    </td>
                  </tr>
                ) : (
                  schedules?.map((schedule, index) => (
                    <tr key={index} className="ses-tr">
                      <td className="ses-td">{schedule?.purchase_order_id}</td>
                      <td className="ses-td-gray-next-10">{schedule?.start_date ? schedule?.start_date.replace('T', ' ') : '-'}</td>
                      <td className="ses-td-gray-next-10">{schedule?.duration_type}</td>
                      <td className="ses-td-gray-next-10">{schedule?.next_execution_time ? schedule?.next_execution_time.replace('T', ' ') : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* LOGS TABLE */}
        <div className="ses-table-card">
          <div className="ses-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="ses-table-title">
              Previous Logs
              {(poFilter || startDateFilter || endDateFilter) && (
                <span className="ses-table-title-with-count">
                  ({filteredLogs.length} of {logs.length} records)
                </span>
              )}
            </h2>
          </div>
          <div className="ses-table-wrapper">
            <table className="ses-table">
              <thead className="ses-thead">
                <tr>
                  <th
                    ref={poHeaderRef}
                    className="ses-th ses-table-filter-header"
                    onClick={() => setShowPoInput(prev => !prev)}
                    title='PO NUMBER'
                  >
                    PO NUMBER {poFilter && <span className="ses-active-filter-indicator">●</span>}
                  </th>
                  <th className="ses-th" title='LINE ITEM'>LINE ITEM</th>
                  <th className="ses-th" title='START DATE'>START DATE</th>
                  <th className="ses-th" title='DURATION TYPE'>DURATION TYPE</th>
                  <th
                    ref={startDateHeaderRef}
                    className="ses-th ses-table-filter-header"
                    onClick={handleStartDateHeaderClick}
                    title='SERVICE SHEET START DATE'
                  >
                    SERVICE SHEET START DATE {startDateFilter && <span className="ses-active-filter-indicator">({startDateFilter.toLocaleDateString()})</span>}
                  </th>
                  <th
                    ref={endDateHeaderRef}
                    className="ses-th ses-table-filter-header"
                    onClick={handleEndDateHeaderClick}
                      title='SERVICE SHEET END DATE'
                  >
                    SERVICE SHEET END DATE {endDateFilter && <span className="ses-active-filter-indicator">({endDateFilter.toLocaleDateString()})</span>}
                  </th>
                  <th className="ses-th" title='MAX AMOUNT'>MAX AMOUNT</th>
                  <th className="ses-th" title='SES ID'>SES ID</th>
                  <th className="ses-th" title='RESULT SES ID'>RESULT SES ID</th>
                  <th className="ses-th" title='EXT. REFERENCE NO.'>EXT. REFERENCE NO.</th>
                  <th className="ses-th" title='CORRECTION SHEET COMMENT'>CORRECTION SHEET COMMENT</th>
                  <th className="ses-th" title='UPDATED TIME'>UPDATED TIME</th>
                  <th className="ses-th" title='EXECUTION TIME'>EXECUTION TIME</th>
                  <th className="ses-th" title='STATUS'>STATUS</th>
                  <th className="ses-th" title='ACTIONS'>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {refreshLogsToggle || middleLoader || tableLoader ? (
                  <tr>
                    <td className="ses-td" colSpan={15}>
                      <SpinnerLoaders fullScreen={false} size="medium" text="Loading data..." />
                    </td>
                  </tr>
                ) : filteredLogs && filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="ses-td" style={{ textAlign: 'center' }}>No data found</td>
                  </tr>
                ) : (
                  filteredLogs?.map((log) => {
                    const isEditing = editingRowId === log.id;
                    const displayLog = isEditing ? editedRowData : log;

                    return (
                      <tr
                        key={log.id}
                        className={`ses-tr ${hoveredTableRow === log.id ? 'ses-tr-hover' : ''}`}
                        onMouseEnter={() => setHoveredTableRow(log.id)}
                        onMouseLeave={() => setHoveredTableRow(null)}
                        style={{ position: 'relative'}}
                      >
<td className="ses-td" title={log?.poNumber}>
  {log?.poNumber}
</td>

                        {/* Line Item Cell */}
                        <td className="ses-td" title={log?.lineItem?.toString()}>{log?.lineItem}</td>

                        {/* Start Date Cell */}
                        <td className="ses-td" title={log?.startDate}>
                          {isEditing ? (
                            <DatePicker
                              selected={displayLog?.startDate && displayLog.startDate !== '-' ? new Date(displayLog.startDate) : null}
                              onChange={(date) => handleFieldChange('startDate', date ? formatDate(date) : '-')}
                              dateFormat="yyyy-MM-dd"
                              placeholderText="Select Date"
                              minDate={new Date()}
                              customInput={
                                <button className="ses-dropdown-button ses-edit-dropdown-button" style={{ width: '100%' }}>
                                  <span className="ses-dropdown-text">
                                    {displayLog?.startDate && displayLog.startDate !== '-' ? displayLog.startDate : 'Select Date'}
                                  </span>
                                  <svg className="ses-dropdown-icon" style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              }
                            />
                          ) : (
                            log?.startDate
                          )}
                        </td>

                        {/* Duration Type Cell */}
                        {/* Duration Type Cell */}
{/* Duration Type Cell */}
<td className="ses-td" title={log?.durationType} style={{ position: 'relative', overflow: 'visible', minWidth: '180px' }}>
  {isEditing ? (
    <div className="ses-dropdown-container" style={{ position: 'relative' }}>
      <button
        ref={editRowFreqButtonRef}
        className="ses-dropdown-button ses-edit-dropdown-button"
        onClick={(e) => {
          e.stopPropagation();
          setEditRowFreqDropdownOpen(!editRowFreqDropdownOpen);
          setEditRowPODropdownOpen(false);
        }}
      >
        <span className="ses-dropdown-text">
          {displayLog?.durationType ? getEditRowFrequencyDisplayValue(displayLog.durationType) : 'Select Frequency'}
        </span>
        <svg className="ses-dropdown-icon" style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {editRowFreqDropdownOpen && editRowFreqButtonRef.current && (() => {
        const buttonRect = editRowFreqButtonRef.current.getBoundingClientRect();
        const dropdownHeight = 350; // Approximate height of dropdown
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

        return createPortal(
          <div 
            ref={editRowFreqDropdownRef}
            className="ses-dropdown-menu ses-edit-dropdown-menu"
            style={{
              position: 'fixed',
              top: shouldOpenUpward ? 'auto' : `${buttonRect.bottom + 4}px`,
              bottom: shouldOpenUpward ? `${window.innerHeight - buttonRect.top + 4}px` : 'auto',
              left: `${buttonRect.left}px`,
              width: `${buttonRect.width}px`,
              zIndex: 10002,
              maxHeight: shouldOpenUpward 
                ? `${Math.min(spaceAbove - 20, 400)}px` 
                : `${Math.min(spaceBelow - 20, 400)}px`,
              overflowY: 'auto',
            }}
          >
            <div className="ses-frequency-input-container">
              <input
                type="number"
                value={editRowCustomFrequency}
                onChange={(e) => setEditRowCustomFrequency(e.target.value)}
                placeholder="Enter number"
                className={`ses-frequency-input ses-edit-frequency-input ${!editRowModifyDateEnabled ? 'ses-frequency-input-disabled' : ''}`}
                disabled={!editRowModifyDateEnabled}
              />
              <button
                className={`ses-modify-button ses-edit-modify-button ${isEditRowModifyButtonHovered ? 'ses-modify-button-hover' : ''} ${editRowModifyDateEnabled ? 'ses-modify-button-active' : ''}`}
                onClick={handleEditRowModifyDateToggle}
                onMouseEnter={() => setIsEditRowModifyButtonHovered(true)}
                onMouseLeave={() => setIsEditRowModifyButtonHovered(false)}
              >
                Modify Date
              </button>
            </div>

            {getEditRowAvailableFrequencies().map((freqOption) => {
              const normalizedDurationType = displayLog?.durationType?.toLowerCase() || '';
              const normalizedFreqValue = freqOption.value.toLowerCase();
              const isSelected = normalizedDurationType === normalizedFreqValue;
              const isDisabled = displayLog?.durationType && !isSelected;

              return (
                <div
                  key={freqOption.value}
                  className={`ses-dropdown-item-checkbox ${isDisabled ? 'ses-dropdown-item-disabled' : ''}`}
                  onClick={() => {
                    if (!isDisabled) {
                      handleFieldChange('durationType', isSelected ? '' : freqOption.value.toLowerCase());
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="ses-checkbox-dropdown"
                    disabled={Boolean(isDisabled)}
                    readOnly
                  />
                  <span className={isDisabled ? 'ses-disabled-text' : ''}>{freqOption.label}</span>
                </div>
              );
            })}
          </div>,
          document.body
        );
      })()}
    </div>
  ) : (
    log?.durationType
  )}
</td>

                      
                        <td className="ses-td-gray" title={log?.serviceSheetStartDate}>{log?.serviceSheetStartDate}</td>

                       
                        <td className="ses-td-gray" title={log?.serviceSheetEndDate}>{log?.serviceSheetEndDate}</td>

                       
                        <td className="ses-td" title={log?.maxAmount?.toFixed(2)}>{log?.maxAmount?.toFixed(2)}</td>

                        <td className="ses-td" title={log?.sesId}>{log?.sesId}</td>

                       
                        <td className="ses-td" title={log?.resultSesId}><span className="ses-badge">{log?.resultSesId}</span></td>

                      
                        <td className="ses-td-gray" title={log?.extReference || '-'}>{log?.extReference || '-'}</td>

                      
                        <td className="ses-td-gray" title={log?.correctionSheet}>{log?.correctionSheet}</td>

                       
                        <td className="ses-td-gray" title={log?.updatedTime}>{log?.updatedTime}</td>

                       
                        <td className="ses-td-gray" title={log?.execution_time}>{log?.execution_time}</td>
                       
                        <td className="ses-td" title={log?.status || 'N/A'}>
                          <span className={getStatusChipClass(log?.status)}>
                            {log?.status || 'N/A'}
                          </span>
                        </td>
                        
                        {/* Actions */}
                        <td className="ses-td" style={{ textAlign: 'center' }}>
                          <div className="ses-action-button-container">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={handleSaveEdit}
                                  className="ses-icon-button ses-icon-button-save"
                                  title="Save"
                                >
                                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="ses-icon-button ses-icon-button-cancel"
                                  title="Cancel"
                                >
                                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                                <button
                                  disabled
                                  className="ses-icon-button ses-icon-button-disabled"
                                  title="Delete (disabled during edit)"
                                >
                                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditClick(log)}
                                  className="ses-icon-button ses-icon-button-edit"
                                  title="Edit"
                                >
                                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(log)}
                                  className="ses-icon-button ses-icon-button-delete"
                                  title="Delete"
                                >
                                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PO FILTER DROPDOWN */}
      {showPoInput && poHeaderRef?.current && (
        <div
          ref={poFilterDropdownRef}
          className="ses-po-filter-dropdown"
          style={{
            top: `${poHeaderRef?.current.getBoundingClientRect()?.bottom + 4}px`,
            left: `${poHeaderRef?.current.getBoundingClientRect()?.left}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={poFilter}
            onChange={(e) => setPoFilter(e.target.value)}
            placeholder="Search PO..."
            autoFocus
            className="ses-po-filter-input"
            onKeyDown={(e) => e.key === "Escape" && setShowPoInput(false)}
          />
          <div className="ses-po-filter-list">
            <div
              onClick={() => { setPoFilter(""); setShowPoInput(false); }}
              className={`ses-po-filter-clear ${!poFilter ? 'ses-po-filter-clear-active' : ''}`}
            >
              Clear Filter
            </div>
            {filteredPoList.length > 0 ? (
              filteredPoList.map((po) => (
                <div
                  key={po}
                  onClick={() => { setPoFilter(po); setShowPoInput(false); }}
                  className={`ses-po-filter-item ${po === poFilter ? 'ses-po-filter-item-active' : ''}`}
                >
                  {po}
                </div>
              ))
            ) : (
              <div className="ses-po-filter-no-results">No PO found</div>
            )}
          </div>
        </div>
      )}

{showStartDatePicker && startDateHeaderRef.current && (() => {
  const headerRect = startDateHeaderRef.current.getBoundingClientRect();
  const pickerHeight = 400; // Approximate height of date picker
  const spaceBelow = window.innerHeight - headerRect.bottom;
  const spaceAbove = headerRect.top;
  const shouldOpenUpward = spaceBelow < pickerHeight && spaceAbove > spaceBelow;

  return (
    <div
      ref={startDatePickerRef}
      style={{
        position: 'fixed',
        background: 'white',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        zIndex: 10001,
        padding: '16px',
        minWidth: '320px',
        left: `${headerRect.left}px`,
        top: shouldOpenUpward ? 'auto' : `${headerRect.bottom + 8}px`,
        bottom: shouldOpenUpward ? `${window.innerHeight - headerRect.top + 8}px` : 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => { 
          setStartDateFilter(null); 
          setShowStartDatePicker(false); 
        }}
        style={{
          padding: '8px 16px',
          fontSize: '13px',
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '500',
          marginBottom: '12px',
          width: '100%',
        }}
      >
        Clear Filter
      </button>
      <div style={{ fontSize: '16px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <DatePicker
          selected={startDateFilter}
          onChange={(date) => {
            setStartDateFilter(date);
            setShowStartDatePicker(false);
          }}
          inline
          dateFormat="yyyy-MM-dd"
          calendarClassName="custom-calendar"
        />
      </div>
    </div>
  );
})()}

{showEndDatePicker && endDateHeaderRef.current && (() => {
  const headerRect = endDateHeaderRef.current.getBoundingClientRect();
  const pickerHeight = 400; // Approximate height of date picker
  const spaceBelow = window.innerHeight - headerRect.bottom;
  const spaceAbove = headerRect.top;
  const shouldOpenUpward = spaceBelow < pickerHeight && spaceAbove > spaceBelow;

  return (
    <div
      ref={endDatePickerRef}
      style={{
        position: 'fixed',
        background: 'white',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        zIndex: 10001,
        padding: '16px',
        minWidth: '320px',
        left: `${headerRect.left}px`,
        top: shouldOpenUpward ? 'auto' : `${headerRect.bottom + 8}px`,
        bottom: shouldOpenUpward ? `${window.innerHeight - headerRect.top + 8}px` : 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => { 
          setEndDateFilter(null); 
          setShowEndDatePicker(false); 
        }}
        style={{
          padding: '8px 16px',
          fontSize: '13px',
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '500',
          marginBottom: '12px',
          width: '100%',
        }}
      >
        Clear Filter
      </button>
      <div style={{ fontSize: '16px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <DatePicker
          selected={endDateFilter}
          onChange={(date) => {
            setEndDateFilter(date);
            setShowEndDatePicker(false);
          }}
          inline
          dateFormat="yyyy-MM-dd"
          calendarClassName="custom-calendar"
        />
      </div>
    </div>
  );
})()}
      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && deleteTargetLog && (
        <div className="ses-delete-modal-overlay" onClick={handleCancelDelete}>
          <div className="ses-delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ses-delete-modal-header">
              <div className="ses-delete-modal-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="ses-delete-modal-title">Delete Record</h3>
            </div>

            <p className="ses-delete-modal-description">
              Are you sure you want to delete this record? This action cannot be undone.
            </p>

            <div className="ses-delete-modal-details">
              <div className="ses-delete-modal-detail-row">
                <span className="ses-delete-modal-detail-label">PO Number:</span>
                <span className="ses-delete-modal-detail-value">{deleteTargetLog.poNumber}</span>
              </div>
              <div className="ses-delete-modal-detail-row">
                <span className="ses-delete-modal-detail-label">Line Item:</span>
                <span className="ses-delete-modal-detail-value">{deleteTargetLog.lineItem}</span>
              </div>
              <div className="ses-delete-modal-detail-row">
                <span className="ses-delete-modal-detail-label">Duration Type:</span>
                <span className="ses-delete-modal-detail-value">{deleteTargetLog.durationType}</span>
              </div>
            </div>

            <div className="ses-delete-modal-actions">
              <button
                onClick={handleCancelDelete}
                className="ses-delete-modal-button ses-delete-modal-button-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="ses-delete-modal-button ses-delete-modal-button-confirm"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Autoses;