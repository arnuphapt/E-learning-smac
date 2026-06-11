"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { PageHead, Crumb } from "@/components/ui/Shared";
import { toast } from "@/components/ui/Toast";

function ToggleRow({ label, on }) {
  const [v, setV] = React.useState(on);
  return (
    <div className="flex items-center justify-between" style={{ padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
      <span className="t-sm pretty" style={{ paddingRight: 12 }}>{label}</span>
      <button onClick={() => setV(!v)} style={{ width: 40, height: 23, borderRadius: 99, border: 0, cursor: "pointer", padding: 2, background: v ? "var(--primary)" : "#cbd5e1", transition: ".15s", flex: "0 0 40px" }}>
        <span style={{ display: "block", width: 19, height: 19, borderRadius: 99, background: "#fff", transform: v ? "translateX(17px)" : "translateX(0)", transition: ".15s" }} />
      </button>
    </div>
  );
}

export default function CreateCourse() {
  const router = useRouter();
  const nav = (path) => router.push(path);


  const COLORS = ["#0d6e8c", "#1e5fa8", "#2f7d5b", "#5b4b9e", "#b4530b", "#0b1220"];
  const [title, setTitle] = React.useState("");
  const [code, setCode] = React.useState("");
  const [subtitle, setSubtitle] = React.useState("");
  const [color, setColor] = React.useState(COLORS[0]);
  const [term, setTerm] = React.useState("");
  const [instructor, setInstructor] = React.useState("");
  const [credits, setCredits] = React.useState("3 (2-2-5)");
  const [subjectGroup, setSubjectGroup] = React.useState("");
  const [section, setSection] = React.useState("");

  const [terms, setTerms] = React.useState([]);
  const [instructors, setInstructors] = React.useState([]);
  const [subjectGroups, setSubjectGroups] = React.useState([]);
  const [sections, setSections] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      const [tRes, uRes, gRes, sRes] = await Promise.all([
        supabase.from("terms").select("*"),
        supabase.from("users").select("*").in("role", ["instructor", "admin"]),
        supabase.from("subject_groups").select("*").eq("status", "active"),
        supabase.from("sections").select("*").eq("status", "active")
      ]);

      const fetchedTerms = tRes.data || [];
      setTerms(fetchedTerms);
      if (fetchedTerms.length > 0) {
        setTerm(`${fetchedTerms[0].name} ${fetchedTerms[0].year}`);
      }

      const fetchedInstructors = uRes.data || [];
      setInstructors(fetchedInstructors);
      if (fetchedInstructors.length > 0) {
        setInstructor(fetchedInstructors[0].name);
      }

      const fetchedGroups = gRes.data || [];
      setSubjectGroups(fetchedGroups);
      if (fetchedGroups.length > 0) {
        setSubjectGroup(fetchedGroups[0].id);
      }

      const fetchedSections = sRes.data || [];
      setSections(fetchedSections);
      if (fetchedSections.length > 0) {
        setSection(fetchedSections[0].name);
      }

      setLoading(false);
    }
    load();
  }, []);

  const create = async () => {
    if (!title || !code) {
      toast("กรุณากรอกชื่อวิชาและรหัสวิชา");
      return;
    }

    let selectedYear = new Date().getFullYear() + 543;
    const selectedTermObj = terms.find(t => `${t.name} ${t.year}` === term);
    if (selectedTermObj) {
      selectedYear = selectedTermObj.year;
    }

    const selectedGroup = subjectGroups.find(g => g.id === subjectGroup);

    const newCourse = {
      id: "c_" + Date.now(),
      code,
      title,
      subtitle,
      term,
      year: String(selectedYear),
      instructor: instructor || "ไม่ระบุ",
      group_id: subjectGroup || null,
      group_name: selectedGroup?.name || null,
      section: section || null,
      lessons: 0,
      students: 0,
      progress: 0,
      hero: color,
      access: { allowedYears: [], allowedEmails: [] }
    };

    const { error } = await supabase.from("courses").insert([newCourse]);

    if (error) {
      console.error("Error creating course", error);
      toast("เกิดข้อผิดพลาดในการสร้างรายวิชา: " + error.message);
    } else {
      toast("สร้างรายวิชาเรียบร้อยแล้ว");
      setTimeout(() => nav("/i/courses"), 700);
    }
  };

  return (
    <div className="container">
      <Crumb nav={nav} items={[{ label: "รายวิชา", to: "/i/courses" }, { label: "สร้างรายวิชาใหม่" }]} />
      <PageHead kicker="พื้นที่อาจารย์ผู้สอน" title="สร้างรายวิชาใหม่"
        desc="กรอกข้อมูลพื้นฐานของรายวิชา จากนั้นจึงเพิ่มบทเรียน วิดีโอ และแบบทดสอบได้" />

      <div className="flex gap-5 items-start">
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="card mb-4">
            <div className="card-h"><div className="title">ข้อมูลรายวิชา</div></div>
            <div className="card-p">
              <div className="field">
                <label className="label">ชื่อรายวิชา <span className="c-danger">*</span></label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น การพยาบาลผู้ใหญ่ 1" />
              </div>
              <div className="grid grid-2 gap-3">
                <div className="field"><label className="label">รหัสวิชา <span className="c-danger">*</span></label><input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="เช่น NUR301" /></div>
                <div className="field"><label className="label">กลุ่มวิชา</label>
                  <select className="input" value={subjectGroup} onChange={(e) => setSubjectGroup(e.target.value)}>
                    {subjectGroups.length === 0 ? (
                      <option value="">— ยังไม่มีกลุ่มวิชา กรุณาเพิ่มในระบบหลักก่อน —</option>
                    ) : (
                      <>
                        <option value="">ไม่ระบุกลุ่มวิชา</option>
                        {subjectGroups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div className="grid grid-2 gap-3">
                <div className="field"><label className="label">ภาคเรียน</label>
                  <select className="input" value={term} onChange={(e) => setTerm(e.target.value)}>
                    {terms.length === 0 ? (
                      <option value="">(ไม่มีข้อมูลภาคเรียน - กรุณาเพิ่มในระบบหลักก่อน)</option>
                    ) : (
                      terms.map((t) => (
                        <option key={t.id} value={`${t.name} ${t.year}`}>{t.name} {t.year}</option>
                      ))
                    )}
                  </select>
                </div>
                <div className="field"><label className="label">Section / กลุ่มเรียน</label>
                  <select className="input" value={section} onChange={(e) => setSection(e.target.value)}>
                    {sections.length === 0 ? (
                      <option value="">— ยังไม่มี Section กรุณาเพิ่มในระบบหลักก่อน —</option>
                    ) : (
                      <>
                        <option value="">ไม่ระบุ Section</option>
                        {sections.map((s) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="label">คำอธิบายรายวิชา</label>
                <textarea className="input" rows={3} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="สรุปขอบเขตเนื้อหาและจุดเน้นของรายวิชา…" />
              </div>
              <div className="grid grid-2 gap-3">
                <div className="field" style={{ margin: 0 }}>
                  <label className="label">อาจารย์ผู้สอน</label>
                  <select className="input" value={instructor} onChange={(e) => setInstructor(e.target.value)}>
                    {instructors.length === 0 ? (
                      <option value="">(ไม่มีข้อมูลอาจารย์ผู้สอน - กรุณาเพิ่มผู้ใช้งาน)</option>
                    ) : (
                      instructors.map((u) => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))
                    )}
                  </select>
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label className="label">หน่วยกิต</label>
                  <input className="input" value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="เช่น 3 (2-2-5)" />
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-h"><div className="title">สีปกรายวิชา</div><div className="desc">ใช้แสดงบนการ์ดรายวิชาและหัวบทเรียน</div></div>
            <div className="card-p flex gap-3 wrap">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} style={{ width: 46, height: 46, borderRadius: 12, background: c, cursor: "pointer", border: "3px solid " + (color === c ? "var(--fg)" : "transparent"), boxShadow: "var(--shadow-xs)", display: "grid", placeItems: "center", color: "#fff" }}>
                  {color === c && <Icon name="check" size={18} />}
                </button>
              ))}
            </div>
          </div>


        </div>

        {/* live preview + actions */}
        <div style={{ width: 312, flex: "0 0 312px", position: "sticky", top: 18 }}>
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="card-h"><div className="title t-sm">ตัวอย่างการ์ดรายวิชา</div></div>
            <div className="card-p">
              <div className="card" style={{ overflow: "hidden" }}>
                <div style={{ height: 64, background: `linear-gradient(120deg, ${color}, ${color}cc)`, display: "flex", alignItems: "center", padding: "0 16px" }}>
                  <span className="badge" style={{ background: "rgba(255,255,255,.22)", color: "#fff", fontWeight: 700 }}>{code || "รหัสวิชา"}</span>
                </div>
                <div className="card-p" style={{ padding: 16 }}>
                  <div className="fw-7">{title || "ชื่อรายวิชา"}</div>
                  <div className="t-xs muted mt-1 pretty" style={{ minHeight: 30 }}>{subtitle || "คำอธิบายรายวิชาจะแสดงที่นี่"}</div>
                  <div className="flex items-center gap-2 mt-2 t-xs muted"><Icon name="user" size={13} />{instructor || "ไม่ระบุอาจารย์"}</div>
                  {section && (
                    <div className="flex items-center gap-2 mt-1 t-xs muted"><Icon name="users" size={13} />Section: {section}</div>
                  )}
                  {subjectGroup && subjectGroups.find(g => g.id === subjectGroup) && (
                    <div className="flex items-center gap-2 mt-1 t-xs muted"><Icon name="folder" size={13} />{subjectGroups.find(g => g.id === subjectGroup)?.name}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex col gap-2 mt-4">
            <button className="btn btn-primary btn-lg btn-block" disabled={!title || !code || !term} onClick={create}><Icon name="plus" size={17} />สร้างรายวิชา</button>
            <button className="btn btn-outline btn-block" onClick={() => nav("/i/courses")}>ยกเลิก</button>
          </div>
          <div className="t-xs muted center mt-2">หลังสร้างแล้ว คุณจะเพิ่มบทเรียนและแบบทดสอบได้</div>
        </div>
      </div>
    </div>
  );
}
