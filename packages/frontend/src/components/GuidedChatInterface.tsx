import { useState, useRef, useEffect } from 'react';
import { EmbeddedQuestion } from '../services/guidedReview.service';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  embeddedQuestion?: EmbeddedQuestion | null;
}

interface GuidedChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  onAnswerQuestion: (question: EmbeddedQuestion, answer: string) => Promise<void>;
  isLoading: boolean;
  topic: string;
  subject: string;
  questionsAttempted: number;
  questionsCorrect: number;
  onEndSession: () => void;
  disabled?: boolean;
}

export const GuidedChatInterface = ({
  messages,
  onSendMessage,
  onAnswerQuestion,
  isLoading,
  topic,
  subject,
  questionsAttempted,
  questionsCorrect,
  onEndSession,
  disabled = false,
}: GuidedChatInterfaceProps) => {
  const [inputValue, setInputValue] = useState('');
  const [activeQuestion, setActiveQuestion] = useState<EmbeddedQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check for embedded questions in the latest message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.embeddedQuestion) {
      setActiveQuestion(lastMessage.embeddedQuestion);
      setSelectedAnswer(null);
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || disabled) return;

    const message = inputValue.trim();
    setInputValue('');
    await onSendMessage(message);
  };

  const handleAnswerSubmit = async () => {
    if (!activeQuestion || !selectedAnswer || isLoading) return;

    await onAnswerQuestion(activeQuestion, selectedAnswer);
    setActiveQuestion(null);
    setSelectedAnswer(null);
  };

  const accuracy = questionsAttempted > 0 
    ? Math.round((questionsCorrect / questionsAttempted) * 100) 
    : 0;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-xl">
        <div>
          <h3 className="font-semibold text-gray-900">{topic}</h3>
          <p className="text-sm text-gray-500">{subject}</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Progress Indicators */}
          {questionsAttempted > 0 && (
            <div className="text-sm text-gray-600">
              <span className="font-medium text-emerald-600">{questionsCorrect}</span>
              <span className="text-gray-400">/</span>
              <span>{questionsAttempted}</span>
              <span className="text-gray-400 ml-1">({accuracy}%)</span>
            </div>
          )}
          <button
            onClick={onEndSession}
            className="text-sm px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-lg transition-colors"
          >
            End Session
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[500px]">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>Starting guided review session...</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {/* Parse and render message with markdown-like formatting */}
              <div className="prose prose-sm max-w-none">
                {message.content.split('\n').map((line, i) => (
                  <p key={i} className={`${i > 0 ? 'mt-2' : ''} ${message.role === 'user' ? 'text-white' : ''}`}>
                    {formatMessageContent(line, message.role === 'user')}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Active Question Widget */}
        {activeQuestion && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mx-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <span className="font-medium text-blue-900">Practice Question</span>
            </div>
            
            <p className="text-gray-800 mb-4">{activeQuestion.text}</p>
            
            <div className="space-y-2 mb-4">
              {activeQuestion.options.map((option) => (
                <button
                  key={option.label}
                  onClick={() => setSelectedAnswer(option.label)}
                  disabled={isLoading}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedAnswer === option.label
                      ? 'border-blue-500 bg-blue-100'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="font-medium mr-2">{option.label})</span>
                  {option.text}
                </button>
              ))}
            </div>
            
            <button
              onClick={handleAnswerSubmit}
              disabled={!selectedAnswer || isLoading}
              className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
                selectedAnswer && !isLoading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Checking...' : 'Submit Answer'}
            </button>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl px-4 py-3">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex space-x-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={activeQuestion ? "Answer the question above, or type a message..." : "Ask a question or type your response..."}
            disabled={isLoading || disabled}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading || disabled}
            className="px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

// Helper function to format message content with basic markdown
function formatMessageContent(content: string, isUser: boolean): React.ReactNode {
  // Bold text: **text**
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className={isUser ? 'text-white' : 'text-gray-900'}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

