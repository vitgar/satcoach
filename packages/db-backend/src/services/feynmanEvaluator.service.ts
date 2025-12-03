/**
 * Feynman Evaluator Service
 * 
 * Evaluates learner explanations for clarity, completeness, and accuracy.
 * Uses AI to assess how well students can explain concepts in simple terms.
 * 
 * Feynman Technique:
 * 1. Choose a concept to learn
 * 2. Explain it as if teaching someone else
 * 3. Identify gaps in your explanation
 * 4. Review and simplify
 */

import mongoose from 'mongoose';
import { LearnerExplanation, ExplanationEvaluation } from '../models/LearnerExplanation.model';
import { BLOOM_LEVEL_NAMES } from './bloomService';

export interface ExplanationContext {
  conceptName: string;
  topic: string;
  expectedKeyPoints: string[];
  studentLevel: number; // 1-10
}

export interface EvaluationResult {
  clarity: number; // 0-100
  completeness: number; // 0-100
  accuracy: number; // 0-100
  jargonCount: number;
  jargonTerms: string[];
  misconceptions: string[];
  strengths: string[];
  gaps: string[];
  feedback: string;
  suggestedRefinements: string[];
  bloomLevel: number; // 1-6
  shouldRefine: boolean;
  overallScore: number;
}

export interface JargonAnalysis {
  jargonCount: number;
  jargonTerms: string[];
  simplifiedAlternatives: string[];
}

export interface RefinementPrompts {
  prompts: string[];
  focusArea: string;
}

export class FeynmanEvaluatorService {
  // Common jargon terms that should be explained simply
  private readonly MATH_JARGON = [
    'coefficient', 'variable', 'exponent', 'polynomial', 'quadratic',
    'derivative', 'integral', 'logarithm', 'asymptote', 'domain',
    'range', 'function', 'slope', 'intercept', 'parabola',
  ];

  private readonly READING_JARGON = [
    'inference', 'rhetoric', 'thesis', 'antithesis', 'synthesis',
    'connotation', 'denotation', 'ethos', 'pathos', 'logos',
  ];

  /**
   * Evaluate a learner explanation (simplified local evaluation)
   * In production, this would call the AI backend
   */
  evaluateExplanation(
    explanation: string,
    context: ExplanationContext
  ): EvaluationResult {
    const { studentLevel, expectedKeyPoints } = context;
    
    // Detect jargon
    const jargonAnalysis = this.detectJargon(explanation, studentLevel);
    
    // Check completeness by looking for key points coverage
    const completenessResult = this.checkCompleteness(explanation, expectedKeyPoints);
    
    // Estimate clarity based on structure and simplicity
    const clarity = this.estimateClarity(explanation, jargonAnalysis.jargonCount);
    
    // Estimate accuracy (simplified - in production would use AI)
    const accuracy = this.estimateAccuracy(explanation, expectedKeyPoints);
    
    // Determine Bloom level demonstrated
    const bloomLevel = this.determineBloomLevel(explanation);
    
    // Generate feedback
    const { feedback, suggestedRefinements, focusArea } = this.generateFeedback(
      clarity,
      completenessResult.completeness,
      accuracy,
      jargonAnalysis,
      completenessResult.missingElements
    );
    
    // Calculate overall score
    const overallScore = Math.round((clarity + completenessResult.completeness + accuracy) / 3);
    
    // Should refine if any score is below 70
    const shouldRefine = clarity < 70 || completenessResult.completeness < 70 || accuracy < 70;
    
    return {
      clarity,
      completeness: completenessResult.completeness,
      accuracy,
      jargonCount: jargonAnalysis.jargonCount,
      jargonTerms: jargonAnalysis.jargonTerms,
      misconceptions: [],
      strengths: this.identifyStrengths(clarity, completenessResult.completeness, accuracy),
      gaps: completenessResult.missingElements,
      feedback,
      suggestedRefinements,
      bloomLevel,
      shouldRefine,
      overallScore,
    };
  }

  /**
   * Detect jargon in explanation
   */
  detectJargon(
    explanation: string,
    studentLevel: number
  ): JargonAnalysis {
    const text = explanation.toLowerCase();
    const foundJargon: string[] = [];
    const alternatives: string[] = [];

    // Lower level students should use simpler terms
    const jargonThreshold = studentLevel < 4 ? 0 : studentLevel < 7 ? 2 : 5;
    
    const allJargon = [...this.MATH_JARGON, ...this.READING_JARGON];
    
    for (const term of allJargon) {
      if (text.includes(term)) {
        foundJargon.push(term);
        alternatives.push(this.getSimplifiedAlternative(term));
      }
    }

    return {
      jargonCount: foundJargon.length,
      jargonTerms: foundJargon,
      simplifiedAlternatives: alternatives,
    };
  }

  /**
   * Get simplified alternative for jargon term
   */
  private getSimplifiedAlternative(term: string): string {
    const alternatives: Record<string, string> = {
      coefficient: 'the number in front of a letter',
      variable: 'the unknown number (like x)',
      exponent: 'the small number that tells you how many times to multiply',
      polynomial: 'an expression with multiple terms',
      quadratic: 'an equation with x² (x squared)',
      derivative: 'how fast something is changing',
      slope: 'how steep a line is',
      intercept: 'where the line crosses the axis',
      parabola: 'a U-shaped curve',
      domain: 'all the possible input values',
      range: 'all the possible output values',
      function: 'a rule that turns one number into another',
    };

    return alternatives[term] || term;
  }

  /**
   * Check completeness of explanation
   */
  checkCompleteness(
    explanation: string,
    expectedKeyPoints: string[]
  ): { completeness: number; missingElements: string[]; coveredElements: string[] } {
    if (expectedKeyPoints.length === 0) {
      // If no expected key points, use length as proxy
      const words = explanation.split(/\s+/).length;
      const completeness = Math.min(100, words * 2);
      return { completeness, missingElements: [], coveredElements: [] };
    }

    const text = explanation.toLowerCase();
    const covered: string[] = [];
    const missing: string[] = [];

    for (const point of expectedKeyPoints) {
      const keywords = point.toLowerCase().split(/\s+/);
      const found = keywords.some(keyword => text.includes(keyword));
      
      if (found) {
        covered.push(point);
      } else {
        missing.push(point);
      }
    }

    const completeness = Math.round((covered.length / expectedKeyPoints.length) * 100);

    return { completeness, missingElements: missing, coveredElements: covered };
  }

  /**
   * Estimate clarity of explanation
   */
  private estimateClarity(explanation: string, jargonCount: number): number {
    let clarity = 70; // Base clarity

    // Penalize for jargon
    clarity -= jargonCount * 5;

    // Reward for structure (sentences, paragraphs)
    const sentences = explanation.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 3) {
      clarity += 10;
    }

    // Reward for examples (look for "for example", "like", etc.)
    const examplePatterns = ['for example', 'like', 'such as', 'imagine', 'think of'];
    const hasExample = examplePatterns.some(p => explanation.toLowerCase().includes(p));
    if (hasExample) {
      clarity += 15;
    }

    // Reward for analogies
    const analogyPatterns = ['is like', 'similar to', 'just as', 'compare'];
    const hasAnalogy = analogyPatterns.some(p => explanation.toLowerCase().includes(p));
    if (hasAnalogy) {
      clarity += 10;
    }

    return Math.max(0, Math.min(100, clarity));
  }

  /**
   * Estimate accuracy based on key points coverage
   */
  private estimateAccuracy(explanation: string, expectedKeyPoints: string[]): number {
    if (expectedKeyPoints.length === 0) {
      return 70; // Default if no key points to check
    }

    const text = explanation.toLowerCase();
    let correctPoints = 0;

    for (const point of expectedKeyPoints) {
      const keywords = point.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const found = keywords.some(keyword => text.includes(keyword));
      if (found) {
        correctPoints++;
      }
    }

    return Math.round((correctPoints / expectedKeyPoints.length) * 100);
  }

  /**
   * Determine Bloom level demonstrated in explanation
   */
  private determineBloomLevel(explanation: string): number {
    const text = explanation.toLowerCase();
    
    // Check for Create level indicators
    if (text.includes('create') || text.includes('design') || text.includes('develop')) {
      return 6;
    }
    
    // Check for Evaluate level indicators
    if (text.includes('best') || text.includes('evaluate') || text.includes('judge')) {
      return 5;
    }
    
    // Check for Analyze level indicators
    if (text.includes('compare') || text.includes('contrast') || text.includes('analyze')) {
      return 4;
    }
    
    // Check for Apply level indicators
    if (text.includes('solve') || text.includes('apply') || text.includes('use')) {
      return 3;
    }
    
    // Check for Understand level indicators
    if (text.includes('explain') || text.includes('describe') || text.includes('mean')) {
      return 2;
    }
    
    // Default to Remember
    return 1;
  }

  /**
   * Generate feedback and refinement prompts
   */
  private generateFeedback(
    clarity: number,
    completeness: number,
    accuracy: number,
    jargonAnalysis: JargonAnalysis,
    missingElements: string[]
  ): { feedback: string; suggestedRefinements: string[]; focusArea: string } {
    const refinements: string[] = [];
    let focusArea = '';

    // Determine primary focus area
    if (clarity < 70) {
      focusArea = 'clarity';
    } else if (completeness < 70) {
      focusArea = 'completeness';
    } else if (accuracy < 70) {
      focusArea = 'accuracy';
    }

    // Generate feedback based on scores
    let feedback = '';
    
    if (clarity >= 80 && completeness >= 80 && accuracy >= 80) {
      feedback = 'Excellent explanation! You demonstrated clear understanding of the concept.';
    } else if (clarity >= 70 && completeness >= 70) {
      feedback = 'Good explanation! Here are some suggestions to make it even better.';
    } else {
      feedback = 'Nice start! Let\'s work on improving your explanation.';
    }

    // Add specific refinement suggestions
    if (jargonAnalysis.jargonCount > 2) {
      refinements.push(
        `Try explaining "${jargonAnalysis.jargonTerms[0]}" in simpler terms.`
      );
    }

    if (missingElements.length > 0) {
      refinements.push(
        `Consider adding more about: ${missingElements[0]}`
      );
    }

    if (clarity < 70) {
      refinements.push('Try using a real-world example or analogy.');
    }

    if (completeness < 70) {
      refinements.push('Can you expand on why this works?');
    }

    return { feedback, suggestedRefinements: refinements, focusArea };
  }

  /**
   * Identify strengths in the explanation
   */
  private identifyStrengths(clarity: number, completeness: number, accuracy: number): string[] {
    const strengths: string[] = [];

    if (clarity >= 80) {
      strengths.push('Clear and easy to understand');
    }
    if (completeness >= 80) {
      strengths.push('Covers key concepts well');
    }
    if (accuracy >= 80) {
      strengths.push('Accurate understanding');
    }

    if (strengths.length === 0) {
      strengths.push('Good effort - keep practicing!');
    }

    return strengths;
  }

  /**
   * Generate refinement prompts based on iteration
   */
  generateRefinementPrompts(
    evaluation: EvaluationResult,
    iteration: number
  ): RefinementPrompts {
    const prompts: string[] = [];
    let focusArea = '';

    if (iteration === 1) {
      // First refinement - focus on biggest gap
      if (evaluation.clarity < 70) {
        focusArea = 'clarity';
        prompts.push('Can you explain this as if teaching a younger student?');
        prompts.push('Try using a simpler example from everyday life.');
      } else if (evaluation.completeness < 70) {
        focusArea = 'completeness';
        prompts.push('What other important aspects should we include?');
      }
    } else if (iteration === 2) {
      // Second refinement - polish
      prompts.push('Great progress! Can you make it even simpler?');
      prompts.push('Is there anything you can remove to make it clearer?');
    } else {
      // Third+ refinement - consolidate
      prompts.push('Almost there! Try summarizing the key points.');
    }

    return { prompts, focusArea };
  }

  /**
   * Save evaluation to database
   */
  async saveEvaluation(
    userId: mongoose.Types.ObjectId,
    topic: string,
    explanation: string,
    evaluation: EvaluationResult,
    conceptId?: mongoose.Types.ObjectId,
    questionId?: mongoose.Types.ObjectId,
    previousExplanationId?: mongoose.Types.ObjectId
  ): Promise<any> {
    const isRefinement = !!previousExplanationId;
    
    // Find iteration number
    let iteration = 1;
    if (previousExplanationId) {
      const previousExplanation = await LearnerExplanation.findById(previousExplanationId);
      if (previousExplanation) {
        iteration = previousExplanation.iteration + 1;
      }
    }

    const learnerExplanation = new LearnerExplanation({
      userId,
      conceptId,
      questionId,
      topic,
      explanation,
      evaluation: {
        clarity: evaluation.clarity,
        completeness: evaluation.completeness,
        accuracy: evaluation.accuracy,
        jargonCount: evaluation.jargonCount,
        jargonTerms: evaluation.jargonTerms,
        misconceptions: evaluation.misconceptions,
        strengths: evaluation.strengths,
        gaps: evaluation.gaps,
        feedback: evaluation.feedback,
        suggestedRefinements: evaluation.suggestedRefinements,
        bloomLevel: evaluation.bloomLevel,
      },
      iteration,
      isRefinement,
      previousExplanationId,
    });

    return learnerExplanation.save();
  }
}

export const feynmanEvaluatorService = new FeynmanEvaluatorService();

