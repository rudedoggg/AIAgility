import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { API_BASE_URL } from "@/lib/config";

async function fetchAppUser(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;

  const res = await fetch(`${API_BASE_URL}/api/auth/user`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
  return res.json();
}

async function syncUser(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return;

  const supabaseUser = session.user;
  const meta = supabaseUser.user_metadata || {};

  try {
    await fetch(`${API_BASE_URL}/api/auth/sync`, {
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
    });
  } catch (err) {
    console.warn("Failed to sync user profile:", err);
  }
}

export function useAuth() {
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
    }, 5000);

    supabase.auth.getSession().then(({ data }) => {
      if (!settled) {
        settled = true;
        setSession(data.session);
        setIsSessionLoading(false);
      }
    }).catch(() => {
      if (!settled) {
        settled = true;
        setIsSessionLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);

        if (event === "SIGNED_IN") {
          await syncUser();
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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

  const { data: user, isLoading: isUserLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchAppUser,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    enabled: !!session,
  });

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    queryClient.setQueryData(["/api/auth/user"], null);
    queryClient.clear();
  };

  return {
    user: user ?? null,
    isLoading: isSessionLoading,
    isAuthenticated: !!session,
    logout,
  };
}
