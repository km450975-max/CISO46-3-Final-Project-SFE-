import mongoose from 'mongoose';

const activityEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    message: {
      type: String,
      default: '',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activityEventSchema.index({ createdAt: -1 });

export const ActivityEvent = mongoose.model('ActivityEvent', activityEventSchema);
