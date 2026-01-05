import { Request, Response } from 'express';
import { questionGeneratorService, Subject, Difficulty } from '../services/question-generator.service';

// GPT-5.2 Compatible - Updated Jan 2026

export class QuestionController {
  /**
   * Generate a single question
   * POST /api/v1/questions/generate
   * 
   * Body params:
   * - subject: 'math' | 'reading' | 'writing' (required)
   * - difficulty: 'easy' | 'medium' | 'hard' (required)
   * - topic: string (optional)
   * - includeGraph: boolean (optional, only for math - forces graph data in response)
   */
  async generateQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { subject, difficulty, topic, includeGraph } = req.body;

      // Validate inputs
      if (!subject || !['math', 'reading', 'writing'].includes(subject)) {
        res.status(400).json({ error: 'Invalid subject. Must be math, reading, or writing.' });
        return;
      }

      if (!difficulty || !['easy', 'medium', 'hard'].includes(difficulty)) {
        res.status(400).json({ error: 'Invalid difficulty. Must be easy, medium, or hard.' });
        return;
      }

      const graphFlag = subject === 'math' && includeGraph === true;
      console.log(`[QuestionController] Generating ${difficulty} ${subject} question${topic ? ` on topic: ${topic}` : ''}${graphFlag ? ' (with graph)' : ''}`);

      const question = await questionGeneratorService.generateQuestion(
        subject as Subject,
        difficulty as Difficulty,
        topic,
        graphFlag
      );

      res.status(200).json({
        message: 'Question generated successfully',
        question,
      });
    } catch (error: any) {
      console.error('[QuestionController] Error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate question' });
    }
  }

  /**
   * Generate multiple questions
   * POST /api/v1/questions/generate-batch
   * 
   * Body params:
   * - subject: 'math' | 'reading' | 'writing' (required)
   * - difficulty: 'easy' | 'medium' | 'hard' (required)
   * - count: number 1-10 (optional, default 5)
   * - topic: string (optional)
   * - includeGraph: boolean (optional, only for math - forces graph data in all responses)
   */
  async generateQuestionBatch(req: Request, res: Response): Promise<void> {
    try {
      const { subject, difficulty, count = 5, topic, includeGraph } = req.body;

      // Validate inputs
      if (!subject || !['math', 'reading', 'writing'].includes(subject)) {
        res.status(400).json({ error: 'Invalid subject' });
        return;
      }

      if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
        res.status(400).json({ error: 'Invalid difficulty' });
        return;
      }

      if (count < 1 || count > 10) {
        res.status(400).json({ error: 'Count must be between 1 and 10' });
        return;
      }

      const graphFlag = subject === 'math' && includeGraph === true;
      console.log(`[QuestionController] Generating ${count} ${difficulty} ${subject} questions${graphFlag ? ' (with graphs)' : ''}`);

      const questions = await questionGeneratorService.generateQuestions(
        subject as Subject,
        difficulty as Difficulty,
        count,
        topic,
        graphFlag
      );

      res.status(200).json({
        message: `${questions.length} questions generated successfully`,
        questions,
        count: questions.length,
      });
    } catch (error: any) {
      console.error('[QuestionController] Batch error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate questions' });
    }
  }
}

export const questionController = new QuestionController();

