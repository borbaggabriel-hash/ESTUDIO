import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { User } from "@shared/models/auth";

const AUTH_CACHE_KEY = "thehub_auth_user_v1";

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User;
    if (!parsed || typeof (parsed as any).id !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User | null) {
  try {
    if (!user) {
      localStorage.removeItem(AUTH_CACHE_KEY);
      return;
    }
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
  } catch {}
}

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401 || response.status === 403) {
    writeCachedUser(null);
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  writeCachedUser(data);
  return data;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
    initialData: readCachedUser,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.message || "Erro ao fazer login");
        (err as any).status = res.status;
        throw err;
      }
      return data;
    },
    onSuccess: (data: any) => {
      const nextUser: User | null = data?.user || null;
      if (nextUser) writeCachedUser(nextUser);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (formData: Record<string, string>) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Erro ao criar conta");
      }
      return data;
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    },
    onSuccess: () => {
      writeCachedUser(null);
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.clear();
      navigate("/hub-dub/login", { replace: true });
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    logout: () => logoutMutation.mutate(),
    isLoggingOut: logoutMutation.isPending,
  };
}
