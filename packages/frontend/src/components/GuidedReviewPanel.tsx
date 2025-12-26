import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SubjectSelector } from './SubjectSelector';
import { GuidedChatInterface } from './GuidedChatInterface';
import { LessonPreparation } from './LessonPreparation';
import { 
  guidedReviewService, 
  EmbeddedQuestion,
  SessionSummary,
  ChatResponseGraph,
  SmartTopicResult,
  TopicListItem
} from '../services/guidedReview.service';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  embeddedQuestion?: EmbeddedQuestion | null;
  graph?: ChatResponseGraph | null;
}

type ViewState = 'subject-selection' | 'preparing-lesson' | 'chat' | 'summary';

export const GuidedReviewPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [viewState, setViewState] = useState<ViewState>('subject-selection');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [smartTopicResult, setSmartTopicResult] = useState<SmartTopicResult | null>(null);
  const [allTopics, setAllTopics] = useState<TopicListItem[]>([]);
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
  const [preparationComplete, setPreparationComplete] = useState(false);

  // Load smart topic when subject is selected
  useEffect(() => {
    if (selectedSubject && viewState === 'preparing-lesson') {
      loadSmartTopic(selectedSubject);
    }
  }, [selectedSubject, viewState]);

  // Start session when preparation is complete and we have a smart topic
  useEffect(() => {
    if (preparationComplete && smartTopicResult && selectedSubject) {
      startSessionWithTopic(smartTopicResult.topic);
    }
  }, [preparationComplete, smartTopicResult, selectedSubject]);

  const loadSmartTopic = async (subject: string) => {
    setError(null);

    try {
      // Get AI-selected optimal topic
      const result = await guidedReviewService.getSmartTopic(subject);
      setSmartTopicResult(result);
      setSelectedTopic(result.topic);
      
      // Also load all topics for the override dropdown (lazy load)
      const topics = await guidedReviewService.getAllTopics(subject);
      setAllTopics(topics);
    } catch (err: any) {
      setError(err.message || 'Failed to select topic');
      console.error('Failed to load smart topic:', err);
      setViewState('subject-selection');
    }
  };

  const handleSubjectSelect = (subject: string) => {
    setSelectedSubject(subject);
    setSelectedTopic(null);
    setSmartTopicResult(null);
    setPreparationComplete(false);
    setMessages([]);
    setQuestionsAttempted(0);
    setQuestionsCorrect(0);
    setConceptsCovered([]);
    setViewState('preparing-lesson');
  };

  const handlePreparationComplete = () => {
    setPreparationComplete(true);
  };

  const startSessionWithTopic = async (topic: string) => {
    if (!selectedSubject) return;
    
    setSelectedTopic(topic);
    setLoading(true);
    setError(null);

    try {
      // Check for previous sessions on this topic
      const previousHistory = await guidedReviewService.getPreviousTopicSessions(
        selectedSubject,
        topic
      );

      // Start session in DB
      const session = await guidedReviewService.startSession(selectedSubject, topic);
      setSessionId(session._id);
      setSessionStartTime(new Date());

      // Get mastery level from smart topic result or previous history
      const topicMastery = smartTopicResult?.masteryLevel || 0;
      
      // Build session context with enhanced AI context from smart topic selection
      const sessionContext = {
        subject: selectedSubject,
        topic,
        studentLevel: user?.learningProfile?.currentLevel || 5,
        masteryLevel: topicMastery,
        previousSessions: {
          hasHistory: previousHistory.hasHistory || topicMastery > 0,
          totalSessions: previousHistory.totalSessions || 0,
          lastSessionDate: previousHistory.lastSession?.date,
          lastSessionAccuracy: previousHistory.lastSession 
            ? Math.round((previousHistory.lastSession.questionsCorrect / 
                Math.max(1, previousHistory.lastSession.questionsAttempted)) * 100)
            : undefined,
          conceptsCovered: previousHistory.lastSession?.conceptsCovered,
          conceptsWithMastery: previousHistory.conceptsWithMastery,
          conceptsDueForReview: previousHistory.conceptsDueForReview,
          recommendedStartingPoint: previousHistory.recommendedStartingPoint,
        },
        // Enhanced context from intelligent topic selection
        aiContext: smartTopicResult?.aiContext,
        selectionReason: smartTopicResult?.reason,
        focusAreas: smartTopicResult?.focusAreas,
      };

      // Get topic introduction from AI
      const introduction = await guidedReviewService.startTopic(sessionContext);

      // Save introduction message to session with concepts covered
      await guidedReviewService.addMessageToSession(session._id, {
        role: 'assistant',
        content: introduction.response,
        conceptsCovered: introduction.conceptsCovered,
      });

      // Add introduction as first message
      const introMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: introduction.response,
        timestamp: new Date(),
        embeddedQuestion: introduction.embeddedQuestion,
        graph: introduction.graph,
      };
      setMessages([introMessage]);

      if (introduction.conceptsCovered) {
        setConceptsCovered(prev => [...new Set([...prev, ...introduction.conceptsCovered])]);
      }

      setViewState('chat');
    } catch (err: any) {
      setError(err.message || 'Failed to start topic');
      console.error('Failed to start topic:', err);
      setViewState('subject-selection');
    } finally {
      setLoading(false);
    }
  };

  // Handle manual topic override from dropdown
  const handleTopicOverride = async (topic: string) => {
    if (topic === selectedTopic) return;
    
    // Reset and start with the new topic
    setSelectedTopic(topic);
    setSmartTopicResult(null);
    setPreparationComplete(false);
    setMessages([]);
    
    // Directly start session with the overridden topic
    await startSessionWithTopic(topic);
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
        graph: response.graph,
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
        graph: result.feedback.graph,
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

  const handleBackToSubjects = () => {
    setSelectedSubject(null);
    setSelectedTopic(null);
    setSmartTopicResult(null);
    setAllTopics([]);
    setPreparationComplete(false);
    setMessages([]);
    setSessionId(null);
    setViewState('subject-selection');
  };

  const handleStartNewSession = () => {
    setSessionSummary(null);
    setSelectedTopic(null);
    setSmartTopicResult(null);
    setPreparationComplete(false);
    setMessages([]);
    setSessionId(null);
    setQuestionsAttempted(0);
    setQuestionsCorrect(0);
    setConceptsCovered([]);
    // Go back to preparing lesson for the same subject
    if (selectedSubject) {
      setViewState('preparing-lesson');
    } else {
      setViewState('subject-selection');
    }
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

  // Render preparing lesson
  if (viewState === 'preparing-lesson') {
    return (
      <div className="h-full flex flex-col">
        {/* Back button */}
        <div className="max-w-4xl mx-auto w-full py-2 px-4 flex-shrink-0">
          <button
            onClick={handleBackToSubjects}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Change Subject
          </button>
        </div>

        {/* Lesson Preparation Animation */}
        <div className="flex-1">
          <LessonPreparation 
            subject={selectedSubject || ''} 
            onComplete={handlePreparationComplete}
          />
        </div>

        {error && (
          <div className="max-w-md mx-auto px-4 pb-4">
            <div className="p-4 bg-red-50 text-red-700 rounded-lg text-center">
              {error}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render chat
  if (viewState === 'chat') {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="max-w-4xl mx-auto w-full py-2 px-4 flex-shrink-0">
          <button
            onClick={handleBackToSubjects}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Exit Session
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden px-4 pb-4">
          <div className="max-w-4xl mx-auto h-full">
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
              allTopics={allTopics}
              onTopicChange={handleTopicOverride}
              selectionReason={smartTopicResult?.reason}
            />
          </div>
        </div>
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
