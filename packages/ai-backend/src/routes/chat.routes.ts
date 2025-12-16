import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';

const router = Router();

// Generate coaching response
router.post('/coach', (req, res) => chatController.generateCoachingResponse(req, res));

// Generate hint
router.post('/hint', (req, res) => chatController.generateHint(req, res));

// Generate explanation
router.post('/explain', (req, res) => chatController.generateExplanation(req, res));

// Clarify concept
router.post('/clarify', (req, res) => chatController.clarifyConcept(req, res));

// Generate clarifying questions
router.post('/clarifying-questions', (req, res) => chatController.generateClarifyingQuestions(req, res));

export default router;

