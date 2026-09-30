import PoExcel from "./poUploadExcelApi";


const isErrorResponse = (data: any): boolean => {
    return data && (data.statusCode >= 400 || data.status_code >= 400);
};

export interface PaginatedFilterPayload {
    page?: number;
    page_size?: number;
    search?: string;
}

export interface SuppliersDTO {
    suppliers: { supplierId: string; supplierName: string }[];
    pagination?: {
        page: number;
        page_size: number;
        total: number;
        total_pages: number;
    };
}

export interface ServicePRDto {
    domainId?: string;
    userId?: string;
    prNumber?: string;
    prServiceUniqueName?: string;
    server?: string;
    variant?: string;
    partition?: string;
    operation?: string;
    originatingSystem?: string;
    originatingSystemReferenceID?: string;
    uniqueName?: string;
    name?: string;
    title?: string;
    preparer?: string;
    passwordAdapter?: string;
    aribaUserName?: string;
    companyCode?: string;
    deliverTo?: string;
    NeedBy?: string;
    importedHeaderCommentStaging?: string;
    importedHeaderExternalCommentStaging?: boolean;
    aribaEndPoint?: string;
    username?: string;
    password?: string;
    servicePartition?: string;
    serviceVariant?: string;
    venue?: string;
    supplier?: string;
    description?: string;
    serviceStartDate?: string;
    serviceEndDate?: string;
    amount?: string;
    autoSes?: boolean;
    shipToPlant?: string;
    billTo?: string;
    purchaseOrg?: string;
    purchaseGroup?: string;
    currency?: string;
    deliveryTo?: string;
    taxCode?: string;
    id?: number;
    numberInCollection?: number;
    commodityCode?: string;
    contract?: string | null;
    costCenter?: string;
    glAccount?: string;
    uom?: string;
}

export interface UpdateMaterialPRDto {
    purchaseOrg: string;
    vendor: string;
    description: string;
    commodity: string;
    contract: string;
    purchaseGroup: string;
    quantity: number;
    uom: string;
    amount: number;
    deliveryDate: string;
    deliverTo: string;
    glAccount: string;
    costCenter: string;
    materialCode: string;
}

export interface GetAllMaterialPRPayload {
    index?: number;
    limit?: number;
    searchTerm?: string;
    fromDate?: string;
    toDate?: string;
    status?: string;
    glAccount?: string[];
    materialCode?: string[];
    costCenter?: string[];
}

export interface UpdateMaterialPRResponse {
    success: boolean;
    message: string;
    prNumber?: string;
}

export const fetchSuppliers = async (payload?: PaginatedFilterPayload): Promise<any | null> => {
    try {
        const params = {
            index: payload?.page !== undefined ? payload.page : 1,
            limit: payload?.page_size || 100,
            ...(payload?.search && { searchTerm: payload.search }),
        };

        const response = await PoExcel.get<any>("/api/v1/GetSupplierName", {
            params,
        });

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }

        const datas = response?.data;
        const supplierStrings = datas;

        return {
            suppliers: supplierStrings,
            pagination: {
                page: params.index,
                page_size: params.limit,
                total: supplierStrings.length,
                total_pages: 1,
            },
        };
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
            const errData = error.response.data;
            return {
                statusCode: errData.statusCode || errData.status_code || 500,
                message: errData.message || "Unknown error",
                description: errData.description || "No details provided",
            };
        }
        return {
            statusCode: 500,
            message: "Unexpected Error",
            description:
                error.message || `Something went wrong while fetching suppliers.`,
        };
    }
};

export const vendorData = async (payload?: PaginatedFilterPayload): Promise<any | null> => {
    try {
        const params = {
            index: payload?.page !== undefined ? payload.page : 1,
            limit: payload?.page_size || 100,
            ...(payload?.search && { searchTerm: payload.search }),
        };

        const response = await PoExcel.get<any>("/api/v1/GetVenueName", {
            params,
        });

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }
        const datas = response?.data;
        const supplierStrings = datas?.map((item: any) => item?.venueName);
        return {
            suppliers: supplierStrings,
            pagination: {
                page: params.index,
                page_size: params.limit,
                total: supplierStrings.length,
                total_pages: 1,
            },
        };
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
            const errData = error.response.data;
            return {
                statusCode: errData.statusCode || errData.status_code || 500,
                message: errData.message || "Unknown error",
                description: errData.description || "No details provided",
            };
        }
        return {
            statusCode: 500,
            message: "Unexpected Error",
            description:
                error.message || `Something went wrong while fetching venues.`,
        };
    }
};

export const getDetails = async (payload?: any): Promise<any | null> => {
    try {
        const params = {
            ...(payload?.search && { venueName: payload?.search?.trim() }),
        };
        const response = await PoExcel.get<any>("/api/v1/GetVenueDetails", {
            params,
        });

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }

        const datas = response?.data;

        return {
            suppliers: datas,
        };
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
            const errData = error.response.data;
            return {
                statusCode: errData.statusCode || errData.status_code || 500,
                message: errData.message || "Unknown error",
                description: errData.description || "No details provided",
            };
        }
        return {
            statusCode: 500,
            message: "Unexpected Error",
            description:
                error.message || `Something went wrong while fetching details.`,
        };
    }
};

export const getPRSmartDefaults = async (): Promise<any> => {
    try {
        const response = await PoExcel.get<any>(
            `/api/v1/GET_PR_SMART_DEFAULTS`,
            {
                withCredentials: true,
            }
        );

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }

        return response.data;
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
            const errData = error.response.data;
            return {
                statusCode: errData.statusCode || errData.status_code || 500,
                message: errData.message || "Unknown error",
                description: errData.description || "No details provided",
            };
        }

        return {
            statusCode: 500,
            message: 'Unexpected Error',
            description: error.message || 'Something went wrong while fetching PR smart defaults.',
        };
    }
};



export const fetchCategoriesData = async (payload?: {
  page?: number;
  page_size?: number;
  search?: string;
  companyCode?: string;
}): Promise<any | null> => {
  try {
    const params = {
      index: payload?.page !== undefined ? payload.page : 0,
      limit: payload?.page_size || 10,
      ...(payload?.search && { searchTerm: payload.search }),
      ...(payload?.companyCode && { companyCode: payload.companyCode }),
    };

    const response = await PoExcel.get<any>("/api/v1/GetPublicCategoryName", {
      params,
    });

    if (isErrorResponse(response.data)) {
      if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
        (window as any).handleUnauthorized?.();
        return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
      }
      return response.data;
    }

    const datas = response?.data;
    let categories: string[] = [];
    if (Array.isArray(datas)) {
      categories = datas.map((item: any) => item.categoryName || item).filter(Boolean);
    }

    return {
      categories,
      pagination: {
        page: params.index,
        page_size: params.limit,
        total: categories.length,
        total_pages: 1,
      },
    };
  } catch (error: any) {
    const statusCode = error?.response?.status || error?.status;
    if (statusCode === 401) {
      (window as any).handleUnauthorized?.();
    }

    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description: error.message || `Something went wrong while fetching categories.`,
    };
  }
};

export const vendorPublicRelationData = async (payload?: PaginatedFilterPayload): Promise<any | null> => {
  try {
    const params = {
      index: payload?.page !== undefined ? payload.page : 1,
      limit: payload?.page_size || 100,
      ...(payload?.search && { searchTerm: payload.search }),
    };

    const response = await PoExcel.get<any>("/api/v1/GetPublicVenueName", {
      params,
    });

    if (isErrorResponse(response.data)) {
      if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
        (window as any).handleUnauthorized?.();
        return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
      }
      return response.data;
    }
    const datas = response?.data;
    const supplierStrings = datas?.map((item: any) => item?.venueName);
    return {
      suppliers: supplierStrings,
      pagination: {
        page: params.index,
        page_size: params.limit,
        total: supplierStrings.length,
        total_pages: 1,
      },
    };
  } catch (error: any) {
    const statusCode = error?.response?.status || error?.status;
    if (statusCode === 401) {
      (window as any).handleUnauthorized?.();
    }

    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description:
        error.message || `Something went wrong while fetching venues.`,
    };
  }
};
export interface SuccessResponseDto {
    statusCode: number;
    message: string;
    data?: any;
}

export interface ErrorResponseDto {
    statusCode: number;
    message: string;
    description: string;
}

export interface AssetDto {
    fileName: string;
    contentType: string;
    fileBytes: string;
    isSingletonAsset: boolean;
    entityType: string;
    assetType: string;
}

export interface LineItemDto {
    NumberInCollection: number;
    Venue?: string;
    Description: string;
    Quantity?: number;
    UOM?: string;
    amount?: number;
    Currency?: string;
    CommodityCode?: string;
    Vendor?: string;
    Contract?: string | null;
    PurchaseOrg?: string;
    GLAccount?: string;
    CostCenter?: string;
    MaterialCode?: string;
    NeedBy?: string;
    TaxCode?: string;
    AutoGRN?: boolean;
    TaxInclude?: boolean;
    VendorName?: string;
    AutoInvoices?: boolean;
    InvoiceID?: string | null;
    InvoiceDate?: string | null;
    InvoiceAttachment?: AssetDto[] | null;
    InvoiceComment?: string | null;
    ocrProceed?: boolean;
    serviceStartDate?: string;
    serviceEndDate?: string;
    autoSES?: boolean;
}

export interface MaterialPRDto {
    name?: string;
     headerComment?: string; 
    needBy?: string;
    isHeader?: boolean;
    lineItems?: LineItemDto[];
    teamReceived?: boolean;
}

export interface CreateMaterialPRPayload {
    PRRequests?: MaterialPRDto[];
    asset?: AssetDto[];
}


export const createMaterialPR = async (
    payload: CreateMaterialPRPayload
): Promise<SuccessResponseDto | ErrorResponseDto> => {
    try {
        const response = await PoExcel.post<SuccessResponseDto>(
            "/api/v1/MaterialPR",
            payload,
            { withCredentials: true }
        );

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }

        return response.data;
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
            const errData = error.response.data;
            return {
                statusCode: errData.statusCode || errData.status_code || 500,
                message: errData.message || "Unknown error",
                description: errData.description || "No details provided",
            };
        }
        return {
            statusCode: 500,
            message: "Unexpected Error",
            description:
                error.message || "Something went wrong while creating Material PR.",
        };
    }
};
export const createServicePR = async (
    payload: CreateMaterialPRPayload
): Promise<SuccessResponseDto | ErrorResponseDto> => {
    try {
        const response = await PoExcel.post<SuccessResponseDto>(
            "/api/v1/ServicePR",
            payload,
            { withCredentials: true }
        );

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }

        return response.data;
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
            const errData = error.response.data;
            return {
                statusCode: errData.statusCode || errData.status_code || 500,
                message: errData.message || "Unknown error",
                description: errData.description || "No details provided",
            };
        }
        return {
            statusCode: 500,
            message: "Unexpected Error",
            description:
                error.message || "Something went wrong while creating Material PR.",
        };
    }
};

export const createDigitalQuickPr = async (
  payload: CreateMaterialPRPayload
): Promise<SuccessResponseDto | ErrorResponseDto> => {
  try {
    const response = await PoExcel.post<SuccessResponseDto>(
      "/api/v2/DigitalQuickPR",
      payload,
      { withCredentials: true }
    );

    if (isErrorResponse(response.data)) {
      if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
        (window as any).handleUnauthorized?.();
        return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
      }
      return response.data;
    }

    return response.data;
  } catch (error: any) {
    const statusCode = error?.response?.status || error?.status;
    if (statusCode === 401) {
      (window as any).handleUnauthorized?.();
    }

    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description:
        error.message || "Something went wrong while creating Material PR.",
    };
  }
};

export const createMaterialPRDraft = async (
    payload: CreateMaterialPRPayload
): Promise<SuccessResponseDto | ErrorResponseDto> => {
    try {
        const response = await PoExcel.post<SuccessResponseDto>(
            "/api/v1/DraftMaterialPR",
            payload,
            { withCredentials: true }
        );

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }

        return response.data;
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
            const errData = error.response.data;
            return {
                statusCode: errData.statusCode || errData.status_code || 500,
                message: errData.message || "Unknown error",
                description: errData.description || "No details provided",
            };
        }
        return {
            statusCode: 500,
            message: "Unexpected Error",
            description:
                error.message || "Something went wrong while creating Material PR.",
        };
    }
};

export interface UploadExcelDraftResponse {
    totalRows: number;
    successfulUploads: number;
    failedUploads: number;
    errorResponses?: ErrorResponseDto[];
}

export const uploadExcelDraftMaterialPR = async (file: File): Promise<UploadExcelDraftResponse | ErrorResponseDto> => {
    try {
        const formData = new FormData();
        formData.append('excelFile', file);

        const response = await PoExcel.post<any>(
            "/api/v1/upload-excel-draft-material-PR",
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                withCredentials: true,
            }
        );

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }

        // Response example in swagger is plain text with the counts; try to return parsed body if present
        return response.data as UploadExcelDraftResponse;
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
            const errData = error.response.data;
            return {
                statusCode: errData.statusCode || errData.status_code || 500,
                message: errData.message || "Unknown error",
                description: errData.description || "No details provided",
            };
        }
        return {
            statusCode: 500,
            message: "Unexpected Error",
            description:
                error.message || "Something went wrong while uploading the Excel file.",
        };
    }
};

export const getAllPRMaterialPR = async (payload?: {
    index?: number;
    limit?: number;
    searchTerm?: string;
}): Promise<any> => {
    try {
        const body = {
            index: payload?.index ?? 0,
            limit: payload?.limit ?? 10,
            searchTerm: payload?.searchTerm
        };
        const response = await PoExcel.post<any>(`/api/v2/GetAllMaterialPR`, body);

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }

        return response.data;
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
            const errData = error.response.data;
            return {
                statusCode: errData.statusCode || errData.status_code || 500,
                message: errData.message || "Unknown error",
                description: errData.description || "No details provided",
            };
        }
        return {
            statusCode: 500,
            message: "Unexpected Error",
            description:
                error.message || "Something went wrong while fetching Material PR.",
        };
    }
};
export const fetchCrossChargeProperties = async (payload?: {
  page?: number;
  page_size?: number;
  search?: string;
  companyCode?: string;
}): Promise<any | null> => {
  try {
    const params = {
      index: payload?.page !== undefined ? payload.page : 0,
      limit: payload?.page_size || 10,
      ...(payload?.search && { searchTerm: payload.search }),
      ...(payload?.companyCode && { companyCode: payload.companyCode }),
    };

    const response = await PoExcel.get<any>("/api/v1/GetPropertyCrossChargeName", {
      params,
    });

    if (isErrorResponse(response.data)) {
      if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
        (window as any).handleUnauthorized?.();
        return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
      }
      return response.data;
    }

    const datas = response?.data;
    let properties = [];
    if (Array.isArray(datas)) {
      properties = datas.map((item: any) => {
        if (typeof item === 'string') return item;
        return item.propertyCrossChargeName || item.venueName || item.propertyName || item.name || '';
      }).filter(Boolean);
    }

    return {
      suppliers: properties,
      pagination: {
        page: params.index,
        page_size: params.limit,
        total: properties.length,
        total_pages: 1,
      },
    };
  } catch (error: any) {
    const statusCode = error?.response?.status || error?.status;
    if (statusCode === 401) {
      (window as any).handleUnauthorized?.();
    }

    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description:
        error.message || `Something went wrong while fetching cross charge properties.`,
    };
  }
};
export const getPublicDetails = async (payload?: any): Promise<any | null> => {
  try {
    const params = {
      ...(payload?.search && { venueName: payload?.search?.trim() }),
    };
    const response = await PoExcel.get<any>("/api/v1/GetPublicVenueDetails", {
      params,
    });

    if (isErrorResponse(response.data)) {
      if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
        (window as any).handleUnauthorized?.();
        return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
      }
      return response.data;
    }

    const datas = response?.data;

    return {
      suppliers: datas,
    };
  } catch (error: any) {
    const statusCode = error?.response?.status || error?.status;
    if (statusCode === 401) {
      (window as any).handleUnauthorized?.();
    }

    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description:
        error.message || `Something went wrong while fetching details.`,
    };
  }
};
export const fetchCrossDetailByName = async (payload?:{
  venueName?:string;
  companyCode?:string;
}): Promise<any | null> =>{
  try {
    const params ={
      ...(payload?.companyCode && {companyCode :  payload.companyCode}),
      ...(payload?.venueName && {venueName :  payload.venueName})
    }
    const response = await PoExcel.get<any>("/api/v2/GetCrossChargeDetailsByName",{
      params,
    });
    
    if (isErrorResponse(response.data)) {
      if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
        (window as any).handleUnauthorized?.();
        return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
      }
      return response.data;
    }
   return response?.data;

  } catch (error:any) {
    const statusCode = error?.response?.status || error?.status;
    if (statusCode === 401) {
      (window as any).handleUnauthorized?.();
    }

    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description:
        error.message || `Something went wrong while fetching cross charge properties.`,
    };
  }
}
export interface UpdateLineItemDto {
    numberInCollection?: number;
    quantity?: number;
    lineItemNumber?: number;
    deliverTo?: string;
    needBy?: string;
    type?: string;
    venue?: string;
    description?: string;
    manPartNumber?: string;
    vendor?: string;
    contract?: string;
    supplierPartAuxiliaryID?: string;
    uom?: string;
    price?: number;
    autoGRN?: boolean;
    autoInvoices?: boolean;
    currency?: string;
    commodityDomain?: string;
    commodityCode?: string;
    preparerPasswordAdapter?: string;
    requesterPasswordAdapter?: string;
    materialCode?: string;
    itemCategory?: string;
    purchaseOrg?: string;
    purchaseGroup?: string;
    shipTo?: string;
    billingAddress?: string;
    supplier?: string;
    supplierLocation?: string;
    costCenter?: string;
    companyCode?: string;
    glAccount?: string;
    procurementUnit?: string;
    glAccountCompanyCode?: string;
    costCenterCompanyCode?: string;
    accountType?: string;
    amount?: number;
    title?: string;
    shipToPlant?: string;
    billTo?: string;
    taxCode?: string;
    deliveryDate?: string;
}

export interface UpdateMaterialPRRequestDto {
    uniqueName?: string;
    headerComment?: string;
    defaultDeliverTo?: string;
    needBy?: string;
    venue?: string;
    lineItems?: UpdateLineItemDto[];
    attachments?: any[];
    isUpdate?: boolean;
}

export interface UpdateMaterialPRPayload {
    isUpdate: boolean;
    prRequests: UpdateMaterialPRRequestDto[];
    asset?: AssetDto[];
}

export const updateMaterialPR = async (
    payload: UpdateMaterialPRPayload
): Promise<SuccessResponseDto | ErrorResponseDto> => {
    try {
        const response = await PoExcel.post<SuccessResponseDto>(
            `/api/v1/MaterialPR`,
            payload,
            { withCredentials: true }
        );

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }

        return response.data;
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
            const errData = error.response.data;
            return {
                statusCode: errData.statusCode || errData.status_code || 500,
                message: errData.message || "Unknown error",
                description: errData.description || "No details provided",
            };
        }
        return {
            statusCode: 500,
            message: "Unexpected Error",
            description:
                error.message || `Something went wrong while updating Material PR.`,
        };
    }
};

export const getAllDraftMaterialPR = async (
    payload?: GetAllMaterialPRPayload
): Promise<any> => {
    try {
        const requestBody = {
            index: payload?.index ?? 0,
            limit: payload?.limit ?? 10,
            ...(payload?.searchTerm && { searchTerm: payload.searchTerm }),
            ...(payload?.fromDate && { fromDate: payload.fromDate }),
            ...(payload?.toDate && { toDate: payload.toDate }),
            ...(payload?.status && { status: payload.status }),
            ...(payload?.glAccount?.length && { glAccount: payload.glAccount }),
            ...(payload?.materialCode?.length && { materialCode: payload.materialCode }),
            ...(payload?.costCenter?.length && { costCenter: payload.costCenter }),
        };

        const response = await PoExcel.post(
            "/api/v1/GetAllDraftMaterialPR",
            requestBody
        );

        return response.data;
    } catch (error: any) {
        if (error?.response?.status === 401) {
            (window as any).handleUnauthorized?.();
        }

        return {
            statusCode: error?.response?.status || 500,
            message: "Unexpected Error",
        };
    }
};

export const deleteDraftMaterialPR = async (prNumber: string): Promise<any> => {
    try {
        const response = await PoExcel.delete<any>(`/api/v1/DraftMaterialPR/${prNumber}`, {
            withCredentials: true
        });

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }

        return response.data;
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
            const errData = error.response.data;
            return {
                statusCode: errData.statusCode || errData.status_code || 500,
                message: errData.message || "Unknown error",
                description: errData.description || "No details provided",
            };
        }
        return {
            statusCode: 500,
            message: "Unexpected Error",
            description:
                error.message || "Something went wrong while deleting draft PR.",
        };
    }
};


/**
 * Fetch multiple assets using the bulk endpoint
 * NOTE: Does NOT remove duplicates - we need to fetch the same attachment multiple times
 * if it's attached to multiple line items
 * @param assetIds - Array of asset IDs to fetch (may contain duplicates)
 * @returns Promise with array of asset data
 */
export const fetchAssetsBulk = async (
    assetIds: string[]
): Promise<any[]> => {
    try {
        if (!assetIds || assetIds.length === 0) {
            return [];
        }
        const response = await PoExcel.post<any>(
            `/api/v1/asset/list`,
            assetIds,  // Send array with potential duplicates
            { withCredentials: true }
        );

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return [];
            }
            return [];
        }

        return response.data || [];
    } catch (error: any) {
        if (error?.response?.status === 401) {
            (window as any).handleUnauthorized?.();
        }
        return [];
    }
};
export const createLegalPR = async (
    payload: CreateMaterialPRPayload
): Promise<SuccessResponseDto | ErrorResponseDto> => {
    try {
        const response = await PoExcel.post<SuccessResponseDto>(
            "/api/v1/LegalDepartmentMaterialPR",
            payload,
            { withCredentials: true }
        );

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }

        return response.data;
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
            const errData = error.response.data;
            return {
                statusCode: errData.statusCode || errData.status_code || 500,
                message: errData.message || "Unknown error",
                description: errData.description || "No details provided",
            };
        }
        return {
            statusCode: 500,
            message: "Unexpected Error",
            description:
                error.message || "Something went wrong while creating Material PR.",
        };
    }
};
export const getLegalVenue = async (payload?: PaginatedFilterPayload): Promise<any | null> => {
    try {
        const params = {
            index: payload?.page !== undefined ? payload.page : 1,
            limit: payload?.page_size || 100,
            ...(payload?.search && { searchTerm: payload.search }),
        };

        const response = await PoExcel.get<any>("/api/v1/GetAllVenueName", {
            params,
        });

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }
        const datas = response?.data;
        const supplierStrings = datas?.map((item: any) => item?.venueName);
        return {
            suppliers: supplierStrings,
            pagination: {
                page: params.index,
                page_size: params.limit,
                total: supplierStrings.length,
                total_pages: 1,
            },
        };
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
            const errData = error.response.data;
            return {
                statusCode: errData.statusCode || errData.status_code || 500,
                message: errData.message || "Unknown error",
                description: errData.description || "No details provided",
            };
        }
        return {
            statusCode: 500,
            message: "Unexpected Error",
            description:
                error.message || `Something went wrong while fetching venues.`,
        };
    }
};
export const getLegalVenueDetails = async (payload?: any): Promise<any | null> => {
    try {
        const params = {
            ...(payload?.search && { venueName: payload?.search?.trim() }),
        };
        const response = await PoExcel.get<any>("/api/v1/GetLegalVenueDetails", {
            params,
        });

        if (isErrorResponse(response.data)) {
            if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
                (window as any).handleUnauthorized?.();
                return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
            }
            return response.data;
        }

        const datas = response?.data;

        return {
            suppliers: datas,
        };
    } catch (error: any) {
        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) {
            (window as any).handleUnauthorized?.();
        }

        if (error.response && error.response.data) {
            const errData = error.response.data;
            return {
                statusCode: errData.statusCode || errData.status_code || 500,
                message: errData.message || "Unknown error",
                description: errData.description || "No details provided",
            };
        }
        return {
            statusCode: 500,
            message: "Unexpected Error",
            description:
                error.message || `Something went wrong while fetching details.`,
        };
    }
};


export const legalMaterialData = async (payload?: PaginatedFilterPayload): Promise<any | null> => {
  try {
    const params = {
      index: payload?.page !== undefined ? payload.page : 1,
      limit: payload?.page_size || 100,
      ...(payload?.search && { searchTerm: payload.search }),
    };
    const response = await PoExcel.get<any>("/api/v1/GetAllLegalMaterialCodes", {
      params,
    });
    if (isErrorResponse(response.data)) {
      if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
        (window as any).handleUnauthorized?.();
        return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
      }
      return response.data;
    }
    const datas = response?.data;
    const materials = datas?.map((item: any) => ({
      materialCode: item?.materialCode,
      description: item?.description
    }));
    
    return {
      materials: materials || [],
      pagination: {
        page: params.index,
        page_size: params.limit,
        total: (materials || []).length,
        total_pages: 1,
      },
    };
  } catch (error: any) {
    const statusCode = error?.response?.status || error?.status;
    if (statusCode === 401) {
      (window as any).handleUnauthorized?.();
    }

    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description:
        error.message || `Something went wrong while fetching material codes.`,
    };
  }
};

export const getLegalMaterialDetails = async (materialcode: string): Promise<any | null> => {
  try {
    const response = await PoExcel.get<any>("/api/v1/GetAllDetailsLegalMaterialCodes", {
      params: { materialcode },
    });
    if (isErrorResponse(response.data)) {
      if (response.data.statusCode === 401 || (response.data as any).status_code === 401) {
        (window as any).handleUnauthorized?.();
        return { statusCode: 401, message: 'Unauthorized', description: 'Session expired' };
      }
      return response.data;
    }
    return response?.data;
  } catch (error: any) {
    const statusCode = error?.response?.status || error?.status;
    if (statusCode === 401) {
      (window as any).handleUnauthorized?.();
    }

    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.statusCode || errData.status_code || 500,
        message: errData.message || "Unknown error",
        description: errData.description || "No details provided",
      };
    }
    return {
      statusCode: 500,
      message: "Unexpected Error",
      description:
        error.message || `Something went wrong while fetching material details.`,
    };
  }
};