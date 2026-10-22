import { Achievement } from '../../models/Achievement.js';
import { GameAttempt } from '../../models/GameAttempt.js';
import { ACHIEVEMENTS } from '../../services/scoring/rules.js';
import { ApiError } from '../../utils/ApiError.js';

async function award(userId, type, unlocked) {
  if (!ACHIEVEMENTS[type]) return;
  try {
    const doc = await Achievement.create({ user: userId, type, awardedAt: new Date() });
    unlocked.push({
      type,
      title: ACHIEVEMENTS[type].title,
      description: ACHIEVEMENTS[type].description,
      awardedAt: doc.awardedAt,
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
}

/**
 * Persists the graded round. This handler is the only writer of attempts,
 * session score, and ranked career totals.
 */
export async function onAnswerOutcome(event) {
  const { session, user, puzzle, outcome } = event;
  if (!session || !user || !puzzle || !outcome) {
    throw new ApiError(500, 'EVENT_PAYLOAD', 'Answer outcome is incomplete');
  }

  try {
    await GameAttempt.create({
      user: user._id,
      session: session._id,
      puzzle: puzzle._id,
      roundNumber: session.currentRound,
      submittedAnswer: outcome.submittedAnswer,
      correct: outcome.correct,
      timedOut: outcome.timedOut,
      pointsAwarded: outcome.points,
      breakdown: outcome.breakdown,
      hintUsed: outcome.hintUsed,
      submittedAt: outcome.submittedAt,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, 'DUPLICATE_SUBMISSION', 'This round has already been submitted.');
    }
    throw error;
  }

  session.score += outcome.points;
  session.currentStreak = outcome.newStreak;
  session.bestStreak = Math.max(session.bestStreak, outcome.newStreak);
  session.resolvedRounds += 1;
  if (outcome.correct) session.correctCount += 1;

  const ranked = session.mode === 'ranked';
  if (ranked) {
    user.totalScore += outcome.points;
    user.currentStreak = outcome.newStreak;
    user.bestStreak = Math.max(user.bestStreak, outcome.newStreak);
    if (outcome.correct) user.puzzlesCompleted += 1;
  }

  if (event.isFinalRound) {
    session.status = 'completed';
    session.endedAt = outcome.submittedAt;
    if (ranked) user.gamesPlayed += 1;
  }

  await session.save();
  await user.save();

  const unlocked = [];
  if (ranked) {
    if (outcome.correct && user.puzzlesCompleted === 1) await award(user._id, 'first_steps', unlocked);
    if (user.currentStreak >= 5) await award(user._id, 'streak_5', unlocked);
    if (user.currentStreak >= 10) await award(user._id, 'streak_10', unlocked);
    if (user.totalScore >= 100) await award(user._id, 'century', unlocked);
    if (event.isFinalRound && user.gamesPlayed >= 5) await award(user._id, 'dedicated', unlocked);
    if (event.isFinalRound && session.correctCount === session.totalRounds) {
      await award(user._id, 'perfect_game', unlocked);
    }
  }
  if (!event.shared) event.shared = {};
  event.shared.unlockedAchievements = unlocked;
  event.shared.leaderboardChanged = ranked && outcome.points > 0;
}
