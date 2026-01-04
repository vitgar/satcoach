import { Request, Response } from 'express';
import { chatSessionService, UpdateInsightsData } from '../services/chatSession.service';

export class ChatSessionController {
  /**
   * Create a new chat session
   * POST /api/v1/chat-sessions
   */
  async createSession(req: Request, res: Response): Promise<void> {
    try {
      const { questionId, sessionId } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!questionId) {
        res.status(400).json({ error: 'questionId is required' });
        return;
      }

      // Check for existing active session
      const existingSession = await chatSessionService.getActiveSession(userId, questionId);
      if (existingSession) {
        res.status(200).json({
          message: 'Active session already exists',
          session: existingSession,
        });
        return;
      }

      const session = await chatSessionService.createSession({
        userId,
        questionId,
        sessionId,
      });

      res.status(201).json({
        message: 'Chat session created',
        session,
      });
    } catch (error: any) {
      console.error('[ChatSessionController] Create error:', error);
      res.status(500).json({ error: error.message || 'Failed to create chat session' });
    }
  }

  /**
   * Get a chat session by ID
   * GET /api/v1/chat-sessions/:id
   */
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const session = await chatSessionService.getSession(id);
      if (!session) {
        res.status(404).json({ error: 'Chat session not found' });
        return;
      }

      res.json({ session });
    } catch (error: any) {
      console.error('[ChatSessionController] Get error:', error);
      res.status(500).json({ error: error.message || 'Failed to get chat session' });
    }
  }

  /**
   * Update session insights
   * PUT /api/v1/chat-sessions/:id/insights
   */
  async updateInsights(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const insights: UpdateInsightsData = req.body;

      const session = await chatSessionService.updateSessionInsights(id, insights);
      if (!session) {
        res.status(404).json({ error: 'Chat session not found' });
        return;
      }

      res.json({
        message: 'Insights updated',
        session,
      });
    } catch (error: any) {
      console.error('[ChatSessionController] Update insights error:', error);
      res.status(500).json({ error: error.message || 'Failed to update insights' });
    }
  }

  /**
   * End a chat session
   * PUT /api/v1/chat-sessions/:id/end
   */
  async endSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const session = await chatSessionService.endSession(id);
      if (!session) {
        res.status(404).json({ error: 'Chat session not found' });
        return;
      }

      res.json({
        message: 'Chat session ended',
        session,
      });
    } catch (error: any) {
      console.error('[ChatSessionController] End session error:', error);
      res.status(500).json({ error: error.message || 'Failed to end chat session' });
    }
  }

  /**
   * Get user's communication profile
   * GET /api/v1/chat-sessions/user/:userId/profile
   */
  async getUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      // Verify user has access (can only access own profile unless admin)
      if (req.user?.userId !== userId && req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const profile = await chatSessionService.getUserCommunicationProfile(userId);

      res.json({
        userId,
        profile,
      });
    } catch (error: any) {
      console.error('[ChatSessionController] Get profile error:', error);
      res.status(500).json({ error: error.message || 'Failed to get user profile' });
    }
  }

  /**
   * Get recent sessions for a user
   * GET /api/v1/chat-sessions/user/:userId/recent
   */
  async getRecentSessions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      // Verify user has access
      if (req.user?.userId !== userId && req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const sessions = await chatSessionService.getRecentSessions(userId, limit);

      res.json({
        userId,
        sessions,
        count: sessions.length,
      });
    } catch (error: any) {
      console.error('[ChatSessionController] Get recent sessions error:', error);
      res.status(500).json({ error: error.message || 'Failed to get recent sessions' });
    }
  }

  /**
   * Get active session for user and question
   * GET /api/v1/chat-sessions/active
   */
  async getActiveSession(req: Request, res: Response): Promise<void> {
    try {
      const { questionId } = req.query;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!questionId || typeof questionId !== 'string') {
        res.status(400).json({ error: 'questionId query parameter is required' });
        return;
      }

      const session = await chatSessionService.getActiveSession(userId, questionId);

      if (!session) {
        res.status(404).json({ error: 'No active session found' });
        return;
      }

      res.json({ session });
    } catch (error: any) {
      console.error('[ChatSessionController] Get active session error:', error);
      res.status(500).json({ error: error.message || 'Failed to get active session' });
    }
  }
}

export const chatSessionController = new ChatSessionController();






