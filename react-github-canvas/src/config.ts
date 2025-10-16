// API configuration
const VITE_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || undefined;

// Prefer explicit VITE_API_BASE_URL (set in Vercel). If not provided, fall back to:
// - production: relative `/api` (assumes same origin proxying)
// - development: localhost API
export const API_BASE_URL = VITE_API_BASE_URL
  ? VITE_API_BASE_URL.replace(/\/$/, '')
  : import.meta.env.PROD
  ? '/api'
  : 'http://localhost:4000/api';