import mongoose, { Schema, Document } from 'mongoose';

export interface IUserQuestion extends Document {
  userId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  shownAt: Date;
  answered: boolean;
  isCorrect: boolean | null;
  userAnswer: string | null;
  timeSpent: number;
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
  },
  {
    timestamps: true,
  }
);

// Compound indexes
UserQuestionSchema.index({ userId: 1, questionId: 1 }, { unique: true });
UserQuestionSchema.index({ userId: 1, answered: 1 });
UserQuestionSchema.index({ userId: 1, shownAt: -1 });

export const UserQuestion = mongoose.model<IUserQuestion>('UserQuestion', UserQuestionSchema);

