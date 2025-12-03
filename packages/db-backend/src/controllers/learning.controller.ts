import { Request, Response, NextFunction } from 'express';
import { learningOrchestratorService } from '../services/learningOrchestrator.service';
import { learnerModelService } from '../services/learnerModel.service';

/**
 * Learning Controller
 * 
 * Handles all learning-related endpoints:
 * - Get learner state
 * - Start/end sessions
 * - Get questions
 * - Process attempts
 * - Process explanations
 * - Get recommendations
 */

export class LearningController {
  /**
   * Get current learner state
   * GET /api/v1/learning/state
   */
  async getLearnerState(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const state = await learningOrchestratorService.getLearnerState(userId.toString());

      res.json({
        success: true,
        data: state,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Start a new learning session
   * POST /api/v1/learning/session/start
   */
  async startSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { sessionType = 'study' } = req.body;

      const result = await learningOrchestratorService.startSession(
        userId.toString(),
        sessionType
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * End the current learning session
   * POST /api/v1/learning/session/end
   */
  async endSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const summary = await learningOrchestratorService.endSession(userId.toString());

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get next question
   * GET /api/v1/learning/question
   */
  async getNextQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { subject, topic, forReview } = req.query;

      const result = await learningOrchestratorService.getNextQuestion(
        userId.toString(),
        subject as any,
        topic as string,
        forReview === 'true'
      );

      if (!result) {
        return res.json({
          success: true,
          data: null,
          message: 'No questions available for the specified criteria',
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process a question attempt
   * POST /api/v1/learning/attempt
   */
  async processAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { questionId, isCorrect, userAnswer, timeSpent, hintsUsed, chatInteractions } = req.body;

      if (!questionId || isCorrect === undefined) {
        return res.status(400).json({
          error: 'Missing required fields: questionId, isCorrect',
        });
      }

      const result = await learningOrchestratorService.processAttempt(
        userId.toString(),
        questionId,
        {
          isCorrect,
          userAnswer: userAnswer || '',
          timeSpent: timeSpent || 0,
          hintsUsed: hintsUsed || 0,
          chatInteractions: chatInteractions || 0,
        }
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process a Feynman explanation
   * POST /api/v1/learning/explain
   */
  async processExplanation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { topic, explanation, conceptId, questionId } = req.body;

      if (!topic || !explanation) {
        return res.status(400).json({
          error: 'Missing required fields: topic, explanation',
        });
      }

      const result = await learningOrchestratorService.processExplanation(
        userId.toString(),
        topic,
        explanation,
        conceptId,
        questionId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get learning recommendations
   * GET /api/v1/learning/recommendations
   */
  async getRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const recommendations = await learnerModelService.getLearningRecommendations(
        userId.toString()
      );

      res.json({
        success: true,
        data: recommendations,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get learner profile
   * GET /api/v1/learning/profile
   */
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const profile = await learnerModelService.buildLearnerProfile(userId.toString());

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const learningController = new LearningController();

