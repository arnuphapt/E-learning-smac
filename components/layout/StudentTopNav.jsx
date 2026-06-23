"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import Icon from "../ui/Icon";
import { Avatar } from "../ui/Primitives";

export default function StudentTopNav() {
  const pathname = usePathname() || "";
  const { data: session } = useSession();
  const roleLabels = {
    admin: "ผู้ดูแลระบบ",
    instructor: "อาจารย์ผู้สอน",
    course_manager: "อาจารย์ผู้รับผิดชอบรายวิชา",
    student: "นักศึกษา",
  };
  const roles = session?.user?.role ? session.user.role.split(",").map(r => r.trim()) : [];
  const displayRole = roles.map(r => roleLabels[r] || r).join(", ") || "นักศึกษา";
  const onCourses = pathname === "/s/courses" || pathname.startsWith("/s/course") || pathname.startsWith("/s/lesson") || pathname.startsWith("/s/test");
  const onAssignments = pathname.startsWith("/s/assignments") || pathname.startsWith("/s/assignment");
  const onCal = pathname === "/s/calendar";
  const onBroadcasts = pathname === "/s/broadcasts";
  const onAi = pathname.startsWith("/s/ai");

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);
  const [broadcasts, setBroadcasts] = useState([]);
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
      setBroadcasts(list);
      
      if (list.length > 0 && typeof window !== "undefined") {
        const lastSeen = localStorage.getItem("last_seen_broadcast_time");
        const newest = list[0].created_at;
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
    };

    fetchBroadcasts();

    const channel = supabase
      .channel("public:broadcasts_nav")
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
  }, [session]);

  useEffect(() => {
    if (pathname === "/s/broadcasts" && broadcasts.length > 0) {
      const timer = setTimeout(() => {
        setHasNew(false);
        setShouldShake(false);
        if (typeof window !== "undefined") {
          localStorage.setItem("last_seen_broadcast_time", broadcasts[0].created_at);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [pathname, broadcasts]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
      if (bellRef.current && !bellRef.current.contains(event.target)) setBellOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleBell = () => {
    const nextOpen = !bellOpen;
    setBellOpen(nextOpen);
    if (nextOpen && broadcasts.length > 0) {
      setHasNew(false);
      setShouldShake(false);
      if (typeof window !== "undefined") {
        localStorage.setItem("last_seen_broadcast_time", broadcasts[0].created_at);
      }
    }
  };

  return (
    <div className="topnav">
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
      <Link href="/s/courses" className="logo pointer" style={{ textDecoration: 'none' }}>
        <span className="mark"><Icon name="grad" size={17} /></span>
        <div>E-learning<small className="hide-m">การพยาบาลผู้ใหญ่และผู้สูงอายุ</small></div>
      </Link>
      <nav className="hide-m">
        <Link href="/s/courses" className={onCourses ? "on" : ""} style={{ textDecoration: 'none' }}>รายวิชา</Link>
        <Link href="/s/assignments" className={onAssignments ? "on" : ""} style={{ textDecoration: 'none' }}>ใบงาน</Link>
        <Link href="/s/calendar" className={onCal ? "on" : ""} style={{ textDecoration: 'none' }}>ปฏิทิน</Link>
        <Link href="/s/broadcasts" className={onBroadcasts ? "on" : ""} style={{ textDecoration: 'none' }}>ประกาศ</Link>
        <Link href="/s/ai" className={onAi ? "on" : ""} style={{ textDecoration: 'none' }}>AI ผู้ช่วย</Link>
      </nav>
      <div className="proto-spacer" />
      <div className="rel hide-m">
        <Icon name="search" size={16} style={{ position: "absolute", left: 11, top: 10, color: "var(--subtle)" }} />
        <input className="input" style={{ width: 220, paddingLeft: 34, height: 38 }} placeholder="ค้นหารายวิชา บทเรียน…" />
      </div>
      <div className="rel" ref={bellRef}>
        <button className="iconbtn ghost rel" onClick={toggleBell} style={{ position: "relative" }}>
          <div className={shouldShake ? "ring-shake" : ""}>
            <Icon name="bell" size={18} />
          </div>
          {hasNew && (
            <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: "#ef4444", border: "1.5px solid var(--surface, #fff)" }} />
          )}
        </button>
        {bellOpen && (
          <div className="card shadow" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 320, maxHeight: 400, overflowY: "auto", zIndex: 200, padding: 0, borderRadius: 12 }}>
            <div className="flex items-center justify-between" style={{ padding: "12px 14px 8px", borderBottom: "1px solid var(--border)" }}>
              <span className="fw-7 t-sm">ประกาศ</span>
              <Link href="/s/broadcasts" className="t-xs" style={{ color: "var(--primary)", textDecoration: "none" }} onClick={() => setBellOpen(false)}>ดูทั้งหมด</Link>
            </div>
            {broadcasts.length === 0 ? (
              <div className="t-sm muted" style={{ padding: "24px 14px", textAlign: "center" }}>ยังไม่มีประกาศ</div>
            ) : (
              broadcasts.map(b => (
                <div key={b.id} style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-1 mb-1">
                    {b.pinned && <span style={{ fontSize: 11 }}>📌</span>}
                    <span className="fw-6 t-sm">{b.title}</span>
                  </div>
                  {b.body && <div className="t-xs muted" style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{b.body}</div>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      <div className="rel" ref={menuRef}>
        <div className="flex items-center gap-2 pointer" onClick={() => setMenuOpen(!menuOpen)} style={{ padding: "4px 8px", borderRadius: 8, transition: ".15s", background: menuOpen ? "var(--muted)" : "transparent" }}>
          <Avatar name={session?.user?.name || "นักศึกษา"} src={session?.user?.image} size={34} />
          <div style={{ lineHeight: 1.2 }} className="hide-m">
            <div className="t-sm fw-6">{session?.user?.name || "กำลังโหลด..."}</div>
            <div className="t-xs muted">{displayRole}</div>
          </div>
          <Icon name="chevD" size={16} className="muted hide-m" />
        </div>

        {menuOpen && (
          <div className="card shadow" style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, width: 220, zIndex: 100, padding: 8 }}>
            <Link href="/s/profile" className="flex items-center gap-3 p-2 pointer" style={{ borderRadius: 8, textDecoration: 'none', color: "var(--fg)" }} onClick={() => setMenuOpen(false)}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}><Icon name="user" size={16} /></div>
              <div><div className="t-sm fw-6">โปรไฟล์ส่วนตัว</div><div className="t-xs muted">ข้อมูลและการตั้งค่า</div></div>
            </Link>
            {(roles.includes("admin") || roles.includes("instructor") || roles.includes("course_manager")) && (
              <Link href="/i/courses" className="flex items-center gap-3 p-2 pointer mt-1" style={{ borderRadius: 8, textDecoration: 'none', color: "var(--fg)" }} onClick={() => setMenuOpen(false)}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}><Icon name="settings" size={16} /></div>
                <div><div className="t-sm fw-6">ระบบจัดการผู้สอน</div><div className="t-xs muted">เข้าสู่หน้ารายวิชาของอาจารย์</div></div>
              </Link>
            )}
            <hr className="divider" style={{ margin: "8px 0" }} />
            <button className="flex items-center gap-3 p-2 pointer w-full" style={{ borderRadius: 8, background: "transparent", border: 0, textAlign: "left", color: "var(--danger)" }} onClick={() => signOut({ callbackUrl: "/login" })}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--danger-soft)", color: "var(--danger)", display: "grid", placeItems: "center" }}><Icon name="x" size={16} /></div>
              <div className="t-sm fw-6">ออกจากระบบ</div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
