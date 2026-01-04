import { Request, Response } from 'express';
import { guidedChatService, SessionContext, EmbeddedQuestion } from '../services/guidedChat.service';
import { topicRecommenderService, TopicRecommendation, PerformanceData, StudentContext } from '../services/topicRecommender.service';

export class GuidedReviewController {
  /**
   * Get AI-enhanced topic recommendations with natural language explanation
   * POST /api/v1/guided-review/recommendations
   */
  async getRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { subject, recommendations, studentContext, performanceData } = req.body;

      if (!subject || !recommendations || !studentContext || !performanceData) {
        res.status(400).json({ 
          error: 'subject, recommendations, studentContext, and performanceData are required' 
        });
        return;
      }

      console.log(`[GuidedReview] Generating AI recommendations for ${subject}`);

      // Generate AI explanation
      const explanation = await topicRecommenderService.generateRecommendationExplanation(
        subject,
        recommendations as TopicRecommendation[],
        studentContext as StudentContext,
        performanceData as PerformanceData
      );

      // Optionally get AI-prioritized ordering
      const prioritized = await topicRecommenderService.prioritizeTopics(
        recommendations as TopicRecommendation[],
        studentContext as StudentContext,
        performanceData as PerformanceData
      );

      res.json({
        message: 'Recommendations generated',
        explanation,
        prioritizedTopics: prioritized,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[GuidedReview] Recommendations error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate recommendations' });
    }
  }

  /**
   * Send a message in guided review session
   * POST /api/v1/guided-review/chat
   */
  async chat(req: Request, res: Response): Promise<void> {
    try {
      const { message, sessionContext } = req.body;

      if (!message || !sessionContext) {
        res.status(400).json({ error: 'message and sessionContext are required' });
        return;
      }

      console.log(`[GuidedReview] Chat for topic: ${sessionContext.topic}`);

      const response = await guidedChatService.generateGuidedResponse(
        message,
        sessionContext as SessionContext
      );

      res.json({
        message: 'Response generated',
        ...response,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[GuidedReview] Chat error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate chat response' });
    }
  }

  /**
   * Start studying a topic - get introduction message
   * POST /api/v1/guided-review/start-topic
   */
  async startTopic(req: Request, res: Response): Promise<void> {
    try {
      const { sessionContext } = req.body;

      if (!sessionContext || !sessionContext.topic || !sessionContext.subject) {
        res.status(400).json({ error: 'sessionContext with topic and subject is required' });
        return;
      }

      console.log(`[GuidedReview] Starting topic: ${sessionContext.topic}`);

      const introduction = await guidedChatService.generateTopicIntroduction(
        sessionContext as SessionContext
      );

      res.json({
        message: 'Topic started',
        ...introduction,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[GuidedReview] Start topic error:', error);
      res.status(500).json({ error: error.message || 'Failed to start topic' });
    }
  }

  /**
   * Get feedback on question answer
   * POST /api/v1/guided-review/question-feedback
   */
  async questionFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { studentAnswer, question, isCorrect, sessionContext } = req.body;

      if (!studentAnswer || !question || isCorrect === undefined || !sessionContext) {
        res.status(400).json({ 
          error: 'studentAnswer, question, isCorrect, and sessionContext are required' 
        });
        return;
      }

      console.log(`[GuidedReview] Question feedback - correct: ${isCorrect}`);

      const feedback = await guidedChatService.generateQuestionFeedback(
        studentAnswer,
        question as EmbeddedQuestion,
        isCorrect,
        sessionContext as SessionContext
      );

      res.json({
        message: 'Feedback generated',
        ...feedback,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[GuidedReview] Feedback error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate feedback' });
    }
  }

  /**
   * Generate session summary
   * POST /api/v1/guided-review/summarize
   */
  async summarize(req: Request, res: Response): Promise<void> {
    try {
      const { sessionContext, questionsAttempted, questionsCorrect, conceptsCovered, sessionDurationMinutes } = req.body;

      if (!sessionContext) {
        res.status(400).json({ error: 'sessionContext is required' });
        return;
      }

      console.log(`[GuidedReview] Generating summary for ${sessionContext.topic}`);

      const summary = await guidedChatService.generateSessionSummary({
        ...sessionContext,
        questionsAttempted: questionsAttempted || 0,
        questionsCorrect: questionsCorrect || 0,
        conceptsCovered: conceptsCovered || [],
        sessionDurationMinutes: sessionDurationMinutes || 0,
      });

      res.json({
        message: 'Summary generated',
        ...summary,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[GuidedReview] Summary error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate summary' });
    }
  }

  /**
   * Parse a question from response text (utility endpoint)
   * POST /api/v1/guided-review/parse-question
   */
  async parseQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { responseText } = req.body;

      if (!responseText) {
        res.status(400).json({ error: 'responseText is required' });
        return;
      }

      const { cleanResponse, embeddedQuestion } = guidedChatService.parseQuestionFromResponse(responseText);

      res.json({
        cleanResponse,
        embeddedQuestion,
        hasQuestion: embeddedQuestion !== null,
      });
    } catch (error: any) {
      console.error('[GuidedReview] Parse question error:', error);
      res.status(500).json({ error: error.message || 'Failed to parse question' });
    }
  }
}

export const guidedReviewController = new GuidedReviewController();






