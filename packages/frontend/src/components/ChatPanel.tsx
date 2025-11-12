import { useState, useRef, useEffect } from 'react';
import { Question, User } from '../types';
import { aiService, QuestionContext, StudentContext, ChatMessage } from '../services/ai.service';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  question: Question;
  answerResult?: {
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string | null;
  } | null;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ question, answerResult }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset chat when question changes
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: `Hi! I'm here to help you understand this ${question.subject} question. Feel free to ask me anything about:
        
• How to approach this problem
• Clarification on any concepts
• Step-by-step explanation
• Tips and strategies

What would you like to know?`,
        timestamp: new Date(),
      },
    ]);
    setInput('');
  }, [question._id]);

  useEffect(() => {
    // Inject answer result into chat
    if (answerResult) {
      const resultMessage: Message = {
        id: `result-${Date.now()}`,
        role: 'assistant',
        content: answerResult.isCorrect
          ? `🎉 **Correct!** Great job! You got it right.

**Correct Answer:** ${answerResult.correctAnswer}

${answerResult.explanation ? `**Explanation:** ${answerResult.explanation}` : ''}

Would you like me to explain the strategy behind this question or discuss any concepts?`
          : `❌ **Incorrect**

**Correct Answer:** ${answerResult.correctAnswer}

${answerResult.explanation ? `**Explanation:** ${answerResult.explanation}` : 'The answer was not correct.'}

Would you like me to help you understand why? Feel free to ask questions about:
• The correct approach
• Key concepts
• Common mistakes to avoid`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, resultMessage]);
    }
  }, [answerResult]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setLoading(true);

    try {
      // Build context for AI
      const questionContext: QuestionContext = {
        questionText: question.content.questionText,
        subject: question.subject,
        difficulty: question.difficulty,
        correctAnswer: question.content.correctAnswer,
        explanation: question.content.explanation,
        tags: question.tags,
      };

      const studentContext: StudentContext = {
        level: user.learningProfile.currentLevel,
      };

      // Convert message history to AI format
      const chatHistory: ChatMessage[] = messages
        .slice(1) // Skip initial greeting
        .map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        }));

      // Get AI response
      const aiResponse = await aiService.getCoachingResponse({
        userMessage: currentInput,
        questionContext,
        studentContext,
        chatHistory,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Failed to get AI response:', error);
      
      // Fallback error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm having trouble connecting to the AI service right now. Please make sure the AI backend is running on port 3002. You can try asking your question again in a moment.`,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="card h-full flex flex-col">
      {/* Chat Header */}
      <div className="pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">AI Coach</h3>
        <p className="text-sm text-gray-600">Ask me anything about this question</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p
                className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-primary-100' : 'text-gray-500'
                }`}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question..."
            className="input-field flex-1"
            disabled={loading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || loading}
            className="btn-primary px-6"
          >
            Send
          </button>
        </div>

        {/* Quick Questions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setInput('How do I approach this?')}
            className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
          >
            How do I approach this?
          </button>
          <button
            onClick={() => setInput('Can you give me a hint?')}
            className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
          >
            Can you give me a hint?
          </button>
          <button
            onClick={() => setInput('Explain the concept')}
            className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
          >
            Explain the concept
          </button>
        </div>
      </div>
    </div>
  );
};

