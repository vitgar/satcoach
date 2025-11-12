import { Router } from 'express';
import { questionController } from '../controllers/question.controller';

const router = Router();

// Generate a single question
router.post('/generate', (req, res) => questionController.generateQuestion(req, res));

// Generate multiple questions in batch
router.post('/generate-batch', (req, res) => questionController.generateQuestionBatch(req, res));

export default router;

