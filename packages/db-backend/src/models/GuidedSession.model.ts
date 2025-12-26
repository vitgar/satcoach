import mongoose, { Schema, Document } from 'mongoose';

/**
 * Guided Session Model
 * 
 * Tracks guided review sessions where the AI tutor helps students
 * study specific topics based on their performance history.
 * Separate from practice sessions (/study) to enable comprehensive
 * learning analytics across all interaction types.
 */

export interface ChatMessageEntry {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface QuestionAttempt {
  questionId: mongoose.Types.ObjectId;
  questionText: string;
  presentedAt: Date;
  studentAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean | null;
  answeredAt: Date | null;
  timeSpent: number; // seconds
  hintsUsed: number;
}

export interface SessionOutcomes {
  conceptsCovered: string[];
  conceptsMastered: string[];
  conceptsNeedingWork: string[];
  questionsAttempted: number;
  questionsCorrect: number;
  engagementScore: number; // 0-100
  bloomLevelReached: number; // 1-6
}

export interface IGuidedSession extends Document {
  userId: mongoose.Types.ObjectId;
  subject: string;
  topic: string;
  startTime: Date;
  endTime: Date | null;
  isActive: boolean;
  
  // Chat thread for this topic
  chatHistory: ChatMessageEntry[];
  
  // Questions presented during review
  questionsPresented: QuestionAttempt[];
  
  // Session outcomes
  outcomes: SessionOutcomes;
  
  // AI analysis
  sessionSummary: string | null;
  recommendedNextSteps: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageEntrySchema = new Schema<ChatMessageEntry>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const QuestionAttemptSchema = new Schema<QuestionAttempt>(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    presentedAt: {
      type: Date,
      default: Date.now,
    },
    studentAnswer: {
      type: String,
      default: null,
    },
    correctAnswer: {
      type: String,
      required: true,
    },
    isCorrect: {
      type: Boolean,
      default: null,
    },
    answeredAt: {
      type: Date,
      default: null,
    },
    timeSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    hintsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const SessionOutcomesSchema = new Schema<SessionOutcomes>(
  {
    conceptsCovered: [{
      type: String,
      trim: true,
    }],
    conceptsMastered: [{
      type: String,
      trim: true,
    }],
    conceptsNeedingWork: [{
      type: String,
      trim: true,
    }],
    questionsAttempted: {
      type: Number,
      default: 0,
      min: 0,
    },
    questionsCorrect: {
      type: Number,
      default: 0,
      min: 0,
    },
    engagementScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    bloomLevelReached: {
      type: Number,
      default: 1,
      min: 1,
      max: 6,
    },
  },
  { _id: false }
);

const GuidedSessionSchema = new Schema<IGuidedSession>(
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
      enum: ['Math', 'Reading', 'Writing'],
      index: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    chatHistory: {
      type: [ChatMessageEntrySchema],
      default: [],
    },
    questionsPresented: {
      type: [QuestionAttemptSchema],
      default: [],
    },
    outcomes: {
      type: SessionOutcomesSchema,
      default: () => ({
        conceptsCovered: [],
        conceptsMastered: [],
        conceptsNeedingWork: [],
        questionsAttempted: 0,
        questionsCorrect: 0,
        engagementScore: 50,
        bloomLevelReached: 1,
      }),
    },
    sessionSummary: {
      type: String,
      default: null,
    },
    recommendedNextSteps: [{
      type: String,
      trim: true,
    }],
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
GuidedSessionSchema.index({ userId: 1, subject: 1, isActive: 1 });
GuidedSessionSchema.index({ userId: 1, topic: 1 });
GuidedSessionSchema.index({ userId: 1, startTime: -1 });
GuidedSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // TTL: 90 days

/**
 * Calculate session duration in minutes
 */
GuidedSessionSchema.methods.getDurationMinutes = function (): number {
  const endTime = this.endTime || new Date();
  return Math.round((endTime.getTime() - this.startTime.getTime()) / 60000);
};

/**
 * Get accuracy rate for the session
 */
GuidedSessionSchema.methods.getAccuracyRate = function (): number {
  if (this.outcomes.questionsAttempted === 0) return 0;
  return this.outcomes.questionsCorrect / this.outcomes.questionsAttempted;
};

/**
 * Add a message to chat history
 */
GuidedSessionSchema.methods.addMessage = function (
  role: 'user' | 'assistant',
  content: string
): void {
  this.chatHistory.push({
    role,
    content,
    timestamp: new Date(),
  });
};

/**
 * Record a question attempt
 */
GuidedSessionSchema.methods.recordQuestionAttempt = function (
  questionId: mongoose.Types.ObjectId,
  questionText: string,
  correctAnswer: string,
  studentAnswer: string | null,
  isCorrect: boolean | null,
  timeSpent: number
): void {
  // Check if question was already presented
  const existing = this.questionsPresented.find(
    (q: QuestionAttempt) => q.questionId.toString() === questionId.toString()
  );

  if (existing) {
    // Update existing
    existing.studentAnswer = studentAnswer;
    existing.isCorrect = isCorrect;
    existing.answeredAt = new Date();
    existing.timeSpent = timeSpent;
  } else {
    // Add new
    this.questionsPresented.push({
      questionId,
      questionText,
      presentedAt: new Date(),
      studentAnswer,
      correctAnswer,
      isCorrect,
      answeredAt: studentAnswer ? new Date() : null,
      timeSpent,
      hintsUsed: 0,
    });
  }

  // Update outcomes
  if (isCorrect !== null) {
    this.outcomes.questionsAttempted = this.questionsPresented.filter(
      (q: QuestionAttempt) => q.isCorrect !== null
    ).length;
    this.outcomes.questionsCorrect = this.questionsPresented.filter(
      (q: QuestionAttempt) => q.isCorrect === true
    ).length;
  }
};

export const GuidedSession = mongoose.model<IGuidedSession>('GuidedSession', GuidedSessionSchema);


