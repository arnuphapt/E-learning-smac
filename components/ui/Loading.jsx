import React from "react";
import Icon from "@/components/ui/Icon";

export default function Loading({ text = "กำลังโหลดข้อมูล...", fullHeight = false, className = "p-5 text-center muted" }) {
  const isContainer = className?.includes("container");
  
  if (fullHeight || isContainer) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: fullHeight ? '100vh' : '50vh', 
        width: '100%',
        gap: '16px',
        color: 'var(--subtle)'
      }} className={className}>
        <Icon name="loader" className="spin" size={36} style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: '15px', fontWeight: 500 }}>{text}</span>
      </div>
    );
  }

  return (
    <div className={className + " flex flex-col items-center justify-center gap-3 p-4"}>
      <Icon name="loader" className="spin" size={28} style={{ color: 'var(--primary)' }} />
      <span style={{ fontSize: '14px', fontWeight: 500 }}>{text}</span>
    </div>
  );
}
