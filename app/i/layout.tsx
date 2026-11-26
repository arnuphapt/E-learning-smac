"use client";

import type { ReactNode } from "react";
import SessionProvider from "@/components/SessionProvider";
import { AppShell } from "@/components/layout/app-shell";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { instructorNav } from "@/lib/nav/instructor";

export default function InstructorLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ImpersonationBanner />
      <AppShell config={instructorNav}>{children}</AppShell>
    </SessionProvider>
  );
}
