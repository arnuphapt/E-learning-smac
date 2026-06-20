"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  
  const [hasNew, setHasNew] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  useEffect(() => {
    const now = new Date().toISOString();
    
    const fetchBroadcasts = async () => {
      const { data } = await supabase
        .from("broadcasts")
        .select("id,title,body,pinned,created_at")
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);
        
      const list = data || [];
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
  }, [pathname]);

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
