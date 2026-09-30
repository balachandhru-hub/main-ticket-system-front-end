import axios from 'axios';

const chatbotInstance = axios.create({
  baseURL: import.meta.env.VITE_CHATBOT_API_BASE_URL,
  timeout: 500000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': import.meta.env.VITE_CHATBOT_API_KEY,
  },
});

export default chatbotInstance;
