import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

interface User {
  id: string;
  username: string;
  role: "admin" | "editor";
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearTokens = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  }, []);

  const refreshTokenInternal = useCallback(async () => {
    const refreshTokenValue = localStorage.getItem("refreshToken");
    if (!refreshTokenValue) {
      throw new Error("No refresh token available");
    }

    const response = await fetch("/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });

    if (!response.ok) {
      clearTokens();
      throw new Error("Token refresh failed");
    }

    const data = await response.json();
    localStorage.setItem("accessToken", data.accessToken);
  }, [clearTokens]);

  // Session restore on mount
  useEffect(() => {
    const restoreSession = async () => {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/auth/me", {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          // Try to refresh token
          const refreshTokenValue = localStorage.getItem("refreshToken");
          if (refreshTokenValue) {
            await refreshTokenInternal();
            // Retry me endpoint
            const retryResponse = await fetch("/auth/me", {
              headers: {
                "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
              },
            });
            if (retryResponse.ok) {
              const data = await retryResponse.json();
              setUser(data);
            } else {
              clearTokens();
            }
          } else {
            clearTokens();
          }
        } else {
          const data = await response.json();
          setUser(data);
        }
      } catch (error) {
        console.error("Session restore failed:", error);
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, [clearTokens, refreshTokenInternal]);

  const login = async (username: string, password: string) => {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "登录失败");
    }

    const data = await response.json();

    // Store tokens
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);

    // Fetch user info
    const meResponse = await fetch("/auth/me", {
      headers: {
        "Authorization": `Bearer ${data.accessToken}`,
      },
    });

    if (meResponse.ok) {
      const userData = await meResponse.json();
      setUser(userData);
    }
  };

  const refreshToken = async () => {
    await refreshTokenInternal();
  };

  const logout = async () => {
    const refreshTokenValue = localStorage.getItem("refreshToken");
    if (refreshTokenValue) {
      try {
        await fetch("/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken: refreshTokenValue }),
        });
      } catch (error) {
        console.error("Logout API call failed:", error);
      }
    }
    clearTokens();
  };

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
