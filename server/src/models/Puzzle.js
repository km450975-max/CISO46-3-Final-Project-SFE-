import mongoose from 'mongoose';

const puzzleSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      required: true,
      unique: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    solution: {
      type: Number,
      required: true,
    },
    source: {
      type: String,
      enum: ['banana-api', 'mock'],
      required: true,
    },
    fallback: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const Puzzle = mongoose.model('Puzzle', puzzleSchema);
