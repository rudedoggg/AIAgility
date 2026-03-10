import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { API_BASE_URL } from "@/lib/config";

type UserWithPermissions = User & {
  systemPermissions?: string[];
  systemRoles?: string[];
};

async function fetchAppUser(): Promise<UserWithPermissions | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;

  const res = await fetch(`${API_BASE_URL}/api/auth/user`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403 || res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
  return res.json();
}

/** Fire-and-forget sync — accepts the session directly to avoid an extra getSession() round-trip. */
function syncUser(session: Session): void {
  const supabaseUser = session.user;
  const meta = supabaseUser.user_metadata || {};

  fetch(`${API_BASE_URL}/api/auth/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: supabaseUser.email || null,
      firstName: meta.first_name || meta.full_name?.split(" ")[0] || null,
      lastName: meta.last_name || meta.full_name?.split(" ").slice(1).join(" ") || null,
      profileImageUrl: meta.avatar_url || meta.picture || null,
    }),
  }).catch(() => {
    // Sync failure is non-critical; user is still authenticated
  });
}

/** Check if a permission key matches the user's granted permissions (supports wildcards). */
function permissionMatches(required: string, granted: string[]): boolean {
  if (granted.includes("*")) return true;
  if (granted.includes(required)) return true;
  const parts = required.split(".");
  for (let i = 1; i < parts.length; i++) {
    const wildcard = parts.slice(0, i).join(".") + ".*";
    if (granted.includes(wildcard)) return true;
  }
  return false;
}

export function useAuth(): {
  user: UserWithPermissions | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  hasPermission: (key: string) => boolean;
} {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        setIsSessionLoading(false);
      }
    }, 3000);

    supabase.auth.getSession().then(({ data }) => {
      if (!settled) {
        settled = true;
        setSession(data.session);
        setIsSessionLoading(false);
      }
      if (data.session) {
        syncUser(data.session);
      }
    }).catch(() => {
      if (!settled) {
        settled = true;
        setIsSessionLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);

        if (event === "PASSWORD_RECOVERY") {
          sessionStorage.setItem("passwordRecovery", "true");
        }
        if (event === "SIGNED_IN" && newSession) {
          syncUser(newSession);
        }
        if (event === "SIGNED_OUT") {
          queryClient.setQueryData(["/api/auth/user"], null);
          queryClient.clear();
        }
      },
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const { data: user, isLoading: isUserQueryLoading } = useQuery<UserWithPermissions | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchAppUser,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    enabled: !!session,
  });

  const hasPermission = useCallback((key: string): boolean => {
    if (!user) return false;
    const perms = user.systemPermissions || [];
    return permissionMatches(key, perms);
  }, [user]);

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore signOut errors — always clear local state
    } finally {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.clear();
      window.location.href = "/";
    }
  };

  return {
    user: user ?? null,
    isLoading: isSessionLoading || (!!session && isUserQueryLoading),
    isAuthenticated: !!session,
    logout,
    hasPermission,
  };
}
