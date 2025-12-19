import { Request, Response } from 'express';
import OpenAI from 'openai';
import { Question } from '../models/Question.model';
import { config } from '../config/environment';

// OpenAI is optional for validation - only needed for AI-powered validation
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface ValidationResult {
  questionId: string;
  isAnswerCorrect: boolean;
  suggestedAnswer?: string;
  improvedExplanation: string;
  reasoning: string;
}

export class ValidationController {
  /**
   * GET /api/v1/validation/questions
   * Get questions for validation (paginated)
   */
  async getQuestionsForValidation(req: Request, res: Response): Promise<void> {
    try {
      const { subject, limit = 50, skip = 0 } = req.query;
      
      const filter: any = {};
      if (subject && subject !== 'all') {
        filter.subject = subject;
      }

      const questions = await Question.find(filter)
        .select('subject difficulty content tags metadata')
        .limit(Number(limit))
        .skip(Number(skip))
        .sort({ 'metadata.timesUsed': -1 }); // Prioritize frequently used questions

      const total = await Question.countDocuments(filter);

      res.json({
        questions,
        total,
        limit: Number(limit),
        skip: Number(skip),
      });
    } catch (error: any) {
      console.error('Get questions for validation error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/validation/validate-question
   * Validate a single question using OpenAI
   */
  async validateQuestion(req: Request, res: Response): Promise<void> {
    try {
      // Check if OpenAI is available
      if (!openai) {
        res.status(503).json({ 
          error: 'AI validation not available. OPENAI_API_KEY not configured.' 
        });
        return;
      }

      const { questionId } = req.body;

      if (!questionId) {
        res.status(400).json({ error: 'Question ID is required' });
        return;
      }

      const question = await Question.findById(questionId);
      if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      // Prepare the validation prompt
      const prompt = `You are an expert SAT tutor reviewing a practice question. Your task is to:
1. Verify if the marked correct answer is actually correct
2. Provide a clearer, simpler explanation suitable for high school students

Question Details:
Subject: ${question.subject}
Difficulty: ${question.difficulty}

Question: ${question.content.questionText}

Options:
A) ${question.content.options[0]}
B) ${question.content.options[1]}
C) ${question.content.options[2]}
D) ${question.content.options[3]}

Currently Marked Correct Answer: ${question.content.correctAnswer}
Current Explanation: ${question.content.explanation}

Please respond in JSON format:
{
  "isAnswerCorrect": true/false,
  "suggestedAnswer": "A/B/C/D" (only if current answer is wrong),
  "improvedExplanation": "A clear, simple explanation for high school students",
  "reasoning": "Brief explanation of why you made these suggestions"
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert SAT tutor. Respond only with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');

      const validationResult: ValidationResult = {
        questionId: String(question._id),
        isAnswerCorrect: result.isAnswerCorrect,
        suggestedAnswer: result.suggestedAnswer,
        improvedExplanation: result.improvedExplanation,
        reasoning: result.reasoning,
      };

      res.json(validationResult);
    } catch (error: any) {
      console.error('Validate question error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/v1/validation/apply-changes
   * Apply validated changes to multiple questions
   */
  async applyChanges(req: Request, res: Response): Promise<void> {
    try {
      const { changes } = req.body;

      if (!Array.isArray(changes) || changes.length === 0) {
        res.status(400).json({ error: 'Changes array is required' });
        return;
      }

      const results = {
        updated: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const change of changes) {
        try {
          const { questionId, newAnswer, newExplanation } = change;

          const updateData: any = {};
          if (newExplanation) {
            updateData['content.explanation'] = newExplanation;
          }
          if (newAnswer) {
            updateData['content.correctAnswer'] = newAnswer;
          }

          await Question.findByIdAndUpdate(questionId, updateData);
          results.updated++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Failed to update ${change.questionId}: ${error.message}`);
        }
      }

      res.json({
        message: 'Changes applied',
        results,
      });
    } catch (error: any) {
      console.error('Apply changes error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/v1/validation/stats
   * Get validation statistics
   */
  async getValidationStats(req: Request, res: Response): Promise<void> {
    try {
      const totalQuestions = await Question.countDocuments();
      const bySubject = await Question.aggregate([
        {
          $group: {
            _id: '$subject',
            count: { $sum: 1 },
          },
        },
      ]);

      res.json({
        totalQuestions,
        bySubject: bySubject.reduce((acc: Record<string, number>, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
      });
    } catch (error: any) {
      console.error('Get validation stats error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export const validationController = new ValidationController();

