import { Router } from 'express';
import { guidedReviewController } from '../controllers/guidedReview.controller';

const router = Router();

/**
 * @route POST /api/v1/guided-review/recommendations
 * @desc Get AI-enhanced topic recommendations with natural language explanation
 * @access Public (no auth required for AI endpoints)
 */
router.post('/recommendations', (req, res) => guidedReviewController.getRecommendations(req, res));

/**
 * @route POST /api/v1/guided-review/chat
 * @desc Send a message in guided review session
 * @access Public
 */
router.post('/chat', (req, res) => guidedReviewController.chat(req, res));

/**
 * @route POST /api/v1/guided-review/start-topic
 * @desc Start studying a topic - get introduction message
 * @access Public
 */
router.post('/start-topic', (req, res) => guidedReviewController.startTopic(req, res));

/**
 * @route POST /api/v1/guided-review/question-feedback
 * @desc Get feedback on question answer
 * @access Public
 */
router.post('/question-feedback', (req, res) => guidedReviewController.questionFeedback(req, res));

/**
 * @route POST /api/v1/guided-review/summarize
 * @desc Generate session summary
 * @access Public
 */
router.post('/summarize', (req, res) => guidedReviewController.summarize(req, res));

/**
 * @route POST /api/v1/guided-review/parse-question
 * @desc Parse a question from response text (utility endpoint)
 * @access Public
 */
router.post('/parse-question', (req, res) => guidedReviewController.parseQuestion(req, res));

export default router;

