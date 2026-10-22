import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return error?.response?.data?.error?.message || fallback;
}

export function getFieldErrors(error) {
  const details = error?.response?.data?.error?.details;
  if (!Array.isArray(details)) return {};
  return Object.fromEntries(
    details.map((item) => [String(item.path || '').replace(/^body\./, ''), item.message]),
  );
}

export function mediaUrl(imagePath) {
  if (!imagePath) return '';
  const configured = import.meta.env.VITE_API_URL || '';
  if (configured.startsWith('http')) {
    return `${new URL(configured).origin}${imagePath}`;
  }
  return imagePath;
}

export default api;
