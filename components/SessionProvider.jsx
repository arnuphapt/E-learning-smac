"use client";

import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

function SupabaseSync() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.id || session?.dbId) {
      const userId = session.user.id || session.dbId;
      const userRole = session.user.role || session.role || "student";
      
      if (supabase && supabase.rest) {
        supabase.rest.headers["x-user-id"] = userId;
        supabase.rest.headers["x-user-role"] = userRole;
      }
    } else {
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
      <SupabaseSync />
      {children}
    </NextAuthSessionProvider>
  );
}
