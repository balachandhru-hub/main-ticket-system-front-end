import './Chatbot.css';
import { FaRobot, FaUserCircle } from 'react-icons/fa';
import { useEffect, useRef, useState } from 'react';
import { sendChatMessage, getSectionQuestions, getQuestionAnswer } from '../api/chatApi';

interface Message {
  type: 'bot' | 'user';
  text: string;
  sections?: string[];
  questions?: string[];
  selectedSection?: string;
  selectedQuestion?: string;
}

const Chatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    { type: 'bot', text: 'Hi there! 👋 How can I help you today?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const userMessage: Message = { type: 'user', text: trimmedInput };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const typingPlaceholder: Message = { type: 'bot', text: 'typing' };
    setMessages((prev) => [...prev, typingPlaceholder]);

    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      const response = await sendChatMessage(trimmedInput);

      if (response.answer.includes("couldn't find a relevant answer")) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            type: 'bot',
            text: response.answer,
            sections: response.sections,
          };
          return updated;
        });
      } else {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { type: 'bot', text: response.answer };
          return updated;
        });
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          type: 'bot',
          text: '⚠️ Something went wrong. Please try again.',
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSectionSelect = async (section: string, messageIndex: number) => {
    setLoading(true);
    const typingPlaceholder: Message = { type: 'bot', text: 'typing' };
    setMessages((prev) => [...prev, typingPlaceholder]);

    try {
      const response = await getSectionQuestions(section);
      setMessages((prev) => {
        const updated = [...prev];
        // Update the original message to only show the selected section
        updated[messageIndex] = {
          ...updated[messageIndex],
          sections: [section], // Keep only the selected section
          selectedSection: section,
        };
        // Replace typing placeholder with questions
        updated[updated.length - 1] = {
          type: 'bot',
          text: `Questions for ${section}:`,
          questions: response.questions,
          selectedSection: section,
        };
        return updated;
      });
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          type: 'bot',
          text: '⚠️ Something went wrong while fetching questions. Please try again.',
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionSelect = async (section: string, question: string, messageIndex: number) => {
    setLoading(true);
    const typingPlaceholder: Message = { type: 'bot', text: 'typing' };
    setMessages((prev) => [...prev, typingPlaceholder]);

    try {
      const response = await getQuestionAnswer(section, question);
      setMessages((prev) => {
        const updated = [...prev];
        // Update the message with questions to only show the selected question
        updated[messageIndex] = {
          ...updated[messageIndex],
          questions: [question], // Keep only the selected question
          selectedQuestion: question,
        };
        // Replace typing placeholder with the answer
        updated[updated.length - 1] = {
          type: 'bot',
          text: response.answer,
        };
        return updated;
      });
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          type: 'bot',
          text: '⚠️ Something went wrong while fetching the answer. Please try again.',
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="main-container">
    <div className="chatbot-container">
      <div className="chatbot-header">
        <h2>Chat Support</h2>
        <p>Your assistant is here to help you out</p>
      </div>

      <div className="chat-window">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.type}`}>
            <div className="chat-avatar">
              {msg.type === 'bot' ? (
                <FaRobot className="icon bot-icon" />
              ) : (
                <FaUserCircle className="icon user-icon" />
              )}
            </div>
            <div className="message-bubble">
              {msg.text === 'typing' ? (
                <span className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              ) : (
                <>
                  {msg.text}
                  {msg.sections && (
                    <div className="faq-sections">
                      {msg.sections.map((section) => (
                        <div
                          key={section}
                          className={`faq-section-item ${loading ? 'disabled' : ''}`}
                          onClick={() => !loading && handleSectionSelect(section, idx)}
                        >
                          {section}
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.questions && msg.selectedSection && (
                    <div className="faq-questions">
                      {msg.questions.map((question) => (
                        <div
                          key={question}
                          className={`faq-question-item ${loading ? 'disabled' : ''}`}
                          onClick={() => !loading && handleQuestionSelect(msg.selectedSection!, question, idx)}
                        >
                          {question}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="chat-input-section">
        <input
          type="text"
          className="chat-input"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
    </div>
  );
};

export default Chatbot;