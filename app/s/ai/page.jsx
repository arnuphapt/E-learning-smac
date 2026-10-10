"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isStaffRole } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { fileHref, STUDENT_LESSON_COLUMNS } from "@/lib/files";
import Icon from "@/components/ui/Icon";
import Loading from "@/components/ui/Loading";
import { Select, Dialog } from "@/components/ui/Primitives";
import AiAvatar from "@/components/ui/AiAvatar";

// ---- Simple markdown renderer (bold, bullets, code) ----
function GeminiSparkleIcon({ size = 20, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, ...style }}>
      <defs>
        <linearGradient id="geminiSparkleGradPage" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a73e8" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path
        d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4772 12 22C12 16.4772 16.4772 12 22 12C16.4772 12 12 7.52285 12 2Z"
        fill="url(#geminiSparkleGradPage)"
      />
    </svg>
  );
}

function GeminiCodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <div style={{
      margin: "12px 0",
      borderRadius: 14,
      overflow: "hidden",
      border: "1px solid #1e293b",
      background: "#0b1220",
      color: "#e2e8f0",
      fontSize: 13,
      fontFamily: "var(--mono), ui-monospace, monospace",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 14px",
        background: "#111b2e",
        borderBottom: "1px solid #1e293b",
        fontSize: 11.5,
        color: "#94a3b8",
        fontWeight: 500
      }}>
        <span style={{ textTransform: "lowercase" }}>{language || "code"}</span>
        <button
          onClick={handleCopy}
          type="button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "transparent",
            border: 0,
            color: copied ? "#34d399" : "#cbd5e1",
            cursor: "pointer",
            fontSize: 11.5,
            padding: "2px 8px",
            borderRadius: 6,
          }}
        >
          <Icon name={copied ? "check" : "clipboard"} size={13} />
          {copied ? "คัดลอกแล้ว" : "คัดลอกโค้ด"}
        </button>
      </div>
      <pre style={{
        padding: "14px 16px",
        margin: 0,
        overflowX: "auto",
        lineHeight: 1.6,
      }}>
        <code>{code}</code>
      </pre>
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

    if (line.startsWith("### ")) {
      elements.push(
        <div key={i} style={{ fontWeight: 700, fontSize: 14.5, marginTop: 14, marginBottom: 6, color: "var(--fg)" }}>
          {renderInline(line.slice(4))}
        </div>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <div key={i} style={{ fontWeight: 700, fontSize: 16, marginTop: 16, marginBottom: 6, color: "var(--fg)" }}>
          {renderInline(line.slice(3))}
        </div>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <div key={i} style={{ fontWeight: 700, fontSize: 18, marginTop: 18, marginBottom: 8, color: "var(--fg)" }}>
          {renderInline(line.slice(2))}
        </div>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} style={{ display: "flex", gap: 9, marginTop: 5, alignItems: "flex-start", paddingLeft: 2 }}>
          <span style={{
            display: "inline-block", width: 5, height: 5, borderRadius: "50%",
            background: "#8b5cf6", marginTop: 8, flexShrink: 0
          }} />
          <span style={{ lineHeight: 1.65 }}>{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      elements.push(
        <div key={i} style={{ display: "flex", gap: 8, marginTop: 5, alignItems: "flex-start", paddingLeft: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", marginTop: 1, minWidth: 18, flexShrink: 0 }}>
            {match[1]}.
          </span>
          <span style={{ lineHeight: 1.65 }}>{renderInline(match[2])}</span>
        </div>
      );
    } else if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      let codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <GeminiCodeBlock key={i} code={codeLines.join("\n")} language={language} />
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: 8 }} />);
    } else {
      elements.push(
        <div key={i} style={{ marginTop: 4, lineHeight: 1.7, color: "var(--fg)" }}>
          {renderInline(line)}
        </div>
      );
    }
    i++;
  }

  return <div style={{ fontSize: 14.5, letterSpacing: "0.01em" }}>{elements}</div>;
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ fontWeight: 700, color: "var(--fg)" }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} style={{
          background: "var(--muted)", borderRadius: 6, padding: "2px 6px",
          fontFamily: "var(--mono), monospace", fontSize: 13, color: "var(--primary)",
          border: "1px solid var(--border)"
        }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function MessageActionBar({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
      <button
        onClick={handleCopy}
        type="button"
        title="คัดลอกคำตอบ"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 10px",
          borderRadius: 8,
          border: 0,
          background: "transparent",
          color: copied ? "var(--success)" : "var(--muted-fg)",
          cursor: "pointer",
          fontSize: 12,
          transition: "all 0.15s",
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--fg)"; }}
        onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = copied ? "var(--success)" : "var(--muted-fg)"; }}
      >
        <Icon name={copied ? "check" : "clipboard"} size={13} />
        <span>{copied ? "คัดลอกแล้ว" : "คัดลอก"}</span>
      </button>
    </div>
  );
}

function GeminiThinking() {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 2px" }}>
      <div className="gemini-sparkle-pulse" style={{ marginTop: 2 }}>
        <GeminiSparkleIcon size={22} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, maxWidth: 320 }}>
        <div style={{
          height: 12,
          borderRadius: 6,
          background: "linear-gradient(90deg, var(--muted) 20%, var(--primary-soft) 50%, var(--muted) 80%)",
          backgroundSize: "200% 100%",
          animation: "geminiShimmer 1.8s infinite ease-in-out",
          width: "90%",
        }} />
        <div style={{
          height: 12,
          borderRadius: 6,
          background: "linear-gradient(90deg, var(--muted) 20%, var(--primary-soft) 50%, var(--muted) 80%)",
          backgroundSize: "200% 100%",
          animation: "geminiShimmer 1.8s infinite ease-in-out",
          width: "65%",
        }} />
      </div>
    </div>
  );
}

const parseEmotionAndReply = (text) => {
  if (!text) return { emotion: "smile", cleanText: "" };
  let emotion = "smile";
  let cleanText = text;

  const match = text.match(/\[emotion:\s*(impressive|mad|smile|idle|sad)\]/i);
  if (match) {
    emotion = match[1].toLowerCase();
    cleanText = text.replace(/\[emotion:\s*(impressive|mad|smile|idle|sad)\]/gi, "").trim();
  }

  return { emotion, cleanText };
};

const PROMPT_CARDS = [
  {
    title: "สรุปเนื้อหาสำคัญ",
    desc: "ประเด็นหลักและจุดสำคัญที่ต้องจำในบทเรียนนี้",
    prompt: "ช่วยสรุปเนื้อหาสำคัญและประเด็นหลักของบทเรียนนี้แบบกระชับ เข้าใจง่ายให้หน่อยค่ะ/ครับ",
  },
  {
    title: "อธิบายจุดที่มักเข้าใจผิด",
    desc: "ชี้เป้าจุดยากหรือหัวข้อที่มักสับสนในบทเรียนนี้",
    prompt: "ในบทเรียนนี้ มีจุดไหนที่นักศึกษามักเข้าใจผิด หรือเป็นจุดยากที่ควรทำความเข้าใจเป็นพิเศษบ้างคะ/ครับ?",
  },
  {
    title: "ยกตัวอย่างการนำไปใช้จริง",
    desc: "เชื่อมโยงทฤษฎีกับการปฏิบัติและการดูแลผู้ป่วยจริง",
    prompt: "ช่วยยกตัวอย่างสถานการณ์การนำความรู้ในบทเรียนนี้ไปประยุกต์ใช้ในการปฏิบัติการพยาบาลจริงให้เห็นภาพหน่อยค่ะ/ครับ",
  },
  {
    title: "ท้าทายด้วยคำถามทดสอบ",
    desc: "สุ่มคำถาม 3 ข้อเพื่อทดสอบความเข้าใจพร้อมเฉลย",
    prompt: "ช่วยตั้งคำถามทดสอบความเข้าใจเกี่ยวกับบทเรียนนี้ 3 ข้อพร้อมเฉลยและคำอธิบายละเอียดให้หน่อยค่ะ/ครับ",
  },
];

export default function StudentSeparateAiPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const studentId = session?.dbId || session?.user?.id;
  const role = session?.user?.role;
  const isBypassed = isStaffRole(role);
  const studentYear = session?.user?.study_year ? Number(session.user.study_year) : null;
  const studentName = session?.user?.name || "เพื่อนนักศึกษา";

  const [courses, setCourses] = useState([]);
  const [allLessons, setAllLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selector states
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");

  // Chat states
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [apiLoading, setApiLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState("idle");
  const [aiStatus, setAiStatus] = useState("checking"); // "checking", "online", "offline", "degraded"
  const [aiStatusReason, setAiStatusReason] = useState("");
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [sessionTokenError, setSessionTokenError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 960) {
      setSidebarOpen(false);
    }
  }, []);

  const checkAiHealth = async () => {
    setAiStatus("checking");
    try {
      const res = await fetch("/api/ai/health");
      if (res.ok) {
        const data = await res.json();
        setAiStatus(data.status);
        setAiStatusReason(data.reason || "");
      } else {
        setAiStatus("offline");
        setAiStatusReason("HTTP request failed");
      }
    } catch (e) {
      setAiStatus("offline");
      setAiStatusReason(e.message);
    }
  };

  useEffect(() => {
    checkAiHealth();
  }, []);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const attachmentRef = useRef(null);
  const emotionTimerRef = useRef(null);

  const changeEmotion = (newEmotion) => {
    setCurrentEmotion(newEmotion);
    if (emotionTimerRef.current) {
      clearTimeout(emotionTimerRef.current);
    }
    if (newEmotion !== "idle") {
      emotionTimerRef.current = setTimeout(() => {
        setCurrentEmotion("idle");
      }, 5000);
    }
  };

  useEffect(() => {
    return () => {
      if (emotionTimerRef.current) {
        clearTimeout(emotionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (attachmentRef.current && !attachmentRef.current.contains(event.target)) {
        setShowAttachmentDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Wait for the session (role/id pick the filter/data); a run started while it loads can finish after the real run and overwrite it.
    if (authStatus !== "authenticated") return;
    let cancelled = false;
    async function loadData() {
      const [cRes, lRes, sgRes, uRes, secRes] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("lessons").select(STUDENT_LESSON_COLUMNS).order("index", { ascending: true }),
        supabase.from("student_grades").select("prefix, year_label"),
        studentId ? supabase.from("users").select("*").eq("id", studentId).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("sections").select("*")
      ]);

      if (cancelled) return;
      const cData = cRes.data;
      const lData = lRes.data;
      const sgData = sgRes.data;
      const studentProfile = uRes?.data;
      const sectionsList = secRes?.data || [];

      if (cData) {
        const isStaff = isStaffRole(role);
        const visibleLessons = lData ? lData.filter(l => l.status !== "draft") : [];
        setAllLessons(visibleLessons);

        const gradesList = sgData || [];
        const email = session?.user?.email || "";
        const match = email.match(/^(\d+)@/);
        const parsedStudentNo = match ? match[1] : "";
        const finalStudentNo = studentProfile?.student_no || parsedStudentNo;
        const finalStudentSec = studentProfile?.section || "";

        const prefix = match ? match[1].substring(0, 2) : "";
        const mapping = gradesList.find(g => g.prefix === prefix);
        const studentLabel = mapping ? mapping.year_label : null;
        const studentFallback = studentYear;

        // Filter courses student has access to
        const filteredCourses = isStaff ? cData : cData.filter(c => {
          const allowedEmails = c.access?.allowedEmails || [];
          if (allowedEmails.includes(email)) return true;

          if (c.section && c.section !== "ไม่ระบุ Section") {
            const rangeMatch = getStudentSecFromMaster(finalStudentNo, c.section, sectionsList);
            if (rangeMatch === null) {
              if (finalStudentSec !== c.section) return false;
            } else if (!rangeMatch) {
              return false;
            }
          }

          const allowed = c.year_level;
          if (!allowed || allowed.length === 0) return true;

          const hasMatch = allowed.some(ay => {
            if (typeof ay === 'number' || !isNaN(Number(ay))) {
              return Number(ay) === studentFallback || ay == studentFallback;
            }
            return ay === studentLabel;
          });
          return hasMatch;
        });

        setCourses(filteredCourses);

        // Auto select course and lesson based on query param if present
        let matched = false;
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const queryLessonId = params.get("lessonId");
          if (queryLessonId) {
            const foundLesson = visibleLessons.find(l => l.id === queryLessonId);
            if (foundLesson) {
              setSelectedCourseId(foundLesson.course_id);
              setSelectedLessonId(foundLesson.id);
              matched = true;
            }
          }
        }

        if (!matched && filteredCourses.length > 0) {
          const firstCourse = filteredCourses[0];
          setSelectedCourseId(firstCourse.id);

          const firstCourseLessons = visibleLessons.filter(l => l.course_id === firstCourse.id);
          if (firstCourseLessons.length > 0) {
            setSelectedLessonId(firstCourseLessons[0].id);
          }
        }
      }
      setLoading(false);
    }
    loadData();
    return () => { cancelled = true; };
  }, [studentId, role, authStatus]);

  function getStudentSecFromMaster(studentNo, sectionName, sections) {
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
  }

  // Find objects based on selection
  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const lessonsForSelectedCourse = allLessons.filter(l => l.course_id === selectedCourseId);
  const selectedLesson = lessonsForSelectedCourse.find(l => l.id === selectedLessonId);

  const loadHistoryAndSession = async (currLessonId, currLessonTitle) => {
    if (!studentId || !currLessonId) return;
    setApiLoading(true);

    try {
      // 1. Fetch custom greeting template
      let greeting = `สวัสดีค่ะ! ยูริยินดีต้อนรับสู่ห้องสนทนา AI สำหรับบทเรียน **"${currLessonTitle || "บทเรียนนี้"}"** 🎓\n\nยูริพร้อมตอบคำถามเกี่ยวกับเนื้อหา อธิบายหัวข้อที่ยาก หรือสรุปบทเรียนแล้ว ถามคำถามมาด้านล่างได้เลยค่ะ!`;
      try {
        const pRes = await fetch("/api/ai/persona");
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.greetingTemplate) {
            const customMsg = pData.greetingTemplate.replace(/{lesson_title}/g, currLessonTitle || "บทเรียนนี้");
            const { cleanText } = parseEmotionAndReply(customMsg);
            greeting = cleanText;
          }
        }
      } catch (e) {
        console.error("Failed to load persona greeting:", e);
      }

      // 2. Fetch logs for this student and lesson
      const { data: logs, error } = await supabase
        .from("ai_chat_logs")
        .select("*")
        .eq("student_id", studentId)
        .eq("lesson_id", currLessonId)
        .eq("hidden_by_student", false)
        .neq("reply", "") // quota claims (api/ai/chat, tutor explain) are empty placeholder rows until the reply is filled
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (logs && logs.length > 0) {
        // Group logs by session_id
        const groups = {};
        logs.forEach((log) => {
          const sId = log.session_id || "legacy";
          if (!groups[sId]) {
            groups[sId] = [];
          }
          groups[sId].push(log);
        });

        // Convert groups to array of sessions
        const sessions = Object.keys(groups).map((sId) => {
          const sLogs = groups[sId];
          const firstLog = sLogs[0];
          const lastLog = sLogs[sLogs.length - 1];
          return {
            id: sId,
            createdAt: firstLog.created_at,
            updatedAt: lastLog.created_at,
            firstQuestion: firstLog.message,
            logs: sLogs,
          };
        });

        // Sort sessions by updatedAt descending (latest first)
        sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setSessionHistory(sessions);

        // Load latest session
        const latestSession = sessions[0];
        setActiveSessionId(latestSession.id);

        const chatMsgs = [
          { role: "assistant", content: greeting }
        ];
        latestSession.logs.forEach((log) => {
          const { cleanText: cleanMsg } = parseEmotionAndReply(log.message);
          const { cleanText: cleanReply } = parseEmotionAndReply(log.reply);

          chatMsgs.push({ role: "user", content: cleanMsg });
          chatMsgs.push({ role: "assistant", content: cleanReply });
        });
        setMessages(chatMsgs);
      } else {
        // No logs, start a new session
        const newSessId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        setActiveSessionId(newSessId);
        setSessionHistory([]);
        setMessages([
          { role: "assistant", content: greeting }
        ]);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    } finally {
      setApiLoading(false);
    }
  };

  const fetchQuotaUsage = async (studId) => {
    try {
      let limit = 15;
      const { data: settingsData } = await supabase
        .from("ai_settings")
        .select("key, value");
      if (settingsData) {
        const limitRow = settingsData.find(r => r.key === "daily_chat_limit");
        if (limitRow) limit = parseInt(limitRow.value, 10) || 15;
      }

      const windowStart = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();

      const { count, error } = await supabase
        .from("ai_chat_logs")
        .select("*", { count: "exact", head: true })
        .eq("student_id", studId)
        .in("mode", ["chat", "summarize", "explain"])
        .neq("reply", "")
        .gte("created_at", windowStart);

      if (!error) {
        const used = count || 0;
        setRateLimitInfo({ used, limit });
        if (used >= limit) {
          setRateLimitError(true);
        } else {
          setRateLimitError(false);
        }
      }
    } catch (err) {
      console.error("Failed to fetch quota usage:", err);
    }
  };

  useEffect(() => {
    if (selectedLesson && studentId) {
      loadHistoryAndSession(selectedLesson.id, selectedLesson.title);
      fetchQuotaUsage(studentId);
      setSessionTokenError(false);
    } else {
      setMessages([]);
      changeEmotion("idle");
    }
    setInput("");
  }, [selectedLessonId, studentId]);

  const handleStartNewSession = async () => {
    const newSessId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    setActiveSessionId(newSessId);

    let greeting = `สวัสดีค่ะ! ยูริยินดีต้อนรับสู่ห้องสนทนา AI สำหรับบทเรียน **"${selectedLesson?.title || "บทเรียนนี้"}"** 🎓\n\nยูริพร้อมตอบคำถามเกี่ยวกับเนื้อหา อธิบายหัวข้อที่ยาก หรือสรุปบทเรียนแล้ว ถามคำถามมาด้านล่างได้เลยค่ะ!`;
    try {
      const pRes = await fetch("/api/ai/persona");
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData.greetingTemplate) {
          const customMsg = pData.greetingTemplate.replace(/{lesson_title}/g, selectedLesson?.title || "บทเรียนนี้");
          const { cleanText } = parseEmotionAndReply(customMsg);
          greeting = cleanText;
        }
      }
    } catch (e) {
      console.error(e);
    }

    setMessages([{ role: "assistant", content: greeting }]);
    changeEmotion("idle");
  };

  const handleDeleteSession = async (sessId) => {
    if (!confirm("คุณต้องการลบประวัติการสนทนาของเซสชันนี้ใช่หรือไม่?")) return;

    try {
      const res = await fetch("/api/ai/history/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessId }),
      });
      if (!res.ok) throw new Error(`clear failed: ${res.status}`);

      if (activeSessionId === sessId) {
        handleStartNewSession();
      }

      if (selectedLesson) {
        loadHistoryAndSession(selectedLesson.id, selectedLesson.title);
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
      alert("ไม่สามารถลบเซสชันได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleSelectSession = (sess) => {
    setActiveSessionId(sess.id);

    let greeting = `สวัสดีค่ะ! ยูริยินดีต้อนรับสู่ห้องสนทนา AI สำหรับบทเรียน **"${selectedLesson?.title || "บทเรียนนี้"}"** 🎓\n\nยูริพร้อมตอบคำถามเกี่ยวกับเนื้อหา อธิบายหัวข้อที่ยาก หรือสรุปบทเรียนแล้ว ถามคำถามมาด้านล่างได้เลยค่ะ!`;
    const chatMsgs = [
      { role: "assistant", content: greeting }
    ];
    sess.logs.forEach((log) => {
      const { cleanText: cleanMsg } = parseEmotionAndReply(log.message);
      const { cleanText: cleanReply } = parseEmotionAndReply(log.reply);

      chatMsgs.push({ role: "user", content: cleanMsg });
      chatMsgs.push({ role: "assistant", content: cleanReply });
    });
    setMessages(chatMsgs);
    setShowHistoryDialog(false);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, apiLoading]);

  const lessonContext = selectedLesson
    ? {
      id: selectedLesson.id,
      courseId: selectedCourse?.id || selectedLesson.course_id,
      title: selectedLesson.title,
      index: selectedLesson.index,
      courseCode: selectedCourse?.code,
      courseName: selectedCourse?.title,
      description: selectedLesson.description,
      duration: selectedLesson.duration,
    }
    : null;

  const sendMessage = async (userText, mode = "chat") => {
    if (!selectedLesson) return;

    let finalUserText = userText;
    const currentAttachments = mode === "chat" ? attachedFiles : [];

    if (!finalUserText.trim() && mode !== "summarize") {
      if (currentAttachments.length > 0) {
        finalUserText = "ช่วยอธิบายเนื้อหาหรือตอบคำถามจากเอกสารประกอบการเรียนที่แนบมานี้ให้หน่อยครับ/ค่ะ";
      } else {
        return;
      }
    }

    const newMessages = [
      ...messages,
      { role: "user", content: finalUserText, attachments: currentAttachments },
    ];

    if (mode === "chat") {
      setMessages(newMessages);
      setInput("");
      setAttachedFiles([]);
    } else {
      setSummarizing(true);
    }
    setApiLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          lessonContext,
          mode,
          studentId: studentId || session?.user?.id,
          attachments: currentAttachments,
          sessionId: activeSessionId
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        if (data.error === "rate_limit_exceeded") {
          setRateLimitError(true);
          if (data.used !== undefined && data.limit !== undefined) {
            setRateLimitInfo({ used: data.used, limit: data.limit });
          }
          throw new Error("rate_limit_exceeded");
        }
        if (data.error === "session_token_limit") {
          setSessionTokenError(true);
          throw new Error("session_token_limit");
        }
        throw new Error(data.error || "Failed to get AI response");
      }
      if (!data.reply) {
        throw new Error("Cannot answer the question");
      }
      const reply = data.reply;
      const { emotion, cleanText } = parseEmotionAndReply(reply);
      changeEmotion(emotion);

      if (data.rateLimitInfo) {
        setRateLimitInfo(data.rateLimitInfo);
        if (data.rateLimitInfo.used >= data.rateLimitInfo.limit) {
          setRateLimitError(true);
        }
      }

      if (mode === "summarize") {
        setMessages([
          ...messages,
          { role: "user", content: "📋 ขอสรุปเนื้อหาบทเรียนนี้" },
          { role: "assistant", content: cleanText },
        ]);
        setSummarizing(false);
      } else {
        setMessages([...newMessages, { role: "assistant", content: cleanText }]);
      }
    } catch (err) {
      console.error("AI Error:", err);
      changeEmotion("sad");
      
      let errMsg = "ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อ AI กรุณาลองใหม่อีกครั้ง";
      const errStr = String(err.message || "");
      if (err.message === "rate_limit_exceeded") {
        errMsg = "ขออภัย คุณถามคำถามเกินขีดจำกัด 15 คำถามในรอบ 5 ชั่วโมงแล้ว สามารถถามได้อีกครั้งในรอบถัดไป";
      } else if (err.message === "session_token_limit") {
        errMsg = "เซสชันนี้มีขนาดประวัติการสนทนาเกินขีดจำกัดแล้ว กรุณาเริ่มการสนทนาใหม่เพื่อคุยต่อ";
      } else if (err.message === "Cannot answer the question") {
        errMsg = "ขออภัย ไม่สามารถตอบได้ในขณะนี้";
      } else if (errStr.includes("429") || errStr.includes("quota")) {
        errMsg = "ขออภัย เกิดข้อผิดพลาดระบบโควต้าการใช้งาน AI เต็ม กรุณาลองใหม่อีกครั้งในภายหลัง";
      }
      
      if (mode === "summarize") {
        setMessages([
          ...messages,
          { role: "user", content: "📋 ขอสรุปเนื้อหาบทเรียนนี้" },
          { role: "assistant", content: errMsg },
        ]);
        setSummarizing(false);
      } else {
        setMessages([...newMessages, { role: "assistant", content: errMsg }]);
      }
    }
    setApiLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleCourseChange = (e) => {
    const courseId = e.target.value;
    setSelectedCourseId(courseId);

    const courseLessons = allLessons.filter(l => l.course_id === courseId);
    if (courseLessons.length > 0) {
      setSelectedLessonId(courseLessons[0].id);
    } else {
      setSelectedLessonId("");
    }
  };

  if (loading) return <Loading className="container p-5 text-center muted" />;

  return (
    <div
      className="gemini-shell"
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        position: "relative",
        background: "#ffffff",
        color: "var(--fg)",
      }}
    >
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="gemini-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar (Gemini Style Drawer) */}
      <aside
        className={`gemini-sidebar ${sidebarOpen ? "open" : "closed"}`}
        style={{
          width: sidebarOpen ? 280 : 0,
          minWidth: sidebarOpen ? 280 : 0,
          background: "#f0f4f9",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.22s ease-in-out, transform 0.22s ease-in-out",
          overflow: "hidden",
          zIndex: 40,
        }}
      >
        {/* Sidebar Header: Hamburger & New Chat */}
        <div style={{ padding: "16px 14px 12px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: 0,
                background: "transparent",
                color: "var(--fg)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
              className="hover-bg-muted"
              title="สลับเมนูข้าง"
            >
              <Icon name="menu" size={18} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 6 }}>
              <GeminiSparkleIcon size={18} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.01em" }}>
                Yuri Gemini
              </span>
            </div>
          </div>

          {/* New Chat Pill Button */}
          <button
            type="button"
            onClick={handleStartNewSession}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 18px",
              borderRadius: 24,
              border: "1px solid #d0d7de",
              background: "#ffffff",
              color: "var(--fg)",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              transition: "all 0.15s ease",
            }}
            className="gemini-new-chat-btn"
          >
            <Icon name="plus" size={16} style={{ color: "var(--primary)" }} />
            <span>สนทนาใหม่</span>
          </button>
        </div>

        {/* Course & Lesson Selection in Sidebar */}
        <div style={{ padding: "0 14px 12px 14px", display: "flex", flexDirection: "column", gap: 10, borderBottom: "1px solid #e2e8f0", position: "relative", zIndex: 30 }}>
          <div style={{ position: "relative", zIndex: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-fg)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              รายวิชา
            </div>
            <Select
              className="input"
              style={{ width: "100%", height: 36, fontSize: 12.5, borderRadius: 10 }}
              value={selectedCourseId}
              onChange={handleCourseChange}
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
              ))}
            </Select>
          </div>

          <div style={{ position: "relative", zIndex: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-fg)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              บทเรียน
            </div>
            <Select
              className="input"
              style={{ width: "100%", height: 36, fontSize: 12.5, borderRadius: 10 }}
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
            >
              {lessonsForSelectedCourse.length === 0 ? (
                <option value="">(ไม่มีบทเรียน)</option>
              ) : (
                lessonsForSelectedCourse.map(l => (
                  <option key={l.id} value={l.id}>บทที่ {l.index}: {l.title}</option>
                ))
              )}
            </Select>
          </div>
        </div>

        {/* Recent Chats Section */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-fg)", padding: "4px 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
            ล่าสุด
          </div>
          {sessionHistory.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--subtle)", padding: "12px 8px", textAlign: "center" }}>
              ยังไม่มีประวัติในบทเรียนนี้
            </div>
          ) : (
            sessionHistory.map((sess) => {
              const isCurrent = sess.id === activeSessionId;
              return (
                <div
                  key={sess.id}
                  className={`gemini-session-pill ${isCurrent ? "active" : ""}`}
                  onClick={() => {
                    handleSelectSession(sess);
                    if (typeof window !== "undefined" && window.innerWidth < 960) {
                      setSidebarOpen(false);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 18,
                    cursor: "pointer",
                    background: isCurrent ? "#dbeafe" : "transparent",
                    color: isCurrent ? "#1d4ed8" : "var(--fg)",
                    fontWeight: isCurrent ? 600 : 400,
                    fontSize: 13,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden", flex: 1, minWidth: 0 }}>
                    <Icon name="msg" size={14} style={{ opacity: isCurrent ? 1 : 0.6, flexShrink: 0 }} />
                    <span className="truncate" style={{ flex: 1 }}>
                      {sess.firstQuestion || "บทสนทนาใหม่"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="gemini-del-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(sess.id);
                    }}
                    title="ลบเซสชันนี้"
                    style={{
                      background: "transparent",
                      border: 0,
                      color: "var(--danger)",
                      cursor: "pointer",
                      padding: "3px",
                      borderRadius: 6,
                      display: "grid",
                      placeItems: "center",
                      opacity: 0,
                    }}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer: Yuri Profile & Status */}
        <div style={{
          padding: "12px 14px",
          borderTop: "1px solid #e2e8f0",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ position: "relative" }}>
              <AiAvatar size={34} emotion={aiStatus === "offline" ? "sleeping" : apiLoading ? "thinking" : currentEmotion} style={{ borderRadius: 10 }} />
              <span
                style={{
                  position: "absolute",
                  bottom: -1,
                  right: -1,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: aiStatus === "online" ? "#10b981" : aiStatus === "degraded" ? "#f59e0b" : "#ef4444",
                  border: "2px solid #ffffff",
                }}
                className={aiStatus === "online" ? "pulse-dot" : ""}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)" }} className="truncate">
                ยูริจัง
              </div>
              <div style={{ fontSize: 11, color: "var(--muted-fg)" }} className="truncate">
                Gemini 3.8 Flash
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={checkAiHealth}
            title={aiStatusReason ? `คลิกตรวจสอบสถานะ (${aiStatusReason})` : "คลิกตรวจสอบสถานะ"}
            style={{
              background: "transparent",
              border: 0,
              color: "var(--muted-fg)",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="refresh" size={14} className={aiStatus === "checking" ? "spin" : ""} />
          </button>
        </div>
      </aside>

      {/* Main Workspace (Full height column) */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minWidth: 0,
          background: "#ffffff",
          position: "relative",
        }}
      >
        {/* Top App Bar */}
        <header
          style={{
            height: 56,
            padding: "0 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #eef2f6",
            background: "#ffffff",
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: 0,
                  background: "transparent",
                  color: "var(--fg)",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
                className="hover-bg-muted"
                title="เปิดเมนูข้าง"
              >
                <Icon name="menu" size={18} />
              </button>
            )}

            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#f0f4f9",
              padding: "5px 12px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--fg)",
              border: "1px solid #e2e8f0",
            }}>
              <GeminiSparkleIcon size={15} />
              <span>Gemini 3.8 Flash</span>
            </div>

            {selectedLesson && (
              <div className="hide-m truncate" style={{ fontSize: 13, color: "var(--muted-fg)" }}>
                · บทที่ {selectedLesson.index}: <span style={{ color: "var(--fg)", fontWeight: 500 }}>{selectedLesson.title}</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {selectedLesson && selectedLesson.allow_ai !== false && (
              <button
                onClick={() => sendMessage("", "summarize")}
                disabled={apiLoading || summarizing}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: "1px solid #0d6e8c",
                  background: "var(--primary-soft)",
                  color: "var(--primary)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: (apiLoading || summarizing) ? "not-allowed" : "pointer",
                  opacity: (apiLoading || summarizing) ? 0.6 : 1,
                  transition: "all 0.15s ease",
                }}
              >
                <GeminiSparkleIcon size={14} />
                <span>{summarizing ? "กำลังสรุป..." : "สรุปบทเรียนนี้"}</span>
              </button>
            )}

            {rateLimitInfo && (
              <div
                className="hide-m"
                style={{
                  fontSize: 12,
                  color: rateLimitInfo.used >= rateLimitInfo.limit ? "var(--danger)" : "var(--muted-fg)",
                  background: rateLimitInfo.used >= rateLimitInfo.limit ? "var(--danger-soft)" : "#f0f4f9",
                  padding: "4px 10px",
                  borderRadius: 14,
                  fontWeight: 500,
                  border: "1px solid #e2e8f0",
                }}
                title="โควต้าการถามคำถามในรอบเวลา 5 ชั่วโมง"
              >
                โควต้า: {rateLimitInfo.used}/{rateLimitInfo.limit}
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        {!selectedLesson ? (
          /* Empty / No Lesson State */
          <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 40, textAlign: "center" }}>
            <div style={{ maxWidth: 460 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 24,
                background: "#f0f4f9", color: "var(--primary)",
                display: "grid", placeItems: "center", margin: "0 auto 20px"
              }}>
                <GeminiSparkleIcon size={36} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--fg)", marginBottom: 8 }}>
                ยินดีต้อนรับสู่ AI ผู้ช่วยเรียนรู้
              </div>
              <p style={{ color: "var(--muted-fg)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                กรุณาเลือกรายวิชาและบทเรียนจากแถบเมนูด้านซ้าย เพื่อเริ่มการสนทนาหรือขอสรุปเนื้อหาจาก AI ติวเตอร์
              </p>
            </div>
          </div>
        ) : selectedLesson.allow_ai === false ? (
          /* Locked State */
          <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 40, textAlign: "center" }}>
            <div style={{ maxWidth: 460 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 24,
                background: "var(--warning-soft)", color: "var(--warning)",
                display: "grid", placeItems: "center", margin: "0 auto 20px"
              }}>
                <Icon name="lock" size={32} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--fg)", marginBottom: 8 }}>
                บทเรียนนี้ไม่อนุญาตให้ใช้ AI
              </div>
              <p style={{ color: "var(--muted-fg)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                อาจารย์ผู้สอนยังไม่ได้เปิดใช้งาน AI สำหรับบทเรียนนี้ นักศึกษาสามารถทบทวนบทเรียนผ่านเอกสารและวิดีโอประกอบการสอนตามปกติ
              </p>
            </div>
          </div>
        ) : (
          /* Conversation or Welcome Screen */
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative",
          }}>
            {/* Scrollable Center Feed */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
            }}>
              {messages.length <= 1 ? (
                /* Gemini Welcome / Hero View */
                <div style={{
                  maxWidth: 840,
                  width: "100%",
                  margin: "auto auto",
                  padding: "20px 8px 30px 8px",
                  display: "flex",
                  flexDirection: "column",
                }}>
                  <div style={{
                    fontSize: "clamp(28px, 4.5vw, 42px)",
                    fontWeight: 600,
                    lineHeight: 1.25,
                    letterSpacing: "-0.02em",
                    background: "linear-gradient(90deg, #1a73e8 0%, #8b5cf6 45%, #ec4899 90%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    marginBottom: 8,
                  }}>
                    สวัสดีค่ะ, คุณ{studentName}
                  </div>
                  <div style={{
                    fontSize: "clamp(18px, 2.5vw, 24px)",
                    color: "var(--muted-fg)",
                    fontWeight: 500,
                    marginBottom: 24,
                  }}>
                    มีอะไรให้ยูริช่วยในบทเรียนนี้ไหมคะ?
                  </div>

                  {/* Lesson Context Pill Box */}
                  <div style={{
                    padding: "14px 18px",
                    borderRadius: 16,
                    background: "#f0f4f9",
                    border: "1px solid #e2e8f0",
                    marginBottom: 28,
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "var(--fg)",
                  }}>
                    <div style={{ fontWeight: 700, color: "var(--primary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="book" size={14} />
                      บทที่ {selectedLesson.index}: {selectedLesson.title}
                    </div>
                    <div style={{ color: "var(--muted-fg)" }}>
                      {selectedLesson.description || "คุณสามารถสอบถามเนื้อหา อธิบายข้อสงสัย หรือขอแบบฝึกหัดได้ทันที"}
                    </div>
                  </div>

                  {/* 4 Prompt Starter Cards */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 12,
                    width: "100%",
                  }}>
                    {PROMPT_CARDS.map((card, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => sendMessage(card.prompt)}
                        disabled={apiLoading}
                        className="gemini-card-hover"
                        style={{
                          textAlign: "left",
                          padding: "16px 18px",
                          borderRadius: 16,
                          border: "1px solid #e2e8f0",
                          background: "#ffffff",
                          color: "var(--fg)",
                          cursor: apiLoading ? "not-allowed" : "pointer",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: 12,
                          transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        }}
                      >
                        <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, color: "var(--fg)" }}>
                          {card.title}
                        </div>
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                          fontSize: 12,
                          color: "var(--muted-fg)",
                        }}>
                          <span>{card.desc}</span>
                          <span style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: "#f0f4f9", display: "grid", placeItems: "center",
                            color: "var(--primary)", flexShrink: 0, marginLeft: 8,
                          }}>
                            <GeminiSparkleIcon size={13} />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Conversation Message Stream */
                <div style={{
                  maxWidth: 840,
                  width: "100%",
                  margin: "0 auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                  paddingBottom: 16,
                }}>
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                        gap: 14,
                        alignItems: "flex-start",
                        width: "100%",
                      }}
                    >
                      {msg.role === "assistant" && (
                        <div style={{ marginTop: 2, flexShrink: 0 }}>
                          <GeminiSparkleIcon size={24} />
                        </div>
                      )}

                      <div style={{
                        maxWidth: msg.role === "user" ? "80%" : "100%",
                        ...(msg.role === "user" ? {
                          padding: "12px 18px",
                          borderRadius: "22px 22px 4px 22px",
                          background: "#f0f4f9",
                          color: "#1e293b",
                          fontSize: 14.5,
                          lineHeight: 1.6,
                          border: "1px solid #e2e8f0",
                        } : {
                          /* Gemini Open Canvas: flowing clean typography */
                          padding: "0 4px",
                          color: "var(--fg)",
                          fontSize: 14.5,
                          lineHeight: 1.7,
                          flex: 1,
                          minWidth: 0,
                        })
                      }}>
                        {msg.role === "assistant" ? (
                          <div>
                            <MarkdownText text={msg.content} />
                            <MessageActionBar text={msg.content} />
                          </div>
                        ) : (
                          <div>
                            <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8, borderTop: "1px dashed #cbd5e1", paddingTop: 8 }}>
                                {msg.attachments.map((f, idx) => (
                                  <a
                                    key={idx}
                                    href={fileHref(f.url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                      fontSize: 12,
                                      color: "var(--primary)",
                                      textDecoration: "underline",
                                    }}
                                  >
                                    <Icon name="file" size={13} />
                                    <span className="truncate" style={{ maxWidth: 240 }}>{f.name}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {apiLoading && !summarizing && (
                    <div style={{ width: "100%", maxWidth: 840, margin: "0 auto" }}>
                      <GeminiThinking />
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Floating Capsule Input Area (Centered Max 840px) */}
            <div style={{
              width: "100%",
              maxWidth: 840,
              margin: "0 auto",
              padding: "8px 16px 14px",
              position: "relative",
              flexShrink: 0,
            }}>
              {/* Document Attachment Selector Dropdown */}
              {showAttachmentDropdown && (
                <div ref={attachmentRef} className="card shadow-lg" style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  left: 20,
                  zIndex: 1000,
                  width: 320,
                  maxHeight: 220,
                  overflowY: "auto",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 16,
                  padding: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  boxShadow: "0 14px 36px rgba(0,0,0,0.12)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtle)", textTransform: "uppercase", padding: "4px 8px" }}>
                    แนบเอกสารจากบทเรียน:
                  </div>
                  {(selectedLesson?.documents || []).map((doc, idx) => {
                    const isAttached = attachedFiles.some(f => f.url === doc.url);
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isAttached}
                        onClick={() => {
                          setAttachedFiles([...attachedFiles, doc]);
                          setShowAttachmentDropdown(false);
                        }}
                        style={{
                          border: 0,
                          background: "transparent",
                          color: "var(--fg)",
                          padding: "8px 12px",
                          borderRadius: 10,
                          fontSize: 12.5,
                          cursor: isAttached ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          width: "100%",
                          textAlign: "left",
                          opacity: isAttached ? 0.5 : 1,
                        }}
                        className="hover-bg-muted"
                      >
                        <Icon name="file" size={14} className="muted" />
                        <span className="truncate flex-1">{doc.name}</span>
                        {isAttached && <Icon name="check" size={12} className="success" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Rate Limit Banner */}
              {rateLimitError && (
                <div style={{
                  background: "var(--danger-soft)",
                  color: "var(--danger)",
                  padding: "10px 14px",
                  borderRadius: 14,
                  fontSize: 12.5,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}>
                  <Icon name="x" size={15} />
                  <div style={{ flex: 1 }}>
                    โควต้าการถามรอบนี้เต็มแล้ว ({rateLimitInfo?.used}/{rateLimitInfo?.limit} คำถาม) ระบบจะทยอยรีเซ็ตตามรอบเวลา 5 ชั่วโมง
                  </div>
                </div>
              )}

              {/* Session Token Limit Banner */}
              {sessionTokenError && (
                <div style={{
                  background: "var(--warning-soft)",
                  color: "var(--warning)",
                  padding: "10px 14px",
                  borderRadius: 14,
                  fontSize: 12.5,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}>
                  <Icon name="sparkle" size={15} />
                  <div style={{ flex: 1 }}>
                    เซสชันนี้คุยเยอะเกินขีดจำกัดแล้ว กรุณาเริ่มการสนทนาใหม่เพื่อพูดคุยต่อ
                  </div>
                  <button
                    onClick={() => {
                      setSessionTokenError(false);
                      handleStartNewSession();
                    }}
                    style={{
                      background: "var(--warning)",
                      color: "#fff",
                      border: 0,
                      borderRadius: 8,
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    เริ่มใหม่
                  </button>
                </div>
              )}

              {/* Gemini Capsule Container */}
              <div style={{
                background: "#f0f4f9",
                border: "1px solid #e2e8f0",
                borderRadius: 28,
                padding: "10px 14px 10px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                transition: "all 0.18s ease-in-out",
              }}>
                {/* Attached File Chips */}
                {attachedFiles.length > 0 && (
                  <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    paddingBottom: 6,
                    borderBottom: "1px dashed #cbd5e1",
                  }}>
                    {attachedFiles.map((file, idx) => (
                      <div key={idx} style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#ffffff",
                        color: "var(--fg)",
                        border: "1px solid #cbd5e1",
                        padding: "4px 10px",
                        borderRadius: 18,
                        fontSize: 12,
                        fontWeight: 500,
                        maxWidth: "100%",
                      }}>
                        <Icon name="file" size={12} style={{ color: "var(--primary)" }} />
                        <span className="truncate" style={{ maxWidth: 200 }}>{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setAttachedFiles(attachedFiles.filter((_, i) => i !== idx))}
                          style={{
                            border: 0,
                            background: "transparent",
                            color: "var(--muted-fg)",
                            cursor: "pointer",
                            padding: 0,
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <Icon name="x" size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Textarea */}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="พิมพ์ถามคำถามเกี่ยวกับเนื้อหาบทเรียนกับยูริได้ที่นี่..."
                  rows={1}
                  disabled={apiLoading || rateLimitError || sessionTokenError}
                  style={{
                    width: "100%",
                    resize: "none",
                    border: 0,
                    outline: "none",
                    background: "transparent",
                    color: "var(--fg)",
                    fontSize: 14.5,
                    fontFamily: "inherit",
                    lineHeight: 1.55,
                    maxHeight: 140,
                    overflowY: "auto",
                    padding: "2px 0",
                  }}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
                  }}
                />

                {/* Toolbar inside capsule */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 2,
                }}>
                  {/* Attachment Button */}
                  {(selectedLesson?.documents || []).length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowAttachmentDropdown(!showAttachmentDropdown)}
                      disabled={apiLoading || rateLimitError || sessionTokenError}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        border: 0,
                        background: showAttachmentDropdown ? "#dbeafe" : "transparent",
                        color: showAttachmentDropdown ? "#1d4ed8" : "var(--muted-fg)",
                        cursor: (apiLoading || rateLimitError || sessionTokenError) ? "not-allowed" : "pointer",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                        transition: "all 0.15s",
                      }}
                      title="แนบเอกสารบทเรียน"
                    >
                      <Icon name="clip" size={16} />
                    </button>
                  ) : <div />}

                  {/* Gemini Circular Send Button */}
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={(!input.trim() && attachedFiles.length === 0) || apiLoading || rateLimitError || sessionTokenError}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: 0,
                      background: (input.trim() || attachedFiles.length > 0) && !apiLoading && !rateLimitError && !sessionTokenError
                        ? "linear-gradient(135deg, #1a73e8 0%, #8b5cf6 100%)"
                        : "#cbd5e1",
                      color: "#ffffff",
                      cursor: (input.trim() || attachedFiles.length > 0) && !apiLoading && !rateLimitError && !sessionTokenError ? "pointer" : "not-allowed",
                      display: "grid",
                      placeItems: "center",
                      transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                      transform: (input.trim() || attachedFiles.length > 0) && !apiLoading && !rateLimitError && !sessionTokenError ? "scale(1)" : "scale(0.92)",
                      boxShadow: (input.trim() || attachedFiles.length > 0) && !apiLoading && !rateLimitError && !sessionTokenError
                        ? "0 4px 14px rgba(37, 99, 235, 0.3)"
                        : "none",
                      flexShrink: 0,
                    }}
                    title="ส่งคำถาม"
                  >
                    <Icon name="send" size={16} />
                  </button>
                </div>
              </div>

              {/* Gemini Disclaimer & Quota text */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 8px 0 8px",
                fontSize: 11,
                color: "var(--subtle)",
              }}>
                <span>ยูริอาจให้ข้อมูลคลาดเคลื่อนได้ กรุณาตรวจสอบกับเนื้อหาบทเรียน</span>
                {rateLimitInfo && (
                  <span>โควต้า (รอบ 5 ชม.): {rateLimitInfo.used}/{rateLimitInfo.limit} คำถาม</span>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* History Dialog if triggered */}
      {showHistoryDialog && (
        <Dialog
          title="ประวัติการสนทนา"
          desc="รายการเซสชันการสนทนาทั้งหมดของคุณกับ AI ติวเตอร์ในบทเรียนนี้"
          onClose={() => setShowHistoryDialog(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 400, overflowY: "auto", padding: "4px 2px" }}>
            {sessionHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "var(--subtle)" }}>
                ไม่มีประวัติการสนทนาในบทเรียนนี้
              </div>
            ) : (
              sessionHistory.map((sess) => {
                const isCurrent = sess.id === activeSessionId;
                const formattedDate = new Date(sess.updatedAt).toLocaleString("th-TH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div
                    key={sess.id}
                    className="card"
                    style={{
                      padding: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      border: isCurrent ? "2px solid var(--primary)" : "1px solid var(--border)",
                      background: isCurrent ? "var(--primary-soft)" : "var(--card)",
                      cursor: "pointer",
                      borderRadius: 12,
                      transition: "all 0.12s",
                    }}
                    onClick={() => handleSelectSession(sess)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <Icon name="clock" size={12} className="muted" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: isCurrent ? "var(--primary)" : "var(--fg)" }}>
                          {formattedDate} {isCurrent && "(ปัจจุบัน)"}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--muted-fg)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {sess.firstQuestion || "ไม่มีข้อความ"}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(sess.id);
                      }}
                      className="btn btn-outline"
                      style={{
                        padding: "6px 8px",
                        color: "var(--danger)",
                        borderColor: "rgba(239, 68, 68, 0.2)",
                        background: "transparent",
                      }}
                      title="ลบประวัติเซสชันนี้"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </Dialog>
      )}

      {/* Embedded CSS for animations and responsive styling */}
      <style>{`
        @keyframes geminiShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes geminiSparklePulse {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.9; }
          50% { transform: scale(1.15) rotate(15deg); opacity: 1; }
        }
        .gemini-sparkle-pulse {
          animation: geminiSparklePulse 2.4s ease-in-out infinite;
        }
        @keyframes pulseGlow {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .pulse-dot {
          animation: pulseGlow 2s infinite;
        }
        .gemini-card-hover:hover {
          border-color: #1a73e8 !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(26, 115, 232, 0.08) !important;
        }
        .gemini-new-chat-btn:hover {
          background: #f0f4f9 !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1) !important;
        }
        .gemini-session-pill:hover {
          background: #e2e8f0 !important;
        }
        .gemini-session-pill.active:hover {
          background: #dbeafe !important;
        }
        .gemini-session-pill:hover .gemini-del-btn {
          opacity: 1 !important;
        }
        .hover-bg-muted:hover {
          background: #e2e8f0 !important;
        }
        @media (max-width: 959px) {
          .gemini-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.35);
            z-index: 35;
          }
          .gemini-sidebar {
            position: absolute !important;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 50 !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          }
          .gemini-sidebar.closed {
            transform: translateX(-100%);
            width: 0 !important;
          }
          .gemini-sidebar.open {
            transform: translateX(0);
            width: 280px !important;
          }
        }
      `}</style>
    </div>
  );
}
