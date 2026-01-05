import { Request, Response } from 'express';
import { questionService } from '../services/question.service';
import { Subject, Difficulty } from '../models/Question.model';

export class QuestionController {
  /**
   * GET /api/v1/questions
   * List questions with optional filters
   */
  async listQuestions(req: Request, res: Response): Promise<void> {
    try {
      const { subject, difficulty, tags, limit } = req.query;

      const filters: any = {};
      
      if (subject) {
        filters.subject = subject as Subject;
      }
      
      if (difficulty) {
        filters.difficulty = difficulty as Difficulty;
      }
      
      if (tags) {
        filters.tags = Array.isArray(tags) ? tags : [tags];
      }

      const limitNum = limit ? parseInt(limit as string, 10) : 20;

      const questions = await questionService.getQuestions(filters, limitNum);
      const total = await questionService.countQuestions(filters);

      res.json({
        questions,
        total,
        limit: limitNum,
      });
    } catch (error: any) {
      console.error('List questions error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/questions/:id
   * Get a specific question by ID
   */
  async getQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const question = await questionService.getQuestionById(id);

      if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      res.json({ question });
    } catch (error: any) {
      console.error('Get question error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/questions
   * Create a new question (admin only)
   */
  async createQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { subject, difficulty, difficultyScore, content, tags, generatedBy } = req.body;

      // Validation
      if (!subject || !difficulty || !content) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      if (!content.questionText || !content.options || !content.correctAnswer || !content.explanation) {
        res.status(400).json({ error: 'Missing required content fields' });
        return;
      }

      if (content.options.length !== 4) {
        res.status(400).json({ error: 'Must provide exactly 4 options' });
        return;
      }

      if (!['A', 'B', 'C', 'D'].includes(content.correctAnswer)) {
        res.status(400).json({ error: 'Correct answer must be A, B, C, or D' });
        return;
      }

      const question = await questionService.createQuestion({
        subject,
        difficulty,
        difficultyScore,
        content,
        tags: tags || [],
        generatedBy: generatedBy || 'manual',
      });

      res.status(201).json({
        message: 'Question created successfully',
        question,
      });
    } catch (error: any) {
      console.error('Create question error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/questions/next
   * Get the next question for student (user-aware, no repeats)
   */
  async getNextQuestion(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { subject, topic, requireGraph } = req.query;
      const userId = req.user.userId;

      // Get user's learning profile
      const { authService } = await import('../services/auth.service');
      const user = await authService.getUserById(userId);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const studentLevel = user.learningProfile.currentLevel;

      console.log(`[QuestionController] Getting next question for user ${userId}`);

      // Use new user-aware method
      const question = await questionService.getNextQuestionForUser(
        userId,
        subject as Subject | undefined,
        topic as string | undefined,
        requireGraph === 'true'
      );

      // Don't send the correct answer to frontend yet
      const questionResponse = question.toObject();
      const { correctAnswer, ...contentWithoutAnswer } = questionResponse.content;

      res.json({
        question: {
          ...questionResponse,
          content: {
            ...contentWithoutAnswer,
            options: questionResponse.content.options,
          },
        },
        studentLevel,
        recommendedDifficulty: this.mapLevelToDifficulty(studentLevel),
      });
    } catch (error: any) {
      console.error('[QuestionController] Get next question error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/questions/:id/statistics
   * Get statistics for a specific question
   */
  async getQuestionStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const statistics = await questionService.getQuestionStatistics(id);

      res.json({ statistics });
    } catch (error: any) {
      console.error('Get question statistics error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/questions/:id/answer
   * Submit an answer for a question
   */
  async submitAnswer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userAnswer, timeSpent } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!userAnswer) {
        res.status(400).json({ error: 'userAnswer is required' });
        return;
      }

      console.log(`[QuestionController] User ${userId} submitting answer for question ${id}`);

      const result = await questionService.submitAnswer(
        userId,
        id,
        userAnswer,
        timeSpent || 0
      );

      res.json({
        message: result.isCorrect ? 'Correct!' : 'Incorrect',
        isCorrect: result.isCorrect,
        correctAnswer: result.correctAnswer,
        explanation: result.explanation, // Always provide explanation for learning
      });
    } catch (error: any) {
      console.error('[QuestionController] Submit answer error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/questions/save-generated
   * Save AI-generated questions (authenticated users)
   */
  async saveGeneratedQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { subject, difficulty, difficultyScore, content, tags } = req.body;

      // Validation
      if (!subject || !difficulty || !content) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      if (!content.questionText || !content.options || !content.correctAnswer || !content.explanation) {
        res.status(400).json({ error: 'Missing required content fields' });
        return;
      }

      if (content.options.length !== 4) {
        res.status(400).json({ error: 'Must provide exactly 4 options' });
        return;
      }

      if (!['A', 'B', 'C', 'D'].includes(content.correctAnswer)) {
        res.status(400).json({ error: 'Correct answer must be A, B, C, or D' });
        return;
      }

      const question = await questionService.createQuestion({
        subject,
        difficulty,
        difficultyScore: difficultyScore || 5,
        content,
        tags: tags || [],
        generatedBy: 'ai',
      });

      console.log(`[QuestionController] AI-generated question saved: ${question._id}`);

      res.status(201).json({
        message: 'Question saved successfully',
        question,
      });
    } catch (error: any) {
      console.error('Save generated question error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Helper: Map level to difficulty for response
   */
  private mapLevelToDifficulty(level: number): Difficulty {
    if (level <= 3) return 'easy';
    if (level <= 7) return 'medium';
    return 'hard';
  }
}

export const questionController = new QuestionController();

