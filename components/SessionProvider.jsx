"use client";

import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

function SupabaseSync() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.id || session?.dbId) {
      const userId = session.user.id || session.dbId;
      const userRole = session.user.role || session.role || "student";
      
      if (typeof window !== "undefined") {
        window.__supabase_user_id = userId;
        window.__supabase_user_role = userRole;
        try {
          window.sessionStorage.setItem("sb-user-id", userId);
          window.sessionStorage.setItem("sb-user-role", userRole);
        } catch (e) {
          console.warn("sessionStorage is not accessible:", e);
        }
      }
      
      if (supabase && supabase.rest && supabase.rest.headers) {
        if (typeof supabase.rest.headers.set === "function") {
          supabase.rest.headers.set("x-user-id", userId);
          supabase.rest.headers.set("x-user-role", userRole);
        } else {
          try {
            supabase.rest.headers["x-user-id"] = userId;
            supabase.rest.headers["x-user-role"] = userRole;
          } catch (e) {
            console.warn("Could not set Supabase rest headers:", e);
          }
        }
      }
    } else {
      if (typeof window !== "undefined") {
        delete window.__supabase_user_id;
        delete window.__supabase_user_role;
        try {
          window.sessionStorage.removeItem("sb-user-id");
          window.sessionStorage.removeItem("sb-user-role");
        } catch (e) {
          console.warn("sessionStorage is not accessible:", e);
        }
      }
      
      if (supabase && supabase.rest && supabase.rest.headers) {
        if (typeof supabase.rest.headers.delete === "function") {
          supabase.rest.headers.delete("x-user-id");
          supabase.rest.headers.delete("x-user-role");
        } else {
          try {
            delete supabase.rest.headers["x-user-id"];
            delete supabase.rest.headers["x-user-role"];
          } catch (e) {
            console.warn("Could not delete Supabase rest headers:", e);
          }
        }
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
