import { ActivityEvent } from '../../models/ActivityEvent.js';
import { logger } from '../../utils/logger.js';

export async function onActivity(event) {
  try {
    await ActivityEvent.create({
      type: event.eventName,
      user: event.userId || event.user?._id,
      message: event.message || '',
    });
  } catch (error) {
    logger.error('Activity log failed', error.message);
  }
}
