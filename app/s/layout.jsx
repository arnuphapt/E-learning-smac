"use client";

import StudentTopNav from "@/components/layout/StudentTopNav";
import StudentMobileTabbar from "@/components/layout/StudentMobileTabbar";

export default function StudentLayout({ children }) {
  return (
    <div className="app" style={{ height: '100dvh' }}>
      <a
        href="#main"
        className="skip-link sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-card focus:text-primary focus:font-semibold focus:shadow-md focus:rounded-lg focus:border focus:border-border focus:outline-none focus:ring-2 focus:ring-ring"
      >
        ข้ามไปเนื้อหาหลัก
      </a>
      <style dangerouslySetInnerHTML={{ __html: `
        .skip-link:focus {
          position: fixed !important;
          top: 12px !important;
          left: 12px !important;
          z-index: 9999 !important;
          padding: 8px 16px !important;
          background: var(--card) !important;
          color: var(--primary) !important;
          font-weight: 600 !important;
          border-radius: 8px !important;
          border: 1px solid var(--border) !important;
          box-shadow: var(--shadow-md) !important;
          clip: auto !important;
          width: auto !important;
          height: auto !important;
          overflow: visible !important;
        }
      `}} />
      <StudentTopNav />
      <main id="main" tabIndex={-1} className="app-main app-scroll rel outline-none">
        {children}
      </main>
      <StudentMobileTabbar />
    </div>
  );
}
