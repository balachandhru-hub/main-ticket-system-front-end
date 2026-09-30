import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  getRecieptByOrderId,
  getPurchaseOrderDetails,
  getPurchaseOrderIds,
  createPurchaseOrderAriba,
  instanceOfPoUploadExcel,
  createNewPurchaseOrderApi,
  instanceOfPoMasterUploadExcel,
} from "../api/PurchaseOrderApi";
import {
  getBlockUnblockPOs,
  updateBlockUnblockPOs,
} from "../api/blockApi";
import type { PurchaseOrderDto } from "../Dto/BlockDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";
import type { PurchaseOrderDetailsRequestDto } from "../Dto/PurchaseOrderDetailsRequestDto";
import type { PurchaseOrderDetailDto } from "../Dto/PurchaseOrderDetailDto";
import type { PurchaseOrderLineItemDto } from "../Dto/PurchaseOrderLineItemDto";
import { toast } from "react-toastify";
import ErrorModel from "./ErrorModel";
import { useNavigate, useBeforeUnload } from "react-router-dom";
import type {
  createPurchaseOrderDto,
  lineItemDto,
} from "../Dto/CreatePurchaseOrderDto";
import type { SuccessResponseDto } from "../Dto/SuccessResponseDto";
import DropdownWithAction from "./DropdownWithAction";
import { useAuth } from "./context/AuthContext";
import { USER_ROLES } from "../common/common";
import ViewButton from "./ViewButton";
import NotificationModal from "./NotificationModal";
import './POManagement.css'
import type { CreateNewPurchaseOrderDto } from "../Dto/CreateNewPurchaseOrderDto";
import { downloadBlockedPurchaseOrders, uploadBlockUnblockExcel } from "../api/BlockPOApi";

type FileUploadType = 'po' | 'poMaster' | 'blockUnblock';

interface FileUploadConfig {
  type: FileUploadType;
  label: string;
  endpoint?: string;
}

interface NotificationMessage {
  success?: string;
  errors?: string[];
}
interface EditableValues {
  [key: string]: {
    accepted: string;
  };
}

interface ValidationErrors {
  [key: string]: {
    accepted?: string;
  };
}
const statusOptions = {
  Partial: 0,
  Completed: 1,
  Fully: 3,
};
type Row = {
  purchaseOrderId: string;
  lineItem: string;
  unitOfMeasure: string;
  materialCode: string;
  quantity: number;
  previousAcceptedQuantity: number;
  erpReceiptId: string;
  epId: string;
};

type Column = {
  key: keyof Row;
  label: string;
  type: "text" | "number";
};

const columns: Column[] = [
  { key: "purchaseOrderId", label: "Order Id", type: "text" },
  { key: "lineItem", label: "Line Item", type: "text" },
  { key: "epId", label: "EPID", type: "text" },
  { key: "unitOfMeasure", label: "Unit", type: "text" },
  { key: "materialCode", label: "Material", type: "text" },
  { key: "quantity", label: "Quantity", type: "number" },
  { key: "previousAcceptedQuantity", label: "Accepted Prev", type: "number" },
  { key: "erpReceiptId", label: "Receipt Id", type: "text" },
];

const emptyRow: Row = {
  purchaseOrderId: "",
  lineItem: "",
  unitOfMeasure: "",
  materialCode: "",
  quantity: 0,
  previousAcceptedQuantity: 0,
  erpReceiptId: "",
  epId: ""
};

const POManagement: React.FC = () => {
  const [poDetailsData, setPODetailsData] = useState<PurchaseOrderDetailDto[]>(
    []
  );
  const [selectedSearchTerms, setSelectedSearchTerms] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [editableValues, setEditableValues] = useState<EditableValues>({});
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [rows, setRows] = useState<Row[]>([emptyRow]);
  const [allPONumbers, setAllPONumbers] = useState<string[]>([]);
  const [isOpenDomain, setIsOpenDomain] = useState<boolean>(false);
  const [currentPOIndex, setCurrentPOIndex] = useState<number>(0);
  const [isLoadingPOs, setIsLoadingPOs] = useState<boolean>(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [isLoadingRCTData, setIsLoadingRCTData] = useState<boolean>(false);
  const [getListPosStatus, setGetListPosStatus] = useState<boolean>(true);
  const [selectedRows, setSelectedRows] = useState<
    { item: PurchaseOrderLineItemDto; purchaseOrderId: string }[]
  >([]);

  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    show: boolean;
    action: "post" | "reverse" | null;
    isReversible: boolean;
  }>({ show: false, action: null, isReversible: false });

  const navigate = useNavigate();
  const [blockedData, setBlockedData] = useState<PurchaseOrderDto[]>([]);
  const [unblockedData, setUnblockedData] = useState<PurchaseOrderDto[]>([]);
  const [_loading, setLoading] = useState(false);
  // New states for receipt dropdown
  const [reprocessedItems, setReprocessedItems] = useState<Set<string>>(
    new Set()
  );

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [receiptIds, setReceiptIds] = useState<string[]>([]);
  const [isReceiptDropdownOpen, setIsReceiptDropdownOpen] =
    useState<boolean>(false);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState<boolean>(false);
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([]);
  const [addModalErrors, setAddModalErrors] = useState<{ [key: number]: { [field: string]: string } }>({});
  const [currentPONumber, setCurrentPONumber] = useState<string>("");

  // New states for unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState<boolean>(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const initialStateRef = useRef<{
    selectedSearchTerms: string[];
    selectedReceiptIds: string[];
    selectedDate: string;
    editableValues: EditableValues;
    selectedRows: { item: PurchaseOrderLineItemDto; purchaseOrderId: string }[];
    selectedStatus: number;
    isFirst50Selected: boolean;
  } | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchTermRef = useRef<string>("");
  const isInitialLoadRef = useRef<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<number>(0);
  const [isFirst50Selected, setIsFirst50Selected] = useState<boolean>(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState<"success" | "error">(
    "success"
  );
  const [notificationMessage, setNotificationMessage] = useState<
    string | string[] | NotificationMessage
  >("");
  const auth = useAuth();
  const domainId = auth?.auth?.domainId || "";

  // Track changes in form state and sync to window.hasUnsavedChanges
  useEffect(() => {
    if (!initialStateRef.current) {
      // Set initial state on first render
      initialStateRef.current = {
        selectedSearchTerms: [],
        selectedReceiptIds: [],
        selectedDate: new Date().toISOString().slice(0, 10),
        editableValues: {},
        selectedRows: [],
        selectedStatus: 0,
        isFirst50Selected: false,
      };
      return;
    }

    // Check if current state differs from initial state
    const currentState = {
      selectedSearchTerms,
      selectedReceiptIds,
      selectedDate,
      editableValues,
      selectedRows,
      selectedStatus,
      isFirst50Selected,
    };

    const hasChanges = (
      JSON.stringify(currentState.selectedSearchTerms) !== JSON.stringify(initialStateRef.current.selectedSearchTerms) ||
      JSON.stringify(currentState.selectedReceiptIds) !== JSON.stringify(initialStateRef.current.selectedReceiptIds) ||
      currentState.selectedDate !== initialStateRef.current.selectedDate ||
      JSON.stringify(currentState.editableValues) !== JSON.stringify(initialStateRef.current.editableValues) ||
      JSON.stringify(currentState.selectedRows) !== JSON.stringify(initialStateRef.current.selectedRows) ||
      currentState.selectedStatus !== initialStateRef.current.selectedStatus ||
      currentState.isFirst50Selected !== initialStateRef.current.isFirst50Selected
    );

    setHasUnsavedChanges(hasChanges);
    window.hasUnsavedChanges = hasChanges;
  }, [selectedSearchTerms, selectedReceiptIds, selectedDate, editableValues, selectedRows, selectedStatus, isFirst50Selected]);

  // Browser beforeunload event handler
  useBeforeUnload(
    React.useCallback(
      (event) => {
        if (hasUnsavedChanges) {
          event.preventDefault();
          return (event.returnValue = "You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost.");
        }
      },
      [hasUnsavedChanges]
    )
  );

  // Custom navigation blocker (for React Router navigation)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        window.history.pushState(null, "", window.location.href);
        setShowUnsavedChangesModal(true);
        setPendingNavigation(() => () => {
          window.history.back();
        });
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener('popstate', handlePopState);
      // Push current state to prevent immediate back navigation
      window.history.pushState(null, "", window.location.href);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges]);

  // Reset unsaved changes after successful operations
  const resetUnsavedChanges = useCallback(() => {
    setHasUnsavedChanges(false);
    initialStateRef.current = {
      selectedSearchTerms,
      selectedReceiptIds,
      selectedDate,
      editableValues,
      selectedRows,
      selectedStatus,
      isFirst50Selected,
    };
  }, [selectedSearchTerms, selectedReceiptIds, selectedDate, editableValues, selectedRows, selectedStatus, isFirst50Selected]);

  // Handle unsaved changes confirmation
  const handleUnsavedChangesConfirm = () => {
    setShowUnsavedChangesModal(false);
    setHasUnsavedChanges(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleUnsavedChangesCancel = () => {
    setShowUnsavedChangesModal(false);
    setPendingNavigation(null);
  };

  function isErrorResponse(response: any): response is ErrorResponseDto {
    return response && "message" in response && "description" in response;
  }

  const openModal = () => setIsOpen(true);
  const closeModal = () => {
    setIsOpen(false);
    setRows([{ ...emptyRow }]);
    setCurrentPONumber("");
    setAddModalErrors({});
  };

  function isSuccess(response: SuccessResponseDto | ErrorResponseDto): response is SuccessResponseDto {
    return 'id' in response;
  }

  // Enhanced handleChange function with validation
  const handleChange = (
    rowIndex: number,
    key: keyof Row,
    value: string | number
  ) => {
    const updatedRows = [...rows];

    // Handle PO number logic
    if (key === 'purchaseOrderId') {
      const stringValue = value as string;

      // If this is the first row or no current PO is set, allow the change
      if (rowIndex === 0 || !currentPONumber) {
        updatedRows[rowIndex] = { ...updatedRows[rowIndex], [key]: stringValue };
        // Update current PO number if this is the first row
        if (rowIndex === 0) {
          setCurrentPONumber(stringValue);
        }
      } else {
        // For other rows, enforce the same PO rule
        if (stringValue !== currentPONumber) {
          // Show a warning but don't prevent the change immediately
          // Instead, set it to the current PO number
          updatedRows[rowIndex] = { ...updatedRows[rowIndex], [key]: currentPONumber };
        } else {
          updatedRows[rowIndex] = { ...updatedRows[rowIndex], [key]: stringValue };
        }
      }
    } else {
      // For all other fields, update normally
      updatedRows[rowIndex] = { ...updatedRows[rowIndex], [key]: value };
    }

    setRows(updatedRows);

    // Validate the current row
    const errors = validateModalRow(updatedRows[rowIndex], rowIndex, updatedRows);
    setAddModalErrors(prev => ({
      ...prev,
      [rowIndex]: errors
    }));

    // Re-validate all rows to check for duplicates
    const allErrors: { [key: number]: { [field: string]: string } } = {};
    updatedRows.forEach((row, idx) => {
      const rowErrors = validateModalRow(row, idx, updatedRows);
      if (Object.keys(rowErrors).length > 0) {
        allErrors[idx] = rowErrors;
      }
    });
    setAddModalErrors(allErrors);
  };

  const removeRow = (rowIndex: number) => {
    if (rows.length === 1) {
      // Reset to empty row if it's the last one
      setRows([{ ...emptyRow }]);
      setCurrentPONumber("");
      setAddModalErrors({});
      return;
    }

    const updatedRows = rows.filter((_, idx) => idx !== rowIndex);
    setRows(updatedRows);

    // Update errors object to remove the deleted row and adjust indices
    const newErrors: { [key: number]: { [field: string]: string } } = {};
    Object.entries(addModalErrors).forEach(([key, value]) => {
      const idx = parseInt(key);
      if (idx < rowIndex) {
        newErrors[idx] = value;
      } else if (idx > rowIndex) {
        newErrors[idx - 1] = value;
      }
    });
    setAddModalErrors(newErrors);

    // If we removed the first row, update currentPONumber
    if (rowIndex === 0 && updatedRows.length > 0) {
      setCurrentPONumber(updatedRows[0].purchaseOrderId);
    } else if (updatedRows.length === 0) {
      setCurrentPONumber("");
    }
  };

  const addRow = () => {
    const newRow = { ...emptyRow };
    // If there's a current PO number, set it for the new row
    if (currentPONumber) {
      newRow.purchaseOrderId = currentPONumber;
    }
    setRows([...rows, newRow]);
  };

  const handleSubmit = async () => {
    // Validate all rows
    const allErrors: { [key: number]: { [field: string]: string } } = {};
    let hasErrors = false;

    rows.forEach((row, idx) => {
      const errors = validateModalRow(row, idx, rows);
      if (Object.keys(errors).length > 0) {
        allErrors[idx] = errors;
        hasErrors = true;
      }
    });

    setAddModalErrors(allErrors);

    if (hasErrors) {
      toast.error("Please fix all validation errors before submitting");
      return;
    }

    const validRows: CreateNewPurchaseOrderDto[] = rows
      .filter(row =>
        row.purchaseOrderId.trim() &&
        row.lineItem.trim() &&
        row.erpReceiptId.trim() &&
        row.quantity > 0 &&
        row.epId?.trim()
      )
      .map(row => ({
        purchaseOrderId: row.purchaseOrderId.trim(),
        lineItem: row.lineItem.trim(),
        epid: row.epId.trim(),
        quantity: row.quantity,    
        prevQunatity: row.previousAcceptedQuantity ?? null,
        recieptId: row.erpReceiptId.trim(),   
        unitOfMeasure: row.unitOfMeasure ?? null,
        materialCode: row.materialCode ?? null,
      }));

    if (validRows.length === 0) {
      toast.error("Please add at least one valid item");
      return;
    }

    try {
      const response = await createNewPurchaseOrderApi(validRows);

      if (isSuccess(response) && response.statusCode === 201) {
        toast.success('Successfully Created the Purchase Order');
        closeModal();
        setRows([{ ...emptyRow }]);
        setCurrentPONumber("");
        setAddModalErrors({});
        resetUnsavedChanges(); // Reset unsaved changes after successful submission
      } else if (isErrorResponse(response)) {
        if (response.statusCode === 401) {
          setShowSessionModal(true);
        } else {
          toast.error(response.message || 'Submission failed.');
        }
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Submission failed';
      toast.error(`Submission failed: ${message}`);
    }
  };

  // Validation function for the add modal
  const validateModalRow = (row: Row, rowIndex: number, allRows: Row[]): { [field: string]: string } => {
    const errors: { [field: string]: string } = {};

    // Required field validations
    if (!row.purchaseOrderId.trim()) {
      errors.purchaseOrderId = "PO Number is required";
    }

    if (!row.epId?.trim()) {
      errors.epId = "ERP ID is required";
    }

    if (!row.lineItem.trim()) {
      errors.lineItem = "Line Item is required";
    }

    if (!row.quantity || row.quantity <= 0) {
      errors.quantity = "Quantity must be greater than 0";
    }

    if (!row.erpReceiptId.trim()) {
      errors.erpReceiptId = "Receipt ID is required";
    }

    // Check for duplicate line items within the same PO
    if (row.lineItem.trim() && row.purchaseOrderId.trim()) {
      const duplicateLineItem = allRows.find((r, idx) =>
        idx !== rowIndex &&
        r.lineItem.trim() === row.lineItem.trim() &&
        r.purchaseOrderId.trim() === row.purchaseOrderId.trim()
      );
      if (duplicateLineItem) {
        errors.lineItem = "Line Item must be unique within the same PO";
      }
    }
    
    return errors;
  };

  function isSuccessResponse(
    data: SuccessResponseDto | ErrorResponseDto
  ): data is SuccessResponseDto {
    return !!data && "id" in data;
  }

  function isPurchaseOrderIdsResponse(response: any): response is string[] {
    return response && Array.isArray(response);
  }

  const handleCheckboxChange = (value: number) => {
    setAllPONumbers([]);
    setCurrentPOIndex(0);
    setIsFirst50Selected(false);
    setSelectedStatus(value);
    fetchPOs("", 0, 10, false, value);
  };

  const handleToggleFirst50 = () => {
    const newValue = !isFirst50Selected;

    setIsFirst50Selected((prev) => !prev);
    if (newValue) {
      setAllPONumbers([]);
      setCurrentPOIndex(0);
      fetchPOs("", 0, 50, false, selectedStatus);
    } else {
      setIsFirst50Selected(newValue);
      setAllPONumbers([]);
      setCurrentPOIndex(0);
      fetchPOs("", 0, 10, false, selectedStatus);
    }
  };

  const isRowProcessed = (
    item: PurchaseOrderLineItemDto,
    status: boolean,
    purchaseOrderId?: string,
    index?: number
  ): boolean => {
    if (status) return true;

    if (purchaseOrderId !== undefined && index !== undefined) {
      const itemKey = `${purchaseOrderId}-${item.lineItem}-${index}`;
      if (reprocessedItems.has(itemKey)) {
        return false;
      }
    }

    const accepted = Number(item.quantity ?? 0);
    const previousAccepted = Number(item.previousAcceptedQuantity ?? 0);
    const isAcceptedOrGreater = previousAccepted >= accepted;
    return isAcceptedOrGreater;
  };

  const [fileUploads, setFileUploads] = useState<{
    [K in FileUploadType]?: {
      file: File | null;
      isUploading: boolean;
      showConfirm: boolean;
    }
  }>({});

  const fileInputRefs = {
    upload: useRef<HTMLInputElement>(null),
    po: useRef<HTMLInputElement>(null),
    poMaster: useRef<HTMLInputElement>(null),
    blockUnblock: useRef<HTMLInputElement>(null),
  };

  const uploadConfigs: Record<FileUploadType, FileUploadConfig> = {
    po: { type: 'po', label: 'Fact Reciept File' },
    poMaster: { type: 'poMaster', label: 'PO Master File' },
    blockUnblock: { type: 'blockUnblock', label: 'Block/Unblock' },
  };

  const fetchData = async (isBlocked: boolean, index: number = 0, limit: number = 10, searchTerm: string = "") => {
    setLoading(true);
    const response = await getBlockUnblockPOs({
      index,
      limit,
      isBlocked,
      searchTerm,
    });
    setLoading(false);

    if ((response as ErrorResponseDto).statusCode) {
      return;
    }

    if (isBlocked) {
      setBlockedData((prev) => {
        if (searchTerm) {
          // New search → replace previous data
          return response as PurchaseOrderDto[];
        }
        else {
          const newData = [...prev, ...(response as PurchaseOrderDto[])];
          return [...new Set(newData)]; // Ensure unique entries
        }
      });
    } else {
      setUnblockedData((prev) => {
        if (searchTerm) {
          return response as PurchaseOrderDto[];
        } else {
          const newData = [...prev, ...(response as PurchaseOrderDto[])];
          return [...new Set(newData)]; // Ensure unique entries
        }
      });
    }
  };

  const getResultDisplay = (item: PurchaseOrderLineItemDto) => {
    if (item.processedReceiptId) {
      return {
        text: item.processedReceiptId,
        color: "green",
        type: "success",
      };
    }
    if (item.errorComment) {
      return {
        text: item.errorComment,
        color: "red",
        type: "error",
      };
    }
    return null;
  };

  const handleReprocess = (
    item: PurchaseOrderLineItemDto,
    purchaseOrderId: string,
    index: number
  ) => {
    const itemKey = `${purchaseOrderId}-${item.lineItem}-${index}`;
    setReprocessedItems((prev) => {
      const newSet = new Set(prev);
      newSet.add(itemKey);
      return newSet;
    });

    // Also clear any validation errors and reset editable values for this item
    const key = getItemKey(item, purchaseOrderId, index);
    setValidationErrors((prev) => ({
      ...prev,
      [key]: {},
    }));

    // Reset the accepted value to the previous accepted quantity
    setEditableValues((prev) => ({
      ...prev,
      [key]: {
        accepted: item.previousAcceptedQuantity?.toString() || "0",
      },
    }));

    // Add this item to selected rows if it's not already selected
    const row = { item, purchaseOrderId };
    setSelectedRows((prev) => {
      const exists = prev.find(
        (r) =>
          r.purchaseOrderId === purchaseOrderId &&
          r.item.lineItem === item.lineItem
      );
      if (!exists) {
        return [...prev, row];
      }
      return prev;
    });

    toast.success("Item marked for reprocessing and enabled for editing");
  };

  const fetchPOs = useCallback(
    async (
      term: string,
      index: number,
      limit: number,
      isSearch: boolean = false,
      value: number
    ) => {
      if (isLoadingPOs) {
        return;
      }

      setIsLoadingPOs(true);
      setGetListPosStatus(false);
      try {
        const result = await getPurchaseOrderIds(
          index,
          limit,
          term || undefined,
          value
        );

        if (isPurchaseOrderIdsResponse(result)) {
          const data = result || [];
          if (!data?.length) {
            setGetListPosStatus(true);
          }
          if (isSearch || term) {
            setAllPONumbers(data);
            setCurrentPOIndex(0);
          } else {
            setAllPONumbers((prev) => {
              const newData = [...prev, ...data];
              const uniqueData = [...new Set(newData)];
              return uniqueData;
            });
            setCurrentPOIndex((prev) => prev + limit);
          }
        } else if (isErrorResponse(result)) {
          if (result.statusCode === 401) {
            setGetListPosStatus(true);
            setShowSessionModal(true);
          } else {
            setGetListPosStatus(true);
            if (term || selectedReceiptIds.length > 0) {
              toast.error(result.message);
            }
            if (isSearch || term) {
              setAllPONumbers([]);
            }
          }
        } else {
          if (isSearch || term) {
            setAllPONumbers([]);
          }
        }
      } catch (error: any) {
        toast.error("Failed to fetch PO numbers");
        if (isSearch || term) {
          setAllPONumbers([]);
        }
        if (error.status_code === 404) {
          setGetListPosStatus(true);
        }
      } finally {
        setIsLoadingPOs(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      setCurrentPOIndex(0);
      setAllPONumbers([]);
      fetchPOs("", 0, 10, false, selectedStatus);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchTerm.trim()) {
      if (lastSearchTermRef.current !== "") {
        lastSearchTermRef.current = "";
        setCurrentPOIndex(0);
        setAllPONumbers([]);
        fetchPOs("", 0, 10, false, selectedStatus);
      }
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      const trimmedSearchTerm = searchTerm.trim();
      if (
        trimmedSearchTerm &&
        trimmedSearchTerm !== lastSearchTermRef.current
      ) {
        lastSearchTermRef.current = trimmedSearchTerm;
        setCurrentPOIndex(0);
        fetchPOs(trimmedSearchTerm, 0, 10, true, selectedStatus);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, fetchPOs]);

  useEffect(() => {
    const fetchReceipts = async () => {
      if (selectedSearchTerms.length === 0) {
        setReceiptIds([]);
        setSelectedReceiptIds([]);
        return;
      }

      setIsLoadingReceipts(true);
      try {
        const result = await getRecieptByOrderId(selectedSearchTerms);

        if (Array.isArray(result)) {
          setReceiptIds(result);
          setSelectedReceiptIds((prev) =>
            prev.filter((id) => result.includes(id))
          );
        } else if (isErrorResponse(result)) {
          setReceiptIds([]);
          setSelectedReceiptIds([]);
          if (result.statusCode === 401) {
            setShowSessionModal(true);
          } else {
            toast.error(result.message);
          }
        }
      } catch (error) {
        setReceiptIds([]);
        setSelectedReceiptIds([]);
      } finally {
        setIsLoadingReceipts(false);
      }
    };

    fetchReceipts();
  }, [selectedSearchTerms]);

  useEffect(() => {
    const fetchRCTData = async () => {
      if (selectedSearchTerms.length === 0) {
        setPODetailsData([]);
        return;
      }

      if (selectedReceiptIds.length === 0) {
        setPODetailsData([]);
        return;
      }

      setIsLoadingRCTData(true);
      try {
        const payload: PurchaseOrderDetailsRequestDto = {
          purchaseOrderIds: selectedSearchTerms,
          receiptIds: selectedReceiptIds,
        };

        const result = await getPurchaseOrderDetails(payload);

        if (Array.isArray(result)) {
          setPODetailsData(result);
          // Clear selections for processed rows when new data is loaded
          setSelectedRows((prev) =>
            prev.filter((selectedRow) => {
              const matchingItem = result
                .find(
                  (po) => po.purchaseOrderId === selectedRow.purchaseOrderId
                )
                ?.lineItems.find(
                  (item) => item.lineItem === selectedRow.item.lineItem
                );
              const index = currentRCTData.findIndex(
                (r) =>
                  r.purchaseOrderId === selectedRow.purchaseOrderId &&
                  r.item.lineItem === selectedRow.item.lineItem
              );
              return (
                matchingItem &&
                !isRowProcessed(
                  matchingItem,
                  false,
                  selectedRow.purchaseOrderId,
                  index
                )
              );
            })
          );
        } else if (isErrorResponse(result)) {
          setPODetailsData([]);
          if (result.statusCode === 401) {
            setShowSessionModal(true);
          } else {
            toast.error(result.message);
          }
        }
      } catch (error) {
        setPODetailsData([]);
        toast.error("Failed to fetch purchase order details");
      } finally {
        setIsLoadingRCTData(false);
      }
    };

    fetchRCTData();
  }, [selectedSearchTerms, selectedReceiptIds]);

  const filteredPOs = useMemo(() => {
    if (!allPONumbers || allPONumbers.length === 0) {
      return [];
    }
    return allPONumbers;
  }, [allPONumbers]);

  const currentRCTData = useMemo(() => {
    if (poDetailsData.length === 0) return [];
    const combinedData: {
      item: PurchaseOrderLineItemDto;
      purchaseOrderId: string;
    }[] = [];
    poDetailsData.forEach((poDetail) => {
      poDetail.lineItems.forEach((lineItem) => {
        const modifiedItem = {
          ...lineItem,
          acceptedQuantity:
            lineItem.previousAcceptedQuantity !== null &&
              lineItem.previousAcceptedQuantity !== undefined
              ? lineItem.previousAcceptedQuantity
              : lineItem.quantity,
        };
        combinedData.push({
          item: modifiedItem,
          purchaseOrderId: poDetail.purchaseOrderId,
        });
      });
    });
    return combinedData;
  }, [poDetailsData]);

  const selectAllState = useMemo(() => {
    const selectableRows = currentRCTData.filter(
      (row, index) =>
        !isRowProcessed(row.item, false, row.purchaseOrderId, index)
    );

    if (selectableRows.length === 0)
      return { checked: false, indeterminate: false };

    const allSelected = selectableRows.every((row) =>
      selectedRows.some(
        (selectedRow) =>
          selectedRow.purchaseOrderId === row.purchaseOrderId &&
          selectedRow.item.lineItem === row.item.lineItem
      )
    );

    const someSelected = selectedRows.length > 0 && !allSelected;

    return {
      checked: allSelected,
      indeterminate: someSelected,
    };
  }, [currentRCTData, selectedRows, reprocessedItems]);

  // Calculate receipt select all state
  const receiptSelectAllState = useMemo(() => {
    if (receiptIds.length === 0)
      return { checked: false, indeterminate: false };

    const allSelected =
      receiptIds.length > 0 &&
      receiptIds.every((id) => selectedReceiptIds.includes(id));
    const someSelected = selectedReceiptIds.length > 0 && !allSelected;

    return {
      checked: allSelected,
      indeterminate: someSelected,
    };
  }, [receiptIds, selectedReceiptIds]);

  const getItemKey = (
    item: PurchaseOrderLineItemDto,
    purchaseOrderId: string,
    index: number
  ) => `${purchaseOrderId}-${item.lineItem || ""}-${index}`;

  const validateQuantity = (value: string, rctQuantity: string) => {
    if (!value || value === "0") return null;
    const numValue = parseFloat(value);
    const rctQty = parseFloat(rctQuantity);
    const tolerance = Math.ceil(rctQty * 0.2);
    const maxAllowed = rctQty + tolerance;
    if (numValue > maxAllowed)
      return `Cannot exceed 20% above RCT Qty (${maxAllowed})`;
    return null;
  };

  const getAcceptedValue = (
    item: PurchaseOrderLineItemDto,
    purchaseOrderId: string,
    index: number
  ) => {
    const key = getItemKey(item, purchaseOrderId, index);
    return (
      editableValues[key]?.accepted ??
      (item.previousAcceptedQuantity?.toString() || "")
    );
  };

  const getErrorMessage = (
    item: PurchaseOrderLineItemDto,
    purchaseOrderId: string,
    index: number,
    type: "accepted"
  ) => validationErrors[getItemKey(item, purchaseOrderId, index)]?.[type];

  const handleAcceptedChange = (
    item: PurchaseOrderLineItemDto,
    purchaseOrderId: string,
    index: number,
    value: string
  ) => {
    if (isRowProcessed(item, false, purchaseOrderId, index)) return;

    const key = getItemKey(item, purchaseOrderId, index);
    const error = validateQuantity(value, item.quantity?.toString() || "0");
    setValidationErrors((prev) => ({
      ...prev,
      [key]: { ...prev[key], accepted: error || undefined },
    }));
    setEditableValues((prev) => ({
      ...prev,
      [key]: {
        accepted: value,
      },
    }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (!isDropdownOpen) {
      setIsDropdownOpen(true);
    }
    setIsFirst50Selected(false);
    setCurrentPOIndex(0);
  };

  const handleSearchPOToggle = (poNumber: string) => {
    setSelectedSearchTerms((prev) =>
      prev.includes(poNumber)
        ? prev.filter((po) => po !== poNumber)
        : [...prev, poNumber]
    );
  };

  const handleReceiptToggle = (receiptId: string) => {
    setSelectedReceiptIds((prev) =>
      prev.includes(receiptId)
        ? prev.filter((id) => id !== receiptId)
        : [...prev, receiptId]
    );
  };

  // New handler for receipt select all
  const handleReceiptSelectAll = () => {
    if (receiptSelectAllState.checked) {
      // Deselect all
      setSelectedReceiptIds([]);
    } else {
      // Select all
      setSelectedReceiptIds([...receiptIds]);
    }
  };

  const handleAcceptAll = () => {
    const updated: EditableValues = {};
    currentRCTData.forEach(({ item, purchaseOrderId }, index) => {
      // Skip processed rows
      if (isRowProcessed(item, false, purchaseOrderId, index)) return;

      const key = getItemKey(item, purchaseOrderId, index);
      updated[key] = {
        accepted: item.previousAcceptedQuantity?.toString() || "0",
      };
      setValidationErrors((prev) => ({ ...prev, [key]: {} }));
    });
    setEditableValues((prev) => ({ ...prev, ...updated }));
  };

  const handleRejectAll = () => {
    const updated: EditableValues = {};
    currentRCTData.forEach(({ item, purchaseOrderId }, index) => {
      // Skip processed rows
      if (isRowProcessed(item, false, purchaseOrderId, index)) return;

      const key = getItemKey(item, purchaseOrderId, index);
      updated[key] = {
        accepted: item.quantity
          ? `-${Math.abs(item.quantity).toString()}`
          : "0",
      };
      setValidationErrors((prev) => ({ ...prev, [key]: {} }));
    });
    setEditableValues((prev) => ({ ...prev, ...updated }));
  };

  const handlePostClick = (isReversible: boolean) => {
    // Apply validation only to rows that have results
    const selectableRows = selectedRows.filter((row) => {
      const result = getResultDisplay(row.item);
      if (!result || !result.text) {
        return true;
      }
      const index = currentRCTData.findIndex(
        (r) =>
          r.purchaseOrderId === row.purchaseOrderId &&
          r.item.lineItem === row.item.lineItem
      );
      return !isRowProcessed(row.item, false, row.purchaseOrderId, index);
    });

    if (selectableRows.length === 0) {
      toast.error("Please select at least one line item");
      return;
    }

    setShowConfirmModal({
      show: true,
      action: isReversible ? "reverse" : "post",
      isReversible,
    });
  };

  const handleConfirmAction = async () => {
    if (!showConfirmModal.action) return;

    if (!selectedDate) {
      toast.error("Please select a date before proceeding");
      return;
    }

    setIsPosting(true);
    setShowConfirmModal({ show: false, action: null, isReversible: false });

    try {
      const selectableRows = selectedRows.filter((row) => {
        const index = currentRCTData.findIndex(
          (r) =>
            r.purchaseOrderId === row.purchaseOrderId &&
            r.item.lineItem === row.item.lineItem
        );
        return !isRowProcessed(row.item, false, row.purchaseOrderId, index);
      });

      const groupedByPO: {
        [key: string]: {
          item: PurchaseOrderLineItemDto;
          purchaseOrderId: string;
        }[];
      } = {};

      selectableRows.forEach((row) => {
        if (!groupedByPO[row.purchaseOrderId]) {
          groupedByPO[row.purchaseOrderId] = [];
        }
        groupedByPO[row.purchaseOrderId].push(row);
      });

      const payload: createPurchaseOrderDto[] = [];

      Object.entries(groupedByPO).forEach(([purchaseOrderId, rows]) => {
        const lineItems: lineItemDto[] = rows.map(
          ({ item, purchaseOrderId: poId }) => {
            const itemIndex = currentRCTData.findIndex(
              (rctItem) =>
                rctItem.purchaseOrderId === poId &&
                rctItem.item.lineItem === item.lineItem
            );

            const key = getItemKey(item, poId, itemIndex);
            const values = editableValues[key];

            return {
              lineItem: item.lineItem || "",
              acceptedQuantity:
                showConfirmModal.action === "reverse"
                  ? Math.abs(
                    Number(values?.accepted || item.acceptedQuantity || "0")
                  ).toString()
                  : (
                    values?.accepted ||
                    item.acceptedQuantity ||
                    "0"
                  ).toString(),
            };
          }
        );

        payload.push({
          purchaseOrderId,
          lineItems,
        });
      });

      const response = await createPurchaseOrderAriba(
        payload,
        showConfirmModal.isReversible,
        selectedDate
      );

      if (isSuccessResponse(response)) {
        toast.success(
          `Purchase orders ${showConfirmModal.action === "reverse" ? "reversed" : "posted"
          } successfully`
        );
        setSelectedRows([]);
        const detailPayload: PurchaseOrderDetailsRequestDto = {
          purchaseOrderIds: selectedSearchTerms,
          receiptIds: selectedReceiptIds,
        };
        const result = await getPurchaseOrderDetails(detailPayload);
        if (Array.isArray(result)) {
          setPODetailsData(result);
        } else if (isErrorResponse(result)) {
          if (result.statusCode === 401) {
            setShowSessionModal(true);
          } else {
            toast.error(result.message);
          }
        } else if (isErrorResponse(response)) {
          if (response.statusCode === 401) {
            setShowSessionModal(true);
          } else {
            toast.error(response.message);
          }
        }
        setReprocessedItems(new Set());
        resetUnsavedChanges(); // Reset unsaved changes after successful operation
      }
    } catch (err: any) {
      toast.error(`Failed to ${showConfirmModal.action} purchase orders`);
    } finally {
      setIsPosting(false);
    }
  };

  const handleDropdownScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      if (
        target.scrollHeight - target.scrollTop - target.clientHeight < 20 &&
        !isLoadingPOs &&
        !searchTerm
      ) {
        fetchPOs("", currentPOIndex, 10, false, selectedStatus);
      }
    },
    [currentPOIndex, isLoadingPOs, searchTerm, fetchPOs, selectedStatus]
  );

  const handleDeleteRow = (purchaseOrderId: string, lineItemIndex: number) => {
    setPODetailsData((prev) =>
      prev
        ?.map((po) => {
          if (po.purchaseOrderId !== purchaseOrderId) return po;
          const updatedLineItems = po.lineItems.filter(
            (_, idx) => idx !== lineItemIndex
          );
          return { ...po, lineItems: updatedLineItems };
        })
        ?.filter((po) => po.lineItems.length > 0)
    );

    const keyToRemove = `${purchaseOrderId}-${currentRCTData[lineItemIndex].item.lineItem}-${lineItemIndex}`;
    setEditableValues((prev) => {
      const { [keyToRemove]: _, ...rest } = prev;
      return rest;
    });
    setValidationErrors((prev) => {
      const { [keyToRemove]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleRowSelect = (row: {
    item: PurchaseOrderLineItemDto;
    purchaseOrderId: string;
    text: string | undefined
  }) => {
    // Find the index for this row
    const index = currentRCTData.findIndex(
      (r) =>
        r.purchaseOrderId === row.purchaseOrderId &&
        r.item.lineItem === row.item.lineItem
    );

    isRowProcessed(row.item, false, row.purchaseOrderId, index)
    if (!row.text) {
      setReprocessedItems(new Set());
    }
    setSelectedRows((prev) => {
      const exists = prev.find(
        (r) =>
          r.purchaseOrderId === row.purchaseOrderId &&
          r.item.lineItem === row.item.lineItem
      );

      if (exists) {
        return prev.filter(
          (r) =>
            !(
              r.purchaseOrderId === row.purchaseOrderId &&
              r.item.lineItem === row.item.lineItem
            )
        );
      } else {
        return [...prev, row];
      }
    });
  };

  const handleBlock = async (selectedIds: number[]) => {
    const poNumbers = selectedIds.map(index => unblockedData[index]);

    try {
      const response = await updateBlockUnblockPOs({ isBlocked: true }, poNumbers);

      // Check if response has statusCode property and it's 200
      if (response && typeof response === 'object' && 'statusCode' in response) {
        if (response.statusCode === 200) {
          toast.success("POs blocked successfully");
          await fetchData(true);
          await fetchData(false);
          resetUnsavedChanges(); // Reset unsaved changes after successful operation
        } else {
          toast.error(response.message || "Failed to block POs");
        }
      } else {
        await fetchData(true);
        await fetchData(false);
        resetUnsavedChanges(); // Reset unsaved changes after successful operation
      }
    } catch (error: any) {
      toast.error("Failed to block POs");
    }
  };

  const handleUnblock = async (selectedIds: number[]) => {
    const poNumbers = selectedIds.map(index => blockedData[index]);

    try {
      const response = await updateBlockUnblockPOs({ isBlocked: false }, poNumbers);

      // Check if response has statusCode property and it's 200
      if (response && typeof response === 'object' && 'statusCode' in response) {
        if (response.statusCode === 200) {
          toast.success("POs unblocked successfully");
          await fetchData(true);
          await fetchData(false);
          resetUnsavedChanges(); // Reset unsaved changes after successful operation
        } else {
          toast.error(response.message || "Failed to unblock POs");
        }
      } else {
        await fetchData(true);
        await fetchData(false);
        resetUnsavedChanges(); // Reset unsaved changes after successful operation
      }
    } catch (error: any) {
      toast.error("Failed to unblock POs");
    }
  };

  const handleSelectAll = () => {
    const selectableRows = currentRCTData.filter(
      (row, index) =>
        !isRowProcessed(row.item, false, row.purchaseOrderId, index)
    );

    if (selectAllState.checked) {
      setSelectedRows((prev) =>
        prev.filter(
          (selectedRow) =>
            !selectableRows.some(
              (currentRow) =>
                selectedRow.purchaseOrderId === currentRow.purchaseOrderId &&
                selectedRow.item.lineItem === currentRow.item.lineItem
            )
        )
      );
    } else {
      setSelectedRows((prev) => {
        const newSelections = selectableRows.filter(
          (currentRow) =>
            !prev.some(
              (selectedRow) =>
                selectedRow.purchaseOrderId === currentRow.purchaseOrderId &&
                selectedRow.item.lineItem === currentRow.item.lineItem
            )
        );
        return [...prev, ...newSelections];
      });
    }
  };

  const handleFileClick = (type: FileUploadType) => {
    const uploadState = fileUploads[type];
    if (uploadState?.isUploading) return;
    fileInputRefs[type].current?.click();
  };

  const handleFileChange = (type: FileUploadType) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!validExtensions.includes(file.type)) {
      setNotificationType("error");
      setNotificationMessage("Invalid file type. Please upload an Excel file");
      setShowNotification(true);
      event.target.value = "";
      return;
    }

    setFileUploads(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        file,
        showConfirm: true,
      }
    }));
  };

  const handleConfirmUpload = async (type: FileUploadType) => {
    const uploadState = fileUploads[type];
    if (!uploadState?.file) return;

    setFileUploads(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        isUploading: true,
        showConfirm: false,
      }
    }));

    try {
      // You can customize the API call based on type
      let response;
      switch (type) {
        case 'po':
          response = await instanceOfPoUploadExcel(uploadState.file);
          break;
        case 'poMaster':
          response = await instanceOfPoMasterUploadExcel(uploadState.file);
          break;
        case 'blockUnblock':
          response = await uploadBlockUnblockExcel(uploadState.file);
          break;
        default:
          throw new Error('Unknown upload type');
      }

      if ("statusCode" in response && response.statusCode === 401) {
        setShowSessionModal(true);
        return;
      }

      if ("statusCode" in response && response.statusCode === 403) {
        setNotificationType("error");
        setNotificationMessage("Invalid file type. Please upload an Excel file");
        setShowNotification(true);
        return;
      }

      if ("totalRows" in response) {
        const successMessage = `${uploadConfigs[type].label} uploaded successfully!`;
        const errorMessages = response.errorResponses?.map(
          (err) => err.description || err.message
        ) || [];

        setNotificationType(errorMessages.length > 0 ? "error" : "success");
        setNotificationMessage({
          success: successMessage,
          errors: errorMessages,
        });
        setShowNotification(true);
        resetUnsavedChanges(); // Reset unsaved changes after successful upload
      }
    } catch (error) {
      setNotificationType("error");
      setNotificationMessage(`Failed to upload ${uploadConfigs[type].label.toLowerCase()}.`);
      setShowNotification(true);
    } finally {
      setFileUploads(prev => ({
        ...prev,
        [type]: {
          file: null,
          isUploading: false,
          showConfirm: false,
        }
      }));
      
      if (fileInputRefs[type].current) {
        fileInputRefs[type].current.value = "";
      }
    }
  };

  const handleCancelUpload = (type: FileUploadType) => {
    setFileUploads(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        file: null,
        showConfirm: false,
      }
    }));
    
    if (fileInputRefs[type].current) {
      fileInputRefs[type].current.value = "";
    }
  };

  useEffect(() => {
    if (filteredPOs && filteredPOs.length > 0 && isFirst50Selected) {
      const first50 = filteredPOs.slice(0, 50);
      setSelectedSearchTerms(first50);
    } else {
      setSelectedSearchTerms([]);
    }
  }, [filteredPOs]);

  return (
    <div className="po-interface-container">
      <div className="po-interface-header">
        <h1 className="po-interface-title">Receipts Reprocessing Bot</h1>
      </div>
      <div className="button-container11">
        <div className="toolbar-left">
          <ViewButton />
        </div>
        <div className="toolbar-right">
          <button
            className="po-interface-btn po-interface-btn-reverse"
            onClick={() => setIsOpenDomain(!isOpenDomain)}
          >
            Domain Id
          </button>
          
{auth.auth?.roleId === USER_ROLES.BUSINESS_ADMIN_USER && (
  <>
    {Object.entries(uploadConfigs).map(([key, config]) => {
      const type = key as FileUploadType;
      const uploadState = fileUploads[type];
      
      return (
        <div key={type}>
          <input
            type="file"
            ref={fileInputRefs[type]}
            onChange={handleFileChange(type)}
            style={{ display: "none" }}
            accept=".xlsx, .xls"
            disabled={uploadState?.isUploading}
          />
          <button
            className={`po-interface-btn po-interface-btn-reverse ${
              uploadState?.isUploading ? 'uploading' : ''
            }`}
            onClick={() => handleFileClick(type)}
            disabled={uploadState?.isUploading}
          >
            {uploadState?.isUploading ? 'Uploading...' : config.label}
          </button>
        </div>
      );
    })}
  </>
)}
          <button
            className="po-interface-btn po-interface-btn-post"
            onClick={openModal}
          >
            Add New Item
          </button>
        </div>
      </div>
      <div className="po-interface-controls">
        <div className="filter-section">
          <div className="po-interface-controls-inner">
            {/* PO Numbers Dropdown */}
            <div className="po-interface-dropdown-wrapper">
              <div className="multi-select-container">
                <div className="search-input-container">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Search PO Numbers..."
                    className="po-interface-search-input"
                  />
                  <button
                    className="dropdown-toggle-btn"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    ▼
                  </button>
                </div>

                {selectedSearchTerms.length > 0 && (
                  <div className="selected-po-tags">
                    {selectedSearchTerms.map((po) => (
                      <span key={po} className="po-tag">
                        {po}{" "}
                        <button
                          onClick={() => handleSearchPOToggle(po)}
                          className="po-tag-remove"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {isDropdownOpen && (
                  <div className="dropdown-options">
                    <div
                      className="dropdown-list"
                      onScroll={
                        getListPosStatus === false
                          ? handleDropdownScroll
                          : undefined
                      }
                    >
                      {isLoadingPOs && allPONumbers.length === 0 ? (
                        <div className="loading-option">
                          Loading PO numbers...
                        </div>
                      ) : filteredPOs.length > 0 ? (
                        <>
                          <div
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            {Object.entries(statusOptions).map(
                              ([label, value]) => (
                                <div
                                  className="select-all-option"
                                  key={value}
                                  style={{ marginRight: ".2rem" }}
                                >
                                  <label
                                    className="dropdown-option select-all-label"
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.2rem",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedStatus === value}
                                      onChange={() =>
                                        handleCheckboxChange(value)
                                      }
                                      style={{ width: "1rem", height: "1rem" }}
                                    />
                                    <span className="checkbox-custom"></span>
                                    <strong>{label}</strong>
                                  </label>
                                </div>
                              )
                            )}
                            <div>
                              <label
                                className="dropdown-option select-all-label"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.2rem",
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="radio"
                                  name="first50"
                                  checked={isFirst50Selected}
                                  onChange={() => handleToggleFirst50()}
                                />
                                <strong>First 50</strong>
                              </label>
                            </div>
                          </div>
                          {filteredPOs?.map((po) => (
                            <label key={po} className="dropdown-option">
                              <input
                                type="checkbox"
                                checked={selectedSearchTerms.includes(po)}
                                onChange={() => handleSearchPOToggle(po)}
                              />
                              <span className="checkbox-custom"></span>
                              {po}
                            </label>
                          ))}
                          {isLoadingPOs && !searchTerm && (
                            <div className="loading-option">
                              Loading more...
                            </div>
                          )}
                        </>
                      ) : isLoadingPOs ? (
                        <div className="loading-option">Searching...</div>
                      ) : (
                        <div className="no-options">
                          {searchTerm
                            ? `No PO numbers found matching "${searchTerm}"`
                            : "No PO numbers available"}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Receipt IDs Dropdown */}
            <div className="po-interface-dropdown-wrapper">
              <div className="receipt-dropdown-container">
                <div className="receipt-dropdown-header">
                  <button
                    className="receipt-dropdown"
                    onClick={() =>
                      setIsReceiptDropdownOpen(!isReceiptDropdownOpen)
                    }
                    disabled={selectedSearchTerms.length === 0}
                  >
                    {selectedReceiptIds.length > 0
                      ? `${selectedReceiptIds.length} Receipt(s) Selected`
                      : "Select Receipt IDs"}
                  </button>
                </div>

                {selectedReceiptIds.length > 0 && (
                  <div className="selected-po-tags">
                    {selectedReceiptIds?.map((receiptId) => (
                      <span key={receiptId} className="po-tag">
                        {receiptId}{" "}
                        <button
                          onClick={() => handleReceiptToggle(receiptId)}
                          className="po-tag-remove"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {isReceiptDropdownOpen && (
                  <div className="dropdown-options">
                    <div className="dropdown-list">
                      {isLoadingReceipts ? (
                        <div className="loading-option">
                          Loading receipts...
                        </div>
                      ) : receiptIds.length > 0 ? (
                        <>
                          {/* Select All option */}
                          <div className="select-all-option">
                            <label className="dropdown-option select-all-label">
                              <input
                                type="checkbox"
                                checked={receiptSelectAllState.checked}
                                ref={(input) => {
                                  if (input)
                                    input.indeterminate =
                                      receiptSelectAllState.indeterminate;
                                }}
                                onChange={handleReceiptSelectAll}
                              />
                              <span className="checkbox-custom"></span>
                              <strong>Select All ({receiptIds.length})</strong>
                            </label>
                          </div>

                          {/* Separator */}
                          <div className="dropdown-separator"></div>

                          {/* Individual receipt options */}
                          {receiptIds.map((receiptId) => (
                            <label key={receiptId} className="dropdown-option">
                              <input
                                type="checkbox"
                                checked={selectedReceiptIds.includes(receiptId)}
                                onChange={() => handleReceiptToggle(receiptId)}
                              />
                              <span className="checkbox-custom"></span>
                              {receiptId}
                            </label>
                          ))}
                        </>
                      ) : (
                        <div className="no-options">
                          {selectedSearchTerms.length === 0
                            ? "Select PO numbers first"
                            : "No receipt IDs found for selected POs"}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div
  style={{
    padding: "0.5rem 0.75rem",
    width: "32%",
    display: "flex",
    gap: "0.5rem",
    position: "relative",
    top: "-0.625rem",
    alignItems: "center",
  }}
>
  <input
    type="date"
    value={selectedDate}
    onChange={(e) => setSelectedDate(e.target.value)}
    disabled={isPosting}
    required
  />
</div>
          </div>
         
          <div className="action-row">
            <div style={{ gap: "10px" }} className="button-group">
              <button
                onClick={handleAcceptAll}
                disabled={selectedSearchTerms.length === 0 || isPosting}
                className="po-interface-btn po-interface-btn-accept"
              >
                Accept All
              </button>
              <button
                onClick={handleRejectAll}
                disabled={selectedSearchTerms.length === 0 || isPosting}
                className="po-interface-btn po-interface-btn-reject"
              >
                Reject All
              </button>
              <button
                onClick={() => handlePostClick(false)}
                disabled={selectedSearchTerms.length === 0 || isPosting}
                className="po-interface-btn po-interface-btn-post"
              >
                {isPosting && showConfirmModal.action === "post"
                  ? "Posting..."
                  : "Post"}
              </button>
              <button
                onClick={() => handlePostClick(true)}
                disabled={selectedSearchTerms.length === 0 || isPosting}
                className="po-interface-btn po-interface-btn-reverse"
              >
                {isPosting && showConfirmModal.action === "reverse"
                  ? "Reprocessing..."
                  : "Reprocess"}
              </button>
            </div>
            <div style={{  alignItems: "center", gap: "10px",display: "flex"  }}>
              <DropdownWithAction
                label="Blocked Data"
                buttonLabel="Unblock"
                data={blockedData.map((poNumber, index) => ({
                  id: index,
                  name: poNumber,
                }))}
                onAction={handleUnblock}
                onOpen={(index, limit, searchTerm) => fetchData(true, index, limit, searchTerm)}
              />
        
            <button
            className="po-download-btn"
            type="button"
            onClick={async () => {
              try {
                const result = await downloadBlockedPurchaseOrders();
                if (result instanceof Blob) {
                  const url = window.URL.createObjectURL(result);
                  const link = document.createElement("a");
                  link.href = url;
                  link.setAttribute("download", "Blocked_PO.xlsx");
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  window.URL.revokeObjectURL(url);
                } else {
                  toast.error(result?.message || "Failed to download blocked purchase orders.");
                }
              } catch (err: any) {
                toast.error("Download failed.");
              }
            }}
          >
            Download
          </button>
            </div>
            <DropdownWithAction
              label="Unblocked Data"
              buttonLabel="Block"
              data={unblockedData.map((poNumber, index) => ({
                id: index,
                name: poNumber,
              }))}
              onAction={handleBlock}
              onOpen={(index, limit, searchTerm) => fetchData(false, index, limit, searchTerm)}
            />
          </div>

        </div>
      </div>

      {/* Table */}
      <div className="po-interface-table-container">
        {isLoadingRCTData ? (
          <div className="po-interface-loading">
            <p>Loading purchase order details...</p>
          </div>
        ) : currentRCTData.length > 0 ? (
          <>
            <div className="po-interface-items-container">
              <div className="po-interface-items-header">
                <div className="rct-items-header-grid">
                  <div>
                    <input
                      type="checkbox"
                      checked={selectAllState.checked}
                      ref={(input) => {
                        if (input)
                          input.indeterminate = selectAllState.indeterminate;
                      }}
                      onChange={handleSelectAll}
                      disabled={isPosting}
                      title={
                        selectAllState.checked ? "Deselect All" : "Select All"
                      }
                    />
                  </div>
                  <div>PO Number</div>
                  <div>Line Item</div>
                  <div>Unit</div>
                  <div>Material</div>
                  <div>RCT Qty</div>
                  <div>Accepted</div>
                  <div>Prev Acc</div>
                  <div>Receipt ID</div>
                  <div>Result</div>
                  <div>Action</div>
                  <div></div>
                </div>
              </div>

              {currentRCTData.map(({ item, purchaseOrderId }, index) => {
                const processed = isRowProcessed(
                  item,
                  false,
                  purchaseOrderId,
                  index
                );
                const result = getResultDisplay(item);
                const isSelected = selectedRows.some(
                  (r) =>
                    r.purchaseOrderId === purchaseOrderId &&
                    r.item.lineItem === item.lineItem
                );

                return (
                  <div
                    key={index}
                    className={`po-interface-item-row ${processed ? "processed-row" : ""
                      }`}
                  >
                    <div className="rct-item-grid">
                      <div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            handleRowSelect({ item, purchaseOrderId, text: result?.text })
                          }
                          disabled={result?.text ? processed || isPosting : false}
                          className={result?.text ? (processed ? "checkbox-disabled" : "") : ""}
                        />
                      </div>
                      <div>{purchaseOrderId}</div>
                      <div>{item.lineItem}</div>
                      <div>{item.unitOfMeasure}</div>
                      <div>{item.materialCode}</div>
                      <div>{parseFloat(String(item?.quantity ?? "0"))}</div>
                      <div>
                        <input
                          type="number"
                          value={getAcceptedValue(item, purchaseOrderId, index) ?? "0"}
                          onChange={(e) =>
                            handleAcceptedChange(
                              item,
                              purchaseOrderId,
                              index,
                              e.target.value
                            )
                          }
                          disabled={result?.text ? processed || isPosting : false}
                          placeholder="0"
                          className={processed ? "input-disabled" : ""}
                        />
                        {getErrorMessage(
                          item,
                          purchaseOrderId,
                          index,
                          "accepted"
                        ) && (
                            <div className="error-message">
                              {getErrorMessage(
                                item,
                                purchaseOrderId,
                                index,
                                "accepted"
                              )}
                            </div>
                          )}
                      </div>

                      <div>{parseFloat(String(item.previousAcceptedQuantity || 0))?.toFixed(2) || 0}</div>

                      <div>{item.receiptId}</div>
                      <div>
                        {result && (
                          <span
                            className={`result-badge ${result.type} result-cell`}
                            data-fulltext={result.text}
                            title={result.text}
                          >
                            {result.text}
                          </span>
                        )}
                      </div>
                      <div>
                        <button
                          className={`delete-bton ${processed ? "delete-btn-disabled" : ""
                            }`}
                          onClick={() =>
                            handleDeleteRow(purchaseOrderId, index)
                          }
                          disabled={isPosting}
                        >
                          🗑 Delete
                        </button>
                      </div>
                      <div>
                        <button
                          className="reprocess-btn"
                          onClick={() =>
                            handleReprocess(item, purchaseOrderId, index)
                          }
                          disabled={isPosting}
                        >
                          <span>Reprocess</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="po-interface-empty-state">
            <p>
              {selectedSearchTerms.length === 0
                ? "Please select PO Numbers to view details"
                : selectedReceiptIds.length === 0
                  ? "Please select receipt IDs to view details"
                  : "No data available for selected PO numbers and receipt IDs"}
            </p>
          </div>
        )}
      </div>

      {/* Backdrop for dropdowns */}
      {(isDropdownOpen || isReceiptDropdownOpen) && (
        <div
          className="dropdown-backdrop"
          onClick={() => {
            setIsDropdownOpen(false);
            setIsReceiptDropdownOpen(false);
          }}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmModal.show && (
        <div className="confirmation-modal-overlay">
          <div className="confirmation-modal">
            <div className="confirmation-modal-header">
              <h3>Confirm Action</h3>
            </div>
            <div className="confirmation-modal-body">
              <p>
                {showConfirmModal.action === "post"
                  ? "Are you sure you want to post the selected purchase orders?"
                  : "Are you sure you want to reverse the selected purchase orders?"}
              </p>
              <div className="confirmation-modal-details">
                <span>
                  {showConfirmModal.action === "reverse" ? (
                    <>
                      Note: Any negative{" "}
                      <b style={{ color: "blue" }}>accepted quantities</b> will
                      be converted to positive values before processing.
                    </>
                  ) : (
                    ""
                  )}
                </span>

                <br />
                <span>
                  Selected items:{" "}
                  {
                    selectedRows.filter((row) => {
                      const index = currentRCTData.findIndex(
                        (r) =>
                          r.purchaseOrderId === row.purchaseOrderId &&
                          r.item.lineItem === row.item.lineItem
                      );
                      return !isRowProcessed(
                        row.item,
                        false,
                        row.purchaseOrderId,
                        index
                      );
                    }).length
                  }
                </span>
                {selectedDate && <span>Processing date: {selectedDate}</span>}
              </div>
            </div>
            <div className="confirmation-modal-actions">
              <button
                className="confirmation-cancel-btn"
                onClick={() =>
                  setShowConfirmModal({
                    show: false,
                    action: null,
                    isReversible: false,
                  })
                }
                disabled={isPosting}
              >
                Cancel
              </button>
              <button
                className={`confirmation-confirm-btn ${showConfirmModal.action === "reverse" ? "reverse" : "post"
                  }`}
                onClick={handleConfirmAction}
                disabled={isPosting}
              >
                {isPosting
                  ? showConfirmModal.action === "post"
                    ? "Posting..."
                    : "Reversing..."
                  : showConfirmModal.action === "post"
                    ? "Confirm Post"
                    : "Confirm Reverse"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Modal */}
      {showUnsavedChangesModal && (
        <div className="confirmation-modal-overlay">
          <div className="confirmation-modal">
            <div className="confirmation-modal-header">
              <h3>Unsaved Changes</h3>
            </div>
            <div className="confirmation-modal-body">
              <p>
                You have unsaved changes on this page. Are you sure you want to leave? 
                Your changes will be lost.
              </p>
            </div>
            <div className="confirmation-modal-actions">
              <button
                className="confirmation-cancel-btn"
                onClick={handleUnsavedChangesCancel}
              >
                Stay on Page
              </button>
              <button
                className="confirmation-confirm-btn reverse"
                onClick={handleUnsavedChangesConfirm}
              >
                Leave Page
              </button>
            </div>
          </div>
        </div>
      )}

      <ErrorModel
        visible={showSessionModal}
        title="Session Expired"
        message="Your session has expired. Please log in again."
        onConfirm={() => {
          setShowSessionModal(false);
          navigate("/");
        }}
        onClose={() => {
          setShowSessionModal(false);
          navigate("/");
        }}
      />
      <div className="popup-container-domain">
        {isOpenDomain && (
          <div
            className="popup-overlay-domain"
            onClick={() => setIsOpenDomain(!isOpenDomain)}
          >
            <div
              className="popup-modal-domain"
              onClick={(e) => e.stopPropagation()}
            >
              <span
                className="close-btn-domain"
                onClick={() => setIsOpenDomain(!isOpenDomain)}
              >
                &times;
              </span>
              <h2 style={{ color: "tomato" }}>Current Domain ID</h2>
              <p>{domainId}</p>
            </div>
          </div>
        )}
      </div>
      {isOpen && (
        <div className="modal-overlay-add-modal">
          <div className="modal-content-add-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Add New Items</h2>
              {currentPONumber && (
                <div style={{ color: '#666', fontSize: '0.9rem' }}>
                  Current PO: <strong>{currentPONumber}</strong>
                </div>
              )}
            </div>

            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table className="add-modal">
                <thead className="add-modal">
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="add-modal">
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {columns.map((col) => (
                        <td key={col.key} className="add-modal">
                          <div>
                            <input
                              className={`add-modal ${addModalErrors[rowIndex]?.[col.key] ? 'error-input' : ''}`}
                              type={col.type}
                              value={row[col.key]}
                              onChange={(e) =>
                                handleChange(
                                  rowIndex,
                                  col.key,
                                  col.type === "number"
                                    ? Number(e.target.value)
                                    : e.target.value
                                )
                              }
                              disabled={col.key === 'purchaseOrderId' && !!currentPONumber && rowIndex > 0}
                              placeholder={col.key === 'quantity' ? '0' : ''}
                            />
                            {addModalErrors[rowIndex]?.[col.key] && (
                              <div style={{
                                color: 'red',
                                fontSize: '0.75rem',
                                marginTop: '2px',
                                wordWrap: 'break-word'
                              }}>
                                {addModalErrors[rowIndex][col.key]}
                              </div>
                            )}
                          </div>
                        </td>
                      ))}
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          {rowIndex === rows.length - 1 && (
                            <button
                              className="add-btn-add-modal"
                              onClick={addRow}
                              title="Add new row"
                            >
                              +
                            </button>
                          )}
                          {rows.length > 1 && (
                            <button
                              className="remove-btn-add-modal"
                              onClick={() => removeRow(rowIndex)}
                              title="Remove this row"
                            >
                              −
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-buttons-add-modal">
              <button className="submit-btn-add-modal" onClick={handleSubmit}>
                Submit ({rows.filter(r => r.purchaseOrderId.trim() && r.lineItem.trim()).length} items)
              </button>
              <button className="close-btn-add-modal" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* File Upload Confirmation Modal */}
      {Object.entries(fileUploads).map(([key, uploadState]) => {
        const type = key as FileUploadType;
        if (!uploadState?.showConfirm) return null;
        
        return (
          <NotificationModal
            key={type}
            show={uploadState.showConfirm}
            type="confirm"
            title="Confirm File Upload"
            message={`Are you sure you want to upload this ${uploadConfigs[type].label.toLowerCase()}: "${uploadState.file?.name}"?`}
            onClose={() => handleCancelUpload(type)}
            onConfirm={() => handleConfirmUpload(type)}
            confirmText="Yes, Upload"
            cancelText="Cancel"
          />
        );
      })}
      <NotificationModal
        show={showNotification}
        type={notificationType}
        title={notificationType === "success" ? "Success" : "Error"}
        message={notificationMessage}
        onClose={() => setShowNotification(false)}
      />

    </div>
  );
};

export default POManagement;