import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { GuidedSession, IGuidedSession } from '../models/GuidedSession.model';
import { recommendationEngineService } from '../services/recommendationEngine.service';
import { performanceAggregatorService } from '../services/performanceAggregator.service';

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
      const { role, content } = req.body;

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

      await session.save();

      res.json({
        message: 'Message added',
        chatHistory: session.chatHistory,
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
      const limit = parseInt(req.query.limit as string) || 5;
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
}

export const guidedSessionController = new GuidedSessionController();

