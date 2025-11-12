import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { QuestionPanel } from '../components/QuestionPanel';
import { ChatPanel } from '../components/ChatPanel';
import { questionService } from '../services/question.service';
import { sessionService } from '../services/session.service';
import { progressService } from '../services/progress.service';
import { Question, Subject, StudySession } from '../types';

export const StudyPage = () => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject | undefined>();
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string | null;
  } | null>(null);

  useEffect(() => {
    initializeStudySession();
  }, []);

  const initializeStudySession = async () => {
    try {
      // Check for active session or create new one
      let session = await sessionService.getActiveSession();
      if (!session) {
        session = await sessionService.startSession();
      }
      setCurrentSession(session);

      // Load first question
      await loadNextQuestion();
    } catch (error) {
      console.error('Failed to initialize study session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNextQuestion = async (subject?: Subject) => {
    try {
      setLoading(true);
      const response = await questionService.getNextQuestion(
        subject || selectedSubject,
        answeredQuestions
      );
      setCurrentQuestion(response.question);
      setStartTime(new Date());
    } catch (error) {
      console.error('Failed to load question:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async (selectedAnswer: string) => {
    if (!currentQuestion || !currentSession) return;

    const timeSpent = Math.round((new Date().getTime() - startTime.getTime()) / 1000);

    try {
      // Submit answer to backend - it will check correctness
      const result = await questionService.submitAnswer(
        currentQuestion._id,
        selectedAnswer,
        timeSpent
      );

      // Set answer result for ChatPanel
      setAnswerResult({
        isCorrect: result.isCorrect,
        correctAnswer: result.correctAnswer,
        explanation: result.explanation,
      });

      // Record the attempt in progress system
      await progressService.recordAttempt({
        questionId: currentQuestion._id,
        isCorrect: result.isCorrect,
        timeSpent,
        confidence: 3, // Default confidence, can be made interactive
      });

      // Update session
      await sessionService.addQuestionToSession(
        currentSession._id,
        currentQuestion._id,
        result.isCorrect,
        currentQuestion.subject
      );

      // Track answered questions
      setAnsweredQuestions([...answeredQuestions, currentQuestion._id]);

      // Wait a bit to show the result, then load next question
      setTimeout(() => {
        setAnswerResult(null);
        loadNextQuestion();
      }, 5000);
    } catch (error) {
      console.error('Failed to record answer:', error);
    }
  };

  const handleSubjectChange = (subject: Subject | undefined) => {
    setSelectedSubject(subject);
    setAnsweredQuestions([]);
    loadNextQuestion(subject);
  };

  if (loading && !currentQuestion) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Subject Selector */}
        <div className="mb-6 flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Subject:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => handleSubjectChange(undefined)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !selectedSubject
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleSubjectChange('math')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedSubject === 'math'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Math
            </button>
            <button
              onClick={() => handleSubjectChange('reading')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedSubject === 'reading'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Reading
            </button>
            <button
              onClick={() => handleSubjectChange('writing')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedSubject === 'writing'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Writing
            </button>
          </div>
        </div>

        {/* Split Screen Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-240px)]">
          {/* Left Panel - Question */}
          <div className="overflow-auto">
            {currentQuestion ? (
              <QuestionPanel
                question={currentQuestion}
                onAnswerSubmit={handleAnswerSubmit}
                loading={loading}
              />
            ) : (
              <div className="card h-full flex items-center justify-center">
                <p className="text-gray-500">No questions available</p>
              </div>
            )}
          </div>

          {/* Right Panel - Chat */}
          <div className="overflow-hidden">
            {currentQuestion ? (
              <ChatPanel question={currentQuestion} answerResult={answerResult} />
            ) : (
              <div className="card h-full flex items-center justify-center">
                <p className="text-gray-500">Select a question to start</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

