"use client";

import InstructorSidebar from "@/components/layout/InstructorSidebar";
import InstructorHeader from "@/components/layout/InstructorHeader";

export default function InstructorLayout({ children }) {
  return (
    <div className="app" style={{ height: '100vh' }}>
      <div className="app-body">
        <InstructorSidebar />
        <div className="app-main app-scroll rel">
          <InstructorHeader />
          {children}
        </div>
      </div>
    </div>
  );
}
