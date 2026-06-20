"use client";

import React, { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { toast } from "../ui/Toast";

export default function ImpersonationBanner() {
  const { data: session, status } = useSession();
  const [originalAdminId, setOriginalAdminId] = useState(null);
  const [originalAdminName, setOriginalAdminName] = useState(null);
  const [isReverting, setIsReverting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (status === "loading") return;

      if (status === "unauthenticated") {
        localStorage.removeItem("original_admin_id");
        localStorage.removeItem("original_admin_name");
        const timer = setTimeout(() => {
          setOriginalAdminId(null);
          setOriginalAdminName(null);
        }, 0);
        return () => clearTimeout(timer);
      } else if (status === "authenticated") {
        const adminId = localStorage.getItem("original_admin_id");
        const adminName = localStorage.getItem("original_admin_name");
        
        const timer = setTimeout(() => {
          if (adminId && session?.user?.id !== adminId) {
            setOriginalAdminId(adminId);
            setOriginalAdminName(adminName);
          } else {
            setOriginalAdminId(null);
            setOriginalAdminName(null);
          }
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [session, status]);

  const handleCancelImpersonation = async () => {
    if (!originalAdminId) return;
    setIsReverting(true);
    toast("กำลังยกเลิกการสวมบทบาท...");
    
    const result = await signIn("credentials", {
      userId: originalAdminId,
      callbackUrl: "/i/courses",
      redirect: false,
    });

    if (result?.error) {
      toast("เกิดข้อผิดพลาดในการสลับกลับ: " + result.error, "error");
      setIsReverting(false);
    } else {
      toast("คืนสู่สิทธิ์ผู้ดูแลระบบเรียบร้อยแล้ว");
      localStorage.removeItem("original_admin_id");
      localStorage.removeItem("original_admin_name");
      
      setTimeout(() => {
        window.location.href = "/i/courses";
      }, 600);
    }
  };

  if (!originalAdminId) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, #b45309 0%, #d97706 100%)",
      color: "#fff",
      padding: "10px 16px",
      fontSize: "13.5px",
      fontWeight: 500,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 9999,
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      gap: 12,
      borderBottom: "1.5px solid rgba(255, 255, 255, 0.15)",
      backdropFilter: "blur(8px)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: "16px" }}>👁️‍🗨️</span>
        <span>
          คุณกำลังสวมบทบาทเป็น <strong>{session?.user?.name || "นักศึกษา"}</strong> (สลับบทบาทมาจากผู้ดูแล: {originalAdminName})
        </span>
      </div>
      <button 
        className="btn"
        onClick={handleCancelImpersonation}
        disabled={isReverting}
        style={{
          background: "#fff",
          color: "#b45309",
          border: "none",
          padding: "5px 14px",
          borderRadius: "6px",
          fontWeight: 700,
          fontSize: "12.5px",
          cursor: "pointer",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          transition: "all 0.15s ease",
          height: "auto",
          whiteSpace: "nowrap"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "#fffbeb";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "#fff";
          e.currentTarget.style.transform = "none";
        }}
      >
        {isReverting ? "กำลังดำเนินการ..." : "ยกเลิกการสวมบทบาท"}
      </button>
    </div>
  );
}
