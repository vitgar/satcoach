import { Router } from 'express';
import { learningController } from '../controllers/learning.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All learning routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/learning/state
 * @desc    Get current learner state (flow zone, difficulty, bloom level)
 * @access  Private
 */
router.get('/state', learningController.getLearnerState.bind(learningController));

/**
 * @route   GET /api/v1/learning/profile
 * @desc    Get comprehensive learner profile
 * @access  Private
 */
router.get('/profile', learningController.getProfile.bind(learningController));

/**
 * @route   GET /api/v1/learning/recommendations
 * @desc    Get personalized learning recommendations
 * @access  Private
 */
router.get('/recommendations', learningController.getRecommendations.bind(learningController));

/**
 * @route   POST /api/v1/learning/session/start
 * @desc    Start a new learning session
 * @access  Private
 * @body    { sessionType: 'study' | 'review' | 'practice' | 'explanation' }
 */
router.post('/session/start', learningController.startSession.bind(learningController));

/**
 * @route   POST /api/v1/learning/session/end
 * @desc    End the current learning session
 * @access  Private
 */
router.post('/session/end', learningController.endSession.bind(learningController));

/**
 * @route   GET /api/v1/learning/question
 * @desc    Get next question based on learning state
 * @access  Private
 * @query   subject (optional): 'math' | 'reading' | 'writing'
 * @query   topic (optional): specific topic
 * @query   forReview (optional): 'true' to prioritize review questions
 */
router.get('/question', learningController.getNextQuestion.bind(learningController));

/**
 * @route   POST /api/v1/learning/attempt
 * @desc    Process a question attempt
 * @access  Private
 * @body    {
 *            questionId: string,
 *            isCorrect: boolean,
 *            userAnswer: string,
 *            timeSpent: number (seconds),
 *            hintsUsed: number,
 *            chatInteractions: number
 *          }
 */
router.post('/attempt', learningController.processAttempt.bind(learningController));

/**
 * @route   POST /api/v1/learning/explain
 * @desc    Process a Feynman-style explanation
 * @access  Private
 * @body    {
 *            topic: string,
 *            explanation: string,
 *            conceptId: string (optional),
 *            questionId: string (optional)
 *          }
 */
router.post('/explain', learningController.processExplanation.bind(learningController));

export default router;

