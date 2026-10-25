"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  CompanyRecord,
  CvProfileRecord,
  UserRole,
} from "@/lib/db/types";

export interface AuthenticatedUser {
  _id: string;
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: AuthenticatedUser | null;
  company: CompanyRecord | null;
  cvProfiles: CvProfileRecord[];
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
  login: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  company: null,
  cvProfiles: [],
  isLoading: true,
  refreshAuth: async () => {},
  login: async () => ({ ok: false }),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [company, setCompany] = useState<CompanyRecord | null>(null);
  const [cvProfiles, setCvProfiles] = useState<CvProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        setCompany(null);
        setCvProfiles([]);
        return;
      }
      const data = await res.json();
      setUser(data.user || null);
      setCompany(data.company || null);
      setCvProfiles(Array.isArray(data.cv_profiles) ? data.cv_profiles : []);
    } catch {
      setUser(null);
      setCompany(null);
      setCvProfiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshAuth();
  }, [refreshAuth]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { ok: false, error: data.error || "Đăng nhập thất bại" };
        }
        await refreshAuth();
        router.refresh();
        return { ok: true };
      } catch {
        return { ok: false, error: "Lỗi kết nối máy chủ" };
      }
    },
    [refreshAuth, router]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setCompany(null);
      setCvProfiles([]);
      toast.success("Đã đăng xuất khỏi tài khoản.");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Không thể đăng xuất, vui lòng thử lại.");
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        cvProfiles,
        isLoading,
        refreshAuth,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
