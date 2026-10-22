import mongoose from 'mongoose';

const gameAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GameSession',
      required: true,
    },
    puzzle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Puzzle',
      required: true,
    },
    roundNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    submittedAnswer: {
      type: String,
      default: '',
    },
    correct: {
      type: Boolean,
      required: true,
    },
    timedOut: {
      type: Boolean,
      default: false,
    },
    pointsAwarded: {
      type: Number,
      required: true,
      min: 0,
    },
    breakdown: {
      base: { type: Number, default: 0 },
      speed: { type: Number, default: 0 },
      streak: { type: Number, default: 0 },
      hint: { type: Number, default: 0 },
    },
    hintUsed: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

gameAttemptSchema.index({ session: 1, roundNumber: 1 }, { unique: true });

export const GameAttempt = mongoose.model('GameAttempt', gameAttemptSchema);
