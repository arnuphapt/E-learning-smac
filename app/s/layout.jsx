"use client";

import StudentTopNav from "@/components/layout/StudentTopNav";
import StudentMobileTabbar from "@/components/layout/StudentMobileTabbar";

export default function StudentLayout({ children }) {
  return (
    <div className="app" style={{ height: '100vh' }}>
      <StudentTopNav />
      <div className="app-main app-scroll rel">
        {children}
      </div>
      <StudentMobileTabbar />
    </div>
  );
}
