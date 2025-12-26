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
// Comprehensive SAT topics organized by College Board domains

// ============================================
// HEART OF ALGEBRA (Linear equations focus)
// ============================================
const HEART_OF_ALGEBRA_TOPICS = [
  { topic: 'Linear Equations', description: 'Solving one-variable equations', priority: 1 },
  { topic: 'Linear Inequalities', description: 'Solving and graphing inequalities', priority: 2 },
  { topic: 'Systems of Linear Equations', description: 'Solving systems algebraically', priority: 3 },
  { topic: 'Graphing Linear Equations', description: 'Slope-intercept and point-slope forms', priority: 4 },
  { topic: 'Linear Functions', description: 'Function notation and interpretation', priority: 5 },
  { topic: 'Absolute Value Equations', description: 'Equations with absolute values', priority: 6 },
];

// ============================================
// PROBLEM SOLVING AND DATA ANALYSIS
// ============================================
const DATA_ANALYSIS_TOPICS = [
  { topic: 'Ratios and Proportions', description: 'Setting up and solving ratios', priority: 7 },
  { topic: 'Rates', description: 'Unit rates and rate problems', priority: 8 },
  { topic: 'Percentages', description: 'Percent increase, decrease, and applications', priority: 9 },
  { topic: 'Unit Conversions', description: 'Converting between units', priority: 10 },
  { topic: 'Statistics - Mean, Median, Mode', description: 'Measures of central tendency', priority: 11 },
  { topic: 'Statistics - Standard Deviation', description: 'Measures of spread', priority: 12 },
  { topic: 'Data Interpretation - Tables', description: 'Reading and analyzing tables', priority: 13 },
  { topic: 'Data Interpretation - Graphs', description: 'Bar, line, and pie charts', priority: 14 },
  { topic: 'Scatterplots and Line of Best Fit', description: 'Correlation and trend analysis', priority: 15 },
  { topic: 'Probability', description: 'Basic and conditional probability', priority: 16 },
  { topic: 'Exponential Growth and Decay', description: 'Modeling real-world growth patterns', priority: 17 },
];

// ============================================
// PASSPORT TO ADVANCED MATH
// ============================================
const ADVANCED_MATH_TOPICS = [
  { topic: 'Quadratic Functions', description: 'Parabolas, vertex, and roots', priority: 18 },
  { topic: 'Quadratic Equations', description: 'Solving by factoring, formula, completing square', priority: 19 },
  { topic: 'Polynomial Operations', description: 'Adding, subtracting, multiplying polynomials', priority: 20 },
  { topic: 'Factoring Polynomials', description: 'GCF, difference of squares, trinomials', priority: 21 },
  { topic: 'Rational Expressions', description: 'Simplifying and operations with fractions', priority: 22 },
  { topic: 'Rational Equations', description: 'Solving equations with fractions', priority: 23 },
  { topic: 'Radicals and Rational Exponents', description: 'Simplifying and operations with roots', priority: 24 },
  { topic: 'Exponential Functions', description: 'Exponential equations and graphs', priority: 25 },
  { topic: 'Function Notation', description: 'Evaluating and interpreting functions', priority: 26 },
  { topic: 'Function Transformations', description: 'Shifts, reflections, and stretches', priority: 27 },
  { topic: 'Combining Functions', description: 'Adding, composing, and inverting functions', priority: 28 },
];

// ============================================
// ADDITIONAL TOPICS IN MATH
// ============================================
const ADDITIONAL_MATH_TOPICS = [
  { topic: 'Geometry - Angles', description: 'Complementary, supplementary, vertical angles', priority: 29 },
  { topic: 'Geometry - Triangles', description: 'Properties, similarity, and congruence', priority: 30 },
  { topic: 'Geometry - Right Triangles', description: 'Pythagorean theorem applications', priority: 31 },
  { topic: 'Geometry - Circles', description: 'Area, circumference, arcs, and sectors', priority: 32 },
  { topic: 'Geometry - Area and Perimeter', description: 'Calculating for various shapes', priority: 33 },
  { topic: 'Geometry - Volume', description: '3D shapes: prisms, cylinders, spheres', priority: 34 },
  { topic: 'Coordinate Geometry', description: 'Distance, midpoint, and slope', priority: 35 },
  { topic: 'Complex Numbers', description: 'Operations with imaginary numbers', priority: 36 },
  { topic: 'Trigonometry - Sine, Cosine, Tangent', description: 'Right triangle trig ratios', priority: 37 },
  { topic: 'Trigonometry - Unit Circle', description: 'Radians and the unit circle', priority: 38 },
  { topic: 'Trigonometry - Applications', description: 'Real-world trig problems', priority: 39 },
];

// Combine all Math topics
const ALL_MATH_TOPICS = [
  ...HEART_OF_ALGEBRA_TOPICS,
  ...DATA_ANALYSIS_TOPICS,
  ...ADVANCED_MATH_TOPICS,
  ...ADDITIONAL_MATH_TOPICS,
];

// ============================================
// READING TOPICS
// ============================================
const READING_TOPICS = [
  { topic: 'Main Idea and Central Themes', description: 'Identifying the central argument', priority: 1 },
  { topic: 'Evidence-Based Reading', description: 'Finding textual support for answers', priority: 2 },
  { topic: 'Inference and Implicit Meaning', description: 'Drawing conclusions from text', priority: 3 },
  { topic: 'Vocabulary in Context', description: 'Understanding word meanings in passages', priority: 4 },
  { topic: "Author's Purpose and Tone", description: 'Analyzing intent and attitude', priority: 5 },
  { topic: 'Passage Structure and Organization', description: 'Understanding how arguments develop', priority: 6 },
  { topic: 'Analyzing Arguments', description: 'Evaluating claims and reasoning', priority: 7 },
  { topic: 'Paired Passages', description: 'Comparing and contrasting viewpoints', priority: 8 },
  { topic: 'Data and Graphics in Reading', description: 'Interpreting charts within passages', priority: 9 },
  { topic: 'Literary Analysis', description: 'Analyzing narrative techniques', priority: 10 },
  { topic: 'Historical Documents', description: 'Founding documents and great speeches', priority: 11 },
  { topic: 'Science Passages', description: 'Reading scientific texts and studies', priority: 12 },
];

// ============================================
// WRITING AND LANGUAGE TOPICS
// ============================================
const WRITING_TOPICS = [
  { topic: 'Subject-Verb Agreement', description: 'Ensuring subjects and verbs match', priority: 1 },
  { topic: 'Pronoun Agreement and Clarity', description: 'Clear and correct pronoun usage', priority: 2 },
  { topic: 'Verb Tense and Mood', description: 'Consistent and correct tense usage', priority: 3 },
  { topic: 'Punctuation - Commas', description: 'Comma rules and applications', priority: 4 },
  { topic: 'Punctuation - Semicolons and Colons', description: 'Advanced punctuation usage', priority: 5 },
  { topic: 'Punctuation - Apostrophes', description: 'Possessives and contractions', priority: 6 },
  { topic: 'Sentence Structure', description: 'Complete sentences and fragments', priority: 7 },
  { topic: 'Parallel Structure', description: 'Maintaining consistent form in lists', priority: 8 },
  { topic: 'Modifier Placement', description: 'Avoiding dangling and misplaced modifiers', priority: 9 },
  { topic: 'Transitions and Logical Flow', description: 'Connecting ideas smoothly', priority: 10 },
  { topic: 'Conciseness and Wordiness', description: 'Eliminating redundancy', priority: 11 },
  { topic: 'Word Choice and Precision', description: 'Selecting the most effective words', priority: 12 },
  { topic: 'Sentence Combining', description: 'Merging sentences effectively', priority: 13 },
  { topic: 'Organization and Development', description: 'Logical ordering of ideas', priority: 14 },
  { topic: 'Effective Language Use', description: 'Style and tone consistency', priority: 15 },
];

// Build the DEFAULT_TOPICS object
const DEFAULT_TOPICS: Record<string, { topic: string; description: string; priority: number }[]> = {
  Math: ALL_MATH_TOPICS,
  math: ALL_MATH_TOPICS,
  Reading: READING_TOPICS,
  reading: READING_TOPICS,
  Writing: WRITING_TOPICS,
  writing: WRITING_TOPICS,
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

    // Get topics that have questions in the database
    const topicsWithQuestions = await this.getAvailableTopicsWithQuestions(subject);
    
    // Get all default topics for this subject
    const defaultTopics = DEFAULT_TOPICS[subject] || DEFAULT_TOPICS['math'] || [];
    
    // Create a map of topics with questions for quick lookup
    const topicsWithQuestionsMap = new Map(
      topicsWithQuestions.map(t => [t.topic, t])
    );
    
    // Combine: Start with all default topics, merge in question counts where available
    const allTopics = defaultTopics.map(defaultTopic => {
      const topicWithQuestions = topicsWithQuestionsMap.get(defaultTopic.topic);
      return {
        topic: defaultTopic.topic,
        questionCount: topicWithQuestions?.questionCount || 0,
        difficulties: topicWithQuestions?.difficulties || [],
      };
    });

    // Get user communication profile for personalization
    const user = await User.findById(userId);
    const communicationProfile = user?.learningProfile?.communicationProfile;

    // Score each topic
    const scoredTopics: TopicRecommendation[] = [];

    for (const topicInfo of allTopics) {
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
    const recommendations = scoredTopics.slice(0, limit);

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

