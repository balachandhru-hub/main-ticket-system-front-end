import { client } from "./SpendApi";

export interface SurveyQuestionPayload {
  question_id?: number | string;
  question: string;
  type: string;
}

export interface CreateTemplatePayload {
  template_name: string;
  template_id?: string;
  questions: SurveyQuestionPayload[];
}

export interface GetTemplateDetailsParams {
  template_id?: string | null;
  template_name?: string | null;
}

export interface EnterTemplateAnswersPayload {
  survey_id?: string | number;
  from_id: string;
  to_id: string;
  template_name: string;
  template_id?: string;
  answers: Record<string, any>;
}

export interface GetSurveyDetailsParams {
  survey_id: string | number;
}

export interface FetchTemplateNamesPayload {
  type: string;
}

export interface FetchTemplateNamesResponse {
  status: string;
  type: string;
  total_count: number;
  template_names: string[];
}

export interface UpdateTemplateQuestionsPayload {
  template_name: string;
  questions: SurveyQuestionPayload[];
}

export interface UpdateTemplateQuestionsResponse {
  status: string;
  message: string;
  template_id?: string;
  template_name?: string;
  userId?: string | null;
  questions?: SurveyQuestionPayload[];
}

/**
 * 5. Fetch Template Names API
 * POST /api/spend_analysis/api/v1/template_name
 */
export const fetchTemplateNames = async (type: string = "PROCUREMENT_PERFORMANCE"): Promise<FetchTemplateNamesResponse> => {
  try {
    const response = await client.post<FetchTemplateNamesResponse>('api/spend_analysis/api/v1/template_name', { type });
    return response.data as FetchTemplateNamesResponse;
  } catch (error: any) {
    console.error('Error fetching template names:', error);
    throw error;
  }
};

/**
 * 6. Update Template Questions API
 * POST /api/spend_analysis/api/v1/update template questions
 */
export const updateTemplateQuestions = async (
  payload: UpdateTemplateQuestionsPayload
): Promise<UpdateTemplateQuestionsResponse> => {
  try {
    const response = await client.post<UpdateTemplateQuestionsResponse>(
      'api/spend_analysis/api/v1/update template questions',
      payload
    );
    return response.data as UpdateTemplateQuestionsResponse;
  } catch (error: any) {
    console.error('Error updating template questions:', error);
    throw error;
  }
};

export const createSurveyTemplate = async (payload: CreateTemplatePayload): Promise<any> => {
  try {
    const response = await client.post('api/spend_analysis/api/v1/Create_template', payload);
    return response.data;
  } catch (error: any) {
    console.error('Error creating survey template:', error);
    throw error;
  }
};

/**
 * 2. Get Template Details API
 * GET /api/spend_analysis/api/v1/get_template_details
 */
export const getTemplateDetails = async (params?: GetTemplateDetailsParams): Promise<any> => {
  try {
    const response = await client.get('api/spend_analysis/api/v1/get_template_details', {
      params
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching template details:', error);
    throw error;
  }
};

/**
 * 3. Enter Template Answers API
 * PUT /api/spend_analysis/api/v1/enter template answers
 */
export const enterTemplateAnswers = async (
  payload: EnterTemplateAnswersPayload
): Promise<any> => {
  try {
    const response = await client.put(
      'api/spend_analysis/api/v1/enter template answers',
      payload
    );
    return response.data;
  } catch (error: any) {
    console.error('Error submitting template answers:', error);
    throw error;
  }
};

/**
 * 4. Get Survey Details API
 * GET /api/spend_analysis/api/v1/get_survey_details?survey_id=...
 */
export const getSurveyDetails = async (surveyId: string | number): Promise<any> => {
  try {
    const response = await client.get('api/spend_analysis/api/v1/get_survey_details', {
      params: { survey_id: surveyId }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching survey details:', error);
    throw error;
  }
};
