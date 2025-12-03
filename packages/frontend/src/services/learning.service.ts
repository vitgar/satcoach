/**
 * Learning Service
 * 
 * Handles all learning-related API calls to the Advanced Learning System.
 * The system uses:
 * - Automatic confidence calculation (no student input needed)
 * - Flow-based difficulty adjustment
 * - Bloom's taxonomy progression
 * - Smart spaced repetition
 */

import { api } from './api';

export type FlowZone = 'boredom' | 'flow' | 'anxiety';
export type StudentType = 'struggler' | 'intermediate' | 'advanced';
export type SessionType = 'study' | 'review' | 'practice' | 'explanation';

export interface LearnerState {
  userId: string;
  studentType: StudentType;
  currentLevel: number;
  flowZone: FlowZone;
  flowScore: number;
  recommendedDifficulty: 'easy' | 'medium' | 'hard';
  recommendedBloomLevel: number;
  topicsDueForReview: number;
  sessionActive: boolean;
}

export interface SessionStart {
  sessionId: string;
  initialState: LearnerState;
}

export interface SessionSummary {
  duration: number;
  questionsAttempted: number;
  questionsCorrect: number;
  averageFlowScore: number;
  bloomLevelsProgressed: number;
  topicsReviewed: string[];
  recommendations: string[];
}

export interface QuestionSelection {
  question: any;
  selectionReason: string;
  recommendedBloomLevel: number;
  expectedTime: number;
}

export interface AttemptData {
  questionId: string;
  isCorrect: boolean;
  userAnswer: string;
  timeSpent: number;
  hintsUsed: number;
  chatInteractions: number;
}

export interface AttemptResult {
  isCorrect: boolean;
  calculatedConfidence: number;
  qualityScore: number;
  flowState: { flowZone: FlowZone; flowScore: number };
  nextReviewDate: string;
  masteryLevel: number;
  bloomProgress: {
    currentLevel: number;
    nextTargetLevel: number;
    levelMastery: number;
  };
  feedback: string;
  shouldAdjustDifficulty: boolean;
  adjustmentReason: string;
}

export interface ExplanationResult {
  evaluation: {
    clarity: number;
    completeness: number;
    accuracy: number;
    feedback: string;
    bloomLevel: number;
  };
  shouldRefine: boolean;
  refinementPrompts: string[];
  bloomLevelDemonstrated: number;
}

export interface LearningRecommendations {
  conceptsToReview: { topic: string; subject: string; priority: number }[];
  conceptsToLearn: { topic: string; subject: string; bloomLevel: number }[];
  bloomLevelsToTarget: { subject: string; level: number; description: string }[];
  flowOptimizations: string[];
  sessionRecommendation: {
    type: SessionType;
    duration: number;
    focus: string;
  };
}

class LearningService {
  /**
   * Get current learner state
   */
  async getLearnerState(): Promise<LearnerState> {
    const response = await api.get('/learning/state');
    return response.data.data;
  }

  /**
   * Start a new learning session
   */
  async startSession(sessionType: SessionType = 'study'): Promise<SessionStart> {
    const response = await api.post('/learning/session/start', { sessionType });
    return response.data.data;
  }

  /**
   * End the current learning session
   */
  async endSession(): Promise<SessionSummary> {
    const response = await api.post('/learning/session/end');
    return response.data.data;
  }

  /**
   * Get next question based on learning state
   */
  async getNextQuestion(options?: {
    subject?: 'math' | 'reading' | 'writing';
    topic?: string;
    forReview?: boolean;
  }): Promise<QuestionSelection | null> {
    const params = new URLSearchParams();
    if (options?.subject) params.append('subject', options.subject);
    if (options?.topic) params.append('topic', options.topic);
    if (options?.forReview) params.append('forReview', 'true');

    const response = await api.get(`/learning/question?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Process a question attempt
   * Note: Confidence is calculated automatically - no student input needed
   */
  async processAttempt(data: AttemptData): Promise<AttemptResult> {
    const response = await api.post('/learning/attempt', data);
    return response.data.data;
  }

  /**
   * Process a Feynman-style explanation
   */
  async processExplanation(
    topic: string,
    explanation: string,
    conceptId?: string,
    questionId?: string
  ): Promise<ExplanationResult> {
    const response = await api.post('/learning/explain', {
      topic,
      explanation,
      conceptId,
      questionId,
    });
    return response.data.data;
  }

  /**
   * Get personalized learning recommendations
   */
  async getRecommendations(): Promise<LearningRecommendations> {
    const response = await api.get('/learning/recommendations');
    return response.data.data;
  }

  /**
   * Get Bloom level display name
   */
  getBloomLevelName(level: number): string {
    const names: Record<number, string> = {
      1: 'Remember',
      2: 'Understand',
      3: 'Apply',
      4: 'Analyze',
      5: 'Evaluate',
      6: 'Create',
    };
    return names[level] || 'Unknown';
  }

  /**
   * Get flow zone display info
   */
  getFlowZoneInfo(zone: FlowZone): { color: string; message: string } {
    switch (zone) {
      case 'flow':
        return { color: 'text-green-600', message: 'You\'re in the zone!' };
      case 'boredom':
        return { color: 'text-yellow-600', message: 'Ready for more challenge?' };
      case 'anxiety':
        return { color: 'text-orange-600', message: 'Take your time' };
      default:
        return { color: 'text-gray-600', message: '' };
    }
  }
}

export const learningService = new LearningService();

