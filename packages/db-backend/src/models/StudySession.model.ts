import mongoose, { Schema, Document } from 'mongoose';

export interface IStudySession extends Document {
  userId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date | null;
  questionsAttempted: mongoose.Types.ObjectId[];
  questionsCorrect: mongoose.Types.ObjectId[];
  totalTimeSpent: number;
  subjects: string[];
  averageConfidence: number;
  timerUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
  endSession: () => IStudySession;
  addQuestionAttempt: (
    questionId: mongoose.Types.ObjectId,
    isCorrect: boolean,
    subject: string
  ) => IStudySession;
}

const StudySessionSchema = new Schema<IStudySession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    endTime: {
      type: Date,
      default: null,
      index: true,
    },
    questionsAttempted: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    questionsCorrect: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    totalTimeSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    subjects: [
      {
        type: String,
        enum: ['math', 'reading', 'writing'],
      },
    ],
    averageConfidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    timerUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
StudySessionSchema.index({ userId: 1, startTime: -1 });
StudySessionSchema.index({ userId: 1, endTime: 1 });
StudySessionSchema.index({ userId: 1, startTime: -1, endTime: 1 });

// Instance method to end session
StudySessionSchema.methods.endSession = function (this: IStudySession) {
  this.endTime = new Date();
  this.totalTimeSpent = Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000);
  return this;
};

// Instance method to add question attempt
StudySessionSchema.methods.addQuestionAttempt = function (
  this: IStudySession,
  questionId: mongoose.Types.ObjectId,
  isCorrect: boolean,
  subject: string
) {
  this.questionsAttempted.push(questionId);
  
  if (isCorrect) {
    this.questionsCorrect.push(questionId);
  }
  
  if (!this.subjects.includes(subject)) {
    this.subjects.push(subject);
  }
  
  return this;
};

export const StudySession = mongoose.model<IStudySession>('StudySession', StudySessionSchema);

