import mongoose, { Schema, Document } from 'mongoose';

export interface QuestionAttempt {
  questionId: mongoose.Types.ObjectId;
  attemptDate: Date;
  isCorrect: boolean;
  timeSpent: number;
  hintsUsed: number;
  confidence: number; // Now automatically calculated
  chatInteractions: number;
  bloomLevel?: number; // 1-6, which Bloom level was tested
}

export interface BloomLevelProgress {
  attempts: number;
  mastery: number; // 0-100
  lastAttempt: Date | null;
}

export interface BloomProgress {
  remember: BloomLevelProgress;
  understand: BloomLevelProgress;
  apply: BloomLevelProgress;
  analyze: BloomLevelProgress;
  evaluate: BloomLevelProgress;
  create: BloomLevelProgress;
  currentLevel: number; // 1-6, highest level with mastery >= 80
  nextTargetLevel: number; // Next level to work on
}

export interface FeynmanQuality {
  explanationClarity: number; // 0-100
  completeness: number; // 0-100
  lastExplained: Date | null;
  explanationHistory: Array<{
    date: Date;
    clarity: number;
    completeness: number;
    feedback: string;
  }>;
}

export interface FlowMetrics {
  averageChallenge: number; // 1-10
  averageSkill: number; // 1-10
  timeInFlow: number; // minutes
  timeInBoredom: number; // minutes
  timeInAnxiety: number; // minutes
  flowScore: number; // 0-100
  difficultyAdjustments: number;
}

export interface EnhancedSpacedRepetition {
  nextReviewDate: Date;
  easeFactor: number;
  interval: number;
  repetitions: number;
  qualityHistory: number[]; // Last 10 quality scores
  reviewLevel: number; // Bloom level for next review
  progressiveChallenge: boolean; // Increase difficulty on review
  lastReviewBloomLevel: number;
}

export interface Performance {
  totalAttempts: number;
  correctAttempts: number;
  accuracyRate: number;
  averageTime: number;
  lastAttemptDate: Date;
  nextReviewDate: Date;
  masteryLevel: number;
  easeFactor: number;
  interval: number;
  repetitions: number;
  
  // NEW: Bloom Taxonomy Progress
  bloomProgress: BloomProgress;
  
  // NEW: Feynman Explanation Quality
  feynmanQuality: FeynmanQuality;
  
  // NEW: Flow Metrics
  flowMetrics: FlowMetrics;
  
  // NEW: Enhanced Spaced Repetition
  spacedRepetition: EnhancedSpacedRepetition;
}

export interface IStudentProgress extends Document {
  userId: mongoose.Types.ObjectId;
  subject: string;
  topic: string;
  attempts: QuestionAttempt[];
  performance: Performance;
  createdAt: Date;
  updatedAt: Date;
  addAttempt: (attempt: Omit<QuestionAttempt, 'attemptDate'>) => IStudentProgress;
  calculateMasteryLevel: () => number;
  updateBloomProgress: (bloomLevel: number, quality: number) => void;
  updateFlowMetrics: (challenge: number, skill: number, flowZone: string) => void;
}

// Default Bloom level progress
const defaultBloomLevelProgress = (): BloomLevelProgress => ({
  attempts: 0,
  mastery: 0,
  lastAttempt: null,
});

const BloomLevelProgressSchema = new Schema<BloomLevelProgress>({
  attempts: { type: Number, default: 0, min: 0 },
  mastery: { type: Number, default: 0, min: 0, max: 100 },
  lastAttempt: { type: Date, default: null },
}, { _id: false });

const StudentProgressSchema = new Schema<IStudentProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      enum: ['math', 'reading', 'writing'],
      index: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    attempts: [
      {
        questionId: {
          type: Schema.Types.ObjectId,
          ref: 'Question',
          required: true,
        },
        attemptDate: {
          type: Date,
          required: true,
          default: Date.now,
        },
        isCorrect: {
          type: Boolean,
          required: true,
        },
        timeSpent: {
          type: Number,
          required: true,
          min: 0,
        },
        hintsUsed: {
          type: Number,
          default: 0,
          min: 0,
        },
        confidence: {
          type: Number,
          min: 1,
          max: 5,
          default: 3,
        },
        chatInteractions: {
          type: Number,
          default: 0,
          min: 0,
        },
        bloomLevel: {
          type: Number,
          min: 1,
          max: 6,
        },
      },
    ],
    performance: {
      totalAttempts: {
        type: Number,
        default: 0,
        min: 0,
      },
      correctAttempts: {
        type: Number,
        default: 0,
        min: 0,
      },
      accuracyRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
      },
      averageTime: {
        type: Number,
        default: 0,
        min: 0,
      },
      lastAttemptDate: {
        type: Date,
        default: Date.now,
      },
      nextReviewDate: {
        type: Date,
        default: Date.now,
        index: true,
      },
      masteryLevel: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      easeFactor: {
        type: Number,
        default: 2.5,
        min: 1.3,
      },
      interval: {
        type: Number,
        default: 0,
        min: 0,
      },
      repetitions: {
        type: Number,
        default: 0,
        min: 0,
      },
      
      // NEW: Bloom Taxonomy Progress
      bloomProgress: {
        remember: { type: BloomLevelProgressSchema, default: defaultBloomLevelProgress },
        understand: { type: BloomLevelProgressSchema, default: defaultBloomLevelProgress },
        apply: { type: BloomLevelProgressSchema, default: defaultBloomLevelProgress },
        analyze: { type: BloomLevelProgressSchema, default: defaultBloomLevelProgress },
        evaluate: { type: BloomLevelProgressSchema, default: defaultBloomLevelProgress },
        create: { type: BloomLevelProgressSchema, default: defaultBloomLevelProgress },
        currentLevel: { type: Number, default: 0, min: 0, max: 6 },
        nextTargetLevel: { type: Number, default: 1, min: 1, max: 6 },
      },
      
      // NEW: Feynman Explanation Quality
      feynmanQuality: {
        explanationClarity: { type: Number, default: 0, min: 0, max: 100 },
        completeness: { type: Number, default: 0, min: 0, max: 100 },
        lastExplained: { type: Date, default: null },
        explanationHistory: [{
          date: { type: Date },
          clarity: { type: Number },
          completeness: { type: Number },
          feedback: { type: String },
        }],
      },
      
      // NEW: Flow Metrics
      flowMetrics: {
        averageChallenge: { type: Number, default: 5, min: 1, max: 10 },
        averageSkill: { type: Number, default: 5, min: 1, max: 10 },
        timeInFlow: { type: Number, default: 0, min: 0 },
        timeInBoredom: { type: Number, default: 0, min: 0 },
        timeInAnxiety: { type: Number, default: 0, min: 0 },
        flowScore: { type: Number, default: 50, min: 0, max: 100 },
        difficultyAdjustments: { type: Number, default: 0, min: 0 },
      },
      
      // NEW: Enhanced Spaced Repetition
      spacedRepetition: {
        nextReviewDate: { type: Date, default: Date.now },
        easeFactor: { type: Number, default: 2.5, min: 1.3 },
        interval: { type: Number, default: 0, min: 0 },
        repetitions: { type: Number, default: 0, min: 0 },
        qualityHistory: [{ type: Number }],
        reviewLevel: { type: Number, default: 1, min: 1, max: 6 },
        progressiveChallenge: { type: Boolean, default: false },
        lastReviewBloomLevel: { type: Number, default: 1, min: 1, max: 6 },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
StudentProgressSchema.index({ userId: 1, subject: 1, topic: 1 }, { unique: true });
StudentProgressSchema.index({ userId: 1, 'performance.nextReviewDate': 1 });
StudentProgressSchema.index({ userId: 1, 'performance.masteryLevel': 1 });
StudentProgressSchema.index({ 
  userId: 1, 
  'performance.nextReviewDate': 1, 
  'performance.masteryLevel': 1 
});
StudentProgressSchema.index({ userId: 1, 'performance.bloomProgress.currentLevel': 1 });
StudentProgressSchema.index({ userId: 1, 'performance.flowMetrics.flowScore': 1 });

// Instance method to add an attempt
StudentProgressSchema.methods.addAttempt = function (
  this: IStudentProgress,
  attempt: Omit<QuestionAttempt, 'attemptDate'>
) {
  this.attempts.push({
    ...attempt,
    attemptDate: new Date(),
  });
  
  // Update performance metrics
  this.performance.totalAttempts += 1;
  if (attempt.isCorrect) {
    this.performance.correctAttempts += 1;
  }
  
  this.performance.accuracyRate = this.performance.correctAttempts / this.performance.totalAttempts;
  
  // Update average time
  const totalTime = this.performance.averageTime * (this.performance.totalAttempts - 1);
  this.performance.averageTime = (totalTime + attempt.timeSpent) / this.performance.totalAttempts;
  
  this.performance.lastAttemptDate = new Date();
  
  return this;
};

// Instance method to calculate mastery level
StudentProgressSchema.methods.calculateMasteryLevel = function (this: IStudentProgress): number {
  const { accuracyRate, totalAttempts, repetitions } = this.performance;
  const bloomProgress = this.performance.bloomProgress;
  
  // Base mastery from accuracy and experience
  let mastery = 0;
  
  // Accuracy component (0-40 points)
  mastery += accuracyRate * 40;
  
  // Experience component (0-15 points)
  mastery += Math.min(totalAttempts / 10, 1) * 15;
  
  // Retention component (0-15 points)
  mastery += Math.min(repetitions / 5, 1) * 15;
  
  // Bloom level component (0-30 points)
  const bloomScore = (bloomProgress.currentLevel / 6) * 30;
  mastery += bloomScore;
  
  this.performance.masteryLevel = Math.round(mastery);
  return this.performance.masteryLevel;
};

// Instance method to update Bloom progress
StudentProgressSchema.methods.updateBloomProgress = function (
  this: IStudentProgress,
  bloomLevel: number,
  quality: number // 0-5
) {
  const BLOOM_LEVEL_NAMES: Record<number, keyof BloomProgress> = {
    1: 'remember',
    2: 'understand',
    3: 'apply',
    4: 'analyze',
    5: 'evaluate',
    6: 'create',
  };
  
  const levelName = BLOOM_LEVEL_NAMES[bloomLevel];
  if (!levelName || levelName === 'currentLevel' || levelName === 'nextTargetLevel') return;
  
  const levelProgress = this.performance.bloomProgress[levelName] as BloomLevelProgress;
  
  // Update attempts
  levelProgress.attempts += 1;
  levelProgress.lastAttempt = new Date();
  
  // Calculate mastery (weighted average of quality scores)
  const qualityPercent = (quality / 5) * 100;
  const weight = Math.min(levelProgress.attempts, 10) / 10;
  levelProgress.mastery = Math.round(
    (levelProgress.mastery * (1 - weight)) + (qualityPercent * weight)
  );
  
  // Check if mastered (>= 80%)
  if (levelProgress.mastery >= 80 && bloomLevel > this.performance.bloomProgress.currentLevel) {
    this.performance.bloomProgress.currentLevel = bloomLevel;
    this.performance.bloomProgress.nextTargetLevel = Math.min(6, bloomLevel + 1);
  }
};

// Instance method to update flow metrics
StudentProgressSchema.methods.updateFlowMetrics = function (
  this: IStudentProgress,
  challenge: number,
  skill: number,
  flowZone: string
) {
  const flowMetrics = this.performance.flowMetrics;
  
  // Update averages (weighted moving average)
  const weight = 0.3;
  flowMetrics.averageChallenge = flowMetrics.averageChallenge * (1 - weight) + challenge * weight;
  flowMetrics.averageSkill = flowMetrics.averageSkill * (1 - weight) + skill * weight;
  
  // Calculate flow score (higher when challenge ≈ skill)
  const distance = Math.abs(challenge - skill);
  flowMetrics.flowScore = Math.max(0, 100 - (distance * 20));
  
  // Update time in each zone (estimate 2 minutes per update)
  const timeIncrement = 2; // minutes
  switch (flowZone) {
    case 'flow':
      flowMetrics.timeInFlow += timeIncrement;
      break;
    case 'boredom':
      flowMetrics.timeInBoredom += timeIncrement;
      break;
    case 'anxiety':
      flowMetrics.timeInAnxiety += timeIncrement;
      break;
  }
};

export const StudentProgress = mongoose.model<IStudentProgress>(
  'StudentProgress',
  StudentProgressSchema
);
