/**
 * Automatic Confidence Calculator Service
 * 
 * Calculates student confidence (1-5) from behavioral signals.
 * NO STUDENT INPUT REQUIRED - confidence is inferred from behavior.
 * 
 * Key principle: Lift the burden from students. Confidence is inferred, not asked.
 */

export type StudentType = 'struggler' | 'intermediate' | 'advanced';

export interface ConfidenceInput {
  isCorrect: boolean;
  timeSpent: number; // seconds
  expectedTime: number; // expected time for this question
  hintsUsed: number;
  chatInteractions: number;
  previousAccuracyOnTopic: number; // 0-1
  questionDifficulty: number; // 1-10
  studentLevel: number; // 1-10
  studentType?: StudentType;
}

export interface ConfidenceResult {
  confidence: number; // 1-5
  factors: {
    correctnessContribution: number;
    timeContribution: number;
    hintsContribution: number;
    chatContribution: number;
    historyContribution: number;
    difficultyContribution: number;
  };
  explanation: string;
}

export class ConfidenceCalculatorService {
  private static readonly WEIGHTS = {
    correctness: 0.35, // Heaviest weight - correctness matters most
    time: 0.20, // Fast = confident
    hints: 0.15, // No hints = confident
    chat: 0.10, // Few questions = confident
    history: 0.10, // Good track record = confident
    difficulty: 0.10, // Easier question = more confident
  };

  /**
   * Calculate confidence automatically from behavioral signals
   */
  calculateAutomaticConfidence(input: ConfidenceInput): ConfidenceResult {
    const {
      isCorrect,
      timeSpent,
      expectedTime,
      hintsUsed,
      chatInteractions,
      previousAccuracyOnTopic,
      questionDifficulty,
      studentLevel,
      studentType = 'intermediate',
    } = input;

    // 1. Correctness contribution (0-1)
    const correctnessContribution = isCorrect ? 1.0 : 0.2;

    // 2. Time contribution (0-1)
    // Fast = confident, slow = less confident
    let timeContribution: number;
    if (expectedTime <= 0) {
      timeContribution = 0.5; // No expected time, neutral
    } else {
      const timeRatio = timeSpent / expectedTime;
      if (timeRatio <= 0.5) {
        timeContribution = 1.0; // Very fast
      } else if (timeRatio <= 1.0) {
        timeContribution = 0.8; // Normal speed
      } else if (timeRatio <= 1.5) {
        timeContribution = 0.5; // Slightly slow
      } else if (timeRatio <= 2.0) {
        timeContribution = 0.3; // Slow
      } else {
        timeContribution = 0.1; // Very slow
      }
    }

    // 3. Hints contribution (0-1)
    // No hints = confident, many hints = less confident
    let hintsContribution: number;
    if (hintsUsed === 0) {
      hintsContribution = 1.0;
    } else if (hintsUsed === 1) {
      hintsContribution = 0.7;
    } else if (hintsUsed === 2) {
      hintsContribution = 0.5;
    } else if (hintsUsed <= 4) {
      hintsContribution = 0.3;
    } else {
      hintsContribution = 0.1;
    }

    // 4. Chat contribution (0-1)
    // Few questions = confident
    let chatContribution: number;
    if (chatInteractions === 0) {
      chatContribution = 1.0;
    } else if (chatInteractions <= 2) {
      chatContribution = 0.7;
    } else if (chatInteractions <= 5) {
      chatContribution = 0.5;
    } else {
      chatContribution = 0.3;
    }

    // 5. History contribution (0-1)
    // Good track record = confident
    const historyContribution = previousAccuracyOnTopic;

    // 6. Difficulty contribution (0-1)
    // Easier question relative to level = more confident
    let difficultyContribution: number;
    const difficultyGap = studentLevel - questionDifficulty;
    if (difficultyGap >= 3) {
      difficultyContribution = 1.0; // Much easier than level
    } else if (difficultyGap >= 1) {
      difficultyContribution = 0.8; // Slightly easier
    } else if (difficultyGap >= -1) {
      difficultyContribution = 0.6; // At level
    } else if (difficultyGap >= -3) {
      difficultyContribution = 0.4; // Slightly harder
    } else {
      difficultyContribution = 0.2; // Much harder
    }

    // Calculate weighted score
    let score =
      correctnessContribution * ConfidenceCalculatorService.WEIGHTS.correctness +
      timeContribution * ConfidenceCalculatorService.WEIGHTS.time +
      hintsContribution * ConfidenceCalculatorService.WEIGHTS.hints +
      chatContribution * ConfidenceCalculatorService.WEIGHTS.chat +
      historyContribution * ConfidenceCalculatorService.WEIGHTS.history +
      difficultyContribution * ConfidenceCalculatorService.WEIGHTS.difficulty;

    // Apply student type modifier
    // For struggling students, be more generous to build confidence
    if (studentType === 'struggler') {
      score = Math.min(1.0, score * 1.2); // 1.2x multiplier
    } else if (studentType === 'advanced') {
      // For advanced students, be slightly stricter
      score = score * 0.95;
    }

    // Convert to 1-5 scale
    let confidence = Math.round(score * 4 + 1);
    confidence = Math.max(1, Math.min(5, confidence));

    // Generate explanation
    let explanation = '';
    if (confidence >= 4) {
      explanation = isCorrect
        ? 'Strong performance with good speed and minimal assistance.'
        : 'Good effort despite the incorrect answer.';
    } else if (confidence >= 3) {
      explanation = 'Solid attempt with room for improvement.';
    } else {
      explanation = 'This topic may need more practice.';
    }

    return {
      confidence,
      factors: {
        correctnessContribution,
        timeContribution,
        hintsContribution,
        chatContribution,
        historyContribution,
        difficultyContribution,
      },
      explanation,
    };
  }

  /**
   * Determine student type based on performance
   */
  determineStudentType(
    masteryLevel: number, // 0-100
    accuracyRate: number, // 0-1
    averageFlowScore: number = 50 // 0-100
  ): StudentType {
    // Combined score
    const score = (masteryLevel * 0.4) + (accuracyRate * 100 * 0.4) + (averageFlowScore * 0.2);

    if (score < 40) {
      return 'struggler';
    } else if (score < 70) {
      return 'intermediate';
    } else {
      return 'advanced';
    }
  }

  /**
   * Calculate quality score for spaced repetition (0-5)
   * This is used by the SM-2 algorithm
   */
  calculateQualityScore(input: ConfidenceInput): number {
    const result = this.calculateAutomaticConfidence(input);
    
    // Convert 1-5 confidence to 0-5 quality for SM-2
    // SM-2 uses:
    // 0: Complete blackout
    // 1: Incorrect but recognized answer
    // 2: Incorrect but remembered after seeing answer
    // 3: Correct with serious difficulty
    // 4: Correct with hesitation
    // 5: Perfect recall

    if (!input.isCorrect) {
      // Incorrect answers
      if (input.hintsUsed > 5 || input.chatInteractions > 5) {
        return 0; // Complete blackout
      } else if (input.hintsUsed > 2) {
        return 1; // Recognized but couldn't recall
      } else {
        return 2; // Remembered after explanation
      }
    } else {
      // Correct answers
      if (result.confidence >= 5) {
        return 5; // Perfect recall
      } else if (result.confidence >= 4) {
        return 4; // Correct with hesitation
      } else {
        return 3; // Correct with difficulty
      }
    }
  }
}

export const confidenceCalculatorService = new ConfidenceCalculatorService();

