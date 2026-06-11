import React from "react";
import Icon from "@/components/ui/Icon";

export default function Loading({ text = "กำลังโหลดข้อมูล...", fullHeight = false, className = "p-5 text-center muted" }) {
  if (fullHeight) {
    return (
      <div style={{ background: "#f4f6f8", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="muted flex items-center gap-2">
          <Icon name="loader" className="spin" size={24} /> {text}
        </div>
      </div>
    );
  }

  return (
    <div className={className + " flex items-center justify-center gap-2"}>
      <Icon name="loader" className="spin" size={24} /> {text}
    </div>
  );
}
