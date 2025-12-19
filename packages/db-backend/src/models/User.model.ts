import mongoose, { Schema, Document, Types } from 'mongoose';

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

