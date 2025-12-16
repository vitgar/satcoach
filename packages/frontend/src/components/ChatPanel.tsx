import { useState, useRef, useEffect } from 'react';
import { Question } from '../types';
import { aiService, QuestionContext, StudentContext, ChatMessage } from '../services/ai.service';
import { useAuth } from '../contexts/AuthContext';
import { MathMarkdown } from './MathMarkdown';
import { MathSymbolPicker } from './MathSymbolPicker';

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
  onNextQuestion?: () => void;
  onPreviousQuestion?: () => void;
  currentIndex?: number;
  totalQuestions?: number;
  demoMode?: boolean;
  learnerState?: {
    currentLevel: number;
    studentType?: 'struggler' | 'intermediate' | 'advanced';
  };
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  question,
  answerResult,
  onNextQuestion,
  onPreviousQuestion,
  currentIndex,
  totalQuestions,
  demoMode = false,
  learnerState,
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([]);
  const [loadingClarifyingQuestions, setLoadingClarifyingQuestions] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Reset chat when question changes
    const greeting = demoMode
      ? `👋 Welcome to the SAT Coach demo mode!

Use the navigation controls above to move between the curated set of graph questions.
You can still review the explanation after submitting an answer, but live AI chat is temporarily disabled.`
      : `Hi! I'm here to help you understand this ${question.subject} question. Feel free to ask me anything about:
        
• How to approach this problem
• Clarification on any concepts
• Step-by-step explanation
• Tips and strategies

What would you like to know?`;

    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
      },
    ]);
    setInput('');
  }, [question._id, demoMode]);

  useEffect(() => {
    // Inject answer result into chat
    if (answerResult) {
      const resultMessage: Message = {
        id: `result-${Date.now()}`,
        role: 'assistant',
        content: answerResult.isCorrect
          ? `✅ **Correct!**

**Correct Answer:** ${answerResult.correctAnswer}

Great job! Would you like me to explain the strategy behind this question or discuss any concepts?`
          : `❌ **Incorrect**

**Correct Answer:** ${answerResult.correctAnswer}

Would you like me to help you understand this? Feel free to ask questions about:
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

  // Fetch clarifying questions when question changes or after a few messages
  useEffect(() => {
    if (demoMode) return;

    const fetchClarifyingQuestions = async () => {
      setLoadingClarifyingQuestions(true);
      try {
        const questionContext: QuestionContext = {
          questionText: question.content.questionText,
          subject: question.subject,
          difficulty: question.difficulty,
          correctAnswer: question.content.correctAnswer,
          explanation: question.content.explanation || '',
          tags: question.tags,
        };

        const studentContext: StudentContext = {
          level: learnerState?.currentLevel || 5,
          recentPerformance: learnerState?.studentType === 'struggler' ? 'struggling' : 
                            learnerState?.studentType === 'advanced' ? 'excelling' : 'average',
        };

        // Convert messages to ChatMessage format for context
        const chatHistory: ChatMessage[] = messages
          .filter(m => m.role !== 'assistant' || !m.content.includes('👋') && !m.content.includes('🎉') && !m.content.includes('❌'))
          .slice(-5)
          .map(m => ({
            role: m.role,
            content: m.content,
          }));

        const questions = await aiService.getClarifyingQuestions(
          questionContext,
          studentContext,
          chatHistory.length > 0 ? chatHistory : undefined
        );
        setClarifyingQuestions(questions);
      } catch (error) {
        console.error('Failed to fetch clarifying questions:', error);
        setClarifyingQuestions([]);
      } finally {
        setLoadingClarifyingQuestions(false);
      }
    };

    // Fetch after a short delay to allow messages to settle
    const timer = setTimeout(() => {
      fetchClarifyingQuestions();
    }, 500);

    return () => clearTimeout(timer);
  }, [question._id, messages.length, demoMode, learnerState]);

  const scrollToBottom = () => {
    // Scroll within the messages container, not the whole page
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    if (demoMode) {
      const infoMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content:
          "Live AI tutoring is paused for this demo. Use the Back and Next buttons to explore the pre-loaded graph questions.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, infoMessage]);
      setInput('');
      return;
    }

    if (!user) return;

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

      // Use learnerState if available (more accurate), otherwise fall back to user profile
      const studentLevel = learnerState?.currentLevel || user.learningProfile.currentLevel || 3;
      
      // Determine recent performance based on student type
      let recentPerformance: 'struggling' | 'average' | 'excelling' | undefined;
      if (learnerState?.studentType === 'struggler') {
        recentPerformance = 'struggling';
      } else if (learnerState?.studentType === 'advanced') {
        recentPerformance = 'excelling';
      } else {
        recentPerformance = 'average';
      }
      
      const studentContext: StudentContext = {
        level: studentLevel,
        recentPerformance,
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    // Shift+Enter allows new lines in textarea
  };

  const handleSymbolInsert = (symbol: string) => {
    if (!inputRef.current) return;

    const cursorPosition = inputRef.current.selectionStart || input.length;
    const textBefore = input.substring(0, cursorPosition);
    const textAfter = input.substring(cursorPosition);
    
    // Insert the symbol directly at cursor position
    const newText = textBefore + symbol + textAfter;
    
    setInput(newText);
    
    // Focus back on textarea and set cursor position after the inserted symbol
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPosition = cursorPosition + symbol.length;
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  return (
    <div className="card h-full flex flex-col min-h-0">
      {/* Chat Header */}
      <div className="pb-4 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {demoMode ? 'Graph Tutor (Demo Mode)' : 'AI Coach'}
            </h3>
            <p className="text-sm text-gray-600">
              {demoMode ? 'Use the navigation controls to explore curated graph questions.' : 'Ask me anything about this question'}
            </p>
          </div>
          {typeof currentIndex === 'number' &&
            typeof totalQuestions === 'number' &&
            totalQuestions > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={onPreviousQuestion}
                disabled={!onPreviousQuestion}
                className="px-3 py-1 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                ← Back
              </button>
              <span className="text-sm font-medium text-gray-700">
                {currentIndex + 1} / {totalQuestions}
              </span>
              <button
                onClick={onNextQuestion}
                disabled={!onNextQuestion}
                className="px-3 py-1 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          )}
          {onNextQuestion && (!totalQuestions || totalQuestions === undefined) && (
            <div className="flex items-center">
              <button
                onClick={onNextQuestion}
                className="px-3 py-1 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Next Question →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-auto py-4 space-y-4 pb-0">
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
              {message.role === 'user' ? (
                // User messages: simple text display
                <p className="text-sm whitespace-pre-wrap text-white">{message.content}</p>
              ) : (
                // AI messages: render with MathMarkdown for LaTeX support
                <div className="text-sm">
                  <MathMarkdown content={message.content} />
                </div>
              )}
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

        {/* Scroll anchor - no longer needed with scrollTop approach */}
      </div>

      {/* Input */}
      {!demoMode && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex space-x-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask a question..."
              className="input-field flex-1 min-h-[80px] max-h-[200px] resize-y"
              disabled={loading}
              rows={3}
            />
            <div className="flex flex-col space-y-2">
              <MathSymbolPicker onSymbolSelect={handleSymbolInsert} />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || loading}
                className="btn-primary px-6"
              >
                Send
              </button>
            </div>
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
              onClick={() => setInput('Explain the correct answer')}
              className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
            >
              Explain the correct answer
            </button>
            <button
              onClick={() => setInput('What did I do wrong?')}
              className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
            >
              What did I do wrong?
            </button>
          </div>

          {/* Clarifying Questions Dropdown */}
          {clarifyingQuestions.length > 0 && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Clarifying questions about foundational concepts:
              </label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    setInput(e.target.value);
                    e.target.value = ''; // Reset dropdown
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={loadingClarifyingQuestions}
              >
                <option value="">
                  {loadingClarifyingQuestions ? 'Loading questions...' : 'Select a concept to clarify...'}
                </option>
                {clarifyingQuestions.map((q, index) => (
                  <option key={index} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

