import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

interface AuthContextType {
  isAuthenticated: boolean | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // 새로고침 시 localStorage 기준으로 로그인 여부 복원
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // ✅ 새로고침 시 로그인 상태 복원
  useEffect(() => {
    const stored = localStorage.getItem("isLoggedIn");
    setIsAuthenticated(stored === "true");
  }, []);

  // 로그인
  const login = async (
    email: string,
    password: string
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      await api.post("/api/users/login", {
        username: email,
        password,
      });

      // 로그인 성공 → 쿠키는 서버가, 상태는 localStorage가 담당
      localStorage.setItem("isLoggedIn", "true");
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error("Login Error:", error);
      localStorage.removeItem("isLoggedIn");
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 로그아웃 (이때만 로그인 상태 해제)
  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post("/api/users/logout");
    } catch (error) {
      console.error("Logout Error:", error);
    } finally {
      // 서버 쿠키 만료 + 프론트 상태 초기화
      localStorage.removeItem("isLoggedIn");
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider 안에서만 사용 가능");
  return ctx;
}
