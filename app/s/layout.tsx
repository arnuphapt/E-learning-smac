"use client";

import type { ReactNode } from "react";
import SessionProvider from "@/components/SessionProvider";
import { AppShell } from "@/components/layout/app-shell";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { BroadcastBell } from "@/components/student/broadcast-bell";
import { studentNav } from "@/lib/nav/student";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ImpersonationBanner />
      <AppShell config={studentNav} headerActions={<BroadcastBell />}>
        {children}
      </AppShell>
    </SessionProvider>
  );
}
