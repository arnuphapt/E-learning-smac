"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Primitives";
import { PageHead } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";

const TONE_BG = { primary: "var(--primary-soft)", info: "var(--info-soft)", warning: "var(--warning-soft)", muted: "var(--muted)" };
const TONE_FG = { primary: "var(--primary-soft-fg)", info: "var(--info)", warning: "var(--warning)", muted: "var(--muted-fg)" };

export default function Calendar() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const nav = (path) => router.push(path);

  const [currentDate] = useState(new Date());
  const [viewedDate, setViewedDate] = useState(new Date());
  const [allAssignments, setAllAssignments] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [aRes, lRes] = await Promise.all([
        supabase.from("assignments").select("*, course:courses(code)"),
        supabase.from("lessons").select("*, course:courses(code)")
      ]);
      
      if (aRes.data) {
        setAllAssignments(aRes.data);
      }
      if (lRes.data) {
        setLessons(lRes.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  const prevMonth = () => {
    setViewedDate(new Date(viewedDate.getFullYear(), viewedDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setViewedDate(new Date(viewedDate.getFullYear(), viewedDate.getMonth() + 1, 1));
  };

  const getHeaderLabel = (date) => {
    const monthNames = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    const monthName = monthNames[date.getMonth()];
    const yearBE = date.getFullYear() + 543;
    return `${monthName} ${yearBE}`;
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDow = (year, month) => new Date(year, month, 1).getDay();

  const isCurrentMonth = viewedDate.getFullYear() === currentDate.getFullYear() && viewedDate.getMonth() === currentDate.getMonth();
  const TODAY = isCurrentMonth ? currentDate.getDate() : -1;

  const DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  const daysInMonth = getDaysInMonth(viewedDate.getFullYear(), viewedDate.getMonth());
  const firstDow = getFirstDow(viewedDate.getFullYear(), viewedDate.getMonth());
  
  const totalCellsNeeded = firstDow + daysInMonth;
  const gridRows = Math.ceil(totalCellsNeeded / 7);
  const cells = Array.from({ length: gridRows * 7 }, (_, i) => i - firstDow + 1);

  // Filter out assignments if their parent lesson is draft and the user is a student
  const assignmentsList = allAssignments.filter((asg) => {
    const lesson = lessons.find((l) => l.id === asg.lesson_id);
    const isStaff = role === "instructor" || role === "admin";
    if (lesson?.status === "draft" && !isStaff) return false;
    return true;
  });

  // Compute events for viewed month
  const getEventsForViewedMonth = () => {
    const evs = {};

    // 1. Add assignments
    assignmentsList.forEach(a => {
      if (!a.due) return;
      const d = new Date(a.due);
      if (d.getFullYear() === viewedDate.getFullYear() && d.getMonth() === viewedDate.getMonth()) {
        const day = d.getDate();
        if (!evs[day]) evs[day] = [];
        evs[day].push({
          t: a.title,
          course: a.course?.code || "NUR301",
          tone: "primary",
          kind: "assignment",
          to: "/s/assignment/" + a.id
        });
      }
    });

    // 2. Add Pre-tests and Post-tests from lessons
    lessons.forEach(l => {
      const isStaff = role === "instructor" || role === "admin";
      if (l.status === "draft" && !isStaff) return;

      // Pre-test due date
      if (l.pretest?.required && l.pretest?.due) {
        const d = new Date(l.pretest.due);
        if (d.getFullYear() === viewedDate.getFullYear() && d.getMonth() === viewedDate.getMonth()) {
          const day = d.getDate();
          if (!evs[day]) evs[day] = [];
          evs[day].push({
            t: `Pre-test บทที่ ${l.index} · ${l.title}`,
            course: l.course?.code || "NUR301",
            tone: "info",
            kind: "pretest",
            to: `/s/lesson/${l.id}`
          });
        }
      }

      // Post-test due date
      if (l.posttest?.required && l.posttest?.due) {
        const d = new Date(l.posttest.due);
        if (d.getFullYear() === viewedDate.getFullYear() && d.getMonth() === viewedDate.getMonth()) {
          const day = d.getDate();
          if (!evs[day]) evs[day] = [];
          evs[day].push({
            t: `Post-test บทที่ ${l.index} · ${l.title}`,
            course: l.course?.code || "NUR301",
            tone: "info",
            kind: "posttest",
            to: `/s/lesson/${l.id}`
          });
        }
      }
    });

    return evs;
  };

  const CAL_EVENTS = getEventsForViewedMonth();

  // Compute upcoming deadlines
  const getUpcomingDeadlines = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const items = [];

    // Add assignments
    assignmentsList.forEach(a => {
      if (!a.due) return;
      const d = new Date(a.due);
      items.push({
        t: a.title,
        course: a.course?.code || "NUR301",
        tone: "primary",
        kind: "assignment",
        to: "/s/assignment/" + a.id,
        date: d
      });
    });

    // Add Pre/Post tests
    lessons.forEach(l => {
      const isStaff = role === "instructor" || role === "admin";
      if (l.status === "draft" && !isStaff) return;

      if (l.pretest?.required && l.pretest?.due) {
        items.push({
          t: `Pre-test บทที่ ${l.index} · ${l.title}`,
          course: l.course?.code || "NUR301",
          tone: "info",
          kind: "pretest",
          to: `/s/lesson/${l.id}`,
          date: new Date(l.pretest.due)
        });
      }

      if (l.posttest?.required && l.posttest?.due) {
        items.push({
          t: `Post-test บทที่ ${l.index} · ${l.title}`,
          course: l.course?.code || "NUR301",
          tone: "info",
          kind: "posttest",
          to: `/s/lesson/${l.id}`,
          date: new Date(l.posttest.due)
        });
      }
    });

    return items
      .filter(item => item.date >= now)
      .sort((a, b) => a.date - b.date);
  };

  const upcoming = getUpcomingDeadlines();

  if (loading) return <Loading className="container p-5 text-center muted" />;

  return (
    <div className="container">
      <PageHead kicker={getHeaderLabel(viewedDate)} title="ปฏิทินการส่งงาน"
        desc="กำหนดส่งใบงานและแบบทดสอบของทุกรายวิชา รวมไว้ในที่เดียว"
        right={<div className="flex items-center gap-2">
          <button className="iconbtn" onClick={prevMonth}><Icon name="chevL" size={16} /></button>
          <div className="t-base fw-6" style={{ minWidth: 130, textAlign: "center" }}>{getHeaderLabel(viewedDate)}</div>
          <button className="iconbtn" onClick={nextMonth}><Icon name="chevR" size={16} /></button>
        </div>} />

      <div className="flex gap-5 items-start">
        {/* month grid */}
        <div className="card card-p flex-1" style={{ minWidth: 0 }}>
          <div className="cal-grid mb-1">{DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}</div>
          <div className="cal-grid">
            {cells.map((day, i) => {
              const inMonth = day >= 1 && day <= daysInMonth;
              const num = inMonth ? day : (day < 1 ? getDaysInMonth(viewedDate.getFullYear(), viewedDate.getMonth() - 1) + day : day - daysInMonth);
              const evs = inMonth ? (CAL_EVENTS[day] || []) : [];
              return (
                <div key={i} className={"cal-cell" + (!inMonth ? " muted-day" : "") + (inMonth && day === TODAY ? " today" : "")}>
                  <div className="flex items-center justify-between">
                    <span className="dnum">{num}</span>
                    {inMonth && day === TODAY && <span className="badge badge-primary" style={{ height: 17, padding: "0 6px", fontSize: 9.5 }}>วันนี้</span>}
                  </div>
                  {evs.map((e, j) => (
                    <div key={j} className="cal-ev" style={{ background: TONE_BG[e.tone], color: TONE_FG[e.tone] }} onClick={() => nav(e.to)} title={e.t}>
                      <span className="d" /><span className="truncate">{e.t}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* upcoming list */}
        <div style={{ width: 312, flex: "0 0 312px" }}>
          <div className="card">
            <div className="card-h"><div className="title flex items-center gap-2"><Icon name="clock" size={16} className="c-primary" />กำหนดส่งที่ใกล้ถึง</div></div>
            <div style={{ padding: 8 }}>
              {upcoming.length === 0 ? (
                <div className="empty" style={{ padding: "24px 0" }}>
                  <div className="ec"><Icon name="cal" size={20} /></div>
                  <div className="t-xs muted">ไม่มีกำหนดส่งเร็วๆ นี้</div>
                </div>
              ) : (
                upcoming.map((e, i) => {
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);
                  const diffMs = e.date.getTime() - now.getTime();
                  const left = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                  
                  const monthsShortThai = [
                    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
                    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
                  ];
                  const monthStr = monthsShortThai[e.date.getMonth()];
                  
                  return (
                    <div key={i} className="flex items-center gap-3 pointer" style={{ padding: "11px 12px", borderRadius: 11 }} onClick={() => nav(e.to)}>
                      <div style={{ width: 46, flex: "0 0 46px", textAlign: "center", padding: "6px 0", borderRadius: 9, background: TONE_BG[e.tone], color: TONE_FG[e.tone] }}>
                        <div className="t-xs fw-6" style={{ lineHeight: 1 }}>{monthStr}</div>
                        <div className="t-lg fw-7 tnum" style={{ lineHeight: 1.1 }}>{e.date.getDate()}</div>
                      </div>
                      <div className="flex-1" style={{ minWidth: 0 }}>
                        <div className="t-sm fw-6 truncate">{e.t}</div>
                        <div className="flex items-center gap-2 t-xs muted mt-1">
                          <span className="flex items-center gap-1"><Icon name="file" size={12} />{e.course}</span>
                        </div>
                      </div>
                      <Badge tone={left <= 3 ? "warning" : "muted"}>{left === 0 ? "วันนี้" : "อีก " + left + " วัน"}</Badge>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="card card-p mt-4">
            <div className="t-sm fw-7 mb-2">ประเภทกำหนดส่ง</div>
            <div className="flex items-center gap-2 t-sm mb-2"><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--primary)" }} />ใบงาน / งานที่มอบหมาย</div>
            <div className="flex items-center gap-2 t-sm mb-2"><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--info)" }} />แบบทดสอบ Pre / Post-test</div>
            <div className="flex items-center gap-2 t-sm"><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--warning)" }} />ใกล้ครบกำหนด</div>
          </div>
        </div>
      </div>
    </div>
  );
}
