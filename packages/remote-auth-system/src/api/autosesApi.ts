import axios from 'axios';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';

const instance = axios.create({
  baseURL: import.meta.env.VITE_AUTO_SES_URL,
    timeout: 500000,
  headers: {
    'Content-Type': 'application/json',
  },
    // withCredentials: true
});

export default instance;

export interface RecordItem {
  id: number;
  service_sheet_number: string;
  purchase_order_id: string;
  epid: string | null;
  line_item: number;
  quantity: number | null;
  unit_of_measure: string | null;
  material_code: string | null;
  Service_Description: string;
  unit_price_currency: string | null;
  company_code: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  date_created: string;
  date_updated: string | null;
  created_by: string | null;
  updated_by: string | null;
  is_active: boolean;
  domain_id: string | null;
  account_category: string | null;
  asset_code: string | null;
  commodity_code: string | null;
  contract_id: string | null;
  cost_center: string | null;
  erpcommodity_code: string | null;
  external_line_number: string | null;
  glaccount: string | null;
  item_category: string | null;
  line_type_category: string | null;
  need_by_date: string | null;
  parent_line_number: string | null;
  price: number | null;
  price_currency: string | null;
  purchase_group: string | null;
  purchase_org: string | null;
  requisition_id: string | null;
  requisition_requester: string | null;
  service_end_date: string | null;
  service_max_amount: number | null;
  service_start_date: string | null;
  tax_amount_in_base_currency: number | null;
  tax_code: string | null;
  tax_percentage: number | null;
  unit_price: number | null;
  unit_price_in_base_price: number | null;
  version: string | null;
  header_tittle: string | null;
  order_date: string | null;
  status: string;
  service_sheet_number_generated: string | null;
  Flag: number;
  process_datetime: string | null;
  external_reference_id: string | null;
  comments: string | null;
  process_status: string | null;
  rejected_time: string | null;
  reject_status: string | null;
  start_date: string | null;
  duration_type: string | null;
  duration_flag: number | null;
  execution_time: string | null;
}

export interface ScheduleItem {
  purchase_order_id: string;
  start_date: string;
  duration_type: string;
  next_execution_time: string | null;
}const now = new Date();

// Current Date: YYYY-MM-DD
const currentDate = now.toISOString().split("T")[0];



export const saveAutoses = async (po: string, date: string, scheduleDate: string) => {
  try {
    const response = await instance.post<any>(
      "execute",
      {
        purchase_order_id: po,
        duration_type: date =="select frequency" ? "":date,
        start_date: scheduleDate? scheduleDate :currentDate,
        start_time: "03:00"
      },
      // { withCredentials: true }
    );

    return response.data;
  } catch (error) {
 
    throw error;
  }
};
export const editAutoses = async (payload:any) => {
  try {
    const response = await instance.post<any>(
      "edit-schedule",
     payload,
      // { withCredentials: true }
    );

    return response.data;
  } catch (error) {
   
    throw error;
  }
};
export const fetchRecords = async (): Promise<RecordItem[] | ErrorResponseDto> => {
  try {
    const response = await instance.get<RecordItem[]>('records');
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching domain details.',
    };
  }
};

export const fetchNextSchedules = async (): Promise<ScheduleItem[] | ErrorResponseDto> => {
  try {
    const response = await instance.get<ScheduleItem[]>('schedules/next-10');
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      return {
        statusCode: errData.status_code || 500,
        message: errData.message || 'Unknown error',
        description: errData.description || 'No details provided',
      };
    }

    return {
      statusCode: 500,
      message: 'Unexpected Error',
      description: error.message || 'Something went wrong while fetching schedules.',
    };
  }
};
