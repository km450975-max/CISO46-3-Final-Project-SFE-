import { env, IMAGE_HOST_ALLOWLIST } from '../../config/env.js';

export class BananaApiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BananaApiError';
  }
}

export function normalizeBananaPayload(data) {
  if (!data || typeof data !== 'object') {
    throw new BananaApiError('Banana API returned an empty payload');
  }

  const imageUrl = parseImageUrl(data.question);
  const solution = parseSolution(data.solution);
  return {
    externalId: imageUrl,
    imageUrl,
    solution,
    source: 'banana-api',
    fallback: false,
  };
}

function parseImageUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BananaApiError('Banana API did not include a puzzle image');
  }
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new BananaApiError('Banana API image URL is invalid');
  }
  if (url.protocol !== 'https:' || !IMAGE_HOST_ALLOWLIST.has(url.hostname)) {
    throw new BananaApiError('Banana API image host is not allowed');
  }
  return url.toString();
}

function parseSolution(value) {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  throw new BananaApiError('Banana API solution was not an integer');
}

export async function fetchLivePuzzle() {
  const url = new URL(env.bananaApiBaseUrl);
  url.searchParams.set('out', 'json');
  url.searchParams.set('base64', 'no');

  const headers = { accept: 'application/json' };
  if (env.bananaApiKey) headers['x-api-key'] = env.bananaApiKey;

  let response;
  try {
    response = await fetch(url, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(env.bananaApiTimeoutMs),
    });
  } catch (error) {
    throw new BananaApiError(error.name === 'TimeoutError' ? 'Banana API timed out' : 'Banana API could not be reached');
  }

  if (!response.ok) {
    throw new BananaApiError(`Banana API returned status ${response.status}`);
  }

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BananaApiError('Banana API did not return JSON');
  }
  return normalizeBananaPayload(data);
}
