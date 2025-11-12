import { StudentProgress, QuestionAttempt } from '../models/StudentProgress.model';
import { Question } from '../models/Question.model';
import { spacedRepetitionService } from './spacedRepetition.service';
import { adaptiveDifficultyService } from './adaptiveDifficulty.service';
import { questionService } from './question.service';
import mongoose from 'mongoose';

export interface RecordAttemptData {
  userId: string;
  questionId: string;
  isCorrect: boolean;
  timeSpent: number;
  hintsUsed?: number;
  confidence?: number;
  chatInteractions?: number;
}

export class ProgressService {
  /**
   * Record a question attempt and update progress
   */
  async recordAttempt(data: RecordAttemptData) {
    const { userId, questionId, isCorrect, timeSpent, hintsUsed = 0, confidence = 3, chatInteractions = 0 } = data;

    // Get question to determine subject and topic
    const question = await Question.findById(questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    const subject = question.subject;
    const topic = question.tags[0] || question.subject; // Use first tag as topic, or subject

    // Find or create progress record
    let progress = await StudentProgress.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      subject,
      topic,
    });

    if (!progress) {
      progress = new StudentProgress({
        userId,
        subject,
        topic,
        attempts: [],
        performance: {
          totalAttempts: 0,
          correctAttempts: 0,
          accuracyRate: 0,
          averageTime: 0,
          lastAttemptDate: new Date(),
          nextReviewDate: new Date(),
          masteryLevel: 0,
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
        },
      });
    }

    // Add the attempt
    progress.addAttempt({
      questionId: new mongoose.Types.ObjectId(questionId),
      isCorrect,
      timeSpent,
      hintsUsed,
      confidence,
      chatInteractions,
    });

    // Calculate quality score for SM-2
    const quality = spacedRepetitionService.calculateQualityScore(
      isCorrect,
      timeSpent,
      progress.performance.averageTime,
      confidence,
      hintsUsed
    );

    // Calculate next review using SM-2
    const srResult = spacedRepetitionService.calculateNextReview(
      quality,
      progress.performance.easeFactor,
      progress.performance.interval,
      progress.performance.repetitions
    );

    // Update performance with SM-2 results
    progress.performance.nextReviewDate = srResult.nextReviewDate;
    progress.performance.easeFactor = srResult.easeFactor;
    progress.performance.interval = srResult.interval;
    progress.performance.repetitions = srResult.repetitions;

    // Calculate mastery level
    progress.calculateMasteryLevel();

    // Save progress
    await progress.save();

    // Update question statistics
    await questionService.recordQuestionAttempt(questionId, isCorrect, timeSpent);

    // Adjust student difficulty level (if auto-adjust enabled)
    const newLevel = await adaptiveDifficultyService.adjustStudentLevel(userId);

    return {
      progress,
      nextReviewDate: srResult.nextReviewDate,
      masteryLevel: progress.performance.masteryLevel,
      newStudentLevel: newLevel,
    };
  }

  /**
   * Get review schedule for a student
   */
  async getReviewSchedule(userId: string) {
    const now = new Date();

    const allProgress = await StudentProgress.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ 'performance.nextReviewDate': 1 })
      .exec();

    const schedule = {
      dueNow: [] as any[],
      upcoming: [] as any[],
      overdue: [] as any[],
    };

    for (const progress of allProgress) {
      const item = {
        subject: progress.subject,
        topic: progress.topic,
        nextReviewDate: progress.performance.nextReviewDate,
        masteryLevel: progress.performance.masteryLevel,
        totalAttempts: progress.performance.totalAttempts,
        accuracyRate: progress.performance.accuracyRate,
        priority: spacedRepetitionService.calculateReviewPriority(
          progress.performance.nextReviewDate,
          progress.performance.masteryLevel,
          progress.performance.totalAttempts
        ),
        daysUntil: spacedRepetitionService.getDaysUntilReview(progress.performance.nextReviewDate),
      };

      if (spacedRepetitionService.isOverdue(progress.performance.nextReviewDate)) {
        schedule.overdue.push(item);
      } else if (spacedRepetitionService.isDueForReview(progress.performance.nextReviewDate)) {
        schedule.dueNow.push(item);
      } else {
        schedule.upcoming.push(item);
      }
    }

    // Sort by priority
    schedule.dueNow.sort((a, b) => b.priority - a.priority);
    schedule.overdue.sort((a, b) => b.priority - a.priority);
    schedule.upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

    return schedule;
  }

  /**
   * Get progress for a specific topic
   */
  async getTopicProgress(userId: string, subject: string, topic: string) {
    const progress = await StudentProgress.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      subject,
      topic,
    });

    if (!progress) {
      return null;
    }

    return {
      subject: progress.subject,
      topic: progress.topic,
      performance: progress.performance,
      recentAttempts: progress.attempts.slice(-10), // Last 10 attempts
      totalAttempts: progress.attempts.length,
    };
  }

  /**
   * Get all progress for a student
   */
  async getAllProgress(userId: string) {
    return StudentProgress.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ 'performance.masteryLevel': -1 })
      .exec();
  }

  /**
   * Get analytics/statistics for a student
   */
  async getAnalytics(userId: string) {
    const analysis = await adaptiveDifficultyService.analyzePerformance(userId);
    const schedule = await this.getReviewSchedule(userId);

    return {
      overall: analysis.overall,
      bySubject: analysis.bySubject,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      reviewSchedule: {
        dueNow: schedule.dueNow.length,
        overdue: schedule.overdue.length,
        upcoming: schedule.upcoming.length,
      },
    };
  }
}

export const progressService = new ProgressService();

