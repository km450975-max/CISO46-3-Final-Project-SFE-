import { eventBus } from './eventBus.js';
import { onActivity } from './handlers/activity.js';
import { onAnswerOutcome } from './handlers/answerOutcome.js';

const ACTIVITY_EVENTS = [
  'user.registered',
  'user.logged_in',
  'puzzle.loaded',
  'answer.submitted',
  'answer.correct',
  'answer.incorrect',
  'round.completed',
  'round.expired',
  'score.updated',
  'streak.updated',
  'leaderboard.updated',
];

let registered = false;

export function registerEventHandlers() {
  if (registered) return;
  registered = true;

  eventBus.on('answer.correct', onAnswerOutcome);
  eventBus.on('answer.incorrect', onAnswerOutcome);
  eventBus.on('round.expired', onAnswerOutcome);

  for (const eventName of ACTIVITY_EVENTS) {
    eventBus.on(eventName, onActivity);
  }
}
