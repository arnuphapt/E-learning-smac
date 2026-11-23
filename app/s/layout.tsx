"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { BroadcastBell } from "@/components/student/broadcast-bell";
import { studentNav } from "@/lib/nav/student";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell config={studentNav} headerActions={<BroadcastBell />}>
      {children}
    </AppShell>
  );
}
