import axios from 'axios';

// Utiliser PRIORITAIREMENT la variable d'env, même en dev
const isBrowser = typeof window !== 'undefined';
const isDev = process.env.NODE_ENV !== 'production';
const envBase = process.env.NEXT_PUBLIC_API_URL;

const instance = axios.create({
  baseURL: envBase || (isBrowser && isDev ? '' : undefined),
  headers: {
    'Content-Type': 'application/json',
  },
});

export default instance;
