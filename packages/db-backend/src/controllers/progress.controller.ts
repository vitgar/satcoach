import { Request, Response } from 'express';
import { progressService } from '../services/progress.service';

export class ProgressController {
  /**
   * POST /api/v1/progress/attempt
   * Record a question attempt
   */
  async recordAttempt(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { questionId, isCorrect, timeSpent, hintsUsed, confidence, chatInteractions } = req.body;

      // Validation
      if (!questionId || typeof isCorrect !== 'boolean' || !timeSpent) {
        res.status(400).json({ error: 'Missing required fields: questionId, isCorrect, timeSpent' });
        return;
      }

      if (timeSpent < 0) {
        res.status(400).json({ error: 'timeSpent must be positive' });
        return;
      }

      const result = await progressService.recordAttempt({
        userId: req.user.userId,
        questionId,
        isCorrect,
        timeSpent,
        hintsUsed,
        confidence,
        chatInteractions,
      });

      res.json({
        message: 'Attempt recorded successfully',
        nextReviewDate: result.nextReviewDate,
        masteryLevel: result.masteryLevel,
        newStudentLevel: result.newStudentLevel,
        progress: result.progress,
      });
    } catch (error: any) {
      console.error('Record attempt error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/progress/schedule
   * Get spaced repetition review schedule
   */
  async getSchedule(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const schedule = await progressService.getReviewSchedule(req.user.userId);

      res.json({
        schedule,
        summary: {
          totalDueNow: schedule.dueNow.length,
          totalOverdue: schedule.overdue.length,
          totalUpcoming: schedule.upcoming.length,
        },
      });
    } catch (error: any) {
      console.error('Get schedule error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/progress/topic/:subject/:topic
   * Get progress for a specific topic
   */
  async getTopicProgress(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { subject, topic } = req.params;

      if (!subject || !topic) {
        res.status(400).json({ error: 'Subject and topic are required' });
        return;
      }

      const progress = await progressService.getTopicProgress(
        req.user.userId,
        subject,
        topic
      );

      if (!progress) {
        res.status(404).json({ error: 'No progress found for this topic' });
        return;
      }

      res.json({ progress });
    } catch (error: any) {
      console.error('Get topic progress error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/progress/all
   * Get all progress for a student
   */
  async getAllProgress(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const progress = await progressService.getAllProgress(req.user.userId);

      res.json({
        progress,
        total: progress.length,
      });
    } catch (error: any) {
      console.error('Get all progress error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/progress/analytics
   * Get analytics and statistics
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const analytics = await progressService.getAnalytics(req.user.userId);

      res.json({ analytics });
    } catch (error: any) {
      console.error('Get analytics error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export const progressController = new ProgressController();

