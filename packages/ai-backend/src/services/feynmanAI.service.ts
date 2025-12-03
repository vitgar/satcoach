/**
 * Feynman AI Service
 * 
 * Uses OpenAI to evaluate student explanations using the Feynman Technique.
 * Provides intelligent feedback, identifies misconceptions, and guides refinement.
 */

import { openaiService } from './openai.service';
import { FEYNMAN_EVALUATOR_PROMPT } from '../prompts/system-prompts';

export interface FeynmanEvaluationResult {
  clarity: number;
  completeness: number;
  accuracy: number;
  jargonTerms: string[];
  misconceptions: string[];
  strengths: string[];
  gaps: string[];
  feedback: string;
  suggestedRefinements: string[];
  bloomLevel: number;
}

export interface EvaluationRequest {
  topic: string;
  explanation: string;
  conceptContext?: string;
  previousAttempts?: string[];
  studentLevel?: number;
  targetBloomLevel?: number;
}

// Function schema for structured evaluation output
const EVALUATION_SCHEMA = {
  name: 'evaluate_explanation',
  description: 'Evaluate a student explanation using the Feynman Technique',
  parameters: {
    type: 'object',
    properties: {
      clarity: {
        type: 'number',
        description: 'Clarity score from 0-100',
        minimum: 0,
        maximum: 100,
      },
      completeness: {
        type: 'number',
        description: 'Completeness score from 0-100',
        minimum: 0,
        maximum: 100,
      },
      accuracy: {
        type: 'number',
        description: 'Accuracy score from 0-100',
        minimum: 0,
        maximum: 100,
      },
      jargonTerms: {
        type: 'array',
        items: { type: 'string' },
        description: 'Technical terms that should be explained more simply',
      },
      misconceptions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Incorrect understanding or errors in the explanation',
      },
      strengths: {
        type: 'array',
        items: { type: 'string' },
        description: 'What the student did well',
      },
      gaps: {
        type: 'array',
        items: { type: 'string' },
        description: 'Important information that is missing',
      },
      feedback: {
        type: 'string',
        description: 'Encouraging, constructive feedback for the student',
      },
      suggestedRefinements: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific, actionable suggestions for improvement',
      },
      bloomLevel: {
        type: 'number',
        description: 'Bloom taxonomy level demonstrated (1-6)',
        minimum: 1,
        maximum: 6,
      },
    },
    required: [
      'clarity',
      'completeness',
      'accuracy',
      'jargonTerms',
      'misconceptions',
      'strengths',
      'gaps',
      'feedback',
      'suggestedRefinements',
      'bloomLevel',
    ],
  },
};

export class FeynmanAIService {
  /**
   * Evaluate a student's explanation using AI
   */
  async evaluateExplanation(request: EvaluationRequest): Promise<FeynmanEvaluationResult> {
    const userPrompt = this.buildEvaluationPrompt(request);

    try {
      const result = await openaiService.generateStructuredData<FeynmanEvaluationResult>(
        {
          messages: [
            { role: 'system', content: FEYNMAN_EVALUATOR_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3, // Lower temperature for more consistent evaluations
        },
        EVALUATION_SCHEMA
      );

      // Validate and normalize scores
      return this.normalizeResult(result);
    } catch (error: any) {
      console.error('Feynman AI evaluation failed:', error.message);
      // Return a basic evaluation on failure
      return this.getFallbackEvaluation(request.explanation);
    }
  }

  /**
   * Generate refinement prompts for a student
   */
  async generateRefinementPrompts(
    _topic: string,
    _explanation: string,
    evaluation: FeynmanEvaluationResult
  ): Promise<string[]> {
    const prompts: string[] = [];

    // Based on gaps
    if (evaluation.gaps.length > 0) {
      prompts.push(`Try adding: ${evaluation.gaps[0]}`);
    }

    // Based on jargon
    if (evaluation.jargonTerms.length > 0) {
      prompts.push(`Explain "${evaluation.jargonTerms[0]}" in simpler terms`);
    }

    // Based on clarity
    if (evaluation.clarity < 70) {
      prompts.push('Use a real-world analogy to make it clearer');
    }

    // Based on completeness
    if (evaluation.completeness < 70) {
      prompts.push('Add an example showing how this works');
    }

    // Based on accuracy
    if (evaluation.accuracy < 80 && evaluation.misconceptions.length > 0) {
      prompts.push('Double-check your understanding of the key facts');
    }

    // Add from AI suggestions if we don't have enough
    if (prompts.length < 2 && evaluation.suggestedRefinements.length > 0) {
      prompts.push(...evaluation.suggestedRefinements.slice(0, 2 - prompts.length));
    }

    return prompts.slice(0, 3); // Max 3 prompts
  }

  /**
   * Determine if an explanation needs refinement
   */
  needsRefinement(evaluation: FeynmanEvaluationResult): boolean {
    const averageScore = (evaluation.clarity + evaluation.completeness + evaluation.accuracy) / 3;
    return averageScore < 70 || evaluation.misconceptions.length > 0;
  }

  /**
   * Get the overall quality score
   */
  getOverallScore(evaluation: FeynmanEvaluationResult): number {
    return Math.round(
      (evaluation.clarity * 0.35) +
      (evaluation.completeness * 0.35) +
      (evaluation.accuracy * 0.30)
    );
  }

  /**
   * Build the evaluation prompt with context
   */
  private buildEvaluationPrompt(request: EvaluationRequest): string {
    let prompt = `**Topic:** ${request.topic}\n\n`;
    prompt += `**Student's Explanation:**\n"${request.explanation}"\n\n`;

    if (request.conceptContext) {
      prompt += `**Context about the concept:** ${request.conceptContext}\n\n`;
    }

    if (request.studentLevel) {
      prompt += `**Student's current level:** ${request.studentLevel}/10\n`;
    }

    if (request.targetBloomLevel) {
      const bloomNames = ['', 'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];
      prompt += `**Target Bloom level:** ${request.targetBloomLevel} (${bloomNames[request.targetBloomLevel]})\n`;
    }

    if (request.previousAttempts && request.previousAttempts.length > 0) {
      prompt += `\n**Previous attempts:** ${request.previousAttempts.length}\n`;
      prompt += `This is a refinement attempt - evaluate improvement.\n`;
    }

    prompt += `\nEvaluate this explanation using the Feynman Technique criteria. Be encouraging but honest.`;

    return prompt;
  }

  /**
   * Normalize and validate the evaluation result
   */
  private normalizeResult(result: FeynmanEvaluationResult): FeynmanEvaluationResult {
    return {
      clarity: Math.max(0, Math.min(100, Math.round(result.clarity))),
      completeness: Math.max(0, Math.min(100, Math.round(result.completeness))),
      accuracy: Math.max(0, Math.min(100, Math.round(result.accuracy))),
      jargonTerms: result.jargonTerms || [],
      misconceptions: result.misconceptions || [],
      strengths: result.strengths || [],
      gaps: result.gaps || [],
      feedback: result.feedback || 'Good effort! Keep practicing.',
      suggestedRefinements: result.suggestedRefinements || [],
      bloomLevel: Math.max(1, Math.min(6, Math.round(result.bloomLevel))),
    };
  }

  /**
   * Provide a basic evaluation when AI fails
   */
  private getFallbackEvaluation(explanation: string): FeynmanEvaluationResult {
    const length = explanation.length;
    const hasExample = /example|like|such as|for instance/i.test(explanation);
    const hasAnalogy = /like|similar to|just as|compared to/i.test(explanation);
    
    // Basic heuristics for fallback
    let clarity = 50;
    let completeness = 50;
    let accuracy = 70; // Assume mostly accurate

    if (length > 200) completeness += 15;
    if (length > 400) completeness += 10;
    if (hasExample) completeness += 10;
    if (hasAnalogy) clarity += 15;
    if (length > 100) clarity += 10;

    return {
      clarity: Math.min(100, clarity),
      completeness: Math.min(100, completeness),
      accuracy,
      jargonTerms: [],
      misconceptions: [],
      strengths: ['You made an attempt to explain the concept'],
      gaps: ['Consider adding more detail'],
      feedback: 'Good start! Try adding an example or analogy to make your explanation clearer.',
      suggestedRefinements: [
        'Add a real-world example',
        'Use simpler words',
        'Explain why this matters',
      ],
      bloomLevel: 2,
    };
  }
}

export const feynmanAIService = new FeynmanAIService();

