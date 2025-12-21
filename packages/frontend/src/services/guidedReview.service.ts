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

export interface ChatResponse {
  response: string;
  embeddedQuestion: EmbeddedQuestion | null;
  conceptsCovered: string[];
  suggestedFollowUp: string | null;
}

export interface SessionSummary {
  summary: string;
  conceptsMastered: string[];
  conceptsNeedingWork: string[];
  recommendedNextSteps: string[];
  overallProgress: string;
}

class GuidedReviewService {
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
   * Send a chat message and get AI response
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
    }
  ): Promise<ChatResponse> {
    try {
      // Get AI response
      const aiResponse = await aiApi.post('/guided-review/chat', {
        message,
        sessionContext,
      });

      // Save message to session
      await dbApi.put(`/guided-sessions/${sessionId}/message`, {
        role: 'user',
        content: message,
      });

      // Save AI response to session
      await dbApi.put(`/guided-sessions/${sessionId}/message`, {
        role: 'assistant',
        content: aiResponse.data.response,
      });

      return {
        response: aiResponse.data.response,
        embeddedQuestion: aiResponse.data.embeddedQuestion,
        conceptsCovered: aiResponse.data.conceptsCovered || [],
        suggestedFollowUp: aiResponse.data.suggestedFollowUp,
      };
    } catch (error: any) {
      console.error('[GuidedReview] Error sending message:', error);
      throw new Error(error.response?.data?.error || 'Failed to send message');
    }
  }

  /**
   * Get topic introduction when starting a topic
   */
  async startTopic(sessionContext: {
    subject: string;
    topic: string;
    studentLevel: number;
    learningStyle?: string;
    masteryLevel?: number;
  }): Promise<ChatResponse> {
    try {
      const response = await aiApi.post('/guided-review/start-topic', { sessionContext });
      return {
        response: response.data.response,
        embeddedQuestion: response.data.embeddedQuestion,
        conceptsCovered: response.data.conceptsCovered || [],
        suggestedFollowUp: response.data.suggestedFollowUp,
      };
    } catch (error: any) {
      console.error('[GuidedReview] Error starting topic:', error);
      // Return fallback introduction
      return {
        response: `Let's work on **${sessionContext.topic}** together! What would you like to start with?`,
        embeddedQuestion: null,
        conceptsCovered: [sessionContext.topic],
        suggestedFollowUp: null,
      };
    }
  }

  /**
   * Submit answer to embedded question
   */
  async submitQuestionAnswer(
    sessionId: string,
    question: EmbeddedQuestion,
    studentAnswer: string,
    sessionContext: {
      subject: string;
      topic: string;
      studentLevel: number;
    }
  ): Promise<{ feedback: ChatResponse; isCorrect: boolean }> {
    const isCorrect = studentAnswer.toUpperCase() === question.correctAnswer.toUpperCase();

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

      // Get AI feedback
      const response = await aiApi.post('/guided-review/question-feedback', {
        studentAnswer,
        question,
        isCorrect,
        sessionContext,
      });

      return {
        feedback: {
          response: response.data.response,
          embeddedQuestion: response.data.embeddedQuestion,
          conceptsCovered: response.data.conceptsCovered || [],
          suggestedFollowUp: response.data.suggestedFollowUp,
        },
        isCorrect,
      };
    } catch (error: any) {
      console.error('[GuidedReview] Error submitting answer:', error);
      // Return fallback feedback
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

