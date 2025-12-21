import mongoose, { Schema, Document } from 'mongoose';

/**
 * Chat Session Model
 * 
 * Stores aggregated insights from chat conversations, not individual messages.
 * Used to build communication profiles and adapt learning experiences.
 */

export type Sentiment = 'frustrated' | 'confused' | 'confident' | 'bored' | 'neutral';
export type LearningStyle = 'visual' | 'verbal' | 'procedural' | 'conceptual' | 'mixed';
export type QuestionQuality = 'vague' | 'specific' | 'mixed';

export interface LearningStyleSignals {
  visual: number;
  verbal: number;
  procedural: number;
  conceptual: number;
}

export interface ChatSessionInsights {
  dominantSentiment: Sentiment;
  sentimentProgression: Sentiment[];
  conceptsAsked: string[];
  conceptGaps: string[];
  learningStyleSignals: LearningStyleSignals;
  vocabularyLevel: number; // Grade level 1-12
  questionQuality: QuestionQuality;
  engagementScore: number; // 0-100
}

export interface IChatSession extends Document {
  userId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  sessionId?: mongoose.Types.ObjectId; // Links to LearningSession
  startTime: Date;
  endTime?: Date;
  messageCount: number;
  insights: ChatSessionInsights;
  adaptationsApplied: string[];
  createdAt: Date;
  updatedAt: Date;
}

const LearningStyleSignalsSchema = new Schema<LearningStyleSignals>(
  {
    visual: { type: Number, default: 0, min: 0 },
    verbal: { type: Number, default: 0, min: 0 },
    procedural: { type: Number, default: 0, min: 0 },
    conceptual: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const ChatSessionInsightsSchema = new Schema<ChatSessionInsights>(
  {
    dominantSentiment: {
      type: String,
      enum: ['frustrated', 'confused', 'confident', 'bored', 'neutral'],
      default: 'neutral',
    },
    sentimentProgression: [
      {
        type: String,
        enum: ['frustrated', 'confused', 'confident', 'bored', 'neutral'],
      },
    ],
    conceptsAsked: [{ type: String, trim: true }],
    conceptGaps: [{ type: String, trim: true }],
    learningStyleSignals: {
      type: LearningStyleSignalsSchema,
      default: () => ({ visual: 0, verbal: 0, procedural: 0, conceptual: 0 }),
    },
    vocabularyLevel: {
      type: Number,
      default: 8,
      min: 1,
      max: 12,
    },
    questionQuality: {
      type: String,
      enum: ['vague', 'specific', 'mixed'],
      default: 'mixed',
    },
    engagementScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const ChatSessionSchema = new Schema<IChatSession>(
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
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'LearningSession',
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    messageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    insights: {
      type: ChatSessionInsightsSchema,
      default: () => ({
        dominantSentiment: 'neutral',
        sentimentProgression: [],
        conceptsAsked: [],
        conceptGaps: [],
        learningStyleSignals: { visual: 0, verbal: 0, procedural: 0, conceptual: 0 },
        vocabularyLevel: 8,
        questionQuality: 'mixed',
        engagementScore: 50,
      }),
    },
    adaptationsApplied: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
ChatSessionSchema.index({ userId: 1, startTime: -1 });
ChatSessionSchema.index({ userId: 1, questionId: 1 });
ChatSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // TTL: 30 days

/**
 * Calculate dominant sentiment from progression
 */
ChatSessionSchema.methods.calculateDominantSentiment = function (): Sentiment {
  const progression = this.insights.sentimentProgression;
  if (progression.length === 0) return 'neutral';

  const counts: Record<Sentiment, number> = {
    frustrated: 0,
    confused: 0,
    confident: 0,
    bored: 0,
    neutral: 0,
  };

  progression.forEach((s: Sentiment) => {
    counts[s]++;
  });

  // Weight negative sentiments higher (they're more important to detect)
  const weightedCounts = {
    frustrated: counts.frustrated * 1.5,
    confused: counts.confused * 1.3,
    confident: counts.confident * 1.0,
    bored: counts.bored * 1.2,
    neutral: counts.neutral * 0.8,
  };

  let maxSentiment: Sentiment = 'neutral';
  let maxCount = 0;

  Object.entries(weightedCounts).forEach(([sentiment, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxSentiment = sentiment as Sentiment;
    }
  });

  return maxSentiment;
};

/**
 * Detect dominant learning style from signals
 */
ChatSessionSchema.methods.getDominantLearningStyle = function (): LearningStyle {
  const signals = this.insights.learningStyleSignals;
  const total = signals.visual + signals.verbal + signals.procedural + signals.conceptual;

  if (total < 3) return 'mixed'; // Not enough data

  const max = Math.max(signals.visual, signals.verbal, signals.procedural, signals.conceptual);

  // Need at least 40% dominance to declare a style
  if (max / total < 0.4) return 'mixed';

  if (signals.visual === max) return 'visual';
  if (signals.verbal === max) return 'verbal';
  if (signals.procedural === max) return 'procedural';
  if (signals.conceptual === max) return 'conceptual';

  return 'mixed';
};

export const ChatSession = mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);

