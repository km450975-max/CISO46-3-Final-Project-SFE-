import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 40,
      default: '',
    },
    avatarKey: {
      type: String,
      enum: ['banana', 'ocean', 'forest', 'sunset', 'grape', 'slate'],
      default: 'banana',
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
      index: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    totalScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    bestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
    gamesPlayed: {
      type: Number,
      default: 0,
      min: 0,
    },
    puzzlesCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

userSchema.index({ totalScore: -1, bestStreak: -1, createdAt: 1 });

export const User = mongoose.model('User', userSchema);
