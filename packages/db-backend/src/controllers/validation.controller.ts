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
  grammarIssues?: string[];
  wordingSuggestions?: string[];
  satFormatAlignment?: {
    aligned: boolean;
    issues: string[];
    suggestions: string[];
  };
  complexityAssessment?: {
    level: 'too-easy' | 'appropriate' | 'too-hard';
    reasoning: string;
    suggestions?: string;
  };
  overallQuality?: {
    score: number; // 1-10
    feedback: string;
  };
}

export class ValidationController {
  /**
   * GET /api/v1/validation/questions
   * Get questions for validation (paginated)
   */
  async getQuestionsForValidation(req: Request, res: Response): Promise<void> {
    try {
      const { subject, limit = 100, skip = 0 } = req.query;
      
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

      // Prepare the comprehensive validation prompt
      const prompt = `You are an expert SAT tutor and test question reviewer. Your task is to comprehensively review this practice question across multiple dimensions:

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

Please evaluate the following aspects and respond in JSON format:

1. ANSWER CORRECTNESS: Verify if the marked correct answer is actually correct. If wrong, suggest the correct answer.

2. GRAMMAR: Check for any grammatical errors in the question text, options, or explanation. List any issues found.

3. WORDING & CLARITY: Review the wording for clarity, precision, and appropriateness for high school students. Suggest improvements if needed.

4. SAT FORMAT ALIGNMENT: Verify the question aligns with official SAT format standards:
   - Question structure matches SAT style
   - Options are parallel in structure
   - Language and terminology are appropriate
   - Question type matches SAT question types
   - Distractors are plausible and well-constructed

5. COMPLEXITY LEVEL: Assess if the difficulty level is appropriate for the stated difficulty:
   - Too easy: Question is simpler than expected for the difficulty level
   - Appropriate: Question matches the difficulty level
   - Too hard: Question is more complex than expected for the difficulty level

6. OVERALL QUALITY: Provide an overall quality score (1-10) and comprehensive feedback.

Please respond in JSON format:
{
  "isAnswerCorrect": true/false,
  "suggestedAnswer": "A/B/C/D" (only if current answer is wrong, otherwise null),
  "improvedExplanation": "A clear, simple explanation for high school students",
  "reasoning": "Brief explanation of answer correctness",
  "grammarIssues": ["list of any grammatical errors found", "or empty array if none"],
  "wordingSuggestions": ["suggestions for improving clarity and wording", "or empty array if none"],
  "satFormatAlignment": {
    "aligned": true/false,
    "issues": ["list of format issues", "or empty array if none"],
    "suggestions": ["suggestions for better alignment", "or empty array if none"]
  },
  "complexityAssessment": {
    "level": "too-easy" | "appropriate" | "too-hard",
    "reasoning": "explanation of complexity assessment",
    "suggestions": "optional suggestions for adjusting complexity"
  },
  "overallQuality": {
    "score": 1-10,
    "feedback": "comprehensive feedback on overall question quality"
  }
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert SAT tutor and test question reviewer with deep knowledge of SAT format, standards, and question construction. You evaluate questions across grammar, wording, format alignment, complexity, and overall quality. Respond only with valid JSON.',
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
        grammarIssues: result.grammarIssues || [],
        wordingSuggestions: result.wordingSuggestions || [],
        satFormatAlignment: result.satFormatAlignment || {
          aligned: true,
          issues: [],
          suggestions: [],
        },
        complexityAssessment: result.complexityAssessment || {
          level: 'appropriate',
          reasoning: '',
        },
        overallQuality: result.overallQuality || {
          score: 5,
          feedback: '',
        },
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

