// API configuration
export const API_BASE_URL = import.meta.env.PROD 
  ? '/api' // In production, use relative path
  : 'http://localhost:4000/api'; // In development, use full URL