import { Router } from 'express';
import { progressController } from '../controllers/progress.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.post(
  '/attempt',
  authenticate,
  (req, res) => progressController.recordAttempt(req, res)
);

router.get(
  '/schedule',
  authenticate,
  (req, res) => progressController.getSchedule(req, res)
);

router.get(
  '/topic/:subject/:topic',
  authenticate,
  (req, res) => progressController.getTopicProgress(req, res)
);

router.get(
  '/all',
  authenticate,
  (req, res) => progressController.getAllProgress(req, res)
);

router.get(
  '/analytics',
  authenticate,
  (req, res) => progressController.getAnalytics(req, res)
);

export default router;

