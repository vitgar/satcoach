/**
 * Spaced Repetition Service
 * Implements the SM-2 (SuperMemo 2) algorithm for optimal review scheduling
 */

export interface SpacedRepetitionResult {
  nextReviewDate: Date;
  easeFactor: number;
  interval: number;
  repetitions: number;
}

export class SpacedRepetitionService {
  /**
   * Calculate next review date using SM-2 algorithm
   * 
   * @param quality - Quality of recall (0-5):
   *   0: Complete blackout
   *   1: Incorrect but recognized answer
   *   2: Incorrect but remembered after seeing answer
   *   3: Correct with serious difficulty
   *   4: Correct with hesitation
   *   5: Perfect recall
   * @param currentEaseFactor - Current ease factor (default 2.5)
   * @param currentInterval - Current interval in days
   * @param currentRepetitions - Number of consecutive successful reviews
   */
  calculateNextReview(
    quality: number,
    currentEaseFactor: number = 2.5,
    currentInterval: number = 0,
    currentRepetitions: number = 0
  ): SpacedRepetitionResult {
    let easeFactor = currentEaseFactor;
    let interval = currentInterval;
    let repetitions = currentRepetitions;

    // Calculate new ease factor based on quality
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

    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    return {
      nextReviewDate,
      easeFactor,
      interval,
      repetitions,
    };
  }

  /**
   * Convert question attempt into quality score for SM-2
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
   * Calculate priority for review scheduling
   * Higher priority = more urgent to review
   */
  calculateReviewPriority(
    nextReviewDate: Date,
    masteryLevel: number,
    totalAttempts: number
  ): number {
    const now = new Date();
    const daysUntilReview = Math.floor(
      (nextReviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Priority factors:
    // 1. How overdue (negative days = overdue)
    const overdueFactor = daysUntilReview < 0 ? Math.abs(daysUntilReview) * 2 : 0;

    // 2. How low the mastery (0-100)
    const masteryFactor = (100 - masteryLevel) / 100 * 5;

    // 3. How new the topic is
    const recencyFactor = Math.min(1, totalAttempts / 10) * 3;

    return overdueFactor + masteryFactor + recencyFactor;
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
}

export const spacedRepetitionService = new SpacedRepetitionService();

