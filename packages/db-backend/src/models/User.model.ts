import mongoose, { Schema, Document, Types } from 'mongoose';

export type LearningStyleType = 'visual' | 'verbal' | 'procedural' | 'conceptual' | 'mixed';
export type ExplanationStyleType = 'simple' | 'detailed' | 'examples' | 'theory';

export interface CommunicationProfile {
  dominantLearningStyle: LearningStyleType;
  averageVocabularyLevel: number;
  commonConceptGaps: string[];
  preferredExplanationStyle: ExplanationStyleType;
  frustrationTriggers: string[];
  lastUpdated: Date | null;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'admin';
  learningProfile: {
    currentLevel: number;
    preferredDifficulty: 'easy' | 'medium' | 'hard';
    adaptiveSettings: {
      autoAdjust: boolean;
      adjustmentSpeed: number;
    };
    communicationProfile: CommunicationProfile;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    learningProfile: {
      currentLevel: {
        type: Number,
        default: 5,
        min: 1,
        max: 10,
      },
      preferredDifficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
      },
      adaptiveSettings: {
        autoAdjust: {
          type: Boolean,
          default: true,
        },
        adjustmentSpeed: {
          type: Number,
          default: 3,
          min: 1,
          max: 5,
        },
      },
      communicationProfile: {
        dominantLearningStyle: {
          type: String,
          enum: ['visual', 'verbal', 'procedural', 'conceptual', 'mixed'],
          default: 'mixed',
        },
        averageVocabularyLevel: {
          type: Number,
          default: 8,
          min: 1,
          max: 12,
        },
        commonConceptGaps: [{
          type: String,
          trim: true,
        }],
        preferredExplanationStyle: {
          type: String,
          enum: ['simple', 'detailed', 'examples', 'theory'],
          default: 'examples',
        },
        frustrationTriggers: [{
          type: String,
          trim: true,
        }],
        lastUpdated: {
          type: Date,
          default: null,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
// Note: email index is already created by unique: true
UserSchema.index({ createdAt: 1 });

// Don't return password in JSON responses
UserSchema.methods.toJSON = function (this: IUser) {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export const User = mongoose.model<IUser>('User', UserSchema);

