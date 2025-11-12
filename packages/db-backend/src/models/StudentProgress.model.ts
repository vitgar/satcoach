import mongoose, { Schema, Document } from 'mongoose';

export interface QuestionAttempt {
  questionId: mongoose.Types.ObjectId;
  attemptDate: Date;
  isCorrect: boolean;
  timeSpent: number;
  hintsUsed: number;
  confidence: number;
  chatInteractions: number;
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
}

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
  
  // Mastery based on accuracy, attempts, and successful repetitions
  let mastery = 0;
  
  // Accuracy component (0-60 points)
  mastery += accuracyRate * 60;
  
  // Experience component (0-20 points)
  mastery += Math.min(totalAttempts / 10, 1) * 20;
  
  // Retention component (0-20 points)
  mastery += Math.min(repetitions / 5, 1) * 20;
  
  this.performance.masteryLevel = Math.round(mastery);
  return this.performance.masteryLevel;
};

export const StudentProgress = mongoose.model<IStudentProgress>(
  'StudentProgress',
  StudentProgressSchema
);

