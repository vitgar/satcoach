import { Router } from 'express';
import { guidedSessionController } from '../controllers/guidedSession.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route POST /api/v1/guided-sessions
 * @desc Create a new guided session
 * @access Private
 */
router.post('/', (req, res) => guidedSessionController.createSession(req, res));

/**
 * @route GET /api/v1/guided-sessions/active
 * @desc Get active session for current user
 * @access Private
 */
router.get('/active', (req, res) => guidedSessionController.getActiveSession(req, res));

/**
 * @route GET /api/v1/guided-sessions/recommendations/:subject
 * @desc Get topic recommendations for a subject
 * @access Private
 */
router.get('/recommendations/:subject', (req, res) => guidedSessionController.getRecommendations(req, res));

/**
 * @route GET /api/v1/guided-sessions/topic-history
 * @desc Get previous session history for a specific topic
 * @access Private
 */
router.get('/topic-history', (req, res) => guidedSessionController.getTopicHistory(req, res));

/**
 * @route GET /api/v1/guided-sessions/performance/:subject
 * @desc Get performance summary for a subject
 * @access Private
 */
router.get('/performance/:subject', (req, res) => guidedSessionController.getPerformanceSummary(req, res));

/**
 * @route GET /api/v1/guided-sessions/smart-topic/:subject
 * @desc Get AI-selected optimal topic for a subject
 * @access Private
 */
router.get('/smart-topic/:subject', (req, res) => guidedSessionController.getSmartTopic(req, res));

/**
 * @route GET /api/v1/guided-sessions/all-topics/:subject
 * @desc Get all available topics for a subject (for override dropdown)
 * @access Private
 */
router.get('/all-topics/:subject', (req, res) => guidedSessionController.getAllTopics(req, res));

/**
 * @route GET /api/v1/guided-sessions/user/:userId/history
 * @desc Get session history for a user
 * @access Private
 */
router.get('/user/:userId/history', (req, res) => guidedSessionController.getSessionHistory(req, res));

/**
 * @route GET /api/v1/guided-sessions/:id
 * @desc Get a guided session by ID
 * @access Private
 */
router.get('/:id', (req, res) => guidedSessionController.getSession(req, res));

/**
 * @route PUT /api/v1/guided-sessions/:id/message
 * @desc Add a message to session chat history
 * @access Private
 */
router.put('/:id/message', (req, res) => guidedSessionController.addMessage(req, res));

/**
 * @route PUT /api/v1/guided-sessions/:id/question-attempt
 * @desc Record a question attempt in the session
 * @access Private
 */
router.put('/:id/question-attempt', (req, res) => guidedSessionController.recordQuestionAttempt(req, res));

/**
 * @route PUT /api/v1/guided-sessions/:id/pause
 * @desc Pause a guided session (save without ending)
 * @access Private
 */
router.put('/:id/pause', (req, res) => guidedSessionController.pauseSession(req, res));

/**
 * @route PUT /api/v1/guided-sessions/:id/progress
 * @desc Update session progress (for auto-save)
 * @access Private
 */
router.put('/:id/progress', (req, res) => guidedSessionController.updateProgress(req, res));

/**
 * @route PUT /api/v1/guided-sessions/:id/end
 * @desc End a guided session
 * @access Private
 */
router.put('/:id/end', (req, res) => guidedSessionController.endSession(req, res));

export default router;

