import { Request, Response } from 'express';
import { StudySession } from '../models/StudySession.model';
import mongoose from 'mongoose';

export class SessionController {
  /**
   * POST /api/v1/sessions/start
   * Start a new study session
   */
  async startSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { timerUsed } = req.body;

      const session = await StudySession.create({
        userId: req.user.userId,
        startTime: new Date(),
        timerUsed: timerUsed || false,
      });

      res.status(201).json({
        message: 'Study session started',
        session,
      });
    } catch (error: any) {
      console.error('Start session error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * PUT /api/v1/sessions/:id/end
   * End a study session
   */
  async endSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid session ID' });
        return;
      }

      const session = await StudySession.findOne({
        _id: id,
        userId: req.user.userId,
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      if (session.endTime) {
        res.status(400).json({ error: 'Session already ended' });
        return;
      }

      session.endSession();
      
      // Calculate average confidence if we have attempts
      if (session.questionsAttempted.length > 0) {
        // Note: confidence would come from the progress records
        // For now, we'll leave it at default
      }

      await session.save();

      res.json({
        message: 'Study session ended',
        session,
        summary: {
          duration: session.totalTimeSpent,
          questionsAttempted: session.questionsAttempted.length,
          questionsCorrect: session.questionsCorrect.length,
          accuracy: session.questionsAttempted.length > 0
            ? session.questionsCorrect.length / session.questionsAttempted.length
            : 0,
        },
      });
    } catch (error: any) {
      console.error('End session error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * PUT /api/v1/sessions/:id/question
   * Add a question attempt to session
   */
  async addQuestionToSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;
      const { questionId, isCorrect, subject } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: 'Invalid session ID' });
        return;
      }

      if (!questionId || typeof isCorrect !== 'boolean' || !subject) {
        res.status(400).json({ error: 'Missing required fields: questionId, isCorrect, subject' });
        return;
      }

      const session = await StudySession.findOne({
        _id: id,
        userId: req.user.userId,
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      if (session.endTime) {
        res.status(400).json({ error: 'Cannot add to ended session' });
        return;
      }

      session.addQuestionAttempt(
        new mongoose.Types.ObjectId(questionId),
        isCorrect,
        subject
      );

      await session.save();

      res.json({
        message: 'Question added to session',
        session,
      });
    } catch (error: any) {
      console.error('Add question to session error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/sessions/history
   * Get session history for a student
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { limit = '20' } = req.query;
      const limitNum = parseInt(limit as string, 10);

      const sessions = await StudySession.find({
        userId: req.user.userId,
      })
        .sort({ startTime: -1 })
        .limit(limitNum)
        .exec();

      // Calculate summary statistics
      const completed = sessions.filter(s => s.endTime !== null);
      const totalTime = completed.reduce((sum, s) => sum + s.totalTimeSpent, 0);
      const totalQuestions = completed.reduce((sum, s) => sum + s.questionsAttempted.length, 0);
      const totalCorrect = completed.reduce((sum, s) => sum + s.questionsCorrect.length, 0);

      res.json({
        sessions,
        summary: {
          totalSessions: completed.length,
          totalTimeSpent: totalTime,
          totalQuestionsAttempted: totalQuestions,
          overallAccuracy: totalQuestions > 0 ? totalCorrect / totalQuestions : 0,
        },
      });
    } catch (error: any) {
      console.error('Get history error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/sessions/active
   * Get active session if any
   */
  async getActiveSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const session = await StudySession.findOne({
        userId: req.user.userId,
        endTime: null,
      }).sort({ startTime: -1 });

      if (!session) {
        res.status(404).json({ error: 'No active session found' });
        return;
      }

      res.json({ session });
    } catch (error: any) {
      console.error('Get active session error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export const sessionController = new SessionController();

