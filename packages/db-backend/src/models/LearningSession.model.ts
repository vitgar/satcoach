import mongoose, { Schema, Document } from 'mongoose';

/**
 * Tracks complete learning sessions with Flow states and engagement metrics
 */

export type FlowZone = 'boredom' | 'flow' | 'anxiety';
export type SessionType = 'study' | 'review' | 'practice' | 'explanation';

export interface FlowState {
  timestamp: Date;
  challenge: number; // 1-10
  skill: number; // 1-10
  flowZone: FlowZone;
  activity: string; // What they were doing
}

export interface SessionAdaptation {
  timestamp: Date;
  type: 'difficulty' | 'hint' | 'pacing' | 'content' | 'break';
  reason: string;
  adjustment: string;
}

export interface SessionEngagement {
  pauses: number;
  averagePauseDuration: number; // seconds
  totalPauseTime: number; // seconds
  retries: number;
  skips: number;
  focusScore: number; // 0-100
}

export interface SessionOutcomes {
  conceptsMastered: number;
  bloomLevelsProgressed: number;
  explanationsGiven: number;
  averageFeynmanQuality: number; // 0-100
  flowTime: number; // minutes in flow
  flowPercentage: number; // % of session in flow
  questionsCorrect: number;
  questionsAttempted: number;
}

export interface ILearningSession extends Document {
  userId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  duration?: number; // minutes
  
  // Session Structure
  sessionType: SessionType;
  conceptsCovered: mongoose.Types.ObjectId[];
  questionsAttempted: mongoose.Types.ObjectId[];
  subjects: string[];
  
  // Flow Tracking
  flowStates: FlowState[];
  currentFlowZone: FlowZone;
  
  // Engagement Metrics
  engagement: SessionEngagement;
  
  // Learning Outcomes
  outcomes: SessionOutcomes;
  
  // Adaptations Made
  adaptations: SessionAdaptation[];
  
  // Aggregate Flow Metrics
  averageFlowScore: number; // 0-100
  timeInFlow: number; // minutes
  timeInBoredom: number; // minutes
  timeInAnxiety: number; // minutes
  
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  addFlowState: (state: Omit<FlowState, 'timestamp'>) => ILearningSession;
  endSession: () => ILearningSession;
  calculateFlowMetrics: () => void;
}

const FlowStateSchema = new Schema<FlowState>({
  timestamp: { type: Date, default: Date.now },
  challenge: { type: Number, min: 1, max: 10 },
  skill: { type: Number, min: 1, max: 10 },
  flowZone: { type: String, enum: ['boredom', 'flow', 'anxiety'] },
  activity: { type: String },
}, { _id: false });

const SessionAdaptationSchema = new Schema<SessionAdaptation>({
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ['difficulty', 'hint', 'pacing', 'content', 'break'] },
  reason: { type: String },
  adjustment: { type: String },
}, { _id: false });

const LearningSessionSchema = new Schema<ILearningSession>(
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
    },
    duration: {
      type: Number,
      min: 0,
    },
    
    sessionType: {
      type: String,
      enum: ['study', 'review', 'practice', 'explanation'],
      default: 'study',
      index: true,
    },
    conceptsCovered: [{
      type: Schema.Types.ObjectId,
      ref: 'Concept',
    }],
    questionsAttempted: [{
      type: Schema.Types.ObjectId,
      ref: 'Question',
    }],
    subjects: [{
      type: String,
      enum: ['math', 'reading', 'writing'],
    }],
    
    flowStates: [FlowStateSchema],
    currentFlowZone: {
      type: String,
      enum: ['boredom', 'flow', 'anxiety'],
      default: 'flow',
    },
    
    engagement: {
      pauses: { type: Number, default: 0, min: 0 },
      averagePauseDuration: { type: Number, default: 0, min: 0 },
      totalPauseTime: { type: Number, default: 0, min: 0 },
      retries: { type: Number, default: 0, min: 0 },
      skips: { type: Number, default: 0, min: 0 },
      focusScore: { type: Number, default: 100, min: 0, max: 100 },
    },
    
    outcomes: {
      conceptsMastered: { type: Number, default: 0, min: 0 },
      bloomLevelsProgressed: { type: Number, default: 0, min: 0 },
      explanationsGiven: { type: Number, default: 0, min: 0 },
      averageFeynmanQuality: { type: Number, default: 0, min: 0, max: 100 },
      flowTime: { type: Number, default: 0, min: 0 },
      flowPercentage: { type: Number, default: 0, min: 0, max: 100 },
      questionsCorrect: { type: Number, default: 0, min: 0 },
      questionsAttempted: { type: Number, default: 0, min: 0 },
    },
    
    adaptations: [SessionAdaptationSchema],
    
    averageFlowScore: { type: Number, default: 0, min: 0, max: 100 },
    timeInFlow: { type: Number, default: 0, min: 0 },
    timeInBoredom: { type: Number, default: 0, min: 0 },
    timeInAnxiety: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  }
);

// Indexes
LearningSessionSchema.index({ userId: 1, startTime: -1 });
LearningSessionSchema.index({ userId: 1, sessionType: 1 });
LearningSessionSchema.index({ userId: 1, endTime: 1 }); // Find active sessions (endTime: null)
LearningSessionSchema.index({ averageFlowScore: 1 });

// Add a flow state during the session
LearningSessionSchema.methods.addFlowState = function(
  this: ILearningSession,
  state: Omit<FlowState, 'timestamp'>
) {
  this.flowStates.push({
    ...state,
    timestamp: new Date(),
  });
  this.currentFlowZone = state.flowZone;
  return this;
};

// End the session and calculate final metrics
LearningSessionSchema.methods.endSession = function(this: ILearningSession) {
  this.endTime = new Date();
  this.duration = Math.round((this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60));
  this.calculateFlowMetrics();
  return this;
};

// Calculate aggregate flow metrics
LearningSessionSchema.methods.calculateFlowMetrics = function(this: ILearningSession) {
  if (this.flowStates.length === 0) return;
  
  let totalFlowScore = 0;
  let flowTime = 0;
  let boredomTime = 0;
  let anxietyTime = 0;
  
  for (let i = 0; i < this.flowStates.length; i++) {
    const state = this.flowStates[i];
    
    // Calculate flow score for this state (higher when challenge ≈ skill)
    const distance = Math.abs(state.challenge - state.skill);
    const flowScore = Math.max(0, 100 - (distance * 20));
    totalFlowScore += flowScore;
    
    // Calculate time in each zone (estimate based on next state or 5 min default)
    const nextTimestamp = this.flowStates[i + 1]?.timestamp || this.endTime || new Date();
    const duration = (nextTimestamp.getTime() - state.timestamp.getTime()) / (1000 * 60); // minutes
    
    switch (state.flowZone) {
      case 'flow':
        flowTime += duration;
        break;
      case 'boredom':
        boredomTime += duration;
        break;
      case 'anxiety':
        anxietyTime += duration;
        break;
    }
  }
  
  this.averageFlowScore = Math.round(totalFlowScore / this.flowStates.length);
  this.timeInFlow = Math.round(flowTime);
  this.timeInBoredom = Math.round(boredomTime);
  this.timeInAnxiety = Math.round(anxietyTime);
  
  // Update outcomes
  this.outcomes.flowTime = this.timeInFlow;
  const totalTime = flowTime + boredomTime + anxietyTime;
  this.outcomes.flowPercentage = totalTime > 0 ? Math.round((flowTime / totalTime) * 100) : 0;
};

export const LearningSession = mongoose.model<ILearningSession>(
  'LearningSession',
  LearningSessionSchema
);

