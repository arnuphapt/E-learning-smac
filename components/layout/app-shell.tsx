"use client"

import type { ReactNode } from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { NavConfig } from "@/lib/nav/types"
import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"

/** Sidebar + header + scrolling content column, driven by a nav config. Used by /i and /s. */
export function AppShell({ config, headerActions, children }: { config: NavConfig; headerActions?: ReactNode; children: ReactNode }) {
  return (
    <SidebarProvider className="h-dvh min-h-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:border focus:bg-card focus:px-4 focus:py-2 focus:font-semibold focus:text-primary focus:shadow-md focus:ring-2 focus:ring-ring focus:outline-none"
      >
        ข้ามไปเนื้อหาหลัก
      </a>
      <AppSidebar config={config} />
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        <AppHeader config={config} actions={headerActions} />
        {/* @container: pages not migrated yet still size themselves with container queries */}
        <main id="main" tabIndex={-1} className="@container relative min-h-0 min-w-0 flex-1 overflow-auto outline-none">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
