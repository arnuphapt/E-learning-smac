"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge, Avatar, Dialog, Select } from "@/components/ui/Primitives";
import { PageHead, Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import Table from "@/components/ui/Table";

const getStudentSecFromMaster = (studentNo, sectionName, sections) => {
  if (!studentNo || !sectionName || !sections || sections.length === 0) return false;
  const masterSec = sections.find(s => s.name === sectionName);
  if (!masterSec) return false;
  
  const start = masterSec.range_start;
  const end = masterSec.range_end;
  if (!start || !end) return null;
  
  const snoStr = String(studentNo).trim();
  if (snoStr.length < 3) return false;
  const last3 = parseInt(snoStr.slice(-3), 10);
  const startVal = parseInt(start, 10);
  const endVal = parseInt(end, 10);
  if (isNaN(last3) || isNaN(startVal) || isNaN(endVal)) return false;
  
  return last3 >= startVal && last3 <= endVal;
};

export default function InstructorAiLogs() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const nav = (path) => router.push(path);

  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [aiLogs, setAiLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCourseId, setSelectedCourseId] = useState("all");
  const [selectedLessonId, setSelectedLessonId] = useState("all");
  const [selectedMode, setSelectedMode] = useState("all");
  const [activeLog, setActiveLog] = useState(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [cRes, lRes, sRes, ciRes, aiRes] = await Promise.all([
      supabase.from("courses").select("*"),
      supabase.from("lessons").select("*").order("index", { ascending: true }),
      supabase.from("users").select("*").eq("role", "student"),
      supabase.from("course_instructors").select("course_id").eq("user_id", user.id),
      supabase.from("ai_chat_logs").select("*").order("created_at", { ascending: false })
    ]);

    if (cRes.data) {
      const coursesList = cRes.data;
      const myCourseIds = (ciRes?.data || []).map(ci => ci.course_id);
      const userRoles = user?.role?.split(",").map(r => r.trim()) || [];

      // Filter courses instructor is assigned to
      const filteredCourses = coursesList.filter((c) => {
        if (userRoles.includes("admin")) return true;
        if (userRoles.includes("course_manager")) {
          return c.group_id === user.group_id || user.group_ids?.includes(c.group_id);
        }
        if (userRoles.includes("instructor")) {
          return myCourseIds.includes(c.id);
        }
        return false;
      });

      const allowedCourseIds = filteredCourses.map(c => c.id);
      setCourses(filteredCourses);

      // Filter lessons
      const courseLessons = (lRes.data || []).filter(l => allowedCourseIds.includes(l.course_id));
      setLessons(courseLessons);

      // Filter students
      setStudents(sRes.data || []);

      // Filter logs belonging to allowed courses
      const courseLogs = (aiRes.data || []).filter(log => allowedCourseIds.includes(log.course_id));
      setAiLogs(courseLogs);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Reset lesson filter if course changes
  const handleCourseChange = (e) => {
    setSelectedCourseId(e.target.value);
    setSelectedLessonId("all");
  };

  const lessonsForSelectedCourse = lessons.filter(l => 
    selectedCourseId === "all" || l.course_id === selectedCourseId
  );

  const enrichedLogs = React.useMemo(() => {
    return aiLogs.map(log => {
      const student = students.find(s => s.id === log.student_id) || { name: "Unknown Student", student_no: "-" };
      const lesson = lessons.find(l => l.id === log.lesson_id) || { index: "-", title: "Unknown Lesson" };
      const course = courses.find(c => c.id === log.course_id) || { code: "", title: "Unknown Course" };
      
      return {
        ...log,
        studentName: student.name,
        studentNo: student.student_no,
        lessonIndex: lesson.index,
        lessonTitle: lesson.title,
        courseCode: course.code,
        courseTitle: course.title
      };
    });
  }, [aiLogs, students, lessons, courses]);

  const filteredLogs = enrichedLogs.filter(log => {
    const matchesCourse = selectedCourseId === "all" || log.course_id === selectedCourseId;
    const matchesLesson = selectedLessonId === "all" || log.lesson_id === selectedLessonId;
    const matchesMode = selectedMode === "all" || log.mode === selectedMode;
    return matchesCourse && matchesLesson && matchesMode;
  });

  if (loading) return <Loading className="container p-5 text-center muted" />;

  return (
    <div className="container">
      <Crumb nav={nav} items={[{ label: "ภาพรวม / รายวิชา", to: "/i/courses" }, { label: "ประวัติการใช้งาน AI" }]} />
      <PageHead 
        kicker="ระบบหลังบ้าน" 
        title="ประวัติการใช้งาน AI" 
        desc="ประวัติการป้อนคำถามและขอสรุปเนื้อหาบทเรียนของนักศึกษากับ AI ติวเตอร์ในรายวิชาที่คุณดูแล" 
      />

      <div className="flex col gap-4">
        <Table
          title="บันทึกการใช้งาน AI ผู้ช่วยเรียนรู้"
          description="คลิกเลือกแถวหรือปุ่มเพื่ออ่านบทสนทนาระหว่างนักศึกษากับ AI อย่างละเอียด"
          className="table hover"
          enableSearch={true}
          searchKeys={["studentName", "studentNo", "message", "courseCode", "courseTitle"]}
          searchPlaceholder="ค้นหาชื่อนักศึกษา รหัสวิชา หรือคำถาม..."
          filter={
            <>
              <Select 
                value={selectedCourseId} 
                onChange={handleCourseChange}
                style={{ width: 180, height: 38 }}
              >
                <option value="all">รายวิชา: ทั้งหมด</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.code} {c.title}</option>
                ))}
              </Select>

              <Select 
                value={selectedLessonId} 
                onChange={(e) => setSelectedLessonId(e.target.value)}
                style={{ width: 180, height: 38 }}
              >
                <option value="all">บทเรียน: ทั้งหมด</option>
                {lessonsForSelectedCourse.map(l => (
                  <option key={l.id} value={l.id}>บทที่ {l.index}: {l.title}</option>
                ))}
              </Select>

              <Select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                style={{ width: 150, height: 38 }}
              >
                <option value="all">โหมด: ทั้งหมด</option>
                <option value="chat">ถามตอบ (Chat)</option>
                <option value="summarize">สรุปบทเรียน</option>
              </Select>
            </>
          }
          headers={[
            "นักศึกษา",
            "รายวิชา / บทเรียน",
            "รูปแบบ",
            "คำถามล่าสุด",
            "วันที่สอบถาม",
            ""
          ]}
          data={filteredLogs}
          colSpan={6}
          renderRow={(log) => {
            return (
              <tr key={log.id} onClick={() => setActiveLog(log)} style={{ cursor: "pointer" }}>
                <td>
                  <div className="flex items-center gap-2">
                    <Avatar name={log.studentName} size={30} />
                    <div>
                      <div className="fw-6">{log.studentName}</div>
                      <div className="t-xs muted">{log.studentNo}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div>
                    <div className="fw-6 t-sm">{log.courseCode}</div>
                    <div className="t-xs muted truncate" style={{ maxWidth: 180 }}>บทที่ {log.lessonIndex}: {log.lessonTitle}</div>
                  </div>
                </td>
                <td>
                  {log.mode === "summarize" ? (
                    <Badge tone="primary">สรุปบทเรียน</Badge>
                  ) : (
                    <Badge tone="info">ถามตอบ (Chat)</Badge>
                  )}
                </td>
                <td>
                  <div className="t-sm fw-5 truncate" style={{ maxWidth: 280 }}>
                    {log.message}
                  </div>
                </td>
                <td className="t-xs muted">
                  {new Date(log.created_at).toLocaleString("th-TH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </td>
                <td>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveLog(log);
                    }}
                  >
                    ดูรายละเอียด
                  </button>
                </td>
              </tr>
            );
          }}
        />

        {activeLog && (
          <Dialog 
            title="รายละเอียดการใช้งาน AI" 
            desc="ประวัติคำถามและการตอบกลับของระบบ AI ผู้ช่วยสอน" 
            onClose={() => setActiveLog(null)}
            lg
          >
            {(() => {
              const student = students.find(s => s.id === activeLog.student_id) || { name: "Unknown Student", student_no: "-", email: "" };
              const lesson = lessons.find(l => l.id === activeLog.lesson_id) || { index: "-", title: "Unknown Lesson" };
              const course = courses.find(c => c.id === activeLog.course_id) || { code: "", title: "Unknown Course" };
              
              return (
                <div className="flex col gap-4">
                  {/* Meta details */}
                  <div className="grid grid-3 gap-3 p-3 card" style={{ background: "var(--muted)" }}>
                    <div>
                      <div className="t-xs muted uppercase">นักศึกษา</div>
                      <div className="fw-6 t-sm">{student.name} ({student.student_no})</div>
                      <div className="t-xs muted">{student.email}</div>
                    </div>
                    <div>
                      <div className="t-xs muted uppercase">รายวิชา & บทเรียน</div>
                      <div className="fw-6 t-sm">{course.code} - {course.title}</div>
                      <div className="t-xs muted">บทที่ {lesson.index}: {lesson.title}</div>
                    </div>
                    <div>
                      <div className="t-xs muted uppercase">รูปแบบ & วันที่</div>
                      <div className="fw-6 t-sm">
                        {activeLog.mode === "summarize" ? "สรุปเนื้อหา" : "ถามตอบ"}
                      </div>
                      <div className="t-xs muted">
                        {new Date(activeLog.created_at).toLocaleString("th-TH")}
                      </div>
                    </div>
                  </div>

                  {/* Conversation View */}
                  <div className="flex col gap-3 mt-2" style={{ maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
                    {/* Student Question */}
                    <div className="flex justify-end gap-2 items-start">
                      <div style={{
                        maxWidth: "80%",
                        padding: "12px 16px",
                        borderRadius: "16px 16px 4px 16px",
                        background: "linear-gradient(135deg, var(--primary), #0891b2)",
                        color: "#fff",
                        fontSize: 13.5
                      }}>
                        <div className="fw-7 t-xs mb-1" style={{ opacity: 0.9 }}>คำถามจากนักศึกษา:</div>
                        <div style={{ whiteSpace: "pre-line", lineHeight: 1.5 }}>{activeLog.message}</div>
                      </div>
                      <Avatar name={student.name} size={32} />
                    </div>

                    {/* AI Response */}
                    <div className="flex justify-start gap-2 items-start">
                      <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: "linear-gradient(135deg, var(--primary), #0891b2)",
                        display: "grid", placeItems: "center", color: "#fff", flexShrink: 0
                      }}>
                        <Icon name="sparkle" size={14} />
                      </div>
                      <div style={{
                        maxWidth: "80%",
                        padding: "14px 18px",
                        borderRadius: "16px 16px 16px 4px",
                        background: "var(--muted)",
                        color: "var(--fg)",
                        border: "1px solid var(--border)",
                        fontSize: 13.5
                      }}>
                        <div className="fw-7 t-xs mb-2 text-primary" style={{ color: "var(--primary)" }}>AI ตอบกลับ:</div>
                        <div style={{ lineHeight: 1.6 }} className="scroll">
                          <MarkdownText text={activeLog.reply} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </Dialog>
        )}
      </div>
    </div>
  );
}

function MarkdownText({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(
        <div key={i} style={{ fontWeight: 700, fontSize: 14, marginTop: 10, marginBottom: 4, color: "var(--primary)" }}>
          {renderInline(line.slice(3))}
        </div>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <div key={i} style={{ fontWeight: 700, fontSize: 15, marginTop: 12, marginBottom: 4 }}>
          {renderInline(line.slice(2))}
        </div>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} style={{ display: "flex", gap: 6, marginTop: 2, paddingLeft: 4 }}>
          <span style={{ color: "var(--primary)", marginTop: 2, flexShrink: 0 }}>•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.startsWith("```")) {
      let codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} style={{
          background: "var(--muted)", borderRadius: 8, padding: "8px 12px",
          fontSize: 12, overflowX: "auto", margin: "6px 0", fontFamily: "monospace"
        }}>
          {codeLines.join("\n")}
        </pre>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: 4 }} />);
    } else {
      elements.push(
        <div key={i} style={{ marginTop: 2, lineHeight: 1.6 }}>
          {renderInline(line)}
        </div>
      );
    }
    i++;
  }

  return <div style={{ fontSize: 13.5 }}>{elements}</div>;
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} style={{
          background: "var(--muted)", borderRadius: 4, padding: "1px 5px",
          fontFamily: "monospace", fontSize: 12
        }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
