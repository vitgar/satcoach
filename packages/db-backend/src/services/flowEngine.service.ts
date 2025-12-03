/**
 * Flow Engine Service
 * 
 * Monitors and maintains optimal challenge-skill balance based on Flow Theory.
 * 
 * Flow Theory (Csikszentmihalyi):
 * - Boredom: Challenge < Skill (too easy)
 * - Flow Zone: Challenge ≈ Skill (optimal engagement)
 * - Anxiety: Challenge > Skill (too hard)
 */

export type FlowZone = 'boredom' | 'flow' | 'anxiety';

export interface FlowState {
  flowZone: FlowZone;
  flowScore: number; // 0-100
  challenge: number; // 1-10
  skill: number; // 1-10
  recommendedAction: string;
}

export interface PerformanceMetrics {
  isCorrect: boolean;
  timeSpent: number;
  averageTime: number;
  hintsUsed: number;
  retries: number;
  pauses: number;
  recentAccuracy: number; // 0-1
}

export interface DifficultyAdjustment {
  newDifficulty: number; // 1-10
  adjustmentReason: string;
  flowTarget: 'flow' | 'slight_challenge';
  shouldProvideHint: boolean;
}

export interface BreakRecommendation {
  shouldBreak: boolean;
  breakDuration: number; // minutes
  suggestedActivity: string;
  reason: string;
}

export class FlowEngineService {
  /**
   * Calculate current flow state based on challenge vs skill
   */
  calculateFlowState(
    challenge: number, // 1-10
    skill: number // 1-10
  ): FlowState {
    const distance = Math.abs(challenge - skill);
    
    let flowZone: FlowZone;
    let flowScore: number;
    let recommendedAction: string;

    // Flow zone determination
    if (distance <= 1 && challenge >= 3 && skill >= 3) {
      // In flow: challenge and skill are closely matched
      flowZone = 'flow';
      flowScore = 100 - (distance * 10);
      recommendedAction = 'Maintain current level - optimal engagement';
    } else if (challenge < skill - 1) {
      // Boredom: too easy
      flowZone = 'boredom';
      flowScore = Math.max(0, 50 - (skill - challenge) * 10);
      recommendedAction = 'Increase challenge to maintain engagement';
    } else {
      // Anxiety: too hard
      flowZone = 'anxiety';
      flowScore = Math.max(0, 50 - (challenge - skill) * 10);
      recommendedAction = 'Reduce challenge or provide support';
    }

    return {
      flowZone,
      flowScore,
      challenge,
      skill,
      recommendedAction,
    };
  }

  /**
   * Detect flow state from behavioral metrics
   */
  detectFlowFromBehavior(
    metrics: PerformanceMetrics
  ): { flowZone: FlowZone; confidence: number } {
    const { isCorrect, timeSpent, averageTime, hintsUsed, retries, pauses, recentAccuracy } = metrics;

    let boredomSignals = 0;
    let anxietySignals = 0;
    let flowSignals = 0;

    // Time analysis
    if (averageTime > 0) {
      const timeRatio = timeSpent / averageTime;
      if (timeRatio < 0.5) {
        boredomSignals += 2; // Very fast = might be too easy
      } else if (timeRatio > 2) {
        anxietySignals += 2; // Very slow = struggling
      } else {
        flowSignals += 1;
      }
    }

    // Correctness
    if (isCorrect) {
      flowSignals += 1;
    } else {
      anxietySignals += 1;
    }

    // Hints and retries
    if (hintsUsed === 0 && retries === 0) {
      flowSignals += 1;
    } else if (hintsUsed > 3 || retries > 2) {
      anxietySignals += 2;
    }

    // Pauses
    if (pauses > 3) {
      anxietySignals += 1; // Many pauses might indicate frustration
    }

    // Recent accuracy
    if (recentAccuracy > 0.9) {
      boredomSignals += 1; // Might be too easy
    } else if (recentAccuracy < 0.4) {
      anxietySignals += 1; // Might be too hard
    }

    // Determine flow zone
    const totalSignals = boredomSignals + anxietySignals + flowSignals;
    let flowZone: FlowZone;
    let confidence: number;

    if (boredomSignals > anxietySignals && boredomSignals > flowSignals) {
      flowZone = 'boredom';
      confidence = boredomSignals / totalSignals;
    } else if (anxietySignals > boredomSignals && anxietySignals > flowSignals) {
      flowZone = 'anxiety';
      confidence = anxietySignals / totalSignals;
    } else {
      flowZone = 'flow';
      confidence = flowSignals / totalSignals;
    }

    return { flowZone, confidence };
  }

  /**
   * Adjust difficulty to maintain flow
   */
  adjustForFlow(
    currentDifficulty: number,
    currentSkill: number,
    recentPerformance: PerformanceMetrics
  ): DifficultyAdjustment {
    const detectedFlow = this.detectFlowFromBehavior(recentPerformance);
    const flowState = this.calculateFlowState(currentDifficulty, currentSkill);

    let newDifficulty = currentDifficulty;
    let adjustmentReason = '';
    let flowTarget: 'flow' | 'slight_challenge' = 'flow';
    let shouldProvideHint = false;

    switch (detectedFlow.flowZone) {
      case 'boredom':
        // Increase difficulty
        newDifficulty = Math.min(10, currentDifficulty + 1);
        adjustmentReason = 'Performance indicates material is too easy - increasing challenge';
        flowTarget = 'slight_challenge';
        break;

      case 'anxiety':
        // Decrease difficulty and consider hints
        newDifficulty = Math.max(1, currentDifficulty - 1);
        adjustmentReason = 'Performance indicates material is too difficult - reducing challenge';
        shouldProvideHint = true;
        break;

      case 'flow':
        // Maintain or slightly increase for growth
        if (recentPerformance.isCorrect && recentPerformance.hintsUsed === 0) {
          // Good performance, slight increase for growth
          newDifficulty = Math.min(10, currentDifficulty + 0.5);
          adjustmentReason = 'Maintaining flow with slight progression';
          flowTarget = 'slight_challenge';
        } else {
          adjustmentReason = 'Optimal challenge-skill balance - maintaining level';
        }
        break;
    }

    // Ensure we don't go below skill level too much
    if (newDifficulty < currentSkill - 2) {
      newDifficulty = currentSkill - 1;
      adjustmentReason = 'Adjusted to stay within learning zone';
    }

    return {
      newDifficulty: Math.round(newDifficulty),
      adjustmentReason,
      flowTarget,
      shouldProvideHint,
    };
  }

  /**
   * Suggest micro-break if in anxiety zone
   */
  shouldSuggestBreak(
    timeInAnxiety: number, // minutes
    consecutiveFailures: number,
    recentFlowScores: number[] // Last few flow scores
  ): BreakRecommendation {
    // Calculate average recent flow score
    const avgFlowScore = recentFlowScores.length > 0
      ? recentFlowScores.reduce((a, b) => a + b, 0) / recentFlowScores.length
      : 50;

    // Break triggers
    const shouldBreak =
      timeInAnxiety > 10 || // More than 10 minutes in anxiety
      consecutiveFailures >= 3 || // 3 or more failures in a row
      avgFlowScore < 30; // Consistently low flow score

    if (!shouldBreak) {
      return {
        shouldBreak: false,
        breakDuration: 0,
        suggestedActivity: '',
        reason: '',
      };
    }

    // Determine break duration
    let breakDuration = 5; // Default 5 minutes
    if (timeInAnxiety > 15 || consecutiveFailures >= 5) {
      breakDuration = 10;
    }

    // Suggest activity
    const activities = [
      'Take a short walk',
      'Do some stretches',
      'Get a drink of water',
      'Take 5 deep breaths',
      'Look at something far away to rest your eyes',
    ];
    const suggestedActivity = activities[Math.floor(Math.random() * activities.length)];

    return {
      shouldBreak: true,
      breakDuration,
      suggestedActivity,
      reason:
        consecutiveFailures >= 3
          ? 'Multiple incorrect answers - a break might help you reset'
          : 'You\'ve been working hard - a short break can boost your focus',
    };
  }

  /**
   * Calculate session flow score
   */
  calculateSessionFlowScore(
    flowStates: { flowZone: FlowZone; timestamp: Date }[],
    duration: number // minutes
  ): number {
    if (flowStates.length === 0 || duration <= 0) {
      return 50; // Neutral score if no data
    }

    let flowTime = 0;
    let boredomTime = 0;
    let anxietyTime = 0;

    for (let i = 0; i < flowStates.length; i++) {
      const state = flowStates[i];
      const nextTimestamp = flowStates[i + 1]?.timestamp || new Date();
      const stateDuration = (nextTimestamp.getTime() - state.timestamp.getTime()) / (1000 * 60);

      switch (state.flowZone) {
        case 'flow':
          flowTime += stateDuration;
          break;
        case 'boredom':
          boredomTime += stateDuration;
          break;
        case 'anxiety':
          anxietyTime += stateDuration;
          break;
      }
    }

    // Calculate score: flow is best, boredom is okay, anxiety is worst
    const totalTime = flowTime + boredomTime + anxietyTime;
    if (totalTime === 0) return 50;

    const flowScore =
      (flowTime * 100 + boredomTime * 50 + anxietyTime * 20) / totalTime;

    return Math.round(flowScore);
  }

  /**
   * Estimate student skill level from performance
   */
  estimateSkillLevel(
    masteryLevel: number, // 0-100
    accuracyRate: number, // 0-1
    bloomLevel: number // 1-6
  ): number {
    // Convert to 1-10 scale
    const masteryContribution = (masteryLevel / 100) * 4; // 0-4
    const accuracyContribution = accuracyRate * 3; // 0-3
    const bloomContribution = (bloomLevel / 6) * 3; // 0-3

    const skill = masteryContribution + accuracyContribution + bloomContribution;
    return Math.max(1, Math.min(10, Math.round(skill)));
  }
}

export const flowEngineService = new FlowEngineService();

