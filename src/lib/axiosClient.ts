// lib/axiosClient.ts
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosHeaders
} from 'axios';

const isBrowser = typeof window !== 'undefined';
const isDev = process.env.NODE_ENV !== 'production';
const envBase = process.env.NEXT_PUBLIC_API_URL;

const axiosClient: AxiosInstance = axios.create({
  baseURL: envBase || (isBrowser && isDev ? '' : undefined),
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Correction du type pour l'intercepteur de requête
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('accessToken');
      config.headers = config.headers || new AxiosHeaders();
      
      if (accessToken) {
        config.headers.set('Authorization', `Bearer ${accessToken}`);
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Correction du type pour l'intercepteur de réponse
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalReq = error.config as InternalAxiosRequestConfig & { 
      _retry?: boolean 
    };

    if (error.response?.status === 401 && !originalReq?._retry) {
      try {
        if (typeof window !== 'undefined') {
          originalReq._retry = true;
          const refreshToken = localStorage.getItem('refreshToken');

          if (refreshToken) {
            const { data } = await axiosClient.post<{
              access: string;
              refresh?: string;
            }>(
              '/api/token/refresh/',
              { refresh: refreshToken }
            );

            localStorage.setItem('accessToken', data.access);
            if (data.refresh) {
              localStorage.setItem('refreshToken', data.refresh);
            }

            originalReq.headers = originalReq.headers || new AxiosHeaders();
            originalReq.headers.set('Authorization', `Bearer ${data.access}`);
            
            return axiosClient({
              ...originalReq,
              headers: originalReq.headers.toJSON()
            });
          }
        }
      } catch (refreshErr) {
        console.error('Refresh token failed', refreshErr);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;