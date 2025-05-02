// lib/axiosClient.ts
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosHeaders
} from 'axios';

const axiosClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
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
            const { data } = await axios.post<{
              access: string;
              refresh?: string;
            }>(
              `${process.env.NEXT_PUBLIC_API_URL}/api/token/refresh/`,
              { refresh: refreshToken },
              {
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true
              }
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
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;