import React, { createContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';

// 更新 User 接口，添加头像 key
interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string; // 可选的头像 R2 key
  role: 'admin' | 'moderator' | 'user'; // 分别对应 管理、版主、用户
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  fetchUser: () => void; // 暴露 fetchUser 以便在头像更新后手动刷新
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const userData = await apiClient.post<User>('/users/me', {});
        setUser(userData);
      } catch (error) {
        console.error("Failed to fetch user, token might be invalid.", error);
        localStorage.removeItem('token');
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);
  
  const login = (token: string) => {
    localStorage.setItem('token', token);
    fetchUser();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };
  
  const value = {
    isAuthenticated: !!user,
    user,
    isLoading,
    login,
    logout,
    fetchUser, // 将 fetchUser 暴露出去
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
