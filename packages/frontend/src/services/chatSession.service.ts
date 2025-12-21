/**
 * Chat Session Service
 * 
 * Manages chat session lifecycle and communicates with the DB backend
 * to store and retrieve conversation insights.
 */

import { api } from './api';
import { Sentiment, LearningStyleSignals } from './ai.service';

export interface ChatSessionInsights {
  dominantSentiment: Sentiment;
  sentimentProgression: Sentiment[];
  conceptsAsked: string[];
  conceptGaps: string[];
  learningStyleSignals: LearningStyleSignals;
  vocabularyLevel: number;
  questionQuality: 'vague' | 'specific' | 'mixed';
  engagementScore: number;
}

export interface ChatSession {
  _id: string;
  userId: string;
  questionId: string;
  sessionId?: string;
  startTime: string;
  endTime?: string;
  messageCount: number;
  insights: ChatSessionInsights;
  adaptationsApplied: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateInsightsData {
  sentiment?: Sentiment;
  conceptsAsked?: string[];
  conceptGaps?: string[];
  learningStyleSignals?: Partial<LearningStyleSignals>;
  vocabularyLevel?: number;
  questionQuality?: 'vague' | 'specific' | 'mixed';
  engagementScore?: number;
  adaptationsApplied?: string[];
}

export interface CommunicationProfile {
  dominantLearningStyle: 'visual' | 'verbal' | 'procedural' | 'conceptual' | 'mixed';
  averageVocabularyLevel: number;
  commonConceptGaps: string[];
  preferredExplanationStyle: 'simple' | 'detailed' | 'examples' | 'theory';
  frustrationTriggers: string[];
  recentSentiments: Sentiment[];
  sessionCount: number;
}

export const chatSessionService = {
  /**
   * Create a new chat session
   */
  async createSession(questionId: string, sessionId?: string): Promise<ChatSession> {
    try {
      const response = await api.post('/chat-sessions', {
        questionId,
        sessionId,
      });
      return response.data.session;
    } catch (error: any) {
      console.error('[ChatSessionService] Create error:', error);
      throw new Error(error.response?.data?.error || 'Failed to create chat session');
    }
  },

  /**
   * Get active session for a question
   */
  async getActiveSession(questionId: string): Promise<ChatSession | null> {
    try {
      const response = await api.get('/chat-sessions/active', {
        params: { questionId },
      });
      return response.data.session;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('[ChatSessionService] Get active error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get active session');
    }
  },

  /**
   * Get or create a session for a question
   */
  async getOrCreateSession(questionId: string, sessionId?: string): Promise<ChatSession> {
    try {
      // Try to get existing active session
      const existing = await this.getActiveSession(questionId);
      if (existing) {
        return existing;
      }
      // Create new session
      return await this.createSession(questionId, sessionId);
    } catch {
      // If getActive fails (not 404), still try to create
      return await this.createSession(questionId, sessionId);
    }
  },

  /**
   * Update session with new insights from message analysis
   */
  async updateSessionInsights(sessionId: string, insights: UpdateInsightsData): Promise<ChatSession> {
    try {
      const response = await api.put(`/chat-sessions/${sessionId}/insights`, insights);
      return response.data.session;
    } catch (error: any) {
      console.error('[ChatSessionService] Update insights error:', error);
      throw new Error(error.response?.data?.error || 'Failed to update session insights');
    }
  },

  /**
   * End a chat session
   */
  async endSession(sessionId: string): Promise<ChatSession> {
    try {
      const response = await api.put(`/chat-sessions/${sessionId}/end`);
      return response.data.session;
    } catch (error: any) {
      console.error('[ChatSessionService] End session error:', error);
      throw new Error(error.response?.data?.error || 'Failed to end session');
    }
  },

  /**
   * Get user's communication profile
   */
  async getUserProfile(userId: string): Promise<CommunicationProfile> {
    try {
      const response = await api.get(`/chat-sessions/user/${userId}/profile`);
      return response.data.profile;
    } catch (error: any) {
      console.error('[ChatSessionService] Get profile error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get user profile');
    }
  },

  /**
   * Get recent sessions for a user
   */
  async getRecentSessions(userId: string, limit: number = 10): Promise<ChatSession[]> {
    try {
      const response = await api.get(`/chat-sessions/user/${userId}/recent`, {
        params: { limit },
      });
      return response.data.sessions;
    } catch (error: any) {
      console.error('[ChatSessionService] Get recent sessions error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get recent sessions');
    }
  },
};

export default chatSessionService;

