import { Router } from 'express';
import { sessionController } from '../controllers/session.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.post(
  '/start',
  authenticate,
  (req, res) => sessionController.startSession(req, res)
);

router.put(
  '/:id/end',
  authenticate,
  (req, res) => sessionController.endSession(req, res)
);

router.put(
  '/:id/question',
  authenticate,
  (req, res) => sessionController.addQuestionToSession(req, res)
);

router.get(
  '/history',
  authenticate,
  (req, res) => sessionController.getHistory(req, res)
);

router.get(
  '/active',
  authenticate,
  (req, res) => sessionController.getActiveSession(req, res)
);

export default router;

