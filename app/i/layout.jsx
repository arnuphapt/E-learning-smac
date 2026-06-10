"use client";

import { usePathname } from "next/navigation";
import InstructorSidebar from "@/components/layout/InstructorSidebar";

export default function InstructorLayout({ children }) {
  const pathname = usePathname() || "";
  const immersive = pathname.includes("/i/grade/");

  if (immersive) {
    return (
      <div className="app" style={{ height: '100vh' }}>
        <div className="app-main app-scroll rel">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="app" style={{ height: '100vh' }}>
      <div className="app-body">
        <InstructorSidebar />
        <div className="app-main app-scroll rel">
          {children}
        </div>
      </div>
    </div>
  );
}
