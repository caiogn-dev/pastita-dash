import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import api from "@/lib/api";

type AuthUser = {
  email: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = typeof window !== "undefined" ? sessionStorage.getItem("pastita_dash_token") : null;
    const storedUser = typeof window !== "undefined" ? sessionStorage.getItem("pastita_dash_user") : null;

    if (storedToken) setToken(storedToken);
    if (storedUser) setUser(JSON.parse(storedUser));
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post("/login/", { email, password });
    const { token: apiToken, user: apiUser } = response.data;

    sessionStorage.setItem("pastita_dash_token", apiToken);
    sessionStorage.setItem("pastita_dash_user", JSON.stringify(apiUser));
    setToken(apiToken);
    setUser(apiUser);
    router.replace("/");
  };

  const logout = () => {
    sessionStorage.removeItem("pastita_dash_token");
    sessionStorage.removeItem("pastita_dash_user");
    setToken(null);
    setUser(null);
    router.replace("/login");
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
    }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
