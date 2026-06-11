"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Primitives";
import { PageHead } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";

const TONE_BG = { primary: "var(--primary-soft)", info: "var(--info-soft)", warning: "var(--warning-soft)", muted: "var(--muted)" };
const TONE_FG = { primary: "var(--primary-soft-fg)", info: "var(--info)", warning: "var(--warning)", muted: "var(--muted-fg)" };

export default function Calendar() {
  const router = useRouter();
  const nav = (path) => router.push(path);

  const [CAL_EVENTS, setEvents] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: assignments } = await supabase.from("assignments").select("*, course:courses(code)");
      const evs = {
        13: [{ t: "Pre-test บทที่ 2", course: "NUR301", tone: "warning", kind: "test", to: "/s/lesson/l2" }],
        23: [{ t: "Post-test บทที่ 1", course: "NUR301", tone: "info", kind: "test", to: "/s/lesson/l1" }],
      };
      if (assignments) {
        assignments.forEach(a => {
           const d = new Date(a.due);
           let day = d.getDate();
           if (isNaN(day)) day = 20; 
           if (!evs[day]) evs[day] = [];
           evs[day].push({
              t: a.title,
              course: a.course?.code || "NUR301",
              tone: "primary",
              kind: "assignment",
              to: "/s/lesson/" + a.lesson_id
           });
        });
      }
      setEvents(evs);
      setLoading(false);
    }
    load();
  }, []);

  const TODAY = 10; // 10 มิ.ย.
  const DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  const firstDow = 0; // 1 มิ.ย. 2568 = อาทิตย์
  const daysInMonth = 30;
  const cells = Array.from({ length: 35 }, (_, i) => i - firstDow + 1);

  const upcoming = Object.entries(CAL_EVENTS)
    .flatMap(([d, evs]) => evs.map((e) => ({ ...e, day: +d })))
    .filter((e) => e.day >= TODAY)
    .sort((a, b) => a.day - b.day);

  if (loading) return <Loading className="container p-5 text-center muted" />;

  return (
    <div className="container">
      <PageHead kicker="มิถุนายน 2568" title="ปฏิทินการส่งงาน"
        desc="กำหนดส่งใบงานและแบบทดสอบของทุกรายวิชา รวมไว้ในที่เดียว"
        right={<div className="flex items-center gap-2">
          <button className="iconbtn"><Icon name="chevL" size={16} /></button>
          <div className="t-base fw-6" style={{ minWidth: 116, textAlign: "center" }}>มิถุนายน 2568</div>
          <button className="iconbtn"><Icon name="chevR" size={16} /></button>
        </div>} />

      <div className="flex gap-5 items-start">
        {/* month grid */}
        <div className="card card-p flex-1" style={{ minWidth: 0 }}>
          <div className="cal-grid mb-1">{DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}</div>
          <div className="cal-grid">
            {cells.map((day, i) => {
              const inMonth = day >= 1 && day <= daysInMonth;
              const num = inMonth ? day : (day < 1 ? 31 + day : day - daysInMonth);
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
              {upcoming.map((e, i) => {
                const left = e.day - TODAY;
                return (
                  <div key={i} className="flex items-center gap-3 pointer" style={{ padding: "11px 12px", borderRadius: 11 }} onClick={() => nav(e.to)}>
                    <div style={{ width: 46, flex: "0 0 46px", textAlign: "center", padding: "6px 0", borderRadius: 9, background: TONE_BG[e.tone], color: TONE_FG[e.tone] }}>
                      <div className="t-xs fw-6" style={{ lineHeight: 1 }}>มิ.ย.</div>
                      <div className="t-lg fw-7 tnum" style={{ lineHeight: 1.1 }}>{e.day}</div>
                    </div>
                    <div className="flex-1" style={{ minWidth: 0 }}>
                      <div className="t-sm fw-6 truncate">{e.t}</div>
                      <div className="flex items-center gap-2 t-xs muted mt-1">
                        <span className="flex items-center gap-1"><Icon name={e.kind === "test" ? "clipboard" : "file"} size={12} />{e.course}</span>
                      </div>
                    </div>
                    <Badge tone={left <= 3 ? "warning" : "muted"}>{left === 0 ? "วันนี้" : "อีก " + left + " วัน"}</Badge>
                  </div>
                );
              })}
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
