/**
 * Guided Review Service
 * 
 * Frontend service for interacting with the guided review APIs
 */

import axios from 'axios';

// Get base URLs - normalize to ensure /api/v1 is included exactly once
const getBaseUrl = (url: string | undefined, defaultUrl: string): string => {
  const baseUrl = url || defaultUrl;
  // Remove trailing /api/v1 if present, then add it back
  const normalized = baseUrl.replace(/\/api\/v1\/?$/, '');
  return `${normalized}/api/v1`;
};

const dbApi = axios.create({
  baseURL: getBaseUrl(import.meta.env.VITE_DB_API_URL, 'http://localhost:4000'),
  withCredentials: true,
});

const aiApi = axios.create({
  baseURL: getBaseUrl(import.meta.env.VITE_AI_API_URL, 'http://localhost:4001'),
});

// Add auth token to DB requests
dbApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Types
export interface TopicRecommendation {
  topic: string;
  subject: string;
  score: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedDuration: number;
  masteryLevel: number;
  daysSincePractice: number;
  weakAreas: string[];
  questionCount: number;
}

export interface RecommendationResult {
  recommendations: TopicRecommendation[];
  summary: string;
  studentContext: {
    overallMastery: number;
    recentEngagement: number;
    weakAreaCount: number;
    topicsToReview: number;
  };
}

export interface GuidedSession {
  _id: string;
  userId: string;
  subject: string;
  topic: string;
  startTime: string;
  endTime: string | null;
  isActive: boolean;
  chatHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  outcomes: {
    conceptsCovered: string[];
    conceptsMastered: string[];
    conceptsNeedingWork: string[];
    questionsAttempted: number;
    questionsCorrect: number;
    engagementScore: number;
    bloomLevelReached: number;
  };
}

export interface EmbeddedQuestion {
  id: string;
  text: string;
  options: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

export interface ChatResponseGraph {
  type: 'line' | 'bar' | 'scatter' | 'pie' | 'area' | 'histogram' | 'polygon' | 'fraction-rectangle';
  data?: Array<Record<string, number | string>>;
  config?: {
    title?: string;
    xLabel?: string;
    yLabel?: string;
    xDomain?: [number, number];
    yDomain?: [number, number];
    showGrid?: boolean;
    showLegend?: boolean;
    dataKeys?: string[];
    xKey?: string;
    yKey?: string;
    polygonConfig?: any;
    rectangleConfig?: any;
  };
}

export interface ChatResponse {
  response: string;
  embeddedQuestion: EmbeddedQuestion | null;
  conceptsCovered: string[];
  suggestedFollowUp: string | null;
  graph?: ChatResponseGraph | null;
}

export interface SessionSummary {
  summary: string;
  conceptsMastered: string[];
  conceptsNeedingWork: string[];
  recommendedNextSteps: string[];
  overallProgress: string;
}

/**
 * Types for conversation state tracking
 * Used for pacing control, checkpoints, and adaptive tutoring
 */
export type QuestionType = 'computation' | 'recognition' | 'conceptual' | 'application' | 'reverse' | 'prediction';
export type ErrorType = 'arithmetic' | 'notation_misread' | 'concept_confusion' | 'procedure_error' | 'careless' | 'unknown';
export type ScaffoldingLevel = 0 | 1 | 2 | 3;

export interface ConversationState {
  consecutiveCorrect: number;
  lastQuestionType?: QuestionType;
  questionTypesUsed: QuestionType[];
  questionsThisConcept: number;
  currentConcept?: string;
  lastErrorType?: ErrorType;
  errorCount: number;
  conceptCheckpoints: number;
  lastCheckpointExchange?: number;
  exchangeCount: number;
  studentInterests?: string[];
  scaffoldingLevel: ScaffoldingLevel;
  awaitingReasoning?: boolean;
  lastIncorrectAnswer?: string;
}

export interface SmartTopicResult {
  topic: string;
  subject: string;
  reason: string;
  selectionType: 'spaced_repetition' | 'new_topic' | 'continuation' | 'struggling_support' | 'bloom_progression';
  focusAreas: string[];
  bloomLevel: number;
  estimatedDuration: number;
  masteryLevel: number;
  scoring: {
    spacedRepetitionScore: number;
    bloomScore: number;
    flowScore: number;
    continuityScore: number;
    totalScore: number;
  };
  aiContext: {
    isReturningStudent: boolean;
    daysAway: number;
    previousConceptsCovered: string[];
    conceptsNeedingWork: string[];
    recommendedApproach: string;
    difficultyAdjustment: 'easier' | 'standard' | 'challenging';
  };
}

export interface TopicListItem {
  topic: string;
  description: string;
  masteryLevel: number;
}

class GuidedReviewService {
  /**
   * Get AI-selected optimal topic for a subject
   * Uses spaced repetition, Bloom's taxonomy, Flow state, and learning continuity
   */
  async getSmartTopic(subject: string): Promise<SmartTopicResult> {
    try {
      const response = await dbApi.get(`/guided-sessions/smart-topic/${subject}`);
      return response.data;
    } catch (error: any) {
      console.error('[GuidedReview] Error getting smart topic:', error);
      throw new Error(error.response?.data?.error || 'Failed to select topic');
    }
  }

  /**
   * Get all topics for a subject (for override dropdown)
   */
  async getAllTopics(subject: string): Promise<TopicListItem[]> {
    try {
      const response = await dbApi.get(`/guided-sessions/all-topics/${subject}`);
      return response.data.topics;
    } catch (error: any) {
      console.error('[GuidedReview] Error getting all topics:', error);
      throw new Error(error.response?.data?.error || 'Failed to get topics');
    }
  }

  /**
   * Get topic recommendations for a subject
   */
  async getRecommendations(subject: string): Promise<RecommendationResult> {
    try {
      const response = await dbApi.get(`/guided-sessions/recommendations/${subject}`);
      return response.data;
    } catch (error: any) {
      console.error('[GuidedReview] Error getting recommendations:', error);
      throw new Error(error.response?.data?.error || 'Failed to get recommendations');
    }
  }

  /**
   * Get AI-enhanced recommendations explanation
   */
  async getAIRecommendations(
    subject: string,
    recommendations: TopicRecommendation[],
    studentContext: { level: number; learningStyle?: string },
    performanceData: { overallMastery: number; recentEngagement: number; weakAreaCount: number; topicsToReview: number }
  ): Promise<{ explanation: string; prioritizedTopics: any[] }> {
    try {
      const response = await aiApi.post('/guided-review/recommendations', {
        subject,
        recommendations,
        studentContext,
        performanceData,
      });
      return response.data;
    } catch (error: any) {
      console.error('[GuidedReview] Error getting AI recommendations:', error);
      // Return fallback
      return {
        explanation: recommendations.length > 0 
          ? `I recommend focusing on **${recommendations[0].topic}**. ${recommendations[0].reason}`
          : `Ready to study ${subject}? Start practicing to get personalized recommendations.`,
        prioritizedTopics: recommendations.map(r => ({
          topic: r.topic,
          adjustedScore: r.score,
          reasoning: r.reason,
        })),
      };
    }
  }

  /**
   * Start a new guided session
   */
  async startSession(subject: string, topic: string): Promise<GuidedSession> {
    try {
      const response = await dbApi.post('/guided-sessions', { subject, topic });
      return response.data.session;
    } catch (error: any) {
      console.error('[GuidedReview] Error starting session:', error);
      throw new Error(error.response?.data?.error || 'Failed to start session');
    }
  }

  /**
   * Get active session
   */
  async getActiveSession(subject?: string, topic?: string): Promise<GuidedSession | null> {
    try {
      const params = new URLSearchParams();
      if (subject) params.append('subject', subject);
      if (topic) params.append('topic', topic);
      
      const response = await dbApi.get(`/guided-sessions/active?${params.toString()}`);
      return response.data.session;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('[GuidedReview] Error getting active session:', error);
      throw new Error(error.response?.data?.error || 'Failed to get active session');
    }
  }

  /**
   * Add a message to session (for tracking purposes)
   */
  async addMessageToSession(
    sessionId: string,
    messageData: {
      role: 'user' | 'assistant';
      content: string;
      conceptsCovered?: string[];
    }
  ): Promise<void> {
    try {
      await dbApi.put(`/guided-sessions/${sessionId}/message`, messageData);
    } catch (error: any) {
      console.error('[GuidedReview] Error adding message to session:', error);
      // Don't throw - this is for tracking, shouldn't break the flow
    }
  }

  /**
   * Pause a session (save progress without ending)
   */
  async pauseSession(
    sessionId: string,
    progress?: {
      questionsAttempted?: number;
      questionsCorrect?: number;
      conceptsCovered?: string[];
    }
  ): Promise<void> {
    try {
      await dbApi.put(`/guided-sessions/${sessionId}/pause`, progress || {});
    } catch (error: any) {
      console.error('[GuidedReview] Error pausing session:', error);
      // Don't throw - this is non-blocking
    }
  }

  /**
   * Update session progress (for auto-save)
   */
  async updateSessionProgress(
    sessionId: string,
    progress: {
      questionsAttempted?: number;
      questionsCorrect?: number;
      conceptsCovered?: string[];
    }
  ): Promise<void> {
    try {
      await dbApi.put(`/guided-sessions/${sessionId}/progress`, progress);
    } catch (error: any) {
      console.error('[GuidedReview] Error updating session progress:', error);
      // Don't throw - this is non-blocking for auto-save
    }
  }

  /**
   * Send a chat message and get AI response
   * Returns updated conversation state for pacing and checkpoint tracking
   */
  async sendMessage(
    sessionId: string,
    message: string,
    sessionContext: {
      subject: string;
      topic: string;
      studentLevel: number;
      learningStyle?: string;
      weakAreas?: string[];
      masteryLevel?: number;
      chatHistory?: Array<{ role: string; content: string }>;
      questionsAttempted?: number;
      questionsCorrect?: number;
      conversationState?: ConversationState;
    }
  ): Promise<ChatResponse & { updatedState?: ConversationState }> {
    try {
      // Initialize or update conversation state
      const currentState = sessionContext.conversationState || this.initializeConversationState();
      const updatedState = {
        ...currentState,
        exchangeCount: currentState.exchangeCount + 1,
      };

      // Get AI response with conversation state
      const aiResponse = await aiApi.post('/guided-review/chat', {
        message,
        sessionContext: {
          ...sessionContext,
          conversationState: updatedState,
        },
      });

      const conceptsCovered = aiResponse.data.conceptsCovered || [];

      // Save user message to session
      await dbApi.put(`/guided-sessions/${sessionId}/message`, {
        role: 'user',
        content: message,
      });

      // Save AI response to session WITH concepts covered for tracking
      await dbApi.put(`/guided-sessions/${sessionId}/message`, {
        role: 'assistant',
        content: aiResponse.data.response,
        conceptsCovered, // Track which concepts were discussed in this response
      });

      return {
        response: aiResponse.data.response,
        embeddedQuestion: aiResponse.data.embeddedQuestion,
        conceptsCovered,
        suggestedFollowUp: aiResponse.data.suggestedFollowUp,
        graph: aiResponse.data.graph || null,
        updatedState,
      };
    } catch (error: any) {
      console.error('[GuidedReview] Error sending message:', error);
      throw new Error(error.response?.data?.error || 'Failed to send message');
    }
  }

  /**
   * Initialize conversation state with default values
   */
  private initializeConversationState(): ConversationState {
    return {
      consecutiveCorrect: 0,
      questionTypesUsed: [],
      questionsThisConcept: 0,
      errorCount: 0,
      conceptCheckpoints: 0,
      exchangeCount: 0,
      scaffoldingLevel: 0,
    };
  }

  /**
   * Update conversation state after question answer
   */
  updateStateAfterAnswer(
    currentState: ConversationState,
    isCorrect: boolean,
    questionType?: QuestionType
  ): ConversationState {
    const updated = { ...currentState };

    if (isCorrect) {
      updated.consecutiveCorrect += 1;
      updated.scaffoldingLevel = 0; // Reset scaffolding on correct answer
    } else {
      updated.consecutiveCorrect = 0;
      updated.errorCount += 1;
    }

    updated.questionsThisConcept += 1;

    if (questionType) {
      updated.lastQuestionType = questionType;
      if (!updated.questionTypesUsed.includes(questionType)) {
        updated.questionTypesUsed = [...updated.questionTypesUsed, questionType];
      }
    }

    return updated;
  }

  /**
   * Update state when advancing to a new concept
   */
  advanceConceptState(
    currentState: ConversationState,
    newConcept: string
  ): ConversationState {
    return {
      ...currentState,
      consecutiveCorrect: 0,
      questionsThisConcept: 0,
      questionTypesUsed: [],
      currentConcept: newConcept,
      errorCount: 0,
      scaffoldingLevel: 0,
    };
  }

  /**
   * Record that a conceptual checkpoint was done
   */
  recordCheckpoint(currentState: ConversationState): ConversationState {
    return {
      ...currentState,
      conceptCheckpoints: currentState.conceptCheckpoints + 1,
      lastCheckpointExchange: currentState.exchangeCount,
    };
  }

  /**
   * Check if a checkpoint is due based on exchanges since last one
   */
  isCheckpointDue(state: ConversationState): boolean {
    const exchangesSinceCheckpoint = state.exchangeCount - (state.lastCheckpointExchange ?? 0);
    return exchangesSinceCheckpoint >= 4;
  }

  /**
   * Check if student has mastered current concept (for pacing)
   */
  hasReachedMastery(state: ConversationState): boolean {
    return state.consecutiveCorrect >= 3 && state.questionsThisConcept >= 3;
  }

  /**
   * Add a student interest for personalized examples
   */
  addStudentInterest(currentState: ConversationState, interest: string): ConversationState {
    const interests = currentState.studentInterests || [];
    if (!interests.includes(interest)) {
      return {
        ...currentState,
        studentInterests: [...interests, interest],
      };
    }
    return currentState;
  }

  /**
   * Get previous session history for a specific topic
   */
  async getPreviousTopicSessions(subject: string, topic: string): Promise<{
    hasHistory: boolean;
    totalSessions: number;
    lastSession?: {
      date: string;
      questionsAttempted: number;
      questionsCorrect: number;
      conceptsCovered: string[];
    };
    // Enhanced concept tracking
    conceptsWithMastery?: Array<{
      concept: string;
      mastery: 'introduced' | 'practicing' | 'understood' | 'mastered';
      lastCovered: string;
      timesReviewed: number;
    }>;
    conceptsDueForReview?: string[];
    recommendedStartingPoint?: string;
  }> {
    try {
      const response = await dbApi.get(`/guided-sessions/topic-history`, {
        params: { subject, topic },
      });
      return response.data;
    } catch (error: any) {
      console.error('[GuidedReview] Error getting topic history:', error);
      return { hasHistory: false, totalSessions: 0 };
    }
  }

  /**
   * Get topic introduction when starting a topic
   * Returns initial conversation state for tracking
   */
  async startTopic(sessionContext: {
    subject: string;
    topic: string;
    studentLevel: number;
    learningStyle?: string;
    masteryLevel?: number;
    previousSessions?: {
      hasHistory: boolean;
      totalSessions: number;
      lastSessionDate?: string;
      lastSessionAccuracy?: number;
      conceptsCovered?: string[];
      conceptsWithMastery?: Array<{
        concept: string;
        mastery: 'introduced' | 'practicing' | 'understood' | 'mastered';
        lastCovered: string;
        timesReviewed: number;
      }>;
      conceptsDueForReview?: string[];
      recommendedStartingPoint?: string;
    };
    // Enhanced context from intelligent topic selection
    aiContext?: {
      isReturningStudent: boolean;
      daysAway: number;
      previousConceptsCovered: string[];
      conceptsNeedingWork: string[];
      recommendedApproach: string;
      difficultyAdjustment: 'easier' | 'standard' | 'challenging';
    };
    selectionReason?: string;
    focusAreas?: string[];
  }): Promise<ChatResponse & { initialState: ConversationState }> {
    // Initialize fresh conversation state for new topic
    const initialState: ConversationState = {
      ...this.initializeConversationState(),
      currentConcept: sessionContext.topic,
    };

    try {
      const response = await aiApi.post('/guided-review/start-topic', { 
        sessionContext: {
          ...sessionContext,
          conversationState: initialState,
        },
      });
      return {
        response: response.data.response,
        embeddedQuestion: response.data.embeddedQuestion,
        conceptsCovered: response.data.conceptsCovered || [],
        suggestedFollowUp: response.data.suggestedFollowUp,
        graph: response.data.graph || null,
        initialState,
      };
    } catch (error: any) {
      console.error('[GuidedReview] Error starting topic:', error);
      // Return fallback introduction with initial state
      return {
        response: `Let's work on **${sessionContext.topic}** together! What would you like to start with?`,
        embeddedQuestion: null,
        conceptsCovered: [sessionContext.topic],
        suggestedFollowUp: null,
        initialState,
      };
    }
  }

  /**
   * Submit answer to embedded question
   * Returns updated conversation state for pacing tracking
   */
  async submitQuestionAnswer(
    sessionId: string,
    question: EmbeddedQuestion,
    studentAnswer: string,
    sessionContext: {
      subject: string;
      topic: string;
      studentLevel: number;
      conversationState?: ConversationState;
    },
    questionType?: QuestionType
  ): Promise<{ 
    feedback: ChatResponse; 
    isCorrect: boolean; 
    updatedState?: ConversationState;
  }> {
    const isCorrect = studentAnswer.toUpperCase() === question.correctAnswer.toUpperCase();

    // Update conversation state based on answer
    const currentState = sessionContext.conversationState || this.initializeConversationState();
    const updatedState = this.updateStateAfterAnswer(currentState, isCorrect, questionType);

    try {
      // Record the question attempt
      await dbApi.put(`/guided-sessions/${sessionId}/question-attempt`, {
        questionId: question.id,
        questionText: question.text,
        correctAnswer: question.correctAnswer,
        studentAnswer,
        isCorrect,
        timeSpent: 0, // Could track actual time
      });

      // Get AI feedback with conversation state
      const response = await aiApi.post('/guided-review/question-feedback', {
        studentAnswer,
        question,
        isCorrect,
        sessionContext: {
          ...sessionContext,
          conversationState: updatedState,
        },
      });

      return {
        feedback: {
          response: response.data.response,
          embeddedQuestion: response.data.embeddedQuestion,
          conceptsCovered: response.data.conceptsCovered || [],
          suggestedFollowUp: response.data.suggestedFollowUp,
          graph: response.data.graph || null,
        },
        isCorrect,
        updatedState,
      };
    } catch (error: any) {
      console.error('[GuidedReview] Error submitting answer:', error);
      // Return fallback feedback with state update
      return {
        feedback: {
          response: isCorrect 
            ? `Correct! ${question.explanation}` 
            : `Not quite. The correct answer is ${question.correctAnswer}. ${question.explanation}`,
          embeddedQuestion: null,
          conceptsCovered: [],
          suggestedFollowUp: 'Would you like to continue?',
        },
        isCorrect,
        updatedState,
      };
    }
  }

  /**
   * End session and get summary
   */
  async endSession(
    sessionId: string,
    sessionContext: {
      subject: string;
      topic: string;
      studentLevel: number;
      weakAreas?: string[];
    },
    stats: {
      questionsAttempted: number;
      questionsCorrect: number;
      conceptsCovered: string[];
      sessionDurationMinutes: number;
    }
  ): Promise<SessionSummary> {
    try {
      // Get AI summary
      const summaryResponse = await aiApi.post('/guided-review/summarize', {
        sessionContext,
        ...stats,
      });

      // End session in DB
      await dbApi.put(`/guided-sessions/${sessionId}/end`, {
        summary: summaryResponse.data.summary,
        conceptsMastered: summaryResponse.data.conceptsMastered,
        conceptsNeedingWork: summaryResponse.data.conceptsNeedingWork,
        recommendedNextSteps: summaryResponse.data.recommendedNextSteps,
      });

      return {
        summary: summaryResponse.data.summary,
        conceptsMastered: summaryResponse.data.conceptsMastered || [],
        conceptsNeedingWork: summaryResponse.data.conceptsNeedingWork || [],
        recommendedNextSteps: summaryResponse.data.recommendedNextSteps || [],
        overallProgress: summaryResponse.data.overallProgress || 'Good progress!',
      };
    } catch (error: any) {
      console.error('[GuidedReview] Error ending session:', error);
      
      // Try to at least end the session in DB
      try {
        await dbApi.put(`/guided-sessions/${sessionId}/end`, {});
      } catch {
        // Ignore
      }

      // Return fallback summary
      return {
        summary: `You completed a review session on ${sessionContext.topic}.`,
        conceptsMastered: [],
        conceptsNeedingWork: [],
        recommendedNextSteps: [`Continue practicing ${sessionContext.topic}`],
        overallProgress: 'Keep up the good work!',
      };
    }
  }

  /**
   * Get session history
   */
  async getSessionHistory(userId: string, limit: number = 10): Promise<GuidedSession[]> {
    try {
      const response = await dbApi.get(`/guided-sessions/user/${userId}/history?limit=${limit}`);
      return response.data.sessions;
    } catch (error: any) {
      console.error('[GuidedReview] Error getting session history:', error);
      return [];
    }
  }
}

export const guidedReviewService = new GuidedReviewService();

