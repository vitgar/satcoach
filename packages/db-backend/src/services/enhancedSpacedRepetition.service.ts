/**
 * Enhanced Spaced Repetition Service
 * 
 * SM-2 algorithm enhanced with Flow and Bloom metrics.
 * 
 * Improvements over standard SM-2:
 * - Flow score affects interval (better flow = longer interval)
 * - Bloom level integration for progressive challenge
 * - Review at higher Bloom levels after mastery
 */

export interface EnhancedSpacedRepetitionResult {
  nextReviewDate: Date;
  easeFactor: number;
  interval: number; // days
  repetitions: number;
  reviewBloomLevel: number; // Bloom level for next review
  progressiveChallenge: boolean; // Should increase difficulty?
  qualityScore: number; // The quality score used (for tracking)
}

export interface ReviewBloomLevelResult {
  reviewLevel: number;
  shouldProgressChallenge: boolean;
  reason: string;
}

export class EnhancedSpacedRepetitionService {
  /**
   * Calculate next review with Flow and Bloom considerations
   * 
   * @param quality - Quality of recall (0-5, where 5 is perfect)
   * @param currentEaseFactor - Current ease factor (default 2.5)
   * @param currentInterval - Current interval in days
   * @param currentRepetitions - Number of consecutive successful reviews
   * @param flowScore - Flow score during the session (0-100)
   * @param bloomLevel - Current Bloom level mastered
   * @param progressiveChallenge - Should we increase difficulty on review?
   */
  calculateNextReview(
    quality: number,
    currentEaseFactor: number = 2.5,
    currentInterval: number = 0,
    currentRepetitions: number = 0,
    flowScore: number = 50,
    bloomLevel: number = 1,
    progressiveChallenge: boolean = false
  ): EnhancedSpacedRepetitionResult {
    let easeFactor = currentEaseFactor;
    let interval = currentInterval;
    let repetitions = currentRepetitions;

    // Standard SM-2: Calculate new ease factor based on quality
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    
    // Ensure ease factor doesn't go below 1.3
    if (easeFactor < 1.3) {
      easeFactor = 1.3;
    }

    // Determine interval based on quality
    if (quality < 3) {
      // Failed recall - reset to beginning
      repetitions = 0;
      interval = 1;
    } else {
      // Successful recall - increase interval
      repetitions += 1;
      
      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
    }

    // ENHANCEMENT: Adjust interval based on Flow score
    // Higher flow = better retention = longer interval
    const flowAdjustment = this.adjustIntervalForFlow(interval, flowScore);
    interval = flowAdjustment;

    // ENHANCEMENT: Determine review Bloom level
    const reviewBloom = this.determineReviewBloomLevel(
      bloomLevel,
      repetitions,
      quality
    );

    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    return {
      nextReviewDate,
      easeFactor: Math.round(easeFactor * 100) / 100,
      interval,
      repetitions,
      reviewBloomLevel: reviewBloom.reviewLevel,
      progressiveChallenge: reviewBloom.shouldProgressChallenge,
      qualityScore: quality,
    };
  }

  /**
   * Adjust interval based on Flow state
   * Higher flow during learning = better retention = longer intervals
   */
  adjustIntervalForFlow(baseInterval: number, flowScore: number): number {
    // Flow score 0-100, convert to multiplier
    // Flow score 100 = 1.2x interval (up to 20% increase)
    // Flow score 50 = 1.0x interval (no change)
    // Flow score 0 = 0.8x interval (20% decrease)
    
    const flowMultiplier = 0.8 + (flowScore / 100) * 0.4;
    const adjustedInterval = Math.round(baseInterval * flowMultiplier);
    
    // Ensure minimum 1 day interval
    return Math.max(1, adjustedInterval);
  }

  /**
   * Determine Bloom level for review
   * After mastery, progressively challenge at higher Bloom levels
   */
  determineReviewBloomLevel(
    originalLevel: number,
    repetitions: number,
    quality: number
  ): ReviewBloomLevelResult {
    // If not mastered yet, review at same level
    if (quality < 4 || repetitions < 2) {
      return {
        reviewLevel: originalLevel,
        shouldProgressChallenge: false,
        reason: 'Reinforcing current level mastery',
      };
    }

    // After 2+ successful reviews with quality >= 4, consider progression
    if (repetitions >= 2 && quality >= 4 && originalLevel < 6) {
      return {
        reviewLevel: Math.min(6, originalLevel + 1),
        shouldProgressChallenge: true,
        reason: 'Strong mastery - challenging with higher Bloom level',
      };
    }

    // After many reviews, alternate between levels to keep engaged
    if (repetitions >= 5 && originalLevel >= 3) {
      const alternateLevel = (repetitions % 2 === 0) 
        ? Math.min(6, originalLevel + 1)
        : originalLevel;
      return {
        reviewLevel: alternateLevel,
        shouldProgressChallenge: alternateLevel > originalLevel,
        reason: 'Maintaining mastery with varied challenges',
      };
    }

    // Default: review at original level
    return {
      reviewLevel: originalLevel,
      shouldProgressChallenge: false,
      reason: 'Continuing at current level',
    };
  }

  /**
   * Calculate quality score from behavioral signals
   * (Wrapper around ConfidenceCalculator for convenience)
   */
  calculateQualityScore(
    isCorrect: boolean,
    timeSpent: number,
    averageTime: number,
    confidence: number,
    hintsUsed: number
  ): number {
    // Start with correctness
    let quality = isCorrect ? 4 : 1;

    if (isCorrect) {
      // Adjust based on confidence (1-5)
      if (confidence === 5) {
        quality = 5;
      } else if (confidence === 4) {
        quality = 4;
      } else {
        quality = 3;
      }

      // Penalize if took too long
      if (averageTime > 0 && timeSpent > averageTime * 2) {
        quality = Math.max(3, quality - 1);
      }

      // Penalize if too many hints needed
      if (hintsUsed > 5) {
        quality = Math.max(3, quality - 1);
      }
    } else {
      // Even if incorrect, give credit if they understood after explanation
      if (hintsUsed > 0 && hintsUsed < 10) {
        quality = 2; // Remembered after seeing answer
      } else {
        quality = 1; // Incorrect
      }
    }

    return quality;
  }

  /**
   * Calculate review priority for scheduling
   * Higher priority = more urgent to review
   */
  calculateReviewPriority(
    nextReviewDate: Date,
    masteryLevel: number,
    totalAttempts: number,
    flowScore: number = 50
  ): number {
    const now = new Date();
    const daysUntilReview = Math.floor(
      (nextReviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Priority factors:
    // 1. How overdue (negative days = overdue)
    const overdueFactor = daysUntilReview < 0 ? Math.abs(daysUntilReview) * 2 : 0;

    // 2. How low the mastery (0-100)
    const masteryFactor = ((100 - masteryLevel) / 100) * 5;

    // 3. How new the topic is
    const recencyFactor = Math.min(1, totalAttempts / 10) * 3;

    // 4. Low flow score = higher priority (struggling topics need attention)
    const flowFactor = ((100 - flowScore) / 100) * 2;

    return overdueFactor + masteryFactor + recencyFactor + flowFactor;
  }

  /**
   * Get days until next review
   */
  getDaysUntilReview(nextReviewDate: Date): number {
    const now = new Date();
    const diffTime = nextReviewDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if topic is due for review
   */
  isDueForReview(nextReviewDate: Date): boolean {
    return nextReviewDate <= new Date();
  }

  /**
   * Check if topic is overdue for review
   */
  isOverdue(nextReviewDate: Date): boolean {
    const daysUntil = this.getDaysUntilReview(nextReviewDate);
    return daysUntil < -1; // More than 1 day overdue
  }

  /**
   * Get recommended review strategy based on current state
   */
  getReviewStrategy(
    masteryLevel: number,
    currentBloomLevel: number,
    repetitions: number,
    flowScore: number
  ): {
    strategy: 'active_recall' | 'feynman' | 'practice' | 'review';
    bloomLevel: number;
    description: string;
  } {
    // Low mastery: focus on understanding
    if (masteryLevel < 50) {
      return {
        strategy: 'review',
        bloomLevel: Math.min(2, currentBloomLevel),
        description: 'Focus on understanding the basics',
      };
    }

    // Medium mastery with low flow: try Feynman
    if (masteryLevel < 70 && flowScore < 50) {
      return {
        strategy: 'feynman',
        bloomLevel: currentBloomLevel,
        description: 'Explain the concept to solidify understanding',
      };
    }

    // High mastery: progressive challenge
    if (masteryLevel >= 70 && repetitions >= 2) {
      return {
        strategy: 'practice',
        bloomLevel: Math.min(6, currentBloomLevel + 1),
        description: 'Apply knowledge with new challenges',
      };
    }

    // Default: active recall
    return {
      strategy: 'active_recall',
      bloomLevel: currentBloomLevel,
      description: 'Test your recall with practice questions',
    };
  }
}

export const enhancedSpacedRepetitionService = new EnhancedSpacedRepetitionService();

