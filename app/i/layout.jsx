"use client";

import React, { useState } from "react";
import InstructorSidebar from "@/components/layout/InstructorSidebar";
import InstructorHeader from "@/components/layout/InstructorHeader";
import InstructorMobileTabbar from "@/components/layout/InstructorMobileTabbar";

export default function InstructorLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app" style={{ height: '100vh' }}>
      <div className="app-body">
        {sidebarOpen && (
          <div 
            className="sidebar-backdrop" 
            onClick={() => setSidebarOpen(false)} 
          />
        )}
        {/* Sidebar: visible on desktop only */}
        <InstructorSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="app-main app-scroll rel">
          {/* Top header: hidden on mobile */}
          <InstructorHeader onMenuClick={() => setSidebarOpen(true)} />
          {children}
        </div>
      </div>
      {/* Bottom tab bar: visible on mobile only */}
      <InstructorMobileTabbar />
    </div>
  );
}
