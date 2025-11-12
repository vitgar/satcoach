import { Request, Response } from 'express';
import { chatCoachService, QuestionContext, StudentContext } from '../services/chat-coach.service';
import { ChatMessage } from '../services/openai.service';

export class ChatController {
  /**
   * Generate a coaching response
   * POST /api/v1/chat/coach
   */
  async generateCoachingResponse(req: Request, res: Response): Promise<void> {
    try {
      const { userMessage, questionContext, studentContext, chatHistory } = req.body;

      // Validate required fields
      if (!userMessage || typeof userMessage !== 'string') {
        res.status(400).json({ error: 'userMessage is required and must be a string' });
        return;
      }

      if (!questionContext || !questionContext.questionText) {
        res.status(400).json({ error: 'questionContext with questionText is required' });
        return;
      }

      if (!studentContext || typeof studentContext.level !== 'number') {
        res.status(400).json({ error: 'studentContext with level is required' });
        return;
      }

      console.log(`[ChatController] Generating coaching response for level ${studentContext.level} student`);

      const response = await chatCoachService.generateCoachingResponse({
        userMessage,
        questionContext: questionContext as QuestionContext,
        studentContext: studentContext as StudentContext,
        chatHistory: chatHistory as ChatMessage[] | undefined,
      });

      res.status(200).json({
        message: 'Coaching response generated',
        response,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[ChatController] Error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate coaching response' });
    }
  }

  /**
   * Generate a hint
   * POST /api/v1/chat/hint
   */
  async generateHint(req: Request, res: Response): Promise<void> {
    try {
      const { questionContext, studentContext } = req.body;

      if (!questionContext || !questionContext.questionText) {
        res.status(400).json({ error: 'questionContext is required' });
        return;
      }

      if (!studentContext || typeof studentContext.level !== 'number') {
        res.status(400).json({ error: 'studentContext is required' });
        return;
      }

      console.log(`[ChatController] Generating hint`);

      const hint = await chatCoachService.generateHint(
        questionContext as QuestionContext,
        studentContext as StudentContext
      );

      res.status(200).json({
        message: 'Hint generated',
        hint,
      });
    } catch (error: any) {
      console.error('[ChatController] Hint error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate hint' });
    }
  }

  /**
   * Generate an explanation
   * POST /api/v1/chat/explain
   */
  async generateExplanation(req: Request, res: Response): Promise<void> {
    try {
      const { questionContext, studentContext } = req.body;

      if (!questionContext || !questionContext.questionText) {
        res.status(400).json({ error: 'questionContext is required' });
        return;
      }

      if (!studentContext || typeof studentContext.level !== 'number') {
        res.status(400).json({ error: 'studentContext is required' });
        return;
      }

      console.log(`[ChatController] Generating explanation`);

      const explanation = await chatCoachService.generateExplanation(
        questionContext as QuestionContext,
        studentContext as StudentContext
      );

      res.status(200).json({
        message: 'Explanation generated',
        explanation,
      });
    } catch (error: any) {
      console.error('[ChatController] Explanation error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate explanation' });
    }
  }

  /**
   * Clarify a concept
   * POST /api/v1/chat/clarify
   */
  async clarifyConcept(req: Request, res: Response): Promise<void> {
    try {
      const { concept, subject, studentContext } = req.body;

      if (!concept || typeof concept !== 'string') {
        res.status(400).json({ error: 'concept is required' });
        return;
      }

      if (!subject || typeof subject !== 'string') {
        res.status(400).json({ error: 'subject is required' });
        return;
      }

      if (!studentContext || typeof studentContext.level !== 'number') {
        res.status(400).json({ error: 'studentContext is required' });
        return;
      }

      console.log(`[ChatController] Clarifying concept: ${concept}`);

      const clarification = await chatCoachService.clarifyConcept(
        concept,
        subject,
        studentContext as StudentContext
      );

      res.status(200).json({
        message: 'Concept clarified',
        clarification,
      });
    } catch (error: any) {
      console.error('[ChatController] Clarification error:', error);
      res.status(500).json({ error: error.message || 'Failed to clarify concept' });
    }
  }
}

export const chatController = new ChatController();

