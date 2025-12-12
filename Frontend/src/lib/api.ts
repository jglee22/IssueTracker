import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 로그아웃 처리 중복 방지 플래그
let isLoggingOut = false;

// 요청 인터셉터: 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // FormData인 경우 Content-Type을 제거하여 브라우저가 자동으로 boundary를 포함한 헤더 설정
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const errorMessage = error.response?.data?.error || '';
    const config = error.config;
    
    // 401 에러는 인증 실패이므로 로그아웃 처리
    // 단, 이미 로그아웃 처리 중이거나, 로그인/회원가입 페이지에서는 처리하지 않음
    if (status === 401 && !isLoggingOut) {
      const currentPath = window.location.pathname;
      
      // 로그인/회원가입 페이지가 아니고, 인증이 필요한 API 호출인 경우에만 로그아웃
      if (currentPath !== '/login' && currentPath !== '/register') {
        // 토큰이 있는 경우에만 로그아웃 처리 (토큰이 없으면 이미 로그아웃된 상태)
        const token = localStorage.getItem('token');
        if (token) {
          isLoggingOut = true;
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // 약간의 지연 후 리다이렉트 (중복 방지)
          setTimeout(() => {
            isLoggingOut = false;
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          }, 100);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

