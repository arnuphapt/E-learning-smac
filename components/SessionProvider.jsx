"use client";

import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { syncSupabaseUser } from "@/lib/supabase";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

function SupabaseSync() {
  const { data: session } = useSession();

  useEffect(() => {
    syncSupabaseUser(session?.user?.id || session?.dbId || null);
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
