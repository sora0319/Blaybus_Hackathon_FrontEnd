import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_TARGET,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, 
});

api.interceptors.response.use(
  res => res,
  err => {
    // 401 에러가 났을 때
    if (err.response && err.response.status === 401) {
      
      // 현재 페이지가 로그인 페이지가 아닐 때만 실행
      if (window.location.pathname !== '/login') {
        localStorage.removeItem("isLoggedIn");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;



