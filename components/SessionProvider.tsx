"use client";

import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react";
import { type ReactNode, useEffect } from "react";
import { syncSupabaseUser } from "@/lib/supabase";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { ConfirmProvider as ShadcnConfirmProvider } from "@/components/common/confirm";

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

export default function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <ConfirmProvider>
        <ShadcnConfirmProvider>
          <SupabaseSync />
          {children}
        </ShadcnConfirmProvider>
      </ConfirmProvider>
    </NextAuthSessionProvider>
  );
}
