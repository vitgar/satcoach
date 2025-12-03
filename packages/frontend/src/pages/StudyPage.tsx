import { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { QuestionPanel } from '../components/QuestionPanel';
import { ChatPanel } from '../components/ChatPanel';
import { FeynmanExplanation } from '../components/FeynmanExplanation';
import { Subject, Question } from '../types';
import { learningService, LearnerState, AttemptResult } from '../services/learning.service';
import { useAuth } from '../contexts/AuthContext';

// Bloom level colors for visual indicator
const BLOOM_COLORS: Record<number, string> = {
  1: 'bg-blue-100 text-blue-800',
  2: 'bg-green-100 text-green-800',
  3: 'bg-yellow-100 text-yellow-800',
  4: 'bg-orange-100 text-orange-800',
  5: 'bg-purple-100 text-purple-800',
  6: 'bg-pink-100 text-pink-800',
};

export const StudyPage = () => {
  const { isAuthenticated } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<Subject | undefined>();
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string | null;
  } | null>(null);

  // Study mode
  const [showFeynman, setShowFeynman] = useState(false);

  // Learning system state
  const [learnerState, setLearnerState] = useState<LearnerState | null>(null);
  const [lastAttemptResult, setLastAttemptResult] = useState<AttemptResult | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [chatInteractions, setChatInteractions] = useState(0);
  const questionStartTime = useRef<number>(Date.now());
  const [questionCount, setQuestionCount] = useState(0); // Track how many questions seen
  const [selectionReason, setSelectionReason] = useState<string>(''); // Why this question was selected

  // Get current topic from question
  const currentTopic = currentQuestion?.tags?.[0] || currentQuestion?.subject || 'concept';

  // Fetch next question from database
  const fetchNextQuestion = async (forReview: boolean = false) => {
    if (!isAuthenticated) return;
    
    setLoadingQuestion(true);
    try {
      const selection = await learningService.getNextQuestion({
        subject: selectedSubject,
        forReview,
      });
      
      if (selection && selection.question) {
        setCurrentQuestion(selection.question);
        setQuestionCount(prev => prev + 1);
        setAnswerResult(null);
        setLastAttemptResult(null);
        setHintsUsed(0);
        setChatInteractions(0);
        setShowFeynman(false);
        setSelectionReason(selection.selectionReason || '');
        questionStartTime.current = Date.now();
      } else {
        // No questions available
        setCurrentQuestion(null);
        setSelectionReason('');
      }
    } catch (error) {
      console.error('Failed to fetch question:', error);
      setCurrentQuestion(null);
    } finally {
      setLoadingQuestion(false);
    }
  };

  // Initialize learning session and fetch first question
  useEffect(() => {
    const initLearning = async () => {
      if (!isAuthenticated) return;
      
      try {
        // Get learner state
        const state = await learningService.getLearnerState();
        setLearnerState(state);
        
        // Start a session if not already active
        if (!state.sessionActive) {
          await learningService.startSession('study');
        }
        
        // Fetch first question
        await fetchNextQuestion();
      } catch (error) {
        // Silently fail - demo mode works without backend
        console.log('Learning system not available, using demo mode');
        setCurrentQuestion(null);
      }
    };

    initLearning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Fetch new question when subject changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchNextQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject]);


  const handleAnswerSubmit = async (selectedAnswer: string) => {
    if (!currentQuestion) return;

    const selectedIndex = currentQuestion.content.options.indexOf(selectedAnswer);
    const answerLetter = selectedIndex >= 0 ? String.fromCharCode(65 + selectedIndex) : '';
    const isCorrect = answerLetter === currentQuestion.content.correctAnswer;
    const timeSpent = Math.round((Date.now() - questionStartTime.current) / 1000);

    setAnswerResult({
      isCorrect,
      correctAnswer: currentQuestion.content.correctAnswer,
      explanation: currentQuestion.content.explanation,
    });

    // Process attempt with learning system
    if (isAuthenticated && currentQuestion._id) {
      try {
        const result = await learningService.processAttempt({
          questionId: currentQuestion._id,
          isCorrect,
          userAnswer: answerLetter,
          timeSpent,
          hintsUsed,
          chatInteractions,
        });
        setLastAttemptResult(result);
        
        // Update learner state
        const newState = await learningService.getLearnerState();
        setLearnerState(newState);
        
        // Auto-fetch next question after a short delay (optional - can be removed if you want manual control)
        // setTimeout(() => {
        //   fetchNextQuestion();
        // }, 3000);
      } catch (error) {
        // Silently fail - demo mode works without backend
        console.log('Could not process attempt with learning system');
      }
    }
  };

  const handleSubjectChange = (subject: Subject | undefined) => {
    setSelectedSubject(subject);
  };

  const navigateToQuestion = (direction: 'next' | 'previous') => {
    if (direction === 'next') {
      // Fetch next question from learning system
      fetchNextQuestion();
    } else {
      // Previous doesn't make sense with adaptive system, but we can show a message
      // or implement a question history if needed
      console.log('Previous question not available with adaptive learning system');
    }
  };

  // Handle Feynman explanation completion
  const handleFeynmanComplete = async () => {
    setShowFeynman(false);
    
    // Update learner state after explanation
    if (isAuthenticated) {
      try {
        const newState = await learningService.getLearnerState();
        setLearnerState(newState);
      } catch (error) {
        console.log('Could not update learner state');
      }
    }
  };

  return (
    <Layout>
      <div className="h-full flex flex-col max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Minimal Learning Status Bar */}
        {learnerState && (
          <div className="mb-4 flex items-center justify-between bg-white rounded-lg shadow-sm px-4 py-2 flex-shrink-0">
            <div className="flex items-center space-x-4">
              {/* Level indicator */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Level</span>
                <span className="font-bold text-primary-600">{learnerState.currentLevel}</span>
              </div>
              
              {/* Bloom level */}
              <div className={`px-2 py-1 rounded text-xs font-medium ${BLOOM_COLORS[learnerState.recommendedBloomLevel] || 'bg-gray-100 text-gray-800'}`}>
                {learningService.getBloomLevelName(learnerState.recommendedBloomLevel)}
              </div>
              
              {/* Subject Dropdown */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Subject:</span>
                <select
                  value={selectedSubject || 'all'}
                  onChange={(e) => handleSubjectChange(e.target.value === 'all' ? undefined : e.target.value as Subject)}
                  className="px-3 py-1 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All</option>
                  <option value="math">Math</option>
                  <option value="reading">Reading</option>
                  <option value="writing">Writing</option>
                </select>
              </div>
              
              {/* Selection reason - subtle hint about why this question */}
              {selectionReason && (
                <span className="text-xs text-gray-400 italic hidden lg:inline">
                  {selectionReason}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Explain button */}
              <button
                onClick={() => setShowFeynman(!showFeynman)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  showFeynman
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🎓 Explain It
              </button>
              
              {/* Review reminder (only show if there are items due) */}
              {learnerState.topicsDueForReview > 0 && (
                <div className="text-xs text-orange-600">
                  {learnerState.topicsDueForReview} topic{learnerState.topicsDueForReview > 1 ? 's' : ''} to review
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feynman Explanation Panel (when activated) */}
        {showFeynman && currentQuestion && (
          <div className="mb-4 flex-shrink-0">
            <FeynmanExplanation
              topic={currentTopic}
              conceptName={currentTopic}
              questionId={currentQuestion._id}
              bloomLevel={learnerState?.recommendedBloomLevel || 2}
              onComplete={handleFeynmanComplete}
              onSkip={() => setShowFeynman(false)}
            />
          </div>
        )}

        {/* Split Screen Layout - Flex to fill remaining space */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* Left Panel - Question */}
          <div className="min-h-0 flex flex-col">
            {loadingQuestion ? (
              <div className="card h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
                  <p className="text-gray-500">Loading next question...</p>
                </div>
              </div>
            ) : currentQuestion ? (
              <QuestionPanel
                question={currentQuestion}
                onAnswerSubmit={handleAnswerSubmit}
                loading={loadingQuestion}
                answerResult={answerResult}
              />
            ) : (
              <div className="card h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-500 mb-4">No questions available for this subject yet.</p>
                  {isAuthenticated && (
                    <button
                      onClick={() => fetchNextQuestion()}
                      className="btn-primary"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Chat */}
          <div className="min-h-0 flex flex-col">
            {currentQuestion ? (
              <ChatPanel
                question={currentQuestion}
                answerResult={answerResult}
                demoMode={false}
                currentIndex={questionCount - 1}
                totalQuestions={undefined} // Not applicable with adaptive system
                onNextQuestion={() => navigateToQuestion('next')}
                onPreviousQuestion={undefined} // Not applicable with adaptive system
                learnerState={learnerState || undefined}
              />
            ) : (
              <div className="card h-full flex items-center justify-center">
                <p className="text-gray-500">Select a question to start</p>
              </div>
            )}
          </div>
        </div>

        {/* Minimal Feedback After Answer (only show essential info) */}
        {lastAttemptResult && answerResult && (
          <div className="mt-4 bg-white rounded-lg shadow-sm px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Progress indicator */}
                <div className="text-sm">
                  <span className="text-gray-600">Mastery:</span>
                  <span className="ml-1 font-medium text-primary-600">
                    {lastAttemptResult.masteryLevel}%
                  </span>
                </div>
                
                {/* Flow feedback */}
                <div className="text-sm text-gray-600">
                  {lastAttemptResult.feedback}
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Suggest explanation after wrong answer */}
                {!answerResult.isCorrect && (
                  <button
                    onClick={() => setShowFeynman(true)}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    💡 Explain this concept
                  </button>
                )}
                
                {/* Next review date (subtle) */}
                <div className="text-xs text-gray-400">
                  Review: {new Date(lastAttemptResult.nextReviewDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
