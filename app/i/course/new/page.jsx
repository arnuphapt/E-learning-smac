"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { PageHead, Crumb } from "@/components/ui/Shared";
import { toast } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";


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

function MultiSelect({ options, selectedValues, onChange, placeholder = "เลือกคณาจารย์..." }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOptions = options.filter(opt => selectedValues.includes(opt.id));

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <style>{`
        .multi-option-item:hover {
          background-color: var(--muted, #f1f5f9) !important;
        }
      `}</style>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="input flex items-center justify-between"
        style={{ 
          cursor: "pointer", 
          minHeight: 40, 
          height: "auto", 
          padding: "6px 12px", 
          display: "flex", 
          flexWrap: "wrap", 
          gap: 6,
          background: "var(--surface, #fff)",
          border: "1px solid var(--border-strong, #cbd5e1)",
          borderRadius: 8
        }}
      >
        {selectedOptions.length === 0 ? (
          <span className="muted t-sm">{placeholder}</span>
        ) : (
          <div className="flex wrap gap-1" style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {selectedOptions.map(opt => (
              <span 
                key={opt.id} 
                className="badge" 
                style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: 4, 
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: "var(--primary-soft, #eef6ff)",
                  color: "var(--primary-soft-fg, #1e5fa8)",
                  border: "1px solid var(--border, #bfdbfe)",
                  fontSize: "12px",
                  fontWeight: 600
                }}
              >
                {opt.name}
                <span 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onChange(selectedValues.filter(id => id !== opt.id)); 
                  }}
                  style={{ 
                    cursor: "pointer", 
                    fontWeight: "bold",
                    fontSize: 12,
                    marginLeft: 4,
                    color: "var(--primary)"
                  }}
                >
                  ✕
                </span>
              </span>
            ))}
          </div>
        )}
        <Icon name="chevD" size={15} className="muted" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: ".15s", marginLeft: "auto" }} />
      </div>

      {isOpen && (
        <div 
          style={{ 
            position: "absolute", 
            top: "100%", 
            left: 0, 
            right: 0, 
            zIndex: 100, 
            background: "#fff", 
            border: "1px solid var(--border-strong, #cbd5e1)", 
            borderRadius: 8, 
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)", 
            marginTop: 4, 
            maxHeight: 220, 
            overflowY: "auto",
            padding: 6
          }}
        >
          {options.length === 0 ? (
            <div className="t-xs muted text-center p-3">ไม่มีข้อมูลผู้สอน</div>
          ) : (
            options.map(u => {
              const isSelected = selectedValues.includes(u.id);
              return (
                <div 
                  key={u.id}
                  onClick={() => {
                    if (isSelected) {
                      onChange(selectedValues.filter(id => id !== u.id));
                    } else {
                      onChange([...selectedValues, u.id]);
                    }
                  }}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 8, 
                    padding: "8px 12px", 
                    borderRadius: 6,
                    cursor: "pointer", 
                    background: isSelected ? "var(--primary-soft, #eef6ff)" : "transparent",
                    color: isSelected ? "var(--primary-soft-fg, #1e5fa8)" : "var(--fg)",
                    transition: ".1s",
                    userSelect: "none",
                    marginBottom: 2
                  }}
                  className="multi-option-item"
                >
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ pointerEvents: "none" }}
                  />
                  <div className="flex col" style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                    <span className="t-sm fw-6" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</span>
                    <span className="t-xs muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {u.role === "course_manager" ? "ผู้รับผิดชอบ" : "ผู้สอน"} · {u.email}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function CreateCourse() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user;
  const nav = (path) => router.push(path);

  React.useEffect(() => {
    if (status === "loading") return;
    if (!user || !hasPermission(user, PERMISSIONS.COURSES_CREATE)) {
      toast("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
      router.push("/i/courses");
    }
  }, [user, status]);

  const COLORS = ["#0d6e8c", "#1e5fa8", "#2f7d5b", "#5b4b9e", "#b4530b", "#0b1220"];
  const [title, setTitle] = React.useState("");
  const [code, setCode] = React.useState("");
  const [subtitle, setSubtitle] = React.useState("");
  const [color, setColor] = React.useState(COLORS[0]);
  const [term, setTerm] = React.useState("");
  const [credits, setCredits] = React.useState("3 (2-2-5)");
  const [subjectGroup, setSubjectGroup] = React.useState("");
  const [section, setSection] = React.useState("");
  const [yearLevels, setYearLevels] = React.useState([]);

  const [terms, setTerms] = React.useState([]);
  const [instructors, setInstructors] = React.useState([]);
  const [subjectGroups, setSubjectGroups] = React.useState([]);
  const [sections, setSections] = React.useState([]);
  const [groupManagers, setGroupManagers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  // RBAC Assignment States
  const [mainManagers, setMainManagers] = React.useState([]);
  const [selectedInstructors, setSelectedInstructors] = React.useState([]);

  React.useEffect(() => {
    async function load() {
      const [tRes, uRes, gRes, sRes, sgmRes] = await Promise.all([
        supabase.from("terms").select("*"),
        supabase.from("users").select("*").or("role.like.%instructor%,role.like.%admin%,role.like.%course_manager%"),
        supabase.from("subject_groups").select("*").eq("status", "active"),
        supabase.from("sections").select("*").eq("status", "active"),
        supabase.from("subject_group_managers").select("*")
      ]);

      const fetchedTerms = tRes.data || [];
      setTerms(fetchedTerms);
      if (fetchedTerms.length > 0) {
        setTerm(`${fetchedTerms[0].name} ${fetchedTerms[0].year}`);
      }

      const fetchedInstructors = uRes.data || [];
      setInstructors(fetchedInstructors);

      const fetchedGroups = gRes.data || [];
      setSubjectGroups(fetchedGroups);

      const fetchedGroupManagers = sgmRes.data || [];
      setGroupManagers(fetchedGroupManagers);
      
      // If course manager, auto-set their department and only show/pre-select it
      if (user?.role === "course_manager") {
        const myDbGroups = fetchedGroupManagers.filter(sgm => sgm.user_id === user.id).map(sgm => sgm.group_id);
        const myGroupId = myDbGroups[0] || user?.group_id;
        if (myGroupId) {
          setSubjectGroup(myGroupId);
        } else if (fetchedGroups.length > 0) {
          setSubjectGroup(fetchedGroups[0].id);
        }
      } else if (fetchedGroups.length > 0) {
        setSubjectGroup(fetchedGroups[0].id);
      }

      const fetchedSections = sRes.data || [];
      setSections(fetchedSections);
      if (fetchedSections.length > 0) {
        setSection(fetchedSections[0].name);
      }

      setLoading(false);
    }
    if (user) {
      load();
    }
  }, [user]);

  // Pre-select current user as main manager
  React.useEffect(() => {
    if (user?.id) {
      setMainManagers([user.id]);
    }
  }, [user]);

  // Handle group change side effects
  React.useEffect(() => {
    if (!subjectGroup || instructors.length === 0) return;
    
    // Clear selected instructors (since group changed)
    setSelectedInstructors([]);
  }, [subjectGroup, instructors]);

  // Group IDs managed by the current user computed directly from the fetched database managers
  const myManagedGroupIds = React.useMemo(() => {
    if (!user) return [];
    if (user.role === "admin") return subjectGroups.map(g => g.id);
    
    const dbGroupIds = groupManagers
      .filter(sgm => sgm.user_id === user.id)
      .map(sgm => sgm.group_id);
      
    if (user.group_id && !dbGroupIds.includes(user.group_id)) {
      dbGroupIds.push(user.group_id);
    }
    return dbGroupIds;
  }, [groupManagers, user, subjectGroups]);

  const filteredGroups = user?.role === "admin"
    ? subjectGroups
    : subjectGroups.filter(g => myManagedGroupIds.includes(g.id));

  const availableInstructors = instructors.filter(u =>
    !mainManagers.includes(u.id)
  );

  const create = async () => {
    if (!title || !code) {
      toast("กรุณากรอกชื่อวิชาและรหัสวิชา");
      return;
    }
    if (mainManagers.length === 0) {
      toast("กรุณาเลือกอาจารย์ผู้รับผิดชอบหลักอย่างน้อย 1 คน");
      return;
    }

    let selectedYear = new Date().getFullYear() + 543;
    const selectedTermObj = terms.find(t => `${t.name} ${t.year}` === term);
    if (selectedTermObj) {
      selectedYear = selectedTermObj.year;
    }

    const selectedGroup = subjectGroups.find(g => g.id === subjectGroup);
    const mainManagerNames = mainManagers
      .map(id => instructors.find(u => u.id === id)?.name)
      .filter(Boolean);
    const mainManagerName = mainManagerNames.length > 0 ? mainManagerNames.join(", ") : (user?.name || "ไม่ระบุ");

    const newCourse = {
      id: "c_" + Date.now(),
      code,
      title,
      subtitle,
      term,
      year: String(selectedYear),
      instructor: mainManagerName,
      group_id: subjectGroup || null,
      group_name: selectedGroup?.name || null,
      section: section || null,
      lessons: 0,
      students: 0,
      progress: 0,
      hero: color,
      year_level: yearLevels,
      access: { allowedYears: [], allowedEmails: [] }
    };

    const { error } = await supabase.from("courses").insert([newCourse]);

    if (error) {
      console.error("Error creating course", error);
      toast("เกิดข้อผิดพลาดในการสร้างรายวิชา: " + error.message);
    } else {
      // Link main manager, selected instructors, and creator to course_instructors
      const insertRows = [];
      const uniqueUserIds = new Set();

      mainManagers.forEach(id => uniqueUserIds.add(id));
      selectedInstructors.forEach(id => uniqueUserIds.add(id));
      if (user?.id) uniqueUserIds.add(user.id);
      
      uniqueUserIds.forEach(userId => {
        insertRows.push({
          course_id: newCourse.id,
          user_id: userId
        });
      });

      if (insertRows.length > 0) {
        const { error: linkError } = await supabase.from("course_instructors").insert(insertRows);
        if (linkError) {
          console.error("Error linking course instructors:", linkError);
        }
      }

      toast("สร้างรายวิชาเรียบร้อยแล้ว");
      setTimeout(() => nav("/i/courses"), 700);
    }
  };

  if (status === "loading" || loading || !user || !hasPermission(user, PERMISSIONS.COURSES_CREATE)) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
        <div className="t-sm muted">กำลังโหลด...</div>
      </div>
    );
  }

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
                  <select 
                    className="input" 
                    value={subjectGroup} 
                    onChange={(e) => setSubjectGroup(e.target.value)}
                    disabled={user?.role === "course_manager" && filteredGroups.length <= 1}
                  >
                    {filteredGroups.length === 0 ? (
                      <option value="">— ยังไม่มีกลุ่มวิชา กรุณาเพิ่มในระบบหลักก่อน —</option>
                    ) : (
                      <>
                        <option value="">เลือกกลุ่มวิชา</option>
                        {filteredGroups.map((g) => (
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
                <div className="field">
                  <label className="label">อาจารย์ผู้รับผิดชอบหลัก <span className="c-danger">*</span></label>
                  <MultiSelect
                    options={instructors.filter(u => !selectedInstructors.includes(u.id))}
                    selectedValues={mainManagers}
                    onChange={setMainManagers}
                    placeholder="เลือกอาจารย์ผู้รับผิดชอบหลัก..."
                  />
                </div>
                <div className="field">
                  <label className="label">หน่วยกิต</label>
                  <input className="input" value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="เช่น 3 (2-2-5)" />
                </div>
              </div>

              {/* อาจารย์ผู้สอนร่วม */}
              <div className="field" style={{ marginTop: 12 }}>
                <label className="label">อาจารย์ผู้สอนร่วม <span className="t-xs muted fw-4">(เลือกได้หลายคน)</span></label>
                <div style={{ paddingTop: 6 }}>
                  <MultiSelect
                    options={availableInstructors}
                    selectedValues={selectedInstructors}
                    onChange={setSelectedInstructors}
                    placeholder="เลือกอาจารย์ผู้สอนร่วม..."
                  />
                </div>
              </div>

              {/* Year Level Access */}
              <div className="field" style={{ marginTop: 12 }}>
                <label className="label">ชั้นปีที่เข้าถึงได้ <span className="t-xs muted fw-4">(ไม่เลือก = ทุกชั้นปี)</span></label>
                <div className="flex items-center gap-3 flex-wrap" style={{ paddingTop: 6 }}>
                  {[1, 2, 3, 4].map((yr) => {
                    const checked = yearLevels.includes(yr);
                    return (
                      <label key={yr} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", userSelect: "none",
                        padding: "7px 14px", borderRadius: 9, border: `1.5px solid ${checked ? "var(--primary)" : "var(--border)"}`,
                        background: checked ? "var(--primary-bg, #eef6ff)" : "var(--surface)", transition: ".15s", fontWeight: checked ? 700 : 400,
                        color: checked ? "var(--primary)" : "var(--fg)" }}>
                        <input type="checkbox" style={{ display: "none" }} checked={checked}
                          onChange={() => setYearLevels(prev => checked ? prev.filter(y => y !== yr) : [...prev, yr].sort())} />
                        <span style={{ width: 16, height: 16, borderRadius: 5, border: `2px solid ${checked ? "var(--primary)" : "var(--border-strong)"}`,
                          background: checked ? "var(--primary)" : "transparent", display: "grid", placeItems: "center", flexShrink: 0 }}>
                          {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </span>
                        ชั้นปี {yr}
                      </label>
                    );
                  })}
                </div>
                {yearLevels.length === 0 && (
                  <div className="t-xs muted mt-2" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M10 9v5M10 7v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    นักศึกษาทุกชั้นปีจะมองเห็นรายวิชานี้
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-h"><div className="title">สีปกรายวิชา</div><div className="desc">ใช้แสดงบนการ์ดรายวิชาและหัวบทเรียน</div></div>
            <div className="card-p flex gap-3 wrap" style={{ alignItems: "center" }}>
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} style={{ width: 46, height: 46, borderRadius: 12, background: c, cursor: "pointer", border: "3px solid " + (color === c ? "var(--fg)" : "transparent"), boxShadow: "var(--shadow-xs)", display: "grid", placeItems: "center", color: "#fff" }}>
                  {color === c && <Icon name="check" size={18} />}
                </button>
              ))}
              <label title="เลือกสีเอง" style={{ width: 46, height: 46, borderRadius: 12, border: "2px dashed var(--border-strong)", cursor: "pointer", display: "grid", placeItems: "center", overflow: "hidden", position: "relative", background: COLORS.includes(color) ? "transparent" : color }}>
                {COLORS.includes(color) ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
                ) : (
                  !COLORS.includes(color) && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                )}
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
              </label>
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
                  <div className="flex items-center gap-2 mt-2 t-xs muted">
                    <Icon name="user" size={13} />
                    ผู้รับผิดชอบหลัก: {mainManagers.map(id => instructors.find(u => u.id === id)?.name).filter(Boolean).join(", ") || "ไม่ระบุ"}
                  </div>
                  {selectedInstructors.length > 0 && (
                    <div className="flex items-center gap-2 mt-1 t-xs muted">
                      <Icon name="users" size={13} />
                      ผู้สอนร่วม: {selectedInstructors.map(id => instructors.find(u => u.id === id)?.name).filter(Boolean).join(", ")}
                    </div>
                  )}
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
            <button className="btn btn-primary btn-lg btn-block" disabled={!title || !code || !term || mainManagers.length === 0} onClick={create}>
              <Icon name="plus" size={17} />สร้างรายวิชา
            </button>
            <button className="btn btn-outline btn-block" onClick={() => nav("/i/courses")}>ยกเลิก</button>
          </div>
          <div className="t-xs muted center mt-2">หลังสร้างแล้ว คุณจะเพิ่มบทเรียนและแบบทดสอบได้</div>
        </div>
      </div>
    </div>
  );
}
