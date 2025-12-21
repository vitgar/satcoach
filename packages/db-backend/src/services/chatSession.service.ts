/**
 * Chat Session Service
 * 
 * Manages chat session lifecycle and aggregates communication insights.
 * Used to build user communication profiles for adaptive learning.
 */

import mongoose from 'mongoose';
import {
  ChatSession,
  IChatSession,
  ChatSessionInsights,
  Sentiment,
  LearningStyleSignals,
  LearningStyle,
} from '../models/ChatSession.model';
import { User, CommunicationProfile, LearningStyleType, ExplanationStyleType } from '../models/User.model';

export interface CreateSessionData {
  userId: string;
  questionId: string;
  sessionId?: string;
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

export interface AggregatedCommunicationProfile {
  dominantLearningStyle: LearningStyleType;
  averageVocabularyLevel: number;
  commonConceptGaps: string[];
  preferredExplanationStyle: ExplanationStyleType;
  frustrationTriggers: string[];
  recentSentiments: Sentiment[];
  sessionCount: number;
}

export class ChatSessionService {
  /**
   * Create a new chat session
   */
  async createSession(data: CreateSessionData): Promise<IChatSession> {
    const session = new ChatSession({
      userId: new mongoose.Types.ObjectId(data.userId),
      questionId: new mongoose.Types.ObjectId(data.questionId),
      sessionId: data.sessionId ? new mongoose.Types.ObjectId(data.sessionId) : undefined,
      startTime: new Date(),
      messageCount: 0,
      insights: {
        dominantSentiment: 'neutral',
        sentimentProgression: [],
        conceptsAsked: [],
        conceptGaps: [],
        learningStyleSignals: { visual: 0, verbal: 0, procedural: 0, conceptual: 0 },
        vocabularyLevel: 8,
        questionQuality: 'mixed',
        engagementScore: 50,
      },
      adaptationsApplied: [],
    });

    await session.save();
    console.log(`[ChatSession] Created session ${session._id} for user ${data.userId}`);
    return session;
  }

  /**
   * Get a chat session by ID
   */
  async getSession(sessionId: string): Promise<IChatSession | null> {
    return ChatSession.findById(sessionId);
  }

  /**
   * Get active session for user and question
   */
  async getActiveSession(userId: string, questionId: string): Promise<IChatSession | null> {
    return ChatSession.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      questionId: new mongoose.Types.ObjectId(questionId),
      endTime: null,
    }).sort({ startTime: -1 });
  }

  /**
   * Update session with new insights from a message
   */
  async updateSessionInsights(
    sessionId: string,
    insights: UpdateInsightsData
  ): Promise<IChatSession | null> {
    const session = await ChatSession.findById(sessionId);
    if (!session) {
      console.error(`[ChatSession] Session ${sessionId} not found`);
      return null;
    }

    // Increment message count
    session.messageCount += 1;

    // Add sentiment to progression
    if (insights.sentiment) {
      session.insights.sentimentProgression.push(insights.sentiment);
      // Recalculate dominant sentiment
      session.insights.dominantSentiment = this.calculateDominantSentiment(
        session.insights.sentimentProgression
      );
    }

    // Merge concepts asked
    if (insights.conceptsAsked && insights.conceptsAsked.length > 0) {
      const existingConcepts = new Set(session.insights.conceptsAsked);
      insights.conceptsAsked.forEach(c => existingConcepts.add(c.toLowerCase()));
      session.insights.conceptsAsked = Array.from(existingConcepts);
    }

    // Merge concept gaps
    if (insights.conceptGaps && insights.conceptGaps.length > 0) {
      const existingGaps = new Set(session.insights.conceptGaps);
      insights.conceptGaps.forEach(g => existingGaps.add(g.toLowerCase()));
      session.insights.conceptGaps = Array.from(existingGaps);
    }

    // Add learning style signals
    if (insights.learningStyleSignals) {
      const signals = session.insights.learningStyleSignals;
      if (insights.learningStyleSignals.visual) {
        signals.visual += insights.learningStyleSignals.visual;
      }
      if (insights.learningStyleSignals.verbal) {
        signals.verbal += insights.learningStyleSignals.verbal;
      }
      if (insights.learningStyleSignals.procedural) {
        signals.procedural += insights.learningStyleSignals.procedural;
      }
      if (insights.learningStyleSignals.conceptual) {
        signals.conceptual += insights.learningStyleSignals.conceptual;
      }
    }

    // Update vocabulary level (running average)
    if (insights.vocabularyLevel !== undefined) {
      const currentLevel = session.insights.vocabularyLevel;
      const count = session.messageCount;
      session.insights.vocabularyLevel = Math.round(
        ((currentLevel * (count - 1)) + insights.vocabularyLevel) / count
      );
    }

    // Update question quality (last value takes precedence for mixed detection)
    if (insights.questionQuality) {
      const current = session.insights.questionQuality;
      if (current !== insights.questionQuality && current !== 'mixed') {
        session.insights.questionQuality = 'mixed';
      } else if (current === 'mixed') {
        // Keep mixed
      } else {
        session.insights.questionQuality = insights.questionQuality;
      }
    }

    // Update engagement score (running average)
    if (insights.engagementScore !== undefined) {
      const currentScore = session.insights.engagementScore;
      const count = session.messageCount;
      session.insights.engagementScore = Math.round(
        ((currentScore * (count - 1)) + insights.engagementScore) / count
      );
    }

    // Track adaptations applied
    if (insights.adaptationsApplied && insights.adaptationsApplied.length > 0) {
      session.adaptationsApplied.push(...insights.adaptationsApplied);
    }

    await session.save();
    return session;
  }

  /**
   * End a chat session
   */
  async endSession(sessionId: string): Promise<IChatSession | null> {
    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return null;
    }

    session.endTime = new Date();
    
    // Final calculations
    session.insights.dominantSentiment = this.calculateDominantSentiment(
      session.insights.sentimentProgression
    );

    await session.save();
    
    // Update user's communication profile
    await this.updateUserCommunicationProfile(session.userId.toString());

    console.log(`[ChatSession] Ended session ${sessionId} with ${session.messageCount} messages`);
    return session;
  }

  /**
   * Get user's aggregated communication profile from recent sessions
   */
  async getUserCommunicationProfile(userId: string): Promise<AggregatedCommunicationProfile> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const sessions = await ChatSession.find({
      userId: new mongoose.Types.ObjectId(userId),
      startTime: { $gte: thirtyDaysAgo },
      messageCount: { $gt: 0 },
    }).sort({ startTime: -1 }).limit(50);

    if (sessions.length === 0) {
      return {
        dominantLearningStyle: 'mixed',
        averageVocabularyLevel: 8,
        commonConceptGaps: [],
        preferredExplanationStyle: 'examples',
        frustrationTriggers: [],
        recentSentiments: [],
        sessionCount: 0,
      };
    }

    // Aggregate learning style signals
    const totalSignals: LearningStyleSignals = { visual: 0, verbal: 0, procedural: 0, conceptual: 0 };
    let totalVocabulary = 0;
    const conceptGaps: Map<string, number> = new Map();
    const sentiments: Sentiment[] = [];
    const frustrationContexts: string[] = [];

    sessions.forEach(session => {
      const signals = session.insights.learningStyleSignals;
      totalSignals.visual += signals.visual;
      totalSignals.verbal += signals.verbal;
      totalSignals.procedural += signals.procedural;
      totalSignals.conceptual += signals.conceptual;

      totalVocabulary += session.insights.vocabularyLevel;

      session.insights.conceptGaps.forEach(gap => {
        conceptGaps.set(gap, (conceptGaps.get(gap) || 0) + 1);
      });

      sentiments.push(session.insights.dominantSentiment);

      // Track frustration contexts
      if (session.insights.dominantSentiment === 'frustrated') {
        session.insights.conceptsAsked.forEach(concept => {
          frustrationContexts.push(concept);
        });
      }
    });

    // Calculate dominant learning style
    const dominantLearningStyle = this.calculateDominantLearningStyle(totalSignals);

    // Calculate average vocabulary
    const averageVocabularyLevel = Math.round(totalVocabulary / sessions.length);

    // Get most common concept gaps (top 10)
    const sortedGaps = Array.from(conceptGaps.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([gap]) => gap);

    // Infer explanation style from learning style
    const preferredExplanationStyle = this.inferExplanationStyle(dominantLearningStyle);

    // Get unique frustration triggers
    const frustrationTriggers = [...new Set(frustrationContexts)].slice(0, 5);

    return {
      dominantLearningStyle,
      averageVocabularyLevel,
      commonConceptGaps: sortedGaps,
      preferredExplanationStyle,
      frustrationTriggers,
      recentSentiments: sentiments.slice(0, 10),
      sessionCount: sessions.length,
    };
  }

  /**
   * Update user's stored communication profile
   */
  async updateUserCommunicationProfile(userId: string): Promise<void> {
    const aggregated = await this.getUserCommunicationProfile(userId);

    await User.findByIdAndUpdate(userId, {
      'learningProfile.communicationProfile': {
        dominantLearningStyle: aggregated.dominantLearningStyle,
        averageVocabularyLevel: aggregated.averageVocabularyLevel,
        commonConceptGaps: aggregated.commonConceptGaps,
        preferredExplanationStyle: aggregated.preferredExplanationStyle,
        frustrationTriggers: aggregated.frustrationTriggers,
        lastUpdated: new Date(),
      },
    });

    console.log(`[ChatSession] Updated communication profile for user ${userId}`);
  }

  /**
   * Get recent sessions for a user
   */
  async getRecentSessions(userId: string, limit: number = 10): Promise<IChatSession[]> {
    return ChatSession.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ startTime: -1 })
      .limit(limit);
  }

  // Private helper methods

  private calculateDominantSentiment(progression: Sentiment[]): Sentiment {
    if (progression.length === 0) return 'neutral';

    const counts: Record<Sentiment, number> = {
      frustrated: 0,
      confused: 0,
      confident: 0,
      bored: 0,
      neutral: 0,
    };

    progression.forEach(s => {
      counts[s]++;
    });

    // Weight negative sentiments higher (they're more important to detect)
    const weightedCounts = {
      frustrated: counts.frustrated * 1.5,
      confused: counts.confused * 1.3,
      confident: counts.confident * 1.0,
      bored: counts.bored * 1.2,
      neutral: counts.neutral * 0.8,
    };

    let maxSentiment: Sentiment = 'neutral';
    let maxCount = 0;

    Object.entries(weightedCounts).forEach(([sentiment, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxSentiment = sentiment as Sentiment;
      }
    });

    return maxSentiment;
  }

  private calculateDominantLearningStyle(signals: LearningStyleSignals): LearningStyleType {
    const total = signals.visual + signals.verbal + signals.procedural + signals.conceptual;

    if (total < 5) return 'mixed'; // Not enough data

    const max = Math.max(signals.visual, signals.verbal, signals.procedural, signals.conceptual);

    // Need at least 35% dominance to declare a style
    if (max / total < 0.35) return 'mixed';

    if (signals.visual === max) return 'visual';
    if (signals.procedural === max) return 'procedural';
    if (signals.conceptual === max) return 'conceptual';
    if (signals.verbal === max) return 'verbal';

    return 'mixed';
  }

  private inferExplanationStyle(learningStyle: LearningStyleType): ExplanationStyleType {
    switch (learningStyle) {
      case 'visual':
        return 'examples'; // Visuals often like concrete examples
      case 'verbal':
        return 'detailed'; // Verbal learners like thorough explanations
      case 'procedural':
        return 'simple'; // Step-by-step, straightforward
      case 'conceptual':
        return 'theory'; // Deep understanding
      default:
        return 'examples';
    }
  }
}

export const chatSessionService = new ChatSessionService();

