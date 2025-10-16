import axios from 'axios';

// En navigateur, on laisse l'URL relative pour passer par le proxy Next (rewrites)
// En environnement non-navigateur (SSR/Node), on utilise l'URL d'API explicite
const isBrowser = typeof window !== 'undefined';

const instance = axios.create({
  baseURL: isBrowser ? '' : process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default instance;
