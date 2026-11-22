"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { instructorNav } from "@/lib/nav/instructor";

export default function InstructorLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider className="h-dvh min-h-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-card focus:text-primary focus:font-semibold focus:shadow-md focus:rounded-lg focus:border focus:border-border focus:outline-none focus:ring-2 focus:ring-ring"
      >
        ข้ามไปเนื้อหาหลัก
      </a>
      <AppSidebar config={instructorNav} />
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        <AppHeader config={instructorNav} />
        {/* app-main / app-scroll keep the old pages' container-query layout and scrolling unchanged */}
        <main id="main" tabIndex={-1} className="app-main app-scroll rel outline-none">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
