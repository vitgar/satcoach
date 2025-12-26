/**
 * Intelligent Topic Selector Service
 * 
 * Automatically selects the optimal topic for a student based on:
 * - Spaced Repetition (SM-2 algorithm) - 30%
 * - Bloom's Taxonomy progression - 25%
 * - Flow State (challenge matches skill) - 25%
 * - Learning Continuity (resume incomplete, respect sequencing) - 20%
 * 
 * This service embodies the AI tutor's decision-making capability,
 * removing the burden of topic selection from students.
 */

import mongoose from 'mongoose';
import { performanceAggregatorService, TopicMastery, SpacedRepetitionItem, WeakArea } from './performanceAggregator.service';
import { GuidedSession } from '../models/GuidedSession.model';
import { User } from '../models/User.model';

// ============================================
// TOPIC DEFINITIONS (same as recommendationEngine)
// ============================================
const HEART_OF_ALGEBRA_TOPICS = [
  { topic: 'Linear Equations', description: 'Solving one-variable equations', priority: 1, bloomPrereqs: [] },
  { topic: 'Linear Inequalities', description: 'Solving and graphing inequalities', priority: 2, bloomPrereqs: ['Linear Equations'] },
  { topic: 'Systems of Linear Equations', description: 'Solving systems algebraically', priority: 3, bloomPrereqs: ['Linear Equations'] },
  { topic: 'Graphing Linear Equations', description: 'Slope-intercept and point-slope forms', priority: 4, bloomPrereqs: ['Linear Equations'] },
  { topic: 'Linear Functions', description: 'Function notation and interpretation', priority: 5, bloomPrereqs: ['Graphing Linear Equations'] },
  { topic: 'Absolute Value Equations', description: 'Equations with absolute values', priority: 6, bloomPrereqs: ['Linear Equations'] },
];

const DATA_ANALYSIS_TOPICS = [
  { topic: 'Ratios and Proportions', description: 'Setting up and solving ratios', priority: 7, bloomPrereqs: [] },
  { topic: 'Rates', description: 'Unit rates and rate problems', priority: 8, bloomPrereqs: ['Ratios and Proportions'] },
  { topic: 'Percentages', description: 'Percent increase, decrease, and applications', priority: 9, bloomPrereqs: ['Ratios and Proportions'] },
  { topic: 'Unit Conversions', description: 'Converting between units', priority: 10, bloomPrereqs: ['Ratios and Proportions'] },
  { topic: 'Statistics - Mean, Median, Mode', description: 'Measures of central tendency', priority: 11, bloomPrereqs: [] },
  { topic: 'Statistics - Standard Deviation', description: 'Measures of spread', priority: 12, bloomPrereqs: ['Statistics - Mean, Median, Mode'] },
  { topic: 'Data Interpretation - Tables', description: 'Reading and analyzing tables', priority: 13, bloomPrereqs: [] },
  { topic: 'Data Interpretation - Graphs', description: 'Bar, line, and pie charts', priority: 14, bloomPrereqs: ['Data Interpretation - Tables'] },
  { topic: 'Scatterplots and Line of Best Fit', description: 'Correlation and trend analysis', priority: 15, bloomPrereqs: ['Data Interpretation - Graphs'] },
  { topic: 'Probability', description: 'Basic and conditional probability', priority: 16, bloomPrereqs: ['Percentages'] },
  { topic: 'Exponential Growth and Decay', description: 'Modeling real-world growth patterns', priority: 17, bloomPrereqs: ['Percentages'] },
];

const ADVANCED_MATH_TOPICS = [
  { topic: 'Quadratic Functions', description: 'Parabolas, vertex, and roots', priority: 18, bloomPrereqs: ['Linear Functions'] },
  { topic: 'Quadratic Equations', description: 'Solving by factoring, formula, completing square', priority: 19, bloomPrereqs: ['Quadratic Functions'] },
  { topic: 'Polynomial Operations', description: 'Adding, subtracting, multiplying polynomials', priority: 20, bloomPrereqs: ['Linear Equations'] },
  { topic: 'Factoring Polynomials', description: 'GCF, difference of squares, trinomials', priority: 21, bloomPrereqs: ['Polynomial Operations'] },
  { topic: 'Rational Expressions', description: 'Simplifying and operations with fractions', priority: 22, bloomPrereqs: ['Factoring Polynomials'] },
  { topic: 'Rational Equations', description: 'Solving equations with fractions', priority: 23, bloomPrereqs: ['Rational Expressions'] },
  { topic: 'Radicals and Rational Exponents', description: 'Simplifying and operations with roots', priority: 24, bloomPrereqs: [] },
  { topic: 'Exponential Functions', description: 'Exponential equations and graphs', priority: 25, bloomPrereqs: ['Exponential Growth and Decay'] },
  { topic: 'Function Notation', description: 'Evaluating and interpreting functions', priority: 26, bloomPrereqs: ['Linear Functions'] },
  { topic: 'Function Transformations', description: 'Shifts, reflections, and stretches', priority: 27, bloomPrereqs: ['Function Notation', 'Quadratic Functions'] },
  { topic: 'Combining Functions', description: 'Adding, composing, and inverting functions', priority: 28, bloomPrereqs: ['Function Notation'] },
];

const ADDITIONAL_MATH_TOPICS = [
  { topic: 'Geometry - Angles', description: 'Complementary, supplementary, vertical angles', priority: 29, bloomPrereqs: [] },
  { topic: 'Geometry - Triangles', description: 'Properties, similarity, and congruence', priority: 30, bloomPrereqs: ['Geometry - Angles'] },
  { topic: 'Geometry - Right Triangles', description: 'Pythagorean theorem applications', priority: 31, bloomPrereqs: ['Geometry - Triangles'] },
  { topic: 'Geometry - Circles', description: 'Area, circumference, arcs, and sectors', priority: 32, bloomPrereqs: [] },
  { topic: 'Geometry - Area and Perimeter', description: 'Calculating for various shapes', priority: 33, bloomPrereqs: ['Geometry - Triangles', 'Geometry - Circles'] },
  { topic: 'Geometry - Volume', description: '3D shapes: prisms, cylinders, spheres', priority: 34, bloomPrereqs: ['Geometry - Area and Perimeter'] },
  { topic: 'Coordinate Geometry', description: 'Distance, midpoint, and slope', priority: 35, bloomPrereqs: ['Graphing Linear Equations'] },
  { topic: 'Complex Numbers', description: 'Operations with imaginary numbers', priority: 36, bloomPrereqs: ['Radicals and Rational Exponents'] },
  { topic: 'Trigonometry - Sine, Cosine, Tangent', description: 'Right triangle trig ratios', priority: 37, bloomPrereqs: ['Geometry - Right Triangles'] },
  { topic: 'Trigonometry - Unit Circle', description: 'Radians and the unit circle', priority: 38, bloomPrereqs: ['Trigonometry - Sine, Cosine, Tangent'] },
  { topic: 'Trigonometry - Applications', description: 'Real-world trig problems', priority: 39, bloomPrereqs: ['Trigonometry - Unit Circle'] },
];

const ALL_MATH_TOPICS = [
  ...HEART_OF_ALGEBRA_TOPICS,
  ...DATA_ANALYSIS_TOPICS,
  ...ADVANCED_MATH_TOPICS,
  ...ADDITIONAL_MATH_TOPICS,
];

const READING_TOPICS = [
  { topic: 'Main Idea and Central Themes', description: 'Identifying the central argument', priority: 1, bloomPrereqs: [] },
  { topic: 'Evidence-Based Reading', description: 'Finding textual support for answers', priority: 2, bloomPrereqs: ['Main Idea and Central Themes'] },
  { topic: 'Inference and Implicit Meaning', description: 'Drawing conclusions from text', priority: 3, bloomPrereqs: ['Evidence-Based Reading'] },
  { topic: 'Vocabulary in Context', description: 'Understanding word meanings in passages', priority: 4, bloomPrereqs: [] },
  { topic: "Author's Purpose and Tone", description: 'Analyzing intent and attitude', priority: 5, bloomPrereqs: ['Main Idea and Central Themes'] },
  { topic: 'Passage Structure and Organization', description: 'Understanding how arguments develop', priority: 6, bloomPrereqs: ["Author's Purpose and Tone"] },
  { topic: 'Analyzing Arguments', description: 'Evaluating claims and reasoning', priority: 7, bloomPrereqs: ['Passage Structure and Organization'] },
  { topic: 'Paired Passages', description: 'Comparing and contrasting viewpoints', priority: 8, bloomPrereqs: ['Analyzing Arguments'] },
  { topic: 'Data and Graphics in Reading', description: 'Interpreting charts within passages', priority: 9, bloomPrereqs: [] },
  { topic: 'Literary Analysis', description: 'Analyzing narrative techniques', priority: 10, bloomPrereqs: ['Main Idea and Central Themes'] },
  { topic: 'Historical Documents', description: 'Founding documents and great speeches', priority: 11, bloomPrereqs: ['Vocabulary in Context'] },
  { topic: 'Science Passages', description: 'Reading scientific texts and studies', priority: 12, bloomPrereqs: ['Data and Graphics in Reading'] },
];

const WRITING_TOPICS = [
  { topic: 'Subject-Verb Agreement', description: 'Ensuring subjects and verbs match', priority: 1, bloomPrereqs: [] },
  { topic: 'Pronoun Agreement and Clarity', description: 'Clear and correct pronoun usage', priority: 2, bloomPrereqs: ['Subject-Verb Agreement'] },
  { topic: 'Verb Tense and Mood', description: 'Consistent and correct tense usage', priority: 3, bloomPrereqs: ['Subject-Verb Agreement'] },
  { topic: 'Punctuation - Commas', description: 'Comma rules and applications', priority: 4, bloomPrereqs: [] },
  { topic: 'Punctuation - Semicolons and Colons', description: 'Advanced punctuation usage', priority: 5, bloomPrereqs: ['Punctuation - Commas'] },
  { topic: 'Punctuation - Apostrophes', description: 'Possessives and contractions', priority: 6, bloomPrereqs: [] },
  { topic: 'Sentence Structure', description: 'Complete sentences and fragments', priority: 7, bloomPrereqs: [] },
  { topic: 'Parallel Structure', description: 'Maintaining consistent form in lists', priority: 8, bloomPrereqs: ['Sentence Structure'] },
  { topic: 'Modifier Placement', description: 'Avoiding dangling and misplaced modifiers', priority: 9, bloomPrereqs: ['Sentence Structure'] },
  { topic: 'Transitions and Logical Flow', description: 'Connecting ideas smoothly', priority: 10, bloomPrereqs: ['Sentence Structure'] },
  { topic: 'Conciseness and Wordiness', description: 'Eliminating redundancy', priority: 11, bloomPrereqs: [] },
  { topic: 'Word Choice and Precision', description: 'Selecting the most effective words', priority: 12, bloomPrereqs: ['Conciseness and Wordiness'] },
  { topic: 'Sentence Combining', description: 'Merging sentences effectively', priority: 13, bloomPrereqs: ['Sentence Structure'] },
  { topic: 'Organization and Development', description: 'Logical ordering of ideas', priority: 14, bloomPrereqs: ['Transitions and Logical Flow'] },
  { topic: 'Effective Language Use', description: 'Style and tone consistency', priority: 15, bloomPrereqs: ['Word Choice and Precision'] },
];

const SUBJECT_TOPICS: Record<string, typeof ALL_MATH_TOPICS> = {
  Math: ALL_MATH_TOPICS,
  math: ALL_MATH_TOPICS,
  Reading: READING_TOPICS,
  reading: READING_TOPICS,
  Writing: WRITING_TOPICS,
  writing: WRITING_TOPICS,
};

// ============================================
// INTERFACES
// ============================================

export interface SmartTopicResult {
  topic: string;
  subject: string;
  reason: string;
  selectionType: 'spaced_repetition' | 'new_topic' | 'continuation' | 'struggling_support' | 'bloom_progression';
  focusAreas: string[];
  bloomLevel: number;
  estimatedDuration: number;
  masteryLevel: number;
  
  // Scoring breakdown for transparency
  scoring: {
    spacedRepetitionScore: number;
    bloomScore: number;
    flowScore: number;
    continuityScore: number;
    totalScore: number;
  };
  
  // Context for AI tutor
  aiContext: {
    isReturningStudent: boolean;
    daysAway: number;
    previousConceptsCovered: string[];
    conceptsNeedingWork: string[];
    recommendedApproach: string;
    difficultyAdjustment: 'easier' | 'standard' | 'challenging';
  };
}

interface TopicScore {
  topic: string;
  description: string;
  priority: number;
  bloomPrereqs: string[];
  spacedRepetitionScore: number;
  bloomScore: number;
  flowScore: number;
  continuityScore: number;
  totalScore: number;
  masteryLevel: number;
  bloomLevel: number;
  focusAreas: string[];
  selectionType: SmartTopicResult['selectionType'];
}

// ============================================
// WEIGHTS
// ============================================
const WEIGHTS = {
  spacedRepetition: 0.30,
  bloom: 0.25,
  flow: 0.25,
  continuity: 0.20,
};

// Bloom's Taxonomy levels
const BLOOM_LEVELS = {
  REMEMBER: 1,
  UNDERSTAND: 2,
  APPLY: 3,
  ANALYZE: 4,
  EVALUATE: 5,
  CREATE: 6,
};

export class IntelligentTopicSelectorService {
  /**
   * Select the optimal topic for a student
   */
  async selectTopic(userId: string, subject: string): Promise<SmartTopicResult> {
    console.log(`[IntelligentTopicSelector] Selecting topic for user ${userId}, subject ${subject}`);
    
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Gather all data in parallel
    const [
      performance,
      dueItems,
      weakAreas,
      recentSessions,
      user,
    ] = await Promise.all([
      performanceAggregatorService.aggregateStudentPerformance(userId, subject),
      performanceAggregatorService.getSpacedRepetitionDue(userId, subject, 20),
      performanceAggregatorService.getWeakAreas(userId, subject, 10),
      GuidedSession.find({
        userId: userObjectId,
        subject,
        isActive: false,
      }).sort({ endTime: -1 }).limit(10).lean(),
      User.findById(userId).lean(),
    ]);

    // Get all topics for this subject
    const allTopics = SUBJECT_TOPICS[subject] || SUBJECT_TOPICS['Math'];
    
    // Check if this is a new student (no practice history)
    const isNewStudent = performance.topicMasteries.length === 0 && recentSessions.length === 0;
    
    if (isNewStudent) {
      return this.selectForNewStudent(subject, allTopics);
    }
    
    // Score each topic
    const scoredTopics = this.scoreAllTopics(
      allTopics,
      performance.topicMasteries,
      dueItems,
      weakAreas,
      recentSessions
    );
    
    // Sort by total score and get the best
    scoredTopics.sort((a, b) => b.totalScore - a.totalScore);
    const selectedTopic = scoredTopics[0];
    
    // Build the result
    const result = this.buildResult(
      selectedTopic,
      subject,
      performance,
      recentSessions,
      user
    );
    
    console.log(`[IntelligentTopicSelector] Selected: ${result.topic} (${result.selectionType}), score: ${result.scoring.totalScore.toFixed(2)}`);
    
    return result;
  }

  /**
   * Select first topic for a new student
   */
  private selectForNewStudent(
    subject: string,
    allTopics: typeof ALL_MATH_TOPICS
  ): SmartTopicResult {
    // Get the first foundational topic (priority 1)
    const firstTopic = allTopics.find(t => t.priority === 1) || allTopics[0];
    
    return {
      topic: firstTopic.topic,
      subject,
      reason: `Welcome! Let's start with ${firstTopic.topic} - ${firstTopic.description}. This foundational topic will set you up for success.`,
      selectionType: 'new_topic',
      focusAreas: ['introduction', 'basic concepts', 'examples'],
      bloomLevel: BLOOM_LEVELS.REMEMBER,
      estimatedDuration: 15,
      masteryLevel: 0,
      scoring: {
        spacedRepetitionScore: 0,
        bloomScore: 100, // Start at beginning
        flowScore: 100, // Optimal for new student
        continuityScore: 100, // Fresh start
        totalScore: 100,
      },
      aiContext: {
        isReturningStudent: false,
        daysAway: 0,
        previousConceptsCovered: [],
        conceptsNeedingWork: [],
        recommendedApproach: 'Start with fundamental concepts using simple examples. Use the Feynman technique to explain clearly. Build confidence before introducing complexity.',
        difficultyAdjustment: 'easier',
      },
    };
  }

  /**
   * Score all topics based on the four factors
   */
  private scoreAllTopics(
    allTopics: typeof ALL_MATH_TOPICS,
    topicMasteries: TopicMastery[],
    dueItems: SpacedRepetitionItem[],
    weakAreas: WeakArea[],
    recentSessions: any[]
  ): TopicScore[] {
    const masteryMap = new Map(topicMasteries.map(tm => [tm.topic, tm]));
    const dueMap = new Map(dueItems.map(di => [di.topic, di]));
    const weakMap = new Map(weakAreas.map(wa => [wa.topic, wa]));
    
    // Get concepts from recent sessions for continuity
    const recentConcepts = new Set<string>();
    const conceptsNeedingWork = new Set<string>();
    recentSessions.slice(0, 3).forEach(session => {
      (session.outcomes?.conceptsCovered || []).forEach((c: string) => recentConcepts.add(c));
      (session.outcomes?.conceptsNeedingWork || []).forEach((c: string) => conceptsNeedingWork.add(c));
    });

    return allTopics.map(topicDef => {
      const mastery = masteryMap.get(topicDef.topic);
      const dueItem = dueMap.get(topicDef.topic);
      const weakArea = weakMap.get(topicDef.topic);
      
      // Calculate individual scores
      const spacedRepetitionScore = this.calculateSpacedRepetitionScore(dueItem, mastery);
      const bloomScore = this.calculateBloomScore(mastery, topicDef, masteryMap);
      const flowScore = this.calculateFlowScore(mastery, weakArea);
      const continuityScore = this.calculateContinuityScore(topicDef, recentConcepts, conceptsNeedingWork, mastery);
      
      // Calculate total weighted score
      const totalScore = 
        spacedRepetitionScore * WEIGHTS.spacedRepetition +
        bloomScore * WEIGHTS.bloom +
        flowScore * WEIGHTS.flow +
        continuityScore * WEIGHTS.continuity;
      
      // Determine selection type
      const selectionType = this.determineSelectionType(
        spacedRepetitionScore,
        bloomScore,
        flowScore,
        continuityScore,
        mastery,
        weakArea
      );
      
      // Determine focus areas
      const focusAreas = this.determineFocusAreas(mastery, weakArea, conceptsNeedingWork, topicDef.topic);
      
      return {
        topic: topicDef.topic,
        description: topicDef.description,
        priority: topicDef.priority,
        bloomPrereqs: topicDef.bloomPrereqs,
        spacedRepetitionScore,
        bloomScore,
        flowScore,
        continuityScore,
        totalScore,
        masteryLevel: mastery?.masteryLevel || 0,
        bloomLevel: mastery?.bloomLevel || BLOOM_LEVELS.REMEMBER,
        focusAreas,
        selectionType,
      };
    });
  }

  /**
   * Spaced Repetition Score (0-100)
   * Higher score for topics that are due for review
   */
  private calculateSpacedRepetitionScore(
    dueItem: SpacedRepetitionItem | undefined,
    mastery: TopicMastery | undefined
  ): number {
    if (!mastery || !mastery.lastPracticed) {
      // Never practiced - moderate priority for new topics
      return 40;
    }
    
    if (dueItem) {
      // Due for review - use urgency (0-1 scale, convert to 0-100)
      return Math.min(100, dueItem.urgency * 100 + 20);
    }
    
    // Not due yet - calculate based on days since practice
    const daysSince = mastery.daysSinceLastPractice;
    if (daysSince > 30) return 80; // Long time, needs review
    if (daysSince > 14) return 60; // Getting stale
    if (daysSince > 7) return 40; // Could use refresh
    return 20; // Recently practiced
  }

  /**
   * Bloom's Taxonomy Score (0-100)
   * Higher score for topics where student is ready for next cognitive level
   */
  private calculateBloomScore(
    mastery: TopicMastery | undefined,
    topicDef: typeof ALL_MATH_TOPICS[0],
    masteryMap: Map<string, TopicMastery>
  ): number {
    // Check if prerequisites are met
    const prereqsMet = topicDef.bloomPrereqs.every(prereq => {
      const prereqMastery = masteryMap.get(prereq);
      return prereqMastery && prereqMastery.masteryLevel >= 40;
    });
    
    if (!prereqsMet && topicDef.bloomPrereqs.length > 0) {
      // Prerequisites not met - low score for this topic
      return 20;
    }
    
    if (!mastery) {
      // New topic with prereqs met - good for Bloom progression
      return topicDef.priority <= 10 ? 80 : 60;
    }
    
    const currentBloom = mastery.bloomLevel || BLOOM_LEVELS.REMEMBER;
    const currentMastery = mastery.masteryLevel;
    
    // If mastery is high but Bloom level is low, student is ready to advance
    if (currentMastery >= 70 && currentBloom < BLOOM_LEVELS.APPLY) {
      return 90; // Ready for higher-order thinking
    }
    
    // If mastery is moderate, still room to grow at current level
    if (currentMastery >= 40 && currentMastery < 70) {
      return 70;
    }
    
    // Low mastery - focus on remembering/understanding
    return 50;
  }

  /**
   * Flow State Score (0-100)
   * Optimal when challenge matches skill level (not too easy, not too hard)
   */
  private calculateFlowScore(
    mastery: TopicMastery | undefined,
    weakArea: WeakArea | undefined
  ): number {
    if (!mastery) {
      // New topic - assume moderate flow potential
      return 60;
    }
    
    const masteryLevel = mastery.masteryLevel;
    const accuracyRate = mastery.accuracyRate;
    
    // Flow is optimal when mastery is around 60-80% (zone of proximal development)
    if (masteryLevel >= 50 && masteryLevel <= 80) {
      // In the zone - high flow potential
      return 90;
    }
    
    // If weak area with low accuracy, need support not challenge
    if (weakArea && accuracyRate < 0.4) {
      return 70; // Still good to work on, but needs scaffolding
    }
    
    // High mastery - might be too easy (low flow)
    if (masteryLevel > 85) {
      return 40;
    }
    
    // Low mastery - might be frustrating (moderate flow with support)
    if (masteryLevel < 30) {
      return 60;
    }
    
    return 70;
  }

  /**
   * Learning Continuity Score (0-100)
   * Higher for topics that continue recent learning or need reinforcement
   */
  private calculateContinuityScore(
    topicDef: typeof ALL_MATH_TOPICS[0],
    recentConcepts: Set<string>,
    conceptsNeedingWork: Set<string>,
    mastery: TopicMastery | undefined
  ): number {
    let score = 50; // Base score
    
    // Boost if related to recent concepts (continue the thread)
    if (recentConcepts.has(topicDef.topic)) {
      score += 25;
    }
    
    // Boost if there are concepts needing work in this topic
    if (conceptsNeedingWork.has(topicDef.topic)) {
      score += 30;
    }
    
    // Boost foundational topics for new areas
    if (!mastery && topicDef.priority <= 6) {
      score += 15;
    }
    
    // Consider topic sequencing (lower priority topics should come first)
    if (topicDef.priority <= 10) {
      score += 10;
    }
    
    return Math.min(100, score);
  }

  /**
   * Determine the primary reason for topic selection
   */
  private determineSelectionType(
    srScore: number,
    bloomScore: number,
    flowScore: number,
    continuityScore: number,
    mastery: TopicMastery | undefined,
    weakArea: WeakArea | undefined
  ): SmartTopicResult['selectionType'] {
    if (weakArea && weakArea.priority >= 7) {
      return 'struggling_support';
    }
    
    if (srScore >= 80) {
      return 'spaced_repetition';
    }
    
    if (continuityScore >= 80) {
      return 'continuation';
    }
    
    if (bloomScore >= 85 && mastery && mastery.masteryLevel >= 70) {
      return 'bloom_progression';
    }
    
    return 'new_topic';
  }

  /**
   * Determine specific areas to focus on within the topic
   */
  private determineFocusAreas(
    mastery: TopicMastery | undefined,
    weakArea: WeakArea | undefined,
    conceptsNeedingWork: Set<string>,
    topic: string
  ): string[] {
    const focusAreas: string[] = [];
    
    if (!mastery) {
      focusAreas.push('introduction', 'basic concepts', 'examples');
    } else if (weakArea) {
      focusAreas.push(...weakArea.errorPatterns.slice(0, 3));
      if (focusAreas.length === 0) {
        focusAreas.push('reinforcement', 'practice problems');
      }
    } else if (mastery.masteryLevel >= 70) {
      focusAreas.push('advanced applications', 'problem-solving strategies', 'connections to other topics');
    } else {
      focusAreas.push('understanding', 'guided practice', 'common mistakes');
    }
    
    // Add any specific concepts needing work
    conceptsNeedingWork.forEach(concept => {
      if (concept.toLowerCase().includes(topic.toLowerCase()) && focusAreas.length < 5) {
        focusAreas.push(concept);
      }
    });
    
    return focusAreas.slice(0, 5);
  }

  /**
   * Build the final result object
   */
  private buildResult(
    selectedTopic: TopicScore,
    subject: string,
    performance: any,
    recentSessions: any[],
    user: any
  ): SmartTopicResult {
    // Calculate days away
    const lastSession = recentSessions[0];
    const daysAway = lastSession?.endTime 
      ? Math.floor((Date.now() - new Date(lastSession.endTime).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    // Get previous concepts for this topic
    const previousConceptsCovered: string[] = [];
    const conceptsNeedingWork: string[] = [];
    
    recentSessions
      .filter(s => s.topic === selectedTopic.topic)
      .forEach(s => {
        (s.outcomes?.conceptsCovered || []).forEach((c: string) => {
          if (!previousConceptsCovered.includes(c)) previousConceptsCovered.push(c);
        });
        (s.outcomes?.conceptsNeedingWork || []).forEach((c: string) => {
          if (!conceptsNeedingWork.includes(c)) conceptsNeedingWork.push(c);
        });
      });
    
    // Determine recommended approach based on selection type and student profile
    const recommendedApproach = this.determineApproach(
      selectedTopic,
      daysAway,
      previousConceptsCovered.length,
      conceptsNeedingWork.length,
      user
    );
    
    // Determine difficulty adjustment
    const difficultyAdjustment = this.determineDifficultyAdjustment(
      selectedTopic.masteryLevel,
      selectedTopic.selectionType,
      performance.recentEngagement
    );
    
    // Build reason message
    const reason = this.buildReasonMessage(selectedTopic, daysAway, previousConceptsCovered.length > 0);
    
    return {
      topic: selectedTopic.topic,
      subject,
      reason,
      selectionType: selectedTopic.selectionType,
      focusAreas: selectedTopic.focusAreas,
      bloomLevel: selectedTopic.bloomLevel,
      estimatedDuration: this.estimateDuration(selectedTopic),
      masteryLevel: selectedTopic.masteryLevel,
      scoring: {
        spacedRepetitionScore: selectedTopic.spacedRepetitionScore,
        bloomScore: selectedTopic.bloomScore,
        flowScore: selectedTopic.flowScore,
        continuityScore: selectedTopic.continuityScore,
        totalScore: selectedTopic.totalScore,
      },
      aiContext: {
        isReturningStudent: previousConceptsCovered.length > 0 || selectedTopic.masteryLevel > 0,
        daysAway,
        previousConceptsCovered: previousConceptsCovered.slice(0, 10),
        conceptsNeedingWork: conceptsNeedingWork.slice(0, 5),
        recommendedApproach,
        difficultyAdjustment,
      },
    };
  }

  /**
   * Determine the recommended teaching approach
   */
  private determineApproach(
    topic: TopicScore,
    daysAway: number,
    hasPreviousConcepts: number,
    needsWorkCount: number,
    user: any
  ): string {
    const approaches: string[] = [];
    
    // Base on selection type
    switch (topic.selectionType) {
      case 'spaced_repetition':
        approaches.push(`Start with a quick review to refresh ${topic.topic} concepts.`);
        if (daysAway > 7) {
          approaches.push('Use retrieval practice before re-teaching.');
        }
        break;
      case 'struggling_support':
        approaches.push('Use the Feynman technique: explain simply with analogies.');
        approaches.push('Break down into smaller steps, celebrate small wins.');
        break;
      case 'continuation':
        approaches.push(`Continue from previous session, building on ${hasPreviousConcepts} concepts covered.`);
        if (needsWorkCount > 0) {
          approaches.push(`Address ${needsWorkCount} concepts that need reinforcement.`);
        }
        break;
      case 'bloom_progression':
        approaches.push('Student is ready for higher-order thinking.');
        approaches.push('Focus on application, analysis, and problem-solving.');
        break;
      default:
        approaches.push('Introduce the topic with clear explanations and examples.');
        approaches.push('Build understanding before moving to practice.');
    }
    
    // Add learning style considerations
    const learningStyle = user?.learningProfile?.communicationProfile?.learningStyle;
    if (learningStyle === 'visual') {
      approaches.push('Include graphs and visual representations.');
    } else if (learningStyle === 'procedural') {
      approaches.push('Provide step-by-step procedures and worked examples.');
    }
    
    return approaches.join(' ');
  }

  /**
   * Determine difficulty adjustment
   */
  private determineDifficultyAdjustment(
    masteryLevel: number,
    selectionType: string,
    engagement: number
  ): 'easier' | 'standard' | 'challenging' {
    if (selectionType === 'struggling_support' || masteryLevel < 30) {
      return 'easier';
    }
    
    if (masteryLevel >= 70 && engagement >= 60) {
      return 'challenging';
    }
    
    return 'standard';
  }

  /**
   * Build a human-readable reason for topic selection
   */
  private buildReasonMessage(
    topic: TopicScore,
    daysAway: number,
    hasHistory: boolean
  ): string {
    switch (topic.selectionType) {
      case 'spaced_repetition':
        return `It's time to review ${topic.topic}. Spaced repetition helps lock in your learning for the long term.`;
      case 'struggling_support':
        return `Let's work on ${topic.topic} together. We'll take it step by step to build your confidence.`;
      case 'continuation':
        if (daysAway > 0) {
          return `Welcome back! Let's continue where we left off with ${topic.topic}.`;
        }
        return `Great progress! Let's keep building on ${topic.topic}.`;
      case 'bloom_progression':
        return `You've shown great understanding of ${topic.topic}. Let's take it to the next level with more challenging applications.`;
      default:
        if (hasHistory) {
          return `Based on your progress, ${topic.topic} is the perfect next step in your learning journey.`;
        }
        return `Let's begin with ${topic.topic} - ${topic.description}.`;
    }
  }

  /**
   * Estimate session duration based on topic complexity and student level
   */
  private estimateDuration(topic: TopicScore): number {
    let baseDuration = 15; // minutes
    
    // Adjust based on mastery
    if (topic.masteryLevel === 0) {
      baseDuration = 20; // New topic takes longer
    } else if (topic.masteryLevel >= 70) {
      baseDuration = 12; // Quick review
    }
    
    // Adjust based on selection type
    if (topic.selectionType === 'struggling_support') {
      baseDuration += 5; // Extra time for support
    }
    
    return baseDuration;
  }

  /**
   * Get all topics for a subject (for optional override dropdown)
   */
  async getAllTopics(subject: string): Promise<Array<{ topic: string; description: string; masteryLevel: number }>> {
    const allTopics = SUBJECT_TOPICS[subject] || SUBJECT_TOPICS['Math'];
    
    return allTopics.map(t => ({
      topic: t.topic,
      description: t.description,
      masteryLevel: 0, // Will be populated by frontend if needed
    }));
  }
}

export const intelligentTopicSelectorService = new IntelligentTopicSelectorService();

