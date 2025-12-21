/**
 * Learner Model Service
 * 
 * Comprehensive learner profiling and prediction.
 * Tracks learner state across all dimensions:
 * - Bloom levels per concept
 * - Flow state patterns
 * - Feynman quality history
 * - Spaced repetition schedules
 */

import mongoose from 'mongoose';
import { User, CommunicationProfile, LearningStyleType, ExplanationStyleType } from '../models/User.model';
import { StudentProgress } from '../models/StudentProgress.model';
import { LearningSession } from '../models/LearningSession.model';
import { LearnerExplanation } from '../models/LearnerExplanation.model';
import { flowEngineService, FlowZone } from './flowEngine.service';
import { bloomService, BLOOM_LEVEL_NAMES } from './bloomService';
import { confidenceCalculatorService, StudentType } from './confidenceCalculator.service';
import { chatSessionService, AggregatedCommunicationProfile } from './chatSession.service';

export interface LearnerProfile {
  userId: string;
  studentType: StudentType;
  currentLevel: number; // 1-10
  
  // Aggregate metrics
  overallMastery: number; // 0-100
  averageAccuracy: number; // 0-1
  averageFlowScore: number; // 0-100
  totalStudyTime: number; // minutes
  
  // Subject-specific profiles
  subjectProfiles: {
    subject: string;
    mastery: number;
    bloomLevel: number;
    flowScore: number;
    strengths: string[];
    weaknesses: string[];
  }[];
  
  // Learning preferences (inferred)
  learningPreferences: {
    preferredBloomLevel: number;
    challengePreference: 'conservative' | 'moderate' | 'aggressive';
    optimalSessionDuration: number; // minutes
  };
  
  // Communication profile (from chat analysis)
  communicationProfile: CommunicationProfile | null;
  
  // Recent activity
  streakDays: number;
  lastActiveDate: Date | null;
  recentSessionCount: number;
}

export interface AdaptedCoachingContext {
  adjustedLevel: number;
  explanationStyle: ExplanationStyleType;
  learningStyle: LearningStyleType;
  conceptsToReinforce: string[];
  frustrationRisk: 'low' | 'medium' | 'high';
  suggestedApproach: string;
}

export interface LearningRecommendations {
  conceptsToReview: { topic: string; subject: string; priority: number }[];
  conceptsToLearn: { topic: string; subject: string; bloomLevel: number }[];
  bloomLevelsToTarget: { subject: string; level: number; description: string }[];
  flowOptimizations: string[];
  sessionRecommendation: {
    type: 'study' | 'review' | 'practice' | 'break';
    duration: number; // minutes
    focus: string;
  };
}

export interface FlowPrediction {
  predictedZone: FlowZone;
  confidence: number;
  recommendedChallenge: number;
  explanation: string;
}

export class LearnerModelService {
  /**
   * Build comprehensive learner profile
   */
  async buildLearnerProfile(userId: string): Promise<LearnerProfile> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get all progress records
    const allProgress = await StudentProgress.find({ userId: userObjectId });
    
    // Get recent sessions
    const recentSessions = await LearningSession.find({
      userId: userObjectId,
      startTime: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
    });

    // Get recent explanations
    const recentExplanations = await LearnerExplanation.find({
      userId: userObjectId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    // Calculate aggregate metrics
    const overallMastery = this.calculateOverallMastery(allProgress);
    const averageAccuracy = this.calculateAverageAccuracy(allProgress);
    const averageFlowScore = this.calculateAverageFlowScore(allProgress, recentSessions);
    const totalStudyTime = this.calculateTotalStudyTime(recentSessions);

    // Determine student type
    const studentType = confidenceCalculatorService.determineStudentType(
      overallMastery,
      averageAccuracy,
      averageFlowScore
    );

    // Build subject profiles
    const subjectProfiles = this.buildSubjectProfiles(allProgress);

    // Infer learning preferences
    const learningPreferences = this.inferLearningPreferences(
      allProgress,
      recentSessions,
      studentType
    );

    // Calculate streak
    const { streakDays, lastActiveDate } = this.calculateStreak(recentSessions);

    // Get communication profile from user model (may be null if no chat data)
    const communicationProfile = user.learningProfile.communicationProfile || null;

    return {
      userId,
      studentType,
      currentLevel: user.learningProfile.currentLevel,
      overallMastery,
      averageAccuracy,
      averageFlowScore,
      totalStudyTime,
      subjectProfiles,
      learningPreferences,
      communicationProfile,
      streakDays,
      lastActiveDate,
      recentSessionCount: recentSessions.length,
    };
  }

  /**
   * Predict flow state for a given challenge
   */
  predictFlowState(
    studentType: StudentType,
    currentSkill: number,
    proposedChallenge: number
  ): FlowPrediction {
    const flowState = flowEngineService.calculateFlowState(proposedChallenge, currentSkill);
    
    // Adjust recommendation based on student type
    let recommendedChallenge = proposedChallenge;
    let explanation = '';

    switch (studentType) {
      case 'struggler':
        // Be conservative with challenge
        recommendedChallenge = Math.max(1, Math.min(currentSkill, proposedChallenge));
        explanation = 'Keeping challenge at or below skill level to build confidence';
        break;
      case 'intermediate':
        // Slight challenge above skill
        recommendedChallenge = Math.min(10, currentSkill + 1);
        explanation = 'Moderate challenge for steady growth';
        break;
      case 'advanced':
        // Can handle more challenge
        recommendedChallenge = Math.min(10, currentSkill + 2);
        explanation = 'Higher challenge for continued engagement';
        break;
    }

    const adjustedFlowState = flowEngineService.calculateFlowState(
      recommendedChallenge,
      currentSkill
    );

    return {
      predictedZone: adjustedFlowState.flowZone,
      confidence: Math.round(adjustedFlowState.flowScore / 100 * 100) / 100,
      recommendedChallenge,
      explanation,
    };
  }

  /**
   * Get personalized learning recommendations
   */
  async getLearningRecommendations(userId: string): Promise<LearningRecommendations> {
    const profile = await this.buildLearnerProfile(userId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Get topics due for review
    const now = new Date();
    const dueProgress = await StudentProgress.find({
      userId: userObjectId,
      'performance.nextReviewDate': { $lte: now },
    }).sort({ 'performance.nextReviewDate': 1 }).limit(5);

    const conceptsToReview = dueProgress.map(p => ({
      topic: p.topic,
      subject: p.subject,
      priority: 100 - p.performance.masteryLevel,
    }));

    // Get topics to learn (low mastery)
    const lowMasteryProgress = await StudentProgress.find({
      userId: userObjectId,
      'performance.masteryLevel': { $lt: 50 },
    }).sort({ 'performance.masteryLevel': 1 }).limit(5);

    const conceptsToLearn = lowMasteryProgress.map(p => ({
      topic: p.topic,
      subject: p.subject,
      bloomLevel: p.performance.bloomProgress?.nextTargetLevel || 1,
    }));

    // Get Bloom levels to target per subject
    const bloomLevelsToTarget = profile.subjectProfiles.map(sp => {
      const nextLevel = Math.min(6, sp.bloomLevel + 1);
      return {
        subject: sp.subject,
        level: nextLevel,
        description: bloomService.getBloomLevelInfo(nextLevel).description,
      };
    });

    // Generate flow optimizations based on profile
    const flowOptimizations = this.generateFlowOptimizations(profile);

    // Generate session recommendation
    const sessionRecommendation = this.generateSessionRecommendation(profile, conceptsToReview);

    return {
      conceptsToReview,
      conceptsToLearn,
      bloomLevelsToTarget,
      flowOptimizations,
      sessionRecommendation,
    };
  }

  /**
   * Update learner profile after a session
   */
  async updateLearnerProfile(
    userId: string,
    sessionData: {
      questionsAttempted: number;
      questionsCorrect: number;
      timeSpent: number;
      flowScore: number;
      bloomLevel: number;
    }
  ): Promise<void> {
    // Update user learning profile
    const user = await User.findById(userId);
    if (!user) return;

    // Adaptive level adjustment based on performance
    const accuracy = sessionData.questionsAttempted > 0
      ? sessionData.questionsCorrect / sessionData.questionsAttempted
      : 0;

    let levelAdjustment = 0;
    if (accuracy >= 0.9 && sessionData.flowScore >= 70) {
      levelAdjustment = 0.5; // Increase level
    } else if (accuracy < 0.4) {
      levelAdjustment = -0.5; // Decrease level
    }

    const newLevel = Math.max(1, Math.min(10,
      user.learningProfile.currentLevel + levelAdjustment
    ));

    user.learningProfile.currentLevel = Math.round(newLevel);
    await user.save();
  }

  /**
   * Get communication profile for a user
   * Returns aggregated insights from chat sessions
   */
  async getCommunicationProfile(userId: string): Promise<AggregatedCommunicationProfile> {
    return chatSessionService.getUserCommunicationProfile(userId);
  }

  /**
   * Build adapted coaching context based on learner profile and communication data
   * This provides context for the AI coach to personalize responses
   */
  async getAdaptedCoachingContext(userId: string): Promise<AdaptedCoachingContext> {
    const profile = await this.buildLearnerProfile(userId);
    const communicationProfile = await this.getCommunicationProfile(userId);

    // Calculate adjusted level considering communication profile
    let adjustedLevel = profile.currentLevel;

    // If student shows frustration, slightly reduce challenge
    if (communicationProfile.recentSentiments.includes('frustrated')) {
      adjustedLevel = Math.max(1, adjustedLevel - 1);
    }

    // If student shows confidence, slightly increase challenge  
    const confidentCount = communicationProfile.recentSentiments.filter(s => s === 'confident').length;
    if (confidentCount >= 3) {
      adjustedLevel = Math.min(10, adjustedLevel + 0.5);
    }

    // Determine frustration risk
    const frustrationCount = communicationProfile.recentSentiments.filter(s => s === 'frustrated').length;
    let frustrationRisk: 'low' | 'medium' | 'high' = 'low';
    if (frustrationCount >= 3) {
      frustrationRisk = 'high';
    } else if (frustrationCount >= 1) {
      frustrationRisk = 'medium';
    }

    // Generate suggested approach based on learning style and frustration
    let suggestedApproach = '';
    switch (communicationProfile.dominantLearningStyle) {
      case 'visual':
        suggestedApproach = 'Use diagrams, graphs, and visual examples. Show relationships visually.';
        break;
      case 'verbal':
        suggestedApproach = 'Provide detailed explanations with analogies and metaphors.';
        break;
      case 'procedural':
        suggestedApproach = 'Break down into clear step-by-step instructions. Number the steps.';
        break;
      case 'conceptual':
        suggestedApproach = 'Explain the underlying theory and connect to broader principles.';
        break;
      default:
        suggestedApproach = 'Use a balanced approach with examples and clear explanations.';
    }

    // Add frustration mitigation if needed
    if (frustrationRisk !== 'low') {
      suggestedApproach += ' Be encouraging and validate their effort. Simplify language.';
    }

    return {
      adjustedLevel: Math.round(adjustedLevel),
      explanationStyle: communicationProfile.preferredExplanationStyle,
      learningStyle: communicationProfile.dominantLearningStyle,
      conceptsToReinforce: communicationProfile.commonConceptGaps.slice(0, 5),
      frustrationRisk,
      suggestedApproach,
    };
  }

  /**
   * Check if a user has frustration triggers related to specific concepts
   */
  async getFrustrationContext(userId: string, conceptsInQuestion: string[]): Promise<{
    hasRelatedFrustration: boolean;
    relatedTriggers: string[];
  }> {
    const communicationProfile = await this.getCommunicationProfile(userId);

    const relatedTriggers = communicationProfile.frustrationTriggers.filter(trigger =>
      conceptsInQuestion.some(concept => 
        concept.toLowerCase().includes(trigger.toLowerCase()) ||
        trigger.toLowerCase().includes(concept.toLowerCase())
      )
    );

    return {
      hasRelatedFrustration: relatedTriggers.length > 0,
      relatedTriggers,
    };
  }

  // Private helper methods

  private calculateOverallMastery(progressRecords: any[]): number {
    if (progressRecords.length === 0) return 0;
    const total = progressRecords.reduce((sum, p) => sum + p.performance.masteryLevel, 0);
    return Math.round(total / progressRecords.length);
  }

  private calculateAverageAccuracy(progressRecords: any[]): number {
    if (progressRecords.length === 0) return 0;
    const total = progressRecords.reduce((sum, p) => sum + p.performance.accuracyRate, 0);
    return Math.round((total / progressRecords.length) * 100) / 100;
  }

  private calculateAverageFlowScore(progressRecords: any[], sessions: any[]): number {
    // From progress records
    const progressFlowScores = progressRecords
      .filter(p => p.performance.flowMetrics?.flowScore)
      .map(p => p.performance.flowMetrics.flowScore);

    // From sessions
    const sessionFlowScores = sessions
      .filter(s => s.averageFlowScore)
      .map(s => s.averageFlowScore);

    const allScores = [...progressFlowScores, ...sessionFlowScores];
    if (allScores.length === 0) return 50;

    return Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
  }

  private calculateTotalStudyTime(sessions: any[]): number {
    return sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  }

  private buildSubjectProfiles(progressRecords: any[]): any[] {
    const subjectMap = new Map<string, any[]>();

    for (const progress of progressRecords) {
      const existing = subjectMap.get(progress.subject) || [];
      existing.push(progress);
      subjectMap.set(progress.subject, existing);
    }

    return Array.from(subjectMap.entries()).map(([subject, records]) => {
      const mastery = Math.round(
        records.reduce((sum, r) => sum + r.performance.masteryLevel, 0) / records.length
      );
      const bloomLevel = Math.max(
        ...records.map(r => r.performance.bloomProgress?.currentLevel || 1)
      );
      const flowScore = Math.round(
        records
          .filter(r => r.performance.flowMetrics?.flowScore)
          .reduce((sum, r) => sum + r.performance.flowMetrics.flowScore, 0) /
        Math.max(1, records.filter(r => r.performance.flowMetrics?.flowScore).length)
      );

      // Identify strengths and weaknesses
      const strengths = records
        .filter(r => r.performance.accuracyRate >= 0.8)
        .map(r => r.topic);
      const weaknesses = records
        .filter(r => r.performance.accuracyRate < 0.5)
        .map(r => r.topic);

      return {
        subject,
        mastery,
        bloomLevel,
        flowScore,
        strengths,
        weaknesses,
      };
    });
  }

  private inferLearningPreferences(
    progressRecords: any[],
    sessions: any[],
    studentType: StudentType
  ): any {
    // Calculate average session duration
    const avgDuration = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length
      : 30;

    // Infer preferred Bloom level
    const bloomLevels = progressRecords
      .map(p => p.performance.bloomProgress?.currentLevel || 1);
    const preferredBloomLevel = bloomLevels.length > 0
      ? Math.round(bloomLevels.reduce((a, b) => a + b, 0) / bloomLevels.length)
      : 2;

    // Challenge preference based on student type and performance
    let challengePreference: 'conservative' | 'moderate' | 'aggressive' = 'moderate';
    if (studentType === 'struggler') {
      challengePreference = 'conservative';
    } else if (studentType === 'advanced') {
      challengePreference = 'aggressive';
    }

    return {
      preferredBloomLevel,
      challengePreference,
      optimalSessionDuration: Math.round(avgDuration),
    };
  }

  private calculateStreak(sessions: any[]): { streakDays: number; lastActiveDate: Date | null } {
    if (sessions.length === 0) {
      return { streakDays: 0, lastActiveDate: null };
    }

    // Sort by date descending
    const sortedSessions = [...sessions].sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    );

    const lastActiveDate = sortedSessions[0].startTime;
    
    // Count consecutive days
    let streakDays = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const sessionDates = new Set(
      sortedSessions.map(s => {
        const d = new Date(s.startTime);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );

    while (sessionDates.has(currentDate.getTime())) {
      streakDays++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return { streakDays, lastActiveDate };
  }

  private generateFlowOptimizations(profile: LearnerProfile): string[] {
    const optimizations: string[] = [];

    if (profile.averageFlowScore < 50) {
      optimizations.push('Try breaking study sessions into shorter segments');
      optimizations.push('Take breaks when you feel stuck');
    }

    if (profile.studentType === 'struggler') {
      optimizations.push('Focus on mastering basics before advancing');
      optimizations.push('Use hints freely - they help build understanding');
    }

    if (profile.streakDays === 0) {
      optimizations.push('Try studying a little each day - consistency helps retention');
    }

    if (profile.subjectProfiles.some(sp => sp.flowScore < 40)) {
      const lowFlowSubject = profile.subjectProfiles.find(sp => sp.flowScore < 40);
      if (lowFlowSubject) {
        optimizations.push(
          `Consider reviewing ${lowFlowSubject.subject} fundamentals - they may need reinforcement`
        );
      }
    }

    return optimizations;
  }

  private generateSessionRecommendation(
    profile: LearnerProfile,
    conceptsToReview: any[]
  ): any {
    // If topics are due for review, prioritize that
    if (conceptsToReview.length >= 3) {
      return {
        type: 'review' as const,
        duration: 20,
        focus: 'Spaced repetition review of due topics',
      };
    }

    // Based on student type
    if (profile.studentType === 'struggler') {
      return {
        type: 'study' as const,
        duration: 15,
        focus: 'Build understanding with easier concepts',
      };
    }

    if (profile.averageFlowScore < 40) {
      return {
        type: 'break' as const,
        duration: 10,
        focus: 'Take a break before continuing',
      };
    }

    return {
      type: 'practice' as const,
      duration: 25,
      focus: 'Apply knowledge with practice questions',
    };
  }
}

export const learnerModelService = new LearnerModelService();

