import mongoose, { Schema, Document } from 'mongoose';

/**
 * Enhanced UserQuestion model with repeat logic for spaced repetition
 * 
 * Rules:
 * - Questions can be repeated after MIN_DAYS_BEFORE_REPEAT (default: 30 days)
 * - Prioritize unseen questions, but allow repeats for spaced repetition
 * - Never repeat back-to-back
 */

export const MIN_DAYS_BEFORE_REPEAT = 30;

export interface IUserQuestion extends Document {
  userId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  shownAt: Date;
  answered: boolean;
  isCorrect: boolean | null;
  userAnswer: string | null;
  timeSpent: number;
  
  // NEW: Fields for repeat logic
  timesSeen: number; // How many times shown (default: 1)
  lastReviewDate?: Date; // When last used for spaced repetition
  canRepeatAfter: Date; // Earliest date to show again
  usedForReview: boolean; // Flag if used for spaced repetition review
  
  // NEW: Behavioral signals for automatic confidence
  hintsUsed: number;
  chatInteractions: number;
  
  // NEW: Calculated fields
  calculatedConfidence: number; // 1-5, automatically calculated
  bloomLevel?: number; // 1-6, which Bloom level was tested
  
  createdAt: Date;
  updatedAt: Date;
}

const UserQuestionSchema = new Schema<IUserQuestion>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      index: true,
    },
    shownAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    answered: {
      type: Boolean,
      default: false,
      index: true,
    },
    isCorrect: {
      type: Boolean,
      default: null,
    },
    userAnswer: {
      type: String,
      default: null,
    },
    timeSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // NEW: Repeat logic fields
    timesSeen: {
      type: Number,
      default: 1,
      min: 1,
    },
    lastReviewDate: {
      type: Date,
    },
    canRepeatAfter: {
      type: Date,
      default: function() {
        const date = new Date();
        date.setDate(date.getDate() + MIN_DAYS_BEFORE_REPEAT);
        return date;
      },
      index: true,
    },
    usedForReview: {
      type: Boolean,
      default: false,
    },
    
    // NEW: Behavioral signals
    hintsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    chatInteractions: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // NEW: Calculated fields
    calculatedConfidence: {
      type: Number,
      default: 3,
      min: 1,
      max: 5,
    },
    bloomLevel: {
      type: Number,
      min: 1,
      max: 6,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
UserQuestionSchema.index({ userId: 1, questionId: 1 }, { unique: true });
UserQuestionSchema.index({ userId: 1, answered: 1 });
UserQuestionSchema.index({ userId: 1, shownAt: -1 });
UserQuestionSchema.index({ userId: 1, canRepeatAfter: 1 }); // For finding questions eligible for repeat
UserQuestionSchema.index({ userId: 1, usedForReview: 1 });
UserQuestionSchema.index({ userId: 1, bloomLevel: 1 });

// Static method to check if a question can be repeated for a user
UserQuestionSchema.statics.canRepeat = async function(
  userId: mongoose.Types.ObjectId,
  questionId: mongoose.Types.ObjectId
): Promise<boolean> {
  const userQuestion = await this.findOne({ userId, questionId });
  if (!userQuestion) return true; // Never seen, can show
  
  const now = new Date();
  return userQuestion.canRepeatAfter <= now;
};

// Static method to get questions eligible for repeat
UserQuestionSchema.statics.getRepeatableQuestions = async function(
  userId: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId[]> {
  const now = new Date();
  const questions = await this.find({
    userId,
    answered: true,
    canRepeatAfter: { $lte: now },
  }).select('questionId');
  
  return questions.map((q: IUserQuestion) => q.questionId);
};

export const UserQuestion = mongoose.model<IUserQuestion>('UserQuestion', UserQuestionSchema);
