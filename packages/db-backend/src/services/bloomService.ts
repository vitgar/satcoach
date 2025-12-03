/**
 * Bloom Taxonomy Service
 * 
 * Manages Bloom's Taxonomy progression:
 * 1 = Remember - Recall facts, definitions
 * 2 = Understand - Explain concepts, interpret
 * 3 = Apply - Use in new situations, solve problems
 * 4 = Analyze - Break down, compare, contrast
 * 5 = Evaluate - Judge, critique, justify
 * 6 = Create - Design, construct, produce
 */

import mongoose from 'mongoose';
import { Question } from '../models/Question.model';
import { Concept } from '../models/Concept.model';

export const BLOOM_LEVELS = {
  REMEMBER: 1,
  UNDERSTAND: 2,
  APPLY: 3,
  ANALYZE: 4,
  EVALUATE: 5,
  CREATE: 6,
} as const;

export const BLOOM_LEVEL_NAMES: Record<number, string> = {
  1: 'remember',
  2: 'understand',
  3: 'apply',
  4: 'analyze',
  5: 'evaluate',
  6: 'create',
};

export const BLOOM_LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: 'Recall facts and basic concepts',
  2: 'Explain ideas and concepts',
  3: 'Use information in new situations',
  4: 'Draw connections and analyze relationships',
  5: 'Justify decisions and evaluate approaches',
  6: 'Create new solutions and produce original work',
};

export interface BloomProgress {
  remember: { attempts: number; mastery: number; lastAttempt: Date | null };
  understand: { attempts: number; mastery: number; lastAttempt: Date | null };
  apply: { attempts: number; mastery: number; lastAttempt: Date | null };
  analyze: { attempts: number; mastery: number; lastAttempt: Date | null };
  evaluate: { attempts: number; mastery: number; lastAttempt: Date | null };
  create: { attempts: number; mastery: number; lastAttempt: Date | null };
  currentLevel: number;
  nextTargetLevel: number;
}

export interface BloomLevelResult {
  nextLevel: number;
  requiredMastery: number;
  currentMastery: number;
  isReady: boolean;
}

export interface ScaffoldStep {
  level: number;
  levelName: string;
  description: string;
  activities: string[];
  questionTypes: string[];
}

export class BloomService {
  private readonly MASTERY_THRESHOLD = 80; // 80% mastery required to advance

  /**
   * Get the next Bloom level to target
   */
  getNextBloomLevel(
    currentProgress: BloomProgress,
    conceptMastery: number = 0
  ): BloomLevelResult {
    const currentLevel = currentProgress.currentLevel || 0;
    
    // If no progress, start at Remember (Level 1)
    if (currentLevel === 0) {
      return {
        nextLevel: 1,
        requiredMastery: this.MASTERY_THRESHOLD,
        currentMastery: 0,
        isReady: true,
      };
    }

    // Check if current level is mastered
    const levelName = BLOOM_LEVEL_NAMES[currentLevel] as keyof BloomProgress;
    const levelProgress = currentProgress[levelName];
    
    if (typeof levelProgress === 'object' && 'mastery' in levelProgress) {
      if (levelProgress.mastery >= this.MASTERY_THRESHOLD) {
        // Ready for next level
        const nextLevel = Math.min(6, currentLevel + 1);
        return {
          nextLevel,
          requiredMastery: this.MASTERY_THRESHOLD,
          currentMastery: 0,
          isReady: true,
        };
      } else {
        // Still working on current level
        return {
          nextLevel: currentLevel,
          requiredMastery: this.MASTERY_THRESHOLD,
          currentMastery: levelProgress.mastery,
          isReady: false,
        };
      }
    }

    // Default: target next level
    return {
      nextLevel: currentProgress.nextTargetLevel || 1,
      requiredMastery: this.MASTERY_THRESHOLD,
      currentMastery: conceptMastery,
      isReady: true,
    };
  }

  /**
   * Check if learner has mastered a Bloom level
   */
  hasMasteredBloomLevel(
    progress: BloomProgress,
    level: number,
    threshold: number = this.MASTERY_THRESHOLD
  ): boolean {
    const levelName = BLOOM_LEVEL_NAMES[level] as keyof BloomProgress;
    if (!levelName) return false;

    const levelProgress = progress[levelName];
    if (typeof levelProgress === 'object' && 'mastery' in levelProgress) {
      return levelProgress.mastery >= threshold;
    }
    return false;
  }

  /**
   * Determine Bloom level based on question characteristics
   * This auto-tags questions if not already tagged
   */
  determineBloomLevel(
    questionText: string,
    explanation: string,
    difficulty: string
  ): number {
    const text = (questionText + ' ' + explanation).toLowerCase();

    // Keywords for each level (simplified heuristics)
    const levelKeywords: Record<number, string[]> = {
      1: ['define', 'list', 'identify', 'recall', 'name', 'state', 'which of the following'],
      2: ['explain', 'describe', 'summarize', 'interpret', 'classify', 'compare'],
      3: ['solve', 'calculate', 'apply', 'use', 'demonstrate', 'find the value'],
      4: ['analyze', 'distinguish', 'examine', 'break down', 'compare and contrast'],
      5: ['evaluate', 'judge', 'justify', 'critique', 'assess', 'which method is best'],
      6: ['create', 'design', 'develop', 'formulate', 'construct', 'propose'],
    };

    // Count keyword matches for each level
    const scores: Record<number, number> = {};
    for (const [level, keywords] of Object.entries(levelKeywords)) {
      scores[Number(level)] = keywords.filter(kw => text.includes(kw)).length;
    }

    // Find highest scoring level
    let maxLevel = 3; // Default to Apply
    let maxScore = 0;
    for (const [level, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxLevel = Number(level);
      }
    }

    // Adjust based on difficulty if no clear winner
    if (maxScore === 0) {
      switch (difficulty) {
        case 'easy':
          return 1; // Remember
        case 'medium':
          return 3; // Apply
        case 'hard':
          return 4; // Analyze
        default:
          return 3;
      }
    }

    return maxLevel;
  }

  /**
   * Get questions at a specific Bloom level
   */
  async getQuestionsForBloomLevel(
    conceptId: mongoose.Types.ObjectId | null,
    bloomLevel: number,
    subject?: string,
    difficulty?: string,
    limit: number = 5
  ): Promise<any[]> {
    const query: any = {
      'bloomLevel.primary': bloomLevel,
    };

    if (conceptId) {
      query.conceptId = conceptId;
    }
    if (subject) {
      query.subject = subject;
    }
    if (difficulty) {
      query.difficulty = difficulty;
    }

    return Question.find(query)
      .limit(limit)
      .sort({ 'metadata.timesUsed': 1 }) // Prefer less-used questions
      .exec();
  }

  /**
   * Scaffold learning through Bloom levels
   */
  scaffoldBloomProgression(
    currentLevel: number,
    targetLevel: number
  ): ScaffoldStep[] {
    const steps: ScaffoldStep[] = [];

    for (let level = currentLevel; level <= targetLevel; level++) {
      const levelName = BLOOM_LEVEL_NAMES[level] || 'unknown';
      const description = BLOOM_LEVEL_DESCRIPTIONS[level] || '';

      let activities: string[] = [];
      let questionTypes: string[] = [];

      switch (level) {
        case 1: // Remember
          activities = [
            'Review key definitions',
            'Identify correct formulas',
            'Match terms to definitions',
          ];
          questionTypes = ['Multiple choice identification', 'True/false', 'Matching'];
          break;
        case 2: // Understand
          activities = [
            'Explain concept in own words',
            'Interpret examples',
            'Classify problem types',
          ];
          questionTypes = ['Explain this concept', 'What does this mean?', 'Classify'];
          break;
        case 3: // Apply
          activities = [
            'Solve practice problems',
            'Apply formulas to new situations',
            'Use strategies to find answers',
          ];
          questionTypes = ['Solve for x', 'Calculate', 'Find the value'];
          break;
        case 4: // Analyze
          activities = [
            'Compare different approaches',
            'Identify patterns and relationships',
            'Break down complex problems',
          ];
          questionTypes = ['Compare methods', 'Identify the pattern', 'What is the relationship?'];
          break;
        case 5: // Evaluate
          activities = [
            'Critique solution methods',
            'Judge which approach is best',
            'Justify your reasoning',
          ];
          questionTypes = ['Which is most efficient?', 'Evaluate this approach', 'Justify'];
          break;
        case 6: // Create
          activities = [
            'Create your own problems',
            'Design new solutions',
            'Develop original approaches',
          ];
          questionTypes = ['Create a problem', 'Design a solution', 'Develop'];
          break;
      }

      steps.push({
        level,
        levelName,
        description,
        activities,
        questionTypes,
      });
    }

    return steps;
  }

  /**
   * Update Bloom mastery based on quality score
   */
  calculateBloomMastery(
    currentMastery: number,
    attempts: number,
    quality: number // 0-5
  ): number {
    // Convert quality to percentage
    const qualityPercent = (quality / 5) * 100;

    // Weighted average: recent attempts matter more
    const weight = Math.min(attempts, 10) / 10;
    const newMastery = (currentMastery * (1 - weight)) + (qualityPercent * weight);

    return Math.round(newMastery);
  }

  /**
   * Get Bloom level description for display
   */
  getBloomLevelInfo(level: number): { name: string; description: string } {
    return {
      name: BLOOM_LEVEL_NAMES[level] || 'unknown',
      description: BLOOM_LEVEL_DESCRIPTIONS[level] || '',
    };
  }
}

export const bloomService = new BloomService();

