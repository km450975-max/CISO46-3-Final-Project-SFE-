import { env, IMAGE_HOST_ALLOWLIST } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

async function fetchAllowlisted(url, hops = 0) {
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(env.bananaApiTimeoutMs),
  });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (hops >= 2) {
      throw new ApiError(502, 'IMAGE_UNAVAILABLE', 'The puzzle image could not be loaded.');
    }
    const location = response.headers.get('location');
    if (!location) {
      throw new ApiError(502, 'IMAGE_UNAVAILABLE', 'The puzzle image could not be loaded.');
    }
    const next = new URL(location, url);
    if (next.protocol !== 'https:' || !IMAGE_HOST_ALLOWLIST.has(next.hostname)) {
      throw new ApiError(502, 'IMAGE_BLOCKED', 'This puzzle image host is not allowed.');
    }
    return fetchAllowlisted(next, hops + 1);
  }
  return response;
}

export async function sendPuzzleImage(puzzle, res) {
  if (puzzle.imageUrl.startsWith('data:image/svg+xml;base64,')) {
    const base64 = puzzle.imageUrl.slice('data:image/svg+xml;base64,'.length);
    res.set('Content-Type', 'image/svg+xml; charset=utf-8');
    res.set('Cache-Control', 'private, max-age=3600');
    res.set('X-Content-Type-Options', 'nosniff');
    res.send(Buffer.from(base64, 'base64'));
    return;
  }

  let url;
  try {
    url = new URL(puzzle.imageUrl);
  } catch {
    throw new ApiError(502, 'IMAGE_UNAVAILABLE', 'The stored puzzle image is invalid.');
  }
  if (url.protocol !== 'https:' || !IMAGE_HOST_ALLOWLIST.has(url.hostname)) {
    throw new ApiError(502, 'IMAGE_BLOCKED', 'This puzzle image host is not allowed.');
  }

  let response;
  try {
    response = await fetchAllowlisted(url);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, 'IMAGE_UNAVAILABLE', 'The puzzle image could not be loaded.');
  }

  if (!response.ok) {
    throw new ApiError(502, 'IMAGE_UNAVAILABLE', 'The puzzle image could not be loaded.');
  }
  const type = response.headers.get('content-type') || '';
  if (!type.startsWith('image/')) {
    throw new ApiError(502, 'IMAGE_UNAVAILABLE', 'The puzzle service did not return an image.');
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  res.set('Content-Type', type.split(';')[0]);
  res.set('Cache-Control', 'private, max-age=3600');
  res.set('X-Content-Type-Options', 'nosniff');
  res.send(buffer);
}
