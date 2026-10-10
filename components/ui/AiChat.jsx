"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import Icon from "@/components/ui/Icon";
import AiAvatar from "./AiAvatar";
import { supabase } from "@/lib/supabase";
import { fileHref } from "@/lib/files";
import { isStaffRole } from "@/lib/roles";
import { Dialog } from "@/components/ui/Primitives";

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

function GeminiSparkleIcon({ size = 20, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, ...style }}>
      <defs>
        <linearGradient id="geminiSparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a73e8" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path
        d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4772 12 22C12 16.4772 16.4772 12 22 12C16.4772 12 12 7.52285 12 2Z"
        fill="url(#geminiSparkleGrad)"
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
      margin: "10px 0",
      borderRadius: 12,
      overflow: "hidden",
      border: "1px solid #1e293b",
      background: "#0b1220",
      color: "#e2e8f0",
      fontSize: 12.5,
      fontFamily: "var(--mono), ui-monospace, monospace",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 12px",
        background: "#111b2e",
        borderBottom: "1px solid #1e293b",
        fontSize: 11,
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
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          <Icon name={copied ? "check" : "clipboard"} size={12} />
          {copied ? "คัดลอกแล้ว" : "คัดลอกโค้ด"}
        </button>
      </div>
      <pre style={{
        padding: "12px 14px",
        margin: 0,
        overflowX: "auto",
        lineHeight: 1.55,
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ---- Gemini Markdown Renderer ----
function MarkdownText({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading ##
    if (line.startsWith("### ")) {
      elements.push(
        <div key={i} style={{ fontWeight: 700, fontSize: 13.5, marginTop: 12, marginBottom: 4, color: "var(--fg)" }}>
          {renderInline(line.slice(4))}
        </div>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <div key={i} style={{ fontWeight: 700, fontSize: 14.5, marginTop: 14, marginBottom: 4, color: "var(--fg)" }}>
          {renderInline(line.slice(3))}
        </div>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <div key={i} style={{ fontWeight: 700, fontSize: 16, marginTop: 16, marginBottom: 6, color: "var(--fg)" }}>
          {renderInline(line.slice(2))}
        </div>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "flex-start", paddingLeft: 2 }}>
          <span style={{
            display: "inline-block", width: 5, height: 5, borderRadius: "50%",
            background: "#8b5cf6", marginTop: 7, flexShrink: 0
          }} />
          <span style={{ lineHeight: 1.6 }}>{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      elements.push(
        <div key={i} style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "flex-start", paddingLeft: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", marginTop: 1, minWidth: 16, flexShrink: 0 }}>
            {match[1]}.
          </span>
          <span style={{ lineHeight: 1.6 }}>{renderInline(match[2])}</span>
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
      elements.push(<div key={i} style={{ height: 6 }} />);
    } else {
      elements.push(
        <div key={i} style={{ marginTop: 3, lineHeight: 1.65, color: "var(--fg)" }}>
          {renderInline(line)}
        </div>
      );
    }
    i++;
  }

  return <div style={{ fontSize: 13.5, letterSpacing: "0.01em" }}>{elements}</div>;
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
          background: "var(--muted)", borderRadius: 5, padding: "1.5px 6px",
          fontFamily: "var(--mono), monospace", fontSize: 12, color: "var(--primary)",
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
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
      <button
        onClick={handleCopy}
        type="button"
        title="คัดลอกคำตอบ"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px",
          borderRadius: 6,
          border: 0,
          background: "transparent",
          color: copied ? "var(--success)" : "var(--muted-fg)",
          cursor: "pointer",
          fontSize: 11,
          transition: "all 0.15s",
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--fg)"; }}
        onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = copied ? "var(--success)" : "var(--muted-fg)"; }}
      >
        <Icon name={copied ? "check" : "clipboard"} size={12} />
        <span>{copied ? "คัดลอกแล้ว" : "คัดลอก"}</span>
      </button>
    </div>
  );
}

// ---- Gemini Shimmer Thinking Animation ----
function GeminiThinking() {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 2px" }}>
      <div className="gemini-sparkle-pulse" style={{ marginTop: 1 }}>
        <GeminiSparkleIcon size={18} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, maxWidth: 260 }}>
        <div style={{
          height: 10,
          borderRadius: 5,
          background: "linear-gradient(90deg, var(--muted) 20%, var(--primary-soft) 50%, var(--muted) 80%)",
          backgroundSize: "200% 100%",
          animation: "geminiShimmer 1.8s infinite ease-in-out",
          width: "88%",
        }} />
        <div style={{
          height: 10,
          borderRadius: 5,
          background: "linear-gradient(90deg, var(--muted) 20%, var(--primary-soft) 50%, var(--muted) 80%)",
          backgroundSize: "200% 100%",
          animation: "geminiShimmer 1.8s infinite ease-in-out",
          width: "60%",
        }} />
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "สรุปเนื้อหาบทเรียนนี้ให้หน่อย",
  "อธิบายจุดสำคัญของบทเรียนนี้",
  "มีแนวคิดอะไรที่ยากในบทเรียนนี้บ้าง?",
  "ช่วยยกตัวอย่างให้เข้าใจง่ายขึ้นหน่อย",
];

export default function AiChat({ lesson, course, open, onClose }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [sessionTokenError, setSessionTokenError] = useState(false);
  
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const attachmentRef = useRef(null);

  const studentId = session?.dbId || session?.user?.id;
  const isBypassed = isStaffRole(session?.role || session?.user?.role);

  const loadHistoryAndSession = async (currLessonId, currLessonTitle) => {
    if (!studentId || !currLessonId) return;
    setLoading(true);

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
      setLoading(false);
    }
  };

  const fetchDailyUsage = async (studId) => {
    try {
      // 1. Fetch quota limit from settings (or fallback to 15)
      let limit = 15;
      const { data: settingsData } = await supabase
        .from("ai_settings")
        .select("key, value");
      if (settingsData) {
        const limitRow = settingsData.find(r => r.key === "daily_chat_limit");
        if (limitRow) limit = parseInt(limitRow.value, 10) || 15;
      }

      // 2. Rolling window 5 hours (matching backend ai_quota_claim)
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
      console.error("Failed to fetch daily usage:", err);
    }
  };

  useEffect(() => {
    if (open && lesson && studentId) {
      loadHistoryAndSession(lesson.id, lesson.title);
      fetchDailyUsage(studentId);
      setSessionTokenError(false);
    } else if (!open) {
      setMessages([]);
    }
    setInput("");
  }, [open, lesson?.id, studentId]);

  useEffect(() => {
    if (open) {
      const focusTimer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(focusTimer);
    }
  }, [open]);

  const handleStartNewSession = async () => {
    setSessionTokenError(false);
    const newSessId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    setActiveSessionId(newSessId);

    let greeting = `สวัสดีครับ! ยินดีต้อนรับสู่ห้องสนทนา AI สำหรับบทเรียน **"${lesson?.title || "บทเรียนนี้"}"** 🎓\n\nผมพร้อมตอบคำถามเกี่ยวกับเนื้อหา อธิบายหัวข้อที่ยาก หรือสรุปบทเรียนให้คุณแล้ว ถามคำถามมาด้านล่างได้เลยครับ!`;
    try {
      const pRes = await fetch("/api/ai/persona");
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData.greetingTemplate) {
          const customMsg = pData.greetingTemplate.replace(/{lesson_title}/g, lesson?.title || "บทเรียนนี้");
          const { cleanText } = parseEmotionAndReply(customMsg);
          greeting = cleanText;
        }
      }
    } catch (e) {
      console.error(e);
    }

    setMessages([{ role: "assistant", content: greeting }]);
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

      if (lesson) {
        loadHistoryAndSession(lesson.id, lesson.title);
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
      alert("ไม่สามารถลบเซสชันได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleSelectSession = (sess) => {
    setActiveSessionId(sess.id);

    let greeting = `สวัสดีครับ! ยินดีต้อนรับสู่ห้องสนทนา AI สำหรับบทเรียน **"${lesson?.title || "บทเรียนนี้"}"** 🎓\n\nผมพร้อมตอบคำถามเกี่ยวกับเนื้อหา อธิบายหัวข้อที่ยาก หรือสรุปบทเรียนให้คุณแล้ว ถามคำถามมาด้านล่างได้เลยครับ!`;
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
    function handleClickOutside(event) {
      if (attachmentRef.current && !attachmentRef.current.contains(event.target)) {
        setShowAttachmentDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const lessonContext = lesson
    ? {
        id: lesson.id,
        courseId: course?.id || lesson.course_id,
        title: lesson.title,
        index: lesson.index,
        courseCode: course?.code,
        courseName: course?.title,
        description: lesson.description,
        duration: lesson.duration,
      }
    : null;

  const sendMessage = async (userText, mode = "chat") => {
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
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          lessonContext,
          mode,
          studentId: session?.dbId || session?.user?.id,
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
          { role: "assistant", content: reply },
        ]);
        setSummarizing(false);
      } else {
        setMessages([...newMessages, { role: "assistant", content: reply }]);
      }
    } catch (err) {
      console.error("AI Error:", err);
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
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay for mobile */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 998,
          background: "rgba(0,0,0,0.3)",
          display: "none",
        }}
        className="ai-chat-overlay"
      />

      <div className="ai-chat-widget" style={{
        position: "fixed",
        bottom: 84,
        right: 24,
        width: 420,
        maxWidth: "calc(100vw - 32px)",
        height: 610,
        maxHeight: "calc(100vh - 110px)",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 28,
        boxShadow: "0 20px 60px -10px rgba(15, 23, 42, 0.2), 0 8px 24px -4px rgba(15, 23, 42, 0.08)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 999,
        animation: "aiChatSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        {/* Gemini Minimal Header */}
        <div style={{
          padding: "12px 18px",
          borderBottom: "1px solid var(--border)",
          background: "var(--card)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <GeminiSparkleIcon size={22} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--fg)" }}>ยูริ</span>
                <span style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "#2563eb",
                  background: "#eff6ff",
                  padding: "1px 7px",
                  borderRadius: 12,
                  border: "1px solid #dbeafe"
                }}>
                  Gemini 3.8 Flash
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted-fg)" }} className="truncate">
                {lesson?.title ? `บทที่ ${lesson.index} · ${lesson.title}` : "ผู้ช่วยสอนประจำรายวิชา"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={handleStartNewSession}
              style={{
                width: 32, height: 32, borderRadius: "50%", border: 0,
                background: "transparent", color: "var(--muted-fg)",
                cursor: "pointer", display: "grid", placeItems: "center",
                transition: "all 0.15s",
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--fg)"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-fg)"; }}
              title="เริ่มการสนทนาใหม่"
            >
              <Icon name="plus" size={15} />
            </button>
            <button
              onClick={() => setShowHistoryDialog(true)}
              style={{
                width: 32, height: 32, borderRadius: "50%", border: 0,
                background: "transparent", color: "var(--muted-fg)",
                cursor: "pointer", display: "grid", placeItems: "center",
                transition: "all 0.15s",
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--fg)"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-fg)"; }}
              title="ประวัติการสนทนา"
            >
              <Icon name="clock" size={15} />
            </button>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: "50%", border: 0,
                background: "transparent", color: "var(--muted-fg)",
                cursor: "pointer", display: "grid", placeItems: "center",
                transition: "all 0.15s",
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--fg)"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-fg)"; }}
              title="ปิด"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>

        {/* Gemini Prompt Suggestion Pills */}
        <div style={{
          padding: "8px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          gap: 6,
          flexShrink: 0,
          overflowX: "auto",
          background: "var(--bg)",
        }}>
          <button
            onClick={() => sendMessage("", "summarize")}
            disabled={loading || summarizing}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 9999,
              border: "1px solid #bfdbfe",
              background: "#eff6ff", color: "#1d4ed8",
              fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              opacity: (loading || summarizing) ? 0.6 : 1,
              flexShrink: 0,
              transition: "all 0.15s",
            }}
            onMouseOver={(e) => { if (!loading && !summarizing) e.currentTarget.style.background = "#dbeafe"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "#eff6ff"; }}
          >
            <GeminiSparkleIcon size={12} />
            {summarizing ? "กำลังสรุป..." : "สรุปบทเรียนนี้"}
          </button>
          {messages.length <= 1 && SUGGESTIONS.slice(1).map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s)}
              disabled={loading || rateLimitError || sessionTokenError}
              style={{
                padding: "5px 12px", borderRadius: 9999, border: "1px solid var(--border)",
                background: "var(--card)", color: "var(--fg)",
                fontSize: 12, cursor: (loading || rateLimitError || sessionTokenError) ? "not-allowed" : "pointer",
                whiteSpace: "nowrap", flexShrink: 0,
                opacity: (loading || rateLimitError || sessionTokenError) ? 0.6 : 1,
                transition: "all 0.15s",
              }}
              onMouseOver={(e) => { if (!loading && !rateLimitError && !sessionTokenError) { e.currentTarget.style.borderColor = "var(--ring)"; e.currentTarget.style.background = "var(--muted)"; } }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--card)"; }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Messages Feed */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          background: "var(--card)",
        }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              {msg.role === "assistant" && (
                <div style={{ marginTop: 2, flexShrink: 0 }}>
                  <GeminiSparkleIcon size={18} />
                </div>
              )}

              <div style={{
                maxWidth: msg.role === "user" ? "82%" : "92%",
                ...(msg.role === "user" ? {
                  padding: "10px 16px",
                  borderRadius: "20px 20px 4px 20px",
                  background: "#f0f4f9",
                  color: "var(--fg)",
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  border: "1px solid #e2e8f0",
                } : {
                  /* Gemini Open Canvas: No heavy bubble, flowing clean typography */
                  padding: "0 4px",
                  color: "var(--fg)",
                  fontSize: 13.5,
                  lineHeight: 1.65,
                  width: "100%",
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
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6, borderTop: "1px dashed var(--border)", paddingTop: 6 }}>
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
                              fontSize: 11.5,
                              color: "var(--primary)",
                              textDecoration: "underline"
                            }}
                          >
                            <Icon name="file" size={12} />
                            <span className="truncate" style={{ maxWidth: 180 }}>{f.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && !summarizing && (
            <GeminiThinking />
          )}

          <div ref={bottomRef} />
        </div>

        {/* Gemini Floating Capsule Input Area */}
        <div className="ai-chat-input-area" style={{
          padding: "10px 14px 12px",
          background: "var(--card)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          position: "relative",
          borderTop: "1px solid var(--border)",
        }}>
          {/* Rate Limit Banner */}
          {rateLimitError && (
            <div style={{
              background: "var(--danger-soft)",
              color: "var(--danger)",
              padding: "8px 12px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}>
              <Icon name="x" size={14} />
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
              padding: "8px 12px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}>
              <Icon name="sparkle" size={14} />
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
                  borderRadius: 6,
                  padding: "3px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                เริ่มใหม่
              </button>
            </div>
          )}

          {/* Document attachment selector dropdown */}
          {showAttachmentDropdown && (
            <div ref={attachmentRef} className="card shadow-lg" style={{
              position: "absolute",
              bottom: "calc(100% + 4px)",
              left: 14,
              zIndex: 1000,
              width: 290,
              maxHeight: 200,
              overflowY: "auto",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
              animation: "selectFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)"
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtle)", textTransform: "uppercase", padding: "4px 8px" }}>
                แนบเอกสารจากบทเรียน:
              </div>
              {(lesson?.documents || []).map((doc, idx) => {
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
                      padding: "7px 10px",
                      borderRadius: 10,
                      fontSize: 12,
                      cursor: isAttached ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      textAlign: "left",
                      opacity: isAttached ? 0.5 : 1
                    }}
                    onMouseOver={(e) => { if (!isAttached) e.currentTarget.style.background = "var(--muted)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <Icon name="file" size={13} className="muted" />
                    <span className="truncate flex-1">{doc.name}</span>
                    {isAttached && <Icon name="check" size={12} className="success" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Gemini Pill Capsule Input Container */}
          <div style={{
            background: "#f0f4f9",
            border: "1px solid #e2e8f0",
            borderRadius: 24,
            padding: "8px 12px 8px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            transition: "all 0.18s ease-in-out",
          }}>
            {/* Chips for attached files */}
            {attachedFiles.length > 0 && (
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                paddingBottom: 4,
                borderBottom: "1px dashed #cbd5e1"
              }}>
                {attachedFiles.map((file, idx) => (
                  <div key={idx} style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#ffffff",
                    color: "var(--fg)",
                    border: "1px solid #cbd5e1",
                    padding: "3px 8px",
                    borderRadius: 16,
                    fontSize: 11,
                    fontWeight: 500,
                    maxWidth: "100%"
                  }}>
                    <Icon name="file" size={11} style={{ color: "var(--primary)" }} />
                    <span className="truncate" style={{ maxWidth: 170 }}>{file.name}</span>
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
                        placeItems: "center"
                      }}
                    >
                      <Icon name="x" size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input textarea */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ถามคำถามเกี่ยวกับบทเรียนกับยูริ..."
              rows={1}
              disabled={loading || rateLimitError || sessionTokenError}
              style={{
                width: "100%",
                resize: "none",
                border: 0,
                outline: "none",
                background: "transparent",
                color: "var(--fg)",
                fontSize: 13.5,
                fontFamily: "inherit",
                lineHeight: 1.5,
                maxHeight: 90,
                overflowY: "auto",
                padding: "2px 0",
              }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 90) + "px";
              }}
            />

            {/* Bottom toolbar inside capsule */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 2,
            }}>
              {/* Attachment Button */}
              {(lesson?.documents || []).length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAttachmentDropdown(!showAttachmentDropdown)}
                  disabled={loading || rateLimitError || sessionTokenError}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    border: 0,
                    background: showAttachmentDropdown ? "#dbeafe" : "transparent",
                    color: showAttachmentDropdown ? "#1d4ed8" : "var(--muted-fg)",
                    cursor: (loading || rateLimitError || sessionTokenError) ? "not-allowed" : "pointer",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    transition: "all 0.15s",
                  }}
                  onMouseOver={(e) => { if (!showAttachmentDropdown && !rateLimitError && !sessionTokenError) { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "var(--fg)"; } }}
                  onMouseOut={(e) => { if (!showAttachmentDropdown) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-fg)"; } }}
                  title="แนบเอกสารบทเรียน"
                >
                  <Icon name="clip" size={15} />
                </button>
              ) : <div />}

              {/* Gemini Circular Send Button */}
              <button
                onClick={() => sendMessage(input)}
                disabled={(!input.trim() && attachedFiles.length === 0) || loading || rateLimitError || sessionTokenError}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: 0,
                  background: (input.trim() || attachedFiles.length > 0) && !loading && !rateLimitError && !sessionTokenError
                    ? "linear-gradient(135deg, #1a73e8 0%, #8b5cf6 100%)"
                    : "#cbd5e1",
                  color: "#ffffff",
                  cursor: (input.trim() || attachedFiles.length > 0) && !loading && !rateLimitError && !sessionTokenError
                    ? "pointer"
                    : "not-allowed",
                  display: "grid",
                  placeItems: "center",
                  transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                  transform: (input.trim() || attachedFiles.length > 0) && !loading ? "scale(1)" : "scale(0.92)",
                  boxShadow: (input.trim() || attachedFiles.length > 0) && !loading
                    ? "0 4px 12px rgba(37, 99, 235, 0.3)"
                    : "none",
                  flexShrink: 0,
                }}
                title="ส่งข้อความ"
              >
                <Icon name="send" size={14} />
              </button>
            </div>
          </div>

          {/* Gemini Disclaimer & Quota Indicator */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "5px 6px 0 6px",
            fontSize: 10.5,
            color: "var(--subtle)",
          }}>
            <span>ยูริอาจให้ข้อมูลคลาดเคลื่อนได้</span>
            {rateLimitInfo && (
              <span>โควต้า (รอบ 5 ชม.): {rateLimitInfo.used}/{rateLimitInfo.limit} คำถาม</span>
            )}
          </div>
        </div>
      </div>

      {showHistoryDialog && (
        <Dialog
          title="ประวัติการสนทนา"
          desc="รายการเซสชันการสนทนาทั้งหมดของคุณกับ AI ติวเตอร์ในบทเรียนนี้"
          onClose={() => setShowHistoryDialog(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 300, overflowY: "auto", padding: "4px 2px" }}>
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
                  minute: "2-digit"
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
                      transition: "all 0.12s"
                    }}
                    onClick={() => handleSelectSession(sess)}
                    onMouseOver={(e) => { if (!isCurrent) e.currentTarget.style.borderColor = "var(--primary)"; }}
                    onMouseOut={(e) => { if (!isCurrent) e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <Icon name="clock" size={12} className="muted" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: isCurrent ? "var(--primary)" : "var(--fg)" }}>
                          {formattedDate} {isCurrent && "(ปัจจุบัน)"}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--muted-fg)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} className="pretty">
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
                      onMouseOver={(e) => { e.currentTarget.style.background = "var(--danger-soft)"; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
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

      <style>{`
        @keyframes aiChatSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
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
        @media (max-width: 1024px) {
          .ai-chat-overlay {
            display: block !important;
          }
          .ai-chat-widget {
            bottom: 0 !important;
            right: 0 !important;
            width: 100vw !important;
            maxWidth: 100vw !important;
            height: 90% !important;
            maxHeight: 90% !important;
            borderRadius: 24px 24px 0 0 !important;
            box-shadow: 0 -12px 40px rgba(0,0,0,0.18) !important;
            animation: aiChatSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }
          .ai-chat-input-area {
            padding-bottom: calc(12px + env(safe-area-inset-bottom)) !important;
          }
        }
        @keyframes aiChatSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
