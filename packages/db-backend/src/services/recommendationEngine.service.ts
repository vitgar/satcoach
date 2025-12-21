/**
 * Recommendation Engine Service
 * 
 * Generates personalized topic recommendations using a balanced approach:
 * - Mastery level (weight: 0.4)
 * - Time since last review (weight: 0.3)
 * - Error patterns (weight: 0.2)
 * - Student engagement (weight: 0.1)
 */

import mongoose from 'mongoose';
import { performanceAggregatorService, TopicMastery, WeakArea, SpacedRepetitionItem } from './performanceAggregator.service';
import { User } from '../models/User.model';
import { Question } from '../models/Question.model';

export interface TopicRecommendation {
  topic: string;
  subject: string;
  score: number; // 0-100, higher = more recommended
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedDuration: number; // minutes
  
  // Scoring breakdown
  breakdown: {
    masteryScore: number;
    timingScore: number;
    errorScore: number;
    engagementScore: number;
  };
  
  // Additional context
  masteryLevel: number;
  daysSincePractice: number;
  weakAreas: string[];
  questionCount: number;
}

export interface RecommendationContext {
  userId: string;
  subject: string;
  sessionDuration?: number; // preferred session length in minutes
  focusOnWeakAreas?: boolean;
  excludeTopics?: string[];
}

export interface RecommendationResult {
  recommendations: TopicRecommendation[];
  summary: string;
  studentContext: {
    overallMastery: number;
    recentEngagement: number;
    weakAreaCount: number;
    topicsToReview: number;
  };
}

// Weights for scoring
const WEIGHTS = {
  mastery: 0.4,
  timing: 0.3,
  errors: 0.2,
  engagement: 0.1,
};

// Default topics for new students with no practice history
// These are ordered by recommended learning sequence for SAT prep
const DEFAULT_TOPICS: Record<string, { topic: string; description: string; priority: number }[]> = {
  Math: [
    { topic: 'Linear Equations', description: 'Foundation of algebraic thinking', priority: 1 },
    { topic: 'Ratios and Proportions', description: 'Essential for problem-solving', priority: 2 },
    { topic: 'Percentages', description: 'Common in word problems', priority: 3 },
    { topic: 'Quadratic Functions', description: 'Core algebra concept', priority: 4 },
    { topic: 'Systems of Equations', description: 'Multi-step problem solving', priority: 5 },
    { topic: 'Data Analysis', description: 'Interpreting charts and graphs', priority: 6 },
    { topic: 'Geometry Basics', description: 'Angles, triangles, and circles', priority: 7 },
  ],
  math: [
    { topic: 'Linear Equations', description: 'Foundation of algebraic thinking', priority: 1 },
    { topic: 'Ratios and Proportions', description: 'Essential for problem-solving', priority: 2 },
    { topic: 'Percentages', description: 'Common in word problems', priority: 3 },
    { topic: 'Quadratic Functions', description: 'Core algebra concept', priority: 4 },
    { topic: 'Systems of Equations', description: 'Multi-step problem solving', priority: 5 },
    { topic: 'Data Analysis', description: 'Interpreting charts and graphs', priority: 6 },
    { topic: 'Geometry Basics', description: 'Angles, triangles, and circles', priority: 7 },
  ],
  Reading: [
    { topic: 'Main Idea', description: 'Identifying central themes', priority: 1 },
    { topic: 'Evidence-Based Reading', description: 'Finding textual support', priority: 2 },
    { topic: 'Inference', description: 'Drawing conclusions from text', priority: 3 },
    { topic: 'Vocabulary in Context', description: 'Understanding word meanings', priority: 4 },
    { topic: 'Author\'s Purpose', description: 'Analyzing intent and tone', priority: 5 },
    { topic: 'Passage Structure', description: 'Understanding organization', priority: 6 },
  ],
  reading: [
    { topic: 'Main Idea', description: 'Identifying central themes', priority: 1 },
    { topic: 'Evidence-Based Reading', description: 'Finding textual support', priority: 2 },
    { topic: 'Inference', description: 'Drawing conclusions from text', priority: 3 },
    { topic: 'Vocabulary in Context', description: 'Understanding word meanings', priority: 4 },
    { topic: 'Author\'s Purpose', description: 'Analyzing intent and tone', priority: 5 },
    { topic: 'Passage Structure', description: 'Understanding organization', priority: 6 },
  ],
  Writing: [
    { topic: 'Subject-Verb Agreement', description: 'Grammar fundamentals', priority: 1 },
    { topic: 'Punctuation', description: 'Commas, semicolons, and more', priority: 2 },
    { topic: 'Sentence Structure', description: 'Building clear sentences', priority: 3 },
    { topic: 'Transitions', description: 'Connecting ideas smoothly', priority: 4 },
    { topic: 'Pronoun Usage', description: 'Agreement and clarity', priority: 5 },
    { topic: 'Conciseness', description: 'Eliminating redundancy', priority: 6 },
  ],
  writing: [
    { topic: 'Subject-Verb Agreement', description: 'Grammar fundamentals', priority: 1 },
    { topic: 'Punctuation', description: 'Commas, semicolons, and more', priority: 2 },
    { topic: 'Sentence Structure', description: 'Building clear sentences', priority: 3 },
    { topic: 'Transitions', description: 'Connecting ideas smoothly', priority: 4 },
    { topic: 'Pronoun Usage', description: 'Agreement and clarity', priority: 5 },
    { topic: 'Conciseness', description: 'Eliminating redundancy', priority: 6 },
  ],
};

export class RecommendationEngineService {
  /**
   * Get recommended topics for a student in a specific subject
   */
  async getRecommendedTopics(
    context: RecommendationContext,
    limit: number = 5
  ): Promise<RecommendationResult> {
    const { userId, subject, focusOnWeakAreas, excludeTopics } = context;

    // Get performance data
    const performance = await performanceAggregatorService.aggregateStudentPerformance(userId, subject);
    const weakAreas = await performanceAggregatorService.getWeakAreas(userId, subject, 10);
    const dueItems = await performanceAggregatorService.getSpacedRepetitionDue(userId, subject, 10);

    // Get all available topics for this subject
    const availableTopics = await this.getAvailableTopicsWithQuestions(subject);

    // Get user communication profile for personalization
    const user = await User.findById(userId);
    const communicationProfile = user?.learningProfile?.communicationProfile;

    // Score each topic
    const scoredTopics: TopicRecommendation[] = [];

    for (const topicInfo of availableTopics) {
      if (excludeTopics?.includes(topicInfo.topic)) continue;

      const topicMastery = performance.topicMasteries.find(tm => tm.topic === topicInfo.topic);
      const weakArea = weakAreas.find(wa => wa.topic === topicInfo.topic);
      const dueItem = dueItems.find(di => di.topic === topicInfo.topic);

      const recommendation = this.scoreTopic(
        topicInfo,
        topicMastery,
        weakArea,
        dueItem,
        communicationProfile,
        focusOnWeakAreas
      );

      if (recommendation.score > 0) {
        scoredTopics.push(recommendation);
      }
    }

    // Sort by score (descending) and limit
    scoredTopics.sort((a, b) => b.score - a.score);
    let recommendations = scoredTopics.slice(0, limit);

    // If no recommendations from question database, provide default topics
    if (recommendations.length === 0) {
      recommendations = this.getDefaultRecommendations(subject, limit);
    }

    // Generate summary
    const summary = this.generateSummary(recommendations, performance, weakAreas.length, dueItems.length);

    return {
      recommendations,
      summary,
      studentContext: {
        overallMastery: performance.overallMastery,
        recentEngagement: performance.recentEngagement,
        weakAreaCount: weakAreas.length,
        topicsToReview: dueItems.length,
      },
    };
  }

  /**
   * Get default recommendations for new students
   */
  private getDefaultRecommendations(subject: string, limit: number): TopicRecommendation[] {
    const defaultTopics = DEFAULT_TOPICS[subject] || DEFAULT_TOPICS['Math'];
    
    return defaultTopics.slice(0, limit).map((topic, index) => ({
      topic: topic.topic,
      subject,
      score: 90 - (index * 10), // First topic gets 90, decreasing
      reason: topic.description,
      priority: index === 0 ? 'high' : index < 3 ? 'medium' : 'low',
      estimatedDuration: 15,
      breakdown: {
        masteryScore: 40, // New topic
        timingScore: 30, // Never practiced
        errorScore: 0,
        engagementScore: 20,
      },
      masteryLevel: 0,
      daysSincePractice: 999, // Never practiced
      weakAreas: [],
      questionCount: 0, // Will be populated when questions exist
    }));
  }

  /**
   * Explain why a specific topic was recommended
   */
  async explainRecommendation(
    userId: string,
    subject: string,
    topic: string
  ): Promise<string> {
    const result = await this.getRecommendedTopics({ userId, subject }, 10);
    const recommendation = result.recommendations.find(r => r.topic === topic);

    if (!recommendation) {
      return `${topic} is not currently in your top recommendations. Consider focusing on higher-priority topics first.`;
    }

    const reasons: string[] = [];

    if (recommendation.breakdown.masteryScore >= 30) {
      reasons.push(`your mastery level is ${recommendation.masteryLevel}%`);
    }
    if (recommendation.breakdown.timingScore >= 25) {
      reasons.push(`it's been ${recommendation.daysSincePractice} days since you practiced`);
    }
    if (recommendation.breakdown.errorScore >= 15) {
      reasons.push(`you have ${recommendation.weakAreas.length} areas needing attention`);
    }
    if (recommendation.priority === 'high') {
      reasons.push('this is a high-priority topic for SAT preparation');
    }

    if (reasons.length === 0) {
      return `${topic} is recommended to maintain your current skills and explore new concepts.`;
    }

    return `I recommend ${topic} because ${reasons.join(', ')}.`;
  }

  /**
   * Adjust recommendations based on completed session
   */
  async adjustRecommendationBasedOnSession(
    userId: string,
    subject: string,
    completedTopic: string,
    sessionOutcome: {
      accuracy: number;
      conceptsMastered: string[];
      conceptsNeedingWork: string[];
      engagementScore: number;
    }
  ): Promise<TopicRecommendation[]> {
    // Get fresh recommendations excluding the just-completed topic
    const result = await this.getRecommendedTopics(
      {
        userId,
        subject,
        excludeTopics: [completedTopic],
        // If session went poorly, focus on weak areas next
        focusOnWeakAreas: sessionOutcome.accuracy < 0.5,
      },
      3
    );

    // Add contextual adjustment based on session outcome
    if (sessionOutcome.conceptsNeedingWork.length > 0) {
      // Boost related topics
      for (const rec of result.recommendations) {
        const hasRelatedConcept = sessionOutcome.conceptsNeedingWork.some(
          concept => rec.topic.toLowerCase().includes(concept.toLowerCase()) ||
                    rec.weakAreas.some(wa => wa.toLowerCase().includes(concept.toLowerCase()))
        );
        if (hasRelatedConcept) {
          rec.score = Math.min(100, rec.score + 10);
          rec.reason += ' (related to areas needing work)';
        }
      }
      result.recommendations.sort((a, b) => b.score - a.score);
    }

    return result.recommendations;
  }

  /**
   * Get topics available for a subject with question counts
   */
  private async getAvailableTopicsWithQuestions(subject: string): Promise<{
    topic: string;
    questionCount: number;
    difficulties: string[];
  }[]> {
    const questions = await Question.find({ subject, isActive: true });

    const topicMap = new Map<string, { count: number; difficulties: Set<string> }>();

    for (const question of questions) {
      for (const tag of question.tags) {
        const existing = topicMap.get(tag) || { count: 0, difficulties: new Set() };
        existing.count++;
        existing.difficulties.add(question.difficulty);
        topicMap.set(tag, existing);
      }
    }

    return Array.from(topicMap.entries())
      .map(([topic, data]) => ({
        topic,
        questionCount: data.count,
        difficulties: Array.from(data.difficulties),
      }))
      .filter(t => t.questionCount >= 1); // At least 1 question available
  }

  /**
   * Score a single topic for recommendation
   */
  private scoreTopic(
    topicInfo: { topic: string; questionCount: number; difficulties: string[] },
    topicMastery: TopicMastery | undefined,
    weakArea: WeakArea | undefined,
    dueItem: SpacedRepetitionItem | undefined,
    communicationProfile: any,
    focusOnWeakAreas: boolean = false
  ): TopicRecommendation {
    // Calculate individual scores (0-100)
    
    // Mastery score: Lower mastery = higher score (more room to improve)
    const currentMastery = topicMastery?.masteryLevel || 0;
    const masteryScore = Math.max(0, 100 - currentMastery);

    // Timing score: More days since practice = higher score
    const daysSince = topicMastery?.daysSinceLastPractice || 30;
    const timingScore = Math.min(100, daysSince * 5); // Max at 20 days

    // Error score: More error patterns = higher score
    const errorPatterns = topicMastery?.errorPatterns || [];
    const errorScore = Math.min(100, errorPatterns.length * 25);

    // Engagement score: Base on student's learning style match
    let engagementScore = 50; // Default
    if (communicationProfile) {
      // Boost score if topic aligns with learning style
      // This is a simplified heuristic
      engagementScore = 60;
    }

    // Apply weights
    const weightedScore = 
      masteryScore * WEIGHTS.mastery +
      timingScore * WEIGHTS.timing +
      errorScore * WEIGHTS.errors +
      engagementScore * WEIGHTS.engagement;

    // Apply modifiers
    let finalScore = weightedScore;

    // Boost weak areas if focusing on them
    if (weakArea && focusOnWeakAreas) {
      finalScore += 15;
    }

    // Boost due items
    if (dueItem) {
      finalScore += dueItem.urgency * 10;
    }

    // Boost topics with more questions (more variety)
    if (topicInfo.questionCount >= 5) {
      finalScore += 5;
    }

    // Determine priority
    let priority: 'high' | 'medium' | 'low' = 'medium';
    if (finalScore >= 70 || (weakArea && weakArea.priority >= 8)) {
      priority = 'high';
    } else if (finalScore < 40) {
      priority = 'low';
    }

    // Generate reason
    const reason = this.generateReason(
      currentMastery,
      daysSince,
      errorPatterns,
      dueItem,
      weakArea
    );

    // Estimate duration based on mastery
    const estimatedDuration = currentMastery < 30 ? 20 :
                              currentMastery < 60 ? 15 : 10;

    return {
      topic: topicInfo.topic,
      subject: topicMastery?.subject || 'Math',
      score: Math.round(Math.min(100, finalScore)),
      reason,
      priority,
      estimatedDuration,
      breakdown: {
        masteryScore: Math.round(masteryScore * WEIGHTS.mastery),
        timingScore: Math.round(timingScore * WEIGHTS.timing),
        errorScore: Math.round(errorScore * WEIGHTS.errors),
        engagementScore: Math.round(engagementScore * WEIGHTS.engagement),
      },
      masteryLevel: currentMastery,
      daysSincePractice: daysSince,
      weakAreas: errorPatterns,
      questionCount: topicInfo.questionCount,
    };
  }

  /**
   * Generate human-readable reason for recommendation
   */
  private generateReason(
    mastery: number,
    daysSince: number,
    errorPatterns: string[],
    dueItem: SpacedRepetitionItem | undefined,
    weakArea: WeakArea | undefined
  ): string {
    const reasons: string[] = [];

    if (mastery === 0) {
      reasons.push("You haven't practiced this topic yet");
    } else if (mastery < 40) {
      reasons.push('Building foundational understanding');
    } else if (mastery < 70) {
      reasons.push('Strengthen your skills');
    }

    if (dueItem && dueItem.urgency > 0.7) {
      reasons.push('Due for review');
    } else if (daysSince > 7) {
      reasons.push(`Last practiced ${daysSince} days ago`);
    }

    if (errorPatterns.length > 0) {
      reasons.push('Address specific gaps');
    }

    if (weakArea && weakArea.priority >= 8) {
      reasons.push('High priority for improvement');
    }

    if (reasons.length === 0) {
      reasons.push('Continue building mastery');
    }

    return reasons.slice(0, 2).join(' • ');
  }

  /**
   * Generate overall summary for recommendations
   */
  private generateSummary(
    recommendations: TopicRecommendation[],
    performance: any,
    weakAreaCount: number,
    dueCount: number
  ): string {
    if (recommendations.length === 0) {
      return "You're doing great! Keep practicing to maintain your skills.";
    }

    const topRec = recommendations[0];
    const isNewStudent = performance.overallMastery === 0 && weakAreaCount === 0 && dueCount === 0;

    if (isNewStudent) {
      // New student - give encouraging starting message
      return `Let's start with **${topRec.topic}** - ${topRec.reason}. This is a great foundation for SAT success!`;
    }

    const parts: string[] = [];
    parts.push(`I recommend starting with **${topRec.topic}**`);

    if (topRec.masteryLevel === 0) {
      parts.push("since it's a new topic for you");
    } else if (topRec.masteryLevel < 50) {
      parts.push(`to strengthen your ${topRec.masteryLevel}% mastery`);
    }

    if (weakAreaCount > 0) {
      parts.push(`. You have ${weakAreaCount} areas that need attention`);
    }

    if (dueCount > 0) {
      parts.push(`, and ${dueCount} topics are due for review`);
    }

    return parts.join('') + '.';
  }
}

export const recommendationEngineService = new RecommendationEngineService();

