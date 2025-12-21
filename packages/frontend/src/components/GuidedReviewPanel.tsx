import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SubjectSelector } from './SubjectSelector';
import { GuidedChatInterface } from './GuidedChatInterface';
import { 
  guidedReviewService, 
  TopicRecommendation, 
  EmbeddedQuestion,
  SessionSummary 
} from '../services/guidedReview.service';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  embeddedQuestion?: EmbeddedQuestion | null;
}

type ViewState = 'subject-selection' | 'recommendations' | 'chat' | 'summary';

export const GuidedReviewPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [viewState, setViewState] = useState<ViewState>('subject-selection');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<TopicRecommendation[]>([]);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [questionsAttempted, setQuestionsAttempted] = useState(0);
  const [questionsCorrect, setQuestionsCorrect] = useState(0);
  const [conceptsCovered, setConceptsCovered] = useState<string[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load recommendations when subject is selected
  useEffect(() => {
    if (selectedSubject) {
      loadRecommendations(selectedSubject);
    }
  }, [selectedSubject]);

  const loadRecommendations = async (subject: string) => {
    setLoading(true);
    setError(null);

    try {
      // Get recommendations from DB
      const result = await guidedReviewService.getRecommendations(subject);
      setRecommendations(result.recommendations);

      // Get AI-enhanced explanation
      const aiResult = await guidedReviewService.getAIRecommendations(
        subject,
        result.recommendations,
        { level: user?.learningProfile?.currentLevel || 5 },
        result.studentContext
      );
      setAiExplanation(aiResult.explanation);

      setViewState('recommendations');
    } catch (err: any) {
      setError(err.message || 'Failed to load recommendations');
      console.error('Failed to load recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectSelect = (subject: string) => {
    setSelectedSubject(subject);
    setSelectedTopic(null);
    setMessages([]);
    setQuestionsAttempted(0);
    setQuestionsCorrect(0);
    setConceptsCovered([]);
  };

  const handleTopicSelect = async (topic: string) => {
    setSelectedTopic(topic);
    setLoading(true);
    setError(null);

    try {
      // Start session in DB
      const session = await guidedReviewService.startSession(selectedSubject!, topic);
      setSessionId(session._id);
      setSessionStartTime(new Date());

      // Get topic introduction from AI
      const introduction = await guidedReviewService.startTopic({
        subject: selectedSubject!,
        topic,
        studentLevel: user?.learningProfile?.currentLevel || 5,
        masteryLevel: recommendations.find(r => r.topic === topic)?.masteryLevel || 0,
      });

      // Add introduction as first message
      const introMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: introduction.response,
        timestamp: new Date(),
        embeddedQuestion: introduction.embeddedQuestion,
      };
      setMessages([introMessage]);

      if (introduction.conceptsCovered) {
        setConceptsCovered(prev => [...new Set([...prev, ...introduction.conceptsCovered])]);
      }

      setViewState('chat');
    } catch (err: any) {
      setError(err.message || 'Failed to start topic');
      console.error('Failed to start topic:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = useCallback(async (message: string) => {
    if (!sessionId || !selectedSubject || !selectedTopic) return;

    // Add user message immediately
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setChatLoading(true);

    try {
      const response = await guidedReviewService.sendMessage(
        sessionId,
        message,
        {
          subject: selectedSubject,
          topic: selectedTopic,
          studentLevel: user?.learningProfile?.currentLevel || 5,
          questionsAttempted,
          questionsCorrect,
          chatHistory: messages.map(m => ({ role: m.role, content: m.content })),
        }
      );

      // Add AI response
      const aiMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        embeddedQuestion: response.embeddedQuestion,
      };
      setMessages(prev => [...prev, aiMessage]);

      if (response.conceptsCovered) {
        setConceptsCovered(prev => [...new Set([...prev, ...response.conceptsCovered])]);
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      // Add error message
      const errorMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I had trouble responding. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  }, [sessionId, selectedSubject, selectedTopic, user, questionsAttempted, questionsCorrect, messages]);

  const handleAnswerQuestion = useCallback(async (question: EmbeddedQuestion, answer: string) => {
    if (!sessionId || !selectedSubject || !selectedTopic) return;

    setChatLoading(true);

    try {
      const result = await guidedReviewService.submitQuestionAnswer(
        sessionId,
        question,
        answer,
        {
          subject: selectedSubject,
          topic: selectedTopic,
          studentLevel: user?.learningProfile?.currentLevel || 5,
        }
      );

      setQuestionsAttempted(prev => prev + 1);
      if (result.isCorrect) {
        setQuestionsCorrect(prev => prev + 1);
      }

      // Add feedback as message
      const feedbackMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: result.feedback.response,
        timestamp: new Date(),
        embeddedQuestion: result.feedback.embeddedQuestion,
      };
      setMessages(prev => [...prev, feedbackMessage]);

      if (result.feedback.conceptsCovered) {
        setConceptsCovered(prev => [...new Set([...prev, ...result.feedback.conceptsCovered])]);
      }
    } catch (err: any) {
      console.error('Failed to submit answer:', err);
    } finally {
      setChatLoading(false);
    }
  }, [sessionId, selectedSubject, selectedTopic, user]);

  const handleEndSession = async () => {
    if (!sessionId || !selectedSubject || !selectedTopic) {
      navigate('/dashboard');
      return;
    }

    setLoading(true);

    try {
      const durationMinutes = sessionStartTime 
        ? Math.round((Date.now() - sessionStartTime.getTime()) / 60000)
        : 0;

      const summary = await guidedReviewService.endSession(
        sessionId,
        {
          subject: selectedSubject,
          topic: selectedTopic,
          studentLevel: user?.learningProfile?.currentLevel || 5,
        },
        {
          questionsAttempted,
          questionsCorrect,
          conceptsCovered,
          sessionDurationMinutes: durationMinutes,
        }
      );

      setSessionSummary(summary);
      setViewState('summary');
    } catch (err: any) {
      console.error('Failed to end session:', err);
      // Navigate away even on error
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToRecommendations = () => {
    setSelectedTopic(null);
    setMessages([]);
    setSessionId(null);
    setQuestionsAttempted(0);
    setQuestionsCorrect(0);
    setConceptsCovered([]);
    setViewState('recommendations');
  };

  const handleBackToSubjects = () => {
    setSelectedSubject(null);
    setSelectedTopic(null);
    setRecommendations([]);
    setAiExplanation('');
    setMessages([]);
    setSessionId(null);
    setViewState('subject-selection');
  };

  const handleStartNewSession = () => {
    setSessionSummary(null);
    handleBackToRecommendations();
  };

  // Render subject selection
  if (viewState === 'subject-selection') {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Guided Review</h1>
          <p className="text-gray-600">
            Get personalized study recommendations based on your performance
          </p>
        </div>

        <SubjectSelector
          onSelect={handleSubjectSelect}
          selectedSubject={selectedSubject}
          disabled={loading}
        />

        {loading && (
          <div className="flex justify-center mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg text-center">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Render recommendations
  if (viewState === 'recommendations') {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBackToSubjects}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Change Subject
          </button>
          <h1 className="text-xl font-bold text-gray-900">{selectedSubject} Review</h1>
          <div className="w-24"></div>
        </div>

        {/* AI Explanation */}
        {aiExplanation && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-emerald-600 mt-0.5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">AI Recommendation</h3>
                <p className="text-gray-700">
                  {formatBoldText(aiExplanation)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Topic Cards */}
        {recommendations.length > 0 ? (
          <div className="grid gap-4">
            <h2 className="text-lg font-semibold text-gray-800">Recommended Topics</h2>
            {recommendations.map((rec, index) => (
              <button
                key={rec.topic}
                onClick={() => handleTopicSelect(rec.topic)}
                disabled={loading}
                className="w-full text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all disabled:opacity-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        rec.priority === 'high' 
                          ? 'bg-red-100 text-red-700'
                          : rec.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {rec.priority} priority
                      </span>
                      {index === 0 && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">
                          Top pick
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">{rec.topic}</h3>
                    <p className="text-sm text-gray-600 mb-2">{rec.reason}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Mastery: {rec.masteryLevel}%</span>
                      <span>{rec.questionCount} questions available</span>
                      <span>~{rec.estimatedDuration} min</span>
                    </div>
                  </div>
                  <div className="text-primary-600 ml-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <p className="text-gray-600 mb-4">No specific recommendations yet.</p>
            <p className="text-sm text-gray-500">
              Start practicing to get personalized topic recommendations!
            </p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>
    );
  }

  // Render chat
  if (viewState === 'chat') {
    return (
      <div className="max-w-4xl mx-auto py-4 px-4 h-[calc(100vh-120px)]">
        <div className="flex items-center mb-4">
          <button
            onClick={handleBackToRecommendations}
            className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        <GuidedChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          onAnswerQuestion={handleAnswerQuestion}
          isLoading={chatLoading}
          topic={selectedTopic || ''}
          subject={selectedSubject || ''}
          questionsAttempted={questionsAttempted}
          questionsCorrect={questionsCorrect}
          onEndSession={handleEndSession}
        />
      </div>
    );
  }

  // Render summary
  if (viewState === 'summary' && sessionSummary) {
    const accuracy = questionsAttempted > 0
      ? Math.round((questionsCorrect / questionsAttempted) * 100)
      : 0;

    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Complete!</h2>
            <p className="text-gray-600">{selectedTopic} - {selectedSubject}</p>
          </div>

          {/* Stats */}
          {questionsAttempted > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">{questionsAttempted}</p>
                <p className="text-xs text-gray-500">Questions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{questionsCorrect}</p>
                <p className="text-xs text-gray-500">Correct</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{accuracy}%</p>
                <p className="text-xs text-gray-500">Accuracy</p>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="space-y-4 mb-6">
            <p className="text-gray-700">{sessionSummary.summary}</p>
            
            <p className="text-emerald-700 font-medium">{sessionSummary.overallProgress}</p>
          </div>

          {/* Concepts */}
          {sessionSummary.conceptsMastered.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Concepts Mastered</h4>
              <div className="flex flex-wrap gap-2">
                {sessionSummary.conceptsMastered.map((concept, i) => (
                  <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-sm rounded-full">
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}

          {sessionSummary.conceptsNeedingWork.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Areas to Focus</h4>
              <div className="flex flex-wrap gap-2">
                {sessionSummary.conceptsNeedingWork.map((concept, i) => (
                  <span key={i} className="px-2 py-1 bg-amber-100 text-amber-700 text-sm rounded-full">
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          {sessionSummary.recommendedNextSteps.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Recommended Next Steps</h4>
              <ul className="space-y-1">
                {sessionSummary.recommendedNextSteps.map((step, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start">
                    <span className="text-primary-600 mr-2">→</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleStartNewSession}
              className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Study Another Topic
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Helper to format bold text (**text**)
function formatBoldText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

