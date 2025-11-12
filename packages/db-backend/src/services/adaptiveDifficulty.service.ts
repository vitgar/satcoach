import { User } from '../models/User.model';
import { StudentProgress } from '../models/StudentProgress.model';
import { Difficulty } from '../models/Question.model';

export class AdaptiveDifficultyService {
  /**
   * Adjust student's difficulty level based on recent performance
   * Level ranges from 1 (beginner) to 10 (expert)
   */
  async adjustStudentLevel(userId: string): Promise<number> {
    // Get user's current level
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const currentLevel = user.learningProfile.currentLevel;
    const adjustmentSpeed = user.learningProfile.adaptiveSettings.adjustmentSpeed;

    // Get recent progress across all subjects (last 20 attempts)
    const recentProgress = await StudentProgress.find({ userId })
      .sort({ 'performance.lastAttemptDate': -1 })
      .limit(20)
      .exec();

    if (recentProgress.length === 0) {
      return currentLevel; // No data to adjust
    }

    // Calculate recent performance metrics
    const recentAttempts = recentProgress.flatMap(p => 
      p.attempts.slice(-5) // Last 5 attempts per topic
    );

    if (recentAttempts.length === 0) {
      return currentLevel;
    }

    const totalRecent = recentAttempts.length;
    const correctRecent = recentAttempts.filter(a => a.isCorrect).length;
    const recentAccuracy = correctRecent / totalRecent;

    // Calculate average confidence
    const avgConfidence = recentAttempts.reduce((sum, a) => sum + a.confidence, 0) / totalRecent;

    // Determine adjustment based on performance
    let newLevel = currentLevel;
    const adjustmentFactor = adjustmentSpeed / 5; // Convert 1-5 scale to 0.2-1.0

    if (recentAccuracy >= 0.85 && avgConfidence >= 4) {
      // Excellent performance - increase difficulty
      newLevel = currentLevel + (1 * adjustmentFactor);
    } else if (recentAccuracy >= 0.75 && avgConfidence >= 3.5) {
      // Good performance - slight increase
      newLevel = currentLevel + (0.5 * adjustmentFactor);
    } else if (recentAccuracy >= 0.60) {
      // Adequate performance - maintain level
      newLevel = currentLevel;
    } else if (recentAccuracy >= 0.45) {
      // Struggling - decrease difficulty
      newLevel = currentLevel - (0.5 * adjustmentFactor);
    } else {
      // Really struggling - significant decrease
      newLevel = currentLevel - (1 * adjustmentFactor);
    }

    // Clamp to valid range (1-10)
    newLevel = Math.max(1, Math.min(10, newLevel));

    // Update user profile if changed significantly
    if (Math.abs(newLevel - currentLevel) >= 0.5) {
      await User.findByIdAndUpdate(userId, {
        'learningProfile.currentLevel': newLevel,
      });
    }

    return newLevel;
  }

  /**
   * Map student level (1-10) to difficulty
   */
  mapLevelToDifficulty(level: number): Difficulty {
    if (level <= 3) return 'easy';
    if (level <= 7) return 'medium';
    return 'hard';
  }

  /**
   * Get recommended difficulty range for student
   */
  getRecommendedDifficultyRange(level: number): { min: Difficulty; max: Difficulty } {
    if (level <= 2) {
      return { min: 'easy', max: 'easy' };
    } else if (level <= 4) {
      return { min: 'easy', max: 'medium' };
    } else if (level <= 7) {
      return { min: 'medium', max: 'medium' };
    } else if (level <= 8) {
      return { min: 'medium', max: 'hard' };
    } else {
      return { min: 'hard', max: 'hard' };
    }
  }

  /**
   * Analyze student's strengths and weaknesses
   */
  async analyzePerformance(userId: string) {
    const allProgress = await StudentProgress.find({ userId }).exec();

    const analysis = {
      overall: {
        totalAttempts: 0,
        averageAccuracy: 0,
        averageMastery: 0,
      },
      bySubject: {} as Record<string, any>,
      strengths: [] as string[],
      weaknesses: [] as string[],
    };

    // Calculate overall metrics
    let totalAttempts = 0;
    let totalCorrect = 0;
    let totalMastery = 0;

    const subjectStats: Record<string, any> = {};

    for (const progress of allProgress) {
      totalAttempts += progress.performance.totalAttempts;
      totalCorrect += progress.performance.correctAttempts;
      totalMastery += progress.performance.masteryLevel;

      // By subject
      if (!subjectStats[progress.subject]) {
        subjectStats[progress.subject] = {
          attempts: 0,
          correct: 0,
          mastery: 0,
          count: 0,
        };
      }

      subjectStats[progress.subject].attempts += progress.performance.totalAttempts;
      subjectStats[progress.subject].correct += progress.performance.correctAttempts;
      subjectStats[progress.subject].mastery += progress.performance.masteryLevel;
      subjectStats[progress.subject].count += 1;
    }

    analysis.overall.totalAttempts = totalAttempts;
    analysis.overall.averageAccuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;
    analysis.overall.averageMastery = allProgress.length > 0 ? totalMastery / allProgress.length : 0;

    // Calculate by subject
    for (const [subject, stats] of Object.entries(subjectStats)) {
      analysis.bySubject[subject] = {
        accuracy: stats.attempts > 0 ? stats.correct / stats.attempts : 0,
        averageMastery: stats.count > 0 ? stats.mastery / stats.count : 0,
        attempts: stats.attempts,
      };
    }

    // Identify strengths (mastery > 70)
    // Identify weaknesses (mastery < 40)
    for (const progress of allProgress) {
      const topicLabel = `${progress.subject} - ${progress.topic}`;
      
      if (progress.performance.masteryLevel >= 70) {
        analysis.strengths.push(topicLabel);
      } else if (progress.performance.masteryLevel < 40 && progress.performance.totalAttempts >= 3) {
        analysis.weaknesses.push(topicLabel);
      }
    }

    return analysis;
  }
}

export const adaptiveDifficultyService = new AdaptiveDifficultyService();

