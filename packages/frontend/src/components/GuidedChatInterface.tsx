import { useState, useRef, useEffect } from 'react';
import { EmbeddedQuestion, ChatResponseGraph, TopicListItem } from '../services/guidedReview.service';
import { MathMarkdown } from './MathMarkdown';
import { GraphRenderer } from './GraphRenderer';
import { GraphData } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  embeddedQuestion?: EmbeddedQuestion | null;
  graph?: ChatResponseGraph | null;
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
  allTopics?: TopicListItem[];
  onTopicChange?: (topic: string) => void;
  selectionReason?: string;
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
  allTopics = [],
  onTopicChange,
  selectionReason,
}: GuidedChatInterfaceProps) => {
  const [inputValue, setInputValue] = useState('');
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [selectedAnswers, setSelectedAnswers] = useState<Map<string, string>>(new Map());
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [visibleMessageCount, setVisibleMessageCount] = useState(15); // Show last 15 messages initially
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  const shouldScrollRef = useRef(false);

  // Track message count changes and handle scrolling
  useEffect(() => {
    const currentCount = messages.length;
    const previousCount = previousMessageCountRef.current;
    
    // If messages increased (new message added), ensure they're visible
    if (currentCount > previousCount && !isInitialLoadRef.current) {
      // For new messages during active chat, always show them (expand if needed)
      // This ensures new messages are always visible without layout shifts
      if (currentCount > visibleMessageCount) {
        setVisibleMessageCount(currentCount);
        shouldScrollRef.current = true;
      } else {
        // New message is already in visible range, just scroll
        shouldScrollRef.current = true;
      }
    }
    
    previousMessageCountRef.current = currentCount;
    
    // Handle initial load
    if (isInitialLoadRef.current && currentCount > 0) {
      // For initial load, show only recent messages
      const initialVisibleCount = Math.min(15, currentCount);
      setVisibleMessageCount(initialVisibleCount);
      // Set initial scroll position to bottom
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
          isInitialLoadRef.current = false;
        });
      });
    }
  }, [messages, visibleMessageCount]);

  // Separate effect to handle scrolling after visibleMessageCount or messages update
  useEffect(() => {
    if (shouldScrollRef.current && !isInitialLoadRef.current && messagesContainerRef.current) {
      shouldScrollRef.current = false;
      // Use a longer delay to ensure all layout calculations are complete
      const scrollToBottom = () => {
        const container = messagesContainerRef.current;
        if (container) {
          // Force scroll to absolute bottom
          container.scrollTop = container.scrollHeight;
        }
      };
      // Multiple animation frames to ensure layout is stable
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom();
          // One more frame to ensure it sticks
          requestAnimationFrame(scrollToBottom);
        });
      });
    }
  }, [visibleMessageCount, messages.length]);

  // Reset initial load flag when messages are cleared
  useEffect(() => {
    if (messages.length === 0) {
      isInitialLoadRef.current = true;
      setVisibleMessageCount(15);
      previousMessageCountRef.current = 0;
    }
  }, [messages.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTopicDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTopicSelect = (selectedTopic: string) => {
    setShowTopicDropdown(false);
    if (onTopicChange && selectedTopic !== topic) {
      onTopicChange(selectedTopic);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || disabled) return;

    const message = inputValue.trim();
    setInputValue('');
    await onSendMessage(message);
  };

  const handleAnswerSubmit = async (messageId: string, question: EmbeddedQuestion, answer: string) => {
    if (isLoading) return;

    // Mark question as answered
    setAnsweredQuestions(prev => new Set(prev).add(messageId));

    await onAnswerQuestion(question, answer);
  };

  const accuracy = questionsAttempted > 0 
    ? Math.round((questionsCorrect / questionsAttempted) * 100) 
    : 0;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-xl flex-shrink-0">
        <div className="relative" ref={dropdownRef}>
          {/* Topic with optional dropdown */}
          <button
            onClick={() => allTopics.length > 0 && setShowTopicDropdown(!showTopicDropdown)}
            className={`text-left group ${allTopics.length > 0 ? 'cursor-pointer hover:bg-white/50 rounded-lg p-1 -m-1 transition-colors' : ''}`}
            disabled={allTopics.length === 0}
          >
            <div className="flex items-center gap-1">
              <h3 className="font-semibold text-gray-900">{topic}</h3>
              {allTopics.length > 0 && (
                <svg 
                  className={`w-4 h-4 text-gray-500 transition-transform ${showTopicDropdown ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
            <p className="text-sm text-gray-500">{subject}</p>
            {selectionReason && (
              <p className="text-xs text-emerald-600 mt-0.5 max-w-xs truncate" title={selectionReason}>
                {selectionReason.length > 50 ? selectionReason.slice(0, 50) + '...' : selectionReason}
              </p>
            )}
          </button>

          {/* Topic Dropdown */}
          {showTopicDropdown && allTopics.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-80 max-h-80 overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-2 border-b border-gray-100">
                <p className="text-xs text-gray-500 font-medium">Switch Topic</p>
              </div>
              <div className="py-1">
                {allTopics.map((t) => (
                  <button
                    key={t.topic}
                    onClick={() => handleTopicSelect(t.topic)}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors ${
                      t.topic === topic ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${t.topic === topic ? 'text-emerald-700' : 'text-gray-900'}`}>
                          {t.topic}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{t.description}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-gray-400">{t.masteryLevel}%</span>
                        {t.topic === topic && (
                          <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
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
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
      >
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>Starting guided review session...</p>
          </div>
        )}

        {/* Show "Load older messages" indicator if there are more messages */}
        {messages.length > visibleMessageCount && (
          <div className="flex justify-center py-2">
            <button
              onClick={() => setVisibleMessageCount(prev => Math.min(prev + 10, messages.length))}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ↑ Load older messages ({messages.length - visibleMessageCount} older)
            </button>
          </div>
        )}

        {/* Show only the most recent messages */}
        {messages.slice(-visibleMessageCount).map((message) => {
          const hasQuestion = message.role === 'assistant' && message.embeddedQuestion;
          const isQuestionAnswered = answeredQuestions.has(message.id);
          const selectedAnswer = selectedAnswers.get(message.id);

          return (
            <div key={message.id}>
              <div
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {/* Render message with full markdown and LaTeX support */}
                  {message.role === 'user' ? (
                    <div className="prose prose-sm max-w-none text-white">
                      {message.content.split('\n').map((line, i) => (
                        <p key={i} className={`${i > 0 ? 'mt-2' : ''} text-white`}>
                          {formatMessageContent(line, true)}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <MathMarkdown content={message.content} />
                  )}
                  
                  {/* Render graph if present */}
                  {message.role === 'assistant' && message.graph && (
                    <div className="mt-4">
                      <GraphRenderer graphData={message.graph as GraphData} />
                    </div>
                  )}
                </div>
              </div>

              {/* Embedded Question - shown inline with the message */}
              {hasQuestion && message.embeddedQuestion && (
                <div className="ml-4 mt-3 max-w-[75%]">
                  <div className={`rounded-xl p-4 ${
                    isQuestionAnswered 
                      ? 'bg-gray-50 border border-gray-200' 
                      : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={isQuestionAnswered ? 'text-gray-600' : 'text-blue-600'}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      <span className={`font-medium ${isQuestionAnswered ? 'text-gray-700' : 'text-blue-900'}`}>
                        Practice Question
                      </span>
                    </div>
                    
                    <div className="text-gray-800 mb-4">
                      <MathMarkdown content={message.embeddedQuestion.text} />
                    </div>
                    
                    {!isQuestionAnswered ? (
                      <>
                        <div className="space-y-2 mb-4">
                          {message.embeddedQuestion.options.map((option) => (
                            <button
                              key={option.label}
                              onClick={() => setSelectedAnswers(prev => new Map(prev).set(message.id, option.label))}
                              disabled={isLoading}
                              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                                selectedAnswer === option.label
                                  ? 'border-blue-500 bg-blue-100'
                                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <div className="flex items-start">
                                <span className="font-medium mr-2 flex-shrink-0">{option.label})</span>
                                <div className="flex-1">
                                  <MathMarkdown content={option.text} />
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                        
                        <button
                          onClick={() => selectedAnswer && handleAnswerSubmit(message.id, message.embeddedQuestion!, selectedAnswer)}
                          disabled={!selectedAnswer || isLoading}
                          className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
                            selectedAnswer && !isLoading
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {isLoading ? 'Checking...' : 'Submit Answer'}
                        </button>
                      </>
                    ) : (
                      <div className="text-sm text-gray-600 italic">
                        Question answered ✓
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

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
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="flex space-x-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question or type your response..."
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

