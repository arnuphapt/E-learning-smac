"use client";

import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ConfirmProvider } from "./ui/ConfirmDialog";

function SupabaseSync() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.id || session?.dbId) {
      const userId = session.user.id || session.dbId;
      const userRole = session.user.role || session.role || "student";
      
      if (typeof window !== "undefined") {
        window.__supabase_user_id = userId;
        window.__supabase_user_role = userRole;
        window.sessionStorage.setItem("sb-user-id", userId);
        window.sessionStorage.setItem("sb-user-role", userRole);
      }
      
      if (supabase && supabase.rest) {
        supabase.rest.headers["x-user-id"] = userId;
        supabase.rest.headers["x-user-role"] = userRole;
      }
    } else {
      if (typeof window !== "undefined") {
        delete window.__supabase_user_id;
        delete window.__supabase_user_role;
        window.sessionStorage.removeItem("sb-user-id");
        window.sessionStorage.removeItem("sb-user-role");
      }
      
      if (supabase && supabase.rest) {
        delete supabase.rest.headers["x-user-id"];
        delete supabase.rest.headers["x-user-role"];
      }
    }
  }, [session]);

  return null;
}

export default function SessionProvider({ children }) {
  return (
    <NextAuthSessionProvider>
      <ConfirmProvider>
        <SupabaseSync />
        {children}
      </ConfirmProvider>
    </NextAuthSessionProvider>
  );
}
