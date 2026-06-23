"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import Icon from "../ui/Icon";

const TabItem = ({ href, icon, label, active, showDot, shake }) => (
  <Link
    href={href}
    className={active ? "on" : ""}
    style={{ textDecoration: "none", position: "relative" }}
  >
    <div style={{
      width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center",
      background: active ? "var(--primary-soft)" : "transparent",
      transition: ".12s"
    }}>
      <div className={shake ? "ring-shake" : ""}>
        <Icon name={icon} size={20} />
      </div>
    </div>
    <span>{label}</span>
    {showDot && (
      <span style={{ position: "absolute", top: 2, right: 12, width: 7, height: 7, borderRadius: "50%", background: "#ef4444", border: "1.5px solid var(--surface, #fff)" }} />
    )}
  </Link>
);

export default function StudentMobileTabbar() {
  const pathname = usePathname() || "";
  const { data: session } = useSession();
  
  const [hasNew, setHasNew] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  useEffect(() => {
    if (!session) return;

    let gradesList = [];
    let studentProfile = null;
    
    const fetchBroadcasts = async () => {
      const freshNow = new Date().toISOString();
      const studentId = session?.dbId;
      const studentYear = session?.user?.study_year ? Number(session.user.study_year) : null;

      const [bRes, sgRes, uRes] = await Promise.all([
        supabase
          .from("broadcasts")
          .select("id,title,body,pinned,created_at,year_level")
          .or(`expires_at.is.null,expires_at.gt.${freshNow}`)
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(50),
        gradesList.length === 0 ? supabase.from("student_grades").select("prefix, year_label") : Promise.resolve({ data: gradesList }),
        (studentId && !studentProfile) ? supabase.from("users").select("*").eq("id", studentId).maybeSingle() : Promise.resolve({ data: studentProfile })
      ]);
        
      if (sgRes?.data && gradesList.length === 0) gradesList = sgRes.data;
      if (uRes?.data && !studentProfile) studentProfile = uRes.data;

      const rawBroadcasts = bRes.data || [];
      const email = session?.user?.email || "";
      const match = email.match(/^(\d+)@/);
      const parsedStudentNo = match ? match[1] : "";
      const finalStudentNo = studentProfile?.student_no || parsedStudentNo;
      const prefix = finalStudentNo ? String(finalStudentNo).substring(0, 2) : "";
      const mapping = gradesList.find(g => g.prefix === prefix);
      const studentLabel = mapping ? mapping.year_label : null;
      const studentFallback = studentYear;

      const filtered = rawBroadcasts.filter(b => {
        const allowed = b.year_level;
        if (!allowed || allowed.length === 0) return true; // no restriction

        return allowed.some(ay => {
          if (typeof ay === 'number' || !isNaN(Number(ay))) {
            return Number(ay) === studentFallback || ay == studentFallback;
          }
          return ay === studentLabel;
        });
      });

      const list = filtered.slice(0, 10);
      if (list.length > 0 && typeof window !== "undefined") {
        const lastSeen = localStorage.getItem("last_seen_broadcast_time");
        const newest = list[0].created_at;
        
        if (pathname === "/s/broadcasts") {
          setHasNew(false);
          setShouldShake(false);
          localStorage.setItem("last_seen_broadcast_time", newest);
        } else {
          if (!lastSeen) {
            setHasNew(true);
            setShouldShake(true);
          } else {
            const lastSeenTime = new Date(lastSeen).getTime();
            const newestTime = new Date(newest).getTime();
            if (newestTime > lastSeenTime) {
              setHasNew(true);
              setShouldShake(true);
            }
          }
        }
      }
    };

    fetchBroadcasts();

    const channel = supabase
      .channel("public:broadcasts_mobile")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "broadcasts" },
        () => {
          fetchBroadcasts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pathname, session]);

  const onCourses = pathname === "/s/courses" || pathname.startsWith("/s/course") || pathname.startsWith("/s/lesson") || pathname.startsWith("/s/test");
  const onAssignments = pathname.startsWith("/s/assignments") || pathname.startsWith("/s/assignment");
  const onCal = pathname === "/s/calendar";
  const onBroadcasts = pathname === "/s/broadcasts";
  const onProfile = pathname === "/s/profile";

  return (
    <div className="tabbar" style={{ background: "rgba(255,255,255,.92)", backdropFilter: "saturate(1.4) blur(12px)" }}>
      <style>{`
        @keyframes ring {
          0% { transform: rotate(0); }
          1% { transform: rotate(30deg); }
          3% { transform: rotate(-28deg); }
          5% { transform: rotate(34deg); }
          7% { transform: rotate(-32deg); }
          9% { transform: rotate(30deg); }
          11% { transform: rotate(-28deg); }
          13% { transform: rotate(26deg); }
          15% { transform: rotate(-24deg); }
          17% { transform: rotate(22deg); }
          19% { transform: rotate(-20deg); }
          21% { transform: rotate(18deg); }
          23% { transform: rotate(-16deg); }
          25% { transform: rotate(14deg); }
          27% { transform: rotate(-12deg); }
          29% { transform: rotate(10deg); }
          31% { transform: rotate(-8deg); }
          33% { transform: rotate(6deg); }
          35% { transform: rotate(-4deg); }
          37% { transform: rotate(2deg); }
          39% { transform: rotate(-1deg); }
          41% { transform: rotate(1deg); }
          43% { transform: rotate(0); }
          100% { transform: rotate(0); }
        }
        .ring-shake {
          animation: ring 2.5s ease-in-out infinite;
          transform-origin: 50% 0;
          display: inline-block;
        }
      `}</style>
      <TabItem href="/s/courses"     icon="book"      label="รายวิชา"   active={onCourses} />
      <TabItem href="/s/assignments" icon="clipboard" label="ใบงาน"     active={onAssignments} />
      <TabItem href="/s/broadcasts"  icon="bell"      label="ประกาศ"    active={onBroadcasts} showDot={hasNew} shake={shouldShake} />
      <TabItem href="/s/calendar"    icon="cal"       label="ปฏิทิน"    active={onCal} />
      <TabItem href="/s/profile"     icon="user"      label="โปรไฟล์"   active={onProfile} />
    </div>
  );
}
