"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { instructorNav } from "@/lib/nav/instructor";

export default function InstructorLayout({ children }: { children: ReactNode }) {
  return <AppShell config={instructorNav}>{children}</AppShell>;
}
