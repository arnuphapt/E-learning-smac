"use client";

import { usePathname } from "next/navigation";
import StudentTopNav from "@/components/layout/StudentTopNav";

export default function StudentLayout({ children }) {

  return (
    <div className="app" style={{ height: '100vh' }}>
      <StudentTopNav />
      <div className="app-main app-scroll rel">
        {children}
      </div>
    </div>
  );
}
