"use client";

import { usePathname } from "next/navigation";
import StudentTopNav from "@/components/layout/StudentTopNav";

export default function StudentLayout({ children }) {
  const pathname = usePathname() || "";
  const immersive = pathname.includes("/s/test/");

  return (
    <div className="app" style={{ height: '100vh' }}>
      {!immersive && <StudentTopNav />}
      <div className="app-main app-scroll rel">
        {children}
      </div>
    </div>
  );
}
