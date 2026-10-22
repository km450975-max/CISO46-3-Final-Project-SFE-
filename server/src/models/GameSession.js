import mongoose from 'mongoose';
import { SCORING_RULES } from '../services/scoring/rules.js';

const gameSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mode: {
      type: String,
      enum: ['ranked', 'practice'],
      required: true,
    },
    difficulty: {
      type: String,
      enum: Object.keys(SCORING_RULES.difficulties),
      required: true,
    },
    currentRound: {
      type: Number,
      default: 1,
      min: 1,
    },
    totalRounds: {
      type: Number,
      default: SCORING_RULES.roundsPerGame,
      min: 1,
    },
    basePoints: {
      type: Number,
      default: 10,
      min: 1,
    },
    score: {
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
    correctCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    resolvedRounds: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
      index: true,
    },
    currentPuzzle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Puzzle',
    },
    roundStartedAt: Date,
    roundEndsAt: Date,
    hintUsed: {
      type: Boolean,
      default: false,
    },
    hintText: {
      type: String,
      default: '',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: Date,
  },
  { timestamps: true },
);

gameSessionSchema.index({ user: 1, startedAt: -1 });
gameSessionSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);

export const GameSession = mongoose.model('GameSession', gameSessionSchema);
