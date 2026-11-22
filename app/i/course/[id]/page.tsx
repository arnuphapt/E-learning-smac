"use client";

import React, { useState, useEffect, type ComponentType } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DEFAULT_DOMAIN, sectionRangeMatch } from "@/lib/course-access";
import type { Database, Json } from "@/lib/database.types";
import RawIcon from "@/components/ui/Icon";
import { Badge as RawBadge, Progress, Avatar as RawAvatar, Dialog as RawDialog, Ph as RawPh, statusBadge, Select as RawSelect } from "@/components/ui/Primitives";
import { PageHead as RawPageHead, Crumb as RawCrumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import RawTable from "@/components/ui/LegacyTable";
import { useConfirm as rawUseConfirm } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";
import { hasRole } from "@/lib/roles";

type CourseRow = Database["public"]["Views"]["courses"]["Row"];
type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];
type StudentRow = Database["public"]["Tables"]["users"]["Row"];
type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];
type TestScoreRow = Database["public"]["Tables"]["test_scores"]["Row"];
type SectionRow = Database["public"]["Tables"]["sections"]["Row"];
type CourseTab = "lessons" | "students" | "settings";

interface CourseAssignmentRef {
  id: string;
  lesson_id: string | null;
}

interface InstructorOption {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  group_id: string | null;
}

interface GradeRow {
  prefix: string;
  year_label: string;
}

interface CourseAccessJson {
  allowedEmails?: string[];
  sectionRanges?: unknown;
  [key: string]: unknown;
}

interface MultiSelectOption {
  id: string;
  name: string;
  email?: string | null;
}

interface TableProps<T> {
  headers?: React.ReactNode[];
  data?: T[];
  renderRow: (item: T) => React.ReactNode;
  colSpan?: number;
  className?: string;
  pageSize?: number;
  emptyText?: string;
  filter?: React.ReactNode;
  enableSearch?: boolean;
  searchKeys?: string[];
  searchPlaceholder?: string;
  title?: string;
  description?: string;
  addButton?: React.ReactNode;
  loading?: boolean;
  sortKeys?: Array<string | boolean | null | ((item: T) => unknown)>;
}

type ConfirmFn = (opts: {
  title?: string;
  desc?: string;
  message?: string;
  danger?: boolean;
  cancelText?: string;
  confirmText?: string;
}) => Promise<boolean>;

const Icon = RawIcon as unknown as ComponentType<{
  name: string;
  size?: number;
  sw?: number;
  fill?: string;
  style?: React.CSSProperties;
  className?: string;
}>;
const Badge = RawBadge as unknown as ComponentType<{
  children?: React.ReactNode;
  tone?: string;
  dot?: boolean;
  draggable?: boolean;
}>;
const Avatar = RawAvatar as unknown as ComponentType<{
  name?: string;
  size?: number;
  color?: string;
  src?: string;
}>;
const Dialog = RawDialog as unknown as ComponentType<{
  open?: boolean;
  title?: string;
  desc?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onClose?: () => void;
  lg?: boolean;
}>;
const Ph = RawPh as unknown as ComponentType<{
  label?: string;
  h?: number;
  style?: React.CSSProperties;
}>;
const Select = RawSelect as unknown as ComponentType<{
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  id?: string;
}>;
const PageHead = RawPageHead as unknown as ComponentType<{
  kicker?: string;
  title?: string;
  desc?: string;
  right?: React.ReactNode;
}>;
const Crumb = RawCrumb as unknown as ComponentType<{
  items?: Array<{ label: string; to?: string; onClick?: () => void }>;
  nav?: (path: string) => void;
}>;
const Table = RawTable as unknown as <T>(props: TableProps<T>) => React.ReactElement | null;
const useConfirm = rawUseConfirm as unknown as () => ConfirmFn;

function parseCourseAccess(raw: Json | null | undefined): CourseAccessJson {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as CourseAccessJson;
}

const getStudentSectionName = (
  studentNo: string | null | undefined,
  defaultSection: string | null | undefined,
  sectionsList: SectionRow[]
) => {
  if (!studentNo || !sectionsList || sectionsList.length === 0) return defaultSection || "-";
  const snoStr = String(studentNo).trim();
  if (snoStr.length < 3) return defaultSection || "-";
  const last3 = parseInt(snoStr.slice(-3), 10);
  if (isNaN(last3)) return defaultSection || "-";
  
  for (const s of sectionsList) {
    if (s.range_start && s.range_end) {
      const start = parseInt(s.range_start, 10);
      const end = parseInt(s.range_end, 10);
      if (!isNaN(start) && !isNaN(end)) {
        if (last3 >= start && last3 <= end) {
          return s.name;
        }
      }
    }
  }
  return defaultSection || "-";
};

function MultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder = "เลือก...",
}: {
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = options.filter(o => selectedValues.includes(o.id));
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setIsOpen(!isOpen)} className="input"
        style={{ cursor: "pointer", minHeight: 40, height: "auto", padding: "6px 12px", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {selected.length === 0 ? <span className="muted t-sm">{placeholder}</span> : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1 }}>
            {selected.map(o => (
              <span key={o.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, background: "var(--primary-soft)", color: "var(--primary)", border: "1px solid var(--border)", fontSize: 12, fontWeight: 600 }}>
                {o.name}
                <span onClick={e => { e.stopPropagation(); onChange(selectedValues.filter(id => id !== o.id)); }} style={{ cursor: "pointer", fontWeight: "bold", fontSize: 12 }}>✕</span>
              </span>
            ))}
          </div>
        )}
        <Icon name="chevD" size={15} className="muted" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: ".15s", marginLeft: "auto", flexShrink: 0 }} />
      </div>
      {isOpen && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--surface, #fff)", border: "1px solid var(--border-strong)", borderRadius: 8, boxShadow: "0 10px 24px rgba(0,0,0,0.1)", marginTop: 4, maxHeight: 220, overflowY: "auto", padding: 6 }}>
          {options.length === 0 ? <div className="t-xs muted text-center p-3">ไม่มีข้อมูล</div> : options.map(u => {
            const isSel = selectedValues.includes(u.id);
            return (
              <div key={u.id} onClick={() => onChange(isSel ? selectedValues.filter(id => id !== u.id) : [...selectedValues, u.id])}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 6, cursor: "pointer", background: isSel ? "var(--primary-soft)" : "transparent", color: isSel ? "var(--primary)" : "var(--fg)", marginBottom: 2, userSelect: "none" }}>
                <input type="checkbox" checked={isSel} onChange={() => {}} style={{ pointerEvents: "none" }} />
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span className="t-sm fw-6">{u.name}</span>
                  <span className="t-xs muted">{u.email}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StudentRoster({ 
  students, 
  courseSubmissions, 
  enrolledScores, 
  lessons, 
  assignments,
  allStudents = [],
  courseId,
  allowedEmails = [],
  onUpdateAllowedEmails,
  sectionsList = []
}: {
  students: StudentRow[];
  courseSubmissions: SubmissionRow[];
  enrolledScores: TestScoreRow[];
  lessons: LessonRow[];
  assignments: CourseAssignmentRef[];
  allStudents?: StudentRow[];
  courseId: string | null;
  allowedEmails?: string[];
  onUpdateAllowedEmails: (emails: string[]) => Promise<void>;
  sectionsList?: SectionRow[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tempEmails, setTempEmails] = useState<string[]>([]);

  const handleOpen = () => {
    setTempEmails(allowedEmails);
    setSearch("");
    setIsOpen(true);
  };

  const handleSave = async () => {
    await onUpdateAllowedEmails(tempEmails);
    setIsOpen(false);
  };

  const toggleStudent = (email: string) => {
    if (tempEmails.includes(email)) {
      setTempEmails(tempEmails.filter(e => e !== email));
    } else {
      setTempEmails([...tempEmails, email]);
    }
  };

  const filteredStudents = allStudents.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.name || "").toLowerCase().includes(q) ||
      (s.student_no || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <Table<StudentRow>
        title={`รายชื่อนักศึกษา (${students.length})`}
        className="table"
        searchPlaceholder="ค้นหาชื่อ หรือรหัสนักศึกษา..."
        addButton={
          <button className="btn btn-outline" onClick={handleOpen} style={{ height: 36, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="users" size={15} /> จัดการนักศึกษาเพิ่มเติม
          </button>
        }
        headers={[
          "รหัสนักศึกษา",
          "ชื่อ-นามสกุล",
          "Section",
          <span className="hide-m" key="progress">ความคืบหน้า</span>
        ]}
        data={students}
        colSpan={4}
        renderRow={(s) => {
          const studentId = s.id;
          const studentSubs = courseSubmissions.filter(sub => sub.student_id === studentId);
          const submittedCount = studentSubs.length;
          
          const totalAssignments = assignments.length;
          
          let progressPct = 0;
          if (totalAssignments > 0) {
            progressPct = (submittedCount / totalAssignments) * 100;
          }

          const displaySection = getStudentSectionName(s.student_no, s.section, sectionsList);
          const isAllowedEmail = Boolean(s.email && allowedEmails.includes(s.email));

          return (
            <tr key={s.id}>
              <td className="num">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {s.student_no}
                  {isAllowedEmail && (
                    <span title="นักศึกษาเพิ่มกรณีพิเศษ (Manual)" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)", display: "inline-block" }} />
                  )}
                </div>
              </td>
              <td className="fw-6">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {s.name}
                  {isAllowedEmail && (
                    <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "var(--primary-soft)", color: "var(--primary)", fontWeight: 600 }}>กรณีพิเศษ</span>
                  )}
                </div>
              </td>
              <td>{displaySection}</td>
              <td className="hide-m">
                <div className="flex items-center gap-3">
                  <Progress value={progressPct} />
                  <span className="muted t-xs">{submittedCount}/{totalAssignments}</span>
                </div>
              </td>
            </tr>
          );
        }}
      />

      {isOpen && (
        <div className="overlay" onClick={() => setIsOpen(false)} style={{ zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="dialog scroll" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
            
            <div className="dialog-h flex items-center justify-between" style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div className="title" style={{ fontSize: "17px", fontWeight: 700, color: "var(--fg)" }}>จัดการสิทธิ์นักศึกษาเพิ่มเติม</div>
                <div className="desc pretty" style={{ fontSize: "12.5px", color: "var(--muted-fg)", marginTop: 4 }}>
                  เลือกนักศึกษาที่ใช้อีเมลเก่าหรือต้องการให้เข้าเรียนรายวิชานี้เป็นกรณีพิเศษ ( bypass ชั้นปีและกลุ่มเรียน )
                </div>
              </div>
              <button className="iconbtn ghost" onClick={() => setIsOpen(false)} style={{ border: 0, background: "transparent", cursor: "pointer", width: 32, height: 32, display: "grid", placeItems: "center" }}>
                <Icon name="x" size={18} />
              </button>
            </div>

            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", background: "#f8fafc" }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 12, color: "#64748b", display: "flex", alignItems: "center", pointerEvents: "none" }}>
                  <Icon name="search" size={15} />
                </span>
                <input
                  type="text"
                  className="input"
                  placeholder="ค้นหาชื่อ, รหัสนักศึกษา หรืออีเมล..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    height: 38,
                    paddingLeft: 38,
                    paddingRight: 12,
                    fontSize: 13,
                    background: "#fff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8
                  }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px 24px", minHeight: 250, maxHeight: 380 }}>
              {filteredStudents.length === 0 ? (
                <div className="text-center muted p-5 t-sm">ไม่พบรายชื่อนักศึกษา</div>
              ) : (
                filteredStudents.map(s => {
                  const email = s.email || "";
                  const isChecked = tempEmails.includes(email);
                  const isManuallyAddedInitially = allowedEmails.includes(email);
                  return (
                    <div 
                      key={s.id} 
                      onClick={() => toggleStudent(email)}
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 12, 
                        padding: "10px 12px", 
                        borderRadius: 8, 
                        cursor: "pointer", 
                        background: isChecked ? "var(--primary-soft)" : "transparent",
                        marginBottom: 4, 
                        transition: ".1s",
                        userSelect: "none"
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => {}} 
                        style={{ pointerEvents: "none", width: 16, height: 16 }} 
                      />
                      <div className="flex-1" style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="fw-6 t-sm" style={{ color: "var(--fg)" }}>{s.name}</span>
                          <span className="t-xs muted tnum">({s.student_no})</span>
                          {isManuallyAddedInitially && (
                            <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--primary-soft)", color: "var(--primary)", fontWeight: 600 }}>เพิ่มด้วยมือ</span>
                          )}
                        </div>
                        <div className="t-xs muted truncate">{s.email} {s.section ? `· Sec ${s.section}` : ""}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="dialog-f" style={{ padding: "16px 24px", background: "#f8fafc", borderTop: "1px solid var(--border)", gap: 12, display: "flex", justifyContent: "flex-end" }}>
              <span className="t-xs muted" style={{ marginRight: "auto", alignSelf: "center" }}>
                เลือกแล้ว {tempEmails.length} คน
              </span>
              <button 
                className="btn btn-outline" 
                onClick={() => setIsOpen(false)}
                style={{ height: 36, padding: "0 16px", borderRadius: 8, fontSize: "13px" }}
              >
                ยกเลิก
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSave}
                style={{ 
                  height: 36, 
                  padding: "0 16px", 
                  borderRadius: 8, 
                  fontSize: "13px",
                  background: "var(--primary)",
                  color: "#fff",
                  borderColor: "transparent"
                }}
              >
                บันทึกการแก้ไข
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

export default function InstructorCourse() {
  const router = useRouter();
  const params = useParams();
  const nav = (path: string) => router.push(path);
  const confirm = useConfirm();
  const { data: session } = useSession();
  const user = session?.user;

  const rawId = params?.id;
  const courseId = Array.isArray(rawId) ? rawId[0] : rawId;
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [assignments, setAssignments] = useState<CourseAssignmentRef[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [testScores, setTestScores] = useState<TestScoreRow[]>([]);
  const [courseInstructors, setCourseInstructors] = useState<InstructorOption[]>([]);
  const [availableInstructors, setAvailableInstructors] = useState<InstructorOption[]>([]);
  const [allInstructors, setAllInstructors] = useState<InstructorOption[]>([]);
  const [editMainManagers, setEditMainManagers] = useState<string[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  
  const [tab, setTab] = useState<CourseTab>("lessons");
  const [loading, setLoading] = useState(true);
  const [editTitle, setEditTitle] = useState("");
  const [editYearLevels, setEditYearLevels] = useState<Array<string | number>>([]);
  const [savingTitle, setSavingTitle] = useState(false);
  const [masterYearLabels, setMasterYearLabels] = useState<string[]>([]);
  const [gradesList, setGradesList] = useState<GradeRow[]>([]);
  const [editSection, setEditSection] = useState("");
  const [sectionsList, setSectionsList] = useState<SectionRow[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const loadData = async () => {
    if (!courseId || !user) return;
    const [cRes, lRes, sRes, subRes, tsRes, aRes, ciRes, insRes, sgRes, secRes] = await Promise.all([
      supabase.from("courses").select("*").eq("id", courseId).single(),
      supabase.from("lessons").select("*").eq("course_id", courseId).order("index", { ascending: true }),
      supabase.from("users").select("*").eq("role", "student"),
      supabase.from("submissions").select("*"),
      supabase.from("test_scores").select("*"),
      supabase.from("assignments").select("id, lesson_id").eq("course_id", courseId),
      supabase.from("course_instructors").select("user_id").eq("course_id", courseId),
      supabase.from("users").select("id, name, email, role, group_id").or("role.like.%instructor%,role.like.%course_manager%,role.like.%admin%"),
      supabase.from("student_grades").select("prefix, year_label").eq("domain", DEFAULT_DOMAIN),
      supabase.from("sections").select("*").eq("status", "active")
    ]);
    
    // The `courses` view hides tutor sets, so fall back to courses_all to load one for editing.
    const cData = cRes.data ?? (await supabase.from("courses_all").select("*").eq("id", courseId).single()).data;
    // tutor sets are managed in their own workspace, never through the course editor
    if (cData?.kind === "tutor") { router.replace("/i/tutor/" + courseId); return; }
    if (cData) {
      const c = cData;
      const instructorsList = ciRes?.data || [];
      const isInstructorAssigned = instructorsList.some(i => i.user_id === user?.id);

      // Security check:
      // 1. Admin has access to everything
      // 2. Course manager has access to courses in their group/department OR assigned to them
      // 3. Instructor has access to courses assigned to them
      let hasAccess = false;
      if (hasRole(user?.role, "admin")) {
        hasAccess = true;
      } else if (hasRole(user?.role, "course_manager")) {
        hasAccess = c.group_id === user.group_id || (c.group_id ? Boolean(user.group_ids?.includes(c.group_id)) : false) || isInstructorAssigned;
      } else if (hasRole(user?.role, "instructor")) {
        hasAccess = isInstructorAssigned;
      }

      if (!hasAccess) {
        toast("คุณไม่มีสิทธิ์เข้าถึงหรือจัดการรายวิชานี้", "error");
        nav("/i/courses");
        return;
      }

      setCourse(c);
      setEditTitle(c.title || "");
      setEditYearLevels((c.year_level || []).map(y => typeof y === 'number' || !isNaN(Number(y)) ? `ชั้นปีที่ ${y}` : y));
      setEditSection(c.section || "");

      const allInstructorsInDb = insRes.data || [];
      setAllInstructors(allInstructorsInDb);

      const assignedIds = instructorsList.map(ci => ci.user_id);
      
      // Find matching users for c.instructor (comma-separated names)
      const instructorNames = (c.instructor || "").split(",").map(n => n.trim()).filter(Boolean);
      const matchingUsers = allInstructorsInDb.filter(u => instructorNames.includes(u.name));
      let mainManagerIds = matchingUsers.map(u => u.id);
      if (mainManagerIds.length === 0) {
        const groupCM = allInstructorsInDb.find(u => u.group_id === c.group_id && u.role?.split(",").map(r => r.trim()).includes("course_manager"));
        mainManagerIds = groupCM ? [groupCM.id] : [];
      }
      setEditMainManagers(mainManagerIds);

      // Exclude Main Manager from Assigned Instructors
      const assigned = allInstructorsInDb.filter(inst =>
        assignedIds.includes(inst.id) &&
        !mainManagerIds.includes(inst.id)
      );
      setCourseInstructors(assigned);

      // Exclude already-assigned and main managers
      const available = allInstructorsInDb.filter(inst =>
        !assignedIds.includes(inst.id) &&
        !mainManagerIds.includes(inst.id)
      );
      setAvailableInstructors(available);
    }
    if (lRes.data) setLessons(lRes.data);
    if (sRes.data) setStudents(sRes.data);
    if (subRes.data) setSubmissions(subRes.data);
    if (tsRes.data) {
      const lessonIds = lRes.data ? lRes.data.map(l => l.id) : [];
      const courseScores = tsRes.data.filter(ts => Boolean(ts.lesson_id && lessonIds.includes(ts.lesson_id)));
      setTestScores(courseScores);
    }
    if (aRes.data) setAssignments(aRes.data);
    
    if (sgRes?.data) {
      setGradesList(sgRes.data);
      const uniqueYears = Array.from(new Set(sgRes.data.map(g => g.year_label).filter((y): y is string => Boolean(y)))).sort();
      setMasterYearLabels(uniqueYears);
    }

    if (secRes?.data) {
      setSectionsList(secRes.data);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [courseId, user]);

  const handleAddInstructor = async (userIds: string[]) => {
    if (!courseId || !userIds || userIds.length === 0) return;
    try {
      const rows = userIds.map(uid => ({ course_id: courseId, user_id: uid }));
      const { error } = await supabase.from("course_instructors").insert(rows);
      if (error) throw error;
      toast("เพิ่มอาจารย์ผู้สอนร่วมเรียบร้อยแล้ว");
      loadData();
    } catch (error: unknown) {
      toast("เกิดข้อผิดพลาด: " + (error instanceof Error ? error.message : String(error)), "error");
    }
  };

  const handleRemoveInstructor = async (userId: string) => {
    if (!courseId) return;
    const confirmed = await confirm({
      title: "ยกเลิกสิทธิ์เข้าสอน",
      message: "คุณต้องการถอดถอนอาจารย์ท่านนี้ออกจากรายวิชาใช่หรือไม่? อาจารย์ท่านนี้จะไม่สามารถเข้าจัดการวิชานี้ได้อีกต่อไป",
      danger: true,
      confirmText: "ถอดถอน",
      cancelText: "ยกเลิก"
    });
    
    if (!confirmed) return;
    
    try {
      const { error } = await supabase
        .from("course_instructors")
        .delete()
        .eq("course_id", courseId)
        .eq("user_id", userId);
        
      if (error) throw error;
      toast("ถอดถอนอาจารย์ผู้สอนร่วมเรียบร้อยแล้ว");
      loadData();
    } catch (error: unknown) {
      toast("เกิดข้อผิดพลาด: " + (error instanceof Error ? error.message : String(error)), "error");
    }
  };

  const handleCreateLesson = async () => {
    try {
      toast("กำลังสร้างบทเรียนใหม่...");
      const nextIndex = lessons ? lessons.length + 1 : 1;
      const newId = "l_" + Date.now();
      const newLessonObj = {
        id: newId,
        course_id: courseId,
        title: "บทเรียนใหม่",
        description: "",
        duration: "",
        status: "draft",
        index: nextIndex,
        video: false,
        pretest: { required: false, passing_score: 50, time_limit: 30, attempts: "1", shuffle: true, show_answers: true, due: null, due_time: "23:59" },
        posttest: { required: false, passing_score: 50, time_limit: 30, attempts: "1", shuffle: true, show_answers: true, due: null, due_time: "23:59" },
        assignment: null,
        watch_limit: false,
        allow_download: true,
        allow_ai: true,
        has_docs: true,
        has_pretest: true,
        has_posttest: true,
        has_assignment: true
      };

      const { error } = await supabase.from("lessons").insert([newLessonObj]);
      if (error) {
        toast("เกิดข้อผิดพลาดในการสร้างบทเรียน: " + error.message, "error");
      } else {
        toast("สร้างบทเรียนใหม่สำเร็จแล้ว", "success");
        nav(`/i/lesson/${newId}`);
      }
    } catch (error: unknown) {
      console.error(error);
      toast("เกิดข้อผิดพลาดในการสร้างบทเรียน: " + (error instanceof Error ? error.message : String(error)), "error");
    }
  };

  const handleDeleteLesson = async (lId: string, lTitle: string) => {
    const confirmed = await confirm({
      title: "ลบบทเรียน",
      message: `คุณต้องการลบบทเรียน "${lTitle}" ใช่หรือไม่?\n\nคำเตือน: การดำเนินการนี้จะลบข้อสอบ Pre/Post-test, ใบงาน และรายการส่งงานทั้งหมดของบทเรียนนี้อย่างถาวร!`,
      danger: true,
      confirmText: "ลบบทเรียน",
      cancelText: "ยกเลิก"
    });

    if (!confirmed) {
      return;
    }

    try {
      const { data: assignments } = await supabase.from("assignments").select("id, rubric_id").eq("lesson_id", lId);
      const assignmentIds = assignments?.map((a) => a.id) || [];
      const rubricIds = assignments?.map((a) => a.rubric_id).filter((id): id is string => Boolean(id)) || [];

      if (assignmentIds.length > 0) {
        const { error: subErr } = await supabase.from("submissions").delete().in("assignment_id", assignmentIds);
        if (subErr) throw subErr;
      }

      if (assignmentIds.length > 0) {
        const { error: asgErr } = await supabase.from("assignments").delete().in("id", assignmentIds);
        if (asgErr) throw asgErr;
      }

      if (rubricIds.length > 0) {
        const { error: rubErr } = await supabase.from("rubrics").delete().in("id", rubricIds);
        if (rubErr) throw rubErr;
      }

      const { error: qErr } = await supabase.from("questions").delete().eq("lesson_id", lId);
      if (qErr) throw qErr;

      const { error: lesErr } = await supabase.from("lessons").delete().eq("id", lId);
      if (lesErr) throw lesErr;

      toast("ลบบทเรียนเรียบร้อยแล้ว");
      loadData();
    } catch (error: unknown) {
      console.error("Error deleting lesson:", error);
      toast("เกิดข้อผิดพลาดในการลบบทเรียน: " + (error instanceof Error ? error.message : String(error)), "error");
    }
  };

  const handleUpdateCourse = async () => {
    if (!course?.id) return;
    if (!editTitle) return toast("กรุณากรอกชื่อรายวิชา", "warning");

    setSavingTitle(true);
    try {
      const managerNames = editMainManagers
        .map(id => allInstructors.find(u => u.id === id)?.name)
        .filter((n): n is string => Boolean(n));
      const managerName = managerNames.length > 0 ? managerNames.join(", ") : course.instructor;

      const updatedAccess = { ...parseCourseAccess(course.access) };
      delete updatedAccess.sectionRanges;
      const updatedAccessJson = updatedAccess as unknown as Json;

      const finalYearLevels = editYearLevels.map(y => {
        const parsed = parseInt(String(y).replace(/\D/g, ''), 10);
        return isNaN(parsed) ? null : parsed;
      }).filter((y): y is number => Boolean(y));

      const { error } = await supabase
        .from("courses_all")
        .update({
          title: editTitle,
          year_level: finalYearLevels,
          instructor: managerName,
          section: editSection,
          access: updatedAccessJson
        })
        .eq("id", course.id);

      if (error) throw error;

      // Ensure all main managers are in course_instructors
      for (const mgId of editMainManagers) {
        const { data: existing } = await supabase
          .from("course_instructors")
          .select("user_id")
          .eq("course_id", course.id)
          .eq("user_id", mgId);
        if (!existing || existing.length === 0) {
          await supabase.from("course_instructors").insert({ course_id: course.id, user_id: mgId });
        }
      }

      setCourse({ 
        ...course, 
        title: editTitle, 
        year_level: finalYearLevels,
        instructor: managerName,
        section: editSection,
        access: updatedAccessJson
      });
      toast("บันทึกข้อมูลรายวิชาเรียบร้อยแล้ว");
      loadData();
    } catch (error: unknown) {
      console.error("Error updating course:", error);
      toast("เกิดข้อผิดพลาดในการบันทึกข้อมูลรายวิชา: " + (error instanceof Error ? error.message : String(error)), "error");
    } finally {
      setSavingTitle(false);
    }
  };

  const handleUpdateAllowedEmails = async (newEmails: string[]) => {
    if (!course?.id) return;
    try {
      const updatedAccess = {
        ...parseCourseAccess(course.access),
        allowedEmails: newEmails
      } as unknown as Json;
      const { error } = await supabase
        .from("courses_all")
        .update({ access: updatedAccess })
        .eq("id", course.id);

      if (error) throw error;
      toast("อัปเดตรายชื่อนักศึกษาเพิ่มเติมเรียบร้อยแล้ว");
      loadData();
    } catch (error: unknown) {
      console.error("Error updating allowed emails:", error);
      toast("เกิดข้อผิดพลาดในการอัปเดตรายชื่อนักศึกษา: " + (error instanceof Error ? error.message : String(error)), "error");
    }
  };

  const handleDeleteCourse = async () => {
    if (!course?.id) return;
    const confirmed = await confirm({
      title: "ลบรายวิชา",
      message: `คุณต้องการลบรายวิชา "${course.title} (${course.code})" ใช่หรือไม่?\n\nคำเตือน: การดำเนินการนี้จะลบบทเรียน, ข้อสอบ Pre/Post-test, ใบงาน และรายการส่งงานทั้งหมดของรายวิชานี้อย่างถาวรและไม่สามารถกู้คืนได้!`,
      danger: true,
      confirmText: "ลบรายวิชา",
      cancelText: "ยกเลิก"
    });

    if (!confirmed) {
      return;
    }

    try {
      const { data: assignments } = await supabase.from("assignments").select("id, rubric_id").eq("course_id", course.id);
      const assignmentIds = assignments?.map((a) => a.id) || [];
      const rubricIds = assignments?.map((a) => a.rubric_id).filter((id): id is string => Boolean(id)) || [];

      const { data: lessons } = await supabase.from("lessons").select("id").eq("course_id", course.id);
      const lessonIds = lessons?.map((l) => l.id) || [];

      if (assignmentIds.length > 0) {
        const { error: subErr } = await supabase.from("submissions").delete().in("assignment_id", assignmentIds);
        if (subErr) throw subErr;
      }

      if (assignmentIds.length > 0) {
        const { error: asgErr } = await supabase.from("assignments").delete().in("id", assignmentIds);
        if (asgErr) throw asgErr;
      }

      if (rubricIds.length > 0) {
        const { error: rubErr } = await supabase.from("rubrics").delete().in("id", rubricIds);
        if (rubErr) throw rubErr;
      }

      if (lessonIds.length > 0) {
        const { error: qErr } = await supabase.from("questions").delete().in("lesson_id", lessonIds);
        if (qErr) throw qErr;
      }

      if (lessonIds.length > 0) {
        const { error: lesErr } = await supabase.from("lessons").delete().in("id", lessonIds);
        if (lesErr) throw lesErr;
      }

      const { error: cErr } = await supabase.from("courses_all").delete().eq("id", course.id);
      if (cErr) throw cErr;

      toast("ลบรายวิชาเรียบร้อยแล้ว");
      nav("/i/courses");
    } catch (error: unknown) {
      console.error("Error deleting course:", error);
      toast("เกิดข้อผิดพลาดในการลบรายวิชา: " + (error instanceof Error ? error.message : String(error)), "error");
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, _index: number) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const reorderedLessons = [...lessons];
    const [draggedItem] = reorderedLessons.splice(draggedIndex, 1);
    reorderedLessons.splice(targetIndex, 0, draggedItem);

    const updatedLessons = reorderedLessons.map((item, idx) => ({
      ...item,
      index: idx + 1
    }));

    // Optimistically update state
    setLessons(updatedLessons);
    setDraggedIndex(null);

    try {
      toast("กำลังบันทึกลำดับบทเรียนใหม่...");
      
      const updates = updatedLessons.map(l => 
        supabase
          .from("lessons")
          .update({ index: l.index })
          .eq("id", l.id)
      );

      const results = await Promise.all(updates);
      const failed = results.find(r => r.error);
      if (failed) throw failed.error;

      toast("จัดลำดับบทเรียนสำเร็จ", "success");
    } catch (error: unknown) {
      console.error("Error updating lesson order:", error);
      toast("เกิดข้อผิดพลาดในการจัดลำดับบทเรียน: " + (error instanceof Error ? error.message : String(error)), "error");
      loadData();
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };



  if (loading) return <Loading className="container p-5 text-center muted" />;
  if (!course) {
    return (
      <div className="container p-5">
        <div className="card">
          <div className="empty">
            <div className="ec"><Icon name="alert" size={22} style={{ color: "var(--warning)" }} /></div>
            <div className="fw-6 fg" style={{ fontSize: "16px" }}>ไม่พบข้อมูลรายวิชา</div>
            <div className="t-sm muted">ไม่พบข้อมูลรายวิชาตามรหัสที่ระบุ หรือไม่มีอยู่ในฐานข้อมูลของระบบ</div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate enrolled students based on course section and access controls
  const courseSection = course.section;
  const allowedYears = (course.year_level || []) as Array<number | string>;
  const allowedEmails = parseCourseAccess(course.access).allowedEmails || [];
  const enrolledStudents = students.filter(s => {
    if (s.email && allowedEmails.includes(s.email)) {
      return true;
    }
    if (courseSection && courseSection !== "ไม่ระบุ Section") {
      const rangeMatch = sectionRangeMatch(s.student_no, courseSection, sectionsList);
      if (rangeMatch === true) {
        // matches by master range
      } else if (rangeMatch === false) {
        return false;
      } else {
        // fallback to profile section check
        if (s.section !== courseSection) {
          return false;
        }
      }
    }
    if (allowedYears.length > 0) {
      const prefix = s.student_no ? s.student_no.substring(0, 2) : "";
      const mapping = gradesList.find(g => g.prefix === prefix);
      const studentLabel = mapping ? mapping.year_label : null;
      const studentFallback = s.study_year ? Number(s.study_year) : null;
      
      const hasMatch = allowedYears.some(ay => {
        if (typeof ay === 'number' || !isNaN(Number(ay))) {
           return Number(ay) === studentFallback || ay == studentFallback;
        }
        return ay === studentLabel;
      });

      if (!hasMatch) {
        return false;
      }
    }
    return true;
  });

  const courseAssignmentIds = assignments.map(a => a.id);
  const courseSubmissions = submissions.filter(sub => Boolean(sub.assignment_id && courseAssignmentIds.includes(sub.assignment_id)));
  const pendingSubmissionsCount = courseSubmissions.filter(sub => sub.status === "submitted").length;

  const enrolledStudentIds = enrolledStudents.map(s => s.id);
  const enrolledScores = testScores.filter(ts => Boolean(ts.student_id && enrolledStudentIds.includes(ts.student_id)));
  const postScores = enrolledScores.map(ts => ts.post).filter((score): score is number => score !== null && score !== undefined);
  const avgPostTest = postScores.length > 0 ? (postScores.reduce((a, b) => a + b, 0) / postScores.length).toFixed(1) : "—";

  const stats: Array<[string, string | number, string]> = [
    ["บทเรียน", lessons.length, "book"],
    ["นักศึกษา", enrolledStudents.length, "users"],
    ["รอตรวจใบงาน", pendingSubmissionsCount, "file"],
    ["คะแนนเฉลี่ย Post-test", avgPostTest, "chart"]
  ];

  const tabItems: Array<[CourseTab, string, string]> = [
    ["lessons", "บทเรียน", "book"],
    ["students", "นักศึกษา", "users"],
    ...(hasRole(user?.role, "admin", "course_manager") ? ([["settings", "ตั้งค่ารายวิชา", "settings"]] as Array<[CourseTab, string, string]>) : [])
  ];

  return (
    <div className="container">
      <Crumb nav={nav} items={[{ label: "รายวิชา", to: "/i/courses" }, { label: course.code || "" }]} />
      <PageHead kicker={course.term ?? undefined} title={course.title ?? undefined}
        right={
          <div className="flex gap-2">
            {hasRole(user?.role, "admin", "course_manager") && (
              <button className="btn btn-outline" onClick={() => setTab("settings")}>
                <Icon name="settings" size={16} />ตั้งค่า
              </button>
            )}
            <button className="btn btn-primary" onClick={handleCreateLesson}>
              <Icon name="plus" size={16} />เพิ่มบทเรียน
            </button>
          </div>
        } 
      />

      <div className="grid grid-4 gap-3 mb-5">
        {stats.map((s, i) => (
          <div key={i} className="card card-p flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}><Icon name={s[2]} size={19} /></div>
            <div><div className="t-2xl fw-7 tnum" style={{ lineHeight: 1 }}>{s[1]}</div><div className="t-xs muted mt-1">{s[0]}</div></div>
          </div>
        ))}
      </div>

      <div className="tabs mb-4">
        {tabItems.map(([k, t, ic]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}><Icon name={ic} size={15} />{t}</button>
        ))}
      </div>

      {tab === "lessons" && (
        <div className="flex col gap-3">
          {lessons.map((l, index) => {
            const isDragging = draggedIndex === index;
            return (
              <div 
                key={l.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className="card card-p flex items-center gap-3 pointer" 
                style={{ 
                  padding: "14px 18px",
                  opacity: isDragging ? 0.4 : 1,
                  border: isDragging ? "2px dashed var(--primary)" : "1px solid var(--border)",
                  cursor: "grab",
                  transition: "all 0.15s ease"
                }} 
                onClick={() => nav("/i/lesson/" + l.id)}
              >
                <div className="iconbtn ghost" style={{ cursor: "grab" }} draggable={false}><Icon name="more" size={16} style={{ transform: "rotate(90deg)" }} /></div>
                <div style={{ width: 40, height: 40, borderRadius: 9, background: "var(--muted)", display: "grid", placeItems: "center", fontWeight: 700, color: "var(--primary)", flex: "0 0 40px" }} draggable={false}>{String(l.index).padStart(2, "0")}</div>
                <div className="flex-1" style={{ minWidth: 0 }} draggable={false}>
                  <div className="fw-6">{l.title}</div>
                  <div className="flex items-center gap-2 t-xs muted mt-1 wrap">
                    <span className="flex items-center gap-1"><Icon name="video" size={13} />{l.video || l.video_url ? "มีวิดีโอ" : "ไม่มีวิดีโอ"}</span><i className="dot-sep" />
                    <span className="flex items-center gap-1"><Icon name="clipboard" size={13} />Pre/Post-test</span><i className="dot-sep" />
                    <span className="flex items-center gap-1"><Icon name="file" size={13} />{
                      (() => {
                        const count = assignments.filter(a => a.lesson_id === l.id).length;
                        return count > 0 ? `${count} ใบงาน` : "ไม่มีใบงาน";
                      })()
                    }</span>
                  </div>
                </div>
                {(() => {
                  const lessonAsgIds = assignments.filter(a => a.lesson_id === l.id).map(a => a.id);
                  const pendingCount = submissions.filter(sub => Boolean(sub.assignment_id && lessonAsgIds.includes(sub.assignment_id)) && sub.status === "submitted").length;
                  return pendingCount > 0 ? <Badge tone="warning" dot draggable={false}>{pendingCount} รอตรวจ</Badge> : null;
                })()}
                <div className="flex items-center gap-2" draggable={false}>
                  <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); nav("/i/lesson/" + l.id); }} style={{ height: 32, padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="pencil" size={14} />จัดการ</button>
                  <button className="iconbtn ghost c-danger" onClick={(e) => { e.stopPropagation(); handleDeleteLesson(l.id, l.title); }} style={{ height: 32, width: 32 }}><Icon name="trash" size={15} /></button>
                </div>
              </div>
            );
          })}
          <button className="card card-p flex items-center justify-center gap-2 pointer muted" style={{ borderStyle: "dashed", background: "#fbfcfd" }} onClick={handleCreateLesson}>
            <Icon name="plus" size={17} />เพิ่มบทเรียนใหม่
          </button>
        </div>
      )}
      {tab === "students" && (
        <StudentRoster 
          students={enrolledStudents} 
          courseSubmissions={courseSubmissions} 
          enrolledScores={enrolledScores} 
          lessons={lessons} 
          assignments={assignments}
          allStudents={students}
          courseId={course.id}
          allowedEmails={allowedEmails}
          onUpdateAllowedEmails={handleUpdateAllowedEmails}
          sectionsList={sectionsList}
        />
      )}
      {tab === "settings" && (
        <div className="flex col gap-4">
          <div className="card card-p">
            <div className="t-base fw-7 mb-3">แก้ไขข้อมูลรายวิชา</div>
            
            <div className="field mb-3">
              <label className="label">ชื่อรายวิชา</label>
              <input 
                className="input" 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)} 
                placeholder="เช่น การพยาบาลผู้ใหญ่ 1" 
              />
            </div>

            {/* อาจารย์ผู้รับผิดชอบหลัก */}
            <div className="field mb-3">
              <label className="label">อาจารย์ผู้รับผิดชอบหลัก <span className="c-danger">*</span></label>
              <MultiSelect
                options={allInstructors}
                selectedValues={editMainManagers}
                onChange={setEditMainManagers}
                placeholder="เลือกอาจารย์ผู้รับผิดชอบหลัก..."
              />
            </div>

            {/* Year Level Access */}
            <div className="field mb-4">
              <label className="label">ชั้นปีที่เข้าถึงได้ <span className="t-xs muted fw-4">(ไม่เลือก = ทุกชั้นปี)</span></label>
              <div className="flex items-center gap-3 flex-wrap" style={{ paddingTop: 6 }}>
                {masterYearLabels.length === 0 ? (
                  <span className="t-sm muted">กำลังโหลดข้อมูลชั้นปี... หรือไม่มีข้อมูลชั้นปีในระบบ</span>
                ) : masterYearLabels.map((yrLabel) => {
                  const numberMatch = parseInt(yrLabel.replace(/\D/g, ''));
                  const checked = editYearLevels.includes(yrLabel) || (!isNaN(numberMatch) && editYearLevels.includes(numberMatch)) || editYearLevels.includes(String(numberMatch));
                  
                  return (
                    <label key={yrLabel} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", userSelect: "none",
                      padding: "7px 14px", borderRadius: 9, border: `1.5px solid ${checked ? "var(--primary)" : "var(--border)"}`,
                      background: checked ? "var(--primary-soft, #eef6ff)" : "var(--surface)", transition: ".15s", fontWeight: checked ? 700 : 400,
                      color: checked ? "var(--primary)" : "var(--fg)" }}>
                      <input type="checkbox" style={{ display: "none" }} checked={checked}
                        onChange={() => setEditYearLevels(prev => checked ? prev.filter(y => y !== yrLabel && (!isNaN(numberMatch) ? String(y) !== String(numberMatch) : true)) : [...prev, yrLabel].sort())} />
                      <span style={{ width: 16, height: 16, borderRadius: 5, border: `2px solid ${checked ? "var(--primary)" : "var(--border-strong)"}`,
                        background: checked ? "var(--primary)" : "transparent", display: "grid", placeItems: "center", flexShrink: 0 }}>
                        {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </span>
                      {yrLabel}
                    </label>
                  );
                })}
              </div>
              {editYearLevels.length === 0 && (
                <div className="t-xs muted mt-2" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M10 9v5M10 7v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  นักศึกษาทุกชั้นปีจะมองเห็นรายวิชานี้
                </div>
              )}
            </div>

            {course.kind === "tutor" && (
              <div className="field mb-4">
                <span className="badge">ชุดติว</span>
              </div>
            )}

            {/* Section Configuration */}
            <div className="field mb-4" style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <label className="label">กลุ่มเรียน / Section</label>
              <Select 
                className="input" 
                value={editSection} 
                onChange={(e) => setEditSection(e.target.value)}
              >
                <option value="">ไม่ระบุ Section</option>
                {Object.entries(
                  sectionsList.reduce<Record<string, SectionRow[]>>((acc, s) => {
                    const y = s.year_level || "ไม่ระบุชั้นปี";
                    if (!acc[y]) acc[y] = [];
                    acc[y].push(s);
                    return acc;
                  }, {})
                ).sort(([a], [b]) => a.localeCompare(b, "th"))
                .map(([year, secs]) => (
                  <optgroup key={year} label={year}>
                    {secs.map(s => (
                      <option key={s.id} value={s.name ?? ""}>{s.name}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </div>

            <div className="flex justify-end">
              <button 
                className={`btn btn-primary ${savingTitle ? "disabled" : ""}`} 
                onClick={handleUpdateCourse} 
                disabled={savingTitle || (
                  editTitle === course.title && 
                  JSON.stringify(editYearLevels.map(y => parseInt(String(y).replace(/\D/g, ''), 10)).filter(Boolean).sort()) === JSON.stringify((course.year_level || []).map(y => Number(y)).filter(Boolean).sort()) &&
                  JSON.stringify(editMainManagers) === JSON.stringify(allInstructors.filter(u => course.instructor?.split(", ").includes(u.name)).map(u => u.id)) &&
                  editSection === course.section
                )}
              >
                <Icon name={savingTitle ? "loader" : "check"} size={15} className={savingTitle ? "spin" : ""} />
                {savingTitle ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </button>
            </div>
          </div>

          {/* Managing Instructors section: only for admins and course managers */}
          {hasRole(user?.role, "admin", "course_manager") && (
            <div className="card card-p">
              <div className="t-base fw-7 mb-2">จัดการอาจารย์ผู้สอนร่วม (Instructors)</div>
              <p className="t-sm muted mb-3">มอบหมายสิทธิ์ให้อาจารย์ผู้สอนท่านอื่นในสาขาเดียวกัน เพื่อให้สามารถเข้ามาเพิ่มบทเรียน ตรวจงาน และจัดการวิชานี้ได้</p>
              
              {/* Assigned instructors list */}
              <div className="flex col gap-2 mb-4">
                <div className="t-xs fw-7 muted">อาจารย์ที่ได้รับสิทธิ์ในวิชานี้:</div>
                {courseInstructors.length === 0 ? (
                  <div className="t-sm muted p-3 border rounded text-center" style={{ borderStyle: "dashed", background: "var(--bg)" }}>ยังไม่มีอาจารย์ผู้สอนร่วมในรายวิชานี้</div>
                ) : (
                  courseInstructors.map(inst => (
                    <div key={inst.id} className="flex items-center justify-between p-2 border rounded bg-muted" style={{ background: "var(--muted)" }}>
                      <div className="flex items-center gap-2">
                        <Avatar name={inst.name.replace(/^อ\. (ดร\. )?/, "")} size={24} />
                        <div>
                          <div className="fw-6 t-sm">{inst.name}</div>
                          <div className="t-xs muted">{inst.email}</div>
                        </div>
                      </div>
                      {inst.id !== user?.id && (
                        <button 
                          className="iconbtn ghost c-danger" 
                          onClick={() => handleRemoveInstructor(inst.id)}
                          style={{ height: 28, width: 28 }}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add instructor multiselect form */}
              {availableInstructors.length > 0 ? (
                <div className="flex gap-2" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <MultiSelect
                      options={availableInstructors}
                      selectedValues={selectedToAdd}
                      onChange={setSelectedToAdd}
                      placeholder="เลือกอาจารย์เพื่อเพิ่มเข้าสู่รายวิชา..."
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    disabled={selectedToAdd.length === 0}
                    onClick={() => { handleAddInstructor(selectedToAdd); setSelectedToAdd([]); }}
                  >
                    <Icon name="plus" size={14} /> เพิ่มผู้สอน
                  </button>
                </div>
              ) : (
                <div className="t-xs muted">ไม่มีอาจารย์ผู้สอนท่านอื่นที่ว่างในสาขาวิชานี้</div>
              )}
            </div>
          )}

          <div className="card card-p">
            <div className="t-base fw-7 c-danger mb-2">พื้นที่อันตราย (Danger Zone)</div>
            <p className="t-sm muted mb-4">การลบรายวิชานี้จะทำให้บทเรียน ข้อสอบ ใบงาน และรายการส่งงานทั้งหมดของรายวิชาถูกลบอย่างถาวรและไม่สามารถกู้คืนได้</p>
            <button className="btn btn-outline c-danger" onClick={handleDeleteCourse}>
              <Icon name="trash" size={15} /> ลบรายวิชานี้
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
