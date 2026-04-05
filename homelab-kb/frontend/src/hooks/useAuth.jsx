import { useState, useEffect, useCallback, createContext, useContext } from "react";

const AuthContext = createContext(null);

const TOKEN_KEY = "kb_access_token";
const REFRESH_KEY = "kb_refresh_token";
const ROLE_KEY = "kb_role";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ROLE_KEY);
    setUser(null);
  }, []);

  const fetchMe = useCallback(async (token) => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }, []);

  const tryRefresh = useCallback(async () => {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!refresh) return false;
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(TOKEN_KEY, data.access_token);
        localStorage.setItem(REFRESH_KEY, data.refresh_token);
        localStorage.setItem(ROLE_KEY, data.role);
        return await fetchMe(data.access_token);
      }
    } catch {
      /* ignore */
    }
    return false;
  }, [fetchMe]);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        const ok = await fetchMe(token);
        if (!ok) {
          const refreshed = await tryRefresh();
          if (!refreshed) logout();
        }
      }
      setLoading(false);
    })();
  }, [fetchMe, tryRefresh, logout]);

  const login = useCallback(async (username, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Login failed");
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_KEY, data.refresh_token);
    localStorage.setItem(ROLE_KEY, data.role);
    await fetchMe(data.access_token);
  }, [fetchMe]);

  const getToken = useCallback(() => localStorage.getItem(TOKEN_KEY), []);

  const authFetch = useCallback(async (url, options = {}) => {
    let token = getToken();
    let res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        token = getToken();
        res = await fetch(url, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        logout();
      }
    }
    return res;
  }, [getToken, tryRefresh, logout]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getToken, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
