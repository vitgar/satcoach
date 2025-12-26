import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { GuidedSession, IGuidedSession } from '../models/GuidedSession.model';
import { recommendationEngineService } from '../services/recommendationEngine.service';
import { performanceAggregatorService } from '../services/performanceAggregator.service';
import { intelligentTopicSelectorService } from '../services/intelligentTopicSelector.service';

export class GuidedSessionController {
  /**
   * Create a new guided session
   * POST /api/v1/guided-sessions
   */
  async createSession(req: Request, res: Response): Promise<void> {
    try {
      const { subject, topic } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!subject || !topic) {
        res.status(400).json({ error: 'subject and topic are required' });
        return;
      }

      // Check for existing active session for this topic
      const existingSession = await GuidedSession.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        subject,
        topic,
        isActive: true,
      });

      if (existingSession) {
        res.status(200).json({
          message: 'Active session already exists',
          session: existingSession,
        });
        return;
      }

      // Create new session
      const session = new GuidedSession({
        userId: new mongoose.Types.ObjectId(userId),
        subject,
        topic,
        startTime: new Date(),
        isActive: true,
        chatHistory: [],
        questionsPresented: [],
        outcomes: {
          conceptsCovered: [],
          conceptsMastered: [],
          conceptsNeedingWork: [],
          questionsAttempted: 0,
          questionsCorrect: 0,
          engagementScore: 50,
          bloomLevelReached: 1,
        },
        recommendedNextSteps: [],
      });

      await session.save();

      console.log(`[GuidedSession] Created session ${session._id} for user ${userId}, topic: ${topic}`);

      res.status(201).json({
        message: 'Guided session created',
        session,
      });
    } catch (error: any) {
      console.error('[GuidedSession] Create error:', error);
      res.status(500).json({ error: error.message || 'Failed to create guided session' });
    }
  }

  /**
   * Get session by ID
   * GET /api/v1/guided-sessions/:id
   */
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const session = await GuidedSession.findById(id);
      if (!session) {
        res.status(404).json({ error: 'Guided session not found' });
        return;
      }

      res.json({ session });
    } catch (error: any) {
      console.error('[GuidedSession] Get error:', error);
      res.status(500).json({ error: error.message || 'Failed to get guided session' });
    }
  }

  /**
   * Add a message to session chat history
   * PUT /api/v1/guided-sessions/:id/message
   */
  async addMessage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { role, content, conceptsCovered } = req.body;

      if (!role || !content) {
        res.status(400).json({ error: 'role and content are required' });
        return;
      }

      const session = await GuidedSession.findById(id);
      if (!session) {
        res.status(404).json({ error: 'Guided session not found' });
        return;
      }

      session.chatHistory.push({
        role,
        content,
        timestamp: new Date(),
      });

      // Track concepts covered in this message
      if (conceptsCovered && Array.isArray(conceptsCovered)) {
        const existingConcepts = new Set(session.outcomes.conceptsCovered || []);
        for (const concept of conceptsCovered) {
          if (concept && typeof concept === 'string') {
            existingConcepts.add(concept);
          }
        }
        session.outcomes.conceptsCovered = Array.from(existingConcepts);
        console.log(`[GuidedSession] Updated concepts for session ${id}:`, session.outcomes.conceptsCovered);
      }

      await session.save();

      res.json({
        message: 'Message added',
        chatHistory: session.chatHistory,
        conceptsCovered: session.outcomes.conceptsCovered,
      });
    } catch (error: any) {
      console.error('[GuidedSession] Add message error:', error);
      res.status(500).json({ error: error.message || 'Failed to add message' });
    }
  }

  /**
   * Record a question attempt
   * PUT /api/v1/guided-sessions/:id/question-attempt
   */
  async recordQuestionAttempt(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { questionId, questionText, correctAnswer, studentAnswer, isCorrect, timeSpent } = req.body;

      if (!questionId || !questionText || !correctAnswer) {
        res.status(400).json({ error: 'questionId, questionText, and correctAnswer are required' });
        return;
      }

      const session = await GuidedSession.findById(id);
      if (!session) {
        res.status(404).json({ error: 'Guided session not found' });
        return;
      }

      // Use model method to record attempt
      (session as any).recordQuestionAttempt(
        new mongoose.Types.ObjectId(questionId),
        questionText,
        correctAnswer,
        studentAnswer || null,
        isCorrect ?? null,
        timeSpent || 0
      );

      await session.save();

      res.json({
        message: 'Question attempt recorded',
        outcomes: session.outcomes,
        questionsPresented: session.questionsPresented,
      });
    } catch (error: any) {
      console.error('[GuidedSession] Question attempt error:', error);
      res.status(500).json({ error: error.message || 'Failed to record question attempt' });
    }
  }

  /**
   * End a guided session
   * PUT /api/v1/guided-sessions/:id/end
   */
  async endSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { summary, conceptsMastered, conceptsNeedingWork, recommendedNextSteps } = req.body;

      const session = await GuidedSession.findById(id);
      if (!session) {
        res.status(404).json({ error: 'Guided session not found' });
        return;
      }

      session.endTime = new Date();
      session.isActive = false;

      if (summary) {
        session.sessionSummary = summary;
      }
      if (conceptsMastered) {
        session.outcomes.conceptsMastered = conceptsMastered;
      }
      if (conceptsNeedingWork) {
        session.outcomes.conceptsNeedingWork = conceptsNeedingWork;
      }
      if (recommendedNextSteps) {
        session.recommendedNextSteps = recommendedNextSteps;
      }

      // Calculate final engagement score based on interaction
      const messageCount = session.chatHistory.length;
      const questionCount = session.outcomes.questionsAttempted;
      const accuracy = questionCount > 0 
        ? session.outcomes.questionsCorrect / questionCount 
        : 0;
      
      session.outcomes.engagementScore = Math.min(100, 
        30 + // base
        Math.min(30, messageCount * 5) + // chat engagement
        Math.min(20, questionCount * 10) + // question engagement
        Math.round(accuracy * 20) // accuracy bonus
      );

      await session.save();

      console.log(`[GuidedSession] Ended session ${id}, engagement: ${session.outcomes.engagementScore}`);

      res.json({
        message: 'Guided session ended',
        session,
      });
    } catch (error: any) {
      console.error('[GuidedSession] End session error:', error);
      res.status(500).json({ error: error.message || 'Failed to end session' });
    }
  }

  /**
   * Get topic recommendations for a subject
   * GET /api/v1/guided-sessions/recommendations/:subject
   */
  async getRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { subject } = req.params;
      const userId = req.user?.userId;
      // Default to showing all topics (50 is enough for comprehensive SAT coverage)
      const limit = parseInt(req.query.limit as string) || 50;
      const focusOnWeakAreas = req.query.focusOnWeakAreas === 'true';

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!['Math', 'Reading', 'Writing'].includes(subject)) {
        res.status(400).json({ error: 'Invalid subject. Must be Math, Reading, or Writing' });
        return;
      }

      const result = await recommendationEngineService.getRecommendedTopics(
        { userId, subject, focusOnWeakAreas },
        limit
      );

      res.json({
        subject,
        ...result,
      });
    } catch (error: any) {
      console.error('[GuidedSession] Recommendations error:', error);
      res.status(500).json({ error: error.message || 'Failed to get recommendations' });
    }
  }

  /**
   * Get session history for a user
   * GET /api/v1/guided-sessions/user/:userId/history
   */
  async getSessionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const subject = req.query.subject as string;

      // Verify user has access
      if (req.user?.userId !== userId && req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const query: any = {
        userId: new mongoose.Types.ObjectId(userId),
      };

      if (subject) {
        query.subject = subject;
      }

      const sessions = await GuidedSession.find(query)
        .sort({ startTime: -1 })
        .limit(limit)
        .select('-chatHistory'); // Exclude chat history for list view

      res.json({
        userId,
        sessions,
        count: sessions.length,
      });
    } catch (error: any) {
      console.error('[GuidedSession] History error:', error);
      res.status(500).json({ error: error.message || 'Failed to get session history' });
    }
  }

  /**
   * Get active session for user
   * GET /api/v1/guided-sessions/active
   */
  async getActiveSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const subject = req.query.subject as string;
      const topic = req.query.topic as string;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const query: any = {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      };

      if (subject) query.subject = subject;
      if (topic) query.topic = topic;

      const session = await GuidedSession.findOne(query).sort({ startTime: -1 });

      if (!session) {
        res.status(404).json({ error: 'No active session found' });
        return;
      }

      res.json({ session });
    } catch (error: any) {
      console.error('[GuidedSession] Get active error:', error);
      res.status(500).json({ error: error.message || 'Failed to get active session' });
    }
  }

  /**
   * Get performance summary for recommendations context
   * GET /api/v1/guided-sessions/performance/:subject
   */
  async getPerformanceSummary(req: Request, res: Response): Promise<void> {
    try {
      const { subject } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const performance = await performanceAggregatorService.aggregateStudentPerformance(userId, subject);
      const weakAreas = await performanceAggregatorService.getWeakAreas(userId, subject, 5);
      const dueItems = await performanceAggregatorService.getSpacedRepetitionDue(userId, subject, 5);

      res.json({
        subject,
        performance: {
          overallMastery: performance.overallMastery,
          totalStudyTime: performance.totalStudyTime,
          recentEngagement: performance.recentEngagement,
          lastActiveDate: performance.lastActiveDate,
        },
        topicMasteries: performance.topicMasteries.filter(tm => tm.subject === subject),
        weakAreas,
        dueForReview: dueItems,
      });
    } catch (error: any) {
      console.error('[GuidedSession] Performance summary error:', error);
      res.status(500).json({ error: error.message || 'Failed to get performance summary' });
    }
  }

  /**
   * Get previous session history for a specific topic
   * GET /api/v1/guided-sessions/topic-history
   */
  async getTopicHistory(req: Request, res: Response): Promise<void> {
    try {
      const { subject, topic } = req.query;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!subject || !topic) {
        res.status(400).json({ error: 'subject and topic query parameters are required' });
        return;
      }

      // Find all previous sessions for this user/topic
      const sessions = await GuidedSession.find({
        userId: new mongoose.Types.ObjectId(userId),
        subject: subject as string,
        topic: topic as string,
        isActive: false, // Only completed sessions
      })
        .sort({ endTime: -1 })
        .limit(20) // Get more sessions for better concept tracking
        .lean();

      if (sessions.length === 0) {
        res.json({
          hasHistory: false,
          totalSessions: 0,
        });
        return;
      }

      // Get the most recent session
      const lastSession = sessions[0];

      // Build concept mastery tracking across all sessions
      const conceptsWithMastery = this.buildConceptMasteryFromSessions(sessions);
      
      // Calculate which concepts are due for spaced repetition review
      const conceptsDueForReview = this.calculateConceptsDueForReview(conceptsWithMastery);
      
      // Determine recommended starting point
      const recommendedStartingPoint = this.determineStartingPoint(conceptsWithMastery, conceptsDueForReview);

      res.json({
        hasHistory: true,
        totalSessions: sessions.length,
        lastSession: {
          date: lastSession.endTime?.toISOString() || lastSession.startTime.toISOString(),
          questionsAttempted: lastSession.outcomes?.questionsAttempted || 0,
          questionsCorrect: lastSession.outcomes?.questionsCorrect || 0,
          conceptsCovered: lastSession.outcomes?.conceptsCovered || [],
          conceptsMastered: lastSession.outcomes?.conceptsMastered || [],
          conceptsNeedingWork: lastSession.outcomes?.conceptsNeedingWork || [],
          bloomLevelReached: lastSession.outcomes?.bloomLevelReached || 1,
        },
        // Enhanced concept tracking
        conceptsWithMastery,
        conceptsDueForReview,
        recommendedStartingPoint,
        allSessions: sessions.map(s => ({
          id: s._id,
          date: s.endTime?.toISOString() || s.startTime.toISOString(),
          questionsAttempted: s.outcomes?.questionsAttempted || 0,
          questionsCorrect: s.outcomes?.questionsCorrect || 0,
        })),
      });
    } catch (error: any) {
      console.error('[GuidedSession] Topic history error:', error);
      res.status(500).json({ error: error.message || 'Failed to get topic history' });
    }
  }

  /**
   * Build concept mastery tracking from session history
   * Analyzes all sessions to determine mastery level for each concept
   */
  private buildConceptMasteryFromSessions(
    sessions: any[]
  ): Array<{
    concept: string;
    mastery: 'introduced' | 'practicing' | 'understood' | 'mastered';
    lastCovered: string;
    timesReviewed: number;
  }> {
    const conceptMap = new Map<string, {
      timesIntroduced: number;
      timesMastered: number;
      timesNeedingWork: number;
      lastCovered: Date;
      totalReviews: number;
    }>();

    // Process sessions from oldest to newest for accurate tracking
    const chronologicalSessions = [...sessions].reverse();

    for (const session of chronologicalSessions) {
      const sessionDate = session.endTime || session.startTime;
      
      // Track concepts covered
      for (const concept of session.outcomes?.conceptsCovered || []) {
        const existing = conceptMap.get(concept) || {
          timesIntroduced: 0,
          timesMastered: 0,
          timesNeedingWork: 0,
          lastCovered: sessionDate,
          totalReviews: 0,
        };
        existing.timesIntroduced++;
        existing.totalReviews++;
        existing.lastCovered = sessionDate;
        conceptMap.set(concept, existing);
      }

      // Track mastered concepts
      for (const concept of session.outcomes?.conceptsMastered || []) {
        const existing = conceptMap.get(concept);
        if (existing) {
          existing.timesMastered++;
        }
      }

      // Track concepts needing work
      for (const concept of session.outcomes?.conceptsNeedingWork || []) {
        const existing = conceptMap.get(concept);
        if (existing) {
          existing.timesNeedingWork++;
        }
      }
    }

    // Convert to output format with mastery levels
    const result: Array<{
      concept: string;
      mastery: 'introduced' | 'practicing' | 'understood' | 'mastered';
      lastCovered: string;
      timesReviewed: number;
    }> = [];

    for (const [concept, data] of conceptMap.entries()) {
      let mastery: 'introduced' | 'practicing' | 'understood' | 'mastered';
      
      // Determine mastery level based on history
      const masteryRatio = data.timesMastered / data.totalReviews;
      const needsWorkRatio = data.timesNeedingWork / data.totalReviews;

      if (data.totalReviews === 1 && data.timesMastered === 0) {
        mastery = 'introduced';
      } else if (masteryRatio >= 0.8 && data.totalReviews >= 2) {
        mastery = 'mastered';
      } else if (masteryRatio >= 0.5) {
        mastery = 'understood';
      } else if (needsWorkRatio >= 0.5) {
        mastery = 'introduced'; // Reset to introduced if struggling
      } else {
        mastery = 'practicing';
      }

      result.push({
        concept,
        mastery,
        lastCovered: data.lastCovered.toISOString(),
        timesReviewed: data.totalReviews,
      });
    }

    // Sort by mastery (weakest first) then by last covered (oldest first)
    const masteryOrder = { introduced: 0, practicing: 1, understood: 2, mastered: 3 };
    result.sort((a, b) => {
      const masteryDiff = masteryOrder[a.mastery] - masteryOrder[b.mastery];
      if (masteryDiff !== 0) return masteryDiff;
      return new Date(a.lastCovered).getTime() - new Date(b.lastCovered).getTime();
    });

    return result;
  }

  /**
   * Calculate which concepts are due for spaced repetition review
   * Uses simplified SM-2 intervals based on mastery level
   */
  private calculateConceptsDueForReview(
    conceptsWithMastery: Array<{
      concept: string;
      mastery: 'introduced' | 'practicing' | 'understood' | 'mastered';
      lastCovered: string;
      timesReviewed: number;
    }>
  ): string[] {
    const now = new Date();
    const dueForReview: string[] = [];

    // Review intervals in days based on mastery level
    const reviewIntervals: Record<string, number> = {
      introduced: 1,    // Review next day
      practicing: 3,    // Review in 3 days
      understood: 7,    // Review in 1 week
      mastered: 21,     // Review in 3 weeks
    };

    for (const concept of conceptsWithMastery) {
      const lastCoveredDate = new Date(concept.lastCovered);
      const daysSince = Math.floor((now.getTime() - lastCoveredDate.getTime()) / (1000 * 60 * 60 * 24));
      const interval = reviewIntervals[concept.mastery];

      if (daysSince >= interval) {
        dueForReview.push(concept.concept);
      }
    }

    return dueForReview;
  }

  /**
   * Determine the recommended starting point for a returning student
   */
  private determineStartingPoint(
    conceptsWithMastery: Array<{
      concept: string;
      mastery: 'introduced' | 'practicing' | 'understood' | 'mastered';
      lastCovered: string;
      timesReviewed: number;
    }>,
    conceptsDueForReview: string[]
  ): string {
    // Priority 1: Concepts due for review that aren't mastered
    const dueNonMastered = conceptsDueForReview.filter(concept => {
      const conceptData = conceptsWithMastery.find(c => c.concept === concept);
      return conceptData && conceptData.mastery !== 'mastered';
    });
    if (dueNonMastered.length > 0) {
      return dueNonMastered[0];
    }

    // Priority 2: Concepts that need more practice (introduced or practicing)
    const needsPractice = conceptsWithMastery.filter(
      c => c.mastery === 'introduced' || c.mastery === 'practicing'
    );
    if (needsPractice.length > 0) {
      return needsPractice[0].concept;
    }

    // Priority 3: Any concept due for review
    if (conceptsDueForReview.length > 0) {
      return conceptsDueForReview[0];
    }

    // Priority 4: Continue with next logical concept (handled by AI)
    return 'continue_new_material';
  }

  /**
   * Get smart topic selection for a subject
   * Uses AI-driven algorithm to select optimal topic based on:
   * - Spaced repetition (SM-2)
   * - Bloom's taxonomy progression
   * - Flow state (challenge matches skill)
   * - Learning continuity
   * 
   * GET /api/v1/guided-sessions/smart-topic/:subject
   */
  async getSmartTopic(req: Request, res: Response): Promise<void> {
    try {
      const { subject } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!['Math', 'Reading', 'Writing'].includes(subject)) {
        res.status(400).json({ error: 'Invalid subject. Must be Math, Reading, or Writing' });
        return;
      }

      console.log(`[GuidedSession] Smart topic selection for user ${userId}, subject ${subject}`);

      const result = await intelligentTopicSelectorService.selectTopic(userId, subject);

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error('[GuidedSession] Smart topic selection error:', error);
      res.status(500).json({ error: error.message || 'Failed to select topic' });
    }
  }

  /**
   * Get all available topics for a subject (for override dropdown)
   * GET /api/v1/guided-sessions/all-topics/:subject
   */
  async getAllTopics(req: Request, res: Response): Promise<void> {
    try {
      const { subject } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!['Math', 'Reading', 'Writing'].includes(subject)) {
        res.status(400).json({ error: 'Invalid subject. Must be Math, Reading, or Writing' });
        return;
      }

      // Get all topics with mastery levels
      const topics = await intelligentTopicSelectorService.getAllTopics(subject);
      
      // Get user's mastery data
      const performance = await performanceAggregatorService.aggregateStudentPerformance(userId, subject);
      const masteryMap = new Map(performance.topicMasteries.map(tm => [tm.topic, tm.masteryLevel]));
      
      // Merge mastery data
      const topicsWithMastery = topics.map(t => ({
        ...t,
        masteryLevel: masteryMap.get(t.topic) || 0,
      }));

      res.json({
        success: true,
        subject,
        topics: topicsWithMastery,
      });
    } catch (error: any) {
      console.error('[GuidedSession] Get all topics error:', error);
      res.status(500).json({ error: error.message || 'Failed to get topics' });
    }
  }
}

export const guidedSessionController = new GuidedSessionController();

