import chatbotAxios from './axiosChatbot';
import type {SectionResponseDto} from '../Dto/SectionDto';
import type { ChatResponseDto} from '../Dto/ChatresponseDto'
import type { QuestionAnswerResponseDto} from '../Dto/QuestionanswerDto'

export const sendChatMessage = async (query: string): Promise<ChatResponseDto> => {
  const response = await chatbotAxios.post<ChatResponseDto>('/chatbot', { query });
  return response.data;
};

export const getSectionQuestions = async (section: string): Promise<SectionResponseDto> => {
  const response = await chatbotAxios.post<SectionResponseDto>('/sections', { section });
  return response.data;
};

export const getQuestionAnswer = async (section: string, question: string): Promise<QuestionAnswerResponseDto> => {
  const response = await chatbotAxios.post<QuestionAnswerResponseDto>('/question-answer', { section, question });
  return response.data;
};