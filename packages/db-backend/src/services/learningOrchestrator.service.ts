/**
 * Learning Orchestrator Service
 * 
 * The main service that coordinates all learning system components:
 * - Flow Engine for optimal challenge
 * - Bloom Service for progression
 * - Feynman Evaluator for explanations
 * - Spaced Repetition for scheduling
 * - Confidence Calculator for automatic assessment
 * - Question Selector for smart selection
 * - Learner Model for personalization
 */

import mongoose from 'mongoose';
import { StudentProgress } from '../models/StudentProgress.model';
import { LearningSession, FlowZone } from '../models/LearningSession.model';
import { Question, Subject } from '../models/Question.model';
import { flowEngineService } from './flowEngine.service';
import { bloomService } from './bloomService';
import { feynmanEvaluatorService } from './feynmanEvaluator.service';
import { enhancedSpacedRepetitionService } from './enhancedSpacedRepetition.service';
import { confidenceCalculatorService, StudentType } from './confidenceCalculator.service';
import { questionSelectorService } from './questionSelector.service';
import { learnerModelService } from './learnerModel.service';

export interface LearnerState {
  userId: string;
  studentType: StudentType;
  currentLevel: number;
  flowZone: FlowZone;
  flowScore: number;
  recommendedDifficulty: 'easy' | 'medium' | 'hard';
  recommendedBloomLevel: number;
  topicsDueForReview: number;
  sessionActive: boolean;
}

export interface AttemptResult {
  isCorrect: boolean;
  calculatedConfidence: number;
  qualityScore: number;
  flowState: { flowZone: FlowZone; flowScore: number };
  nextReviewDate: Date;
  masteryLevel: number;
  bloomProgress: {
    currentLevel: number;
    nextTargetLevel: number;
    levelMastery: number;
  };
  feedback: string;
  shouldAdjustDifficulty: boolean;
  adjustmentReason: string;
}

export interface SessionSummary {
  duration: number;
  questionsAttempted: number;
  questionsCorrect: number;
  averageFlowScore: number;
  bloomLevelsProgressed: number;
  topicsReviewed: string[];
  recommendations: string[];
}

export class LearningOrchestratorService {
  /**
   * Get current learner state for starting a session
   */
  async getLearnerState(userId: string): Promise<LearnerState> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Get learner profile
    const profile = await learnerModelService.buildLearnerProfile(userId);
    
    // Check for active session
    const activeSession = await LearningSession.findOne({
      userId: userObjectId,
      endTime: null,
    });

    // Get topics due for review
    const now = new Date();
    const dueCount = await StudentProgress.countDocuments({
      userId: userObjectId,
      'performance.nextReviewDate': { $lte: now },
    });

    // Predict flow state
    const flowPrediction = learnerModelService.predictFlowState(
      profile.studentType,
      profile.currentLevel,
      profile.currentLevel // Default challenge = current level
    );

    // Map skill level to difficulty
    let recommendedDifficulty: 'easy' | 'medium' | 'hard' = 'medium';
    if (profile.currentLevel <= 3) {
      recommendedDifficulty = 'easy';
    } else if (profile.currentLevel >= 8) {
      recommendedDifficulty = 'hard';
    }

    // Determine recommended Bloom level
    let recommendedBloomLevel = profile.learningPreferences?.preferredBloomLevel || 3;
    if (profile.studentType === 'struggler') {
      recommendedBloomLevel = Math.min(2, recommendedBloomLevel);
    } else if (profile.studentType === 'advanced') {
      recommendedBloomLevel = Math.min(6, recommendedBloomLevel + 1);
    }

    return {
      userId,
      studentType: profile.studentType,
      currentLevel: profile.currentLevel,
      flowZone: flowPrediction.predictedZone,
      flowScore: Math.round(flowPrediction.confidence * 100),
      recommendedDifficulty,
      recommendedBloomLevel,
      topicsDueForReview: dueCount,
      sessionActive: !!activeSession,
    };
  }

  /**
   * Start a new learning session
   */
  async startSession(
    userId: string,
    sessionType: 'study' | 'review' | 'practice' | 'explanation' = 'study'
  ): Promise<{ sessionId: string; initialState: LearnerState }> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // End any existing active session
    await LearningSession.updateMany(
      { userId: userObjectId, endTime: null },
      { $set: { endTime: new Date() } }
    );

    // Create new session
    const session = new LearningSession({
      userId: userObjectId,
      sessionType,
      startTime: new Date(),
      subjects: [],
      conceptsCovered: [],
      questionsAttempted: [],
      flowStates: [],
      currentFlowZone: 'flow',
      engagement: {
        pauses: 0,
        averagePauseDuration: 0,
        totalPauseTime: 0,
        retries: 0,
        skips: 0,
        focusScore: 100,
      },
      outcomes: {
        conceptsMastered: 0,
        bloomLevelsProgressed: 0,
        explanationsGiven: 0,
        averageFeynmanQuality: 0,
        flowTime: 0,
        flowPercentage: 0,
        questionsCorrect: 0,
        questionsAttempted: 0,
      },
      adaptations: [],
    });

    await session.save();

    const initialState = await this.getLearnerState(userId);

    return {
      sessionId: (session._id as mongoose.Types.ObjectId).toString(),
      initialState,
    };
  }

  /**
   * Get next question for the learner
   */
  async getNextQuestion(
    userId: string,
    subject?: Subject,
    topic?: string,
    forReview: boolean = false
  ): Promise<{
    question: any;
    selectionReason: string;
    recommendedBloomLevel: number;
    expectedTime: number;
  } | null> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Get learner state
    const state = await this.getLearnerState(userId);

    // Select question
    const selection = await questionSelectorService.getNextQuestionForUser({
      userId: userObjectId,
      subject,
      topic,
      bloomLevel: state.recommendedBloomLevel,
      difficulty: state.recommendedDifficulty,
      forReview,
    });

    if (!selection) {
      return null;
    }

    // Record that question was shown
    await questionSelectorService.recordQuestionShown(
      userObjectId,
      selection.question._id,
      selection.recommendedBloomLevel
    );

    return {
      question: selection.question,
      selectionReason: selection.selectionReason,
      recommendedBloomLevel: selection.recommendedBloomLevel,
      expectedTime: selection.question.flowMetrics?.expectedTime || 90,
    };
  }

  /**
   * Process a question attempt with full learning system integration
   */
  async processAttempt(
    userId: string,
    questionId: string,
    attemptData: {
      isCorrect: boolean;
      userAnswer: string;
      timeSpent: number;
      hintsUsed: number;
      chatInteractions: number;
    }
  ): Promise<AttemptResult> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const questionObjectId = new mongoose.Types.ObjectId(questionId);

    // Get question details
    const question = await Question.findById(questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    const subject = question.subject;
    const topic = question.tags[0] || question.subject;
    const bloomLevel = question.bloomLevel?.primary || 3;
    const expectedTime = question.flowMetrics?.expectedTime || 90;
    const difficulty = question.difficultyScore || 5;

    // Get or create student progress
    let progress = await StudentProgress.findOne({
      userId: userObjectId,
      subject,
      topic,
    });

    if (!progress) {
      progress = new StudentProgress({
        userId: userObjectId,
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

    // Get learner profile for student type
    const profile = await learnerModelService.buildLearnerProfile(userId);

    // 1. Calculate automatic confidence
    const confidenceResult = confidenceCalculatorService.calculateAutomaticConfidence({
      isCorrect: attemptData.isCorrect,
      timeSpent: attemptData.timeSpent,
      expectedTime,
      hintsUsed: attemptData.hintsUsed,
      chatInteractions: attemptData.chatInteractions,
      previousAccuracyOnTopic: progress.performance.accuracyRate,
      questionDifficulty: difficulty,
      studentLevel: profile.currentLevel,
      studentType: profile.studentType,
    });

    // 2. Calculate quality score for spaced repetition
    const qualityScore = confidenceCalculatorService.calculateQualityScore({
      isCorrect: attemptData.isCorrect,
      timeSpent: attemptData.timeSpent,
      expectedTime,
      hintsUsed: attemptData.hintsUsed,
      chatInteractions: attemptData.chatInteractions,
      previousAccuracyOnTopic: progress.performance.accuracyRate,
      questionDifficulty: difficulty,
      studentLevel: profile.currentLevel,
      studentType: profile.studentType,
    });

    // 3. Calculate flow state
    const skill = flowEngineService.estimateSkillLevel(
      progress.performance.masteryLevel,
      progress.performance.accuracyRate,
      progress.performance.bloomProgress?.currentLevel || 1
    );
    const flowState = flowEngineService.calculateFlowState(difficulty, skill);

    // 4. Add attempt to progress
    progress.addAttempt({
      questionId: questionObjectId,
      isCorrect: attemptData.isCorrect,
      timeSpent: attemptData.timeSpent,
      hintsUsed: attemptData.hintsUsed,
      confidence: confidenceResult.confidence,
      chatInteractions: attemptData.chatInteractions,
      bloomLevel,
    });

    // 5. Update Bloom progress
    progress.updateBloomProgress(bloomLevel, qualityScore);

    // 6. Update flow metrics
    progress.updateFlowMetrics(difficulty, skill, flowState.flowZone);

    // 7. Calculate spaced repetition
    const srResult = enhancedSpacedRepetitionService.calculateNextReview(
      qualityScore,
      progress.performance.easeFactor,
      progress.performance.interval,
      progress.performance.repetitions,
      flowState.flowScore,
      bloomLevel,
      progress.performance.spacedRepetition?.progressiveChallenge || false
    );

    // 8. Update performance with SR results
    progress.performance.nextReviewDate = srResult.nextReviewDate;
    progress.performance.easeFactor = srResult.easeFactor;
    progress.performance.interval = srResult.interval;
    progress.performance.repetitions = srResult.repetitions;

    // Update enhanced spaced repetition fields
    progress.performance.spacedRepetition = {
      nextReviewDate: srResult.nextReviewDate,
      easeFactor: srResult.easeFactor,
      interval: srResult.interval,
      repetitions: srResult.repetitions,
      qualityHistory: [
        ...(progress.performance.spacedRepetition?.qualityHistory || []).slice(-9),
        qualityScore,
      ],
      reviewLevel: srResult.reviewBloomLevel,
      progressiveChallenge: srResult.progressiveChallenge,
      lastReviewBloomLevel: bloomLevel,
    };

    // 9. Calculate mastery level
    progress.calculateMasteryLevel();

    // 10. Save progress
    await progress.save();

    // 11. Record question answer
    await questionSelectorService.recordQuestionAnswered(userObjectId, questionObjectId, {
      isCorrect: attemptData.isCorrect,
      userAnswer: attemptData.userAnswer,
      timeSpent: attemptData.timeSpent,
      hintsUsed: attemptData.hintsUsed,
      chatInteractions: attemptData.chatInteractions,
      calculatedConfidence: confidenceResult.confidence,
    });

    // 12. Update question statistics
    await question.updateStatistics(attemptData.isCorrect, attemptData.timeSpent);

    // 13. Check if difficulty adjustment is needed
    const adjustment = flowEngineService.adjustForFlow(
      difficulty,
      skill,
      {
        isCorrect: attemptData.isCorrect,
        timeSpent: attemptData.timeSpent,
        averageTime: expectedTime,
        hintsUsed: attemptData.hintsUsed,
        retries: 0,
        pauses: 0,
        recentAccuracy: progress.performance.accuracyRate,
      }
    );

    // 14. Update active session if exists
    await LearningSession.updateOne(
      { userId: userObjectId, endTime: null },
      {
        $push: {
          questionsAttempted: questionObjectId,
          flowStates: {
            timestamp: new Date(),
            challenge: difficulty,
            skill,
            flowZone: flowState.flowZone,
            activity: 'answering_question',
          },
        },
        $inc: {
          'outcomes.questionsAttempted': 1,
          'outcomes.questionsCorrect': attemptData.isCorrect ? 1 : 0,
        },
        $set: { currentFlowZone: flowState.flowZone },
        $addToSet: { subjects: subject },
      }
    );

    // 15. Generate feedback
    let feedback = '';
    if (attemptData.isCorrect) {
      if (confidenceResult.confidence >= 4) {
        feedback = 'Excellent work! You demonstrated strong understanding.';
      } else {
        feedback = 'Good job! Keep practicing to build more confidence.';
      }
    } else {
      feedback = 'Not quite right, but keep going! Review the explanation and try similar problems.';
    }

    return {
      isCorrect: attemptData.isCorrect,
      calculatedConfidence: confidenceResult.confidence,
      qualityScore,
      flowState: {
        flowZone: flowState.flowZone,
        flowScore: flowState.flowScore,
      },
      nextReviewDate: srResult.nextReviewDate,
      masteryLevel: progress.performance.masteryLevel,
      bloomProgress: {
        currentLevel: progress.performance.bloomProgress?.currentLevel || 0,
        nextTargetLevel: progress.performance.bloomProgress?.nextTargetLevel || 1,
        levelMastery: this.getBloomLevelMastery(progress.performance.bloomProgress, bloomLevel),
      },
      feedback,
      shouldAdjustDifficulty: adjustment.newDifficulty !== difficulty,
      adjustmentReason: adjustment.adjustmentReason,
    };
  }

  /**
   * End a learning session and get summary
   */
  async endSession(userId: string): Promise<SessionSummary> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const session = await LearningSession.findOne({
      userId: userObjectId,
      endTime: null,
    });

    if (!session) {
      return {
        duration: 0,
        questionsAttempted: 0,
        questionsCorrect: 0,
        averageFlowScore: 0,
        bloomLevelsProgressed: 0,
        topicsReviewed: [],
        recommendations: [],
      };
    }

    // End the session
    session.endSession();
    await session.save();

    // Generate recommendations
    const recommendations = await learnerModelService.getLearningRecommendations(userId);

    return {
      duration: session.duration || 0,
      questionsAttempted: session.outcomes.questionsAttempted,
      questionsCorrect: session.outcomes.questionsCorrect,
      averageFlowScore: session.averageFlowScore,
      bloomLevelsProgressed: session.outcomes.bloomLevelsProgressed,
      topicsReviewed: [], // Could populate from session data
      recommendations: recommendations.flowOptimizations,
    };
  }

  /**
   * Process a Feynman explanation
   * Uses AI backend for intelligent evaluation when available,
   * falls back to local evaluation otherwise
   */
  async processExplanation(
    userId: string,
    topic: string,
    explanation: string,
    conceptId?: string,
    questionId?: string
  ): Promise<{
    evaluation: any;
    shouldRefine: boolean;
    refinementPrompts: string[];
    bloomLevelDemonstrated: number;
  }> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Get learner profile for context
    const profile = await learnerModelService.buildLearnerProfile(userId);

    // Try AI-powered evaluation first
    let evaluation: any;
    let refinementPrompts: string[] = [];
    let shouldRefine = false;
    let bloomLevelDemonstrated = 2;

    try {
      // Call AI backend for intelligent evaluation
      const aiResult = await this.callAIFeynmanEvaluation({
        topic,
        explanation,
        studentLevel: profile.currentLevel,
        targetBloomLevel: profile.learningPreferences?.preferredBloomLevel || 2,
      });

      if (aiResult) {
        evaluation = {
          clarity: aiResult.evaluation.clarity,
          completeness: aiResult.evaluation.completeness,
          accuracy: aiResult.evaluation.accuracy,
          jargon: aiResult.evaluation.jargonTerms || [],
          misconceptions: aiResult.evaluation.misconceptions || [],
          gaps: aiResult.evaluation.gaps || [],
          strengths: aiResult.evaluation.strengths || [],
          feedback: aiResult.evaluation.feedback,
          bloomLevel: aiResult.evaluation.bloomLevel,
          shouldRefine: aiResult.needsRefinement,
        };
        refinementPrompts = aiResult.refinementPrompts || [];
        shouldRefine = aiResult.needsRefinement;
        bloomLevelDemonstrated = aiResult.bloomLevelDemonstrated;
      } else {
        throw new Error('AI evaluation returned null');
      }
    } catch (error) {
      // Fall back to local evaluation
      console.log('AI evaluation unavailable, using local evaluation:', error);
      const expectedKeyPoints = this.getExpectedKeyPoints(topic);

      const localEval = feynmanEvaluatorService.evaluateExplanation(explanation, {
        conceptName: topic,
        topic,
        expectedKeyPoints,
        studentLevel: profile.currentLevel,
      });

      const refinementResult = feynmanEvaluatorService.generateRefinementPrompts(
        localEval,
        1
      );

      evaluation = localEval;
      refinementPrompts = refinementResult.prompts;
      shouldRefine = localEval.shouldRefine;
      bloomLevelDemonstrated = localEval.bloomLevel;
    }

    // Save the explanation
    await feynmanEvaluatorService.saveEvaluation(
      userObjectId,
      topic,
      explanation,
      evaluation,
      conceptId ? new mongoose.Types.ObjectId(conceptId) : undefined,
      questionId ? new mongoose.Types.ObjectId(questionId) : undefined
    );

    // Update student progress with Feynman quality
    await StudentProgress.updateOne(
      { userId: userObjectId, topic },
      {
        $set: {
          'performance.feynmanQuality.explanationClarity': evaluation.clarity,
          'performance.feynmanQuality.completeness': evaluation.completeness,
          'performance.feynmanQuality.lastExplained': new Date(),
        },
        $push: {
          'performance.feynmanQuality.explanationHistory': {
            date: new Date(),
            clarity: evaluation.clarity,
            completeness: evaluation.completeness,
            feedback: evaluation.feedback,
          },
        },
      }
    );

    // Update session if active
    await LearningSession.updateOne(
      { userId: userObjectId, endTime: null },
      {
        $inc: { 'outcomes.explanationsGiven': 1 },
      }
    );

    return {
      evaluation,
      shouldRefine,
      refinementPrompts,
      bloomLevelDemonstrated,
    };
  }

  /**
   * Call AI backend for Feynman evaluation
   */
  private async callAIFeynmanEvaluation(data: {
    topic: string;
    explanation: string;
    studentLevel?: number;
    targetBloomLevel?: number;
  }): Promise<{
    evaluation: {
      clarity: number;
      completeness: number;
      accuracy: number;
      jargonTerms: string[];
      misconceptions: string[];
      strengths: string[];
      gaps: string[];
      feedback: string;
      bloomLevel: number;
    };
    overallScore: number;
    needsRefinement: boolean;
    refinementPrompts: string[];
    bloomLevelDemonstrated: number;
  } | null> {
    try {
      const aiBackendUrl = process.env.AI_BACKEND_URL || 'http://localhost:3002';
      const response = await fetch(`${aiBackendUrl}/api/v1/feynman/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.warn('AI backend returned error:', response.status);
        return null;
      }

      const result = await response.json() as {
        success: boolean;
        data?: {
          evaluation: {
            clarity: number;
            completeness: number;
            accuracy: number;
            jargonTerms: string[];
            misconceptions: string[];
            strengths: string[];
            gaps: string[];
            feedback: string;
            bloomLevel: number;
          };
          overallScore: number;
          needsRefinement: boolean;
          refinementPrompts: string[];
          bloomLevelDemonstrated: number;
        };
      };
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.warn('Failed to call AI backend for Feynman evaluation:', error);
      return null;
    }
  }

  // Private helper methods

  private getBloomLevelMastery(bloomProgress: any, level: number): number {
    if (!bloomProgress) return 0;
    
    const levelNames: Record<number, string> = {
      1: 'remember',
      2: 'understand',
      3: 'apply',
      4: 'analyze',
      5: 'evaluate',
      6: 'create',
    };
    
    const levelName = levelNames[level];
    if (!levelName) return 0;
    
    return bloomProgress[levelName]?.mastery || 0;
  }

  private getExpectedKeyPoints(topic: string): string[] {
    // In production, this would come from the Concept model
    // For now, return generic key points based on topic
    const topicKeyPoints: Record<string, string[]> = {
      'linear-equations': [
        'equation with variable',
        'solve by isolating variable',
        'same operation both sides',
        'check solution',
      ],
      'quadratic-equations': [
        'squared term',
        'parabola shape',
        'factoring or formula',
        'two solutions possible',
      ],
      default: [
        'definition',
        'example',
        'how to solve',
        'when to use',
      ],
    };

    return topicKeyPoints[topic] || topicKeyPoints.default;
  }
}

export const learningOrchestratorService = new LearningOrchestratorService();

