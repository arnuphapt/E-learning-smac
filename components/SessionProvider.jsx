"use client";

import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { syncSupabaseUser } from "@/lib/supabase";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

function SupabaseSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      syncSupabaseUser(session?.user?.id || session?.dbId || null, status);
    } else if (status === "unauthenticated") {
      syncSupabaseUser(null, status);
    }
  }, [session, status]);

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
