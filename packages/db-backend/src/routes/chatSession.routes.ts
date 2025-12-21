import { Router } from 'express';
import { chatSessionController } from '../controllers/chatSession.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route POST /api/v1/chat-sessions
 * @desc Create a new chat session
 * @access Private
 */
router.post('/', (req, res) => chatSessionController.createSession(req, res));

/**
 * @route GET /api/v1/chat-sessions/active
 * @desc Get active session for user and question
 * @access Private
 */
router.get('/active', (req, res) => chatSessionController.getActiveSession(req, res));

/**
 * @route GET /api/v1/chat-sessions/user/:userId/profile
 * @desc Get user's aggregated communication profile
 * @access Private
 */
router.get('/user/:userId/profile', (req, res) => chatSessionController.getUserProfile(req, res));

/**
 * @route GET /api/v1/chat-sessions/user/:userId/recent
 * @desc Get recent sessions for a user
 * @access Private
 */
router.get('/user/:userId/recent', (req, res) => chatSessionController.getRecentSessions(req, res));

/**
 * @route GET /api/v1/chat-sessions/:id
 * @desc Get a chat session by ID
 * @access Private
 */
router.get('/:id', (req, res) => chatSessionController.getSession(req, res));

/**
 * @route PUT /api/v1/chat-sessions/:id/insights
 * @desc Update session insights with new message analysis
 * @access Private
 */
router.put('/:id/insights', (req, res) => chatSessionController.updateInsights(req, res));

/**
 * @route PUT /api/v1/chat-sessions/:id/end
 * @desc End a chat session
 * @access Private
 */
router.put('/:id/end', (req, res) => chatSessionController.endSession(req, res));

export default router;

