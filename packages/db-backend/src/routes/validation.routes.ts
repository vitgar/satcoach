import { Router } from 'express';
import { validationController } from '../controllers/validation.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All validation routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/validation/questions
 * Get questions for validation (paginated)
 */
router.get('/questions', (req, res) => validationController.getQuestionsForValidation(req, res));

/**
 * POST /api/v1/validation/validate-question
 * Validate a single question using AI
 */
router.post('/validate-question', (req, res) => validationController.validateQuestion(req, res));

/**
 * POST /api/v1/validation/apply-changes
 * Apply validated changes to questions
 */
router.post('/apply-changes', (req, res) => validationController.applyChanges(req, res));

/**
 * GET /api/v1/validation/stats
 * Get validation statistics
 */
router.get('/stats', (req, res) => validationController.getValidationStats(req, res));

export default router;

