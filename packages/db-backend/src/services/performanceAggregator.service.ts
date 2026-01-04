/**
 * Performance Aggregator Service
 * 
 * Combines performance data from all sources to provide a comprehensive
 * view of student learning across:
 * - Practice sessions (/study page)
 * - Guided review sessions
 * - Chat conversation insights
 * - Question-level performance
 */

import mongoose from 'mongoose';
import { StudentProgress } from '../models/StudentProgress.model';
import { GuidedSession } from '../models/GuidedSession.model';
import { ChatSession } from '../models/ChatSession.model';
import { LearningSession } from '../models/LearningSession.model';
import { Question } from '../models/Question.model';

export interface TopicMastery {
  topic: string;
  subject: string;
  masteryLevel: number; // 0-100
  accuracyRate: number; // 0-1
  attemptCount: number;
  lastPracticed: Date | null;
  daysSinceLastPractice: number;
  errorPatterns: string[];
  bloomLevel: number;
  isWeakArea: boolean;
  spacedRepetitionDue: boolean;
}

export interface SubjectPerformance {
  subject: string;
  overallMastery: number;
  topicCount: number;
  weakAreaCount: number;
  dueForReviewCount: number;
  recentAccuracy: number;
  totalAttempts: number;
  studyTimeMinutes: number;
}

export interface AggregatedPerformance {
  userId: string;
  subjects: SubjectPerformance[];
  topicMasteries: TopicMastery[];
  overallMastery: number;
  totalStudyTime: number;
  recentEngagement: number;
  lastActiveDate: Date | null;
}

export interface WeakArea {
  topic: string;
  subject: string;
  masteryLevel: number;
  errorPatterns: string[];
  recommendedAction: string;
  priority: number; // 1-10, 10 being highest priority
}

export interface SpacedRepetitionItem {
  topic: string;
  subject: string;
  lastPracticed: Date;
  daysSince: number;
  optimalInterval: number;
  urgency: number; // 0-1, 1 being most urgent
}

export class PerformanceAggregatorService {
  /**
   * Aggregate all performance data for a student
   */
  async aggregateStudentPerformance(
    userId: string,
    subject?: string
  ): Promise<AggregatedPerformance> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Query all data sources in parallel
    const [progressRecords, guidedSessions, chatSessions, learningSessions] = await Promise.all([
      StudentProgress.find({
        userId: userObjectId,
        ...(subject && { subject }),
      }),
      GuidedSession.find({
        userId: userObjectId,
        startTime: { $gte: thirtyDaysAgo },
        ...(subject && { subject }),
      }),
      ChatSession.find({
        userId: userObjectId,
        startTime: { $gte: thirtyDaysAgo },
      }),
      LearningSession.find({
        userId: userObjectId,
        startTime: { $gte: thirtyDaysAgo },
      }),
    ]);

    // Build topic masteries
    const topicMasteries = await this.buildTopicMasteries(
      progressRecords,
      guidedSessions,
      subject
    );

    // Build subject performances
    const subjects = this.buildSubjectPerformances(
      progressRecords,
      guidedSessions,
      learningSessions,
      topicMasteries
    );

    // Calculate overall metrics
    const overallMastery = subjects.length > 0
      ? Math.round(subjects.reduce((sum, s) => sum + s.overallMastery, 0) / subjects.length)
      : 0;

    const totalStudyTime = learningSessions.reduce((sum, s) => sum + (s.duration || 0), 0) +
      guidedSessions.reduce((sum, s) => {
        const duration = s.endTime 
          ? (s.endTime.getTime() - s.startTime.getTime()) / 60000
          : 0;
        return sum + duration;
      }, 0);

    const recentEngagement = chatSessions.length > 0
      ? chatSessions.reduce((sum, s) => sum + s.insights.engagementScore, 0) / chatSessions.length
      : 50;

    const lastActiveDate = this.getLastActiveDate(guidedSessions, learningSessions);

    return {
      userId,
      subjects,
      topicMasteries,
      overallMastery,
      totalStudyTime: Math.round(totalStudyTime),
      recentEngagement: Math.round(recentEngagement),
      lastActiveDate,
    };
  }

  /**
   * Get mastery scores for all topics in a subject
   */
  async getTopicMasteryScores(
    userId: string,
    subject: string
  ): Promise<TopicMastery[]> {
    const performance = await this.aggregateStudentPerformance(userId, subject);
    return performance.topicMasteries.filter(tm => tm.subject === subject);
  }

  /**
   * Identify weak areas that need focus
   */
  async getWeakAreas(
    userId: string,
    subject?: string,
    limit: number = 5
  ): Promise<WeakArea[]> {
    const performance = await this.aggregateStudentPerformance(userId, subject);
    
    const weakAreas = performance.topicMasteries
      .filter(tm => tm.isWeakArea)
      .map(tm => ({
        topic: tm.topic,
        subject: tm.subject,
        masteryLevel: tm.masteryLevel,
        errorPatterns: tm.errorPatterns,
        recommendedAction: this.getRecommendedAction(tm),
        priority: this.calculatePriority(tm),
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);

    return weakAreas;
  }

  /**
   * Get topics due for spaced repetition review
   */
  async getSpacedRepetitionDue(
    userId: string,
    subject?: string,
    limit: number = 5
  ): Promise<SpacedRepetitionItem[]> {
    const performance = await this.aggregateStudentPerformance(userId, subject);
    
    const dueItems = performance.topicMasteries
      .filter(tm => tm.spacedRepetitionDue && tm.lastPracticed)
      .map(tm => {
        const optimalInterval = this.calculateOptimalInterval(tm.masteryLevel, tm.attemptCount);
        const urgency = Math.min(1, tm.daysSinceLastPractice / optimalInterval);
        
        return {
          topic: tm.topic,
          subject: tm.subject,
          lastPracticed: tm.lastPracticed!,
          daysSince: tm.daysSinceLastPractice,
          optimalInterval,
          urgency,
        };
      })
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, limit);

    return dueItems;
  }

  /**
   * Get all available topics for a subject
   */
  async getAvailableTopics(subject: string): Promise<string[]> {
    const questions = await Question.find({ subject }).distinct('tags');
    return questions.flat().filter((tag, index, arr) => arr.indexOf(tag) === index);
  }

  /**
   * Get performance summary for a specific topic
   */
  async getTopicPerformance(
    userId: string,
    subject: string,
    topic: string
  ): Promise<TopicMastery | null> {
    const masteries = await this.getTopicMasteryScores(userId, subject);
    return masteries.find(tm => tm.topic === topic) || null;
  }

  // Private helper methods

  private async buildTopicMasteries(
    progressRecords: any[],
    guidedSessions: any[],
    subject?: string
  ): Promise<TopicMastery[]> {
    const topicMap = new Map<string, TopicMastery>();
    const now = new Date();

    // Process progress records (from practice sessions)
    for (const progress of progressRecords) {
      if (subject && progress.subject !== subject) continue;
      
      const key = `${progress.subject}:${progress.topic}`;
      const existing = topicMap.get(key);

      if (existing) {
        // Merge with existing
        existing.attemptCount += progress.performance.totalAttempts;
        existing.masteryLevel = Math.max(existing.masteryLevel, progress.performance.masteryLevel);
        existing.accuracyRate = (existing.accuracyRate + progress.performance.accuracyRate) / 2;
        if (progress.performance.lastAttemptDate &&
            (!existing.lastPracticed || progress.performance.lastAttemptDate > existing.lastPracticed)) {
          existing.lastPracticed = progress.performance.lastAttemptDate;
        }
        existing.bloomLevel = Math.max(existing.bloomLevel, progress.performance.bloomProgress?.currentLevel || 1);
      } else {
        const lastPracticed = progress.performance.lastAttemptDate || null;
        const daysSince = lastPracticed 
          ? Math.floor((now.getTime() - lastPracticed.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        topicMap.set(key, {
          topic: progress.topic,
          subject: progress.subject,
          masteryLevel: progress.performance.masteryLevel,
          accuracyRate: progress.performance.accuracyRate,
          attemptCount: progress.performance.totalAttempts,
          lastPracticed,
          daysSinceLastPractice: daysSince,
          errorPatterns: [],
          bloomLevel: progress.performance.bloomProgress?.currentLevel || 1,
          isWeakArea: progress.performance.masteryLevel < 50 || progress.performance.accuracyRate < 0.5,
          spacedRepetitionDue: this.isSpacedRepetitionDue(progress.performance.masteryLevel, daysSince),
        });
      }
    }

    // Process guided sessions
    for (const session of guidedSessions) {
      if (subject && session.subject !== subject) continue;

      const key = `${session.subject}:${session.topic}`;
      const existing = topicMap.get(key);

      if (existing) {
        // Update with guided session data
        existing.attemptCount += session.outcomes.questionsAttempted;
        if (session.outcomes.questionsAttempted > 0) {
          const sessionAccuracy = session.outcomes.questionsCorrect / session.outcomes.questionsAttempted;
          existing.accuracyRate = (existing.accuracyRate + sessionAccuracy) / 2;
        }
        if (!existing.lastPracticed || session.startTime > existing.lastPracticed) {
          existing.lastPracticed = session.startTime;
          existing.daysSinceLastPractice = Math.floor(
            (now.getTime() - session.startTime.getTime()) / (1000 * 60 * 60 * 24)
          );
        }
        // Merge concepts needing work into error patterns
        session.outcomes.conceptsNeedingWork.forEach((concept: string) => {
          if (!existing.errorPatterns.includes(concept)) {
            existing.errorPatterns.push(concept);
          }
        });
      } else {
        const daysSince = Math.floor(
          (now.getTime() - session.startTime.getTime()) / (1000 * 60 * 60 * 24)
        );
        const accuracy = session.outcomes.questionsAttempted > 0
          ? session.outcomes.questionsCorrect / session.outcomes.questionsAttempted
          : 0;

        topicMap.set(key, {
          topic: session.topic,
          subject: session.subject,
          masteryLevel: session.outcomes.engagementScore * 0.5, // Rough estimate from engagement
          accuracyRate: accuracy,
          attemptCount: session.outcomes.questionsAttempted,
          lastPracticed: session.startTime,
          daysSinceLastPractice: daysSince,
          errorPatterns: session.outcomes.conceptsNeedingWork || [],
          bloomLevel: session.outcomes.bloomLevelReached,
          isWeakArea: accuracy < 0.5 || session.outcomes.conceptsNeedingWork.length > 0,
          spacedRepetitionDue: this.isSpacedRepetitionDue(session.outcomes.engagementScore * 0.5, daysSince),
        });
      }
    }

    return Array.from(topicMap.values());
  }

  private buildSubjectPerformances(
    progressRecords: any[],
    guidedSessions: any[],
    learningSessions: any[],
    topicMasteries: TopicMastery[]
  ): SubjectPerformance[] {
    const subjectMap = new Map<string, SubjectPerformance>();
    const subjects = ['Math', 'Reading', 'Writing'];

    for (const subject of subjects) {
      const subjectTopics = topicMasteries.filter(tm => tm.subject === subject);
      const subjectProgress = progressRecords.filter(p => p.subject === subject);
      const subjectGuidedSessions = guidedSessions.filter(s => s.subject === subject);

      const overallMastery = subjectTopics.length > 0
        ? Math.round(subjectTopics.reduce((sum, t) => sum + t.masteryLevel, 0) / subjectTopics.length)
        : 0;

      const weakAreaCount = subjectTopics.filter(t => t.isWeakArea).length;
      const dueForReviewCount = subjectTopics.filter(t => t.spacedRepetitionDue).length;

      const totalAttempts = subjectProgress.reduce((sum, p) => sum + p.performance.totalAttempts, 0) +
        subjectGuidedSessions.reduce((sum, s) => sum + s.outcomes.questionsAttempted, 0);

      const totalCorrect = subjectProgress.reduce((sum, p) => 
        sum + Math.round(p.performance.totalAttempts * p.performance.accuracyRate), 0) +
        subjectGuidedSessions.reduce((sum, s) => sum + s.outcomes.questionsCorrect, 0);

      const recentAccuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;

      const studyTimeMinutes = subjectGuidedSessions.reduce((sum, s) => {
        if (s.endTime) {
          return sum + (s.endTime.getTime() - s.startTime.getTime()) / 60000;
        }
        return sum;
      }, 0);

      subjectMap.set(subject, {
        subject,
        overallMastery,
        topicCount: subjectTopics.length,
        weakAreaCount,
        dueForReviewCount,
        recentAccuracy: Math.round(recentAccuracy * 100) / 100,
        totalAttempts,
        studyTimeMinutes: Math.round(studyTimeMinutes),
      });
    }

    return Array.from(subjectMap.values()).filter(s => s.topicCount > 0 || s.totalAttempts > 0);
  }

  private getLastActiveDate(
    guidedSessions: any[],
    learningSessions: any[]
  ): Date | null {
    const allDates: Date[] = [
      ...guidedSessions.map(s => s.startTime),
      ...learningSessions.map(s => s.startTime),
    ].filter(Boolean);

    if (allDates.length === 0) return null;
    return allDates.reduce((latest, date) => date > latest ? date : latest);
  }

  private isSpacedRepetitionDue(masteryLevel: number, daysSince: number): boolean {
    // Higher mastery = longer interval before review needed
    const optimalInterval = this.calculateOptimalInterval(masteryLevel, 1);
    return daysSince >= optimalInterval;
  }

  private calculateOptimalInterval(masteryLevel: number, attemptCount: number): number {
    // Base interval increases with mastery and repetitions
    const baseInterval = 1; // days
    const masteryMultiplier = 1 + (masteryLevel / 20); // 1-6x based on mastery
    const repetitionMultiplier = Math.min(3, 1 + attemptCount * 0.2); // Max 3x
    
    return Math.round(baseInterval * masteryMultiplier * repetitionMultiplier);
  }

  private getRecommendedAction(tm: TopicMastery): string {
    if (tm.masteryLevel < 30) {
      return 'Start with foundational concepts and basic examples';
    } else if (tm.masteryLevel < 50) {
      return 'Practice more problems to build understanding';
    } else if (tm.accuracyRate < 0.5) {
      return 'Focus on accuracy - slow down and check your work';
    } else if (tm.errorPatterns.length > 0) {
      return `Address specific gaps: ${tm.errorPatterns.slice(0, 2).join(', ')}`;
    }
    return 'Continue practice to maintain mastery';
  }

  private calculatePriority(tm: TopicMastery): number {
    let priority = 5; // Base priority

    // Lower mastery = higher priority
    if (tm.masteryLevel < 30) priority += 3;
    else if (tm.masteryLevel < 50) priority += 2;
    else if (tm.masteryLevel < 70) priority += 1;

    // Lower accuracy = higher priority
    if (tm.accuracyRate < 0.4) priority += 2;
    else if (tm.accuracyRate < 0.6) priority += 1;

    // More error patterns = higher priority
    priority += Math.min(2, tm.errorPatterns.length * 0.5);

    // Due for review = higher priority
    if (tm.spacedRepetitionDue) priority += 1;

    return Math.min(10, priority);
  }
}

export const performanceAggregatorService = new PerformanceAggregatorService();






