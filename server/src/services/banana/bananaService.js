import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';
import { fetchLivePuzzle } from './liveBanana.js';
import { nextMockPuzzle } from './mockBanana.js';

let override = null;

export function setBananaProviderForTests(provider) {
  override = provider;
}

export function resetBananaProvider() {
  override = null;
}

/**
 * Adapter used by the game. Live mode calls the Banana Game API.
 * Mock mode returns clearly labelled local puzzles for tests and offline demos.
 * The numeric solution stays inside this process and is not part of the public puzzle DTO.
 */
export async function fetchBananaPuzzle() {
  try {
    if (override) return await override();
    if (env.bananaApiMode === 'mock') return nextMockPuzzle();
    return await fetchLivePuzzle();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.warn('Banana API request failed', error.message);
    if (env.bananaApiFallback) {
      const puzzle = nextMockPuzzle();
      return { ...puzzle, fallback: true, source: 'mock' };
    }
    throw new ApiError(
      503,
      'BANANA_API_UNAVAILABLE',
      'The Banana puzzle service is temporarily unavailable. Please try again.',
    );
  }
}

export async function checkBananaHealth() {
  if (env.bananaApiMode === 'mock') {
    return {
      mode: 'mock',
      status: 'simulated',
      message: 'The server is using the local simulated puzzle adapter.',
    };
  }
  try {
    await fetchLivePuzzle();
    return {
      mode: 'live',
      status: 'up',
      message: 'The Banana API returned a puzzle. The solution was not stored by this check.',
    };
  } catch (error) {
    return {
      mode: 'live',
      status: 'down',
      message: 'The Banana API could not be reached.',
    };
  }
}
