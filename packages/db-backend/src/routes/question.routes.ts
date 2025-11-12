import { Router } from 'express';
import { questionController } from '../controllers/question.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Public routes (require authentication but not admin)
router.get(
  '/',
  authenticate,
  (req, res) => questionController.listQuestions(req, res)
);

router.get(
  '/next',
  authenticate,
  (req, res) => questionController.getNextQuestion(req, res)
);

router.get(
  '/:id',
  authenticate,
  (req, res) => questionController.getQuestion(req, res)
);

router.get(
  '/:id/statistics',
  authenticate,
  (req, res) => questionController.getQuestionStatistics(req, res)
);

// Submit answer for a question
router.post(
  '/:id/answer',
  authenticate,
  (req, res) => questionController.submitAnswer(req, res)
);

// Admin-only routes
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  (req, res) => questionController.createQuestion(req, res)
);

export default router;

